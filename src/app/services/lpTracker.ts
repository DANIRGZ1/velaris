/**
 * LP Tracker — Velaris
 *
 * Records LP snapshots over time so the user can see their progression
 * as a smooth graph across sessions, divisions, and tier promotions.
 *
 * Storage: localStorage ("velaris_lp_history"), max 500 entries.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LPSnapshot {
  timestamp: number;   // Date.now()
  rank: string;        // "EMERALD"
  division: string;    // "II"
  lp: number;          // 0-100
  totalLP: number;     // Normalized LP across all tiers (for graphing)
  wins: number;
  losses: number;
  gameResult?: "win" | "loss"; // Was this snapshot triggered by a game?
}

// ─── Tier normalization ───────────────────────────────────────────────────────

const TIER_BASE: Record<string, number> = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 2900,
  CHALLENGER: 3000,
};

const DIVISION_VALUE: Record<string, number> = {
  IV: 0, III: 100, II: 200, I: 300,
};

/** Converts rank + division + lp to a single comparable number */
export function computeTotalLP(rank: string, division: string, lp: number): number {
  const tierBase = TIER_BASE[rank?.toUpperCase()] ?? 0;
  // MASTER/GRANDMASTER/CHALLENGER have no divisions
  const isApex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(rank?.toUpperCase());
  const divBase = isApex ? 0 : (DIVISION_VALUE[division?.toUpperCase()] ?? 0);
  return tierBase + divBase + lp;
}

/** Formats totalLP back to a human-readable string */
export function formatTotalLP(totalLP: number): string {
  const tiers = Object.entries(TIER_BASE).sort((a, b) => b[1] - a[1]);
  for (const [tier, base] of tiers) {
    if (totalLP >= base) {
      const remainder = totalLP - base;
      if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) {
        return `${tier} ${remainder} LP`;
      }
      const divIndex = Math.floor(remainder / 100);
      const lp = remainder % 100;
      const div = ["IV", "III", "II", "I"][Math.min(divIndex, 3)];
      return `${tier} ${div} ${lp} LP`;
    }
  }
  return `${totalLP} LP`;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "velaris_lp_history";
const MAX_ENTRIES = 500;

export function getLPHistory(): LPSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LPSnapshot[];
  } catch {
    // JSON is corrupt — remove the broken entry so it doesn't keep failing
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    return [];
  }
}

function saveLPHistory(history: LPSnapshot[]): void {
  try {
    // Keep most recent MAX_ENTRIES
    const trimmed = history.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* storage full — ignore */ }
}

/**
 * Records a new LP snapshot if LP has changed from the last one.
 * Call this after getSummonerInfo() resolves.
 */
export function recordLPSnapshot(
  rank: string,
  division: string,
  lp: number,
  wins: number,
  losses: number,
  gameResult?: "win" | "loss",
): LPSnapshot | null {
  if (!rank || lp === undefined) return null;

  const totalLP = computeTotalLP(rank, division, lp);
  let history = getLPHistory();
  const last = history[history.length - 1];

  // Skip if nothing changed (avoid duplicate points on page refresh)
  if (last && last.totalLP === totalLP && last.wins === wins && last.losses === losses) {
    return null;
  }

  // Sanity check: if the jump from the last snapshot is impossibly large (>800 LP),
  // the history is corrupt (e.g., built from mock data). Discard it and start fresh.
  if (last && Math.abs(totalLP - last.totalLP) > 800) {
    history = [];
  }

  const snapshot: LPSnapshot = {
    timestamp: Date.now(),
    rank,
    division,
    lp,
    totalLP,
    wins,
    losses,
    gameResult,
  };

  saveLPHistory([...history, snapshot]);
  return snapshot;
}

export function clearLPHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Derived Stats ────────────────────────────────────────────────────────────

export interface LPStats {
  current: number;
  peak: number;
  peakFormatted: string;
  sessionGain: number;       // LP gained/lost in the last 24h
  last7DaysGain: number;
  last30DaysGain: number;
  trend: "up" | "down" | "flat";
}

export function computeLPStats(history: LPSnapshot[]): LPStats | null {
  if (history.length === 0) return null;

  const now = Date.now();
  const DAY = 86_400_000;

  const current = history[history.length - 1].totalLP;
  const peak = Math.max(...history.map(s => s.totalLP));

  const since24h = history.find(s => s.timestamp >= now - DAY);
  const since7d = history.find(s => s.timestamp >= now - 7 * DAY);
  const since30d = history.find(s => s.timestamp >= now - 30 * DAY);

  const sessionGain = since24h ? current - since24h.totalLP : 0;
  const last7DaysGain = since7d ? current - since7d.totalLP : 0;
  const last30DaysGain = since30d ? current - since30d.totalLP : 0;

  const trend = sessionGain > 10 ? "up" : sessionGain < -10 ? "down" : "flat";

  return {
    current,
    peak,
    peakFormatted: formatTotalLP(peak),
    sessionGain,
    last7DaysGain,
    last30DaysGain,
    trend,
  };
}

/** Returns history grouped into daily buckets for the chart */
export function getDailyLPSeries(
  history: LPSnapshot[],
  days: number = 30,
): { date: string; totalLP: number; label: string }[] {
  if (history.length === 0) return [];

  const now = Date.now();
  const cutoff = now - days * 86_400_000;
  const filtered = history.filter(s => s.timestamp >= cutoff);

  if (filtered.length === 0) return [];

  // Take the LAST snapshot of each day
  const byDay = new Map<string, LPSnapshot>();
  for (const snap of filtered) {
    const day = new Date(snap.timestamp).toLocaleDateString("en-CA"); // YYYY-MM-DD
    byDay.set(day, snap); // overwrite → last of day wins
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, snap]) => ({
      date,
      totalLP: snap.totalLP,
      label: formatTotalLP(snap.totalLP),
    }));
}
