/**
 * Extended Analytics — Velaris
 *
 * Supplementary stats that go beyond the core Dashboard/Profile analytics:
 * nemesis champion, hourly/daily performance curves, objective correlation,
 * KDA sweet-spot, and role distribution insights.
 *
 * All functions are pure (no side-effects) and work directly from MatchData[].
 */

import type { MatchData } from "../utils/analytics";

// ─── Nemesis champion ─────────────────────────────────────────────────────────

export interface NemesisEntry {
  champion: string;
  encounters: number;
  playerWins: number;
  playerLosses: number;
  winRate: number;   // % of games the player WON when facing this champ
}

/**
 * Returns top enemy champions the player struggles against most.
 * "Struggle" = lowest personal win rate, minimum 3 encounters.
 */
export function computeNemesisList(matches: MatchData[], topN = 5): NemesisEntry[] {
  const map: Record<string, { wins: number; losses: number }> = {};

  for (const m of matches) {
    const player = m.participants[m.playerParticipantIndex];
    if (!player) continue;
    const enemies = m.participants.filter((p, i) => i !== m.playerParticipantIndex && p.win !== player.win);
    for (const e of enemies) {
      const c = e.championName;
      if (!map[c]) map[c] = { wins: 0, losses: 0 };
      if (player.win) map[c].wins++; else map[c].losses++;
    }
  }

  return Object.entries(map)
    .filter(([, v]) => v.wins + v.losses >= 3)
    .map(([champion, v]) => ({
      champion,
      encounters: v.wins + v.losses,
      playerWins: v.wins,
      playerLosses: v.losses,
      winRate: Math.round((v.wins / (v.wins + v.losses)) * 100),
    }))
    .sort((a, b) => a.winRate - b.winRate || b.encounters - a.encounters)
    .slice(0, topN);
}

// ─── Hourly performance ───────────────────────────────────────────────────────

export interface HourBucket {
  hour: number;          // 0–23
  label: string;         // "8 AM"
  winRate: number;       // 0–100
  games: number;
}

export function computeHourlyPerformance(matches: MatchData[]): HourBucket[] {
  const byHour: Record<number, { wins: number; total: number }> = {};

  for (const m of matches) {
    const player = m.participants[m.playerParticipantIndex];
    if (!player) continue;
    const hour = new Date(m.gameCreation).getHours();
    if (!byHour[hour]) byHour[hour] = { wins: 0, total: 0 };
    byHour[hour].total++;
    if (player.win) byHour[hour].wins++;
  }

  return Array.from({ length: 24 }, (_, hour) => {
    const d = byHour[hour];
    const games = d?.total ?? 0;
    const ampm = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
    return {
      hour,
      label: ampm,
      winRate: games > 0 ? Math.round((d.wins / d.total) * 100) : 0,
      games,
    };
  }).filter(b => b.games > 0);
}

// ─── Day-of-week performance ──────────────────────────────────────────────────

export interface DayBucket {
  day: number;    // 0=Sun … 6=Sat
  label: string;
  shortLabel: string;
  winRate: number;
  games: number;
}

const DAY_LABELS   = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT    = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeDayOfWeekPerformance(matches: MatchData[]): DayBucket[] {
  const byDay: Record<number, { wins: number; total: number }> = {};

  for (const m of matches) {
    const player = m.participants[m.playerParticipantIndex];
    if (!player) continue;
    const day = new Date(m.gameCreation).getDay();
    if (!byDay[day]) byDay[day] = { wins: 0, total: 0 };
    byDay[day].total++;
    if (player.win) byDay[day].wins++;
  }

  // Start week on Monday (index 1 → 0, wrapping Sun to end)
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map(day => {
    const d = byDay[day];
    const games = d?.total ?? 0;
    return {
      day,
      label: DAY_LABELS[day],
      shortLabel: DAY_SHORT[day],
      winRate: games > 0 ? Math.round((d.wins / d.total) * 100) : 0,
      games,
    };
  });
}

// ─── Objective correlation ────────────────────────────────────────────────────

export interface ObjectiveCorr {
  key: string;         // i18n key base, e.g. "obj.firstblood"
  label: string;       // raw label fallback
  withWinRate: number; // WR when player achieved this
  withGames: number;
  withoutWinRate: number;
  withoutGames: number;
  lift: number;        // withWinRate - withoutWinRate
}

type ObjCheck = (player: MatchData["participants"][number]) => boolean;

const OBJECTIVES: { key: string; label: string; check: ObjCheck }[] = [
  {
    key: "obj.firstblood",
    label: "First Blood",
    check: p => p.firstBloodKill || p.firstBloodAssist,
  },
  {
    key: "obj.dragon",
    label: "Dragon",
    check: p => (p.dragonKills ?? 0) > 0,
  },
  {
    key: "obj.turret",
    label: "Turret",
    check: p => (p.turretKills ?? 0) > 0,
  },
  {
    key: "obj.lowdeaths",
    label: "≤2 Deaths",
    check: p => p.deaths <= 2,
  },
];

export function computeObjectiveCorrelation(matches: MatchData[]): ObjectiveCorr[] {
  return OBJECTIVES.map(({ key, label, check }) => {
    let withW = 0, withL = 0, withoutW = 0, withoutL = 0;
    for (const m of matches) {
      const p = m.participants[m.playerParticipantIndex];
      if (!p) continue;
      if (check(p)) { if (p.win) withW++; else withL++; }
      else          { if (p.win) withoutW++; else withoutL++; }
    }
    const withGames = withW + withL;
    const withoutGames = withoutW + withoutL;
    const withWinRate    = withGames    > 0 ? Math.round((withW    / withGames)    * 100) : 0;
    const withoutWinRate = withoutGames > 0 ? Math.round((withoutW / withoutGames) * 100) : 0;
    return { key, label, withWinRate, withGames, withoutWinRate, withoutGames, lift: withWinRate - withoutWinRate };
  }).filter(o => o.withGames >= 3);
}

// ─── KDA win-rate sweet spot ──────────────────────────────────────────────────

export interface KDABucket {
  label: string;       // "0–1", "1–2", etc.
  min: number;
  max: number;         // Infinity for last bucket
  winRate: number;
  games: number;
}

const KDA_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "0–1",  min: 0,   max: 1   },
  { label: "1–2",  min: 1,   max: 2   },
  { label: "2–3",  min: 2,   max: 3   },
  { label: "3–5",  min: 3,   max: 5   },
  { label: "5+",   min: 5,   max: Infinity },
];

export function computeKDABuckets(matches: MatchData[]): KDABucket[] {
  const counts: { wins: number; total: number }[] = KDA_BUCKETS.map(() => ({ wins: 0, total: 0 }));

  for (const m of matches) {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) continue;
    const kda = p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists;
    const idx = KDA_BUCKETS.findIndex(b => kda >= b.min && kda < b.max);
    if (idx === -1) continue;
    counts[idx].total++;
    if (p.win) counts[idx].wins++;
  }

  return KDA_BUCKETS.map((b, i) => ({
    ...b,
    winRate: counts[i].total > 0 ? Math.round((counts[i].wins / counts[i].total) * 100) : 0,
    games: counts[i].total,
  })).filter(b => b.games > 0);
}

// ─── Role stats ───────────────────────────────────────────────────────────────

export interface RoleStatEntry {
  role: string;          // "TOP" | "JGL" | "MID" | "ADC" | "SUP"
  games: number;
  winRate: number;
  avgKDA: number;
  avgCsMin: number;
  avgVision: number;
  pct: number;           // % of total games on this role
}

const ROLE_DISPLAY: Record<string, string> = {
  TOP: "TOP", JUNGLE: "JGL", MIDDLE: "MID", BOTTOM: "ADC", UTILITY: "SUP",
};

export function computeRoleStats(matches: MatchData[]): RoleStatEntry[] {
  const map: Record<string, { wins: number; total: number; kda: number; csMin: number; vision: number }> = {};

  for (const m of matches) {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) continue;
    const role = ROLE_DISPLAY[p.teamPosition] ?? p.teamPosition;
    if (!map[role]) map[role] = { wins: 0, total: 0, kda: 0, csMin: 0, vision: 0 };
    const kda = p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists;
    const dur = m.gameDuration / 60;
    map[role].total++;
    map[role].wins     += p.win ? 1 : 0;
    map[role].kda      += kda;
    map[role].csMin    += (p.totalMinionsKilled + p.neutralMinionsKilled) / Math.max(1, dur);
    map[role].vision   += p.visionScore / Math.max(1, dur);
  }

  const total = matches.length || 1;
  return Object.entries(map)
    .map(([role, v]) => ({
      role,
      games: v.total,
      winRate: Math.round((v.wins / v.total) * 100),
      avgKDA: parseFloat((v.kda / v.total).toFixed(2)),
      avgCsMin: parseFloat((v.csMin / v.total).toFixed(1)),
      avgVision: parseFloat((v.vision / v.total).toFixed(1)),
      pct: Math.round((v.total / total) * 100),
    }))
    .sort((a, b) => b.games - a.games);
}

// ─── 10-game trend comparison ─────────────────────────────────────────────────

export interface TrendData {
  kda:  { recent: number; previous: number; delta: number };
  wr:   { recent: number; previous: number; delta: number };
  csm:  { recent: number; previous: number; delta: number };
}

/**
 * Compares the last 10 games against the previous 10 games.
 * Returns null when there are fewer than 10 games total.
 */
export function computeTrends(matches: MatchData[]): TrendData | null {
  if (!matches || matches.length < 10) return null;
  const recent   = matches.slice(0, 10);
  const previous = matches.slice(10, 20);
  if (previous.length < 5) return null;

  function avgKDA(ms: MatchData[]): number {
    const sum = ms.reduce((acc, m) => {
      const p = m.participants[m.playerParticipantIndex];
      if (!p) return acc;
      return acc + (p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists);
    }, 0);
    return sum / ms.length;
  }

  function avgWR(ms: MatchData[]): number {
    const wins = ms.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
    return (wins / ms.length) * 100;
  }

  function avgCSM(ms: MatchData[]): number {
    const sum = ms.reduce((acc, m) => {
      const p = m.participants[m.playerParticipantIndex];
      if (!p) return acc;
      const dur = m.gameDuration / 60;
      return acc + (p.totalMinionsKilled + p.neutralMinionsKilled) / Math.max(1, dur);
    }, 0);
    return sum / ms.length;
  }

  const kdaR = avgKDA(recent),  kdaP = avgKDA(previous);
  const wrR  = avgWR(recent),   wrP  = avgWR(previous);
  const csmR = avgCSM(recent),  csmP = avgCSM(previous);

  return {
    kda: { recent: kdaR, previous: kdaP, delta: kdaR - kdaP },
    wr:  { recent: wrR,  previous: wrP,  delta: wrR  - wrP  },
    csm: { recent: csmR, previous: csmP, delta: csmR - csmP },
  };
}

// ─── Best-week LP detection ───────────────────────────────────────────────────

const BEST_WEEK_KEY = "velaris-best-week-lp";

export function getBestWeekLP(): number {
  try { return parseInt(localStorage.getItem(BEST_WEEK_KEY) ?? "0", 10) || 0; }
  catch { return 0; }
}

export function updateBestWeekLP(gained: number): boolean {
  const best = getBestWeekLP();
  if (gained > best && gained > 0) {
    try { localStorage.setItem(BEST_WEEK_KEY, String(gained)); } catch {}
    return true;
  }
  return false;
}

// ─── Rank-up detection ────────────────────────────────────────────────────────

const LAST_RANK_KEY = "velaris-last-known-rank";

export interface RankUpEvent {
  from: string;  // e.g. "GOLD I"
  to: string;    // e.g. "PLATINUM IV"
}

export function checkRankUp(rank: string, division: string): RankUpEvent | null {
  const current = `${rank} ${division}`.trim();
  try {
    const last = localStorage.getItem(LAST_RANK_KEY);
    localStorage.setItem(LAST_RANK_KEY, current);
    if (!last || last === current) return null;
    // Only fire if the new rank is genuinely higher
    const TIER_ORDER = ["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND","MASTER","GRANDMASTER","CHALLENGER"];
    const DIV_ORDER  = ["IV","III","II","I"];
    const [lastTier, lastDiv = "I"]    = last.split(" ");
    const [curTier,  curDiv  = "I"]    = current.split(" ");
    const tierUp = TIER_ORDER.indexOf(curTier)  > TIER_ORDER.indexOf(lastTier);
    const divUp  = curTier === lastTier && DIV_ORDER.indexOf(curDiv) > DIV_ORDER.indexOf(lastDiv);
    if (tierUp || divUp) return { from: last, to: current };
    return null;
  } catch { return null; }
}
