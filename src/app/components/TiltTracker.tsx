/**
 * TiltTracker — Mental health / tilt detection widget
 * 
 * Shows a "mental state" indicator with actionable suggestions.
 * Analysis logic lives in /src/app/utils/tiltAnalysis.ts
 */

import { motion, AnimatePresence } from "motion/react";
import { Brain, HeartPulse, AlertTriangle, Coffee, Flame, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "./ui/utils";
import { useState } from "react";
import type { MatchData } from "../utils/analytics";
import { useLanguage } from "../contexts/LanguageContext";
import { analyzeTilt, type MentalState } from "../utils/tiltAnalysis";

// Types & analyzeTilt live in /src/app/utils/tiltAnalysis.ts
// Import from there directly if needed outside this component.

// ─── UI Component ─────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<MentalState, { icon: typeof Brain; color: string; bg: string; ring: string }> = {
  "on-fire":  { icon: Flame,         color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  "focused":  { icon: Brain,         color: "text-primary",     bg: "bg-primary/10",     ring: "ring-primary/30" },
  "warming":  { icon: AlertTriangle, color: "text-amber-500",   bg: "bg-amber-500/10",   ring: "ring-amber-500/30" },
  "tilted":   { icon: HeartPulse,    color: "text-red-500",     bg: "bg-red-500/10",     ring: "ring-red-500/30" },
};

export function TiltTrackerWidget({ matches, className }: { matches: MatchData[]; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  const analysis = analyzeTilt(matches, t);
  const config = STATE_CONFIG[analysis.state];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden card-lift card-shine", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center gap-4 hover:bg-secondary/20 transition-colors cursor-pointer"
      >
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center ring-2", config.bg, config.ring)}>
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-[14px] font-semibold", config.color)}>{analysis.label}</span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {analysis.score}/100
            </span>
          </div>
          <span className="text-[12px] text-muted-foreground truncate w-full text-left">
            {analysis.description}
          </span>
        </div>
        {/* Tilt meter */}
        <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden shrink-0">
          <motion.div
            className={cn("h-full rounded-full",
              analysis.score <= 15 ? "bg-emerald-500" :
              analysis.score <= 35 ? "bg-primary" :
              analysis.score <= 60 ? "bg-amber-500" : "bg-red-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${analysis.score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border/40 pt-4">
              {/* Suggestion */}
              <div className={cn("flex items-start gap-3 p-3 rounded-xl", config.bg)}>
                <Coffee className={cn("w-4 h-4 shrink-0 mt-0.5", config.color)} />
                <span className="text-[13px] text-foreground leading-relaxed">{analysis.suggestion}</span>
              </div>

              {/* Factors */}
              {analysis.factors.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("tilt.detectedFactors")}</span>
                  {analysis.factors.map((factor, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-1.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        factor.impact === "positive" ? "bg-emerald-500" :
                        factor.impact === "negative" ? "bg-red-500" : "bg-muted-foreground"
                      )} />
                      <div className="flex flex-col">
                        <span className="text-[12px] font-medium text-foreground">{factor.label}</span>
                        <span className="text-[11px] text-muted-foreground">{factor.detail}</span>
                      </div>
                    </div>
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