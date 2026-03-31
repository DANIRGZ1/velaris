/**
 * Riot API Service — Velaris
 * 
 * Handles summoner lookups via Riot Games API.
 * 
 * IN TAURI: Calls go through Rust backend (invoke) to keep the API key safe.
 * IN WEB PREVIEW: Falls back to mock data that mirrors the real API shape.
 * 
 * Riot API endpoints used:
 * - Account-v1:  /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
 * - Summoner-v4: /lol/summoner/v4/summoners/by-puuid/{puuid}
 * - League-v4:   /lol/league/v4/entries/by-summoner/{summonerId}
 */

import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotSummoner {
  id: string;          // encrypted summoner ID
  accountId: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
  name?: string;
}

export interface RiotLeagueEntry {
  queueType: string;   // RANKED_SOLO_5x5, RANKED_FLEX_SR
  tier: string;        // IRON → CHALLENGER
  rank: string;        // I, II, III, IV
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface SummonerSearchResult {
  gameName: string;
  tagLine: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
  soloRank: string | null;    // e.g. "DIAMOND II"
  soloLP: number;
  soloWins: number;
  soloLosses: number;
  region: string;
}

// ─── Region Mapping ──────────────────────────────────────────────────────────

type Platform = "euw1" | "na1" | "kr" | "br1" | "la1" | "la2" | "oc1" | "tr1" | "ru" | "jp1" | "eun1" | "ph2" | "sg2" | "th2" | "tw2" | "vn2";
type Regional = "europe" | "americas" | "asia" | "sea";

const PLATFORM_TO_REGIONAL: Record<string, Regional> = {
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  na1: "americas", br1: "americas", la1: "americas", la2: "americas", oc1: "americas",
  kr: "asia", jp1: "asia",
  ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};

const REGION_DISPLAY: Record<string, string> = {
  euw1: "EUW", eun1: "EUNE", na1: "NA", kr: "KR", br1: "BR",
  la1: "LAN", la2: "LAS", oc1: "OCE", tr1: "TR", ru: "RU",
  jp1: "JP", ph2: "PH", sg2: "SG", th2: "TH", tw2: "TW", vn2: "VN",
};

// Maps display region name (from Settings) → platform ID used by Riot API
const DISPLAY_TO_PLATFORM: Record<string, string> = {
  EUW: "euw1", EUNE: "eun1", NA: "na1", KR: "kr", BR: "br1",
  LAN: "la1", LAS: "la2", OCE: "oc1", TR: "tr1", RU: "ru",
  JP: "jp1", PH: "ph2", SG: "sg2", TH: "th2", TW: "tw2", VN: "vn2",
};

/** Convert a display region name ("EUW", "NA", etc.) to a platform ID ("euw1", "na1", etc.) */
export function displayRegionToPlatform(displayRegion: string): string {
  return DISPLAY_TO_PLATFORM[displayRegion?.toUpperCase()] || "euw1";
}

// ─── API Calls (Tauri path) ──────────────────────────────────────────────────

async function lookupAccountTauri(gameName: string, tagLine: string, platform: string): Promise<RiotAccount> {
  const regional = PLATFORM_TO_REGIONAL[platform] || "europe";
  return tauriInvoke<RiotAccount>("riot_get_account_by_riot_id", {
    gameName,
    tagLine,
    regional,
  });
}

async function lookupSummonerTauri(puuid: string, platform: string): Promise<RiotSummoner> {
  return tauriInvoke<RiotSummoner>("riot_get_summoner_by_puuid", {
    puuid,
    platform,
  });
}

async function lookupLeagueTauri(summonerId: string, platform: string): Promise<RiotLeagueEntry[]> {
  return tauriInvoke<RiotLeagueEntry[]>("riot_get_league_entries", {
    summonerId,
    platform,
  });
}

// ─── Mock Data for Web Preview ───────────────────────────────────────────────

export const MOCK_PROFILES: SummonerSearchResult[] = [
  { gameName: "Faker", tagLine: "KR1", puuid: "fake-puuid-faker", profileIconId: 6, summonerLevel: 782, soloRank: "CHALLENGER I", soloLP: 1547, soloWins: 412, soloLosses: 298, region: "KR" },
  { gameName: "Caps", tagLine: "EUW", puuid: "fake-puuid-caps", profileIconId: 4644, summonerLevel: 543, soloRank: "CHALLENGER I", soloLP: 1203, soloWins: 356, soloLosses: 267, region: "EUW" },
  { gameName: "Gumayusi", tagLine: "KR1", puuid: "fake-puuid-guma", profileIconId: 5367, summonerLevel: 456, soloRank: "CHALLENGER I", soloLP: 1389, soloWins: 389, soloLosses: 301, region: "KR" },
  { gameName: "Zeus", tagLine: "KR1", puuid: "fake-puuid-zeus", profileIconId: 5102, summonerLevel: 398, soloRank: "GRANDMASTER I", soloLP: 987, soloWins: 334, soloLosses: 289, region: "KR" },
  { gameName: "Keria", tagLine: "KR1", puuid: "fake-puuid-keria", profileIconId: 5455, summonerLevel: 512, soloRank: "CHALLENGER I", soloLP: 1456, soloWins: 401, soloLosses: 278, region: "KR" },
  { gameName: "ShowMaker", tagLine: "KR1", puuid: "fake-puuid-showmaker", profileIconId: 4892, summonerLevel: 621, soloRank: "CHALLENGER I", soloLP: 1298, soloWins: 367, soloLosses: 254, region: "KR" },
  { gameName: "Chovy", tagLine: "KR1", puuid: "fake-puuid-chovy", profileIconId: 5011, summonerLevel: 589, soloRank: "CHALLENGER I", soloLP: 1567, soloWins: 423, soloLosses: 287, region: "KR" },
  { gameName: "Viper", tagLine: "KR1", puuid: "fake-puuid-viper", profileIconId: 4756, summonerLevel: 478, soloRank: "GRANDMASTER I", soloLP: 876, soloWins: 312, soloLosses: 278, region: "KR" },
  { gameName: "TheShy", tagLine: "KR1", puuid: "fake-puuid-theshy", profileIconId: 4501, summonerLevel: 634, soloRank: "CHALLENGER I", soloLP: 1102, soloWins: 345, soloLosses: 301, region: "KR" },
  { gameName: "Deft", tagLine: "KR1", puuid: "fake-puuid-deft", profileIconId: 4399, summonerLevel: 712, soloRank: "CHALLENGER I", soloLP: 1089, soloWins: 367, soloLosses: 312, region: "KR" },
  { gameName: "Jankos", tagLine: "EUW", puuid: "fake-puuid-jankos", profileIconId: 5234, summonerLevel: 567, soloRank: "GRANDMASTER I", soloLP: 823, soloWins: 289, soloLosses: 256, region: "EUW" },
  { gameName: "Rekkles", tagLine: "EUW", puuid: "fake-puuid-rekkles", profileIconId: 4711, summonerLevel: 645, soloRank: "MASTER I", soloLP: 456, soloWins: 267, soloLosses: 234, region: "EUW" },
  { gameName: "Doublelift", tagLine: "NA1", puuid: "fake-puuid-doublelift", profileIconId: 4201, summonerLevel: 723, soloRank: "GRANDMASTER I", soloLP: 712, soloWins: 312, soloLosses: 278, region: "NA" },
  { gameName: "Bjergsen", tagLine: "NA1", puuid: "fake-puuid-bjergsen", profileIconId: 4567, summonerLevel: 689, soloRank: "MASTER I", soloLP: 387, soloWins: 256, soloLosses: 223, region: "NA" },
  { gameName: "Canyon", tagLine: "KR1", puuid: "fake-puuid-canyon", profileIconId: 5189, summonerLevel: 534, soloRank: "CHALLENGER I", soloLP: 1345, soloWins: 378, soloLosses: 267, region: "KR" },
  { gameName: "Ruler", tagLine: "KR1", puuid: "fake-puuid-ruler", profileIconId: 4923, summonerLevel: 601, soloRank: "CHALLENGER I", soloLP: 1234, soloWins: 356, soloLosses: 289, region: "KR" },
  { gameName: "BeryL", tagLine: "KR1", puuid: "fake-puuid-beryl", profileIconId: 5067, summonerLevel: 498, soloRank: "GRANDMASTER I", soloLP: 901, soloWins: 323, soloLosses: 289, region: "KR" },
  { gameName: "Perkz", tagLine: "EUW", puuid: "fake-puuid-perkz", profileIconId: 4834, summonerLevel: 578, soloRank: "MASTER I", soloLP: 512, soloWins: 278, soloLosses: 245, region: "EUW" },
  { gameName: "CoreJJ", tagLine: "NA1", puuid: "fake-puuid-corejj", profileIconId: 5145, summonerLevel: 534, soloRank: "GRANDMASTER I", soloLP: 834, soloWins: 298, soloLosses: 267, region: "NA" },
  { gameName: "MaRin", tagLine: "KR1", puuid: "fake-puuid-marin", profileIconId: 4123, summonerLevel: 756, soloRank: "MASTER I", soloLP: 345, soloWins: 234, soloLosses: 212, region: "KR" },
];

// ─── Sync mock search (for inline use in components) ─────────────────────────

/** Deterministic seed from string for consistent mock data */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVS = ["IV", "III", "II", "I"];

function generateMockProfile(gameName: string, tagLine: string): SummonerSearchResult {
  const seed = hashCode(`${gameName}#${tagLine}`);
  const tierIdx = seed % TIERS.length;
  const tier = TIERS[tierIdx];
  const isApex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier);
  const div = isApex ? "I" : DIVS[seed % 4];
  const lp = isApex ? (seed % 800) + 100 : seed % 100;
  const totalGames = 80 + (seed % 400);
  const wr = 42 + (seed % 20);
  const wins = Math.round(totalGames * wr / 100);
  const losses = totalGames - wins;

  // Infer region from tag
  const tagUpper = tagLine.toUpperCase();
  const regionGuess = tagUpper.includes("KR") ? "KR"
    : tagUpper.includes("NA") ? "NA"
    : tagUpper.includes("EUW") ? "EUW"
    : tagUpper.includes("EUNE") ? "EUNE"
    : tagUpper.includes("BR") ? "BR"
    : tagUpper.includes("LAN") ? "LAN"
    : tagUpper.includes("LAS") ? "LAS"
    : tagUpper.includes("OCE") ? "OCE"
    : tagUpper.includes("JP") ? "JP"
    : tagUpper.includes("TR") ? "TR"
    : "EUW";

  return {
    gameName,
    tagLine,
    puuid: `mock-${hashCode(gameName + tagLine)}`,
    profileIconId: (seed % 5500) + 1,
    summonerLevel: 30 + (seed % 700),
    soloRank: `${tier} ${div}`,
    soloLP: lp,
    soloWins: wins,
    soloLosses: losses,
    region: regionGuess,
  };
}

export function searchSummonersMock(query: string): SummonerSearchResult[] {
  if (!query.trim() || query.trim().length < 2) return [];
  const q = query.toLowerCase().replace("#", "").trim();
  const out: SummonerSearchResult[] = [];

  // 1. Match against known pro profiles
  MOCK_PROFILES.forEach(p => {
    const name = p.gameName.toLowerCase();
    const full = `${p.gameName}${p.tagLine}`.toLowerCase();
    if (name.includes(q) || full.includes(q)) out.push(p);
  });

  // 2. If query has Name#TAG format, generate a dynamic mock profile
  if (query.includes("#")) {
    const [name, tag] = query.split("#");
    if (name && name.trim().length >= 1 && tag && tag.trim().length >= 1) {
      const trimName = name.trim();
      const trimTag = tag.trim();
      // Don't duplicate if already in pro list
      const alreadyExists = out.some(
        p => p.gameName.toLowerCase() === trimName.toLowerCase() &&
             p.tagLine.toLowerCase() === trimTag.toLowerCase()
      );
      if (!alreadyExists) {
        out.unshift(generateMockProfile(trimName, trimTag));
      }
    }
  }

  // 3. If no # in query but text is >= 3 chars, generate regional suggestions
  //    so "Carlos" shows mock profiles like Carlos#EUW, Carlos#NA, Carlos#KR
  if (!query.includes("#") && q.length >= 3 && out.length === 0) {
    const name = query.trim();
    const tags = ["EUW", "NA1", "KR"];
    tags.forEach(tag => {
      out.push(generateMockProfile(name, tag));
    });
  }

  return out.slice(0, 5);
}

// ─── Cache Helper ────────────────────────────────────────────────────────────

/** After a successful lookup, cache the profile in the Rust backend for future fuzzy search */
async function cacheProfileInBackend(profile: SummonerSearchResult): Promise<void> {
  if (!IS_TAURI) return;
  try {
    await tauriInvoke("cache_summoner_profile", {
      profile: {
        gameName: profile.gameName,
        tagLine: profile.tagLine,
        puuid: profile.puuid,
        profileIconId: profile.profileIconId,
        summonerLevel: profile.summonerLevel,
        soloRank: profile.soloRank,
        soloLp: profile.soloLP,
        soloWins: profile.soloWins,
        soloLosses: profile.soloLosses,
        region: profile.region,
        cachedAt: Date.now(),
      },
    });
  } catch {
    // Cache failure is non-critical
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Search summoners by partial name. Uses Riot API in Tauri, mock data in web.
 * 
 * Note: Riot API does NOT have a "search by partial name" endpoint.
 * The real flow is: user types "Faker#KR1" → we call account-v1 with exact gameName+tagLine.
 * For partial/fuzzy search, Tauri backend can maintain a local cache of recently searched profiles.
 * 
 * In web preview, we filter the mock list.
 */
export async function searchSummoners(
  query: string,
  platform: string = "euw1"
): Promise<SummonerSearchResult[]> {
  if (!query.trim()) return [];

  // Check if query contains a tag (e.g., "Faker#KR1")
  const hasTag = query.includes("#");
  
  if (IS_TAURI && hasTag) {
    try {
      const [gameName, tagLine] = query.split("#");
      if (gameName && tagLine) {
        const result = await lookupFullProfile(gameName.trim(), tagLine.trim(), platform);
        if (result) return [result];
      }
    } catch {
      // Fall through
    }
    // In Tauri with a tag: only return real results — no fake fallback
    return [];
  }

  if (IS_TAURI && !hasTag) {
    // In Tauri: try the backend's cached search first
    try {
      const results = await tauriInvoke<SummonerSearchResult[]>("search_summoners_cached", {
        query: query.trim(),
      });
      if (Array.isArray(results) && results.length > 0) return results;
    } catch {
      // Backend doesn't have this command or cache is empty
    }
    // In Tauri without a tag: no results until user types full Riot ID
    return [];
  }

  // Web preview only: use mock data
  return searchSummonersMock(query);
}

/**
 * Full profile lookup by exact Riot ID (gameName#tagLine).
 * Chains: Account → Summoner → League entries.
 */
export async function lookupFullProfile(
  gameName: string,
  tagLine: string,
  platform: string = "euw1"
): Promise<SummonerSearchResult | null> {
  if (!IS_TAURI) {
    // Mock: try to find in our pro list first
    const match = MOCK_PROFILES.find(
      p => p.gameName.toLowerCase() === gameName.toLowerCase() &&
           p.tagLine.toLowerCase() === tagLine.toLowerCase()
    );
    if (match) return match;
    
    // Generate a deterministic mock result for any Riot ID
    return generateMockProfile(gameName, tagLine);
  }

  try {
    // Step 1: Get PUUID from Riot ID
    const account = await lookupAccountTauri(gameName, tagLine, platform);
    
    // Step 2: Get summoner data
    const summoner = await lookupSummonerTauri(account.puuid, platform);
    
    // Step 3: Get ranked entries
    let soloRank: string | null = null;
    let soloLP = 0;
    let soloWins = 0;
    let soloLosses = 0;
    
    try {
      const entries = await lookupLeagueTauri(summoner.id, platform);
      const soloQ = entries.find(e => e.queueType === "RANKED_SOLO_5x5");
      if (soloQ) {
        soloRank = `${soloQ.tier} ${soloQ.rank}`;
        soloLP = soloQ.leaguePoints;
        soloWins = soloQ.wins;
        soloLosses = soloQ.losses;
      }
    } catch {
      // Ranked data unavailable
    }

    const result: SummonerSearchResult = {
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
      profileIconId: summoner.profileIconId,
      summonerLevel: summoner.summonerLevel,
      soloRank,
      soloLP,
      soloWins,
      soloLosses,
      region: REGION_DISPLAY[platform] || platform.toUpperCase(),
    };

    // Cache in backend for future fuzzy searches
    cacheProfileInBackend(result);

    return result;
  } catch (e) {
    console.warn("[Velaris] Riot API lookup failed:", e);
    // In Tauri: API key missing or invalid — return null so UI can show a proper error
    return null;
  }
}

/**
 * Returns the rank display color class.
 */
export function getRankColor(rank: string | null): string {
  if (!rank) return "text-muted-foreground";
  const tier = rank.split(" ")[0]?.toUpperCase();
  switch (tier) {
    case "IRON": return "text-stone-400";
    case "BRONZE": return "text-amber-700";
    case "SILVER": return "text-slate-400";
    case "GOLD": return "text-yellow-500";
    case "PLATINUM": return "text-cyan-400";
    case "EMERALD": return "text-emerald-400";
    case "DIAMOND": return "text-blue-400";
    case "MASTER": return "text-purple-400";
    case "GRANDMASTER": return "text-red-400";
    case "CHALLENGER": return "text-amber-400";
    default: return "text-muted-foreground";
  }
}

/**
 * Compact rank display (e.g., "CHALLENGER I" → "Challenger")
 */
export function formatRank(rank: string | null): string {
  if (!rank) return "Unranked";
  const parts = rank.split(" ");
  const tier = parts[0];
  const div = parts[1] || "";
  const formatted = tier.charAt(0) + tier.slice(1).toLowerCase();
  // Don't show division for Master+
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier.toUpperCase())) {
    return formatted;
  }
  return `${formatted} ${div}`;
}