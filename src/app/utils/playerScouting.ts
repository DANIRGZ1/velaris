/**
 * Player Scouting System - Velaris
 * 
 * Provides objective scouting data for teammates during Champ Select.
 * Shows factual metrics (winrate, champion pool, recent form) without
 * assigning judgmental labels. The player interprets the data.
 * 
 * In production (Tauri), this data comes from the LCU API + Match History.
 * 
 * Design philosophy:
 * - Show DATA, not judgment ("72% winrate in 60 games" not "Smurf Detected")
 * - Tags are descriptive, never accusatory
 * - Colors are informational, not alarming
 * - Compliant with Riot Developer Policy: no harassment/profiling enablement
 */

import { RANK_BENCHMARKS } from "./analytics";
import type { TFunction } from "../contexts/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerProfile {
  summonerName: string;
  accountLevel: number;
  rank: string;           // e.g. "EMERALD"
  division: string;       // e.g. "III"
  lp: number;
  // Season stats
  wins: number;
  losses: number;
  // Recent 20 games
  recentWins: number;
  recentLosses: number;
  recentAvgKda: number;
  recentAvgCsPerMin: number;
  recentAvgVisionPerMin: number;
  recentAvgDeaths: number;
  // Champion pool
  champions: ChampionMastery[];
  // Current game
  currentChampion: string;
  currentRole: "TOP" | "JGL" | "MID" | "ADC" | "SUP";
  // Streak
  currentStreak: number; // positive = wins, negative = losses
}

export interface ChampionMastery {
  name: string;
  games: number;
  winrate: number;
  avgKda: number;
}

export type PlayerTag =
  | "High Performer"
  | "Specialist"
  | "Hot Streak"
  | "Cold Streak"
  | "Off-Role"
  | "Steady"
  | "High Impact"
  | "Team-Oriented"
  | "New Account"
  | "Insufficient Data";

export interface ScoutingResult {
  tag: PlayerTag;
  confidence: number;       // 0-100
  color: string;            // tailwind color class
  bgColor: string;          // tailwind bg class
  summary: string;          // factual description of what the data shows
  strategic_note: string;   // tactical implication, not personal judgment
  signals: ScoutingSignal[]; // all the data points
}

export interface ScoutingSignal {
  metric: string;
  value: string;
  benchmark: string;
  trend: "above" | "below" | "average";
  weight: number; // 0-1, relevance of this signal
}

// ─── Backwards compatibility aliases ──────────────────────────────────────────
// These keep existing imports working during migration

export type PlayerTitle = PlayerTag;
export type TitleResult = ScoutingResult & {
  title: PlayerTag;
  reason: string;
  gameplay_impact: string;
};
export type TitleSignal = ScoutingSignal & {
  expected: string;
  deviation: "high" | "low" | "normal";
};

// ─── Scouting Algorithm ───────────────────────────────────────────────────────

export function scoutPlayer(profile: PlayerProfile, t?: TFunction): ScoutingResult {
  const _t: TFunction = t || ((key) => key);
  const signals: ScoutingSignal[] = [];
  const scores: Record<PlayerTag, number> = {
    "High Performer": 0,
    "Specialist": 0,
    "Hot Streak": 0,
    "Cold Streak": 0,
    "Off-Role": 0,
    "Steady": 0,
    "High Impact": 0,
    "Team-Oriented": 0,
    "New Account": 0,
    "Insufficient Data": 0,
  };

  const benchmark = RANK_BENCHMARKS[profile.rank] || RANK_BENCHMARKS["EMERALD"];
  const totalGames = profile.wins + profile.losses;
  const overallWinrate = totalGames > 0 ? (profile.wins / totalGames) * 100 : 50;
  const recentGames = profile.recentWins + profile.recentLosses;
  const recentWinrate = recentGames > 0 ? (profile.recentWins / recentGames) * 100 : 50;

  // ── Signal 1: Account Level vs Performance ──
  if (profile.accountLevel < 50 && profile.recentAvgKda > benchmark.avgKda * 1.3) {
    const weight = 0.9;
    signals.push({
      metric: _t("scout.signal.levelKda"),
      value: _t("scout.signal.levelKdaVal", { lvl: profile.accountLevel, kda: profile.recentAvgKda.toFixed(1) }),
      benchmark: _t("scout.signal.levelKdaBench", { rank: profile.rank, kda: benchmark.avgKda.toFixed(1) }),
      trend: "above",
      weight,
    });
    scores["High Performer"] += 35 * weight;
    scores["New Account"] += 15 * weight;
  } else if (profile.accountLevel < 40) {
    signals.push({
      metric: _t("scout.signal.level"),
      value: `${profile.accountLevel}`,
      benchmark: "100+",
      trend: "below",
      weight: 0.3,
    });
    scores["New Account"] += 25;
  }

  // ── Signal 2: Winrate Analysis ──
  if (overallWinrate > 65 && totalGames > 30) {
    const weight = 0.85;
    signals.push({
      metric: _t("scout.signal.seasonWr"),
      value: _t("scout.signal.seasonWrVal", { wr: overallWinrate.toFixed(0), games: totalGames }),
      benchmark: "48-52%",
      trend: "above",
      weight,
    });
    scores["High Performer"] += 30 * weight;
  } else if (overallWinrate > 58 && totalGames > 20) {
    scores["High Impact"] += 15;
    scores["Hot Streak"] += 10;
  }

  // Recent winrate spike
  if (recentWinrate > overallWinrate + 15 && recentGames >= 15) {
    signals.push({
      metric: _t("scout.signal.recentVsSeason"),
      value: _t("scout.signal.recentVsSeasonVal", { recent: recentWinrate.toFixed(0), season: overallWinrate.toFixed(0) }),
      benchmark: _t("scout.signal.recentVsSeasonBench"),
      trend: "above",
      weight: 0.6,
    });
    scores["Hot Streak"] += 25;
  }

  // ── Signal 3: KDA vs Rank Benchmark ──
  const kdaRatio = profile.recentAvgKda / benchmark.avgKda;
  if (kdaRatio > 1.5) {
    signals.push({
      metric: _t("scout.signal.kdaVsRank"),
      value: _t("scout.signal.kdaVsRankVal", { kda: profile.recentAvgKda.toFixed(1), pct: Math.round((kdaRatio - 1) * 100) }),
      benchmark: benchmark.avgKda.toFixed(1),
      trend: "above",
      weight: 0.75,
    });
    scores["High Performer"] += 20;
    scores["High Impact"] += 15;
  } else if (kdaRatio > 1.2) {
    scores["High Impact"] += 10;
  } else if (kdaRatio < 0.7) {
    scores["Cold Streak"] += 10;
    scores["Off-Role"] += 10;
  }

  // ── Signal 4: CS/min vs Rank Benchmark ──
  const csRatio = profile.recentAvgCsPerMin / benchmark.avgCsPerMin;
  if (csRatio > 1.3 && profile.currentRole !== "SUP") {
    signals.push({
      metric: _t("scout.signal.csVsRank"),
      value: _t("scout.signal.csVsRankVal", { cs: profile.recentAvgCsPerMin.toFixed(1), pct: Math.round((csRatio - 1) * 100) }),
      benchmark: benchmark.avgCsPerMin.toFixed(1),
      trend: "above",
      weight: 0.7,
    });
    scores["High Performer"] += 15;
  }

  // ── Signal 5: Champion Pool Analysis ──
  const topChamp = profile.champions[0];
  const totalChampGames = profile.champions.reduce((s, c) => s + c.games, 0);

  if (topChamp && totalChampGames > 0) {
    const topChampShare = topChamp.games / totalChampGames;

    if (topChampShare > 0.6 && topChamp.games > 30) {
      signals.push({
        metric: _t("scout.signal.champPool"),
        value: _t("scout.signal.champPoolVal", { champ: topChamp.name, games: topChamp.games, pct: Math.round(topChampShare * 100) }),
        benchmark: _t("scout.signal.champPoolBench"),
        trend: "above",
        weight: 0.8,
      });
      scores["Specialist"] += 40;

      if (topChamp.name === profile.currentChampion) {
        scores["Specialist"] += 20;
        scores["High Impact"] += 10;
      }
    }

    // Playing an unfamiliar champion
    const currentChampData = profile.champions.find(c => c.name === profile.currentChampion);
    if (!currentChampData || currentChampData.games < 5) {
      signals.push({
        metric: _t("scout.signal.champExp"),
        value: _t("scout.signal.champExpVal", { games: currentChampData?.games || 0, champ: profile.currentChampion }),
        benchmark: _t("scout.signal.champExpBench"),
        trend: "below",
        weight: 0.5,
      });
      scores["Off-Role"] += 20;
    }
  }

  // ── Signal 6: Streak Analysis ──
  if (profile.currentStreak >= 4) {
    signals.push({
      metric: _t("scout.signal.streak"),
      value: _t("scout.signal.streakWinVal", { count: profile.currentStreak }),
      benchmark: _t("scout.signal.streakBench"),
      trend: "above",
      weight: 0.5,
    });
    scores["Hot Streak"] += 30;
  } else if (profile.currentStreak <= -4) {
    signals.push({
      metric: _t("scout.signal.streak"),
      value: _t("scout.signal.streakLossVal", { count: Math.abs(profile.currentStreak) }),
      benchmark: _t("scout.signal.streakBench"),
      trend: "below",
      weight: 0.6,
    });
    scores["Cold Streak"] += 35;
  }

  // ── Signal 7: Vision (team-oriented indicator) ──
  if (profile.recentAvgVisionPerMin > benchmark.avgVisionPerMin * 1.3) {
    scores["Team-Oriented"] += 20;
  }

  // ── Signal 8: Consistency (low variance = steady) ──
  const winrateDeviation = Math.abs(recentWinrate - overallWinrate);
  if (winrateDeviation < 8 && totalGames > 50 && overallWinrate >= 48 && overallWinrate <= 54) {
    scores["Steady"] += 30;
  }

  // ── Signal 9: Multiple strong signals ──
  const strongSignals = signals.filter(s => s.trend === "above" && s.weight >= 0.7);
  if (strongSignals.length >= 3) {
    scores["High Performer"] += 20;
  }

  // ── Determine winner ──
  const sortedTags = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedTags.length === 0) {
    return {
      tag: "Insufficient Data",
      confidence: 0,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      summary: _t("scout.insufficientData.summary"),
      strategic_note: _t("scout.insufficientData.note"),
      signals,
    };
  }

  const [winnerTag, winnerScore] = sortedTags[0] as [PlayerTag, number];
  const maxPossible = 100;
  const confidence = Math.min(95, Math.round((winnerScore / maxPossible) * 100));

  return {
    tag: winnerTag,
    confidence,
    ...getTagMeta(winnerTag, profile, _t),
    signals,
  };
}

// Backwards compatibility wrapper
export function detectPlayerTitle(profile: PlayerProfile, t?: TFunction): TitleResult {
  const result = scoutPlayer(profile, t);
  return {
    ...result,
    title: result.tag,
    reason: result.summary,
    gameplay_impact: result.strategic_note,
    signals: result.signals.map(s => ({
      ...s,
      expected: s.benchmark,
      deviation: s.trend === "above" ? "high" as const : s.trend === "below" ? "low" as const : "normal" as const,
    })),
  };
}

// ─── Tag Metadata ─────────────────────────────────────────────────────────────

function getTagMeta(tag: PlayerTag, profile: PlayerProfile, t?: TFunction): {
  color: string;
  bgColor: string;
  summary: string;
  strategic_note: string;
} {
  const _t: TFunction = t || ((key) => key);
  const rank = `${profile.rank} ${profile.division}`;
  const totalGames = profile.wins + profile.losses;
  const winrate = totalGames > 0 ? ((profile.wins / totalGames) * 100).toFixed(0) : "50";

  switch (tag) {
    case "High Performer":
      return {
        color: "text-violet-400",
        bgColor: "bg-violet-500/10",
        summary: _t("scout.highPerformer.summary", { rank, wr: winrate, games: totalGames, kda: profile.recentAvgKda.toFixed(1), cs: profile.recentAvgCsPerMin.toFixed(1), lvl: profile.accountLevel }),
        strategic_note: _t("scout.highPerformer.note"),
      };
    case "Specialist":
      return {
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        summary: _t("scout.specialist.summary", { champ: profile.champions[0]?.name || "Main", games: profile.champions[0]?.games || 0, wr: profile.champions[0]?.winrate || 0, pct: Math.round((profile.champions[0]?.games || 0) / Math.max(1, profile.champions.reduce((s, c) => s + c.games, 0)) * 100) }),
        strategic_note: _t("scout.specialist.note"),
      };
    case "Hot Streak": {
      const recentGames = profile.recentWins + profile.recentLosses;
      const recentWR = recentGames > 0 ? ((profile.recentWins / recentGames) * 100).toFixed(0) : "50";
      return {
        color: "text-green-400",
        bgColor: "bg-green-500/10",
        summary: profile.currentStreak > 0
          ? _t("scout.hotStreak.summaryStreak", { streak: profile.currentStreak, seasonWr: winrate })
          : _t("scout.hotStreak.summaryRecent", { recentWr: recentWR, games: recentGames, seasonWr: winrate }),
        strategic_note: _t("scout.hotStreak.note"),
      };
    }
    case "Cold Streak":
      return {
        color: "text-slate-400",
        bgColor: "bg-slate-500/10",
        summary: _t("scout.coldStreak.summary", { streak: Math.abs(profile.currentStreak), wr: winrate, kda: profile.recentAvgKda.toFixed(1) }),
        strategic_note: _t("scout.coldStreak.note"),
      };
    case "Off-Role": {
      const currentChampData = profile.champions.find(c => c.name === profile.currentChampion);
      return {
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        summary: _t("scout.offRole.summary", { games: currentChampData?.games || 0, champ: profile.currentChampion, topChamp: profile.champions[0]?.name || "unknown", topGames: profile.champions[0]?.games || 0 }),
        strategic_note: _t("scout.offRole.note"),
      };
    }
    case "Steady":
      return {
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        summary: _t("scout.steady.summary", { wr: winrate, games: totalGames, rank }),
        strategic_note: _t("scout.steady.note"),
      };
    case "High Impact":
      return {
        color: "text-amber-300",
        bgColor: "bg-amber-400/10",
        summary: _t("scout.highImpact.summary", { rank, wr: winrate, kda: profile.recentAvgKda.toFixed(1) }),
        strategic_note: _t("scout.highImpact.note"),
      };
    case "Team-Oriented":
      return {
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        summary: _t("scout.teamOriented.summary", { vpm: profile.recentAvgVisionPerMin.toFixed(1), avgVpm: (RANK_BENCHMARKS[profile.rank]?.avgVisionPerMin || 0.9).toFixed(1) }),
        strategic_note: _t("scout.teamOriented.note"),
      };
    case "New Account":
      return {
        color: "text-zinc-400",
        bgColor: "bg-zinc-400/10",
        summary: _t("scout.newAccount.summary", { lvl: profile.accountLevel, games: totalGames }),
        strategic_note: _t("scout.newAccount.note"),
      };
    default:
      return {
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        summary: _t("scout.default.summary"),
        strategic_note: _t("scout.default.note"),
      };
  }
}

// ─── Mock Player Profiles for ChampSelect ─────────────────────────────────────

export const CHAMP_SELECT_PROFILES: PlayerProfile[] = [
  {
    // TOP - Consistent player, slightly below average
    summonerName: "FakerFan99",
    accountLevel: 187,
    rank: "PLATINUM",
    division: "I",
    lp: 67,
    wins: 88,
    losses: 82,
    recentWins: 11,
    recentLosses: 9,
    recentAvgKda: 3.1,
    recentAvgCsPerMin: 6.8,
    recentAvgVisionPerMin: 0.7,
    recentAvgDeaths: 4.8,
    champions: [
      { name: "Aatrox", games: 52, winrate: 54, avgKda: 3.2 },
      { name: "Darius", games: 38, winrate: 50, avgKda: 2.9 },
      { name: "Ornn", games: 25, winrate: 56, avgKda: 2.4 },
    ],
    currentChampion: "Aatrox",
    currentRole: "TOP",
    currentStreak: 2,
  },
  {
    // JGL - Low level account, high KDA, high CS = High Performer
    summonerName: "Jungle Diff",
    accountLevel: 34,
    rank: "EMERALD",
    division: "IV",
    lp: 45,
    wins: 48,
    losses: 12,
    recentWins: 16,
    recentLosses: 4,
    recentAvgKda: 6.2,
    recentAvgCsPerMin: 6.1,
    recentAvgVisionPerMin: 1.2,
    recentAvgDeaths: 2.1,
    champions: [
      { name: "LeeSin", games: 35, winrate: 77, avgKda: 6.5 },
      { name: "Nidalee", games: 18, winrate: 72, avgKda: 5.8 },
      { name: "Elise", games: 7, winrate: 71, avgKda: 5.2 },
    ],
    currentChampion: "LeeSin",
    currentRole: "JGL",
    currentStreak: 7,
  },
  {
    // MID - OTP Ahri, very high mastery on one champ
    summonerName: "MidKing",
    accountLevel: 245,
    rank: "DIAMOND",
    division: "IV",
    lp: 22,
    wins: 142,
    losses: 118,
    recentWins: 13,
    recentLosses: 7,
    recentAvgKda: 4.1,
    recentAvgCsPerMin: 8.2,
    recentAvgVisionPerMin: 0.9,
    recentAvgDeaths: 3.5,
    champions: [
      { name: "Ahri", games: 198, winrate: 61, avgKda: 4.5 },
      { name: "Syndra", games: 32, winrate: 47, avgKda: 3.0 },
      { name: "Viktor", games: 18, winrate: 44, avgKda: 2.8 },
    ],
    currentChampion: "Ahri",
    currentRole: "MID",
    currentStreak: 3,
  },
  {
    // ADC - You (the player)
    summonerName: "Tu (Eligiendo)",
    accountLevel: 156,
    rank: "EMERALD",
    division: "III",
    lp: 55,
    wins: 98,
    losses: 72,
    recentWins: 14,
    recentLosses: 6,
    recentAvgKda: 4.8,
    recentAvgCsPerMin: 8.4,
    recentAvgVisionPerMin: 0.8,
    recentAvgDeaths: 3.2,
    champions: [
      { name: "Jinx", games: 65, winrate: 58, avgKda: 4.9 },
      { name: "Tristana", games: 42, winrate: 55, avgKda: 4.2 },
      { name: "Ashe", games: 28, winrate: 54, avgKda: 3.8 },
    ],
    currentChampion: "Tristana",
    currentRole: "ADC",
    currentStreak: 3,
  },
  {
    // SUP - On a losing streak, playing off-role champ
    summonerName: "HookMaster",
    accountLevel: 203,
    rank: "EMERALD",
    division: "IV",
    lp: 12,
    wins: 76,
    losses: 84,
    recentWins: 7,
    recentLosses: 13,
    recentAvgKda: 2.1,
    recentAvgCsPerMin: 1.2,
    recentAvgVisionPerMin: 1.4,
    recentAvgDeaths: 5.8,
    champions: [
      { name: "Nautilus", games: 89, winrate: 52, avgKda: 2.8 },
      { name: "Leona", games: 45, winrate: 49, avgKda: 2.5 },
      { name: "Thresh", games: 22, winrate: 45, avgKda: 2.3 },
    ],
    currentChampion: "Nautilus",
    currentRole: "SUP",
    currentStreak: -5,
  },
];