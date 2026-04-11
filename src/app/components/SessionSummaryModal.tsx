import { motion } from "motion/react";
import { X, Trophy, Swords, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "./ui/utils";
import type { SessionStats } from "../hooks/useSessionSummary";

interface SessionSummaryModalProps {
  session: SessionStats;
  onClose: () => void;
}

export function SessionSummaryModal({ session, onClose }: SessionSummaryModalProps) {
  const {
    games, wins, losses, net,
    longestWinStreak, longestLossStreak,
    bestChampion, avgKDA, avgCSMin,
    sessionStartTs, sessionEndTs,
  } = session;

  const startTime = new Date(sessionStartTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const endTime   = new Date(sessionEndTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isPositive = net > 0;
  const isNegative = net < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Overlay */}
      <motion.div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Panel */}
      <motion.div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Gradient header */}
        <div className={cn(
          "px-6 pt-6 pb-5",
          isPositive
            ? "bg-gradient-to-br from-emerald-500/10 to-transparent"
            : isNegative
            ? "bg-gradient-to-br from-destructive/10 to-transparent"
            : "bg-gradient-to-br from-primary/5 to-transparent"
        )}>
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-1">
            <Trophy className={cn(
              "w-5 h-5 shrink-0",
              isPositive ? "text-emerald-500" : isNegative ? "text-destructive" : "text-primary"
            )} />
            <h2 className="text-base font-semibold text-foreground">Resumen de sesión</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {startTime} – {endTime} · {games} partidas
          </p>
        </div>

        {/* W/L row */}
        <div className="px-6 py-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xl font-mono font-bold text-emerald-500">{wins}</div>
                <div className="text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">V</div>
              </div>
              <div className="text-muted-foreground/30 text-lg">–</div>
              <div className="text-center">
                <div className="text-xl font-mono font-bold text-destructive">{losses}</div>
                <div className="text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">D</div>
              </div>
            </div>
            <div className={cn(
              "text-2xl font-mono font-black",
              isPositive ? "text-emerald-500" : isNegative ? "text-destructive" : "text-muted-foreground"
            )}>
              {isPositive ? "+" : ""}{net}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="px-6 py-4 grid grid-cols-2 gap-3">
          {/* KDA */}
          <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-secondary/40 border border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">
              <Swords className="w-3 h-3" />
              KDA
            </div>
            <div className="text-lg font-mono font-bold text-foreground">{avgKDA.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground/60">promedio</div>
          </div>

          {/* CS/min */}
          <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-secondary/40 border border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">
              <Target className="w-3 h-3" />
              CS/min
            </div>
            <div className="text-lg font-mono font-bold text-foreground">{avgCSMin.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground/60">promedio</div>
          </div>

          {/* Win streak */}
          <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-secondary/40 border border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">
              <TrendingUp className="w-3 h-3" />
              Racha win
            </div>
            <div className={cn(
              "text-lg font-mono font-bold",
              longestWinStreak >= 3 ? "text-emerald-500" : "text-foreground"
            )}>{longestWinStreak}</div>
            <div className="text-xs text-muted-foreground/60">victorias seguidas</div>
          </div>

          {/* Best champion */}
          <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-secondary/40 border border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">
              <Trophy className="w-3 h-3" />
              Campeón
            </div>
            <div className="text-sm font-semibold text-foreground truncate mt-0.5">{bestChampion ?? "—"}</div>
            <div className="text-xs text-muted-foreground/60">más jugado</div>
          </div>
        </div>

        {/* Streak message */}
        {(longestWinStreak >= 3 || longestLossStreak >= 3) && (
          <div className={cn(
            "mx-6 mb-4 px-3 py-2 rounded-lg text-xs font-medium border",
            longestWinStreak >= 3
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          )}>
            {longestWinStreak >= longestLossStreak
              ? `¡${longestWinStreak} victorias seguidas en esta sesión!`
              : `Racha de ${longestLossStreak} derrotas — quizás es momento de parar.`}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Cerrar resumen
          </button>
        </div>
      </motion.div>
    </div>
  );
}
