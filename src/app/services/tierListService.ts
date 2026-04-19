// ─── Tier List Service ────────────────────────────────────────────────────────
// Data source: Meraki Analytics community dragon champion rates.
// URL: https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json
// Cached in localStorage for 4 hours per patch.

const MERAKI_URL =
  "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json";
const CACHE_KEY = "velaris-tierlist-v2";
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export type TierRole = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";
export type Tier = "S+" | "S" | "A" | "B" | "C" | "D";

export interface ChampionTierEntry {
  name: string;
  tier: Tier;
  winRate: number;   // percentage, e.g. 52.4
  playRate: number;  // percentage
  banRate: number;   // percentage
}

export interface TierListData {
  patch: string;
  fetchedAt: number;
  byRole: Record<TierRole, ChampionTierEntry[]>;
}

// ─── Tier thresholds ─────────────────────────────────────────────────────────

function assignTier(winRate: number, playRate: number): Tier {
  if (winRate >= 53.0 && playRate >= 2.0) return "S+";
  if (winRate >= 51.5) return "S";
  if (winRate >= 50.5) return "A";
  if (winRate >= 49.0) return "B";
  if (winRate >= 47.5) return "C";
  return "D";
}

const TIER_ORDER: Record<Tier, number> = { "S+": 0, S: 1, A: 2, B: 3, C: 4, D: 5 };

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function fetchTierList(forceRefresh = false): Promise<TierListData> {
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: TierListData = JSON.parse(raw);
        if (Date.now() - cached.fetchedAt < CACHE_TTL) return cached;
      }
    } catch { /* corrupt cache — fall through */ }
  }

  const res = await fetch(MERAKI_URL);
  if (!res.ok) throw new Error(`Meraki fetch failed: HTTP ${res.status}`);
  const json = await res.json();

  const ROLES: TierRole[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
  const byRole: Record<TierRole, ChampionTierEntry[]> = {
    TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], UTILITY: [],
  };

  for (const [champName, roleData] of Object.entries(json.data as Record<string, Record<string, { winRate: number; playRate: number; banRate?: number }>>)) {
    for (const role of ROLES) {
      const rd = roleData[role];
      if (!rd || rd.playRate < 0.3) continue; // ignore extremely low play rates
      byRole[role].push({
        name: champName,
        tier: assignTier(rd.winRate, rd.playRate),
        winRate: Math.round(rd.winRate * 10) / 10,
        playRate: Math.round(rd.playRate * 10) / 10,
        banRate: Math.round((rd.banRate ?? 0) * 10) / 10,
      });
    }
  }

  for (const role of ROLES) {
    byRole[role].sort(
      (a, b) => (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || (b.winRate - a.winRate),
    );
  }

  const data: TierListData = {
    patch: (json.patch as string) || "current",
    fetchedAt: Date.now(),
    byRole,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch { /* storage full */ }

  return data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function tierColor(tier: Tier): string {
  if (tier === "S+") return "text-amber-400 border-amber-400/40 bg-amber-400/10";
  if (tier === "S")  return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  if (tier === "A")  return "text-emerald-400 border-emerald-400/40 bg-emerald-400/10";
  if (tier === "B")  return "text-sky-400 border-sky-400/40 bg-sky-400/10";
  if (tier === "C")  return "text-muted-foreground border-border bg-muted/30";
  return "text-destructive/60 border-destructive/20 bg-destructive/5";
}

export const ROLE_LABELS: Record<TierRole, string> = {
  TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support",
};
