// ─── LCU API Connection Module ─────────────────────────────────────────────────
//
// Reads the League Client lockfile, establishes a connection,
// and watches for game phase changes via polling.
//
// The lockfile is located at:
//   C:\Riot Games\League of Legends\lockfile
//   (or wherever League is installed)
//
// Format: process_name:pid:port:password:protocol

use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use base64::Engine;
use tauri::Emitter;

#[derive(Debug, Clone)]
pub struct Lockfile {
    pub port: u16,
    pub password: String,
    pub protocol: String,
}

/// Default League installation paths to check
const LEAGUE_PATHS: &[&str] = &[
    "C:\\Riot Games\\League of Legends\\lockfile",
    "D:\\Riot Games\\League of Legends\\lockfile",
    "C:\\Program Files\\Riot Games\\League of Legends\\lockfile",
    "D:\\Program Files\\Riot Games\\League of Legends\\lockfile",
];

pub fn find_lockfile_path() -> Option<PathBuf> {
    for path in LEAGUE_PATHS {
        let p = PathBuf::from(path);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

pub fn read_lockfile() -> Result<Lockfile, String> {
    let path = find_lockfile_path()
        .ok_or_else(|| "League of Legends lockfile not found. Is the client running?".to_string())?;
    
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read lockfile: {}", e))?;
    
    let parts: Vec<&str> = content.trim().split(':').collect();
    if parts.len() < 5 {
        return Err("Invalid lockfile format".to_string());
    }
    
    Ok(Lockfile {
        port: parts[2].parse().map_err(|_| "Invalid port in lockfile")?,
        password: parts[3].to_string(),
        protocol: parts[4].to_string(),
    })
}

pub fn create_client(lockfile: &Lockfile) -> Result<reqwest::Client, String> {
    let auth = base64::engine::general_purpose::STANDARD.encode(format!("riot:{}", lockfile.password));
    
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::AUTHORIZATION,
        reqwest::header::HeaderValue::from_str(&format!("Basic {}", auth))
            .map_err(|e| e.to_string())?,
    );
    
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true) // LCU uses self-signed certs
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())
}

/// Maps a raw LCU gameflow phase string to our internal phase name.
fn map_phase(raw: &str) -> &'static str {
    match raw {
        "None" => "NONE",
        "Lobby" => "LOBBY",
        "Matchmaking" => "MATCHMAKING",
        "CheckedIntoTournament" => "MATCHMAKING",
        "ReadyCheck" => "READY_CHECK",
        "ChampSelect" => "CHAMP_SELECT",
        "GameStart" => "IN_GAME",
        "InProgress" => "IN_GAME",
        "Reconnect" => "IN_GAME",
        "WaitingForStats" | "PreEndOfGame" | "EndOfGame" => "END_OF_GAME",
        "TerminatedInError" | "FailedToLaunch" => "LOBBY",
        _ => "LOBBY",
    }
}

/// Watches the LCU gameflow phase and emits events to the frontend.
/// This runs in a background thread and polls every 2 seconds.
///
/// Emitted event: "lcu-phase-changed"
/// Payloads: "CONNECTING", "DISCONNECTED", "LOBBY", "MATCHMAKING",
///           "READY_CHECK", "CHAMP_SELECT", "IN_GAME", "END_OF_GAME"
pub async fn watch_client_state(handle: tauri::AppHandle) {
    let mut last_mapped = String::new();
    let mut consecutive_errors: u32 = 0;

    loop {
        tokio::time::sleep(Duration::from_secs(2)).await;

        let raw_phase = match get_current_phase().await {
            Ok(p) => {
                consecutive_errors = 0;
                p
            }
            Err(e) => {
                consecutive_errors += 1;
                // Only log every 5th error to avoid spam
                if consecutive_errors % 5 == 1 {
                    eprintln!("[Velaris] LCU poll error (#{}) : {}", consecutive_errors, e);
                }
                let mapped = "DISCONNECTED";
                if last_mapped != mapped {
                    eprintln!("[Velaris] Phase → {}", mapped);
                    let _ = handle.emit("lcu-phase-changed", mapped);
                    last_mapped = mapped.to_string();
                }
                continue;
            }
        };

        let mapped = map_phase(&raw_phase);

        // Map NONE and END_OF_GAME to LOBBY for the frontend
        let emitted = match mapped {
            "NONE" | "END_OF_GAME" => "LOBBY",
            other => other,
        };

        if emitted != last_mapped {
            eprintln!("[Velaris] Phase: {} → {} (raw: {})", last_mapped, emitted, raw_phase);
            let _ = handle.emit("lcu-phase-changed", emitted);
            last_mapped = emitted.to_string();
        }
    }
}

/// Fetches the current gameflow phase from the LCU.
/// Uses .text() instead of .json() for robustness — the endpoint
/// returns a bare JSON string like `"ChampSelect"` but can sometimes
/// return unquoted text during rapid transitions.
async fn get_current_phase() -> Result<String, String> {
    let lockfile = read_lockfile()?;
    let client = create_client(&lockfile)?;

    let resp = client
        .get(&format!(
            "https://127.0.0.1:{}/lol-gameflow/v1/gameflow-phase",
            lockfile.port
        ))
        .send()
        .await
        .map_err(|e| format!("LCU request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("LCU phase returned {}", resp.status()));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read phase body: {}", e))?;

    // Strip surrounding quotes if present (JSON string like "ChampSelect")
    let phase = text.trim().trim_matches('"').to_string();

    if phase.is_empty() {
        return Err("Empty phase response".to_string());
    }

    Ok(phase)
}