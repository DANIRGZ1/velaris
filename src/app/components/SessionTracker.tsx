import { Clock, TrendingUp, TrendingDown, Minus, Gamepad2, Target, Check, X } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import type { MatchData } from "../utils/analytics";

interface SessionTrackerProps {
  matches: MatchData[];
}

const SESSION_GOAL_KEY = "velaris-session-goal";

export function SessionTracker({ matches }: SessionTrackerProps) {
  const { t } = useLanguage();
  const [sessionGoal, setSessionGoal] = useState<string>(() => {
    try { return localStorage.getItem(SESSION_GOAL_KEY) || ""; } catch { return ""; }
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  // Filter matches from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  const todayMatches = matches.filter((m) => m.gameCreation >= todayTs);

  const saveGoal = (val: string) => {
    setSessionGoal(val);
    setEditingGoal(false);
    try { if (val) localStorage.setItem(SESSION_GOAL_KEY, val); else localStorage.removeItem(SESSION_GOAL_KEY); } catch {}
  };

  if (todayMatches.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 card-lift card-shine">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-foreground">{t("session.title")}</h4>
            <p className="text-[12px] text-muted-foreground mt-0.5">{t("session.noGames")}</p>
          </div>
        </div>
        {/* Session goal */}
        <SessionGoalBlock goal={sessionGoal} editing={editingGoal} input={goalInput}
          setEditing={setEditingGoal} setInput={setGoalInput} onSave={saveGoal} t={t} />
      </div>
    );
  }

  const playerGames = todayMatches.map((m) => ({
    match: m,
    player: m.participants[m.playerParticipantIndex],
  }));

  const wins = playerGames.filter((g) => g.player.win).length;
  const losses = playerGames.length - wins;
  const netResult = wins - losses;
  const totalTimeSeconds = playerGames.reduce((s, g) => s + g.match.gameDuration, 0);
  const totalMinutes = Math.floor(totalTimeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  // Calculate average KDA for the session
  const totalKills = playerGames.reduce((s, g) => s + g.player.kills, 0);
  const totalDeaths = playerGames.reduce((s, g) => s + g.player.deaths, 0);
  const totalAssists = playerGames.reduce((s, g) => s + g.player.assists, 0);
  const avgKDA = totalDeaths > 0
    ? ((totalKills + totalAssists) / totalDeaths).toFixed(1)
    : (totalKills + totalAssists).toFixed(1);

  // Win streak / loss streak
  const sortedByTime = [...playerGames].sort((a, b) => b.match.gameCreation - a.match.gameCreation);
  let streak = 0;
  const streakWin = sortedByTime[0]?.player.win;
  for (const g of sortedByTime) {
    if (g.player.win === streakWin) streak++;
    else break;
  }

  const isPositive = netResult > 0;
  const isNegative = netResult < 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 card-lift card-shine">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
            isPositive ? "bg-emerald-500/10" : isNegative ? "bg-destructive/10" : "bg-secondary"
          )}>
            {isPositive ? (
              <TrendingUp className="w-4.5 h-4.5 text-emerald-500" />
            ) : isNegative ? (
              <TrendingDown className="w-4.5 h-4.5 text-destructive" />
            ) : (
              <Minus className="w-4.5 h-4.5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-foreground">{t("session.title")}</h4>
            <p className="text-[11px] text-muted-foreground">{t("session.todaysSummary")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeStr}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {/* Games */}
        <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50 border border-border/40">
          <span className="text-[20px] font-mono font-bold text-foreground">{todayMatches.length}</span>
          <span className="text-[9px] text-muted-foreground/70 font-semibold uppercase tracking-wider mt-0.5">{t("session.games")}</span>
        </div>

        {/* W/L */}
        <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50 border border-border/40">
          <div className="flex items-center gap-0.5">
            <span className="text-[20px] font-mono font-bold text-emerald-500">{wins}</span>
            <span className="text-[13px] font-mono text-muted-foreground/40 mx-0.5">/</span>
            <span className="text-[20px] font-mono font-bold text-destructive">{losses}</span>
          </div>
          <span className="text-[9px] text-muted-foreground/70 font-semibold uppercase tracking-wider mt-0.5">W / L</span>
        </div>

        {/* Net */}
        <div className={cn(
          "flex flex-col items-center p-3 rounded-xl border",
          isPositive ? "bg-emerald-500/8 border-emerald-500/20" :
          isNegative ? "bg-destructive/8 border-destructive/20" :
          "bg-secondary/50 border-border/40"
        )}>
          <span className={cn(
            "text-[20px] font-mono font-bold",
            isPositive ? "text-emerald-500" : isNegative ? "text-destructive" : "text-muted-foreground"
          )}>
            {netResult > 0 ? `+${netResult}` : netResult}
          </span>
          <span className="text-[9px] text-muted-foreground/70 font-semibold uppercase tracking-wider mt-0.5">{t("session.net")}</span>
        </div>

        {/* KDA */}
        <div className={cn(
          "flex flex-col items-center p-3 rounded-xl border",
          parseFloat(avgKDA) >= 3 ? "bg-primary/8 border-primary/20" : "bg-secondary/50 border-border/40"
        )}>
          <span className={cn(
            "text-[20px] font-mono font-bold",
            parseFloat(avgKDA) >= 3 ? "text-primary" : "text-foreground"
          )}>
            {avgKDA}
          </span>
          <span className="text-[9px] text-muted-foreground/70 font-semibold uppercase tracking-wider mt-0.5">KDA</span>
        </div>
      </div>

      {/* Win/Loss bar */}
      <div className="mt-3 flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-secondary/60">
        {wins > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-700 ease-out shadow-[1px_0_4px_rgba(34,197,94,0.4)]"
            style={{ width: `${(wins / todayMatches.length) * 100}%` }}
          />
        )}
        {losses > 0 && (
          <div
            className="bg-destructive transition-all duration-700 ease-out"
            style={{ width: `${(losses / todayMatches.length) * 100}%` }}
          />
        )}
      </div>

      {/* Streak */}
      {streak >= 2 && (
        <div className="mt-3 flex items-center justify-center">
          <span className={cn(
            "text-[11px] font-semibold px-2.5 py-1 rounded-full",
            streakWin ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
          )}>
            {streak} {streakWin ? t("session.winStreak") : t("session.lossStreak")}
          </span>
        </div>
      )}

      {/* Session goal */}
      <div className="mt-3 pt-3 border-t border-border/40">
        <SessionGoalBlock goal={sessionGoal} editing={editingGoal} input={goalInput}
          setEditing={setEditingGoal} setInput={setGoalInput} onSave={saveGoal} t={t} />
      </div>
    </div>
  );
}

interface SessionGoalBlockProps {
  goal: string;
  editing: boolean;
  input: string;
  setEditing: (v: boolean) => void;
  setInput: (v: string) => void;
  onSave: (v: string) => void;
  t: (key: string) => string;
}

function SessionGoalBlock({ goal, editing, input, setEditing, setInput, onSave, t }: SessionGoalBlockProps) {
  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-primary shrink-0" />
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSave(input.trim()); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          placeholder={t("session.goalPlaceholder") || "e.g. Win 3 games, 7+ CS/min..."}
          className="flex-1 text-[11px] bg-transparent border-b border-primary/40 focus:outline-none text-foreground placeholder-muted-foreground/50 py-0.5"
        />
        <button onClick={() => onSave(input.trim())} className="text-emerald-500 hover:text-emerald-400 cursor-pointer">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground/40 hover:text-muted-foreground cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }
  if (goal) {
    return (
      <div className="flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[11px] text-foreground flex-1">{goal}</span>
        <button onClick={() => { setInput(goal); setEditing(true); }}
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground cursor-pointer">
          {t("common.edit") || "Edit"}
        </button>
        <button onClick={() => onSave("")} className="text-muted-foreground/40 hover:text-destructive cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }
  return (
    <button onClick={() => { setInput(""); setEditing(true); }}
      className="flex items-center gap-2 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer w-full">
      <Target className="w-3.5 h-3.5" />
      {t("session.setGoal") || "Set a session goal..."}
    </button>
  );
}
