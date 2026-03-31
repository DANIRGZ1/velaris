/**
 * GoalsSummaryWidget — Velaris
 * 
 * Compact Goals progress display for the Dashboard.
 * Reads goals from localStorage and shows active goal bars.
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Target, Trophy, ChevronRight, Plus } from "lucide-react";
import { cn } from "./ui/utils";
import { useNavigate } from "react-router";
import { useLanguage } from "../contexts/LanguageContext";

interface Goal {
  id: string;
  type: string;
  title: string;
  target: number;
  current: number;
  completedAt?: number;
  icon: string;
}

const GOALS_KEY = "velaris-goals";

function loadGoals(): Goal[] {
  try {
    const stored = localStorage.getItem(GOALS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function GoalsSummaryWidget({ className }: { className?: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    setGoals(loadGoals());
  }, []);

  const activeGoals = goals.filter(g => !g.completedAt);
  const completedCount = goals.filter(g => g.completedAt).length;

  if (goals.length === 0) {
    return (
      <button
        onClick={() => navigate("/goals")}
        className={cn(
          "p-4 rounded-2xl border-2 border-dashed border-border/40 bg-card/50 flex items-center gap-3 hover:border-primary/30 hover:bg-card transition-all duration-200 group cursor-pointer w-full",
          className
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <div className="text-left flex-1">
          <p className="text-[13px] font-medium text-foreground">{t("goalsWidget.setFirst")}</p>
          <p className="text-[11px] text-muted-foreground">{t("goalsWidget.setFirstDesc")}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </button>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-5 flex flex-col gap-3 card-lift card-shine", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("goalsWidget.title")}</h3>
        </div>
        <button
          onClick={() => navigate("/goals")}
          className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
        >
          {t("goalsWidget.viewAll")} <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-4 text-[11px]">
        <span className="text-muted-foreground">
          <span className="font-mono font-bold text-foreground">{activeGoals.length}</span> {t("goalsWidget.active")}
        </span>
        {completedCount > 0 && (
          <span className="text-muted-foreground">
            <span className="font-mono font-bold text-emerald-500">{completedCount}</span> {t("goalsWidget.completed")}
          </span>
        )}
      </div>

      {/* Active goal bars (top 3) */}
      <div className="flex flex-col gap-2.5">
        {activeGoals.slice(0, 3).map(goal => {
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          return (
            <div key={goal.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-foreground truncate">{goal.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {goal.current}/{goal.target}
                </span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {activeGoals.length > 3 && (
        <span className="text-[10px] text-muted-foreground text-center">{t("goalsWidget.moreGoals", { count: activeGoals.length - 3 })}</span>
      )}
    </div>
  );
}