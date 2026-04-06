/**
 * RankUpCelebration — full-screen overlay that fires when a rank-up
 * is detected by checkRankUp() in extendedAnalytics.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, X } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import type { RankUpEvent } from "../services/extendedAnalytics";

const RANK_HEX: Record<string, string> = {
  IRON: "#a8a29e", BRONZE: "#b45309", SILVER: "#94a3b8", GOLD: "#eab308",
  PLATINUM: "#22d3ee", EMERALD: "#34d399", DIAMOND: "#60a5fa",
  MASTER: "#a78bfa", GRANDMASTER: "#f87171", CHALLENGER: "#fbbf24",
};

function tierOf(rankStr: string): string {
  return rankStr.split(" ")[0]?.toUpperCase() ?? "IRON";
}

interface Props {
  event: RankUpEvent;
  onClose: () => void;
}

export function RankUpCelebration({ event, onClose }: Props) {
  const { t } = useLanguage();
  const toTier  = tierOf(event.to);
  const accent  = RANK_HEX[toTier] ?? "#6366f1";

  // Auto-close after 8s
  useEffect(() => {
    const id = setTimeout(onClose, 8000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at center, ${accent}12 0%, transparent 70%)` }}
        />

        {/* Card */}
        <motion.div
          className="relative z-10 pointer-events-auto flex flex-col items-center gap-4 px-10 py-8 rounded-3xl border shadow-2xl text-center"
          style={{
            background: "linear-gradient(135deg, #0d0f14 60%, #13161d)",
            borderColor: accent + "40",
            boxShadow: `0 0 80px ${accent}25`,
          }}
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glow ring */}
          <motion.div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: accent + "18", border: `2px solid ${accent}40` }}
            animate={{ boxShadow: [`0 0 20px ${accent}30`, `0 0 50px ${accent}50`, `0 0 20px ${accent}30`] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Trophy className="w-9 h-9" style={{ color: accent }} />
          </motion.div>

          <div>
            <p className="text-[12px] text-muted-foreground uppercase tracking-widest mb-1">
              {t("rankup.label")}
            </p>
            <h2 className="text-[26px] font-bold text-foreground leading-tight">
              {t("rankup.title")}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[14px] text-muted-foreground font-medium">{event.from}</span>
            <span className="text-[18px] text-muted-foreground">→</span>
            <span className="text-[18px] font-bold" style={{ color: accent }}>{event.to}</span>
          </div>

          <p className="text-[13px] text-muted-foreground max-w-[260px]">
            {t("rankup.desc")}
          </p>

          <button
            onClick={onClose}
            className="mt-1 flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all hover:opacity-80"
            style={{ background: accent + "20", color: accent, border: `1px solid ${accent}40` }}
          >
            {t("rankup.cta")}
          </button>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 cursor-pointer text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Controller hook — used in Layout ────────────────────────────────────────

export function useRankUpCelebration() {
  const [rankUpEvent, setRankUpEvent] = useState<RankUpEvent | null>(null);

  const triggerIfRankUp = (rank: string, division: string) => {
    import("../services/extendedAnalytics").then(({ checkRankUp }) => {
      const event = checkRankUp(rank, division);
      if (event) setRankUpEvent(event);
    });
  };

  const dismiss = () => setRankUpEvent(null);

  return { rankUpEvent, triggerIfRankUp, dismiss };
}
