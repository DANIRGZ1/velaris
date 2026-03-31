// ─── src-tauri/src/riot_api.rs ───────────────────────────────────────────────
//
// Riot Games API client for Velaris.
// Handles Account-v1, Summoner-v4, and League-v4 endpoints.
//
// Features:
//   - Rate limiting (sliding window, respects Riot's 20/1s + 100/2min limits)
//   - Automatic retry with exponential backoff on 429 responses
//   - Retry-After header parsing
//   - Configurable max retries (default: 3)
//
// The API key is read from:
//   1. Environment variable RIOT_API_KEY (for development)
//   2. A local config file ~/.velaris/config.json (for production)
//
// Get your key at: https://developer.riotgames.com/
// ─────────────────────────────────────────────────────────────────────────────

use reqwest::{Client, Response, StatusCode};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

// ─── Singleton HTTP Client ───────────────────────────────────────────────────

static HTTP_CLIENT: OnceLock<Client> = OnceLock::new();

fn client() -> &'static Client {
    HTTP_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to build reqwest client")
    })
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────
//
// Sliding window rate limiter that enforces two limits simultaneously:
//   - Short window:  20 requests per 1 second   (Riot dev key default)
//   - Long window:  100 requests per 2 minutes   (Riot dev key default)
//
// For production keys, these can be adjusted via set_rate_limits().
// The limiter blocks (async sleep) if the budget is exhausted.

struct RateLimitWindow {
    max_requests: usize,
    window_duration: Duration,
    timestamps: VecDeque<Instant>,
}

impl RateLimitWindow {
    fn new(max_requests: usize, window_duration: Duration) -> Self {
        Self {
            max_requests,
            window_duration,
            timestamps: VecDeque::with_capacity(max_requests + 1),
        }
    }

    /// Prune timestamps older than the window.
    fn prune(&mut self, now: Instant) {
        while let Some(&front) = self.timestamps.front() {
            if now.duration_since(front) > self.window_duration {
                self.timestamps.pop_front();
            } else {
                break;
            }
        }
    }

    /// Returns how long to wait before a new request is allowed, or None if ok.
    fn time_until_available(&mut self, now: Instant) -> Option<Duration> {
        self.prune(now);
        if self.timestamps.len() < self.max_requests {
            None
        } else {
            // Must wait until the oldest request in the window expires
            let oldest = self.timestamps.front().unwrap();
            let expires_at = *oldest + self.window_duration;
            if expires_at > now {
                Some(expires_at - now + Duration::from_millis(50)) // +50ms safety margin
            } else {
                None
            }
        }
    }

    /// Record a request timestamp.
    fn record(&mut self, now: Instant) {
        self.timestamps.push_back(now);
    }
}

struct RateLimiter {
    short_window: RateLimitWindow,  // 20/1s
    long_window: RateLimitWindow,   // 100/2min
}

impl RateLimiter {
    fn new() -> Self {
        Self {
            short_window: RateLimitWindow::new(20, Duration::from_secs(1)),
            long_window: RateLimitWindow::new(100, Duration::from_secs(120)),
        }
    }

    /// Returns the maximum wait time needed across both windows.
    fn time_until_available(&mut self) -> Option<Duration> {
        let now = Instant::now();
        let short_wait = self.short_window.time_until_available(now);
        let long_wait = self.long_window.time_until_available(now);
        match (short_wait, long_wait) {
            (Some(s), Some(l)) => Some(s.max(l)),
            (Some(s), None) => Some(s),
            (None, Some(l)) => Some(l),
            (None, None) => None,
        }
    }

    /// Record that a request was made.
    fn record_request(&mut self) {
        let now = Instant::now();
        self.short_window.record(now);
        self.long_window.record(now);
    }
}

static RATE_LIMITER: OnceLock<Mutex<RateLimiter>> = OnceLock::new();

fn rate_limiter() -> &'static Mutex<RateLimiter> {
    RATE_LIMITER.get_or_init(|| Mutex::new(RateLimiter::new()))
}

/// Wait until rate limit budget is available, then record the request.
async fn acquire_rate_limit() {
    loop {
        let wait_duration = {
            let mut limiter = rate_limiter().lock().unwrap();
            limiter.time_until_available()
        };

        match wait_duration {
            Some(duration) => {
                eprintln!(
                    "[Velaris/RateLimit] Budget exhausted, waiting {:.0}ms",
                    duration.as_millis()
                );
                tokio::time::sleep(duration).await;
            }
            None => {
                // Budget available — record and proceed
                let mut limiter = rate_limiter().lock().unwrap();
                limiter.record_request();
                return;
            }
        }
    }
}

// ─── Retry with Exponential Backoff ──────────────────────────────────────────
//
// On 429 (Rate Limited):
//   1. Parse Retry-After header if present
//   2. Otherwise, use exponential backoff: 1s, 2s, 4s
//   3. Max 3 retries before returning error
//
// On 5xx (Server Error):
//   1. Retry with backoff: 1s, 2s, 4s
//   2. Max 3 retries

const MAX_RETRIES: u32 = 3;
const BASE_BACKOFF_MS: u64 = 1000;

/// Sends a GET request with rate limiting and automatic retry.
async fn riot_get(url: &str, api_key: &str) -> Result<Response, String> {
    let mut last_error = String::new();

    for attempt in 0..=MAX_RETRIES {
        // Wait for rate limit budget
        acquire_rate_limit().await;

        eprintln!(
            "[Velaris/API] {} {} (attempt {}/{})",
            if attempt == 0 { "GET" } else { "RETRY" },
            url,
            attempt + 1,
            MAX_RETRIES + 1
        );

        let result = client()
            .get(url)
            .header("X-Riot-Token", api_key)
            .send()
            .await;

        match result {
            Ok(resp) => {
                let status = resp.status();

                // ── Success ──
                if status.is_success() {
                    return Ok(resp);
                }

                // ── 429: Rate Limited ──
                if status == StatusCode::TOO_MANY_REQUESTS {
                    if attempt >= MAX_RETRIES {
                        return Err(
                            "Rate limit exceeded after maximum retries. Please wait before searching again."
                                .to_string(),
                        );
                    }

                    // Parse Retry-After header (seconds)
                    let retry_after = resp
                        .headers()
                        .get("retry-after")
                        .and_then(|v| v.to_str().ok())
                        .and_then(|v| v.parse::<f64>().ok());

                    let wait_ms = if let Some(secs) = retry_after {
                        // Use server-specified wait time + small margin
                        ((secs * 1000.0) as u64) + 100
                    } else {
                        // Exponential backoff: 1s, 2s, 4s
                        BASE_BACKOFF_MS * 2u64.pow(attempt)
                    };

                    eprintln!(
                        "[Velaris/RateLimit] 429 received. Retry-After: {:?}. Waiting {}ms before retry.",
                        retry_after, wait_ms
                    );

                    tokio::time::sleep(Duration::from_millis(wait_ms)).await;
                    continue;
                }

                // ── 5xx: Server Error (retryable) ──
                if status.is_server_error() {
                    if attempt >= MAX_RETRIES {
                        let body = resp.text().await.unwrap_or_default();
                        return Err(format!("Riot API server error {} after {} retries: {}", status.as_u16(), MAX_RETRIES, body));
                    }

                    let wait_ms = BASE_BACKOFF_MS * 2u64.pow(attempt);
                    eprintln!(
                        "[Velaris/API] Server error {}. Waiting {}ms before retry.",
                        status.as_u16(), wait_ms
                    );
                    tokio::time::sleep(Duration::from_millis(wait_ms)).await;
                    continue;
                }

                // ── 4xx: Client Error (NOT retryable) ──
                return Ok(resp);
            }
            Err(e) => {
                // Network error — retryable
                last_error = format!("Network error: {}", e);
                if attempt >= MAX_RETRIES {
                    return Err(format!("{} (after {} retries)", last_error, MAX_RETRIES));
                }

                let wait_ms = BASE_BACKOFF_MS * 2u64.pow(attempt);
                eprintln!(
                    "[Velaris/API] Network error: {}. Waiting {}ms before retry.",
                    e, wait_ms
                );
                tokio::time::sleep(Duration::from_millis(wait_ms)).await;
            }
        }
    }

    Err(last_error)
}

// ─── API Key Loading ─────────────────────────────────────────────────────────

/// Reads the Riot API key. Priority:
/// 1. RIOT_API_KEY env var
/// 2. ~/.velaris/config.json → { "riot_api_key": "RGAPI-..." }
fn get_api_key() -> Result<String, String> {
    // 1. Environment variable
    if let Ok(key) = std::env::var("RIOT_API_KEY") {
        if !key.is_empty() {
            return Ok(key);
        }
    }

    // 2. Config file
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let config_path = home.join(".velaris").join("config.json");
    if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let config: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Invalid config JSON: {}", e))?;
        if let Some(key) = config.get("riot_api_key").and_then(|v| v.as_str()) {
            if !key.is_empty() {
                return Ok(key.to_string());
            }
        }
    }

    Err(
        "Riot API key not found. Set RIOT_API_KEY env var or add it to ~/.velaris/config.json"
            .to_string(),
    )
}

// ─── Response Types (match the TypeScript interfaces exactly) ────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RiotAccount {
    pub puuid: String,
    pub game_name: String,
    pub tag_line: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RiotSummoner {
    pub id: String,
    pub account_id: String,
    pub puuid: String,
    pub profile_icon_id: i64,
    pub summoner_level: i64,
    #[serde(default)]
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RiotLeagueEntry {
    pub queue_type: String,
    pub tier: String,
    pub rank: String,
    pub league_points: i32,
    pub wins: i32,
    pub losses: i32,
}

// ─── Riot API raw response types (what the API actually returns) ─────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RiotAccountRaw {
    puuid: String,
    game_name: Option<String>,
    tag_line: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RiotSummonerRaw {
    id: String,
    account_id: String,
    puuid: String,
    profile_icon_id: i64,
    summoner_level: i64,
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RiotLeagueEntryRaw {
    queue_type: String,
    tier: Option<String>,
    rank: Option<String>,
    league_points: Option<i32>,
    wins: Option<i32>,
    losses: Option<i32>,
}

// ─── Regional Routing ────────────────────────────────────────────────────────

/// Returns the regional base URL for Account-v1 requests.
/// Account API uses regional routing: americas, europe, asia, sea.
fn regional_base_url(regional: &str) -> String {
    let region = match regional.to_lowercase().as_str() {
        "americas" => "americas",
        "europe" => "europe",
        "asia" => "asia",
        "sea" => "sea",
        _ => "europe", // default fallback
    };
    format!("https://{}.api.riotgames.com", region)
}

/// Returns the platform base URL for Summoner-v4 and League-v4 requests.
/// Platform routing uses server-specific URLs: euw1, na1, kr, etc.
fn platform_base_url(platform: &str) -> String {
    let plat = match platform.to_lowercase().as_str() {
        "euw1" | "euw" => "euw1",
        "eun1" | "eune" => "eun1",
        "na1" | "na" => "na1",
        "kr" => "kr",
        "br1" | "br" => "br1",
        "la1" | "lan" => "la1",
        "la2" | "las" => "la2",
        "oc1" | "oce" => "oc1",
        "tr1" | "tr" => "tr1",
        "ru" => "ru",
        "jp1" | "jp" => "jp1",
        "ph2" => "ph2",
        "sg2" => "sg2",
        "th2" => "th2",
        "tw2" => "tw2",
        "vn2" => "vn2",
        _ => "euw1",
    };
    format!("https://{}.api.riotgames.com", plat)
}

// ─── Error Formatting ────────────────────────────────────────────────────────

fn format_api_error(status: StatusCode, body: &str, context: &str) -> String {
    let detail = match status.as_u16() {
        400 => "Bad request — invalid parameters".to_string(),
        401 => "API key is invalid or expired".to_string(),
        403 => "API key lacks permissions for this endpoint".to_string(),
        404 => format!("{} not found", context),
        415 => "Unsupported media type".to_string(),
        429 => "Rate limit exceeded after retries".to_string(),
        500..=599 => format!("Riot API server error ({})", status.as_u16()),
        _ => body.to_string(),
    };
    format!("Riot API error {}: {}", status.as_u16(), detail)
}

// ─── API Functions ───────────────────────────────────────────────────────────

/// GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
///
/// Looks up an account by Riot ID (gameName + tagLine).
/// Uses regional routing (europe, americas, asia, sea).
/// Rate limited + automatic retry on 429/5xx.
pub async fn get_account_by_riot_id(
    game_name: &str,
    tag_line: &str,
    regional: &str,
) -> Result<RiotAccount, String> {
    let api_key = get_api_key()?;
    let base = regional_base_url(regional);

    // URL-encode the game name in case it has special characters
    let encoded_name = urlencoding::encode(game_name);
    let encoded_tag = urlencoding::encode(tag_line);

    let url = format!(
        "{}/riot/account/v1/accounts/by-riot-id/{}/{}",
        base, encoded_name, encoded_tag
    );

    let resp = riot_get(&url, &api_key).await?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format_api_error(
            status,
            &body,
            &format!("Summoner '{}#{}'", game_name, tag_line),
        ));
    }

    let raw: RiotAccountRaw = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse account response: {}", e))?;

    Ok(RiotAccount {
        puuid: raw.puuid,
        game_name: raw.game_name.unwrap_or_else(|| game_name.to_string()),
        tag_line: raw.tag_line.unwrap_or_else(|| tag_line.to_string()),
    })
}

/// GET /lol/summoner/v4/summoners/by-puuid/{puuid}
///
/// Gets summoner data (level, profile icon, encrypted IDs) from a PUUID.
/// Uses platform routing (euw1, na1, kr, etc).
/// Rate limited + automatic retry on 429/5xx.
pub async fn get_summoner_by_puuid(
    puuid: &str,
    platform: &str,
) -> Result<RiotSummoner, String> {
    let api_key = get_api_key()?;
    let base = platform_base_url(platform);

    let url = format!(
        "{}/lol/summoner/v4/summoners/by-puuid/{}",
        base, puuid
    );

    let resp = riot_get(&url, &api_key).await?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format_api_error(status, &body, "Summoner"));
    }

    let raw: RiotSummonerRaw = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse summoner response: {}", e))?;

    Ok(RiotSummoner {
        id: raw.id,
        account_id: raw.account_id,
        puuid: raw.puuid,
        profile_icon_id: raw.profile_icon_id,
        summoner_level: raw.summoner_level,
        name: raw.name,
    })
}

/// GET /lol/league/v4/entries/by-summoner/{summonerId}
///
/// Gets ranked entries (Solo/Duo, Flex) for a summoner.
/// Uses platform routing.
/// Rate limited + automatic retry on 429/5xx.
pub async fn get_league_entries(
    summoner_id: &str,
    platform: &str,
) -> Result<Vec<RiotLeagueEntry>, String> {
    let api_key = get_api_key()?;
    let base = platform_base_url(platform);

    let url = format!(
        "{}/lol/league/v4/entries/by-summoner/{}",
        base, summoner_id
    );

    let resp = riot_get(&url, &api_key).await?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format_api_error(status, &body, "League entries"));
    }

    let raw: Vec<RiotLeagueEntryRaw> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse league response: {}", e))?;

    Ok(raw
        .into_iter()
        .map(|entry| RiotLeagueEntry {
            queue_type: entry.queue_type,
            tier: entry.tier.unwrap_or_else(|| "UNRANKED".to_string()),
            rank: entry.rank.unwrap_or_default(),
            league_points: entry.league_points.unwrap_or(0),
            wins: entry.wins.unwrap_or(0),
            losses: entry.losses.unwrap_or(0),
        })
        .collect())
}

// ─── Live Client Data API ────────────────────────────────────────────────────
//
// The Live Client Data API runs on https://127.0.0.1:2999 during an active game.
// It uses a self-signed certificate from Riot, so we need a separate HTTP client
// that accepts invalid certs. This MUST be called from Rust — the webview will
// reject the self-signed cert.

static LIVE_CLIENT: OnceLock<Client> = OnceLock::new();

fn live_client() -> &'static Client {
    LIVE_CLIENT.get_or_init(|| {
        Client::builder()
            .danger_accept_invalid_certs(true)
            .timeout(Duration::from_secs(3))
            .build()
            .expect("Failed to build live client data HTTP client")
    })
}

/// Fetches all game data from the Live Client Data API.
/// Returns the raw JSON as serde_json::Value so the frontend can parse it.
/// No API key needed — this is a local endpoint.
pub async fn get_live_game_data() -> Result<serde_json::Value, String> {
    let resp = live_client()
        .get("https://127.0.0.1:2999/liveclientdata/allgamedata")
        .send()
        .await
        .map_err(|e| format!("Live Client Data API unreachable: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Live Client Data API returned {}",
            resp.status().as_u16()
        ));
    }

    resp.json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse live game data: {}", e))
}