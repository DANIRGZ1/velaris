// ─── Live Client Data API Module ───────────────────────────────────────────────
//
// Connects to the League of Legends Live Client Data API at port 2999.
// This API is only available while a game is in progress.
//
// Docs: https://developer.riotgames.com/docs/lol#game-client-api
//
// The response matches the LiveGameData interface in dataService.ts exactly.

pub async fn get_all_game_data() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true) // Live Client uses self-signed certs
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    
    let resp = client
        .get("https://127.0.0.1:2999/liveclientdata/allgamedata")
        .send()
        .await
        .map_err(|e| format!("Game not running or API unavailable: {}", e))?;
    
    if !resp.status().is_success() {
        return Err(format!("Live Client API returned status: {}", resp.status()));
    }
    
    resp.json().await.map_err(|e| e.to_string())
}

/// Gets only the active player data (less bandwidth than full game data)
pub async fn get_active_player() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    
    client
        .get("https://127.0.0.1:2999/liveclientdata/activeplayer")
        .send()
        .await
        .map_err(|e| format!("Game not running: {}", e))?
        .json()
        .await
        .map_err(|e| e.to_string())
}

/// Gets the event list (dragon kills, baron kills, turret kills, etc.)
pub async fn get_game_events() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    
    client
        .get("https://127.0.0.1:2999/liveclientdata/eventdata")
        .send()
        .await
        .map_err(|e| format!("Game not running: {}", e))?
        .json()
        .await
        .map_err(|e| e.to_string())
}
