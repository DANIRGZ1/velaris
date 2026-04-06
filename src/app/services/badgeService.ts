/**
 * Badge Service — Velaris
 *
 * Defines achievement badges earned from match history + LP data.
 * Badges are stored in localStorage so they persist across sessions.
 * Each badge can only be "newly earned" once (shown as a toast/highlight).
 */

import type { MatchData } from "../utils/analytics";
import type { LPSnapshot } from "./lpTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BadgeDef {
  id: string;
  icon: string;       // emoji
  tier: "bronze" | "silver" | "gold" | "diamond";
  titleKey: string;   // i18n key
  descKey: string;    // i18n key (description with how to earn)
  check: (matches: MatchData[], lpHistory: LPSnapshot[]) => boolean;
}

export interface EarnedBadge {
  id: string;
  earnedAt: number; // timestamp
  newlyEarned?: boolean;
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export const BADGES: BadgeDef[] = [
  // ── Games played ──────────────────────────────────────────────────────────
  {
    id: "games_10",
    icon: "🎮",
    tier: "bronze",
    titleKey: "badge.games10.title",
    descKey: "badge.games10.desc",
    check: (m) => m.length >= 10,
  },
  {
    id: "games_50",
    icon: "🎮",
    tier: "silver",
    titleKey: "badge.games50.title",
    descKey: "badge.games50.desc",
    check: (m) => m.length >= 50,
  },
  {
    id: "games_100",
    icon: "🎮",
    tier: "gold",
    titleKey: "badge.games100.title",
    descKey: "badge.games100.desc",
    check: (m) => m.length >= 100,
  },
  // ── Win streaks ───────────────────────────────────────────────────────────
  {
    id: "streak_3",
    icon: "🔥",
    tier: "bronze",
    titleKey: "badge.streak3.title",
    descKey: "badge.streak3.desc",
    check: (m) => hasWinStreak(m, 3),
  },
  {
    id: "streak_5",
    icon: "🔥",
    tier: "silver",
    titleKey: "badge.streak5.title",
    descKey: "badge.streak5.desc",
    check: (m) => hasWinStreak(m, 5),
  },
  {
    id: "streak_10",
    icon: "🔥",
    tier: "gold",
    titleKey: "badge.streak10.title",
    descKey: "badge.streak10.desc",
    check: (m) => hasWinStreak(m, 10),
  },
  // ── KDA ───────────────────────────────────────────────────────────────────
  {
    id: "kda_5",
    icon: "⚔️",
    tier: "silver",
    titleKey: "badge.kda5.title",
    descKey: "badge.kda5.desc",
    check: (m) => m.some(match => {
      const p = match.participants[match.playerParticipantIndex];
      return p && (p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists) >= 5;
    }),
  },
  {
    id: "kda_10",
    icon: "⚔️",
    tier: "gold",
    titleKey: "badge.kda10.title",
    descKey: "badge.kda10.desc",
    check: (m) => m.some(match => {
      const p = match.participants[match.playerParticipantIndex];
      return p && (p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists) >= 10;
    }),
  },
  // ── Kills ─────────────────────────────────────────────────────────────────
  {
    id: "kills_20",
    icon: "💀",
    tier: "silver",
    titleKey: "badge.kills20.title",
    descKey: "badge.kills20.desc",
    check: (m) => m.some(match => {
      const p = match.participants[match.playerParticipantIndex];
      return p && p.kills >= 20;
    }),
  },
  {
    id: "penta",
    icon: "👑",
    tier: "diamond",
    titleKey: "badge.penta.title",
    descKey: "badge.penta.desc",
    check: (m) => m.some(match => {
      const p = match.participants[match.playerParticipantIndex];
      return p && (p.pentaKills ?? 0) >= 1;
    }),
  },
  // ── Vision ────────────────────────────────────────────────────────────────
  {
    id: "vision_50",
    icon: "👁️",
    tier: "silver",
    titleKey: "badge.vision50.title",
    descKey: "badge.vision50.desc",
    check: (m) => m.some(match => {
      const p = match.participants[match.playerParticipantIndex];
      return p && p.visionScore >= 50;
    }),
  },
  // ── LP milestones ─────────────────────────────────────────────────────────
  {
    id: "lp_100_day",
    icon: "📈",
    tier: "silver",
    titleKey: "badge.lp100day.title",
    descKey: "badge.lp100day.desc",
    check: (_, lp) => {
      if (lp.length < 2) return false;
      const DAY = 86_400_000;
      const now = Date.now();
      const todaySnaps = lp.filter(s => s.timestamp >= now - DAY);
      if (todaySnaps.length < 2) return false;
      return todaySnaps[todaySnaps.length - 1].totalLP - todaySnaps[0].totalLP >= 100;
    },
  },
  {
    id: "lp_500_total",
    icon: "📈",
    tier: "gold",
    titleKey: "badge.lp500total.title",
    descKey: "badge.lp500total.desc",
    check: (_, lp) => {
      if (lp.length < 2) return false;
      return lp[lp.length - 1].totalLP - lp[0].totalLP >= 500;
    },
  },
  // ── CS milestone ──────────────────────────────────────────────────────────
  {
    id: "cs_300",
    icon: "🌾",
    tier: "silver",
    titleKey: "badge.cs300.title",
    descKey: "badge.cs300.desc",
    check: (m) => m.some(match => {
      const p = match.participants[match.playerParticipantIndex];
      return p && p.totalMinionsKilled + p.neutralMinionsKilled >= 300;
    }),
  },
  // ── Deathless ─────────────────────────────────────────────────────────────
  {
    id: "deathless",
    icon: "🛡️",
    tier: "gold",
    titleKey: "badge.deathless.title",
    descKey: "badge.deathless.desc",
    check: (m) => m.some(match => {
      const p = match.participants[match.playerParticipantIndex];
      return p && p.deaths === 0 && p.kills + p.assists >= 5 && p.win;
    }),
  },
  // ── Multi-champ mastery ───────────────────────────────────────────────────
  {
    id: "flex_5",
    icon: "🃏",
    tier: "bronze",
    titleKey: "badge.flex5.title",
    descKey: "badge.flex5.desc",
    check: (m) => {
      const champs = new Set(m.map(match => {
        const p = match.participants[match.playerParticipantIndex];
        return p?.championName;
      }).filter(Boolean));
      return champs.size >= 5;
    },
  },
  {
    id: "flex_15",
    icon: "🃏",
    tier: "silver",
    titleKey: "badge.flex15.title",
    descKey: "badge.flex15.desc",
    check: (m) => {
      const champs = new Set(m.map(match => {
        const p = match.participants[match.playerParticipantIndex];
        return p?.championName;
      }).filter(Boolean));
      return champs.size >= 15;
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasWinStreak(matches: MatchData[], n: number): boolean {
  const sorted = [...matches].sort((a, b) => a.gameCreation - b.gameCreation);
  let streak = 0;
  for (const m of sorted) {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) continue;
    if (p.win) { streak++; if (streak >= n) return true; }
    else streak = 0;
  }
  return false;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "velaris-earned-badges";

function loadEarned(): Record<string, EarnedBadge> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveEarned(data: Record<string, EarnedBadge>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Checks all badge conditions and persists any newly earned ones.
 * Returns the list of badges that were just earned for the first time.
 */
export function checkAndSaveBadges(
  matches: MatchData[],
  lpHistory: LPSnapshot[],
): BadgeDef[] {
  const earned = loadEarned();
  const newlyEarned: BadgeDef[] = [];

  for (const badge of BADGES) {
    if (earned[badge.id]) continue; // already earned
    if (badge.check(matches, lpHistory)) {
      earned[badge.id] = { id: badge.id, earnedAt: Date.now(), newlyEarned: true };
      newlyEarned.push(badge);
    }
  }

  if (newlyEarned.length > 0) saveEarned(earned);
  return newlyEarned;
}

/**
 * Returns all earned badges with metadata, marking which were new.
 */
export function getEarnedBadges(
  matches: MatchData[],
  lpHistory: LPSnapshot[],
): { badge: BadgeDef; earnedAt: number; isNew: boolean }[] {
  const earned = loadEarned();
  const result: { badge: BadgeDef; earnedAt: number; isNew: boolean }[] = [];

  for (const badge of BADGES) {
    if (earned[badge.id]) {
      const isNew = earned[badge.id].newlyEarned ?? false;
      result.push({ badge, earnedAt: earned[badge.id].earnedAt, isNew });
      // Clear newlyEarned flag after first read
      if (isNew) {
        earned[badge.id].newlyEarned = false;
        saveEarned(earned);
      }
    } else if (badge.check(matches, lpHistory)) {
      // Edge case: earned but not yet stored (first run)
      earned[badge.id] = { id: badge.id, earnedAt: Date.now() };
      result.push({ badge, earnedAt: earned[badge.id].earnedAt, isNew: false });
      saveEarned(earned);
    }
  }

  return result.sort((a, b) => {
    const tierOrder = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
    return (tierOrder[a.badge.tier] - tierOrder[b.badge.tier]) || (b.earnedAt - a.earnedAt);
  });
}

/**
 * Returns all badge definitions with earned status, for displaying the full grid
 * including locked badges.
 */
export function getAllBadgesWithStatus(
  matches: MatchData[],
  lpHistory: LPSnapshot[],
): { badge: BadgeDef; earned: boolean; earnedAt?: number }[] {
  const earned = loadEarned();

  return BADGES.map(badge => {
    const e = earned[badge.id];
    const isEarned = !!e || badge.check(matches, lpHistory);
    if (isEarned && !e) {
      earned[badge.id] = { id: badge.id, earnedAt: Date.now() };
      saveEarned(earned);
    }
    return {
      badge,
      earned: isEarned,
      earnedAt: e?.earnedAt,
    };
  });
}
