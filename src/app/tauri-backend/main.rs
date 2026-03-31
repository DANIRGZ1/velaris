// ─── Velaris Tauri Backend (Reference) ─────────────────────────────────────────
// 
// Copy this directory into your Tauri project's src-tauri/src/
// Then run: cargo tauri dev
//
// This file is the main entry point for the Tauri backend.
// It registers all commands that the frontend calls via dataService.ts
//
// Prerequisites:
//   cargo add reqwest --features rustls-tls,json
//   cargo add serde --features derive
//   cargo add serde_json
//   cargo add tokio --features full
//   cargo add base64

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod lcu;
mod live_client;

use std::sync::Mutex;
use tauri::Manager; // provides get_webview_window()

// ─── Riot API Key Management ──────────────────────────────────────────────────
//
// The Riot API key is read from environment variable RIOT_API_KEY
// or from a local file at src-tauri/riot-api-key.txt (for development).
//
// For production, consider using tauri-plugin-store to let the user
// provide their own Development API key via Settings.
//
// IMPORTANT: Development API keys expire every 24h.
// Production keys require Riot approval.

fn get_riot_api_key() -> Option<String> {
    // Priority 1: Environment variable
    if let Ok(key) = std::env::var("RIOT_API_KEY") {
        if !key.is_empty() { return Some(key); }
    }
    // Priority 2: Local file (dev convenience)
    if let Ok(key) = std::fs::read_to_string("riot-api-key.txt") {
        let trimmed = key.trim().to_string();
        if !trimmed.is_empty() { return Some(trimmed); }
    }
    // Priority 3: Check app data dir (set by user via Settings)
    None
}

fn riot_api_client(api_key: &str) -> Result<reqwest::Client, String> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        "X-Riot-Token",
        reqwest::header::HeaderValue::from_str(api_key)
            .map_err(|e| format!("Invalid API key header: {}", e))?,
    );
    reqwest::Client::builder()
        .default_headers(headers)
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())
}

// ─── Region Mapping ───────────────────────────────────────────────────────────

fn platform_to_regional(platform: &str) -> &'static str {
    match platform {
        "euw1" | "eun1" | "tr1" | "ru" => "europe",
        "na1" | "br1" | "la1" | "la2" | "oc1" => "americas",
        "kr" | "jp1" => "asia",
        "ph2" | "sg2" | "th2" | "tw2" | "vn2" => "sea",
        _ => "europe",
    }
}

// ─── Summoner Search Cache ────────────────────────────────────────────────────
//
// Maintains an in-memory cache of previously searched summoner profiles.
// Populated every time a full profile lookup succeeds.

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct CachedSummonerProfile {
    game_name: String,
    tag_line: String,
    puuid: String,
    profile_icon_id: i64,
    summoner_level: i64,
    solo_rank: Option<String>,
    solo_lp: i64,
    solo_wins: i64,
    solo_losses: i64,
    region: String,
    cached_at: i64, // unix timestamp ms
}

struct SearchCache {
    profiles: Vec<CachedSummonerProfile>,
}

impl SearchCache {
    fn new() -> Self {
        Self { profiles: Vec::new() }
    }

    fn add(&mut self, profile: CachedSummonerProfile) {
        // Update existing or insert new
        if let Some(existing) = self.profiles.iter_mut().find(|p| p.puuid == profile.puuid) {
            *existing = profile;
        } else {
            self.profiles.push(profile);
        }
        // Keep max 100 entries
        if self.profiles.len() > 100 {
            self.profiles.sort_by(|a, b| b.cached_at.cmp(&a.cached_at));
            self.profiles.truncate(100);
        }
    }

    fn search(&self, query: &str) -> Vec<&CachedSummonerProfile> {
        let q = query.to_lowercase();
        self.profiles.iter()
            .filter(|p| {
                let name = p.game_name.to_lowercase();
                let full = format!("{}#{}", p.game_name, p.tag_line).to_lowercase();
                name.contains(&q) || full.contains(&q)
            })
            .take(5)
            .collect()
    }
}

// ─── Existing LCU Commands ────────────────────────────────────────────────────

#[tauri::command]
async fn get_match_history() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;
    
    // Get current summoner
    let summoner: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-summoner/v1/current-summoner", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    
    let puuid = summoner["puuid"].as_str().unwrap_or_default();
    
    // Get match history (last 20 games)
    let matches: serde_json::Value = client
        .get(&format!(
            "https://127.0.0.1:{}/lol-match-history/v1/products/lol/{}/matches?begIndex=0&endIndex=20",
            lockfile.port, puuid
        ))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    
    Ok(matches)
}

#[tauri::command]
async fn get_champ_select_profiles() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;
    
    // Get champ select session
    let session: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-champ-select/v1/session", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    
    // Extract team member summoner IDs and fetch their profiles
    let my_team = session["myTeam"].as_array().cloned().unwrap_or_default();
    let local_cell_id = session["localPlayerCellId"].as_i64().unwrap_or(-1);
    let mut profiles = Vec::new();
    
    for member in &my_team {
        let summoner_id = member["summonerId"].as_i64().unwrap_or(0);
        let cell_id = member["cellId"].as_i64().unwrap_or(-1);
        let champion_id = member["championId"].as_i64().unwrap_or(0);
        let assigned_position = member["assignedPosition"].as_str().unwrap_or("");
        
        if summoner_id == 0 { continue; }
        
        // Fetch summoner info
        let summoner: serde_json::Value = match client
            .get(&format!("https://127.0.0.1:{}/lol-summoner/v1/summoners/{}", lockfile.port, summoner_id))
            .send().await
        {
            Ok(resp) => resp.json().await.unwrap_or(serde_json::Value::Null),
            Err(_) => serde_json::Value::Null,
        };
        
        let puuid = summoner["puuid"].as_str().unwrap_or_default();
        let summoner_name = summoner["gameName"].as_str()
            .or_else(|| summoner["displayName"].as_str())
            .unwrap_or("Unknown");
        let account_level = summoner["summonerLevel"].as_i64().unwrap_or(0);
        
        // Fetch ranked stats
        let ranked: serde_json::Value = match client
            .get(&format!("https://127.0.0.1:{}/lol-ranked/v1/ranked-stats/{}", lockfile.port, puuid))
            .send().await
        {
            Ok(resp) => resp.json().await.unwrap_or(serde_json::Value::Null),
            Err(_) => serde_json::Value::Null,
        };
        
        let solo_q = &ranked["queueMap"]["RANKED_SOLO_5x5"];
        let rank = solo_q["tier"].as_str().unwrap_or("UNRANKED");
        let division = solo_q["division"].as_str().unwrap_or("");
        let lp = solo_q["leaguePoints"].as_i64().unwrap_or(0);
        let wins = solo_q["wins"].as_i64().unwrap_or(0);
        let losses = solo_q["losses"].as_i64().unwrap_or(0);
        
        // Fetch recent match history for this player (20 games)
        // LCU endpoint: /lol-match-history/v1/products/lol/{puuid}/matches
        let match_history: serde_json::Value = match client
            .get(&format!(
                "https://127.0.0.1:{}/lol-match-history/v1/products/lol/{}/matches?begIndex=0&endIndex=20",
                lockfile.port, puuid
            ))
            .send().await
        {
            Ok(resp) => resp.json().await.unwrap_or(serde_json::Value::Null),
            Err(_) => serde_json::Value::Null,
        };
        
        // Compute recent stats from match history
        let games = match_history["games"]["games"].as_array();
        let (
            mut recent_wins, mut recent_losses,
            mut total_kills, mut total_deaths, mut total_assists,
            mut total_cs, mut total_neutral_cs, mut total_duration,
            mut total_vision, mut current_streak,
        ) = (0i64, 0i64, 0i64, 0i64, 0i64, 0i64, 0i64, 0f64, 0i64, 0i64);
        
        // Champion stats map: name → { games, wins, kills, deaths, assists }
        let mut champ_stats: std::collections::HashMap<String, (i64, i64, i64, i64, i64)> = std::collections::HashMap::new();
        let mut streak_counting = true;
        let mut streak_win: Option<bool> = None;
        
        if let Some(game_list) = games {
            // Games are sorted newest first from LCU
            for game in game_list {
                let participants = game["participants"].as_array();
                // Find the participant matching this puuid (by participantId from participantIdentities)
                let participant_id = {
                    let identities = game["participantIdentities"].as_array();
                    let mut pid = 1i64;
                    if let Some(ids) = identities {
                        for identity in ids {
                            let player_puuid = identity["player"]["puuid"].as_str().unwrap_or("");
                            if player_puuid == puuid {
                                pid = identity["participantId"].as_i64().unwrap_or(1);
                                break;
                            }
                        }
                    }
                    pid
                };
                
                if let Some(parts) = participants {
                    if let Some(p) = parts.iter().find(|p| p["participantId"].as_i64() == Some(participant_id)) {
                        let stats = &p["stats"];
                        let win = stats["win"].as_bool().unwrap_or(false);
                        let kills = stats["kills"].as_i64().unwrap_or(0);
                        let deaths = stats["deaths"].as_i64().unwrap_or(0);
                        let assists = stats["assists"].as_i64().unwrap_or(0);
                        let cs = stats["totalMinionsKilled"].as_i64().unwrap_or(0);
                        let neutral_cs = stats["neutralMinionsKilled"].as_i64().unwrap_or(0);
                        let vision = stats["visionScore"].as_i64().unwrap_or(0);
                        let duration = game["gameDuration"].as_f64().unwrap_or(1800.0);
                        let champ_id = p["championId"].as_i64().unwrap_or(0);
                        
                        if win { recent_wins += 1; } else { recent_losses += 1; }
                        total_kills += kills;
                        total_deaths += deaths;
                        total_assists += assists;
                        total_cs += cs;
                        total_neutral_cs += neutral_cs;
                        total_duration += duration;
                        total_vision += vision;
                        
                        // Champion name (best effort from championId)
                        let champ_name = format!("Champion{}", champ_id);
                        let entry = champ_stats.entry(champ_name).or_insert((0, 0, 0, 0, 0));
                        entry.0 += 1; // games
                        if win { entry.1 += 1; } // wins
                        entry.2 += kills;
                        entry.3 += deaths;
                        entry.4 += assists;
                        
                        // Streak counting (consecutive wins/losses from most recent)
                        if streak_counting {
                            match streak_win {
                                None => {
                                    streak_win = Some(win);
                                    current_streak = if win { 1 } else { -1 };
                                }
                                Some(prev_win) => {
                                    if prev_win == win {
                                        current_streak += if win { 1 } else { -1 };
                                    } else {
                                        streak_counting = false;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        let recent_games = recent_wins + recent_losses;
        let recent_avg_kda = if recent_games > 0 && total_deaths > 0 {
            (total_kills + total_assists) as f64 / total_deaths as f64
        } else if recent_games > 0 {
            (total_kills + total_assists) as f64
        } else { 0.0 };
        
        let duration_min = if total_duration > 0.0 { total_duration / 60.0 } else { 1.0 };
        let recent_avg_cs_per_min = if recent_games > 0 {
            (total_cs + total_neutral_cs) as f64 / duration_min
        } else { 0.0 };
        
        let recent_avg_vision_per_min = if recent_games > 0 {
            total_vision as f64 / duration_min
        } else { 0.0 };
        
        let recent_avg_deaths = if recent_games > 0 {
            total_deaths as f64 / recent_games as f64
        } else { 0.0 };
        
        // Build champion pool (top 3 by games)
        let mut champ_vec: Vec<_> = champ_stats.into_iter().collect();
        champ_vec.sort_by(|a, b| b.1.0.cmp(&a.1.0));
        let champions: Vec<serde_json::Value> = champ_vec.iter().take(3).map(|(name, (g, w, k, d, a))| {
            let wr = if *g > 0 { (*w as f64 / *g as f64 * 100.0).round() as i64 } else { 0 };
            let kda = if *d > 0 { (*k + *a) as f64 / *d as f64 } else { (*k + *a) as f64 };
            serde_json::json!({
                "name": name,
                "games": g,
                "winrate": wr,
                "avgKda": (kda * 10.0).round() / 10.0,
            })
        }).collect();
        
        // Map assigned position to current role
        let current_role = match assigned_position {
            "top" => "TOP",
            "jungle" => "JGL",
            "middle" => "MID",
            "bottom" => "ADC",
            "utility" => "SUP",
            _ => "MID",
        };

        profiles.push(serde_json::json!({
            "summonerName": summoner_name,
            "accountLevel": account_level,
            "rank": rank,
            "division": division,
            "lp": lp,
            "wins": wins,
            "losses": losses,
            "recentWins": recent_wins,
            "recentLosses": recent_losses,
            "recentAvgKda": (recent_avg_kda * 10.0).round() / 10.0,
            "recentAvgCsPerMin": (recent_avg_cs_per_min * 10.0).round() / 10.0,
            "recentAvgVisionPerMin": (recent_avg_vision_per_min * 10.0).round() / 10.0,
            "recentAvgDeaths": (recent_avg_deaths * 10.0).round() / 10.0,
            "champions": champions,
            "currentChampion": format!("Champion{}", champion_id),
            "currentRole": current_role,
            "currentStreak": current_streak,
        }));
    }
    
    Ok(serde_json::Value::Array(profiles))
}

/// Fetches the current champ select session from the LCU.
/// Called from: dataService.ts → getChampSelectSession()
///
/// Returns the raw session JSON which the frontend transforms
/// into its ChampSelectSession type (myTeam, theirTeam, timer, localPlayerCellId).
///
/// LCU Endpoint: GET /lol-champ-select/v1/session
#[tauri::command]
async fn get_champ_select_session() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    let resp = client
        .get(&format!(
            "https://127.0.0.1:{}/lol-champ-select/v1/session",
            lockfile.port
        ))
        .send()
        .await
        .map_err(|e| format!("LCU request failed: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "LCU champ-select session error {}: {}",
            status.as_u16(),
            body
        ));
    }

    let session: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse champ select session: {}", e))?;

    Ok(session)
}

#[tauri::command]
async fn get_live_game_data() -> Result<serde_json::Value, String> {
    live_client::get_all_game_data().await
}

/// Executes a champion select action (hover, ban, or pick) via the LCU.
/// 
/// Flow:
///   1. Resolve champion name → champion ID via Data Dragon
///   2. PATCH /lol-champ-select/v1/session/actions/{actionId}  → sets championId (hover)
///   3. If lock=true, POST .../actions/{actionId}/complete       → locks in the pick/ban
///
/// Called from: dataService.ts → executeChampSelectAction()
#[tauri::command]
async fn champ_select_action(
    action_id: i64,
    champion_name: String,
    lock: bool,
) -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    // ── Step 1: Resolve champion name → ID via Data Dragon ──
    let champion_id = resolve_champion_id(&champion_name).await?;

    // ── Step 2: PATCH the action to set the champion (hover) ──
    let patch_url = format!(
        "https://127.0.0.1:{}/lol-champ-select/v1/session/actions/{}",
        lockfile.port, action_id
    );
    let patch_body = serde_json::json!({ "championId": champion_id });

    let patch_resp = client
        .patch(&patch_url)
        .json(&patch_body)
        .send()
        .await
        .map_err(|e| format!("PATCH action failed: {}", e))?;

    if !patch_resp.status().is_success() {
        let body = patch_resp.text().await.unwrap_or_default();
        return Err(format!("PATCH action {} failed: {}", action_id, body));
    }

    // ── Step 3: If lock=true, complete the action (lock in) ──
    if lock {
        let complete_url = format!(
            "https://127.0.0.1:{}/lol-champ-select/v1/session/actions/{}/complete",
            lockfile.port, action_id
        );
        let complete_resp = client
            .post(&complete_url)
            .send()
            .await
            .map_err(|e| format!("POST complete failed: {}", e))?;

        if !complete_resp.status().is_success() {
            let body = complete_resp.text().await.unwrap_or_default();
            return Err(format!("Lock-in failed for action {}: {}", action_id, body));
        }

        Ok(serde_json::json!({
            "success": true,
            "message": format!("Locked {}", champion_name)
        }))
    } else {
        Ok(serde_json::json!({
            "success": true,
            "message": format!("Hovering {}", champion_name)
        }))
    }
}

/// Resolves a champion name (e.g. "Tristana") to its numeric champion ID.
/// Uses Data Dragon /cdn/{version}/data/en_US/champion.json and caches the result.
async fn resolve_champion_id(name: &str) -> Result<i64, String> {
    // Fetch latest version
    let realms: serde_json::Value = reqwest::Client::new()
        .get("https://ddragon.leagueoflegends.com/realms/euw.json")
        .send()
        .await
        .map_err(|e| format!("DDragon realms fetch failed: {}", e))?
        .json()
        .await
        .map_err(|e| format!("DDragon realms parse failed: {}", e))?;

    let version = realms["v"].as_str().unwrap_or("26.6.1");

    let champ_data: serde_json::Value = reqwest::Client::new()
        .get(&format!(
            "https://ddragon.leagueoflegends.com/cdn/{}/data/en_US/champion.json",
            version
        ))
        .send()
        .await
        .map_err(|e| format!("DDragon champion data fetch failed: {}", e))?
        .json()
        .await
        .map_err(|e| format!("DDragon champion data parse failed: {}", e))?;

    if let Some(data) = champ_data["data"].as_object() {
        for (_, champ) in data {
            if champ["id"].as_str() == Some(name) {
                if let Some(key_str) = champ["key"].as_str() {
                    return key_str
                        .parse::<i64>()
                        .map_err(|_| format!("Invalid champion key for {}", name));
                }
            }
        }
    }

    Err(format!("Champion '{}' not found in Data Dragon", name))
}

/// Focuses the Velaris window (brings it to front).
/// Called when it's the user's turn to pick/ban.
#[tauri::command]
async fn focus_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn get_summoner_info() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;
    
    // 1. Get current summoner (name, tag, level, icon)
    let summoner: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-summoner/v1/current-summoner", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    
    let puuid = summoner["puuid"].as_str().unwrap_or_default();
    
    // 2. Get ranked stats
    let ranked: serde_json::Value = match client
        .get(&format!("https://127.0.0.1:{}/lol-ranked/v1/ranked-stats/{}", lockfile.port, puuid))
        .send().await
    {
        Ok(resp) => resp.json().await.unwrap_or(serde_json::Value::Null),
        Err(_) => serde_json::Value::Null,
    };
    
    // Extract solo queue stats from queueMap
    let solo_q = &ranked["queueMap"]["RANKED_SOLO_5x5"];
    
    // 3. Build the combined response matching SummonerInfo interface
    Ok(serde_json::json!({
        "name": summoner["gameName"].as_str()
            .or_else(|| summoner["displayName"].as_str())
            .or_else(|| summoner["internalName"].as_str())
            .unwrap_or("Summoner"),
        "tag": summoner["tagLine"].as_str().unwrap_or(""),
        "level": summoner["summonerLevel"].as_i64().unwrap_or(1),
        "profileIconId": summoner["profileIconId"].as_i64().unwrap_or(1),
        "rank": solo_q["tier"].as_str().unwrap_or("UNRANKED"),
        "division": solo_q["division"].as_str().unwrap_or(""),
        "lp": solo_q["leaguePoints"].as_i64().unwrap_or(0),
        "wins": solo_q["wins"].as_i64().unwrap_or(0),
        "losses": solo_q["losses"].as_i64().unwrap_or(0),
    }))
}

#[tauri::command]
async fn get_current_summoner() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;
    
    let summoner: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-summoner/v1/current-summoner", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    
    Ok(summoner)
}

#[tauri::command]
async fn get_ranked_stats() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;
    
    // First get PUUID from current summoner
    let summoner: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-summoner/v1/current-summoner", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    
    let puuid = summoner["puuid"].as_str()
        .ok_or_else(|| "Could not get PUUID from summoner".to_string())?;
    
    let ranked: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-ranked/v1/ranked-stats/{}", lockfile.port, puuid))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    
    Ok(ranked)
}

// ─── NEW: Riot API Commands (for Player Lookup & Profile Search) ──────────────
//
// These commands use the official Riot Games API (not LCU).
// They require a valid Riot API key (Development or Production).
//
// Used by: riotApi.ts → lookupFullProfile(), searchSummoners()

/// Account-v1: GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
/// Returns { puuid, gameName, tagLine }
#[tauri::command]
async fn riot_get_account_by_riot_id(
    game_name: String,
    tag_line: String,
    regional: String,
) -> Result<serde_json::Value, String> {
    let api_key = get_riot_api_key()
        .ok_or_else(|| "Riot API key not configured. Set RIOT_API_KEY env var or add riot-api-key.txt".to_string())?;
    
    let client = riot_api_client(&api_key)?;
    let url = format!(
        "https://{}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{}/{}",
        regional, game_name, tag_line
    );
    
    let resp = client.get(&url).send().await
        .map_err(|e| format!("Riot API request failed: {}", e))?;
    
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Riot Account API error {}: {}", status.as_u16(), body));
    }
    
    resp.json().await.map_err(|e| format!("Failed to parse account response: {}", e))
}

/// Summoner-v4: GET /lol/summoner/v4/summoners/by-puuid/{puuid}
/// Returns { id, accountId, puuid, profileIconId, summonerLevel }
#[tauri::command]
async fn riot_get_summoner_by_puuid(
    puuid: String,
    platform: String,
) -> Result<serde_json::Value, String> {
    let api_key = get_riot_api_key()
        .ok_or_else(|| "Riot API key not configured".to_string())?;
    
    let client = riot_api_client(&api_key)?;
    let url = format!(
        "https://{}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{}",
        platform, puuid
    );
    
    let resp = client.get(&url).send().await
        .map_err(|e| format!("Riot API request failed: {}", e))?;
    
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Riot Summoner API error {}: {}", status.as_u16(), body));
    }
    
    resp.json().await.map_err(|e| format!("Failed to parse summoner response: {}", e))
}

/// League-v4: GET /lol/league/v4/entries/by-summoner/{summonerId}
/// Returns array of { queueType, tier, rank, leaguePoints, wins, losses }
#[tauri::command]
async fn riot_get_league_entries(
    summoner_id: String,
    platform: String,
) -> Result<serde_json::Value, String> {
    let api_key = get_riot_api_key()
        .ok_or_else(|| "Riot API key not configured".to_string())?;
    
    let client = riot_api_client(&api_key)?;
    let url = format!(
        "https://{}.api.riotgames.com/lol/league/v4/entries/by-summoner/{}",
        platform, summoner_id
    );
    
    let resp = client.get(&url).send().await
        .map_err(|e| format!("Riot API request failed: {}", e))?;
    
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Riot League API error {}: {}", status.as_u16(), body));
    }
    
    resp.json().await.map_err(|e| format!("Failed to parse league entries: {}", e))
}

/// Searches the in-memory cache of previously looked-up summoner profiles.
/// Called from: riotApi.ts → searchSummoners() for partial/fuzzy matching.
#[tauri::command]
async fn search_summoners_cached(
    query: String,
    cache: tauri::State<'_, Mutex<SearchCache>>,
) -> Result<serde_json::Value, String> {
    let cache = cache.lock().map_err(|e| e.to_string())?;
    let results = cache.search(&query);
    serde_json::to_value(results).map_err(|e| e.to_string())
}

/// Adds a profile to the search cache after a successful lookup.
/// Called from: riotApi.ts after lookupFullProfile() succeeds.
#[tauri::command]
async fn cache_summoner_profile(
    profile: CachedSummonerProfile,
    cache: tauri::State<'_, Mutex<SearchCache>>,
) -> Result<(), String> {
    let mut cache = cache.lock().map_err(|e| e.to_string())?;
    cache.add(profile);
    Ok(())
}

// ─── NEW: Settings Persistence ────────────────────────────────────────────────
//
// Saves/loads settings to a JSON file in the app data directory.
// Also controls OS-level autostart via tauri-plugin-autostart.

#[tauri::command]
async fn save_settings(
    settings: serde_json::Value,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Save to JSON file in app data dir
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app dir: {}", e))?;
    
    let settings_path = app_dir.join("settings.json");
    let json_str = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&settings_path, json_str)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn load_settings(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let settings_path = app_dir.join("settings.json");
    
    if !settings_path.exists() {
        return Ok(serde_json::Value::Null);
    }
    
    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings file: {}", e))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(Mutex::new(SearchCache::new()))
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Spawn LCU connection watcher in background
            tauri::async_runtime::spawn(async move {
                lcu::watch_client_state(handle).await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // LCU commands
            get_match_history,
            get_champ_select_profiles,
            get_champ_select_session,
            get_live_game_data,
            get_summoner_info,
            get_current_summoner,
            get_ranked_stats,
            champ_select_action,
            focus_main_window,
            // Riot API commands
            riot_get_account_by_riot_id,
            riot_get_summoner_by_puuid,
            riot_get_league_entries,
            // Search cache
            search_summoners_cached,
            cache_summoner_profile,
            // Settings
            save_settings,
            load_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
