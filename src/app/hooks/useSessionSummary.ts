/**
 * useSessionSummary — detects when a session of 3+ games has ended
 * (45-min gap since last match) and returns a one-time summary object.
 *
 * Shown once per session: the lastMatchId is persisted in localStorage
 * so the modal only appears once after a session wraps up.
 */
import { useState, useMemo } from "react";
import type { MatchData } from "../utils/analytics";

export interface SessionStats {
  games: number;
  wins: number;
  losses: number;
  net: number;
  longestWinStreak: number;
  longestLossStreak: number;
  bestChampion: string | null;
  avgKDA: number;
  avgCSMin: number;
  sessionStartTs: number;
  sessionEndTs: number;
  lastMatchId: string;
}

const SESSION_SHOWN_KEY = "velaris-session-summary-shown";
const SESSION_GAP_MS = 45 * 60 * 1000; // 45 minutes
const MIN_GAMES = 3;

export function useSessionSummary(matches: MatchData[] | undefined) {
  const [dismissed, setDismissed] = useState(false);

  const session = useMemo<SessionStats | null>(() => {
    if (!matches || matches.length === 0) return null;

    // Sort newest → oldest
    const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);

    // Build current session: stop when gap between two consecutive games > 45 min
    const sessionGames: MatchData[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const newer = sorted[i - 1];
      const older = sorted[i];
      const olderEnd = older.gameCreation + older.gameDuration * 1000;
      const gap = newer.gameCreation - olderEnd;
      if (gap < 0 || gap > SESSION_GAP_MS) break;
      sessionGames.push(older);
    }

    if (sessionGames.length < MIN_GAMES) return null;

    // Session must have ended (newest match ended > 45 min ago)
    const newest = sessionGames[0];
    const sessionEndTs = newest.gameCreation + newest.gameDuration * 1000;
    if (Date.now() - sessionEndTs < SESSION_GAP_MS) return null;

    // Show only once per session
    const lastMatchId = newest.matchId;
    try {
      if (localStorage.getItem(SESSION_SHOWN_KEY) === String(lastMatchId)) return null;
    } catch { /* ignore */ }

    // Compute stats
    const players = sessionGames
      .map(m => m.participants[m.playerParticipantIndex])
      .filter(Boolean);

    const wins   = players.filter(p => p.win).length;
    const losses = players.length - wins;

    // Streak calculations
    let longestWin = 0, longestLoss = 0, curWin = 0, curLoss = 0;
    for (const p of players) {
      if (p.win) { curWin++; curLoss = 0; longestWin  = Math.max(longestWin,  curWin);  }
      else        { curLoss++; curWin = 0; longestLoss = Math.max(longestLoss, curLoss); }
    }

    // Best champion (most games played)
    const champCount: Record<string, number> = {};
    for (const p of players) {
      champCount[p.championName] = (champCount[p.championName] || 0) + 1;
    }
    const bestChampion = Object.entries(champCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Avg KDA
    const kdas = players.map(p =>
      p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists
    );
    const avgKDA = kdas.reduce((a, b) => a + b, 0) / kdas.length;

    // Avg CS/min
    const csms = sessionGames.map((m, i) => {
      const p = players[i];
      if (!p) return 0;
      return (p.totalMinionsKilled + p.neutralMinionsKilled) / Math.max(1, m.gameDuration / 60);
    });
    const avgCSMin = csms.reduce((a, b) => a + b, 0) / csms.length;

    return {
      games: sessionGames.length,
      wins, losses, net: wins - losses,
      longestWinStreak: longestWin,
      longestLossStreak: longestLoss,
      bestChampion,
      avgKDA,
      avgCSMin,
      sessionStartTs: sessionGames[sessionGames.length - 1].gameCreation,
      sessionEndTs,
      lastMatchId,
    };
  }, [matches]);

  const dismiss = () => {
    setDismissed(true);
    if (session) {
      try { localStorage.setItem(SESSION_SHOWN_KEY, String(session.lastMatchId)); } catch { /* ignore */ }
    }
  };

  return { session: dismissed ? null : session, dismiss };
}
