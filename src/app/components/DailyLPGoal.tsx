/**
 * DailyLPGoal — Daily + Weekly LP target tracker shown in the sidebar
 *
 * User sets a target LP gain for the day (e.g. +50 LP) and for the week
 * (e.g. +300 LP). Progress is computed from LP snapshots recorded today / last 7 days.
 */
import { useState, useMemo } from "react";
import { Target, Pencil, Check, X, CalendarDays } from "lucide-react";
import { getLPHistory } from "../services/lpTracker";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";

export const WEEKLY_GOAL_KEY = "velaris-weekly-lp-goal";

const GOAL_KEY = "velaris-daily-lp-goal";

function getTodayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getWeekStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Monday = start of week (day 1); Sunday = 0 → treat as 7
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d.getTime();
}

type EditTarget = "daily" | "weekly" | null;

export function DailyLPGoal() {
  const { t } = useLanguage();

  const [goal, setGoal] = useState<number>(() => {
    try { return Math.max(1, parseInt(localStorage.getItem(GOAL_KEY) ?? "50", 10) || 50); }
    catch { return 50; }
  });
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() => {
    try { return Math.max(1, parseInt(localStorage.getItem(WEEKLY_GOAL_KEY) ?? "300", 10) || 300); }
    catch { return 300; }
  });

  const [editing, setEditing] = useState<EditTarget>(null);
  const [input, setInput] = useState("");

  const { gained, weeklyGained } = useMemo(() => {
    const history = getLPHistory();
    const todaySnaps = history.filter(s => s.timestamp >= getTodayStart());
    const weekSnaps  = history.filter(s => s.timestamp >= getWeekStart());

    const gained = todaySnaps.length >= 1
      ? todaySnaps[todaySnaps.length - 1].totalLP - todaySnaps[0].totalLP
      : 0;

    const weeklyGained = weekSnaps.length >= 1
      ? weekSnaps[weekSnaps.length - 1].totalLP - weekSnaps[0].totalLP
      : 0;

    return { gained, weeklyGained };
  }, []);

  const pct       = Math.min(Math.max(gained / goal, 0), 1);
  const weeklyPct = Math.min(Math.max(weeklyGained / weeklyGoal, 0), 1);
  const isComplete       = gained >= goal;
  const isWeeklyComplete = weeklyGained >= weeklyGoal;

  const startEdit = (target: EditTarget) => {
    setInput(String(target === "daily" ? goal : weeklyGoal));
    setEditing(target);
  };

  const saveGoal = () => {
    const n = parseInt(input, 10);
    if (!isNaN(n) && n > 0) {
      if (editing === "daily") {
        setGoal(n);
        try { localStorage.setItem(GOAL_KEY, String(n)); } catch {}
      } else if (editing === "weekly") {
        setWeeklyGoal(n);
        try { localStorage.setItem(WEEKLY_GOAL_KEY, String(n)); } catch {}
      }
    }
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  const editRow = (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") cancelEdit(); }}
        className="w-14 text-[11px] bg-background border border-border rounded px-1.5 py-0.5 text-right font-mono focus:outline-none focus:border-primary"
        placeholder={String(editing === "daily" ? goal : weeklyGoal)}
      />
      <button onClick={saveGoal} className="cursor-pointer"><Check className="w-3 h-3 text-emerald-500" /></button>
      <button onClick={cancelEdit} className="cursor-pointer"><X className="w-3 h-3 text-muted-foreground" /></button>
    </div>
  );

  return (
    <div className="mx-3 mb-2 p-3 rounded-xl border border-border/30 bg-secondary/15 space-y-3">

      {/* ── Daily goal ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Target className={cn("w-3 h-3 shrink-0", isComplete ? "text-emerald-500" : "text-primary")} />
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">{t("lp.goal.title")}</span>
          </div>
          {editing === "daily" ? editRow : (
            <button
              onClick={() => startEdit("daily")}
              className="cursor-pointer hover:text-foreground transition-colors"
            >
              <Pencil className="w-3 h-3 text-muted-foreground/60" />
            </button>
          )}
        </div>

        <div className="flex items-baseline gap-1 mb-1.5">
          <span className={cn(
            "text-[18px] font-mono font-bold tabular-nums leading-none",
            isComplete ? "text-emerald-500" : gained < 0 ? "text-red-400" : "text-foreground"
          )}>
            {gained >= 0 ? "+" : ""}{gained}
          </span>
          <span className="text-[11px] text-muted-foreground">/ {goal} LP</span>
        </div>

        <div className="h-1 rounded-full bg-secondary/60 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isComplete ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${pct * 100}%` }}
          />
        </div>

        {isComplete && (
          <p className="text-[10px] text-emerald-500 mt-1.5 font-semibold">{t("lp.goal.reached")}</p>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-border/25" />

      {/* ── Weekly goal ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className={cn("w-3 h-3 shrink-0", isWeeklyComplete ? "text-emerald-500" : "text-primary/70")} />
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">{t("lp.weekly.title")}</span>
          </div>
          {editing === "weekly" ? editRow : (
            <button
              onClick={() => startEdit("weekly")}
              className="cursor-pointer hover:text-foreground transition-colors"
            >
              <Pencil className="w-3 h-3 text-muted-foreground/60" />
            </button>
          )}
        </div>

        <div className="flex items-baseline gap-1 mb-1.5">
          <span className={cn(
            "text-[15px] font-mono font-bold tabular-nums leading-none",
            isWeeklyComplete ? "text-emerald-500" : weeklyGained < 0 ? "text-red-400" : "text-foreground"
          )}>
            {weeklyGained >= 0 ? "+" : ""}{weeklyGained}
          </span>
          <span className="text-[11px] text-muted-foreground">/ {weeklyGoal} LP</span>
        </div>

        <div className="h-0.5 rounded-full bg-secondary/60 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isWeeklyComplete ? "bg-emerald-500" : "bg-primary/70"
            )}
            style={{ width: `${weeklyPct * 100}%` }}
          />
        </div>

        {isWeeklyComplete && (
          <p className="text-[10px] text-emerald-500 mt-1.5 font-semibold">{t("lp.weekly.reached")}</p>
        )}
      </div>

    </div>
  );
}
