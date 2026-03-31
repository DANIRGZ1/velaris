/**
 * TiltBreakModal — Full-screen blocking overlay after 4+ losses in a row
 *
 * Shows a mandatory countdown timer. Dismissible early with "take break" button.
 * Separate from TiltAlertBanner (which is just a soft warning at 3 losses).
 */
import { motion, AnimatePresence } from "motion/react";
import { Coffee, Flame, Brain, TrendingDown, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { MatchData } from "../utils/analytics";

const BLOCK_STREAK = 4;
const COUNTDOWN_SECS = 5 * 60; // 5 minutes
const DISMISS_KEY = "velaris-tiltbreak-until";
const BREAK_DURATION_MS = 30 * 60 * 1000;

function isBlocked(): boolean {
  try {
    const until = localStorage.getItem(DISMISS_KEY);
    return !!until && Date.now() < Number(until);
  } catch { return false; }
}

function recordBreak() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now() + BREAK_DURATION_MS)); } catch {}
}

function getLossStreak(matches: MatchData[]): number {
  if (!matches.length) return 0;
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  let count = 0;
  for (const m of sorted) {
    const win = m.participants[m.playerParticipantIndex]?.win ?? true;
    if (!win) count++;
    else break;
  }
  return count;
}

interface Props { matches: MatchData[] }

export function TiltBreakModal({ matches }: Props) {
  const [show, setShow] = useState(false);
  const [streak, setStreak] = useState(0);
  const [secsLeft, setSecsLeft] = useState(COUNTDOWN_SECS);

  // Trigger modal — reset all state when re-triggered
  useEffect(() => {
    if (isBlocked()) return;
    const n = getLossStreak(matches);
    if (n >= BLOCK_STREAK) {
      setStreak(n);
      setSecsLeft(COUNTDOWN_SECS);
      setShow(true);
    }
  }, [matches]);

  // Countdown tick
  useEffect(() => {
    if (!show) return;
    const id = setInterval(() => {
      setSecsLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [show]);

  const close = useCallback(() => {
    recordBreak();
    setShow(false);
  }, []);

  // Force-close without recording a break (escape hatch)
  const forceClose = useCallback(() => {
    setShow(false);
  }, []);

  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const progress = secsLeft / COUNTDOWN_SECS;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-sm w-full mx-6 p-8 rounded-2xl border border-red-500/25 bg-card shadow-2xl text-center relative"
          >
            {/* Always-visible escape button */}
            <button
              onClick={forceClose}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-red-500/12 flex items-center justify-center mx-auto mb-5">
              <Flame className="w-8 h-8 text-red-400" />
            </div>

            {/* Headline */}
            <h2 className="text-[20px] font-bold text-foreground mb-1">
              {streak} derrotas seguidas
            </h2>
            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
              Velaris detectó tilt. Un break corto es la jugada más rentable ahora mismo.
            </p>

            {/* Stats row */}
            <div className="flex justify-center gap-6 mb-6 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                <span>{streak} pérdidas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span>Toma un respiro</span>
              </div>
            </div>

            {/* Countdown */}
            <div className="mb-6">
              {secsLeft > 0 ? (
                <>
                  <div className="text-[42px] font-mono font-bold text-red-400 tabular-nums leading-none mb-2">
                    {mins}:{String(secs).padStart(2, "0")}
                  </div>
                  <p className="text-[11px] text-muted-foreground/50 mb-3">Break recomendado</p>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full bg-red-500/50 rounded-full"
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-emerald-500 font-semibold text-sm">
                  ¡Timer completado! Ya puedes continuar.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={close}
                className="w-full py-2.5 rounded-xl bg-emerald-500/12 text-emerald-500 font-semibold text-[13px] hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Coffee className="w-4 h-4" />
                Me levanto a descansar
              </button>
              {secsLeft === 0 && (
                <button
                  onClick={close}
                  className="w-full py-2 rounded-xl text-muted-foreground text-[12px] hover:text-foreground transition-colors cursor-pointer"
                >
                  Continuar de todas formas
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
