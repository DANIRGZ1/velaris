/**
 * CelebrationHistory — A dropdown panel showing past celebrations.
 *
 * Persists to localStorage so achievements survive across sessions.
 * Accessible via a Sparkles icon button, typically placed in the sidebar or header.
 */

import { motion, AnimatePresence } from "motion/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Trash2, Crown, Zap, Target, Eye, Flame, Shield, Swords, Crosshair, ChevronUp, Trophy } from "lucide-react";
import { cn } from "../ui/utils";
import { useLanguage } from "../../contexts/LanguageContext";
import type { AchievementCelebration, RankUpCelebration, Celebration } from "../../services/celebrationService";

// ─── Storage ──────────────────────────────────────────────────────────────────

const HISTORY_KEY = "velaris-celebration-history";
const MAX_HISTORY = 50;

export interface CelebrationHistoryEntry {
  celebration: Celebration;
  timestamp: number;
}

export function getCelebrationHistory(): CelebrationHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function addToCelebrationHistory(celebration: Celebration): void {
  try {
    const history = getCelebrationHistory();
    history.unshift({ celebration, timestamp: Date.now() });
    // Keep only the most recent entries
    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function clearCelebrationHistory(): void {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Zap> = {
  zap: Zap, crown: Crown, target: Target, eye: Eye,
  flame: Flame, shield: Shield, swords: Swords, crosshair: Crosshair,
};

// ─── Time Formatting ──────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CelebrationHistoryButton() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<CelebrationHistoryEntry[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setEntries(getCelebrationHistory());
  }, []);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const hasEntries = entries.length > 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
          isOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        )}
        title={t("celebration.history")}
      >
        <Sparkles className="w-4 h-4" />
        {hasEntries && !isOpen && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-[340px] max-h-[420px] bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/20 z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{t("celebration.history")}</span>
                {hasEntries && (
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-md">
                    {entries.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {hasEntries && (
                  <button
                    onClick={() => {
                      clearCelebrationHistory();
                      refresh();
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title={t("celebration.history.clear")}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary/60 text-muted-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 scrollbar-thin">
              {!hasEntries ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{t("celebration.history.empty")}</p>
                </div>
              ) : (
                <div className="py-1">
                  {entries.map((entry, i) => (
                    <HistoryItem key={`${entry.timestamp}-${i}`} entry={entry} t={t} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Single History Item ──────────────────────────────────────────────────────

function HistoryItem({ entry, t }: { entry: CelebrationHistoryEntry; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const { celebration, timestamp } = entry;

  if (celebration.type === "rankup") {
    const ru = celebration as RankUpCelebration;
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <ChevronUp className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-foreground truncate">
            {t("celebration.promoted")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {ru.previousRank} {ru.previousDivision} → {ru.newRank} {ru.newDivision}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground/60 font-mono flex-shrink-0">{timeAgo(timestamp)}</span>
      </div>
    );
  }

  const ach = celebration as AchievementCelebration;
  const Icon = ICON_MAP[ach.icon] || Zap;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border border-border/40"
        style={{ background: ach.glowColor.replace(/[\d.]+\)$/, "0.1)") }}
      >
        <Icon className={cn("w-3.5 h-3.5", ach.color)} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground truncate">
          {t(ach.title, ach.vars)}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {t(ach.subtitle, ach.vars)}
        </p>
      </div>
      <span className="text-[10px] text-muted-foreground/60 font-mono flex-shrink-0">{timeAgo(timestamp)}</span>
    </div>
  );
}
