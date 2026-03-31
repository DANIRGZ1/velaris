/**
 * TiltAlertBanner — Persistent in-layout tilt warning
 *
 * Appears at the top of the content area when the player has 3+ losses in a row.
 * Dismissed with a "Take a break" button that suppresses it for 30 minutes.
 */

import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X, Coffee, Flame, Timer } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "./ui/utils";
import type { MatchData } from "../utils/analytics";
import { notifyTilt } from "../services/notificationService";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const DISMISS_KEY = "velaris-tilt-dismissed-until";
const BREAK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const WARN_STREAK = 3; // losses in a row to trigger

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentStreak(matches: MatchData[]): { type: "win" | "loss"; count: number } {
  if (matches.length === 0) return { type: "win", count: 0 };
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  const first = sorted[0];
  const isWin = first.participants[first.playerParticipantIndex]?.win ?? true;
  let count = 0;
  for (const m of sorted) {
    const w = m.participants[m.playerParticipantIndex]?.win ?? true;
    if (w === isWin) count++;
    else break;
  }
  return { type: isWin ? "win" : "loss", count };
}

function isDismissed(): boolean {
  try {
    const until = localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + BREAK_DURATION_MS));
  } catch { /* ignore */ }
}

function formatBreakTime(): string {
  return "30 min";
}

// ─── Banner Messages ──────────────────────────────────────────────────────────

function getMessage(count: number, t: (k: string) => string): { title: string; sub: string } {
  const key = count >= 5 ? 5 : count >= 4 ? 4 : 3;
  return {
    title: t(`tilt.banner.${key}.title`),
    sub: t(`tilt.banner.${key}.sub`),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TiltAlertBannerProps {
  matches: MatchData[];
}

export function TiltAlertBanner({ matches }: TiltAlertBannerProps) {
  const [visible, setVisible] = useState(false);
  const [streak, setStreak] = useState(0);
  const [breakTaken, setBreakTaken] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (matches.length === 0) return;
    if (isDismissed()) return;

    const { type, count } = getCurrentStreak(matches);
    if (type === "loss" && count >= WARN_STREAK) {
      setStreak(count);
      setVisible(true);
      notifyTilt(count); // OS notification
    }
  }, [matches]);

  const handleDismiss = () => {
    dismiss();
    setBreakTaken(true);
    setTimeout(() => setVisible(false), 1500);
  };

  const handleClose = () => {
    setVisible(false);
  };

  const msg = getMessage(streak, t);
  const isSevere = streak >= 5;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className={cn(
            "mx-0 mb-4 p-3.5 rounded-xl border flex items-start gap-3",
            isSevere
              ? "bg-red-500/8 border-red-500/30"
              : "bg-amber-500/8 border-amber-500/30"
          )}>
            {/* Icon */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              isSevere ? "bg-red-500/15" : "bg-amber-500/15"
            )}>
              {breakTaken
                ? <Coffee className="w-4 h-4 text-emerald-500" />
                : <AlertTriangle className={cn("w-4 h-4", isSevere ? "text-red-500" : "text-amber-500")} />
              }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {breakTaken ? (
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-[13px] font-semibold text-emerald-500">
                    {t("tilt.banner.breakConfirm").replace("{time}", formatBreakTime())}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn(
                      "text-[13px] font-bold",
                      isSevere ? "text-red-500" : "text-amber-500"
                    )}>
                      {msg.title}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {t("tilt.banner.alert")}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{msg.sub}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleDismiss}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors",
                        isSevere
                          ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                          : "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                      )}
                    >
                      <Timer className="w-3 h-3" />
                      {t("tilt.banner.takeBreak").replace("{time}", formatBreakTime())}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Close */}
            {!breakTaken && (
              <button
                onClick={handleClose}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-secondary/60 transition-colors shrink-0"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
