mod lcu;
mod live_client;

use std::sync::{Arc, Mutex};
use tauri::Manager;

// ─── Overlay Hotkey State ─────────────────────────────────────────────────────

const DEFAULT_OVERLAY_HOTKEY: &str = "Alt+F9";

struct OverlayHotkeyState(Mutex<String>);

// ─── Riot API Key ─────────────────────────────────────────────────────────────

fn get_riot_api_key() -> Option<String> {
    if let Ok(key) = std::env::var("RIOT_API_KEY") {
        if !key.is_empty() { return Some(key); }
    }
    // Look in the OS config directory (e.g. %APPDATA%\velaris\riot-api-key.txt)
    if let Some(config_dir) = dirs::config_dir() {
        let path = config_dir.join("velaris").join("riot-api-key.txt");
        if let Ok(key) = std::fs::read_to_string(&path) {
            let trimmed = key.trim().to_string();
            if !trimmed.is_empty() { return Some(trimmed); }
        }
    }
    None
}

#[tauri::command]
async fn save_riot_api_key(key: String) -> Result<(), String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not locate config directory".to_string())?;
    let dir = config_dir.join("velaris");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    let path = dir.join("riot-api-key.txt");
    std::fs::write(&path, key.trim()).map_err(|e| format!("Failed to save API key: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn get_riot_api_key_status() -> String {
    match get_riot_api_key() {
        Some(_) => "configured".to_string(),
        None => "not_set".to_string(),
    }
}

fn read_velaris_config_key(field: &str) -> Option<String> {
    // 1. Try home dir: ~/.velaris/config.json
    if let Some(home) = dirs::home_dir() {
        let path = home.join(".velaris").join("config.json");
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(val) = json.get(field).and_then(|v| v.as_str()) {
                    if !val.is_empty() { return Some(val.to_string()); }
                }
            }
        }
    }
    // 2. Try OS config dir: %APPDATA%\velaris\config.json
    if let Some(config_dir) = dirs::config_dir() {
        let path = config_dir.join("velaris").join("config.json");
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(val) = json.get(field).and_then(|v| v.as_str()) {
                    if !val.is_empty() { return Some(val.to_string()); }
                }
            }
        }
    }
    None
}

#[tauri::command]
fn get_anthropic_key() -> Result<String, String> {
    // 1. Environment variable
    if let Ok(key) = std::env::var("ANTHROPIC_API_KEY") {
        if !key.is_empty() { return Ok(key); }
    }
    // 2. ~/.velaris/config.json → "anthropic_api_key"
    if let Some(key) = read_velaris_config_key("anthropic_api_key") {
        return Ok(key);
    }
    Err("Anthropic API key not found. Add anthropic_api_key to ~/.velaris/config.json".to_string())
}

// ─── App Version ──────────────────────────────────────────────────────────────

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ─── Groq API Key (secure OS-level storage) ───────────────────────────────────

fn groq_key_path() -> Option<std::path::PathBuf> {
    dirs::config_dir().map(|d| d.join("velaris").join("groq-api-key.txt"))
}

#[tauri::command]
async fn save_groq_key(key: String) -> Result<(), String> {
    let path = groq_key_path().ok_or("Could not locate config directory")?;
    std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    std::fs::write(&path, key.trim()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_groq_key() -> Result<Option<String>, String> {
    if let Some(path) = groq_key_path() {
        if let Ok(key) = std::fs::read_to_string(&path) {
            let trimmed = key.trim().to_string();
            if !trimmed.is_empty() { return Ok(Some(trimmed)); }
        }
    }
    Ok(None)
}

#[tauri::command]
async fn clear_groq_key() -> Result<(), String> {
    if let Some(path) = groq_key_path() {
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
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

// ─── Summoner Search Cache ────────────────────────────────────────────────────

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
    cached_at: i64,
}

struct SearchCache {
    profiles: Vec<CachedSummonerProfile>,
}

impl SearchCache {
    fn new() -> Self { Self { profiles: Vec::new() } }

    fn add(&mut self, profile: CachedSummonerProfile) {
        if let Some(e) = self.profiles.iter_mut().find(|p| p.puuid == profile.puuid) {
            *e = profile;
        } else {
            self.profiles.push(profile);
        }
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

// ─── Match History (full 10-player detail) ────────────────────────────────────

#[tauri::command]
async fn get_match_history() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    let summoner: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-summoner/v1/current-summoner", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let puuid = summoner["puuid"].as_str().unwrap_or_default();

    let history: serde_json::Value = client
        .get(&format!(
            "https://127.0.0.1:{}/lol-match-history/v1/products/lol/{}/matches?begIndex=0&endIndex=20",
            lockfile.port, puuid
        ))
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let games = match history["games"]["games"].as_array() {
        Some(g) => g.clone(),
        None => return Ok(history),
    };

    // Fetch full 10-participant details with bounded concurrency (max 6 at a time)
    let port = lockfile.port;
    let semaphore = Arc::new(tokio::sync::Semaphore::new(6));
    let handles: Vec<_> = games.iter()
        .filter_map(|g| g["gameId"].as_u64())
        .map(|game_id| {
            let c = client.clone();
            let sem = semaphore.clone();
            tokio::spawn(async move {
                let _permit = sem.acquire().await.ok()?;
                c.get(&format!("https://127.0.0.1:{}/lol-match-history/v1/games/{}", port, game_id))
                    .send().await.ok()?.json::<serde_json::Value>().await.ok()
            })
        })
        .collect();

    let mut detailed: Vec<serde_json::Value> = Vec::new();
    for (i, handle) in handles.into_iter().enumerate() {
        let detail = handle.await.unwrap_or(None);
        let has_all = detail.as_ref()
            .and_then(|d| d["participants"].as_array())
            .map(|a| a.len() >= 2)
            .unwrap_or(false);
        if has_all {
            detailed.push(detail.unwrap());
        } else if i < games.len() {
            detailed.push(games[i].clone());
        }
    }

    let count = detailed.len();
    Ok(serde_json::json!({
        "accountId": history["accountId"],
        "puuid": puuid,
        "games": { "games": detailed, "gameCount": count }
    }))
}

// ─── Champ Select Profiles ────────────────────────────────────────────────────

#[tauri::command]
async fn get_champ_select_profiles() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    let session: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-champ-select/v1/session", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let my_team = session["myTeam"].as_array().cloned().unwrap_or_default();
    let mut profiles = Vec::new();

    for member in &my_team {
        let summoner_id = member["summonerId"].as_i64().unwrap_or(0);
        let champion_id = member["championId"].as_i64().unwrap_or(0);
        let assigned_position = member["assignedPosition"].as_str().unwrap_or("");
        if summoner_id == 0 { continue; }

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

        let ranked: serde_json::Value = match client
            .get(&format!("https://127.0.0.1:{}/lol-ranked/v1/ranked-stats/{}", lockfile.port, puuid))
            .send().await
        {
            Ok(resp) => resp.json().await.unwrap_or(serde_json::Value::Null),
            Err(_) => serde_json::Value::Null,
        };

        let solo_q = &ranked["queueMap"]["RANKED_SOLO_5x5"];

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

        let games = match_history["games"]["games"].as_array();
        let (mut recent_wins, mut recent_losses, mut total_kills, mut total_deaths,
             mut total_assists, mut total_cs, mut total_neutral_cs, mut total_duration,
             mut total_vision, mut current_streak) = (0i64, 0i64, 0i64, 0i64, 0i64, 0i64, 0i64, 0f64, 0i64, 0i64);
        let mut champ_stats: std::collections::HashMap<String, (i64, i64, i64, i64, i64)> = std::collections::HashMap::new();
        let mut streak_counting = true;
        let mut streak_win: Option<bool> = None;

        if let Some(game_list) = games {
            for game in game_list {
                let participant_id = {
                    let mut pid = 1i64;
                    if let Some(ids) = game["participantIdentities"].as_array() {
                        for identity in ids {
                            if identity["player"]["puuid"].as_str().unwrap_or("") == puuid {
                                pid = identity["participantId"].as_i64().unwrap_or(1);
                                break;
                            }
                        }
                    }
                    pid
                };

                if let Some(parts) = game["participants"].as_array() {
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
                        total_kills += kills; total_deaths += deaths; total_assists += assists;
                        total_cs += cs; total_neutral_cs += neutral_cs;
                        total_duration += duration; total_vision += vision;

                        let champ_name = format!("Champion{}", champ_id);
                        let entry = champ_stats.entry(champ_name).or_insert((0, 0, 0, 0, 0));
                        entry.0 += 1;
                        if win { entry.1 += 1; }
                        entry.2 += kills; entry.3 += deaths; entry.4 += assists;

                        if streak_counting {
                            match streak_win {
                                None => { streak_win = Some(win); current_streak = if win { 1 } else { -1 }; }
                                Some(prev) => {
                                    if prev == win { current_streak += if win { 1 } else { -1 }; }
                                    else { streak_counting = false; }
                                }
                            }
                        }
                    }
                }
            }
        }

        let recent_games = recent_wins + recent_losses;
        let duration_min = if total_duration > 0.0 { total_duration / 60.0 } else { 1.0 };
        let recent_avg_kda = if recent_games > 0 && total_deaths > 0 {
            (total_kills + total_assists) as f64 / total_deaths as f64
        } else if recent_games > 0 { (total_kills + total_assists) as f64 } else { 0.0 };
        let recent_avg_cs_per_min = if recent_games > 0 { (total_cs + total_neutral_cs) as f64 / duration_min } else { 0.0 };
        let recent_avg_vision_per_min = if recent_games > 0 { total_vision as f64 / duration_min } else { 0.0 };
        let recent_avg_deaths = if recent_games > 0 { total_deaths as f64 / recent_games as f64 } else { 0.0 };

        let mut champ_vec: Vec<_> = champ_stats.into_iter().collect();
        champ_vec.sort_by(|a, b| b.1.0.cmp(&a.1.0));
        let champions: Vec<serde_json::Value> = champ_vec.iter().take(3).map(|(name, (g, w, k, d, a))| {
            let wr = if *g > 0 { (*w as f64 / *g as f64 * 100.0).round() as i64 } else { 0 };
            let kda = if *d > 0 { (*k + *a) as f64 / *d as f64 } else { (*k + *a) as f64 };
            serde_json::json!({ "name": name, "games": g, "winrate": wr, "avgKda": (kda * 10.0).round() / 10.0 })
        }).collect();

        let current_role = match assigned_position {
            "top" => "TOP", "jungle" => "JGL", "middle" => "MID",
            "bottom" => "ADC", "utility" => "SUP", _ => "MID",
        };

        profiles.push(serde_json::json!({
            "summonerName": summoner_name, "accountLevel": account_level,
            "rank": solo_q["tier"].as_str().unwrap_or("UNRANKED"),
            "division": solo_q["division"].as_str().unwrap_or(""),
            "lp": solo_q["leaguePoints"].as_i64().unwrap_or(0),
            "wins": solo_q["wins"].as_i64().unwrap_or(0),
            "losses": solo_q["losses"].as_i64().unwrap_or(0),
            "recentWins": recent_wins, "recentLosses": recent_losses,
            "recentAvgKda": (recent_avg_kda * 10.0).round() / 10.0,
            "recentAvgCsPerMin": (recent_avg_cs_per_min * 10.0).round() / 10.0,
            "recentAvgVisionPerMin": (recent_avg_vision_per_min * 10.0).round() / 10.0,
            "recentAvgDeaths": (recent_avg_deaths * 10.0).round() / 10.0,
            "champions": champions,
            "currentChampion": format!("Champion{}", champion_id),
            "currentRole": current_role, "currentStreak": current_streak,
        }));
    }

    Ok(serde_json::Value::Array(profiles))
}

// ─── Champ Select Session ─────────────────────────────────────────────────────

#[tauri::command]
async fn get_champ_select_session() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    let resp = client
        .get(&format!("https://127.0.0.1:{}/lol-champ-select/v1/session", lockfile.port))
        .send().await.map_err(|e| format!("LCU request failed: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("LCU champ-select error {}: {}", status.as_u16(), body));
    }

    resp.json().await.map_err(|e| format!("Failed to parse session: {}", e))
}

// ─── Live Game Data ───────────────────────────────────────────────────────────

#[tauri::command]
async fn get_live_game_data() -> Result<serde_json::Value, String> {
    live_client::get_all_game_data().await
}

// ─── Champ Select Action (pick/ban) ──────────────────────────────────────────

#[tauri::command]
async fn champ_select_action(
    action_id: i64,
    champion_name: String,
    lock: bool,
    action_type: Option<String>,
) -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    let champion_id = resolve_champion_id(&champion_name).await?;

    let patch_url = format!(
        "https://127.0.0.1:{}/lol-champ-select/v1/session/actions/{}",
        lockfile.port, action_id
    );
    let patch_resp = client
        .patch(&patch_url)
        .json(&serde_json::json!({ "championId": champion_id }))
        .send().await.map_err(|e| format!("PATCH action failed: {}", e))?;

    if !patch_resp.status().is_success() {
        let body = patch_resp.text().await.unwrap_or_default();
        return Err(format!("PATCH action {} failed: {}", action_id, body));
    }

    if lock {
        let complete_url = format!(
            "https://127.0.0.1:{}/lol-champ-select/v1/session/actions/{}/complete",
            lockfile.port, action_id
        );
        let act_type = action_type.as_deref().unwrap_or("pick");
        let complete_resp = client
            .post(&complete_url)
            .json(&serde_json::json!({
                "championId": champion_id,
                "completed": true,
                "id": action_id,
                "isAllyAction": true,
                "type": act_type
            }))
            .send().await.map_err(|e| format!("POST complete failed: {}", e))?;

        if !complete_resp.status().is_success() {
            let status = complete_resp.status().as_u16();
            let body = complete_resp.text().await.unwrap_or_default();
            return Err(format!("Lock-in failed (HTTP {}): {}", status, body));
        }

        Ok(serde_json::json!({ "success": true, "message": format!("Locked {}", champion_name) }))
    } else {
        Ok(serde_json::json!({ "success": true, "message": format!("Hovering {}", champion_name) }))
    }
}

async fn resolve_champion_id(name: &str) -> Result<i64, String> {
    let realms: serde_json::Value = reqwest::Client::new()
        .get("https://ddragon.leagueoflegends.com/realms/euw.json")
        .send().await.map_err(|e| format!("DDragon realms fetch failed: {}", e))?
        .json().await.map_err(|e| format!("DDragon realms parse failed: {}", e))?;

    let version = realms["v"].as_str().unwrap_or("26.6.1");

    let champ_data: serde_json::Value = reqwest::Client::new()
        .get(&format!("https://ddragon.leagueoflegends.com/cdn/{}/data/en_US/champion.json", version))
        .send().await.map_err(|e| format!("DDragon champion fetch failed: {}", e))?
        .json().await.map_err(|e| format!("DDragon champion parse failed: {}", e))?;

    if let Some(data) = champ_data["data"].as_object() {
        for (_, champ) in data {
            if champ["id"].as_str() == Some(name) {
                if let Some(key_str) = champ["key"].as_str() {
                    return key_str.parse::<i64>().map_err(|_| format!("Invalid champion key for {}", name));
                }
            }
        }
    }

    Err(format!("Champion '{}' not found in Data Dragon", name))
}

// ─── Summoner Info & Ranked ───────────────────────────────────────────────────

#[tauri::command]
async fn get_summoner_info() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    let summoner: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-summoner/v1/current-summoner", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let puuid = summoner["puuid"].as_str().unwrap_or_default();
    let ranked: serde_json::Value = match client
        .get(&format!("https://127.0.0.1:{}/lol-ranked/v1/ranked-stats/{}", lockfile.port, puuid))
        .send().await
    {
        Ok(resp) => resp.json().await.unwrap_or(serde_json::Value::Null),
        Err(_) => serde_json::Value::Null,
    };

    let solo_q = &ranked["queueMap"]["RANKED_SOLO_5x5"];
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
    client.get(&format!("https://127.0.0.1:{}/lol-summoner/v1/current-summoner", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_ranked_stats() -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    let summoner: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-summoner/v1/current-summoner", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let puuid = summoner["puuid"].as_str().ok_or_else(|| "Could not get PUUID".to_string())?;
    client.get(&format!("https://127.0.0.1:{}/lol-ranked/v1/ranked-stats/{}", lockfile.port, puuid))
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())
}

// ─── Ready Check ──────────────────────────────────────────────────────────────

#[tauri::command]
async fn accept_ready_check() -> Result<(), String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;
    client
        .post(&format!("https://127.0.0.1:{}/lol-matchmaking/v1/ready-check/accept", lockfile.port))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Auto-updater ────────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    available: bool,
    version: Option<String>,
    notes: Option<String>,
}

#[tauri::command]
async fn check_for_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    use tauri_plugin_updater::UpdaterExt;
    match app.updater().map_err(|e| e.to_string())?.check().await {
        Ok(Some(update)) => Ok(UpdateInfo {
            available: true,
            version: Some(update.version.clone()),
            notes: update.body.clone(),
        }),
        Ok(None) => Ok(UpdateInfo { available: false, version: None, notes: None }),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;
    if let Some(update) = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())? {
        update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── Overlay Window Control ───────────────────────────────────────────────────

#[tauri::command]
fn open_overlay(app: tauri::AppHandle) {
    lcu::open_overlay_window(&app);
}

#[tauri::command]
fn close_overlay(app: tauri::AppHandle) {
    lcu::close_overlay_window(&app);
}

#[tauri::command]
fn set_overlay_interactive(_app: tauri::AppHandle, interactive: bool) {
    // The overlay stays click-through (WS_EX_TRANSPARENT) at ALL times —
    // toggling it breaks WebView2 rendering and causes the game to lose focus.
    // Instead, a WH_MOUSE_LL global hook captures mouse events during drag mode
    // and forwards them to the overlay via Tauri events, so the game always keeps
    // its mouse input.
    if interactive {
        #[cfg(windows)]
        lcu::install_mouse_hook();
    } else {
        #[cfg(windows)]
        lcu::uninstall_mouse_hook();
    }
}

// ─── Window Focus ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn focus_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
    }
    Ok(())
}

// ─── Riot API Commands ────────────────────────────────────────────────────────

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
    let resp = client.get(&url).send().await.map_err(|e| format!("Riot API request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Riot Account API error {}: {}", status.as_u16(), body));
    }
    resp.json().await.map_err(|e| format!("Failed to parse account response: {}", e))
}

#[tauri::command]
async fn riot_get_summoner_by_puuid(
    puuid: String,
    platform: String,
) -> Result<serde_json::Value, String> {
    let api_key = get_riot_api_key().ok_or_else(|| "Riot API key not configured".to_string())?;
    let client = riot_api_client(&api_key)?;
    let url = format!("https://{}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{}", platform, puuid);
    let resp = client.get(&url).send().await.map_err(|e| format!("Riot API request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Riot Summoner API error {}: {}", status.as_u16(), body));
    }
    resp.json().await.map_err(|e| format!("Failed to parse summoner response: {}", e))
}

#[tauri::command]
async fn riot_get_league_entries(
    summoner_id: String,
    platform: String,
) -> Result<serde_json::Value, String> {
    let api_key = get_riot_api_key().ok_or_else(|| "Riot API key not configured".to_string())?;
    let client = riot_api_client(&api_key)?;
    let url = format!("https://{}.api.riotgames.com/lol/league/v4/entries/by-summoner/{}", platform, summoner_id);
    let resp = client.get(&url).send().await.map_err(|e| format!("Riot API request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Riot League API error {}: {}", status.as_u16(), body));
    }
    resp.json().await.map_err(|e| format!("Failed to parse league entries: {}", e))
}

// ─── Match-v5 API ─────────────────────────────────────────────────────────────

/// Fetches the last `count` ranked solo matches for a Riot ID via Match-v5.
/// Flow: Account-v1 (PUUID) → Match-v5/ids → Match-v5/details (parallel).
/// Requires RIOT_API_KEY env var or %APPDATA%\velaris\riot-api-key.txt.
#[tauri::command]
async fn riot_get_match_history_v5(
    game_name: String,
    tag_line: String,
    regional: String,
    count: Option<u32>,
) -> Result<serde_json::Value, String> {
    let api_key = get_riot_api_key()
        .ok_or_else(|| "NO_API_KEY".to_string())?;
    let client = riot_api_client(&api_key)?;
    let n = count.unwrap_or(20).min(100);

    // 1. Resolve PUUID via Account-v1
    let account_url = format!(
        "https://{}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{}/{}",
        regional,
        urlencoding::encode(&game_name),
        urlencoding::encode(&tag_line),
    );
    let account: serde_json::Value = client.get(&account_url)
        .send().await.map_err(|e| format!("Account API request failed: {}", e))?
        .error_for_status().map_err(|e| format!("Account API error: {}", e))?
        .json().await.map_err(|e| format!("Account API parse failed: {}", e))?;

    let puuid = account["puuid"].as_str()
        .ok_or_else(|| "PUUID not found in account response".to_string())?
        .to_string();

    // 2. Fetch match IDs (ranked solo queue = 420, or all queues if 0)
    let ids_url = format!(
        "https://{}.api.riotgames.com/lol/match/v5/matches/by-puuid/{}/ids?queue=420&count={}",
        regional, puuid, n
    );
    let match_ids: Vec<String> = client.get(&ids_url)
        .send().await.map_err(|e| format!("Match IDs request failed: {}", e))?
        .error_for_status().map_err(|e| format!("Match IDs API error: {}", e))?
        .json().await.map_err(|e| format!("Match IDs parse failed: {}", e))?;

    if match_ids.is_empty() {
        return Ok(serde_json::json!({ "puuid": puuid, "matches": [] }));
    }

    // 3. Fetch match details in parallel (max 6 concurrent)
    let semaphore = Arc::new(tokio::sync::Semaphore::new(6));
    let handles: Vec<_> = match_ids.iter().map(|id| {
        let c = client.clone();
        let regional = regional.clone();
        let match_id = id.clone();
        let sem = semaphore.clone();
        tokio::spawn(async move {
            let _permit = sem.acquire().await.ok()?;
            let url = format!(
                "https://{}.api.riotgames.com/lol/match/v5/matches/{}",
                regional, match_id
            );
            c.get(&url).send().await.ok()?.json::<serde_json::Value>().await.ok()
        })
    }).collect();

    let mut matches: Vec<serde_json::Value> = Vec::new();
    for handle in handles {
        if let Ok(Some(m)) = handle.await {
            matches.push(m);
        }
    }

    Ok(serde_json::json!({ "puuid": puuid, "matches": matches }))
}

/// Same as riot_get_match_history_v5 but takes a PUUID directly — skips Account-v1 lookup.
#[tauri::command]
async fn riot_get_matches_by_puuid(
    puuid: String,
    regional: String,
    count: Option<u32>,
) -> Result<serde_json::Value, String> {
    let api_key = get_riot_api_key()
        .ok_or_else(|| "NO_API_KEY".to_string())?;
    let client = riot_api_client(&api_key)?;
    let n = count.unwrap_or(20).min(100);

    let ids_url = format!(
        "https://{}.api.riotgames.com/lol/match/v5/matches/by-puuid/{}/ids?queue=420&count={}",
        regional, puuid, n
    );
    let match_ids: Vec<String> = client.get(&ids_url)
        .send().await.map_err(|e| format!("Match IDs request failed: {}", e))?
        .error_for_status().map_err(|e| format!("Match IDs API error: {}", e))?
        .json().await.map_err(|e| format!("Match IDs parse failed: {}", e))?;

    if match_ids.is_empty() {
        return Ok(serde_json::json!([]));
    }

    let semaphore = Arc::new(tokio::sync::Semaphore::new(6));
    let handles: Vec<_> = match_ids.iter().map(|id| {
        let c = client.clone();
        let regional = regional.clone();
        let match_id = id.clone();
        let sem = semaphore.clone();
        tokio::spawn(async move {
            let _permit = sem.acquire().await.ok()?;
            let url = format!(
                "https://{}.api.riotgames.com/lol/match/v5/matches/{}",
                regional, match_id
            );
            c.get(&url).send().await.ok()?.json::<serde_json::Value>().await.ok()
        })
    }).collect();

    let mut matches: Vec<serde_json::Value> = Vec::new();
    for handle in handles {
        if let Ok(Some(m)) = handle.await {
            matches.push(m);
        }
    }

    Ok(serde_json::Value::Array(matches))
}

// ─── Summoner Search Cache Commands ──────────────────────────────────────────

#[tauri::command]
async fn search_summoners_cached(
    query: String,
    cache: tauri::State<'_, Mutex<SearchCache>>,
) -> Result<serde_json::Value, String> {
    let cache = cache.lock().map_err(|e| e.to_string())?;
    let results = cache.search(&query);
    serde_json::to_value(results).map_err(|e| e.to_string())
}

#[tauri::command]
async fn cache_summoner_profile(
    profile: CachedSummonerProfile,
    cache: tauri::State<'_, Mutex<SearchCache>>,
) -> Result<(), String> {
    let mut cache = cache.lock().map_err(|e| e.to_string())?;
    cache.add(profile);
    Ok(())
}

// ─── Live Game Rank Lookup ────────────────────────────────────────────────────

/// Fetch ranked stats for a player by display name (from port 2999 Live Client API).
/// Uses deprecated `/lol/summoner/v4/summoners/by-name` endpoint which returns id + puuid
/// in a single call, then fetches league entries.
#[tauri::command]
async fn riot_get_rank_by_summoner_name(
    summoner_name: String,
    platform: String,
) -> Result<serde_json::Value, String> {
    let api_key = get_riot_api_key().ok_or_else(|| "Riot API key not configured".to_string())?;
    let client = riot_api_client(&api_key)?;

    // 1. Summoner by name → get summoner id
    let enc = urlencoding::encode(&summoner_name);
    let url = format!("https://{}.api.riotgames.com/lol/summoner/v4/summoners/by-name/{}", platform, enc);
    let resp = client.get(&url).send().await.map_err(|e| format!("Summoner API failed: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Summoner API error {}", resp.status().as_u16()));
    }
    let summoner: serde_json::Value = resp.json().await.map_err(|e| format!("Summoner parse failed: {}", e))?;
    let summoner_id = summoner["id"].as_str().ok_or_else(|| "No summoner id".to_string())?.to_string();

    // 2. League entries by summoner id → ranked data
    let league_url = format!("https://{}.api.riotgames.com/lol/league/v4/entries/by-summoner/{}", platform, summoner_id);
    let league_resp = client.get(&league_url).send().await.map_err(|e| format!("League API failed: {}", e))?;
    if !league_resp.status().is_success() {
        return Err(format!("League API error {}", league_resp.status().as_u16()));
    }
    league_resp.json().await.map_err(|e| format!("League parse failed: {}", e))
}

// ─── Champion Build Data (lolalytics) ────────────────────────────────────────

fn extract_next_data_json(html: &str) -> Option<String> {
    let marker = r#"<script id="__NEXT_DATA__" type="application/json">"#;
    let start = html.find(marker)? + marker.len();
    let rest = &html[start..];
    let end = rest.find("</script>")?;
    Some(rest[..end].to_string())
}

#[tauri::command]
async fn fetch_champion_build(champion: String, lane: String) -> Result<serde_json::Value, String> {
    let lane_param = match lane.to_uppercase().as_str() {
        "TOP" => "top",
        "JGL" | "JUNGLE" => "jungle",
        "MID" | "MIDDLE" => "middle",
        "ADC" | "BOTTOM" => "adc",
        "SUP" | "SUPPORT" | "UTILITY" => "support",
        _ => "adc",
    };

    let url = format!(
        "https://lolalytics.com/lol/{}/build/?lane={}&tier=emerald_plus&region=all",
        champion.to_lowercase(),
        lane_param
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let html = client
        .get(&url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.5")
        .send()
        .await
        .map_err(|e| format!("fetch_champion_build: network error: {}", e))?
        .text()
        .await
        .map_err(|e| format!("fetch_champion_build: read error: {}", e))?;

    let json_str = extract_next_data_json(&html)
        .ok_or_else(|| "No __NEXT_DATA__ found in lolalytics response".to_string())?;

    serde_json::from_str::<serde_json::Value>(&json_str)
        .map(|v| v["props"]["pageProps"].clone())
        .map_err(|e| format!("JSON parse error: {}", e))
}

// ─── Rune Page Import via LCU ─────────────────────────────────────────────────

#[tauri::command]
async fn import_rune_page(page: serde_json::Value) -> Result<serde_json::Value, String> {
    let lockfile = lcu::read_lockfile().map_err(|e| e.to_string())?;
    let client = lcu::create_client(&lockfile).map_err(|e| e.to_string())?;

    // Get all existing pages to find an editable one
    let pages: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-perks/v1/pages", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    // Find a deletable page (isDeletable: true) or use page 1
    let target_id: Option<i64> = pages.as_array()
        .and_then(|arr| arr.iter().find(|p| p["isDeletable"].as_bool().unwrap_or(false)))
        .and_then(|p| p["id"].as_i64());

    if let Some(id) = target_id {
        // PUT to update existing deletable page
        let url = format!("https://127.0.0.1:{}/lol-perks/v1/pages/{}", lockfile.port, id);
        let resp = client.put(&url).json(&page).send().await.map_err(|e| e.to_string())?;
        if resp.status().is_success() {
            return Ok(serde_json::json!({ "success": true, "message": "Rune page imported" }));
        }
    }

    // POST to create a new page
    let url = format!("https://127.0.0.1:{}/lol-perks/v1/pages", lockfile.port);
    let resp = client.post(&url).json(&page).send().await.map_err(|e| e.to_string())?;
    if resp.status().is_success() {
        Ok(serde_json::json!({ "success": true, "message": "Rune page created" }))
    } else {
        let body = resp.text().await.unwrap_or_default();
        Err(format!("LCU perks error: {}", body))
    }
}

// ─── Settings Persistence ─────────────────────────────────────────────────────

#[tauri::command]
async fn save_settings(settings: serde_json::Value, app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app dir: {}", e))?;
    let json_str = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(app_dir.join("settings.json"), json_str)
        .map_err(|e| format!("Failed to write settings: {}", e))
}

#[tauri::command]
async fn load_settings(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let path = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("settings.json");
    if !path.exists() { return Ok(serde_json::Value::Null); }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse settings: {}", e))
}

// ─── Overlay Hotkey Commands ──────────────────────────────────────────────────

#[tauri::command]
fn get_overlay_hotkey(state: tauri::State<'_, OverlayHotkeyState>) -> String {
    state.0.lock().map(|s| s.clone()).unwrap_or_else(|_| DEFAULT_OVERLAY_HOTKEY.to_string())
}

#[tauri::command]
fn set_overlay_hotkey(
    hotkey: String,
    state: tauri::State<'_, OverlayHotkeyState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    // Parse and validate the new hotkey string
    let new_hotkey: tauri_plugin_global_shortcut::Shortcut = hotkey
        .parse()
        .map_err(|e| format!("Invalid hotkey '{}': {}", hotkey, e))?;

    // Unregister old hotkey if any
    {
        let old = state.0.lock().map_err(|e| e.to_string())?;
        if let Ok(old_shortcut) = old.parse::<tauri_plugin_global_shortcut::Shortcut>() {
            let _ = app.global_shortcut().unregister(old_shortcut);
        }
    }

    // Register new hotkey — toggles overlay on press
    {
        app.global_shortcut()
            .on_shortcut(new_hotkey, move |handle, _shortcut, event| {
                if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    if handle.get_webview_window("overlay").is_some() {
                        lcu::close_overlay_window(handle);
                        if let Some(main) = handle.get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.set_focus();
                        }
                    } else {
                        if let Some(main) = handle.get_webview_window("main") {
                            let _ = main.hide();
                        }
                        lcu::open_overlay_window(handle);
                    }
                }
            })
            .map_err(|e| format!("Failed to register hotkey: {}", e))?;
    }

    // Persist new value
    let mut current = state.0.lock().map_err(|e| e.to_string())?;
    *current = hotkey;
    Ok(())
}

// ─── App Entry Point ──────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Mutex::new(SearchCache::new()))
        .manage(OverlayHotkeyState(Mutex::new(DEFAULT_OVERLAY_HOTKEY.to_string())))
        .setup(|app| {
            // ── LCU state watcher ────────────────────────────────────────────
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                lcu::watch_client_state(handle).await;
            });

            // ── System tray ───────────────────────────────────────────────────
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
            let show_item = MenuItem::with_id(app, "show", "Mostrar Velaris", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Velaris")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            if win.is_visible().unwrap_or(false) {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // ── Hide to tray on close instead of quitting ─────────────────────
            if let Some(main_win) = app.get_webview_window("main") {
                let win_clone = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            // ── Register default overlay toggle hotkey (Alt+F9) ──────────────
            if let Ok(shortcut) = DEFAULT_OVERLAY_HOTKEY.parse::<tauri_plugin_global_shortcut::Shortcut>() {
                let _ = app.handle().global_shortcut().on_shortcut(shortcut, move |h, _s, event| {
                    if event.state() == ShortcutState::Pressed {
                        if h.get_webview_window("overlay").is_some() {
                            lcu::close_overlay_window(h);
                            if let Some(main) = h.get_webview_window("main") {
                                let _ = main.show();
                                let _ = main.set_focus();
                            }
                        } else {
                            if let Some(main) = h.get_webview_window("main") {
                                let _ = main.hide();
                            }
                            lcu::open_overlay_window(h);
                        }
                    }
                });
            }

            // ── F8/F9: overlay hotkeys via WH_KEYBOARD_LL ────────────────────
            // RegisterHotKey (tauri_plugin_global_shortcut) can fail when LoL is
            // fullscreen. WH_KEYBOARD_LL fires before any application sees the key.
            #[cfg(windows)]
            lcu::install_keyboard_hook(app.handle().clone());

            // Non-Windows fallback: use global shortcut plugin
            #[cfg(not(windows))]
            {
                if let Ok(shortcut) = "F8".parse::<tauri_plugin_global_shortcut::Shortcut>() {
                    let _ = app.handle().global_shortcut().on_shortcut(shortcut, move |h, _s, event| {
                        if event.state() == ShortcutState::Pressed {
                            if let Some(overlay) = h.get_webview_window("overlay") {
                                let _ = overlay.emit("overlay-toggle-interactive", ());
                            }
                        }
                    });
                }
                if let Ok(shortcut) = "F9".parse::<tauri_plugin_global_shortcut::Shortcut>() {
                    let _ = app.handle().global_shortcut().on_shortcut(shortcut, move |h, _s, event| {
                        if event.state() == ShortcutState::Pressed {
                            if let Some(overlay) = h.get_webview_window("overlay") {
                                let _ = overlay.emit("overlay-toggle-visibility", ());
                            }
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Match & game data
            get_match_history,
            get_champ_select_profiles,
            get_champ_select_session,
            get_live_game_data,
            // Summoner
            get_summoner_info,
            get_current_summoner,
            get_ranked_stats,
            // Champ select
            champ_select_action,
            focus_main_window,
            // Ready check
            accept_ready_check,
            // Overlay
            open_overlay,
            close_overlay,
            set_overlay_interactive,
            // Riot API
            riot_get_account_by_riot_id,
            riot_get_summoner_by_puuid,
            riot_get_league_entries,
            riot_get_match_history_v5,
            riot_get_matches_by_puuid,
            riot_get_rank_by_summoner_name,
            // Search cache
            search_summoners_cached,
            cache_summoner_profile,
            // Settings
            save_settings,
            load_settings,
            // API Key management
            save_riot_api_key,
            get_riot_api_key_status,
            // App version
            get_app_version,
            // Groq key (secure storage)
            save_groq_key,
            get_groq_key,
            clear_groq_key,
            // AI Coach
            get_anthropic_key,
            // Champion build data
            fetch_champion_build,
            // Rune page import
            import_rune_page,
            // Overlay hotkey
            get_overlay_hotkey,
            set_overlay_hotkey,
            // Updater
            check_for_update,
            install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
