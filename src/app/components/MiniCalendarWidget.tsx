/**
 * MiniCalendarWidget — Compact 7-day heatmap for Dashboard
 * Shows this week's performance at a glance with colored cells.
 */

import { useMemo } from "react";
import { CalendarDays, Flame } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import type { MatchData } from "../utils/analytics";
import { useNavigate } from "react-router";

interface DayInfo {
  label: string;
  date: string;
  games: number;
  wins: number;
  losses: number;
  isToday: boolean;
}

const DAY_KEYS = ["calendar.mon", "calendar.tue", "calendar.wed", "calendar.thu", "calendar.fri", "calendar.sat", "calendar.sun"];

function getCellColor(games: number, wins: number, losses: number): { bg: string; text: string } {
  if (games === 0) return { bg: "bg-secondary/50", text: "" };
  const wr = wins / games;
  if (wr >= 0.7) return { bg: "bg-emerald-500", text: "text-white" };
  if (wr >= 0.5) return { bg: "bg-emerald-500/30 border border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400" };
  if (wr >= 0.4) return { bg: "bg-amber-500/25 border border-amber-500/40", text: "text-amber-600 dark:text-amber-400" };
  return { bg: "bg-red-500/25 border border-red-500/40", text: "text-red-600 dark:text-red-400" };
}

export function MiniCalendarWidget({ matches, className }: { matches: MatchData[]; className?: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const week = useMemo((): DayInfo[] => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const days: DayInfo[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 86400000;
      const dayLabel = t(DAY_KEYS[i]);
      const dateStr = d.toISOString().slice(0, 10);
      const isToday = d.toDateString() === today.toDateString();

      const dayMatches = matches.filter(m => m.gameCreation >= dayStart && m.gameCreation < dayEnd);
      const players = dayMatches.map(m => m.participants[m.playerParticipantIndex]);
      const wins = players.filter(p => p.win).length;

      days.push({
        label: dayLabel,
        date: dateStr,
        games: dayMatches.length,
        wins,
        losses: dayMatches.length - wins,
        isToday,
      });
    }
    return days;
  }, [matches, t]);

  const totalGames = week.reduce((s, d) => s + d.games, 0);
  const totalWins = week.reduce((s, d) => s + d.wins, 0);
  const activeDays = week.filter(d => d.games > 0).length;

  return (
    <div
      className={cn("rounded-2xl border border-border/60 bg-card p-5 cursor-pointer hover:border-border/80 transition-colors card-lift card-shine", className)}
      onClick={() => navigate("/calendar")}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">{t("qol.thisWeek")}</span>
        </div>
        {activeDays >= 5 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
            <Flame className="w-3 h-3" />
            {t("qol.activeWeek")}
          </span>
        )}
      </div>

      {/* Heatmap row */}
      <div className="flex gap-1.5 mb-3">
        {week.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <span className={cn("text-[9px] font-medium uppercase", day.isToday ? "text-primary" : "text-muted-foreground/60")}>
              {day.label}
            </span>
            <div
              className={cn(
                "w-full aspect-square rounded-md transition-all flex items-center justify-center",
                getCellColor(day.games, day.wins, day.losses).bg,
                day.isToday && "ring-2 ring-primary/60 ring-offset-1 ring-offset-card"
              )}
              title={day.games > 0 ? `${day.wins}W ${day.losses}L` : "—"}
            >
              {day.games > 0 && (
                <span className={cn("text-[9px] font-bold", getCellColor(day.games, day.wins, day.losses).text)}>
                  {day.games}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span>{totalGames} {t("common.games").toLowerCase()}</span>
        {totalGames > 0 && (
          <>
            <span className="text-emerald-500">{totalWins}W</span>
            <span className="text-red-400">{totalGames - totalWins}L</span>
            <span className="ml-auto font-mono">{Math.round((totalWins / totalGames) * 100)}% WR</span>
          </>
        )}
      </div>
    </div>
  );
}
