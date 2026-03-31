/**
 * Celebration Service — Velaris
 *
 * Pure logic for detecting celebration-worthy moments:
 * • Rank promotions (division or tier)
 * • Excellent game performances
 *
 * No UI — just evaluators that return celebration payloads.
 */

import type { MatchData, MatchParticipant } from "../utils/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CelebrationTier = "subtle" | "warm" | "epic";

export interface AchievementCelebration {
  type: "achievement";
  tier: CelebrationTier;
  icon: string; // lucide icon name
  title: string; // i18n key
  subtitle: string; // i18n key
  vars?: Record<string, string | number>;
  color: string; // tailwind color class
  glowColor: string; // for the shimmer
}

export interface RankUpCelebration {
  type: "rankup";
  tier: CelebrationTier;
  previousRank: string;
  previousDivision: string;
  newRank: string;
  newDivision: string;
  isTierPromotion: boolean; // Gold → Platinum (bigger celebration)
}

export type Celebration = AchievementCelebration | RankUpCelebration;

// ─── Rank Hierarchy ───────────────────────────────────────────────────────────

const TIER_ORDER = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
  "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
];

const DIVISION_ORDER = ["IV", "III", "II", "I"];

function tierIndex(tier: string): number {
  return TIER_ORDER.indexOf(tier.toUpperCase());
}

function divisionIndex(div: string): number {
  return DIVISION_ORDER.indexOf(div.toUpperCase());
}

/**
 * Returns a numeric rank score for comparison.
 * Higher = better rank.
 */
function rankScore(tier: string, division: string): number {
  const t = tierIndex(tier);
  const d = divisionIndex(division);
  if (t < 0) return -1; // UNRANKED
  // Master+ have no divisions, treat as max division
  if (d < 0) return t * 10 + 9;
  return t * 10 + d;
}

// ─── Rank Change Detection ────────────────────────────────────────────────────

const RANK_HISTORY_KEY = "velaris-celebration-last-rank";

interface StoredRank {
  rank: string;
  division: string;
  timestamp: number;
}

function getLastKnownRank(): StoredRank | null {
  try {
    const raw = localStorage.getItem(RANK_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveLastKnownRank(rank: string, division: string): void {
  try {
    localStorage.setItem(RANK_HISTORY_KEY, JSON.stringify({
      rank, division, timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
}

/**
 * Compares current rank against last known rank.
 * Returns a RankUpCelebration if promoted, or null.
 * Always updates the stored rank.
 */
export function detectRankChange(
  currentRank: string,
  currentDivision: string,
): RankUpCelebration | null {
  const last = getLastKnownRank();

  // Always save current
  saveLastKnownRank(currentRank, currentDivision);

  if (!last) return null; // First time — no comparison
  if (last.rank === "UNRANKED" || currentRank === "UNRANKED") return null;

  const oldScore = rankScore(last.rank, last.division);
  const newScore = rankScore(currentRank, currentDivision);

  if (newScore <= oldScore) return null; // No promotion

  const isTierPromotion = tierIndex(currentRank) > tierIndex(last.rank);

  return {
    type: "rankup",
    tier: isTierPromotion ? "epic" : "warm",
    previousRank: last.rank,
    previousDivision: last.division,
    newRank: currentRank,
    newDivision: currentDivision,
    isTierPromotion,
  };
}

// ─── Game Performance Detection ───────────────────────────────────────────────

const SEEN_MATCHES_KEY = "velaris-celebration-seen-matches";

function getSeenMatches(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_MATCHES_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function markMatchSeen(matchId: string): void {
  try {
    const seen = getSeenMatches();
    seen.add(matchId);
    // Keep only last 50 to avoid unbounded growth
    const arr = [...seen].slice(-50);
    localStorage.setItem(SEEN_MATCHES_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

/**
 * Evaluates a completed match for celebration-worthy moments.
 * Returns an array of achievements (can be multiple per game).
 */
export function detectGameAchievements(
  match: MatchData,
  recentMatches?: MatchData[],
): AchievementCelebration[] {
  const seen = getSeenMatches();
  if (seen.has(match.matchId)) return [];

  markMatchSeen(match.matchId);

  const player = match.participants[match.playerParticipantIndex];
  if (!player) return [];

  const achievements: AchievementCelebration[] = [];
  const gameDurationMin = match.gameDuration / 60;
  const kda = player.deaths === 0
    ? (player.kills + player.assists)
    : (player.kills + player.assists) / player.deaths;
  const csPerMin = (player.totalMinionsKilled + player.neutralMinionsKilled) / gameDurationMin;

  // ── Pentakill ───────────────────────────────────────────────────────
  if ((player.pentaKills ?? 0) >= 1) {
    achievements.push({
      type: "achievement",
      tier: "epic",
      icon: "swords",
      title: "celebration.pentakill",
      subtitle: "celebration.pentakill.desc",
      vars: { champion: player.championName },
      color: "text-red-400",
      glowColor: "rgba(248, 113, 113, 0.5)",
    });
  }

  // ── Quadrakill (only if no penta — avoid stacking) ─────────────────
  else if ((player.quadraKills ?? 0) >= 1) {
    achievements.push({
      type: "achievement",
      tier: "epic",
      icon: "crosshair",
      title: "celebration.quadrakill",
      subtitle: "celebration.quadrakill.desc",
      vars: { champion: player.championName },
      color: "text-orange-400",
      glowColor: "rgba(251, 146, 60, 0.45)",
    });
  }

  // ── Triple Kill ────────────────────────────────────────────────────
  else if ((player.tripleKills ?? 0) >= 1) {
    achievements.push({
      type: "achievement",
      tier: "warm",
      icon: "swords",
      title: "celebration.tripleKill",
      subtitle: "celebration.tripleKill.desc",
      vars: { champion: player.championName, count: player.tripleKills ?? 1 },
      color: "text-yellow-400",
      glowColor: "rgba(250, 204, 21, 0.35)",
    });
  }

  // ── First Blood ────────────────────────────────────────────────────
  if (player.firstBloodKill && player.win) {
    achievements.push({
      type: "achievement",
      tier: "subtle",
      icon: "crosshair",
      title: "celebration.firstBlood",
      subtitle: "celebration.firstBlood.desc",
      vars: { champion: player.championName },
      color: "text-red-500",
      glowColor: "rgba(239, 68, 68, 0.3)",
    });
  }

  // ── Perfect Game (win + 0 deaths) ──────────────────────────────────
  if (player.win && player.deaths === 0 && gameDurationMin >= 15) {
    achievements.push({
      type: "achievement",
      tier: "epic",
      icon: "crown",
      title: "celebration.perfectGame",
      subtitle: "celebration.perfectGame.desc",
      vars: { champion: player.championName, kda: `${player.kills}/${player.deaths}/${player.assists}` },
      color: "text-amber-400",
      glowColor: "rgba(251, 191, 36, 0.4)",
    });
  }

  // ── Dominant KDA (≥ 5.0, win) ──────────────────────────────────────
  else if (player.win && kda >= 5.0) {
    achievements.push({
      type: "achievement",
      tier: "warm",
      icon: "zap",
      title: "celebration.dominantKda",
      subtitle: "celebration.dominantKda.desc",
      vars: { kda: kda.toFixed(1), line: `${player.kills}/${player.deaths}/${player.assists}` },
      color: "text-violet-400",
      glowColor: "rgba(167, 139, 250, 0.35)",
    });
  }

  // ── CS Machine (≥ 8.0 CS/min) ─────────────────────────────────────
  if (csPerMin >= 8.0) {
    achievements.push({
      type: "achievement",
      tier: "subtle",
      icon: "target",
      title: "celebration.csMachine",
      subtitle: "celebration.csMachine.desc",
      vars: { csPerMin: csPerMin.toFixed(1) },
      color: "text-emerald-400",
      glowColor: "rgba(52, 211, 153, 0.3)",
    });
  }

  // ── Vision MVP (vision score top of team, ≥ 1.0/min) ─────────────
  const visionPerMin = player.visionScore / gameDurationMin;
  const alliedVisionScores = match.participants
    .filter((_, i) => {
      const isAlly = match.participants[match.playerParticipantIndex].win
        ? match.participants[i].win
        : !match.participants[i].win;
      return isAlly;
    })
    .map(p => p.visionScore);
  const isVisionMvp = player.visionScore >= Math.max(...alliedVisionScores);

  if (isVisionMvp && visionPerMin >= 1.0 && player.win) {
    achievements.push({
      type: "achievement",
      tier: "subtle",
      icon: "eye",
      title: "celebration.visionMvp",
      subtitle: "celebration.visionMvp.desc",
      vars: { score: player.visionScore },
      color: "text-cyan-400",
      glowColor: "rgba(34, 211, 238, 0.3)",
    });
  }

  // ── Win Streak (3+) ───────────────────────────────────────────────
  if (player.win && recentMatches && recentMatches.length >= 3) {
    const sortedRecent = [...recentMatches].sort((a, b) => b.gameCreation - a.gameCreation);
    let streak = 0;
    for (const m of sortedRecent) {
      const p = m.participants[m.playerParticipantIndex];
      if (p?.win) streak++;
      else break;
    }
    if (streak >= 3) {
      achievements.push({
        type: "achievement",
        tier: streak >= 5 ? "epic" : "warm",
        icon: "flame",
        title: "celebration.winStreak",
        subtitle: "celebration.winStreak.desc",
        vars: { count: streak },
        color: streak >= 5 ? "text-orange-400" : "text-amber-400",
        glowColor: streak >= 5 ? "rgba(251, 146, 60, 0.4)" : "rgba(251, 191, 36, 0.3)",
      });
    }
  }

  // ── Comeback (won a game ≥ 35 min where team was behind) ──────────
  if (player.win && gameDurationMin >= 35) {
    achievements.push({
      type: "achievement",
      tier: "warm",
      icon: "shield",
      title: "celebration.comeback",
      subtitle: "celebration.comeback.desc",
      vars: { duration: Math.floor(gameDurationMin) },
      color: "text-blue-400",
      glowColor: "rgba(96, 165, 250, 0.3)",
    });
  }

  return achievements;
}

// ─── Celebration Sensitivity ──────────────────────────────────────────────────

export type CelebrationSensitivity = "rank_only" | "great_games" | "everything";

export function filterBySensitivity(
  celebrations: Celebration[],
  sensitivity: CelebrationSensitivity,
): Celebration[] {
  return celebrations.filter(c => {
    if (c.type === "rankup") return true; // Always show rank ups
    if (sensitivity === "rank_only") return false;
    if (sensitivity === "great_games") return c.tier !== "subtle";
    return true; // "everything"
  });
}
