/**
 * Data Service - Velaris
 * 
 * Single abstraction layer between the UI and data sources.
 * 
 * TODAY (web preview): Returns mock data from local modules.
 * TOMORROW (Tauri):    Replace the body of each function with `invoke()`.
 * 
 * The UI never imports mock data directly — it always goes through this service.
 * This means switching to real data is a ONE-FILE change.
 * 
 * ┌─────────────┐     ┌──────────────┐     ┌────────────────────┐
 * │  React UI   │ ──▶ │ dataService  │ ──▶ │ mock / tauri invoke│
 * └─────────────┘     └──────────────┘     └────────────────────┘
 */

import { MATCH_HISTORY, computeDashboardData, RANKED_QUEUE_IDS, type MatchData, type DashboardData, type MatchParticipant } from "../utils/analytics";
import { CHAMP_SELECT_PROFILES, detectPlayerTitle, type PlayerProfile, type TitleResult } from "../utils/playerScouting";
import type { TFunction } from "../contexts/LanguageContext";
import { IS_TAURI, tauriInvoke as _tauriInvoke } from "../helpers/tauriWindow";

// ─── Champion ID → Name Mapping (Data Dragon) ────────────────────────────────

let _champIdToName: Record<number, string> | null = null;
const CHAMP_MAP_CACHE_KEY = "velaris-champ-id-map";
const CHAMP_MAP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getChampionIdMap(): Promise<Record<number, string>> {
  if (_champIdToName) return _champIdToName;

  // Try localStorage cache first (avoids a network round-trip on every app start)
  try {
    const cached = localStorage.getItem(CHAMP_MAP_CACHE_KEY);
    if (cached) {
      const { map, ts } = JSON.parse(cached);
      if (Date.now() - ts < CHAMP_MAP_TTL_MS && map && Object.keys(map).length > 0) {
        _champIdToName = map;
        return map;
      }
    }
  } catch { /* ignore */ }

  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);
    const realmsRes = await fetch("https://ddragon.leagueoflegends.com/realms/euw.json", { signal: ac.signal });
    const realms = await realmsRes.json();
    const version = realms.v || "15.6.1";
    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`, { signal: ac.signal });
    clearTimeout(timeout);
    const champData = await champRes.json();
    const map: Record<number, string> = {};
    for (const champ of Object.values(champData.data) as { key: string; id: string }[]) {
      map[Number(champ.key)] = champ.id;
    }
    _champIdToName = map;
    try { localStorage.setItem(CHAMP_MAP_CACHE_KEY, JSON.stringify({ map, ts: Date.now() })); } catch { /* ignore */ }
    return map;
  } catch {
    return {};
  }
}

// ─── Cached player identity from match history ────────────────────────────────

let _cachedPlayerIdentity: { gameName: string; tagLine: string; profileIcon: number; puuid: string } | null = null;

function cachePlayerIdentity(identity: { gameName: string; tagLine: string; profileIcon: number; puuid: string }) {
  _cachedPlayerIdentity = identity;
}

// ─── LCU → MatchData Transformer ─────────────────────────────────────────────

interface LcuPlayer {
  gameName: string;
  puuid: string;
  tagLine: string;
  accountId?: number;
  summonerId?: number;
  profileIcon?: number;
  currentPlatformId?: string;
  platformId?: string;
  summonerName?: string;
  matchHistoryUri?: string;
  currentAccountId?: number;
}

interface LcuParticipantIdentity {
  participantId: number;
  player: LcuPlayer;
}

interface LcuStats {
  assists: number;
  kills: number;
  deaths: number;
  win: boolean;
  firstBloodKill: boolean;
  firstBloodAssist: boolean;
  goldEarned: number;
  goldSpent: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  visionScore: number;
  wardsPlaced: number;
  visionWardsBoughtInGame: number;
  inhibitorKills: number;
  turretKills?: number;
  champLevel: number;
  // Multikill stats
  pentaKills?: number;
  quadraKills?: number;
  tripleKills?: number;
  doubleKills?: number;
  largestMultiKill?: number;
  largestKillingSpree?: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  // Runes (LCU stats fields)
  perk0?: number;
  perk1?: number;
  perk2?: number;
  perk3?: number;
  perk4?: number;
  perk5?: number;
  perkPrimaryStyle?: number;
  perkSubStyle?: number;
  playerPosition?: string; // Some LCU versions include this
  [key: string]: unknown;
}

interface LcuParticipant {
  championId: number;
  participantId: number;
  teamId: number;
  spell1Id: number;
  spell2Id: number;
  stats: LcuStats;
  timeline?: { lane?: string; role?: string; creepsPerMinDeltas?: unknown };
  // Newer LCU formats may include direct position
  teamPosition?: string;
  individualPosition?: string;
}

interface LcuGame {
  gameCreation: number;
  gameDuration: number;
  gameId: number;
  gameMode: string;
  queueId?: number;
  participantIdentities: LcuParticipantIdentity[];
  participants: LcuParticipant[];
}

interface LcuMatchHistoryResponse {
  accountId: number;
  puuid?: string; // Provided by Velaris backend — most reliable player identifier
  games: {
    games: LcuGame[];
    gameCount: number;
  };
}

// Deterministic jitter using a simple LCG seeded by gameId × participantId.
// This guarantees death timestamps are stable across re-renders and re-fetches.
function lcgJitter(seed: number, i: number): number {
  const s = (Math.imul(seed + i * 1013904223, 1664525) >>> 0) / 0x100000000;
  return (s - 0.5) * 3; // jitter in range [-1.5, 1.5] minutes
}

function generateDeathTimestamps(deaths: number, gameDurationSeconds: number, seed: number): number[] {
  if (deaths === 0) return [];
  const durationMin = gameDurationSeconds / 60;
  const timestamps: number[] = [];
  for (let i = 0; i < deaths; i++) {
    const base = (durationMin / (deaths + 1)) * (i + 1);
    const jitter = lcgJitter(seed, i);
    timestamps.push(Math.max(1, Math.min(durationMin, parseFloat((base + jitter).toFixed(1)))));
  }
  return timestamps.sort((a, b) => a - b);
}

function guessTeamPosition(participant: LcuParticipant): MatchParticipant["teamPosition"] {
  // Priority 1: Direct position fields (newer LCU / enriched by Rust)
  const direct = participant.teamPosition || participant.individualPosition || (participant.stats?.playerPosition as string);
  if (direct) {
    const d = direct.toUpperCase();
    if (d === "TOP") return "TOP";
    if (d === "JUNGLE") return "JUNGLE";
    if (d === "MIDDLE" || d === "MID") return "MIDDLE";
    if (d === "BOTTOM" || d === "BOT" || d === "ADC") return "BOTTOM";
    if (d === "UTILITY" || d === "SUPPORT" || d === "SUP") return "UTILITY";
  }
  
  // Priority 2: Timeline lane + role
  const lane = (participant.timeline?.lane || "").toUpperCase();
  const role = (participant.timeline?.role || "").toUpperCase();
  
  if (lane === "TOP") return "TOP";
  if (lane === "JUNGLE") return "JUNGLE";
  if (lane === "MID" || lane === "MIDDLE") return "MIDDLE";
  if (lane === "BOTTOM" || lane === "BOT") {
    if (role === "SUPPORT" || role === "DUO_SUPPORT") return "UTILITY";
    if (role === "CARRY" || role === "DUO_CARRY") return "BOTTOM";
    return "BOTTOM"; // Default BOT lane to ADC
  }
  
  // Priority 3: Infer from champion + CS (supports have low CS)
  // This is a last resort — we check if neutralMinionsKilled is very high (jungler)
  const stats = participant.stats;
  if (stats) {
    const totalCs = (stats.totalMinionsKilled || 0) + (stats.neutralMinionsKilled || 0);
    if ((stats.neutralMinionsKilled || 0) > 40) return "JUNGLE";
    if (totalCs < 50 && (stats.wardsPlaced || 0) > 10) return "UTILITY";
  }
  
  // Absolute fallback
  return "MIDDLE";
}

async function transformLcuMatchHistory(raw: LcuMatchHistoryResponse): Promise<MatchData[]> {
  const champMap = await getChampionIdMap();
  const myAccountId = raw.accountId;
  // PUUID from the Rust backend — most reliable, avoids accountId format mismatches
  const myPuuidFromBackend = raw.puuid || null;

  // Cache the player's OWN identity from the first game.
  // Strategy: PUUID first (new, reliable), then accountId, never fall back to index 0.
  if (raw.games.games.length > 0) {
    const firstGame = raw.games.games[0];
    const myIdEntry =
      (myPuuidFromBackend
        ? firstGame.participantIdentities.find(pi => pi.player.puuid === myPuuidFromBackend)
        : undefined) ??
      firstGame.participantIdentities.find(
        pi => pi.player.currentAccountId === myAccountId || pi.player.accountId === myAccountId
      );
    if (myIdEntry) {
      const playerIdentity = myIdEntry.player;
      cachePlayerIdentity({
        gameName: playerIdentity.gameName,
        tagLine: playerIdentity.tagLine,
        profileIcon: playerIdentity.profileIcon || 1,
        puuid: myPuuidFromBackend || playerIdentity.puuid,
      });
    } else if (myPuuidFromBackend) {
      // Still cache identity from backend PUUID even if not found in this game's identities
      _cachedPlayerIdentity = { gameName: "", tagLine: "", profileIcon: 1, puuid: myPuuidFromBackend };
    }
  }

  return raw.games.games.map((game) => {
    // Build identity lookup: participantId → player info
    const identityMap = new Map<number, LcuPlayer>();
    for (const pi of game.participantIdentities) {
      identityMap.set(pi.participantId, pi.player);
    }

    // Find which participantId belongs to "me"
    // Strategy 0: Direct PUUID from backend (most reliable — no type mismatch issues)
    let myParticipantId: number | null = null;
    if (myPuuidFromBackend) {
      for (const pi of game.participantIdentities) {
        if (pi.player.puuid === myPuuidFromBackend) {
          myParticipantId = pi.participantId;
          break;
        }
      }
    }
    // Strategy 1: Match by accountId (loose equality to handle string/number mismatches)
    if (myParticipantId === null && myAccountId) {
      for (const pi of game.participantIdentities) {
        // eslint-disable-next-line eqeqeq
        if (pi.player.currentAccountId == myAccountId || pi.player.accountId == myAccountId) {
          myParticipantId = pi.participantId;
          break;
        }
      }
    }
    // Strategy 2: Match by cached PUUID
    if (myParticipantId === null && _cachedPlayerIdentity?.puuid) {
      for (const pi of game.participantIdentities) {
        if (pi.player.puuid === _cachedPlayerIdentity.puuid) {
          myParticipantId = pi.participantId;
          break;
        }
      }
    }
    // Strategy 3: Match by stored summoner name (gameName)
    if (myParticipantId === null) {
      const storedName = getStoredIdentity()?.name?.toLowerCase();
      if (storedName) {
        for (const pi of game.participantIdentities) {
          const piName = (pi.player.gameName || pi.player.summonerName || "").toLowerCase();
          if (piName === storedName) {
            myParticipantId = pi.participantId;
            break;
          }
        }
      }
    }
    // Strategy 4: If only one identity exists, it's us
    if (myParticipantId === null && game.participantIdentities.length === 1) {
      myParticipantId = game.participantIdentities[0].participantId;
    }
    // Fallback: first participant (last resort — should rarely hit with Strategy 0 above)
    if (myParticipantId === null) {
      myParticipantId = game.participants[0]?.participantId ?? 1;
    }

    let playerParticipantIndex = 0;
    
    const participants: MatchParticipant[] = game.participants.map((p, idx) => {
      const identity = identityMap.get(p.participantId);
      const s = p.stats;

      if (p.participantId === myParticipantId) {
        playerParticipantIndex = idx;
      }

      return {
        puuid: identity?.puuid || `unknown-${p.participantId}`,
        summonerName: identity?.gameName || identity?.summonerName || `Player ${p.participantId}`,
        championName: champMap[p.championId] || `Champion${p.championId}`,
        teamId: p.teamId,
        teamPosition: guessTeamPosition(p),
        win: s.win ?? false,
        kills: s.kills || 0,
        deaths: s.deaths || 0,
        assists: s.assists || 0,
        totalMinionsKilled: s.totalMinionsKilled || 0,
        neutralMinionsKilled: s.neutralMinionsKilled || 0,
        visionScore: s.visionScore || 0,
        wardsPlaced: s.wardsPlaced || 0,
        controlWardsPlaced: s.visionWardsBoughtInGame || 0,
        totalDamageDealtToChampions: s.totalDamageDealtToChampions || 0,
        totalDamageTaken: s.totalDamageTaken || 0,
        goldEarned: s.goldEarned || 0,
        goldSpent: s.goldSpent || 0,
        timePlayed: game.gameDuration,
        deathTimestamps: generateDeathTimestamps(s.deaths || 0, game.gameDuration, game.gameId * 31 + p.participantId),
        firstBloodKill: s.firstBloodKill || false,
        firstBloodAssist: s.firstBloodAssist || false,
        dragonKills: 0, // Not available in LCU match history
        turretKills: s.turretKills || s.inhibitorKills || 0,
        item0: s.item0 || 0,
        item1: s.item1 || 0,
        item2: s.item2 || 0,
        item3: s.item3 || 0,
        item4: s.item4 || 0,
        item5: s.item5 || 0,
        item6: s.item6 || 0,
        // Runes
        perk0: s.perk0 || 0,
        perk1: s.perk1 || 0,
        perk2: s.perk2 || 0,
        perk3: s.perk3 || 0,
        perk4: s.perk4 || 0,
        perk5: s.perk5 || 0,
        perkPrimaryStyle: s.perkPrimaryStyle || 0,
        perkSubStyle: s.perkSubStyle || 0,
        // Summoner spells
        spell1Id: p.spell1Id || 0,
        spell2Id: p.spell2Id || 0,
        // Extra
        champLevel: s.champLevel || 0,
        // Multikill stats
        pentaKills: s.pentaKills || 0,
        quadraKills: s.quadraKills || 0,
        tripleKills: s.tripleKills || 0,
        doubleKills: s.doubleKills || 0,
        largestMultiKill: s.largestMultiKill || 0,
        largestKillingSpree: s.largestKillingSpree || 0,
      };
    });

    return {
      matchId: `EUW1_${game.gameId}`,
      gameCreation: game.gameCreation,
      gameDuration: game.gameDuration,
      gameMode: game.gameMode || "CLASSIC",
      queueId: game.queueId || 420,
      participants,
      playerParticipantIndex,
    };
  });
}

/**
 * Calls a Tauri command. In the web preview this throws so callers fall back to mock data.
 */
async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return _tauriInvoke<T>(command, args);
}

// ─── Match-v5 Transformer ─────────────────────────────────────────────────────

interface MatchV5Participant {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  championName: string;
  teamId: number;
  teamPosition: string;
  individualPosition?: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  wardsPlaced: number;
  visionWardsBoughtInGame: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  goldSpent: number;
  champLevel: number;
  pentaKills: number;
  quadraKills: number;
  tripleKills: number;
  doubleKills: number;
  largestMultiKill: number;
  largestKillingSpree: number;
  item0: number; item1: number; item2: number; item3: number; item4: number; item5: number; item6: number;
  summoner1Id: number;
  summoner2Id: number;
  perks?: {
    styles?: { style: number; selections: { perk: number }[] }[];
  };
  firstBloodKill?: boolean;
  firstBloodAssist?: boolean;
  turretKills?: number;
  dragonKills?: number;
  [key: string]: unknown;
}

interface MatchV5Info {
  gameCreation: number;
  gameDuration: number;
  gameMode: string;
  gameId: number;
  queueId: number;
  participants: MatchV5Participant[];
}

interface MatchV5 {
  metadata: { matchId: string; participants: string[] };
  info: MatchV5Info;
}

function transformMatchV5History(matches: MatchV5[], myName: string, myPuuid?: string): MatchData[] {
  return matches.map(match => {
    const info = match.info;
    const myNameLower = myName.toLowerCase();

    const participants: MatchParticipant[] = info.participants.map((p) => {

      const pos = p.teamPosition || p.individualPosition || "";
      const posNorm: MatchParticipant["teamPosition"] =
        pos === "TOP" ? "TOP" :
        pos === "JUNGLE" ? "JUNGLE" :
        pos === "MIDDLE" || pos === "MID" ? "MIDDLE" :
        pos === "BOTTOM" || pos === "BOT" ? "BOTTOM" :
        pos === "UTILITY" || pos === "SUPPORT" ? "UTILITY" :
        "MIDDLE";

      const styles = p.perks?.styles ?? [];
      const primary = styles[0];
      const secondary = styles[1];

      return {
        puuid: p.puuid,
        summonerName: p.riotIdGameName || p.summonerName || "Unknown",
        championName: p.championName,
        teamId: p.teamId,
        teamPosition: posNorm,
        win: p.win,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        totalMinionsKilled: p.totalMinionsKilled,
        neutralMinionsKilled: p.neutralMinionsKilled,
        visionScore: p.visionScore,
        wardsPlaced: p.wardsPlaced,
        controlWardsPlaced: p.visionWardsBoughtInGame,
        totalDamageDealtToChampions: p.totalDamageDealtToChampions,
        totalDamageTaken: p.totalDamageTaken,
        goldEarned: p.goldEarned,
        goldSpent: p.goldSpent,
        timePlayed: info.gameDuration,
        deathTimestamps: generateDeathTimestamps(p.deaths, info.gameDuration),
        firstBloodKill: p.firstBloodKill ?? false,
        firstBloodAssist: p.firstBloodAssist ?? false,
        dragonKills: p.dragonKills ?? 0,
        turretKills: p.turretKills ?? 0,
        item0: p.item0, item1: p.item1, item2: p.item2,
        item3: p.item3, item4: p.item4, item5: p.item5, item6: p.item6,
        perk0: primary?.selections?.[0]?.perk ?? 0,
        perk1: primary?.selections?.[1]?.perk ?? 0,
        perk2: primary?.selections?.[2]?.perk ?? 0,
        perk3: primary?.selections?.[3]?.perk ?? 0,
        perk4: secondary?.selections?.[0]?.perk ?? 0,
        perk5: secondary?.selections?.[1]?.perk ?? 0,
        perkPrimaryStyle: primary?.style ?? 0,
        perkSubStyle: secondary?.style ?? 0,
        spell1Id: p.summoner1Id,
        spell2Id: p.summoner2Id,
        champLevel: p.champLevel,
        pentaKills: p.pentaKills,
        quadraKills: p.quadraKills,
        tripleKills: p.tripleKills,
        doubleKills: p.doubleKills,
        largestMultiKill: p.largestMultiKill,
        largestKillingSpree: p.largestKillingSpree,
      };
    });

    // Two-pass player identification: PUUID first (most reliable), then name
    let playerParticipantIndex =
      myPuuid
        ? participants.findIndex(p => p.puuid === myPuuid)
        : -1;
    if (playerParticipantIndex === -1)
      playerParticipantIndex = participants.findIndex(
        p => (p.summonerName || "").toLowerCase() === myNameLower
      );
    if (playerParticipantIndex === -1) playerParticipantIndex = 0; // absolute last resort

    return {
      matchId: match.metadata.matchId,
      gameCreation: info.gameCreation,
      gameDuration: info.gameDuration,
      gameMode: info.gameMode || "CLASSIC",
      queueId: info.queueId || 420,
      participants,
      playerParticipantIndex,
    };
  });
}

// ─── Match History Cache ──────────────────────────────────────────────────────

const MATCH_CACHE_KEY = "velaris-match-history-cache";
const MATCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache: short TTL (30 s) prevents duplicate LCU calls within
// the same session (e.g. Dashboard calls getDashboardData + getMatchHistory).
let _memMatchCache: { data: MatchData[]; ts: number } | null = null;

// True when the last successful getMatchHistory() call returned offline (localStorage) data.
let _matchFetchWasOffline = false;
/** Returns true if getMatchHistory() fell back to the offline localStorage cache on its last call. */
export function wasLastMatchFetchOffline(): boolean { return _matchFetchWasOffline; }
const MEM_CACHE_TTL_MS = 30_000; // 30 seconds

function saveMatchCache(matches: MatchData[]) {
  _memMatchCache = { data: matches, ts: Date.now() };
  try {
    localStorage.setItem(MATCH_CACHE_KEY, JSON.stringify({ matches, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

export function clearMatchCache() {
  _memMatchCache = null;
  try { localStorage.removeItem(MATCH_CACHE_KEY); } catch { /* ignore */ }
}

function loadMatchCache(): MatchData[] | null {
  try {
    const raw = localStorage.getItem(MATCH_CACHE_KEY);
    if (!raw) return null;
    const { matches, ts } = JSON.parse(raw);
    if (Date.now() - ts > MATCH_CACHE_TTL_MS) return null;
    if (Array.isArray(matches) && matches.length > 0) return matches as MatchData[];
  } catch { /* ignore */ }
  return null;
}

// ─── Match History ────────────────────────────────────────────────────────────

/** Strip matches where the player participant slot is missing or malformed. */
function sanitizeMatches(matches: MatchData[]): MatchData[] {
  return matches.filter(m =>
    Array.isArray(m.participants) &&
    m.participants[m.playerParticipantIndex] != null
  );
}

export async function getMatchHistory(): Promise<MatchData[]> {
  // Return in-memory cache when it's fresh — avoids redundant LCU calls
  // within the same session (e.g. Dashboard mounts getDashboardData + getMatchHistory simultaneously)
  if (_memMatchCache && Date.now() - _memMatchCache.ts < MEM_CACHE_TTL_MS) {
    return _memMatchCache.data;
  }

  if (IS_TAURI) {
    // 1. Try LCU (client must be running)
    try {
      const raw = await tauriInvoke<unknown>("get_match_history");
      if (raw && typeof raw === "object" && "games" in raw) {
        const lcuData = raw as LcuMatchHistoryResponse;
        if (lcuData.games?.games && Array.isArray(lcuData.games.games)) {
          const transformed = sanitizeMatches(await transformLcuMatchHistory(lcuData));
          if (transformed.length > 0) {
            saveMatchCache(transformed);
            _matchFetchWasOffline = false;
            return transformed;
          }
        }
      }
      if (Array.isArray(raw) && raw.length > 0) {
        const sanitized = sanitizeMatches(raw as MatchData[]);
        saveMatchCache(sanitized);
        _matchFetchWasOffline = false;
        return sanitized;
      }
    } catch (e) {
      console.warn("[Velaris] LCU match history failed, trying Riot Match-v5:", e);
    }

    // 2. Fallback: Riot Match-v5 API (requires Riot API key)
    const identity = getStoredIdentity();
    if (identity?.name && identity?.tag && identity?.region) {
      try {
        const { displayRegionToPlatform } = await import("./riotApi");
        const platform = displayRegionToPlatform(identity.region);
        const PLATFORM_TO_REGIONAL: Record<string, string> = {
          euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
          na1: "americas", br1: "americas", la1: "americas", la2: "americas", oc1: "americas",
          kr: "asia", jp1: "asia",
          ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
        };
        const regional = PLATFORM_TO_REGIONAL[platform] || "europe";
        const result = await tauriInvoke<{ puuid: string; matches: MatchV5[] }>(
          "riot_get_match_history_v5",
          { gameName: identity.name, tagLine: identity.tag, regional, count: 20 }
        );
        if (result?.matches?.length > 0) {
          const v5matches = sanitizeMatches(transformMatchV5History(result.matches, identity.name, result.puuid));
          saveMatchCache(v5matches);
          _matchFetchWasOffline = false;
          return v5matches;
        }
      } catch (e) {
        // API key not set or network error — silently skip
        if (String(e) !== "NO_API_KEY") {
          console.warn("[Velaris] Match-v5 fallback failed:", e);
        }
      }
    }

    // 3. Offline cache — return last known data when disconnected
    const cached = loadMatchCache();
    if (cached) {
      const sanitized = sanitizeMatches(cached);
      console.info("[Velaris] Returning offline cache (" + sanitized.length + " matches)");
      _matchFetchWasOffline = true;
      return sanitized;
    }

    _matchFetchWasOffline = false;
    return [];
  }
  // Web preview only: return mock data
  return new Promise((resolve) => setTimeout(() => resolve(MATCH_HISTORY), 150));
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  const [matches, summoner] = await Promise.all([getMatchHistory(), getSummonerInfo()]);
  return computeDashboardData(matches, summoner.rank ?? "EMERALD", summoner.name);
}

// ─── Champ Select Session (Real LCU Data) ────────────────────────────────────

export interface ChampSelectPlayer {
  cellId: number;
  championId: number;
  championName: string; // resolved from championId via Data Dragon
  assignedPosition: string; // "top", "jungle", "middle", "bottom", "utility"
  summonerId: number;
  summonerName: string;
  spell1Id: number;
  spell2Id: number;
  isLocalPlayer: boolean;
}

export interface ChampSelectAction {
  id: number;
  type: "ban" | "pick";
  championId?: number;
  completed?: boolean;
  isAllyAction?: boolean;
  isInProgress?: boolean;
  actorCellId?: number;
}

export interface ChampSelectSession {
  myTeam: ChampSelectPlayer[];
  theirTeam: ChampSelectPlayer[];
  timer: {
    phase: string;
    adjustedTimeLeftInPhase: number;
  };
  localPlayerCellId: number;
  bans?: {
    myTeamBans: string[];
    theirTeamBans: string[];
  };
  myActiveAction?: ChampSelectAction | null;
}

// Raw LCU types from /lol-champ-select/v1/session
interface LcuChampSelectMember {
  cellId: number;
  championId: number;
  assignedPosition: string;
  summonerId: number;
  spell1Id: number;
  spell2Id: number;
  wardSkinId?: number;
  selectedSkinId?: number;
  championPickIntent?: number;
  // Riot ID era: displayName = "GameName#TAG", summonerName = legacy name
  displayName?: string;
  summonerName?: string;
  gameName?: string;
  tagLine?: string;
}

interface LcuChampSelectAction {
  id: number;
  type: string; // "ban" | "pick" | "ten_bans_reveal"
  championId: number;
  completed: boolean;
  isAllyAction: boolean;
  isInProgress: boolean;
  actorCellId: number;
}

interface LcuChampSelectSession {
  myTeam: LcuChampSelectMember[];
  theirTeam: LcuChampSelectMember[];
  timer: { phase: string; adjustedTimeLeftInPhase: number };
  localPlayerCellId: number;
  bans?: { myTeamBans?: number[]; theirTeamBans?: number[] };
  actions?: LcuChampSelectAction[][];
}

async function transformChampSelectSession(raw: LcuChampSelectSession): Promise<ChampSelectSession> {
  const champMap = await getChampionIdMap();
  
  const resolvePlayer = (member: LcuChampSelectMember, isLocal: boolean): ChampSelectPlayer => {
    // Riot ID era: prefer gameName, then displayName (strips #TAG), then summonerName
    const name =
      member.gameName ||
      (member.displayName?.includes("#") ? member.displayName.split("#")[0] : member.displayName) ||
      member.summonerName ||
      "";
    return {
      cellId: member.cellId,
      championId: member.championId,
      championName: champMap[member.championId] || (member.championId === 0 ? "" : `Champion${member.championId}`),
      assignedPosition: member.assignedPosition || "",
      summonerId: member.summonerId,
      summonerName: name,
      spell1Id: member.spell1Id,
      spell2Id: member.spell2Id,
      isLocalPlayer: isLocal,
    };
  };
  
  // Resolve ban IDs to champion names
  const resolveBanId = (id: number): string => {
    if (id <= 0) return "";
    return champMap[id] || `Champion${id}`;
  };

  // LCU returns adjustedTimeLeftInPhase in milliseconds — convert to seconds
  const timerInSeconds = raw.timer.adjustedTimeLeftInPhase > 1000
    ? raw.timer.adjustedTimeLeftInPhase / 1000
    : raw.timer.adjustedTimeLeftInPhase;

  // ── Extract the local player's current active action ──
  // LCU `actions` is an array of "rows" (phases), each row is an array of actions.
  // We flatten and find the one where actorCellId matches localPlayerCellId,
  // is not completed, and is in progress (or the first uncompleted one).
  let myActiveAction: ChampSelectAction | null = null;
  if (raw.actions && Array.isArray(raw.actions)) {
    const flatActions = raw.actions.flat();
    // ONLY use actions that are currently isInProgress for the local player.
    // Using uncompleted future actions causes the LCU to reject the PATCH request
    // because that action's phase hasn't started yet.
    const inProgress = flatActions.find(
      a => a.actorCellId === raw.localPlayerCellId && !a.completed && a.isInProgress
    );
    if (inProgress && (inProgress.type === "ban" || inProgress.type === "pick")) {
      myActiveAction = {
        id: inProgress.id,
        type: inProgress.type as "ban" | "pick",
        championId: inProgress.championId,
        completed: inProgress.completed,
        isAllyAction: inProgress.isAllyAction,
        isInProgress: inProgress.isInProgress,
        actorCellId: inProgress.actorCellId,
      };
    }
  }

  return {
    myTeam: raw.myTeam.map(m => resolvePlayer(m, m.cellId === raw.localPlayerCellId)),
    theirTeam: raw.theirTeam.map(m => resolvePlayer(m, false)),
    timer: {
      phase: raw.timer.phase,
      adjustedTimeLeftInPhase: timerInSeconds,
    },
    localPlayerCellId: raw.localPlayerCellId,
    bans: (() => {
      // Prefer raw.bans if populated, otherwise extract from completed ban actions
      const myBansFromField = (raw.bans?.myTeamBans || []).filter(id => id > 0);
      const theirBansFromField = (raw.bans?.theirTeamBans || []).filter(id => id > 0);

      if (myBansFromField.length > 0 || theirBansFromField.length > 0) {
        return {
          myTeamBans: myBansFromField.map(resolveBanId),
          theirTeamBans: theirBansFromField.map(resolveBanId),
        };
      }

      // Fallback: extract from completed ban actions in the actions array
      if (raw.actions) {
        const myTeamCellIds = new Set(raw.myTeam.map(m => m.cellId));
        const flatActions = raw.actions.flat();
        const completedBans = flatActions.filter(a => a.type === "ban" && a.completed && a.championId > 0);
        return {
          myTeamBans: completedBans.filter(a => myTeamCellIds.has(a.actorCellId)).map(a => resolveBanId(a.championId)),
          theirTeamBans: completedBans.filter(a => !myTeamCellIds.has(a.actorCellId)).map(a => resolveBanId(a.championId)),
        };
      }

      return { myTeamBans: [], theirTeamBans: [] };
    })(),
    myActiveAction,
  };
}

/**
 * Fetches the current champ select session from the LCU.
 * Returns null if not in champ select or if running in web preview.
 */
export async function getChampSelectSession(): Promise<ChampSelectSession | null> {
  if (IS_TAURI) {
    try {
      const raw = await tauriInvoke<LcuChampSelectSession>("get_champ_select_session");
      if (raw && raw.myTeam) {
        console.log("[Velaris] ChampSelect session received:", {
          myTeam: raw.myTeam.map(m => `cell${m.cellId}:champ${m.championId}:${m.assignedPosition}`),
          theirTeam: raw.theirTeam.map(m => `cell${m.cellId}:champ${m.championId}:${m.assignedPosition}`),
          phase: raw.timer?.phase,
          localCell: raw.localPlayerCellId,
        });
        return transformChampSelectSession(raw);
      }
      console.warn("[Velaris] ChampSelect session empty or missing myTeam:", raw);
    } catch (err) {
      console.warn("[Velaris] ChampSelect fetch failed:", err);
    }
  }
  return null; // null = no real data available, component will use mock
}

// ─── Champ Select Profiles ───────────────────────────────────────────────────

/**
 * Transforms partial profile data from the Rust backend into full PlayerProfile.
 * The Rust command now fetches per-player match history and computes stats,
 * but champion names come as "Champion{id}" — we resolve them via Data Dragon.
 */
async function resolveChampNames(profiles: PlayerProfile[]): Promise<PlayerProfile[]> {
  const champMap = await getChampionIdMap();
  return profiles.map(p => ({
    ...p,
    // Resolve "Champion123" → "Ahri" for currentChampion
    currentChampion: p.currentChampion?.startsWith("Champion")
      ? (champMap[parseInt(p.currentChampion.replace("Champion", ""), 10)] || p.currentChampion)
      : p.currentChampion,
    // Resolve champion names in the pool
    champions: (p.champions || []).map(c => ({
      ...c,
      name: c.name?.startsWith("Champion")
        ? (champMap[parseInt(c.name.replace("Champion", ""), 10)] || c.name)
        : c.name,
    })),
  }));
}

export async function getChampSelectProfiles(): Promise<PlayerProfile[]> {
  if (IS_TAURI) {
    try {
      const result = await tauriInvoke<PlayerProfile[]>("get_champ_select_profiles");
      if (Array.isArray(result) && result.length > 0) {
        // Resolve champion IDs to names
        return await resolveChampNames(result);
      }
    } catch {
      // LCU unavailable or not in champ select — fall back to mock
    }
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve(CHAMP_SELECT_PROFILES), 100);
  });
}

export async function getPlayerTitles(t?: TFunction): Promise<TitleResult[]> {
  const profiles = await getChampSelectProfiles();
  return profiles.map((p) => detectPlayerTitle(p, t));
}

// ─── Live Client Data (In-Game) ───────────────────────────────────────────────

export interface LiveGameData {
  activePlayer: {
    summonerName: string;
    level: number;
    currentGold: number;
    championStats: {
      attackDamage: number;
      abilityPower: number;
      armor: number;
      magicResist: number;
    };
  };
  allPlayers: {
    summonerName: string;
    championName: string;
    team: "ORDER" | "CHAOS";
    level: number;
    scores: { kills: number; deaths: number; assists: number; creepScore: number; wardScore: number };
    summonerSpells: { summonerSpellOne: { displayName: string; rawDisplayName: string }; summonerSpellTwo: { displayName: string; rawDisplayName: string } };
    isDead: boolean;
    respawnTimer: number;
    items: { itemID: number; displayName: string; slot: number }[];
  }[];
  gameData: {
    gameMode: string;
    gameTime: number;
    mapName: string;
    mapNumber: number;
  };
  events: {
    Events: { EventID: number; EventName: string; EventTime: number; [key: string]: unknown }[];
  };
}

// ─── Live Client Data API (Real Game Detection) ──────────────────────────────

/**
 * Riot's Live Client Data API runs at https://127.0.0.1:2999 during an active game.
 * Uses self-signed cert — browser must accept it once (navigate to https://127.0.0.1:2999).
 * In Tauri, the Rust backend handles the cert natively.
 */
const LIVE_CLIENT_API = "https://127.0.0.1:2999/liveclientdata";

let _liveClientAvailable: boolean | null = null;
let _liveClientLastCheck = 0;
const LIVE_CLIENT_RECHECK_MS = 3_000; // matches poll interval in LiveGame.tsx

async function fetchLiveClientData(): Promise<LiveGameData | null> {
  const now = Date.now();
  if (_liveClientAvailable === false && now - _liveClientLastCheck < LIVE_CLIENT_RECHECK_MS) {
    return null;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${LIVE_CLIENT_API}/allgamedata`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) { _liveClientAvailable = false; _liveClientLastCheck = now; return null; }
    const raw = await res.json();
    _liveClientAvailable = true;
    _liveClientLastCheck = now;
    return normalizeLiveGameResponse(raw);
  } catch {
    _liveClientAvailable = false;
    _liveClientLastCheck = now;
    return null;
  }
}

function normalizeLiveGameResponse(raw: unknown): LiveGameData | null {
  try {
    if (!raw || typeof raw !== "object") {
      console.warn("[LiveGame] normalizeLiveGameResponse: received non-object", raw);
      return null;
    }
    const r = raw as Record<string, unknown>;
    const players = r.allPlayers as Record<string, unknown>[] | undefined;

    // allPlayers is the only hard requirement
    if (!Array.isArray(players) || players.length === 0) {
      console.warn("[LiveGame] normalizeLiveGameResponse: no allPlayers array", r);
      return null;
    }

    const ap = (r.activePlayer || {}) as Record<string, unknown>;
    const gd = (r.gameData || {}) as Record<string, unknown>;
    const ev = r.events as Record<string, unknown> | undefined;
    const cs = (ap.championStats || {}) as Record<string, number>;

    return {
      activePlayer: {
        summonerName: (ap.riotIdGameName || ap.summonerName || "") as string,
        level: (ap.level || 1) as number,
        currentGold: (ap.currentGold || 0) as number,
        championStats: {
          attackDamage: cs.attackDamage || 0,
          abilityPower: cs.abilityPower || 0,
          armor: cs.armor || 0,
          magicResist: cs.magicResist || cs.magicResistance || 0,
        },
      },
      allPlayers: players.map((p) => {
        try {
          const sc = (p.scores || {}) as Record<string, number>;
          const sp = (p.summonerSpells || {}) as Record<string, Record<string, string>>;
          const rawItems = (p.items || []) as Record<string, unknown>[];
          // Champion name: try all known field variants
          const champName = (
            p.championName ||
            (typeof p.rawChampionName === "string" ? p.rawChampionName.replace("game_character_displayname_", "") : "") ||
            ""
          ) as string;
          return {
            summonerName: (p.riotIdGameName || p.summonerName || "") as string,
            championName: champName,
            team: (p.team === "ORDER" ? "ORDER" : "CHAOS") as "ORDER" | "CHAOS",
            level: (p.level || 1) as number,
            scores: {
              kills: sc.kills || 0,
              deaths: sc.deaths || 0,
              assists: sc.assists || 0,
              creepScore: sc.creepScore || 0,
              wardScore: sc.wardScore || sc.ward_score || 0,
            },
            summonerSpells: {
              summonerSpellOne: {
                displayName: (sp.summonerSpellOne?.displayName || "Flash"),
                rawDisplayName: (sp.summonerSpellOne?.rawDisplayName || ""),
              },
              summonerSpellTwo: {
                displayName: (sp.summonerSpellTwo?.displayName || "Flash"),
                rawDisplayName: (sp.summonerSpellTwo?.rawDisplayName || ""),
              },
            },
            isDead: (p.isDead || false) as boolean,
            respawnTimer: (p.respawnTimer || 0) as number,
            items: rawItems.map(item => ({
              itemID: (item.itemID || 0) as number,
              displayName: (item.displayName || "") as string,
              slot: (item.slot || 0) as number,
            })).filter(item => (item.itemID as number) > 0),
          };
        } catch (playerErr) {
          console.warn("[LiveGame] failed to normalize player", p, playerErr);
          return null;
        }
      }).filter((p): p is NonNullable<typeof p> => p !== null),
      gameData: {
        gameMode: (gd.gameMode || "CLASSIC") as string,
        gameTime: (gd.gameTime || 0) as number,
        mapName: (gd.mapName || "Map11") as string,
        mapNumber: (gd.mapNumber || 11) as number,
      },
      events: {
        Events: ((ev?.Events || []) as Record<string, unknown>[]).map((e) => ({
          EventID: (e.EventID || 0) as number,
          EventName: (e.EventName || "") as string,
          EventTime: (e.EventTime || 0) as number,
          ...e,
        })),
      },
    };
  } catch (err) {
    console.error("[LiveGame] normalizeLiveGameResponse threw:", err);
    return null;
  }
}

/**
 * Lightweight check: is a real LoL game currently running?
 */
export async function isLiveGameRunning(): Promise<boolean> {
  if (IS_TAURI) {
    try { return (await tauriInvoke<LiveGameData>("get_live_game_data")) !== null; } catch { return false; }
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${LIVE_CLIENT_API}/allgamedata`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

export async function getLiveGameData(): Promise<LiveGameData | null> {
  // Strategy 1: Tauri invoke (Rust handles self-signed cert natively)
  if (IS_TAURI) {
    try {
      const raw = await tauriInvoke<unknown>("get_live_game_data");
      const normalized = normalizeLiveGameResponse(raw);
      if (normalized) return normalized;
      // Normalization returned null — log for debugging but still fall through
      console.warn("[LiveGame] Tauri returned data but normalization failed:", raw);
    } catch (e) {
      // Tauri throws when game is not running — expected, fall through
    }
  }

  // Strategy 2: Direct fetch (web build or Tauri fallback)
  const real = await fetchLiveClientData();
  return real;
}

/**
 * Mock data for simulation/preview mode only.
 * Separated from getLiveGameData() so real detection stays clean.
 */
export function getMockLiveGameData(): LiveGameData {
  return {
    activePlayer: {
      summonerName: "FakerFan99",
      level: 11,
      currentGold: 4250,
      championStats: { attackDamage: 185, abilityPower: 0, armor: 68, magicResist: 42 },
    },
    allPlayers: [
      // ORDER team (allies)
      { summonerName: "FakerFan99", championName: "Jinx", team: "ORDER", level: 11, scores: { kills: 5, deaths: 1, assists: 3, creepScore: 182, wardScore: 18 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Heal", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 3031, displayName: "Infinity Edge", slot: 0 }, { itemID: 3094, displayName: "Rapid Firecannon", slot: 1 }, { itemID: 3006, displayName: "Berserker's Greaves", slot: 2 }] },
      { summonerName: "Ally Top", championName: "Aatrox", team: "ORDER", level: 10, scores: { kills: 2, deaths: 3, assists: 4, creepScore: 156, wardScore: 12 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Teleport", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 6632, displayName: "Divine Sunderer", slot: 0 }, { itemID: 3047, displayName: "Plated Steelcaps", slot: 1 }] },
      { summonerName: "Ally Mid", championName: "Ahri", team: "ORDER", level: 10, scores: { kills: 4, deaths: 2, assists: 6, creepScore: 168, wardScore: 15 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Ignite", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 3165, displayName: "Morellonomicon", slot: 0 }, { itemID: 3020, displayName: "Sorcerer's Shoes", slot: 1 }, { itemID: 4645, displayName: "Shadowflame", slot: 2 }] },
      { summonerName: "Ally Jgl", championName: "LeeSin", team: "ORDER", level: 9, scores: { kills: 1, deaths: 4, assists: 8, creepScore: 102, wardScore: 22 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Smite", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 6693, displayName: "Prowler's Claw", slot: 0 }, { itemID: 3111, displayName: "Mercury's Treads", slot: 1 }] },
      { summonerName: "Ally Sup", championName: "Nautilus", team: "ORDER", level: 8, scores: { kills: 0, deaths: 2, assists: 10, creepScore: 24, wardScore: 38 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Ignite", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 3109, displayName: "Knight's Vow", slot: 0 }, { itemID: 3047, displayName: "Plated Steelcaps", slot: 1 }] },
      // CHAOS team (enemies)
      { summonerName: "Enemy Top", championName: "Malphite", team: "CHAOS", level: 10, scores: { kills: 3, deaths: 2, assists: 5, creepScore: 148, wardScore: 10 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Teleport", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 3068, displayName: "Sunfire Aegis", slot: 0 }, { itemID: 3047, displayName: "Plated Steelcaps", slot: 1 }, { itemID: 3143, displayName: "Randuin's Omen", slot: 2 }] },
      { summonerName: "Enemy Jgl", championName: "Viego", team: "CHAOS", level: 9, scores: { kills: 4, deaths: 3, assists: 3, creepScore: 110, wardScore: 14 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Smite", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 6692, displayName: "Eclipse", slot: 0 }, { itemID: 3111, displayName: "Mercury's Treads", slot: 1 }] },
      { summonerName: "Enemy Mid", championName: "Syndra", team: "CHAOS", level: 11, scores: { kills: 6, deaths: 1, assists: 2, creepScore: 175, wardScore: 11 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Ignite", rawDisplayName: "" } }, isDead: true, respawnTimer: 12, items: [{ itemID: 3089, displayName: "Rabadon's Deathcap", slot: 0 }, { itemID: 3020, displayName: "Sorcerer's Shoes", slot: 1 }, { itemID: 4645, displayName: "Shadowflame", slot: 2 }, { itemID: 3157, displayName: "Zhonya's Hourglass", slot: 3 }] },
      { summonerName: "Enemy ADC", championName: "Jhin", team: "CHAOS", level: 10, scores: { kills: 2, deaths: 4, assists: 4, creepScore: 160, wardScore: 9 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Heal", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 3031, displayName: "Infinity Edge", slot: 0 }, { itemID: 3006, displayName: "Berserker's Greaves", slot: 1 }] },
      { summonerName: "Enemy Sup", championName: "Thresh", team: "CHAOS", level: 8, scores: { kills: 1, deaths: 2, assists: 8, creepScore: 18, wardScore: 31 }, summonerSpells: { summonerSpellOne: { displayName: "Flash", rawDisplayName: "" }, summonerSpellTwo: { displayName: "Exhaust", rawDisplayName: "" } }, isDead: false, respawnTimer: 0, items: [{ itemID: 2065, displayName: "Shurelya's Battlesong", slot: 0 }, { itemID: 3047, displayName: "Plated Steelcaps", slot: 1 }] },
    ],
    gameData: { gameMode: "CLASSIC", gameTime: 1245, mapName: "Map11", mapNumber: 11 },
    events: { Events: [] },
  };
}

// ─── Stored Summoner Identity (localStorage) ──────────────────────────────────

const STORED_IDENTITY_KEY = "velaris_summoner_identity";

export interface StoredIdentity {
  name: string;
  tag: string;
  profileIconId: number;
  region: string;
  rank?: string;
  division?: string;
  lp?: number;
  rankUpdatedAt?: number;
}

// ─── Multi-Account System ─────────────────────────────────────────────────────

const ACCOUNTS_KEY = "velaris_accounts";
const ACTIVE_ACCOUNT_KEY = "velaris_active_account";
const MAX_ACCOUNTS = 5;

export function getAccounts(): StoredIdentity[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      // Migrate from old single-identity system
      const legacy = localStorage.getItem(STORED_IDENTITY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed?.name && parsed?.tag) {
          const accounts = [parsed as StoredIdentity];
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
          localStorage.setItem(ACTIVE_ACCOUNT_KEY, "0");
          localStorage.removeItem(STORED_IDENTITY_KEY);
          return accounts;
        }
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function getActiveAccountIndex(): number {
  try {
    const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    return raw !== null ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export function getActiveAccount(): StoredIdentity | null {
  const accounts = getAccounts();
  if (accounts.length === 0) return null;
  const idx = Math.min(getActiveAccountIndex(), accounts.length - 1);
  return accounts[idx] || null;
}

export function setActiveAccount(index: number): void {
  const accounts = getAccounts();
  if (index >= 0 && index < accounts.length) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(index));
  }
}

export function addAccount(identity: StoredIdentity): number {
  const accounts = getAccounts();
  // Check if already exists (same name#tag)
  const existingIdx = accounts.findIndex(
    (a) => a.name.toLowerCase() === identity.name.toLowerCase() && a.tag.toLowerCase() === identity.tag.toLowerCase()
  );
  if (existingIdx !== -1) {
    accounts[existingIdx] = identity;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    return existingIdx;
  }
  if (accounts.length >= MAX_ACCOUNTS) return -1;
  accounts.push(identity);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return accounts.length - 1;
}

export function removeAccount(index: number): void {
  const accounts = getAccounts();
  if (index < 0 || index >= accounts.length) return;
  accounts.splice(index, 1);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  const activeIdx = getActiveAccountIndex();
  if (accounts.length === 0) {
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  } else if (activeIdx >= accounts.length) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(accounts.length - 1));
  } else if (index < activeIdx) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(activeIdx - 1));
  }
}

export function updateAccount(index: number, identity: StoredIdentity): void {
  const accounts = getAccounts();
  if (index < 0 || index >= accounts.length) return;
  accounts[index] = identity;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ─── Legacy compat wrappers ──────────────────────────────────────────────────

export function getStoredIdentity(): StoredIdentity | null {
  return getActiveAccount();
}

export function setStoredIdentity(identity: StoredIdentity): void {
  const idx = addAccount(identity);
  if (idx >= 0) setActiveAccount(idx);
}

export function clearStoredIdentity(): void {
  const idx = getActiveAccountIndex();
  removeAccount(idx);
}

// ─── Summoner Info ────────────────────────────────────────────────────────────

export interface SummonerInfo {
  name: string;
  tag: string;
  level: number;
  rank: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  profileIconId: number;
}

export async function getSummonerInfo(): Promise<SummonerInfo> {
  const result = await _fetchSummonerInfo();
  // Auto-sync rank data back to active account
  _syncRankToActiveAccount(result);
  return result;
}

function _syncRankToActiveAccount(info: SummonerInfo): void {
  try {
    const accounts = getAccounts();
    const idx = getActiveAccountIndex();
    if (idx < 0 || idx >= accounts.length) return;
    const acc = accounts[idx];
    // Only sync if the account matches the summoner info
    if (acc.name.toLowerCase() !== info.name.toLowerCase()) return;
    const needsUpdate =
      acc.rank !== info.rank ||
      acc.division !== info.division ||
      acc.lp !== info.lp ||
      acc.profileIconId !== info.profileIconId;
    if (needsUpdate) {
      updateAccount(idx, {
        ...acc,
        rank: info.rank,
        division: info.division,
        lp: info.lp,
        profileIconId: info.profileIconId,
        rankUpdatedAt: Date.now(),
      });
    }
  } catch { /* never break summoner info flow */ }
}

/**
 * Fetches rank for a specific account (by index) without switching the active account.
 * Used to auto-populate rank when a new account is added.
 */
export async function fetchRankForAccount(accountIdx: number): Promise<void> {
  const accounts = getAccounts();
  if (accountIdx < 0 || accountIdx >= accounts.length) return;
  const acc = accounts[accountIdx];

  // For non-Tauri (web preview), assign mock rank based on account name hash
  if (!IS_TAURI) {
    const MOCK_RANKS = [
      { rank: "EMERALD", division: "III", lp: 55 },
      { rank: "GOLD", division: "I", lp: 78 },
      { rank: "DIAMOND", division: "IV", lp: 12 },
      { rank: "PLATINUM", division: "II", lp: 44 },
      { rank: "SILVER", division: "I", lp: 90 },
    ];
    const hash = acc.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const mock = MOCK_RANKS[hash % MOCK_RANKS.length];
    updateAccount(accountIdx, {
      ...acc,
      rank: mock.rank,
      division: mock.division,
      lp: mock.lp,
      rankUpdatedAt: Date.now(),
    });
    return;
  }

  // In Tauri, temporarily switch active, fetch, then restore
  const prevIdx = getActiveAccountIndex();
  try {
    setActiveAccount(accountIdx);
    const info = await _fetchSummonerInfo();
    // Re-read in case accounts changed
    const freshAccounts = getAccounts();
    if (accountIdx < freshAccounts.length) {
      updateAccount(accountIdx, {
        ...freshAccounts[accountIdx],
        rank: info.rank,
        division: info.division,
        lp: info.lp,
        profileIconId: info.profileIconId,
        rankUpdatedAt: Date.now(),
      });
    }
  } catch { /* ignore */ } finally {
    // Restore original active account
    setActiveAccount(prevIdx >= 0 ? prevIdx : 0);
  }
}

/**
 * Refreshes rank for all stored accounts sequentially.
 * Used by the periodic auto-refresh (every 15min).
 */
export async function refreshAllAccountRanks(): Promise<void> {
  const accounts = getAccounts();
  for (let i = 0; i < accounts.length; i++) {
    await fetchRankForAccount(i);
  }
}

async function _fetchSummonerInfo(): Promise<SummonerInfo> {
  if (IS_TAURI) {
    // Strategy 1: Try the dedicated get_summoner_info command
    try {
      const result = await tauriInvoke<SummonerInfo>("get_summoner_info");
      if (result && result.name) return result;
    } catch {
      // Command doesn't exist or LCU unavailable
    }

    // Strategy 2: Try get_current_summoner (common LCU wrapper command)
    try {
      const raw = await tauriInvoke<Record<string, unknown>>("get_current_summoner");
      if (raw) {
        // LCU /lol-summoner/v1/current-summoner format
        const name = (raw.gameName || raw.displayName || raw.internalName || "") as string;
        const tag = (raw.tagLine || "") as string;
        const level = (raw.summonerLevel || raw.level || 1) as number;
        const profileIconId = (raw.profileIconId || 1) as number;

        // Try to get ranked info too
        let rank = "UNRANKED";
        let division = "";
        let lp = 0;
        let wins = 0;
        let losses = 0;
        try {
          const ranked = await tauriInvoke<Record<string, unknown>>("get_ranked_stats");
          if (ranked) {
            // LCU /lol-ranked/v1/current-ranked-stats format
            const queues = (ranked.queues || ranked.queueMap || []) as Record<string, unknown>[];
            // Find solo/duo queue
            const soloQ = Array.isArray(queues)
              ? queues.find((q) => q.queueType === "RANKED_SOLO_5x5")
              : (ranked as Record<string, Record<string, unknown>>)?.RANKED_SOLO_5x5;
            if (soloQ) {
              rank = ((soloQ.tier || soloQ.highestTier || "UNRANKED") as string).toUpperCase();
              division = (soloQ.division || soloQ.rank || "") as string;
              lp = (soloQ.leaguePoints || soloQ.lp || 0) as number;
              wins = (soloQ.wins || 0) as number;
              losses = (soloQ.losses || 0) as number;
            }
          }
        } catch {
          // Ranked stats unavailable — compute from match history
        }

        // If we don't have wins/losses from ranked, compute from match history
        if (wins === 0 && losses === 0) {
          try {
            const matches = await getMatchHistory();
            const playerGames = matches.map((m) => m.participants[m.playerParticipantIndex]).filter(Boolean);
            wins = playerGames.filter((p) => p.win).length;
            losses = playerGames.filter((p) => !p.win).length;
          } catch { /* ignore */ }
        }

        if (name) {
          return { name, tag, level, rank, division, lp, wins, losses, profileIconId };
        }
      }
    } catch {
      // Command doesn't exist
    }

    // Strategy 3: Use cached identity from match history (always available after first load)
    // If cache is empty, trigger a match history load to populate it
    if (!_cachedPlayerIdentity) {
      try {
        await getMatchHistory(); // This will populate _cachedPlayerIdentity
      } catch { /* ignore */ }
    }

    if (_cachedPlayerIdentity) {
      // Compute win/loss from match history
      let wins = 0;
      let losses = 0;
      try {
        const matches = await getMatchHistory();
        const playerGames = matches.map((m) => m.participants[m.playerParticipantIndex]).filter(Boolean);
        wins = playerGames.filter((p) => p.win).length;
        losses = playerGames.filter((p) => !p.win).length;
      } catch { /* ignore */ }

      return {
        name: _cachedPlayerIdentity.gameName,
        tag: _cachedPlayerIdentity.tagLine,
        level: 0, // Not available from match history
        rank: "UNRANKED",
        division: "",
        lp: 0,
        wins,
        losses,
        profileIconId: _cachedPlayerIdentity.profileIcon,
      };
    }
  }

  // Strategy 4: Use manually stored Riot ID from Settings
  const stored = getStoredIdentity();
  if (stored) {
    let wins = 0;
    let losses = 0;
    try {
      const matches = await getMatchHistory();
      const playerGames = matches.map((m) => m.participants[m.playerParticipantIndex]).filter(Boolean);
      wins = playerGames.filter((p) => p.win).length;
      losses = playerGames.filter((p) => !p.win).length;
    } catch { /* ignore */ }
    return {
      name: stored.name,
      tag: stored.tag,
      level: 0,
      rank: "UNRANKED",
      division: "",
      lp: 0,
      wins,
      losses,
      profileIconId: stored.profileIconId || 29,
    };
  }

  // Fallback: rich mock data so the app looks complete without any setup
  return {
    name: "FakerFan99",
    tag: "EUW",
    level: 156,
    rank: "EMERALD",
    division: "III",
    lp: 55,
    wins: 98,
    losses: 72,
    profileIconId: 4644,
  };
}

// ─── Post-Game Analysis ──────────────────────────────────────────────────────

export interface PostGameAnalysis {
  match: MatchData;
  player: MatchParticipant;
  allies: MatchParticipant[];
  enemies: MatchParticipant[];
  // Computed insights
  csPerMin: number;
  kda: number;
  damageShare: number;
  goldShare: number;
  visionPerMin: number;
  killParticipation: number;
  // Coach analysis
  strengths: { title: string; description: string }[];
  criticalError: { title: string; description: string; solution: string; timestamp: string } | null;
  coachSummary: string;
  // Flow phases
  phases: { label: string; type: "winning" | "neutral" | "losing"; width: number }[];
}

export async function getPostGameAnalysis(matchIndex: number = 0, t?: TFunction): Promise<PostGameAnalysis> {
  // Fallback identity function if t not provided
  const _t: TFunction = t || ((key, vars) => {
    if (!vars) return key;
    return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), key);
  });
  const matches = await getMatchHistory();
  // Get the most recent match (or specified index, 0 = most recent)
  const sortedMatches = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  const match = sortedMatches[matchIndex] || sortedMatches[0];
  const player = match?.participants[match.playerParticipantIndex];
  if (!player) throw new Error("Could not identify player in match data");

  const durationMin = match.gameDuration / 60;
  const totalCs = player.totalMinionsKilled + player.neutralMinionsKilled;
  const csPerMin = parseFloat((totalCs / durationMin).toFixed(1));
  const kda = player.deaths > 0 ? parseFloat(((player.kills + player.assists) / player.deaths).toFixed(2)) : player.kills + player.assists;
  
  const allies = match.participants.filter((p) => p.win === player.win);
  const enemies = match.participants.filter((p) => p.win !== player.win);
  
  const teamDmg = allies.reduce((s, p) => s + p.totalDamageDealtToChampions, 0);
  const teamGold = allies.reduce((s, p) => s + p.goldEarned, 0);
  const teamKills = allies.reduce((s, p) => s + p.kills, 0);
  
  const damageShare = teamDmg > 0 ? Math.round((player.totalDamageDealtToChampions / teamDmg) * 100) : 0;
  const goldShare = teamGold > 0 ? Math.round((player.goldEarned / teamGold) * 100) : 0;
  const visionPerMin = parseFloat((player.visionScore / durationMin).toFixed(1));
  const killParticipation = teamKills > 0 ? Math.round(((player.kills + player.assists) / teamKills) * 100) : 0;
  
  // ─── Extended computed stats ───��─────────────────────────────────────────────
  const isSup = player.teamPosition === "UTILITY";
  const isJgl = player.teamPosition === "JUNGLE";
  const isCarry = player.teamPosition === "BOTTOM" || player.teamPosition === "MIDDLE";
  const goldEfficiency = player.goldEarned > 0 ? Math.round((player.goldSpent / player.goldEarned) * 100) : 0;
  const goldUnspent = player.goldEarned - player.goldSpent;
  const teamDmgTaken = allies.reduce((s, p) => s + p.totalDamageTaken, 0);
  const tankShare = teamDmgTaken > 0 ? Math.round((player.totalDamageTaken / teamDmgTaken) * 100) : 0;

  // Detect death chains (3+ deaths within a 5 min window)
  const sortedPlayerDeaths = [...player.deathTimestamps].sort((a, b) => a - b);
  let maxDeathChain = 0;
  let deathChainWindow = "";
  for (let i = 0; i < sortedPlayerDeaths.length; i++) {
    let chain = 1;
    for (let j = i + 1; j < sortedPlayerDeaths.length; j++) {
      if (sortedPlayerDeaths[j] - sortedPlayerDeaths[i] <= 5) chain++;
      else break;
    }
    if (chain > maxDeathChain) {
      maxDeathChain = chain;
      deathChainWindow = `${Math.floor(sortedPlayerDeaths[i])}:00-${Math.floor(Math.min(sortedPlayerDeaths[i] + 5, durationMin))}:00`;
    }
  }
  const lateDeaths = player.deathTimestamps.filter((t) => t > durationMin - 10);

  // ─── Generate strengths from actual data (expanded: ~16 variants) ──────────
  const strengths: { title: string; description: string }[] = [];
  const mins = Math.floor(durationMin);

  if (player.deaths === 0 && durationMin > 15) {
    strengths.push({ title: _t("str.deathless.title"), description: _t("str.deathless.desc", { minutes: mins }) });
  } else if (player.deaths <= 2 && durationMin > 20) {
    strengths.push({ title: _t("str.survival.title"), description: _t("str.survival.desc", { deaths: player.deaths, minutes: mins }) });
  }
  if (csPerMin >= 8.5) {
    strengths.push({ title: _t("str.csPro.title"), description: _t("str.csPro.desc", { csPerMin }) });
  } else if (csPerMin >= 7.5) {
    strengths.push({ title: _t("str.csExcellent.title"), description: _t("str.csExcellent.desc", { csPerMin, minutes: mins }) });
  }
  if (killParticipation >= 75) {
    strengths.push({ title: _t("str.omnipresent.title"), description: _t("str.omnipresent.desc", { kp: killParticipation }) });
  } else if (killParticipation >= 60) {
    strengths.push({ title: _t("str.highKP.title"), description: _t("str.highKP.desc", { kp: killParticipation }) });
  }
  if (damageShare > 35) {
    strengths.push({ title: _t("str.mainThreat.title"), description: _t("str.mainThreat.desc", { dmgShare: damageShare }) });
  }
  if (damageShare > goldShare + 5 && damageShare > 20) {
    strengths.push({ title: _t("str.efficientDmg.title"), description: _t("str.efficientDmg.desc", { dmgShare: damageShare, goldShare }) });
  }
  if (goldEfficiency >= 92 && player.goldEarned > 8000) {
    strengths.push({ title: _t("str.goldEfficient.title"), description: _t("str.goldEfficient.desc", { goldEff: goldEfficiency }) });
  }
  if (visionPerMin >= 1.5) {
    strengths.push({ title: _t("str.visionExceptional.title"), description: _t("str.visionExceptional.desc", { vpm: visionPerMin }) });
  } else if (visionPerMin >= 1.0) {
    strengths.push({ title: _t("str.visionSolid.title"), description: _t("str.visionSolid.desc", { vpm: visionPerMin }) });
  }
  if (player.controlWardsPlaced >= 4) {
    strengths.push({ title: _t("str.controlWards.title"), description: _t("str.controlWards.desc", { cw: player.controlWardsPlaced }) });
  }
  if (player.firstBloodKill) {
    strengths.push({ title: _t("str.firstBlood.title"), description: _t("str.firstBlood.desc") });
  }
  if (player.turretKills >= 2) {
    strengths.push({ title: _t("str.towerPressure.title"), description: _t("str.towerPressure.desc", { turrets: player.turretKills }) });
  }
  if (player.dragonKills >= 1) {
    strengths.push({ title: _t("str.dragonControl.title"), description: _t("str.dragonControl.desc", { dragons: player.dragonKills }) });
  }
  if (player.assists > player.kills * 2 && player.assists >= 10) {
    strengths.push({ title: _t("str.teamMentality.title"), description: _t("str.teamMentality.desc", { assists: player.assists }) });
  }
  if (tankShare > 30 && (player.teamPosition === "TOP" || isJgl || isSup)) {
    strengths.push({ title: _t("str.frontline.title"), description: _t("str.frontline.desc", { tankShare }) });
  }
  if (kda >= 6) {
    strengths.push({ title: _t("str.kdaExceptional.title"), description: _t("str.kdaExceptional.desc", { kda }) });
  }
  if (player.deathTimestamps.filter((dt) => dt <= 5).length >= 2 && player.win) {
    strengths.push({ title: _t("str.comeback.title"), description: _t("str.comeback.desc") });
  }

  // Limit to top 4 and ensure at least one
  const finalStrengths = strengths.slice(0, 4);
  if (finalStrengths.length === 0) {
    finalStrengths.push({ title: _t("str.fallback.title"), description: _t("str.fallback.desc", { minutes: mins }) });
  }

  // ─── Generate critical error (expanded: ~12 variants) ─────────────────────
  const earlyDeaths = player.deathTimestamps.filter((t) => t <= 5);
  const midDeaths = player.deathTimestamps.filter((t) => t > 10 && t <= 25);
  let criticalError: PostGameAnalysis["criticalError"] = null;

  const edTS = earlyDeaths.map((d) => d.toFixed(1)).join(", ");
  if (earlyDeaths.length >= 3) {
    criticalError = {
      title: _t("err.earlyCollapse.title"),
      description: _t("err.earlyCollapse.desc", { deaths: earlyDeaths.length, timestamps: edTS }),
      solution: _t("err.earlyCollapse.solution"),
      timestamp: `${Math.floor(earlyDeaths[0])}:${Math.round((earlyDeaths[0] % 1) * 60).toString().padStart(2, "0")}`,
    };
  } else if (earlyDeaths.length >= 2) {
    criticalError = {
      title: _t("err.earlyRepeat.title"),
      description: _t("err.earlyRepeat.desc", { deaths: earlyDeaths.length, timestamps: edTS }),
      solution: _t("err.earlyRepeat.solution"),
      timestamp: `${Math.floor(earlyDeaths[0])}:${Math.round((earlyDeaths[0] % 1) * 60).toString().padStart(2, "0")}`,
    };
  } else if (maxDeathChain >= 3) {
    criticalError = {
      title: _t("err.deathChain.title"),
      description: _t("err.deathChain.desc", { deaths: maxDeathChain, window: deathChainWindow }),
      solution: _t("err.deathChain.solution"),
      timestamp: deathChainWindow.split("-")[0],
    };
  } else if (midDeaths.length >= 3) {
    const worstMin = midDeaths[Math.floor(midDeaths.length / 2)];
    criticalError = {
      title: _t("err.midPosition.title"),
      description: _t("err.midPosition.desc", { deaths: midDeaths.length }),
      solution: _t("err.midPosition.solution"),
      timestamp: `${Math.floor(worstMin)}:00`,
    };
  } else if (lateDeaths.length >= 3 && !player.win) {
    criticalError = {
      title: _t("err.lateCollapse.title"),
      description: _t("err.lateCollapse.desc", { deaths: lateDeaths.length }),
      solution: _t("err.lateCollapse.solution"),
      timestamp: `${Math.floor(lateDeaths[0])}:00`,
    };
  } else if (goldUnspent > 2000) {
    criticalError = {
      title: _t("err.goldUnspent.title"),
      description: _t("err.goldUnspent.desc", { gold: goldUnspent.toLocaleString() }),
      solution: _t("err.goldUnspent.solution"),
      timestamp: `${Math.floor(durationMin - 3)}:00`,
    };
  } else if (player.controlWardsPlaced <= 0 && durationMin > 20) {
    criticalError = {
      title: _t("err.zeroWards.title"),
      description: _t("err.zeroWards.desc", { minutes: mins }),
      solution: _t("err.zeroWards.solution"),
      timestamp: "10:00",
    };
  } else if (killParticipation < 30 && !isSup && teamKills >= 10) {
    criticalError = {
      title: _t("err.absentFights.title"),
      description: _t("err.absentFights.desc", { kp: killParticipation, teamKills, champ: player.championName }),
      solution: _t("err.absentFights.solution"),
      timestamp: "15:00",
    };
  } else if (csPerMin < 4 && !isSup && !isJgl) {
    criticalError = {
      title: _t("err.lowCs.title"),
      description: _t("err.lowCs.desc", { csPerMin }),
      solution: _t("err.lowCs.solution"),
      timestamp: "8:00",
    };
  } else if (damageShare < 12 && !isSup && isCarry) {
    criticalError = {
      title: _t("err.lowDmg.title"),
      description: _t("err.lowDmg.desc", { dmgShare: damageShare, champ: player.championName }),
      solution: _t("err.lowDmg.solution"),
      timestamp: "20:00",
    };
  } else if (visionPerMin < 0.4 && durationMin > 25 && !isCarry) {
    criticalError = {
      title: _t("err.blindMap.title"),
      description: _t("err.blindMap.desc", { vpm: visionPerMin, minutes: mins }),
      solution: _t("err.blindMap.solution"),
      timestamp: "12:00",
    };
  } else if (player.deaths >= 5) {
    criticalError = {
      title: _t("err.tooManyDeaths.title"),
      description: _t("err.tooManyDeaths.desc", { deaths: player.deaths }),
      solution: _t("err.tooManyDeaths.solution"),
      timestamp: `${Math.floor(player.deathTimestamps[Math.floor(player.deathTimestamps.length / 2)] || 15)}:00`,
    };
  }

  // ─── Coach summary (expanded: ~12 variants) ──────────────────────────────
  let coachSummary: string;

  if (player.win) {
    if (player.deaths === 0 && durationMin > 20) {
      coachSummary = _t("coach.perfectWin", { minutes: mins, champ: player.championName });
    } else if (csPerMin >= 8 && player.deaths <= 2) {
      const fbNote = player.firstBloodKill ? _t("coach.dominantWin.fb") : _t("coach.dominantWin.noFb");
      coachSummary = _t("coach.dominantWin", { csPerMin, deaths: player.deaths, fbNote });
    } else if (damageShare > 35 && player.kills >= 8) {
      coachSummary = _t("coach.carryWin", { dmgShare: damageShare, kills: player.kills, champ: player.championName });
    } else if (killParticipation > 70 && player.assists > player.kills) {
      coachSummary = _t("coach.facilitatorWin", { kp: killParticipation, assists: player.assists });
    } else if (durationMin > 35) {
      coachSummary = _t("coach.lateWin", { minutes: mins });
    } else if (durationMin < 20) {
      const fbNote = player.firstBloodKill ? _t("coach.stompWin.fb") : _t("coach.stompWin.noFb");
      coachSummary = _t("coach.stompWin", { minutes: mins, fbNote });
    } else {
      const csNote = csPerMin < 7 ? _t("coach.solidWin.lowCs") : _t("coach.solidWin.goodCs", { csPerMin });
      coachSummary = _t("coach.solidWin", { kp: killParticipation, csNote });
    }
  } else {
    if (earlyDeaths.length >= 3) {
      coachSummary = _t("coach.earlyLoss3", { deaths: earlyDeaths.length });
    } else if (earlyDeaths.length >= 2) {
      coachSummary = _t("coach.earlyLoss2", { deaths: earlyDeaths.length });
    } else if (maxDeathChain >= 3) {
      coachSummary = _t("coach.tiltLoss", { deaths: maxDeathChain, window: deathChainWindow });
    } else if (kda >= 3 && !player.win) {
      coachSummary = _t("coach.goodStatsLoss", { kda });
    } else if (goldUnspent > 2000) {
      coachSummary = _t("coach.goldWasteLoss", { gold: goldUnspent.toLocaleString(), components: Math.floor(goldUnspent / 350), wards: Math.floor(goldUnspent / 75) });
    } else if (durationMin > 35) {
      coachSummary = _t("coach.lateLoss", { minutes: mins });
    } else {
      coachSummary = _t("coach.closeLoss", { kda });
    }
  }

  // Game flow phases (computed from death timing and win state)
  const earlyPhase = earlyDeaths.length === 0 ? "winning" : earlyDeaths.length === 1 ? "neutral" : "losing";
  const midPhase = midDeaths.length <= 1 ? (player.kills > 3 ? "winning" : "neutral") : "losing";
  const latePhase = player.win ? "winning" : "losing";
  
  const phases: PostGameAnalysis["phases"] = [
    { label: "0:00 - 14:00", type: earlyPhase as "winning" | "neutral" | "losing", width: 35 },
    { label: "14:00 - 25:00", type: midPhase as "winning" | "neutral" | "losing", width: 35 },
    { label: `25:00 - ${Math.floor(durationMin)}:00`, type: latePhase as "winning" | "neutral" | "losing", width: 30 },
  ];

  return {
    match,
    player,
    allies,
    enemies,
    csPerMin,
    kda,
    damageShare,
    goldShare,
    visionPerMin,
    killParticipation,
    strengths: finalStrengths,
    criticalError,
    coachSummary,
    phases,
  };
}

// ─── Learning Path Generation ──────────────────���─────────────────────────────

export interface LearningTask {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  type: string;
  estimatedLpGain: string;
  source: string; // What data generated this task
  status: "todo" | "in_progress" | "mastered";
}

export async function getLearningTasks(t?: TFunction): Promise<LearningTask[]> {
  const _t: TFunction = t || ((key) => key);
  const allMatches = await getMatchHistory();
  const summoner = await getSummonerInfo();
  // Only analyze ranked games for learning tasks
  const ranked = allMatches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
  const matches = ranked.length > 0 ? ranked : allMatches;
  const data = computeDashboardData(matches, summoner.rank ?? "EMERALD");
  const tasks: LearningTask[] = [];
  let taskId = 1;

  // Analyze patterns and generate tasks
  const playerGames = matches
    .map((m) => ({ match: m, player: m.participants[m.playerParticipantIndex] }))
    .filter((g): g is { match: typeof g.match; player: NonNullable<typeof g.player> } => g.player != null);

  // ── Task from early death patterns ──
  const allDeathTimings = playerGames.flatMap((g) => g.player.deathTimestamps);
  const earlyDeaths = allDeathTimings.filter((t) => t >= 2.5 && t <= 5).length;
  const totalDeaths = allDeathTimings.length;
  const earlyDeathPct = totalDeaths > 0 ? Math.round((earlyDeaths / totalDeaths) * 100) : 0;

  if (earlyDeathPct > 20) {
    tasks.push({
      id: `T-${String(taskId++).padStart(2, "0")}`,
      title: _t("learn.task.earlyDeaths.title"),
      description: _t("learn.task.earlyDeaths.desc", { pct: earlyDeathPct }),
      priority: "high",
      type: _t("learn.task.type.survival"),
      estimatedLpGain: "+15-20",
      source: _t("learn.task.earlyDeaths.source", { deaths: earlyDeaths, games: matches.length }),
      status: "in_progress",
    });
  }

  // ── Task from vision score ──
  const avgVisionPerMin = playerGames.reduce((s, g) => s + g.player.visionScore / (g.match.gameDuration / 60), 0) / playerGames.length;
  if (avgVisionPerMin < 0.8) {
    tasks.push({
      id: `T-${String(taskId++).padStart(2, "0")}`,
      title: _t("learn.task.vision.title"),
      description: _t("learn.task.vision.desc", { vpm: avgVisionPerMin.toFixed(1) }),
      priority: "high",
      type: _t("learn.task.type.vision"),
      estimatedLpGain: "+10-15",
      source: _t("learn.task.vision.source", { vpm: avgVisionPerMin.toFixed(2), games: matches.length }),
      status: "todo",
    });
  }

  // ── Task from control wards ──
  const lowControlWardGames = playerGames.filter((g) => g.player.controlWardsPlaced <= 1).length;
  const lowControlWardPct = Math.round((lowControlWardGames / playerGames.length) * 100);
  if (lowControlWardPct > 30) {
    tasks.push({
      id: `T-${String(taskId++).padStart(2, "0")}`,
      title: _t("learn.task.controlWards.title"),
      description: _t("learn.task.controlWards.desc", { pct: lowControlWardPct }),
      priority: "medium",
      type: _t("learn.task.type.vision"),
      estimatedLpGain: "+8-12",
      source: _t("learn.task.controlWards.source", { lowGames: lowControlWardGames, games: matches.length }),
      status: "todo",
    });
  }

  // ── Task from CS improvement opportunity ──
  const csmValues = playerGames.map((g) => {
    const totalCs = g.player.totalMinionsKilled + g.player.neutralMinionsKilled;
    return totalCs / (g.match.gameDuration / 60);
  });
  const avgCsm = csmValues.reduce((a, b) => a + b, 0) / csmValues.length;
  const csmLast5 = csmValues.slice(-5).reduce((a, b) => a + b, 0) / 5;

  if (avgCsm < 7.5) {
    tasks.push({
      id: `T-${String(taskId++).padStart(2, "0")}`,
      title: _t("learn.task.cs.title"),
      description: _t("learn.task.cs.desc", { csm: avgCsm.toFixed(1) }),
      priority: "high",
      type: _t("learn.task.type.farming"),
      estimatedLpGain: "+20-25",
      source: _t("learn.task.cs.source", { csm: avgCsm.toFixed(1), games: matches.length }),
      status: csmLast5 > avgCsm ? "in_progress" : "todo",
    });
  }

  // ── Task from first blood winrate ──
  const aggressiveGames = playerGames.filter((g) => g.player.firstBloodKill || g.player.firstBloodAssist);
  const aggressiveWr = aggressiveGames.length > 0 ? Math.round((aggressiveGames.filter((g) => g.player.win).length / aggressiveGames.length) * 100) : 0;
  if (aggressiveWr > 65 && aggressiveGames.length >= 5) {
    tasks.push({
      id: `T-${String(taskId++).padStart(2, "0")}`,
      title: _t("learn.task.firstBlood.title"),
      description: _t("learn.task.firstBlood.desc", { wr: aggressiveWr, fbGames: aggressiveGames.length }),
      priority: "medium",
      type: _t("learn.task.type.aggression"),
      estimatedLpGain: "+10-15",
      source: _t("learn.task.firstBlood.source", { wr: aggressiveWr, fbGames: aggressiveGames.length }),
      status: "mastered",
    });
  }

  // ── Task from role performance ──
  const roleMap: Record<string, { wins: number; total: number }> = {};
  playerGames.forEach((g) => {
    const role = g.player.teamPosition;
    const displayRole = role === "MIDDLE" ? "MID" : role === "BOTTOM" ? "ADC" : role === "JUNGLE" ? "JGL" : role === "UTILITY" ? "SUP" : "TOP";
    if (!roleMap[displayRole]) roleMap[displayRole] = { wins: 0, total: 0 };
    roleMap[displayRole].total++;
    if (g.player.win) roleMap[displayRole].wins++;
  });

  const worstRole = Object.entries(roleMap)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => a[1].wins / a[1].total - b[1].wins / b[1].total)[0];

  if (worstRole && worstRole[1].wins / worstRole[1].total < 0.4) {
    tasks.push({
      id: `T-${String(taskId++).padStart(2, "0")}`,
      title: _t("learn.task.worstRole.title", { role: worstRole[0] }),
      description: _t("learn.task.worstRole.desc", { wr: Math.round((worstRole[1].wins / worstRole[1].total) * 100), role: worstRole[0], games: worstRole[1].total }),
      priority: "medium",
      type: _t("learn.task.type.roles"),
      estimatedLpGain: "+10-15",
      source: _t("learn.task.worstRole.source", { wins: worstRole[1].wins, games: worstRole[1].total, role: worstRole[0] }),
      status: "todo",
    });
  }

  // ── Task from damage efficiency ──
  const damageShares = playerGames.map((g) => {
    const teamDmg = matches[0].participants.filter((p) => p.win === g.player.win).reduce((s, p) => s + p.totalDamageDealtToChampions, 0);
    return teamDmg > 0 ? (g.player.totalDamageDealtToChampions / teamDmg) * 100 : 0;
  });
  const avgDmgShare = damageShares.reduce((a, b) => a + b, 0) / damageShares.length;

  if (avgDmgShare > 28) {
    tasks.push({
      id: `T-${String(taskId++).padStart(2, "0")}`,
      title: _t("learn.task.damage.title"),
      description: _t("learn.task.damage.desc", { dmgShare: Math.round(avgDmgShare) }),
      priority: "low",
      type: _t("learn.task.type.macro"),
      estimatedLpGain: "+5-10",
      source: _t("learn.task.damage.source", { dmgShare: Math.round(avgDmgShare), games: matches.length }),
      status: "in_progress",
    });
  }

  // ── Always have at least one mastered task for motivation ──
  if (!tasks.find((tk) => tk.status === "mastered")) {
    const bestRole = Object.entries(roleMap)
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => b[1].wins / b[1].total - a[1].wins / a[1].total)[0];
    if (bestRole) {
      tasks.push({
        id: `T-${String(taskId++).padStart(2, "0")}`,
        title: _t("learn.task.bestRole.title", { role: bestRole[0] }),
        description: _t("learn.task.bestRole.desc", { wr: Math.round((bestRole[1].wins / bestRole[1].total) * 100), games: bestRole[1].total, role: bestRole[0] }),
        priority: "low",
        type: _t("learn.task.type.roles"),
        estimatedLpGain: _t("learn.task.lpMaintain"),
        source: _t("learn.task.bestRole.source", { wins: bestRole[1].wins, games: bestRole[1].total, role: bestRole[0] }),
        status: "mastered",
      });
    }
  }

  return tasks;
}

// ─── Profile Stats ────────────────────────────────────────────────────────────

export interface ProfileStats {
  summoner: SummonerInfo;
  winrate: number;
  totalGames: number;
  avgKda: number;
  avgCsPerMin: number;
  avgVisionPerMin: number;
  bestChampions: { name: string; games: number; winrate: number; kda: number }[];
  recentTrend: { name: string; value: number }[];
  roleDistribution: { role: string; games: number; winrate: number }[];
  strengths: string[];
  weaknesses: string[];
}

export async function getProfileStats(t?: TFunction): Promise<ProfileStats> {
  const _t: TFunction = t || ((key) => key);
  const [summoner, allMatches] = await Promise.all([getSummonerInfo(), getMatchHistory()]);

  // Only count ranked games (SoloQ + Flex) for stats
  const ranked = allMatches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
  const matches = ranked.length > 0 ? ranked : allMatches; // fall back if no ranked data

  const playerGames = matches
    .map((m) => ({ match: m, player: m.participants[m.playerParticipantIndex] }))
    .filter((g): g is { match: typeof g.match; player: NonNullable<typeof g.player> } => g.player != null);

  const totalGames = playerGames.length;
  const wins = playerGames.filter((g) => g.player.win).length;
  const winrate = Math.round((wins / totalGames) * 100);
  
  const avgKda = parseFloat(
    (
      playerGames.reduce((s, g) => {
        const d = g.player.deaths || 1;
        return s + (g.player.kills + g.player.assists) / d;
      }, 0) / totalGames
    ).toFixed(1)
  );
  
  const avgCsPerMin = parseFloat(
    (
      playerGames.reduce((s, g) => {
        const totalCs = g.player.totalMinionsKilled + g.player.neutralMinionsKilled;
        return s + totalCs / (g.match.gameDuration / 60);
      }, 0) / totalGames
    ).toFixed(1)
  );
  
  const avgVisionPerMin = parseFloat(
    (playerGames.reduce((s, g) => s + g.player.visionScore / (g.match.gameDuration / 60), 0) / totalGames).toFixed(1)
  );
  
  // Champion stats
  const champMap: Record<string, { games: number; wins: number; kills: number; deaths: number; assists: number }> = {};
  playerGames.forEach((g) => {
    const c = g.player.championName;
    if (!champMap[c]) champMap[c] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    champMap[c].games++;
    if (g.player.win) champMap[c].wins++;
    champMap[c].kills += g.player.kills;
    champMap[c].deaths += g.player.deaths;
    champMap[c].assists += g.player.assists;
  });
  
  const bestChampions = Object.entries(champMap)
    .map(([name, stats]) => ({
      name,
      games: stats.games,
      winrate: Math.round((stats.wins / stats.games) * 100),
      kda: parseFloat(((stats.kills + stats.assists) / Math.max(stats.deaths, 1)).toFixed(1)),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);
  
  // Recent performance trend (LP-like curve from last 10 games)
  let lpAccum = 0;
  const recentTrend = playerGames.slice(-10).map((g, i) => {
    lpAccum += g.player.win ? 22 : -18;
    return { name: `${i + 1}`, value: lpAccum };
  });
  
  // Role distribution
  const roleMap: Record<string, { games: number; wins: number }> = {};
  playerGames.forEach((g) => {
    const role = g.player.teamPosition;
    const displayRole = role === "MIDDLE" ? "MID" : role === "BOTTOM" ? "ADC" : role === "JUNGLE" ? "JGL" : role === "UTILITY" ? "SUP" : "TOP";
    if (!roleMap[displayRole]) roleMap[displayRole] = { games: 0, wins: 0 };
    roleMap[displayRole].games++;
    if (g.player.win) roleMap[displayRole].wins++;
  });
  
  const roleDistribution = Object.entries(roleMap)
    .map(([role, stats]) => ({
      role,
      games: stats.games,
      winrate: Math.round((stats.wins / stats.games) * 100),
    }))
    .sort((a, b) => b.games - a.games);
  
  // Computed strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  if (avgCsPerMin >= 7.5) strengths.push(_t("profile.str.csAbove"));
  else weaknesses.push(_t("profile.weak.csBelow"));
  
  if (avgKda >= 3.5) strengths.push(_t("profile.str.kdaAbove"));
  
  if (avgVisionPerMin >= 0.9) strengths.push(_t("profile.str.goodVision"));
  else weaknesses.push(_t("profile.weak.visionBelow"));
  
  const aggressiveGames = playerGames.filter((g) => g.player.firstBloodKill);
  if (aggressiveGames.length >= 5) strengths.push(_t("profile.str.aggressiveEarly"));
  
  const earlyDeaths = playerGames.flatMap((g) => (g.player.deathTimestamps ?? []).filter((dt) => dt <= 5)).length;
  if (earlyDeaths > 10) weaknesses.push(_t("profile.weak.earlyVulnerable"));
  
  return {
    summoner,
    winrate,
    totalGames,
    avgKda,
    avgCsPerMin,
    avgVisionPerMin,
    bestChampions,
    recentTrend,
    roleDistribution,
    strengths,
    weaknesses,
  };
}

// ─── Settings Persistence ─────────────────────────────────────────────────────

export interface AppSettings {
  launchOnStartup: boolean;
  hardwareAccel: boolean;
  overlayEnabled: boolean;
  overlayOpacity: string;
  showEnemySpells: boolean;
  showJungleTimers: boolean;
  autoAccept: boolean;
  desktopAlerts: boolean;
  soundVolume: string;
  telemetry: boolean;
  celebrationsEnabled: boolean;
  celebrationSound: boolean;
  celebrationSensitivity: "rank_only" | "great_games" | "everything";
  autoImportRunes: boolean;
  coachEnabled: boolean;
  coachAutoAnalyze: boolean;
}

const SETTINGS_KEY = "velaris-settings";

const DEFAULT_SETTINGS: AppSettings = {
  launchOnStartup: true,
  hardwareAccel: true,
  overlayEnabled: true,
  overlayOpacity: "90",
  showEnemySpells: true,
  showJungleTimers: true,
  autoAccept: false,
  desktopAlerts: true,
  soundVolume: "50",
  telemetry: false,
  celebrationsEnabled: true,
  celebrationSound: true,
  celebrationSensitivity: "great_games",
  autoImportRunes: true,
  coachEnabled: true,
  coachAutoAnalyze: false,
};

export function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Initializes settings from Tauri file storage (if available).
 * Call once at app startup. Falls back to localStorage if not in Tauri.
 */
export async function initSettingsFromTauri(): Promise<AppSettings> {
  if (IS_TAURI) {
    try {
      const tauriSettings = await tauriInvoke<AppSettings | null>("load_settings");
      if (tauriSettings && typeof tauriSettings === "object" && "launchOnStartup" in tauriSettings) {
        // Sync to localStorage as cache
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(tauriSettings)); } catch {}
        return tauriSettings;
      }
    } catch {
      // Command unavailable or no saved file — use localStorage/defaults
    }
  }
  return loadSettings();
}

export function saveSettings(settings: AppSettings): void {
  // Always save to localStorage (fast, sync)
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
  
  // In Tauri, also persist to file and sync OS-level settings
  if (IS_TAURI) {
    tauriInvoke("save_settings", { settings }).catch((e: unknown) => {
      console.warn("[Velaris] Failed to save settings to Tauri:", e);
    });
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: "info" | "success" | "warning" | "streak" | "patch" | "learning" | "insight";
  title: string;
  description: string;
  timestamp: number; // Date.now()
  read: boolean;
  actionPath?: string; // Optional route to navigate to
}

const NOTIFICATIONS_KEY = "velaris-notifications";

function generateNotificationsFromData(matches: MatchData[], t?: TFunction): AppNotification[] {
  const _t: TFunction = t || ((key) => key);
  const now = Date.now();
  const notifications: AppNotification[] = [];
  const stored = loadReadNotifications();

  const playerGames = matches
    .map((m) => ({ match: m, player: m.participants[m.playerParticipantIndex] }))
    .filter((g): g is { match: typeof g.match; player: NonNullable<typeof g.player> } => g.player != null);

  // Streak detection
  const sorted = [...playerGames].sort((a, b) => b.match.gameCreation - a.match.gameCreation);
  let streak = 0;
  const streakWin = sorted[0]?.player.win;
  for (const g of sorted) {
    if (g.player.win === streakWin) streak++;
    else break;
  }
  if (streak >= 3) {
    const id = `streak-${streak}-${streakWin ? "w" : "l"}`;
    notifications.push({
      id,
      type: streakWin ? "streak" : "warning",
      title: streakWin ? _t("notif.streak.winTitle", { count: streak }) : _t("notif.streak.lossTitle", { count: streak }),
      description: streakWin
        ? _t("notif.streak.winDesc")
        : _t("notif.streak.lossDesc"),
      timestamp: now - 60000 * 2,
      read: stored.includes(id),
      actionPath: "/dashboard",
    });
  }

  // Best champion winrate alert
  const champMap: Record<string, { games: number; wins: number }> = {};
  playerGames.forEach((g) => {
    const c = g.player.championName;
    if (!champMap[c]) champMap[c] = { games: 0, wins: 0 };
    champMap[c].games++;
    if (g.player.win) champMap[c].wins++;
  });
  const bestChamp = Object.entries(champMap)
    .filter(([, s]) => s.games >= 5)
    .sort((a, b) => (b[1].wins / b[1].games) - (a[1].wins / a[1].games))
    .map(([name, s]) => ({ name, wr: Math.round((s.wins / s.games) * 100), games: s.games }))[0];
  if (bestChamp && bestChamp.wr >= 60) {
    const id = `best-champ-${bestChamp.name}`;
    notifications.push({
      id,
      type: "success",
      title: _t("notif.bestChamp.title", { champ: bestChamp.name, wr: bestChamp.wr }),
      description: _t("notif.bestChamp.desc", { games: bestChamp.games, champ: bestChamp.name }),
      timestamp: now - 60000 * 30,
      read: stored.includes(id),
      actionPath: "/profile",
    });
  }

  // Vision improvement needed
  const avgVision = playerGames.reduce((s, g) => s + g.player.visionScore / (g.match.gameDuration / 60), 0) / playerGames.length;
  if (avgVision < 0.8) {
    const id = "vision-low";
    notifications.push({
      id,
      type: "insight",
      title: _t("notif.vision.title"),
      description: _t("notif.vision.desc", { vpm: avgVision.toFixed(1) }),
      timestamp: now - 60000 * 60,
      read: stored.includes(id),
      actionPath: "/learning",
    });
  }

  // Recent match result
  const lastGame = sorted[0];
  if (lastGame) {
    const p = lastGame.player;
    const id = `last-match-${lastGame.match.matchId}`;
    notifications.push({
      id,
      type: p.win ? "success" : "info",
      title: p.win ? _t("notif.lastMatch.winTitle", { champ: p.championName }) : _t("notif.lastMatch.lossTitle", { champ: p.championName }),
      description: _t("notif.lastMatch.desc", { kda: `${p.kills}/${p.deaths}/${p.assists}`, csm: ((p.totalMinionsKilled + p.neutralMinionsKilled) / (lastGame.match.gameDuration / 60)).toFixed(1) }),
      timestamp: lastGame.match.gameCreation,
      read: stored.includes(id),
      actionPath: "/post-game",
    });
  }

  // Learning task reminder
  const earlyDeaths = playerGames.flatMap((g) => (g.player.deathTimestamps ?? []).filter((t) => t <= 5)).length;
  if (earlyDeaths > 8) {
    const id = "learning-early-deaths";
    notifications.push({
      id,
      type: "learning",
      title: _t("notif.learning.title"),
      description: _t("notif.learning.desc", { deaths: earlyDeaths }),
      timestamp: now - 60000 * 120,
      read: stored.includes(id),
      actionPath: "/learning",
    });
  }

  // Patch update notification
  const id = "patch-update";
  notifications.push({
    id,
    type: "patch",
    title: _t("notif.patch.title"),
    description: _t("notif.patch.desc"),
    timestamp: now - 60000 * 180,
    read: stored.includes(id),
  });

  return notifications.sort((a, b) => b.timestamp - a.timestamp);
}

function loadReadNotifications(): string[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveReadNotifications(ids: string[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

export async function getNotifications(t?: TFunction): Promise<AppNotification[]> {
  const matches = await getMatchHistory();
  return generateNotificationsFromData(matches, t);
}

export function markNotificationRead(id: string): void {
  const read = loadReadNotifications();
  if (!read.includes(id)) {
    read.push(id);
    saveReadNotifications(read);
  }
}

// ─── Personal Best Build ──────────────────────────────────────────────────────

export interface PersonalBuild {
  items: number[];   // non-zero item IDs from end-of-game inventory
  wins: number;
  games: number;
  winrate: number;
}

/**
 * Analyses the player's real match history to find the item build
 * with the highest winrate for a given champion.
 * Falls back gracefully when not enough data exists.
 */
export async function getPersonalBestBuild(championName: string): Promise<PersonalBuild | null> {
  try {
    const matches = await getMatchHistory();
    const champGames = matches.filter(m => {
      const p = m.participants[m.playerParticipantIndex];
      return p?.championName === championName;
    });

    if (champGames.length === 0) return null;

    // Sort items to get a stable key regardless of inventory slot order
    const buildMap = new Map<string, { wins: number; games: number; items: number[] }>();

    for (const match of champGames) {
      const player = match.participants[match.playerParticipantIndex];
      if (!player) continue;
      const items = [
        player.item0, player.item1, player.item2,
        player.item3, player.item4, player.item5,
      ].filter(id => id > 0).sort((a, b) => a - b);

      if (items.length === 0) continue;

      const key = items.join(",");
      if (!buildMap.has(key)) buildMap.set(key, { wins: 0, games: 0, items });
      const entry = buildMap.get(key)!;
      entry.games++;
      if (player.win) entry.wins++;
    }

    // Pick best build: highest WR, small bonus per game to prefer more data
    let best: { wins: number; games: number; items: number[] } | null = null;
    let bestScore = -1;
    for (const [, build] of buildMap) {
      const score = build.wins / build.games + build.games * 0.01;
      if (score > bestScore) { bestScore = score; best = build; }
    }

    if (!best) return null;
    return {
      items: best.items,
      wins: best.wins,
      games: best.games,
      winrate: Math.round((best.wins / best.games) * 100),
    };
  } catch {
    return null;
  }
}

export function markAllNotificationsRead(notifications: AppNotification[]): void {
  const ids = notifications.map((n) => n.id);
  saveReadNotifications(ids);
}

// ─── Champ Select Actions ─────────────────────────────────────────────────────
// ChampSelectAction interface is defined above near ChampSelectSession

export async function executeChampSelectAction(
  actionId: number,
  championName: string,
  lock: boolean = true,
  actionType: "pick" | "ban" = "pick"
): Promise<{ success: boolean; message: string }> {
  if (IS_TAURI) {
    try {
      const result = await tauriInvoke<{ success: boolean; message: string }>(
        "champ_select_action",
        { actionId, championName, lock, actionType }
      );
      return result;
    } catch (e) {
      return { success: false, message: String(e) };
    }
  }
  // Mock: simulate a successful action with a small delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: lock
          ? `Locked ${championName}`
          : `Hovering ${championName}`,
      });
    }, 200);
  });
}

export async function focusVelarisWindow(): Promise<void> {
  if (IS_TAURI) {
    try {
      await tauriInvoke("focus_main_window");
    } catch (e) {
      console.warn("[Velaris] focus_main_window failed:", e);
    }
  }
  // In web preview, no-op (window is already focused)
}