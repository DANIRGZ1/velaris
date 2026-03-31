/**
 * WeeklySummary — Spotify-Wrapped-style weekly recap.
 *
 * Shown automatically every Monday (first visit of the week).
 * Computes stats from the previous 7 days of match history.
 */
import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Minus, Trophy, Swords, Flame, Star } from "lucide-react";
import { cn } from "./ui/utils";
import type { MatchData } from "../utils/analytics";

const SEEN_KEY = "velaris-weekly-summary-seen";

function getMonday(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function shouldShow(): boolean {
  const today = new Date();
  if (today.getDay() !== 1) return false; // Only on Mondays
  const thisMonday = getMonday(today);
  try {
    return localStorage.getItem(SEEN_KEY) !== thisMonday;
  } catch { return false; }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, getMonday(new Date()));
  } catch {}
}

interface Props { matches: MatchData[] }

export function WeeklySummary({ matches }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (shouldShow() && matches.length > 0) {
      const t = setTimeout(() => setShow(true), 1400);
      return () => clearTimeout(t);
    }
  }, [matches.length]);

  const stats = useMemo(() => {
    if (!matches.length) return null;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const week = matches.filter(m => m.gameCreation >= cutoff);
    if (week.length === 0) return null;

    const wins = week.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
    const losses = week.length - wins;
    const wr = Math.round((wins / week.length) * 100);

    // LP delta
    const lpEntries = (() => {
      try {
        const raw = localStorage.getItem("velaris-lp-history");
        if (!raw) return [];
        return JSON.parse(raw) as Array<{ totalLP: number; ts: number }>;
      } catch { return []; }
    })();
    const weekLp = lpEntries.filter(e => e.ts >= cutoff);
    const lpDelta = weekLp.length >= 2
      ? weekLp[weekLp.length - 1].totalLP - weekLp[0].totalLP
      : null;

    // Most played champion
    const champCount: Record<string, { games: number; wins: number }> = {};
    for (const m of week) {
      const me = m.participants[m.playerParticipantIndex];
      if (!me) continue;
      const c = me.championName || "Unknown";
      if (!champCount[c]) champCount[c] = { games: 0, wins: 0 };
      champCount[c].games++;
      if (me.win) champCount[c].wins++;
    }
    const topChamp = Object.entries(champCount).sort((a, b) => b[1].games - a[1].games)[0];

    // Best game (highest KDA)
    let bestGame: MatchData | null = null;
    let bestKda = -1;
    for (const m of week) {
      const me = m.participants[m.playerParticipantIndex];
      if (!me) continue;
      const kda = me.deaths === 0 ? me.kills + me.assists : (me.kills + me.assists) / me.deaths;
      if (kda > bestKda) { bestKda = kda; bestGame = m; }
    }
    const bestMe = bestGame?.participants[bestGame.playerParticipantIndex];

    return { games: week.length, wins, losses, wr, lpDelta, topChamp, bestGame, bestMe, bestKda };
  }, [matches]);

  const handleClose = () => {
    markSeen();
    setShow(false);
  };

  if (!stats) return null;

  const lpUp = stats.lpDelta !== null && stats.lpDelta >= 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9990] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/8 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold text-foreground">Resumen Semanal</h2>
                    <p className="text-[11px] text-muted-foreground">Tu semana en ranked</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/70 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="relative px-6 py-5 flex flex-col gap-4">

              {/* W/L + WR */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-secondary/40 border border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Partidas</span>
                  <span className="text-[22px] font-mono font-bold text-foreground">{stats.games}</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Victorias</span>
                  <span className="text-[22px] font-mono font-bold text-emerald-500">{stats.wins}</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Derrotas</span>
                  <span className="text-[22px] font-mono font-bold text-red-400">{stats.losses}</span>
                </div>
              </div>

              {/* WR bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Win Rate semanal</span>
                  <span className={cn("font-bold tabular-nums", stats.wr >= 55 ? "text-emerald-500" : stats.wr >= 45 ? "text-amber-500" : "text-red-400")}>
                    {stats.wr}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", stats.wr >= 55 ? "bg-emerald-500" : stats.wr >= 45 ? "bg-amber-500" : "bg-red-400")}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.wr}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* LP delta */}
              {stats.lpDelta !== null && (
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  lpUp ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/8 border-red-500/20"
                )}>
                  <Trophy className={cn("w-4 h-4 shrink-0", lpUp ? "text-emerald-500" : "text-red-400")} />
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground">LP esta semana</span>
                    <div className="flex items-center gap-1.5">
                      {stats.lpDelta > 0
                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        : stats.lpDelta === 0
                        ? <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                        : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      }
                      <span className={cn(
                        "text-[16px] font-mono font-bold",
                        lpUp ? "text-emerald-500" : "text-red-400"
                      )}>
                        {stats.lpDelta > 0 ? "+" : ""}{stats.lpDelta} LP
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top champion */}
              {stats.topChamp && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40">
                  <Swords className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-muted-foreground">Campeón más jugado</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[14px] font-semibold text-foreground">{stats.topChamp[0]}</span>
                      <span className="text-[11px] text-muted-foreground">{stats.topChamp[1].games} partidas</span>
                      <span className={cn(
                        "text-[11px] font-bold ml-auto",
                        Math.round(stats.topChamp[1].wins / stats.topChamp[1].games * 100) >= 50 ? "text-emerald-500" : "text-red-400"
                      )}>
                        {Math.round(stats.topChamp[1].wins / stats.topChamp[1].games * 100)}% WR
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Best game */}
              {stats.bestMe && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <span className="text-[11px] text-muted-foreground">Mejor partida</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[13px] font-semibold text-foreground">{stats.bestMe.championName}</span>
                      <span className="text-[12px] font-mono text-foreground">
                        {stats.bestMe.kills}/{stats.bestMe.deaths}/{stats.bestMe.assists}
                      </span>
                      <span className={cn("text-[11px] font-bold ml-auto", stats.bestMe.win ? "text-emerald-500" : "text-red-400")}>
                        {stats.bestMe.win ? "Victoria" : "Derrota"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-[13px] hover:bg-primary/90 transition-colors cursor-pointer"
              >
                ¡A por otra semana!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
