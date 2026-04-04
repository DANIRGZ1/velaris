/**
 * Performance Calendar — Velaris
 *
 * GitHub-style contribution heatmap showing daily performance.
 * Each cell represents a day, colored by win-rate.
 * Click to see match list with queue type, champion, KDA.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Flame, Trophy, Swords, Gamepad2, LayoutGrid, Calendar, Clock, AlertCircle } from "lucide-react";
import { cn } from "../components/ui/utils";
import { getMatchHistory } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import { CalendarSkeleton } from "../components/Skeletons";
import { usePatchVersion } from "../hooks/usePatchVersion";
import type { MatchData } from "../utils/analytics";
import { useLanguage } from "../contexts/LanguageContext";
import { PageHeader } from "../components/PageHeader";

// ─── Queue meta ───────────────────────────────────────────────────────────────

interface QueueMeta { label: string; short: string; color: string; bg: string }

const QUEUE_META: Record<number, QueueMeta> = {
  420: { label: "Solo/Duo",  short: "SOLOQ", color: "#60a5fa", bg: "rgba(59,130,246,0.15)" },
  440: { label: "Flex",      short: "FLEX",  color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
  450: { label: "ARAM",      short: "ARAM",  color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  400: { label: "Normal",    short: "NORM",  color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  430: { label: "Normal",    short: "NORM",  color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  490: { label: "Quickplay", short: "QUICK", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function getQueueMeta(queueId: number): QueueMeta {
  return QUEUE_META[queueId] ?? { label: "Custom", short: "CUST", color: "#6b7280", bg: "rgba(107,114,128,0.1)" };
}

const RANKED_QUEUE_IDS = new Set([420, 440]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayData {
  date: string;
  games: number;
  wins: number;
  losses: number;
  lpDelta: number;
  rankedGames: number;
  avgKda: number;
  bestChampion?: string;
  queueBreakdown: Record<string, number>; // short → count
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_KEYS = [
  "month.jan", "month.feb", "month.mar", "month.apr", "month.may", "month.jun",
  "month.jul", "month.aug", "month.sep", "month.oct", "month.nov", "month.dec",
];

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getLevel(day: DayData | undefined): number {
  if (!day || day.games === 0) return 0;
  const wr = day.wins / day.games;
  if (day.games >= 3 && wr >= 0.7) return 4;
  if (day.games >= 2 && wr >= 0.6) return 3;
  if (wr >= 0.5) return 2;
  if (day.games >= 1) return 1;
  return 0;
}

const LEVEL_COLORS = [
  "bg-secondary/40",
  "bg-red-500/25 dark:bg-red-400/20",
  "bg-amber-500/30 dark:bg-amber-400/25",
  "bg-emerald-500/35 dark:bg-emerald-400/30",
  "bg-emerald-500/60 dark:bg-emerald-400/55",
];

const LEVEL_BORDERS = [
  "border-white/5",
  "border-red-500/20",
  "border-amber-500/20",
  "border-emerald-500/25",
  "border-emerald-500/40",
];

// ─── Process matches ──────────────────────────────────────────────────────────

function processMatchesToCalendar(matches: MatchData[]): Map<string, DayData> {
  const map = new Map<string, DayData>();

  for (const match of matches) {
    const date = new Date(match.gameCreation);
    const key = formatDate(date);
    const player = match.participants[match.playerParticipantIndex];
    const kda = player.deaths === 0
      ? player.kills + player.assists
      : (player.kills + player.assists) / player.deaths;
    const isRanked = RANKED_QUEUE_IDS.has(match.queueId);
    const qm = getQueueMeta(match.queueId);

    if (!map.has(key)) {
      map.set(key, { date: key, games: 0, wins: 0, losses: 0, lpDelta: 0, rankedGames: 0, avgKda: 0, queueBreakdown: {} });
    }

    const day = map.get(key)!;
    day.games++;
    if (player.win) day.wins++;
    else day.losses++;

    day.queueBreakdown[qm.short] = (day.queueBreakdown[qm.short] ?? 0) + 1;

    if (isRanked) {
      day.rankedGames++;
      day.lpDelta += player.win ? Math.floor(18 + Math.random() * 4) : -Math.floor(18 + Math.random() * 4);
    }

    day.avgKda = ((day.avgKda * (day.games - 1)) + kda) / day.games;
    if (!day.bestChampion || kda > 3) day.bestChampion = player.championName;
  }

  return map;
}

// ─── Queue Badge ──────────────────────────────────────────────────────────────

function QueueBadge({ queueId }: { queueId: number }) {
  const qm = getQueueMeta(queueId);
  return (
    <span
      className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-[4px] font-mono shrink-0"
      style={{ color: qm.color, background: qm.bg, border: `1px solid ${qm.color}30` }}
    >
      {qm.short}
    </span>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({
  year, month, data, onDayHover, onDayClick, selectedDay, t,
}: {
  year: number; month: number; data: Map<string, DayData>;
  onDayHover: (day: DayData | null, rect: DOMRect | null) => void;
  onDayClick: (day: string) => void;
  selectedDay: string | null;
  t: (key: string) => string;
}) {
  const weekdays = useMemo(() => [
    t("calendar.mon"), t("calendar.tue"), t("calendar.wed"),
    t("calendar.thu"), t("calendar.fri"), t("calendar.sat"), t("calendar.sun"),
  ], [t]);

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startMonday = getMonday(firstDay);
    const result: Date[][] = [];
    const cursor = new Date(startMonday);
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [year, month]);

  const today = formatDate(new Date());

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map(d => (
          <div key={d} className="text-[10px] text-muted-foreground/60 text-center font-mono uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((date) => {
            const key = formatDate(date);
            const isCurrentMonth = date.getMonth() === month;
            const dayData = data.get(key);
            const level = getLevel(dayData);
            const isToday = key === today;
            const isSelected = key === selectedDay;
            const hasRanked = (dayData?.rankedGames ?? 0) > 0;

            return (
              <motion.button
                key={key}
                whileHover={{ scale: 1.18 }}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "aspect-square rounded-[5px] border transition-all relative cursor-pointer",
                  isCurrentMonth ? LEVEL_COLORS[level] : "bg-transparent",
                  isCurrentMonth ? LEVEL_BORDERS[level] : "border-transparent",
                  !isCurrentMonth && "opacity-15",
                  isToday && "ring-1 ring-primary/60 ring-offset-[1px] ring-offset-background",
                  isSelected && "ring-2 ring-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]",
                )}
                onMouseEnter={(e) => {
                  if (dayData && isCurrentMonth) onDayHover(dayData, e.currentTarget.getBoundingClientRect());
                }}
                onMouseLeave={() => onDayHover(null, null)}
                onClick={() => isCurrentMonth && onDayClick(key)}
              >
                <span className={cn(
                  "absolute inset-0 flex items-center justify-center text-[9px] font-mono",
                  isCurrentMonth ? "text-foreground/60" : "text-muted-foreground/20",
                  level >= 3 && "text-foreground/90 font-semibold",
                )}>
                  {date.getDate()}
                </span>

                {/* Ranked dot — top right corner */}
                {hasRanked && isCurrentMonth && (
                  <span
                    className="absolute top-[3px] right-[3px] w-[4px] h-[4px] rounded-full"
                    style={{ background: "#60a5fa" }}
                  />
                )}

                {/* Game count dots — bottom */}
                {dayData && dayData.games > 0 && isCurrentMonth && (
                  <div className="absolute bottom-[2px] left-1/2 -translate-x-1/2 flex gap-[2px]">
                    {Array.from({ length: Math.min(dayData.games, 5) }).map((_, i) => (
                      <div key={i} className="w-[3px] h-[3px] rounded-full bg-foreground/30" />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function DayTooltip({ day, rect, t, patchVersion }: { day: DayData; rect: DOMRect; t: (key: string) => string; patchVersion: string }) {
  const wr = day.games > 0 ? Math.round((day.wins / day.games) * 100) : 0;
  const d = parseDateStr(day.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[100] pointer-events-none"
      style={{ left: rect.left + rect.width / 2, top: rect.top - 10, transform: "translate(-50%, -100%)" }}
    >
      <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl px-3.5 py-3 min-w-[200px]">
        {/* Date + best champion portrait */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
          {day.bestChampion && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md overflow-hidden border border-border/50">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${day.bestChampion}.png`}
                  alt={day.bestChampion}
                  className="w-full h-full object-cover scale-110"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <span className="text-[9px] font-medium text-muted-foreground">{day.bestChampion}</span>
            </div>
          )}
        </div>

        {/* W/L row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-foreground">{day.games}G</span>
            <span className="text-[11px]">
              <span className="text-emerald-400 font-medium">{day.wins}W</span>
              <span className="text-muted-foreground/50 mx-0.5">/</span>
              <span className="text-red-400 font-medium">{day.losses}L</span>
            </span>
          </div>
          <span className={cn(
            "text-[12px] font-mono font-semibold",
            wr >= 60 ? "text-emerald-400" : wr >= 50 ? "text-amber-400" : "text-red-400"
          )}>{wr}%</span>
        </div>

        {/* Queue breakdown */}
        {Object.keys(day.queueBreakdown).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {Object.entries(day.queueBreakdown).map(([short, count]) => {
              const meta = Object.values(QUEUE_META).find(m => m.short === short) ??
                { color: "#6b7280", bg: "rgba(107,114,128,0.1)" };
              return (
                <span
                  key={short}
                  className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-[4px]"
                  style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30` }}
                >
                  {count}× {short}
                </span>
              );
            })}
          </div>
        )}

        {/* LP / KDA */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/40">
          {day.rankedGames > 0 ? (
            <div className="flex items-center gap-1">
              {day.lpDelta >= 0
                ? <TrendingUp className="w-3 h-3 text-emerald-400" />
                : <TrendingDown className="w-3 h-3 text-red-400" />}
              <span className={cn("text-[11px] font-mono font-semibold", day.lpDelta >= 0 ? "text-emerald-400" : "text-red-400")}>
                {day.lpDelta >= 0 ? "+" : ""}{day.lpDelta} LP
              </span>
              <span className="text-[9px] text-muted-foreground/40 font-mono">est.</span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/40 font-mono">No ranked</span>
          )}
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">
            {day.avgKda.toFixed(1)} KDA
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Month Stats ──────────────────────────────────────────────────────────────

function MonthStats({ data, year, month, t }: { data: Map<string, DayData>; year: number; month: number; t: (key: string) => string }) {
  const stats = useMemo(() => {
    let totalGames = 0, totalWins = 0, totalLp = 0, activeDays = 0;
    let bestStreak = 0, currentStreak = 0;
    const queueTotals: Record<string, number> = {};

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const day = data.get(key);
      if (day && day.games > 0) {
        totalGames += day.games;
        totalWins += day.wins;
        totalLp += day.lpDelta;
        activeDays++;
        Object.entries(day.queueBreakdown).forEach(([q, c]) => { queueTotals[q] = (queueTotals[q] ?? 0) + c; });
        if (day.wins > day.losses) { currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
        else currentStreak = 0;
      }
    }

    return { totalGames, totalWins, totalLp, activeDays, bestStreak, queueTotals };
  }, [data, year, month]);

  const wr = stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0;

  const cards = [
    { label: t("calendar.gamesPlayed"), value: stats.totalGames, icon: Gamepad2, color: "text-foreground", accent: "rgba(255,255,255,0.06)" },
    { label: t("calendar.winRate"), value: `${wr}%`, icon: Trophy, color: wr >= 55 ? "text-emerald-400" : wr >= 50 ? "text-amber-400" : "text-red-400", accent: wr >= 55 ? "rgba(52,211,153,0.06)" : wr >= 50 ? "rgba(251,191,36,0.06)" : "rgba(248,113,113,0.06)" },
    { label: t("calendar.lpChange"), value: `${stats.totalLp >= 0 ? "+" : ""}${stats.totalLp}`, icon: stats.totalLp >= 0 ? TrendingUp : TrendingDown, color: stats.totalLp >= 0 ? "text-emerald-400" : "text-red-400", accent: stats.totalLp >= 0 ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)" },
    { label: t("calendar.activeDays"), value: stats.activeDays, icon: CalendarDays, color: "text-blue-400", accent: "rgba(96,165,250,0.06)" },
    { label: t("calendar.bestStreak"), value: t("calendar.streakDays").replace("{count}", String(stats.bestStreak)), icon: Flame, color: "text-orange-400", accent: "rgba(251,146,60,0.06)" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border/50 p-3.5 flex flex-col gap-2"
            style={{ background: card.accent }}
          >
            <div className="flex items-center gap-1.5">
              <card.icon className={cn("w-3.5 h-3.5", card.color)} strokeWidth={2} />
              <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">{card.label}</span>
            </div>
            <div className={cn("text-[20px] font-mono font-bold leading-none", card.color)}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Queue distribution pills */}
      {Object.keys(stats.queueTotals).length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-mono">Modos:</span>
          {Object.entries(stats.queueTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([short, count]) => {
              const meta = Object.values(QUEUE_META).find(m => m.short === short) ??
                { color: "#6b7280", bg: "rgba(107,114,128,0.1)" };
              return (
                <span
                  key={short}
                  className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full"
                  style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}25` }}
                >
                  {count}× {short}
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ─── Day Detail ───────────────────────────────────────────────────────────────

function DayDetail({ day, matches, t, patch }: { day: DayData; matches: MatchData[]; t: (key: string) => string; patch: string }) {
  const d = parseDateStr(day.date);
  const dayMatches = matches
    .filter(m => formatDate(new Date(m.gameCreation)) === day.date)
    .sort((a, b) => b.gameCreation - a.gameCreation);

  const wr = day.games > 0 ? Math.round((day.wins / day.games) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border/50 rounded-xl overflow-hidden"
    >
      {/* Day header */}
      <div className="px-4 py-3.5 border-b border-border/40 flex items-start justify-between"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)" }}
      >
        <div>
          <div className="text-[13px] font-semibold text-foreground">
            {d.toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">{day.games} partidas</span>
            <span className="text-muted-foreground/30">·</span>
            <span className={cn("text-[11px] font-medium", wr >= 60 ? "text-emerald-400" : wr >= 50 ? "text-amber-400" : "text-red-400")}>
              {wr}% WR
            </span>
          </div>
        </div>
        {day.rankedGames > 0 && (
          <div className="text-right">
            <span className={cn("text-[15px] font-mono font-bold", day.lpDelta >= 0 ? "text-emerald-400" : "text-red-400")}>
              {day.lpDelta >= 0 ? "+" : ""}{day.lpDelta} LP
            </span>
            <div className="text-[9px] text-muted-foreground/40 font-mono">estimado</div>
          </div>
        )}
      </div>

      {/* Match list */}
      <div className="p-3 flex flex-col gap-1.5 max-h-[360px] overflow-y-auto">
        {dayMatches.length > 0 ? dayMatches.map((match) => {
          const player = match.participants[match.playerParticipantIndex];
          const kda = `${player.kills}/${player.deaths}/${player.assists}`;
          const durMin = Math.floor(match.gameDuration / 60);
          const durSec = String(match.gameDuration % 60).padStart(2, "0");
          const cs = player.totalMinionsKilled + player.neutralMinionsKilled;
          const cspm = (cs / (match.gameDuration / 60)).toFixed(1);
          const champImg = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${player.championName}.png`;

          return (
            <motion.div
              key={match.matchId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] relative overflow-hidden group",
                player.win
                  ? "bg-emerald-500/[0.07] border border-emerald-500/20 hover:border-emerald-500/35"
                  : "bg-red-500/[0.07] border border-red-500/20 hover:border-red-500/35",
                "transition-colors"
              )}
            >
              {/* Win/loss bar */}
              <div className={cn("w-[3px] h-full absolute left-0 top-0 rounded-l-lg",
                player.win ? "bg-emerald-500" : "bg-red-500"
              )} />

              {/* Champion portrait */}
              <div className="w-[28px] h-[28px] rounded-md overflow-hidden border border-white/10 shrink-0 ml-1">
                <img
                  src={champImg}
                  alt={player.championName}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                />
              </div>

              {/* Champion + queue */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground truncate text-[12px]">{player.championName}</span>
                  <QueueBadge queueId={match.queueId} />
                </div>
                <span className="font-mono text-muted-foreground text-[10px]">{kda}</span>
              </div>

              {/* Right stats */}
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="text-[10px] text-muted-foreground/70 font-mono">{durMin}:{durSec}</span>
                <span className="text-[10px] text-muted-foreground/50 font-mono">{cs} CS · {cspm}/m</span>
              </div>
            </motion.div>
          );
        }) : (
          <div className="text-[11px] text-muted-foreground/50 italic py-4 text-center">
            {t("calendar.matchDetails")}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Year Grid ────────────────────────────────────────────────────────────────

function YearGrid({
  year, data, onDayClick, t,
}: {
  year: number;
  data: Map<string, DayData>;
  onDayClick: (day: string) => void;
  t: (key: string) => string;
}) {
  const months = useMemo(() => [
    t("month.jan"), t("month.feb"), t("month.mar"), t("month.apr"),
    t("month.may"), t("month.jun"), t("month.jul"), t("month.aug"),
    t("month.sep"), t("month.oct"), t("month.nov"), t("month.dec"),
  ], [t]);

  // Build weeks array for the full year (GitHub style: week columns, day rows)
  const { weeks, monthLabels } = useMemo(() => {
    const start = new Date(year, 0, 1);
    // Go back to Monday before/on Jan 1
    const startDay = start.getDay();
    const offset = startDay === 0 ? 6 : startDay - 1;
    const cursor = new Date(year, 0, 1 - offset);

    const weeksArr: Date[][] = [];
    const monthLabelArr: { month: number; col: number }[] = [];
    let col = 0;
    let lastMonth = -1;

    while (cursor.getFullYear() <= year) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      // Track where each month starts
      const firstInYear = week.find(d => d.getFullYear() === year);
      if (firstInYear) {
        const m = firstInYear.getMonth();
        if (m !== lastMonth && firstInYear.getDate() <= 7) {
          monthLabelArr.push({ month: m, col });
          lastMonth = m;
        }
      }
      weeksArr.push(week);
      col++;
    }

    return { weeks: weeksArr, monthLabels: monthLabelArr };
  }, [year]);

  const today = formatDate(new Date());

  return (
    <div className="flex flex-col gap-2">
      {/* Month labels */}
      <div className="flex ml-7" style={{ gap: "3px" }}>
        {weeks.map((_, wi) => {
          const label = monthLabels.find(ml => ml.col === wi);
          return (
            <div key={wi} className="shrink-0" style={{ width: 12 }}>
              {label && (
                <span className="text-[9px] text-muted-foreground/60 font-mono uppercase tracking-wider">
                  {months[label.month].slice(0, 3)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Day rows */}
      <div className="flex gap-1.5">
        {/* Weekday labels */}
        <div className="flex flex-col shrink-0" style={{ gap: "3px" }}>
          {["M", "", "W", "", "F", "", "S"].map((d, i) => (
            <div key={i} className="text-[9px] text-muted-foreground/50 font-mono" style={{ height: 12, lineHeight: "12px" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col shrink-0" style={{ gap: "3px" }}>
            {week.map((date) => {
              const key = formatDate(date);
              const isThisYear = date.getFullYear() === year;
              const dayData = isThisYear ? data.get(key) : undefined;
              const level = getLevel(dayData);
              const isToday = key === today;

              return (
                <motion.div
                  key={key}
                  whileHover={isThisYear && dayData ? { scale: 1.3 } : {}}
                  title={isThisYear && dayData ? `${key}: ${dayData.wins}W ${dayData.losses}L` : key}
                  onClick={() => isThisYear && dayData && onDayClick(key)}
                  className={cn(
                    "rounded-[2px] border transition-colors",
                    isThisYear ? LEVEL_COLORS[level] : "bg-transparent border-transparent",
                    isThisYear ? LEVEL_BORDERS[level] : "",
                    !isThisYear && "opacity-10",
                    isToday && "ring-1 ring-primary/70",
                    isThisYear && dayData && "cursor-pointer"
                  )}
                  style={{ width: 12, height: 12 }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-1 ml-7">
        <span className="text-[9px] text-muted-foreground/50 mr-0.5">Less</span>
        {[0, 1, 2, 3, 4].map(l => (
          <div key={l} className={cn("rounded-[2px] border", LEVEL_COLORS[l], LEVEL_BORDERS[l])} style={{ width: 12, height: 12 }} />
        ))}
        <span className="text-[9px] text-muted-foreground/50 ml-0.5">More</span>
      </div>
    </div>
  );
}

// ─── Hourly Heatmap ───────────────────────────────────────────────────────────

const DAY_KEYS = ["day.sun", "day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat"];

function HourlyHeatmap({ matches, t }: { matches: MatchData[]; t: (key: string) => string }) {
  // Build a 7×24 grid: dayOfWeek × hour → { games, wins }
  const grid = useMemo(() => {
    const cells: { games: number; wins: number }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ games: 0, wins: 0 }))
    );
    for (const m of matches) {
      const d = new Date(m.gameCreation);
      const dow = d.getDay(); // 0=Sun
      const hour = d.getHours();
      const p = m.participants[m.playerParticipantIndex];
      cells[dow][hour].games++;
      if (p.win) cells[dow][hour].wins++;
    }
    return cells;
  }, [matches]);

  const maxGames = useMemo(() => Math.max(...grid.flatMap(row => row.map(c => c.games)), 1), [grid]);

  const dayLabels = useMemo(() => DAY_KEYS.map(k => t(k) || k.split(".")[1].toUpperCase()), [t]);
  const hourLabels = ["0h","2h","4h","6h","8h","10h","12h","14h","16h","18h","20h","22h"];

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
        {t("calendar.heatmap") || "Win rate by hour of day"}
      </div>
      {/* Hour labels */}
      <div className="flex gap-0.5 ml-9">
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="flex-1 text-center">
            {h % 2 === 0 && <span className="text-[9px] text-muted-foreground/50">{h}h</span>}
          </div>
        ))}
      </div>
      {/* Rows */}
      {grid.map((row, dow) => (
        <div key={dow} className="flex items-center gap-0.5">
          <span className="text-[10px] text-muted-foreground/60 w-8 shrink-0 text-right pr-1.5">{dayLabels[dow]}</span>
          {row.map((cell, hour) => {
            const wr = cell.games > 0 ? cell.wins / cell.games : -1;
            const intensity = cell.games / maxGames;
            return (
              <div
                key={hour}
                title={cell.games > 0 ? `${cell.games} games · ${Math.round(wr * 100)}% WR` : "No data"}
                className="flex-1 aspect-square rounded-[2px] transition-opacity"
                style={{
                  backgroundColor: cell.games === 0
                    ? "rgba(255,255,255,0.04)"
                    : wr >= 0.5
                    ? `rgba(34,197,94,${0.15 + intensity * 0.7})`
                    : `rgba(239,68,68,${0.15 + intensity * 0.7})`,
                }}
              />
            );
          })}
        </div>
      ))}
      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[2px] inline-block bg-emerald-500/60" />{t("calendar.goodHours") || "High WR hours"}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[2px] inline-block bg-destructive/60" />{t("calendar.badHours") || "Low WR hours"}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[2px] inline-block" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />{t("calendar.noData") || "No games"}</span>
      </div>
      {/* Best/worst hours summary */}
      {matches.length >= 5 && (() => {
        const hourStats = Array.from({ length: 24 }, (_, h) => {
          const total = grid.reduce((s, row) => s + row[h].games, 0);
          const wins = grid.reduce((s, row) => s + row[h].wins, 0);
          return { h, total, wr: total >= 3 ? wins / total : -1 };
        }).filter(x => x.wr >= 0).sort((a, b) => b.wr - a.wr);
        if (hourStats.length < 2) return null;
        const best = hourStats[0];
        const worst = hourStats[hourStats.length - 1];
        return (
          <div className="flex gap-4 mt-1">
            <div className="flex-1 p-2.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
              <div className="text-[10px] text-emerald-500/70 font-semibold mb-0.5">{t("calendar.bestHour") || "Best hour"}</div>
              <div className="text-[13px] font-mono font-bold text-emerald-500">{best.h}:00</div>
              <div className="text-[10px] text-muted-foreground">{Math.round(best.wr * 100)}% WR · {best.total}g</div>
            </div>
            <div className="flex-1 p-2.5 rounded-lg bg-destructive/8 border border-destructive/15">
              <div className="text-[10px] text-destructive/70 font-semibold mb-0.5">{t("calendar.worstHour") || "Worst hour"}</div>
              <div className="text-[13px] font-mono font-bold text-destructive">{worst.h}:00</div>
              <div className="text-[10px] text-muted-foreground">{Math.round(worst.wr * 100)}% WR · {worst.total}g</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PerformanceCalendar() {
  const { t } = useLanguage();
  const { data: matches, isLoading, error } = useAsyncData(() => getMatchHistory(), []);
  const { version: patch } = usePatchVersion();

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [queueFilter, setQueueFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "year" | "heatmap">("month");

  const availableQueues = useMemo(() => {
    if (!matches) return [];
    const ids = new Set(matches.map(m => m.queueId));
    return [...ids].filter(id => QUEUE_META[id]).sort((a, b) => a - b);
  }, [matches]);

  const calendarData = useMemo(() => {
    if (!matches) return new Map<string, DayData>();
    const filtered = queueFilter != null ? matches.filter(m => m.queueId === queueFilter) : matches;
    return processMatchesToCalendar(filtered);
  }, [matches, queueFilter]);

  const handlePrev = useCallback(() => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  }, [currentMonth]);

  const handleNext = useCallback(() => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  }, [currentMonth]);

  const handleToday = useCallback(() => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(null);
  }, []);

  const handleDayHover = useCallback((day: DayData | null, rect: DOMRect | null) => {
    setHoveredDay(day);
    setHoveredRect(rect);
  }, []);

  const selectedDayData = selectedDay ? calendarData.get(selectedDay) : null;

  const legend = [
    { label: t("calendar.noGames"), level: 0 },
    { label: t("calendar.lossDay"), level: 1 },
    { label: t("calendar.even"), level: 2 },
    { label: t("calendar.good"), level: 3 },
    { label: t("calendar.great"), level: 4 },
  ];

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-destructive/60" />
        <p className="text-[14px] font-semibold text-foreground">{t("common.errorTitle") || "No se pudieron cargar los datos"}</p>
        <p className="text-[12px] text-muted-foreground max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title={t("calendar.title")}
        subtitle={t("calendar.subtitle")}
        icon={CalendarDays}
        label="ANALYTICS"
        badge={`${t(MONTH_KEYS[currentMonth])} ${currentYear}`}
        badgeVariant="primary"
        breadcrumbs={[
          { label: t("nav.dashboard"), to: "/dashboard" },
          { label: t("calendar.breadcrumb") },
        ]}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          {viewMode === "month" ? (
            <>
              <button onClick={handlePrev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/80 border border-border/40 transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-[15px] font-semibold text-foreground min-w-[160px] text-center">
                {t(MONTH_KEYS[currentMonth])} <span className="text-muted-foreground font-normal">{currentYear}</span>
              </span>
              <button onClick={handleNext} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/80 border border-border/40 transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={handleToday} className="ml-1 px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/40 rounded-lg transition-colors font-medium">
                {t("calendar.today")}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setCurrentYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/80 border border-border/40 transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-[15px] font-semibold text-foreground min-w-[80px] text-center">{currentYear}</span>
              <button onClick={() => setCurrentYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/80 border border-border/40 transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}
          {/* View toggle */}
          <div className="ml-3 flex items-center rounded-lg border border-border/40 overflow-hidden">
            <button
              onClick={() => setViewMode("month")}
              className={cn("w-7 h-7 flex items-center justify-center transition-colors", viewMode === "month" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
              title="Month view"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("year")}
              className={cn("w-7 h-7 flex items-center justify-center transition-colors", viewMode === "year" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
              title="Year view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("heatmap")}
              className={cn("w-7 h-7 flex items-center justify-center transition-colors", viewMode === "heatmap" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
              title={t("calendar.heatmap") || "Hourly heatmap"}
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50 mr-0.5">{t("calendar.less")}</span>
          {legend.map((l) => (
            <div key={l.level} className={cn("w-4 h-4 rounded-[4px] border", LEVEL_COLORS[l.level], LEVEL_BORDERS[l.level])} title={l.label} />
          ))}
          <span className="text-[10px] text-muted-foreground/50 ml-0.5">{t("calendar.more")}</span>
          <div className="ml-3 flex items-center gap-1 text-[10px] text-muted-foreground/50">
            <span className="w-[6px] h-[6px] rounded-full bg-blue-400 inline-block" />
            Ranked
          </div>
        </div>
      </div>

      {/* Queue Filter */}
      {availableQueues.length > 1 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <button
            onClick={() => { setQueueFilter(null); setSelectedDay(null); }}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-semibold border transition-all",
              queueFilter === null
                ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_6px_var(--color-primary,rgba(99,102,241,0.3))]"
                : "bg-secondary/50 text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground"
            )}
          >
            ALL
          </button>
          {availableQueues.map(qid => {
            const meta = QUEUE_META[qid];
            const isActive = queueFilter === qid;
            return (
              <button
                key={qid}
                onClick={() => { setQueueFilter(isActive ? null : qid); setSelectedDay(null); }}
                style={isActive ? { backgroundColor: meta.bg, color: meta.color, borderColor: `${meta.color}50`, boxShadow: `0 0 6px ${meta.color}40` } : undefined}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-semibold border transition-all",
                  isActive
                    ? ""
                    : "bg-secondary/50 text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground"
                )}
              >
                {meta.short}
              </button>
            );
          })}
        </div>
      )}

      {/* Stats Summary — only in month view */}
      {viewMode === "month" && viewMode !== "heatmap" && (
        <div className="mb-5">
          <MonthStats data={calendarData} year={currentYear} month={currentMonth} t={t} />
        </div>
      )}

      {/* Calendar + Detail Panel */}
      <div className="flex gap-5">
        {/* Calendar Grid */}
        <div className="flex-1 bg-card/80 border border-border/50 rounded-xl p-5 backdrop-blur-sm overflow-x-auto">
          {viewMode === "month" ? (
            <CalendarGrid
              year={currentYear}
              month={currentMonth}
              data={calendarData}
              onDayHover={handleDayHover}
              onDayClick={(key) => setSelectedDay(prev => prev === key ? null : key)}
              selectedDay={selectedDay}
              t={t}
            />
          ) : viewMode === "heatmap" ? (
            <HourlyHeatmap matches={matches || []} t={t} />
          ) : (
            <YearGrid
              year={currentYear}
              data={calendarData}
              onDayClick={(key) => {
                setSelectedDay(prev => prev === key ? null : key);
                setViewMode("month");
                const d = new Date(key);
                setCurrentYear(d.getFullYear());
                setCurrentMonth(d.getMonth());
              }}
              t={t}
            />
          )}
        </div>

        {/* Detail Panel — month view only */}
        {viewMode === "month" && <div className="w-[300px] shrink-0">
          <AnimatePresence mode="wait">
            {selectedDayData ? (
              <DayDetail
                key={selectedDay}
                day={selectedDayData}
                matches={matches || []}
                t={t}
                patch={patch}
              />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card/80 border border-border/50 rounded-xl p-4 flex flex-col items-center justify-center h-52 gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <span className="text-[12px] text-muted-foreground/60 text-center leading-relaxed">
                  {t("calendar.clickDay")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>}
      </div>

      {/* Floating Tooltip */}
      <AnimatePresence>
        {hoveredDay && hoveredRect && (
          <DayTooltip day={hoveredDay} rect={hoveredRect} t={t} patchVersion={patch} />
        )}
      </AnimatePresence>
    </div>
  );
}
