/**
 * dailyStreakService — Daily play streak tracking
 *
 * A "streak day" = any calendar day where the user played at least one game.
 * The streak is still alive if the user hasn't played yet today but played
 * yesterday. It breaks when the last game was 2+ days ago.
 */

import type { MatchData } from "../utils/analytics";

const LONGEST_KEY  = "velaris-daily-streak-longest";
const MILESTONE_KEY = "velaris-daily-streak-last-milestone";
const BROKEN_KEY    = "velaris-daily-streak-broken-shown"; // ISO date string

export interface DailyStreakInfo {
  current: number;          // consecutive days with at least 1 game
  longest: number;          // all-time personal best
  isAliveToday: boolean;    // user already played today
  justBroke: boolean;       // streak broke since last time we checked
  newMilestone: number | null; // e.g. 7, 14, 30 — reached for first time today
}

/** Milestones that deserve a toast (days). */
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function ymd(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
  );
}

/**
 * Computes the current daily streak from the full match history.
 * Matches can be in any order; we group by calendar day internally.
 */
export function computeDailyStreak(matches: MatchData[]): DailyStreakInfo {
  const today = todayStr();

  // Unique sorted days (descending) that have at least one match
  const days = Array.from(new Set(matches.map(m => ymd(m.gameCreation))))
    .sort((a, b) => b.localeCompare(a));

  if (days.length === 0) {
    return { current: 0, longest: 0, isAliveToday: false, justBroke: false, newMilestone: null };
  }

  const lastDay   = days[0];
  const isAliveToday = lastDay === today;

  // Check if the streak just broke: last played day is 2+ days ago
  const gapFromToday = daysBetween(lastDay, today);
  const justBroke = gapFromToday >= 2 && getLastBrokenShown() !== today;

  // Count consecutive streak from the most recent day
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i], days[i - 1]) === 1) {
      current++;
    } else {
      break;
    }
  }

  // If the most recent day isn't today or yesterday, streak is 0
  if (gapFromToday >= 2) current = 0;

  // Persist & check all-time longest
  const storedLongest = parseInt(localStorage.getItem(LONGEST_KEY) ?? "0", 10) || 0;
  const longest = Math.max(current, storedLongest);
  if (longest > storedLongest) {
    try { localStorage.setItem(LONGEST_KEY, String(longest)); } catch {}
  }

  // Check for a new milestone hit today
  const lastMilestone = parseInt(localStorage.getItem(MILESTONE_KEY) ?? "0", 10) || 0;
  const hitMilestone = STREAK_MILESTONES.filter(m => m <= current && m > lastMilestone).pop() ?? null;
  if (hitMilestone) {
    try { localStorage.setItem(MILESTONE_KEY, String(hitMilestone)); } catch {}
  }

  return { current, longest, isAliveToday, justBroke, newMilestone: hitMilestone };
}

/** Mark that we've shown the "streak broke" toast for today. */
export function markBrokenShown(): void {
  try { localStorage.setItem(BROKEN_KEY, todayStr()); } catch {}
}

function getLastBrokenShown(): string {
  try { return localStorage.getItem(BROKEN_KEY) ?? ""; } catch { return ""; }
}
