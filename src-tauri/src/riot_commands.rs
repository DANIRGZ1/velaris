// ─── src-tauri/src/riot_commands.rs ───────────────────────────────────────────
//
// Tauri commands that the frontend calls via invoke().
// These are thin wrappers around riot_api.rs functions.
//
// Each command name matches EXACTLY what the TypeScript frontend expects:
//   - riot_get_account_by_riot_id
//   - riot_get_summoner_by_puuid
//   - riot_get_league_entries
//   - search_summoners_cached  (local cache for partial name search)
// ─────────────────────────────────────────────────────────────────────────────

use crate::riot_api::{
    self, RiotAccount, RiotLeagueEntry, RiotSummoner,
};
use serde::Serialize;
use std::collections::VecDeque;
use std::sync::Mutex;
use tauri::State;

// ─── Summoner Cache (for partial search) ─────────────────────────────────────

/// Stores recently looked-up summoners so the search bar can do partial
/// matching without hitting the Riot API every keystroke.
/// Max 100 entries, FIFO eviction.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedSummoner {
    pub game_name: String,
    pub tag_line: String,
    pub puuid: String,
    pub profile_icon_id: i64,
    pub summoner_level: i64,
    pub solo_rank: Option<String>,
    pub solo_lp: i32,
    pub solo_wins: i32,
    pub solo_losses: i32,
    pub region: String,
}

pub struct SummonerCache {
    pub entries: Mutex<VecDeque<CachedSummoner>>,
}

impl SummonerCache {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(VecDeque::with_capacity(100)),
        }
    }

    /// Add a summoner to the cache. Deduplicates by puuid.
    pub fn insert(&self, summoner: CachedSummoner) {
        let mut entries = self.entries.lock().unwrap();
        // Remove existing entry with same puuid
        entries.retain(|s| s.puuid != summoner.puuid);
        // Add to front (most recent)
        entries.push_front(summoner);
        // Cap at 100
        while entries.len() > 100 {
            entries.pop_back();
        }
    }

    /// Search cache by partial name match (case-insensitive)
    pub fn search(&self, query: &str) -> Vec<CachedSummoner> {
        let q = query.to_lowercase();
        let entries = self.entries.lock().unwrap();
        entries
            .iter()
            .filter(|s| {
                s.game_name.to_lowercase().contains(&q)
                    || format!("{}#{}", s.game_name, s.tag_line)
                        .to_lowercase()
                        .contains(&q)
            })
            .take(5)
            .cloned()
            .collect()
    }
}

// ─── Helper: platform → display region ───────────────────────────────────────

fn platform_to_display(platform: &str) -> &'static str {
    match platform.to_lowercase().as_str() {
        "euw1" | "euw" => "EUW",
        "eun1" | "eune" => "EUNE",
        "na1" | "na" => "NA",
        "kr" => "KR",
        "br1" | "br" => "BR",
        "la1" | "lan" => "LAN",
        "la2" | "las" => "LAS",
        "oc1" | "oce" => "OCE",
        "tr1" | "tr" => "TR",
        "ru" => "RU",
        "jp1" | "jp" => "JP",
        _ => "EUW",
    }
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

/// Look up a Riot Account by gameName + tagLine.
/// Called from: riotApi.ts → lookupAccountTauri()
#[tauri::command]
pub async fn riot_get_account_by_riot_id(
    game_name: String,
    tag_line: String,
    regional: String,
) -> Result<RiotAccount, String> {
    riot_api::get_account_by_riot_id(&game_name, &tag_line, &regional).await
}

/// Look up a Summoner by PUUID.
/// Called from: riotApi.ts → lookupSummonerTauri()
#[tauri::command]
pub async fn riot_get_summoner_by_puuid(
    puuid: String,
    platform: String,
) -> Result<RiotSummoner, String> {
    riot_api::get_summoner_by_puuid(&puuid, &platform).await
}

/// Look up League entries (ranked info) by summoner ID.
/// Called from: riotApi.ts → lookupLeagueTauri()
#[tauri::command]
pub async fn riot_get_league_entries(
    summoner_id: String,
    platform: String,
) -> Result<Vec<RiotLeagueEntry>, String> {
    riot_api::get_league_entries(&summoner_id, &platform).await
}

/// Search recently looked-up summoners by partial name.
/// Called from: riotApi.ts → searchSummoners() when IS_TAURI
///
/// This doesn't hit the Riot API — it only searches the local cache
/// populated by previous full lookups.
#[tauri::command]
pub async fn search_summoners_cached(
    query: String,
    cache: State<'_, SummonerCache>,
) -> Result<Vec<CachedSummoner>, String> {
    Ok(cache.search(&query))
}

/// Full summoner lookup: Account → Summoner → League.
/// Also caches the result for future partial searches.
///
/// This is an EXTRA command you can call from the frontend if you want
/// to do the full chain in one invoke() call instead of three.
#[tauri::command]
pub async fn riot_lookup_full_profile(
    game_name: String,
    tag_line: String,
    platform: String,
    regional: String,
    cache: State<'_, SummonerCache>,
) -> Result<CachedSummoner, String> {
    // Step 1: Account
    let account = riot_api::get_account_by_riot_id(&game_name, &tag_line, &regional).await?;

    // Step 2: Summoner
    let summoner = riot_api::get_summoner_by_puuid(&account.puuid, &platform).await?;

    // Step 3: League entries
    let mut solo_rank: Option<String> = None;
    let mut solo_lp = 0;
    let mut solo_wins = 0;
    let mut solo_losses = 0;

    match riot_api::get_league_entries(&summoner.id, &platform).await {
        Ok(entries) => {
            if let Some(solo) = entries.iter().find(|e| e.queue_type == "RANKED_SOLO_5x5") {
                solo_rank = Some(format!("{} {}", solo.tier, solo.rank));
                solo_lp = solo.league_points;
                solo_wins = solo.wins;
                solo_losses = solo.losses;
            }
        }
        Err(_) => { /* Ranked data unavailable — continue without it */ }
    }

    let result = CachedSummoner {
        game_name: account.game_name,
        tag_line: account.tag_line,
        puuid: account.puuid,
        profile_icon_id: summoner.profile_icon_id,
        summoner_level: summoner.summoner_level,
        solo_rank,
        solo_lp,
        solo_wins,
        solo_losses,
        region: platform_to_display(&platform).to_string(),
    };

    // Cache it for future partial searches
    cache.insert(result.clone());

    Ok(result)
}
