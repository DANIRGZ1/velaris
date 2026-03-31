/**
 * Tilt Analysis Engine — Pure logic, no UI.
 *
 * Analyzes recent match patterns to detect potential tilt:
 * - Loss streaks
 * - Increasing deaths per game
 * - Declining KDA
 * - Early death patterns getting worse
 */

import type { MatchData } from "./analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MentalState = "focused" | "warming" | "tilted" | "on-fire";

export interface TiltAnalysis {
  state: MentalState;
  score: number; // 0-100 (0 = peak focus, 100 = max tilt)
  label: string;
  description: string;
  suggestion: string;
  factors: TiltFactor[];
}

export interface TiltFactor {
  label: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
}

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

// ─── Analysis Engine ──────────────────────────────────────────────────────────

export function analyzeTilt(matches: MatchData[], t: TFunc): TiltAnalysis {
  if (matches.length === 0) {
    return {
      state: "focused", score: 0,
      label: t("tilt.noData"),
      description: t("tilt.noDataDesc"),
      suggestion: t("tilt.noDataSuggestion"),
      factors: [],
    };
  }

  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  const recent5 = sorted.slice(0, 5);
  const recent10 = sorted.slice(0, 10);
  
  let tiltScore = 0;
  const factors: TiltFactor[] = [];

  // Factor 1: Current streak
  let streakCount = 1;
  const streakWin = sorted[0].participants[sorted[0].playerParticipantIndex].win;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].participants[sorted[i].playerParticipantIndex].win === streakWin) streakCount++;
    else break;
  }

  if (!streakWin && streakCount >= 3) {
    tiltScore += Math.min(40, streakCount * 10);
    factors.push({
      label: t("tilt.lossStreak", { count: streakCount }),
      impact: "negative",
      detail: t("tilt.lossStreakDetail", { count: streakCount }),
    });
  } else if (streakWin && streakCount >= 3) {
    tiltScore -= Math.min(20, streakCount * 5);
    factors.push({
      label: t("tilt.winStreak", { count: streakCount }),
      impact: "positive",
      detail: t("tilt.winStreakDetail"),
    });
  }

  // Factor 2: Deaths trend in last 5 games
  const deaths5 = recent5.map(m => m.participants[m.playerParticipantIndex].deaths);
  const avgDeaths5 = deaths5.reduce((a, b) => a + b, 0) / deaths5.length;
  const deathsTrend = deaths5.length >= 3 ? deaths5[0] - deaths5[deaths5.length - 1] : 0;
  
  if (avgDeaths5 >= 6) {
    tiltScore += 15;
    factors.push({
      label: t("tilt.highDeaths"),
      impact: "negative",
      detail: t("tilt.highDeathsDetail", { value: avgDeaths5.toFixed(1) }),
    });
  } else if (avgDeaths5 <= 3) {
    tiltScore -= 10;
    factors.push({
      label: t("tilt.lowDeaths"),
      impact: "positive",
      detail: t("tilt.lowDeathsDetail", { value: avgDeaths5.toFixed(1) }),
    });
  }

  if (deathsTrend > 3) {
    tiltScore += 10;
    factors.push({
      label: t("tilt.risingDeaths"),
      impact: "negative",
      detail: t("tilt.risingDeathsDetail"),
    });
  }

  // Factor 3: Early deaths in recent games (tilt = more reckless early)
  const earlyDeaths5 = recent5.map(m => {
    const p = m.participants[m.playerParticipantIndex];
    return (p.deathTimestamps ?? []).filter(t => t <= 5).length;
  });
  const totalEarlyDeaths = earlyDeaths5.reduce((a, b) => a + b, 0);
  
  if (totalEarlyDeaths >= 5) {
    tiltScore += 15;
    factors.push({
      label: t("tilt.earlyDeaths"),
      impact: "negative",
      detail: t("tilt.earlyDeathsDetail", { count: totalEarlyDeaths }),
    });
  }

  // Factor 4: KDA trend
  const kda5 = recent5.map(m => {
    const p = m.participants[m.playerParticipantIndex];
    return p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists;
  });
  const avgKda5 = kda5.reduce((a, b) => a + b, 0) / kda5.length;

  if (avgKda5 < 2) {
    tiltScore += 10;
    factors.push({
      label: t("tilt.lowKda"),
      impact: "negative",
      detail: t("tilt.lowKdaDetail", { value: avgKda5.toFixed(1) }),
    });
  } else if (avgKda5 >= 4) {
    tiltScore -= 10;
    factors.push({
      label: t("tilt.highKda"),
      impact: "positive",
      detail: t("tilt.highKdaDetail", { value: avgKda5.toFixed(1) }),
    });
  }

  // Factor 5: Win rate in last 10
  const wr10 = recent10.filter(m => m.participants[m.playerParticipantIndex].win).length / recent10.length * 100;
  if (wr10 < 30) {
    tiltScore += 15;
    factors.push({
      label: t("tilt.lowWr", { value: Math.round(wr10) }),
      impact: "negative",
      detail: t("tilt.lowWrDetail", { value: Math.round(wr10), count: recent10.length }),
    });
  } else if (wr10 >= 70) {
    tiltScore -= 15;
    factors.push({
      label: t("tilt.highWr", { value: Math.round(wr10) }),
      impact: "positive",
      detail: t("tilt.highWrDetail"),
    });
  }

  // Factor 6: Time between games (playing too many in a row)
  if (sorted.length >= 3) {
    const timeBetween1 = (sorted[0].gameCreation - sorted[1].gameCreation) / 60000;
    const timeBetween2 = (sorted[1].gameCreation - sorted[2].gameCreation) / 60000;
    if (timeBetween1 < 5 && timeBetween2 < 5 && !streakWin) {
      tiltScore += 10;
      factors.push({
        label: t("tilt.instantQueue"),
        impact: "negative",
        detail: t("tilt.instantQueueDetail"),
      });
    }
  }

  // Clamp score
  tiltScore = Math.max(0, Math.min(100, tiltScore));

  // Determine state
  let state: MentalState;
  let label: string;
  let description: string;
  let suggestion: string;

  if (tiltScore <= 15) {
    state = "on-fire";
    label = t("tilt.onFire");
    description = t("tilt.onFireDesc");
    suggestion = t("tilt.onFireSuggestion");
  } else if (tiltScore <= 35) {
    state = "focused";
    label = t("tilt.focused");
    description = t("tilt.focusedDesc");
    suggestion = t("tilt.focusedSuggestion");
  } else if (tiltScore <= 60) {
    state = "warming";
    label = t("tilt.warming");
    description = t("tilt.warmingDesc");
    suggestion = t("tilt.warmingSuggestion");
  } else {
    state = "tilted";
    label = t("tilt.tilted");
    description = t("tilt.tiltedDesc");
    suggestion = t("tilt.tiltedSuggestion");
  }

  return { state, score: tiltScore, label, description, suggestion, factors };
}
