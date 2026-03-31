/**
 * DailyLPGoal — Daily LP target tracker shown in the sidebar
 *
 * User sets a target LP gain for the day (e.g. +50 LP).
 * Progress is computed from LP snapshots recorded today.
 */
import { useState, useMemo } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import { getLPHistory } from "../services/lpTracker";
import { cn } from "./ui/utils";

const GOAL_KEY = "velaris-daily-lp-goal";

function getTodayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function DailyLPGoal() {
  const [goal, setGoal] = useState<number>(() => {
    try { return Math.max(1, parseInt(localStorage.getItem(GOAL_KEY) ?? "50", 10) || 50); }
    catch { return 50; }
  });
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const { gained } = useMemo(() => {
    const history = getLPHistory();
    const todaySnaps = history.filter(s => s.timestamp >= getTodayStart());
    if (todaySnaps.length < 1) return { gained: 0 };
    const gained = todaySnaps[todaySnaps.length - 1].totalLP - todaySnaps[0].totalLP;
    return { gained };
  }, []);

  const pct = Math.min(Math.max(gained / goal, 0), 1);
  const isComplete = gained >= goal;

  const saveGoal = () => {
    const n = parseInt(input, 10);
    if (!isNaN(n) && n > 0) {
      setGoal(n);
      try { localStorage.setItem(GOAL_KEY, String(n)); } catch {}
    }
    setEditing(false);
  };

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl border border-border/40 bg-secondary/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Target className={cn("w-3 h-3 shrink-0", isComplete ? "text-emerald-500" : "text-primary")} />
          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Meta LP hoy</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") setEditing(false); }}
              className="w-14 text-[11px] bg-background border border-border rounded px-1.5 py-0.5 text-right font-mono focus:outline-none focus:border-primary"
              placeholder={String(goal)}
            />
            <button onClick={saveGoal} className="cursor-pointer"><Check className="w-3 h-3 text-emerald-500" /></button>
            <button onClick={() => setEditing(false)} className="cursor-pointer"><X className="w-3 h-3 text-muted-foreground" /></button>
          </div>
        ) : (
          <button
            onClick={() => { setInput(String(goal)); setEditing(true); }}
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
        <p className="text-[10px] text-emerald-500 mt-1.5 font-semibold">Meta alcanzada hoy ✓</p>
      )}
    </div>
  );
}
