/**
 * AchievementToast — Premium celebration toast for great game performances.
 *
 * Visual language:
 * • Floating card with a glowing left accent border
 * • Shimmer animation that sweeps across once
 * • Soft entrance from bottom-right with spring physics
 * • Auto-dismiss with a progress bar that drains elegantly
 */

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { X, Zap, Crown, Target, Eye, Flame, Shield, Swords, Crosshair } from "lucide-react";
import { cn } from "../ui/utils";
import type { AchievementCelebration } from "../../services/celebrationService";
import { useLanguage } from "../../contexts/LanguageContext";

const ICON_MAP: Record<string, typeof Zap> = {
  zap: Zap,
  crown: Crown,
  target: Target,
  eye: Eye,
  flame: Flame,
  shield: Shield,
  swords: Swords,
  crosshair: Crosshair,
};

const DISPLAY_DURATION = 6000; // ms

interface AchievementToastProps {
  celebration: AchievementCelebration;
  onDismiss: () => void;
}

export function AchievementToast({ celebration, onDismiss }: AchievementToastProps) {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  const Icon = ICON_MAP[celebration.icon] || Zap;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 500);
    }, DISPLAY_DURATION);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, scale: 0.97, filter: "blur(4px)" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/20 w-[340px]"
        >
          {/* Glow accent — left border */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
            style={{ background: `linear-gradient(180deg, ${celebration.glowColor}, transparent)` }}
          />

          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
            style={{
              background: `linear-gradient(90deg, transparent, ${celebration.glowColor.replace(")", ", 0.08)")}, transparent)`,
              width: "50%",
            }}
          />

          <div className="relative flex items-start gap-3.5 px-4 py-3.5">
            {/* Icon with radial glow */}
            <div className="relative flex-shrink-0 mt-0.5">
              <motion.div
                className="absolute inset-0 rounded-xl blur-md"
                style={{ background: celebration.glowColor }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.6, 0.3], scale: [0.5, 1.3, 1] }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <div
                className={cn(
                  "relative w-9 h-9 rounded-xl flex items-center justify-center",
                  "bg-background/80 border border-border/40"
                )}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Icon className={cn("w-4.5 h-4.5", celebration.color)} strokeWidth={2} />
                </motion.div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <motion.p
                className="text-[13px] font-semibold text-foreground leading-tight"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {t(celebration.title, celebration.vars)}
              </motion.p>
              <motion.p
                className="text-[11px] text-muted-foreground mt-0.5 leading-snug"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                {t(celebration.subtitle, celebration.vars)}
              </motion.p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onDismiss, 400);
              }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors mt-0.5"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Progress drain bar */}
          <div className="h-[2px] w-full bg-border/20">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${celebration.glowColor}, transparent)`,
              }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: DISPLAY_DURATION / 1000, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Container for stacking multiple toasts ──────────────────────────────────

interface AchievementToastStackProps {
  celebrations: AchievementCelebration[];
  onDismiss: (index: number) => void;
}

export function AchievementToastStack({ celebrations, onDismiss }: AchievementToastStackProps) {
  if (celebrations.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col-reverse gap-3 pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {celebrations.map((c, i) => (
          <motion.div
            key={`achievement-${i}-${c.title}`}
            layout
            transition={{ layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
          >
            <AchievementToast celebration={c} onDismiss={() => onDismiss(i)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
