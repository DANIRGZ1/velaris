import { useMemo, useState } from "react";
import { AreaChart, Area, Tooltip, ResponsiveContainer, ReferenceLine, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus, Trophy, Flame, BarChart2, Trash2 } from "lucide-react";

const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

// Known patch release dates (Season 2025)
const PATCH_DATES: { label: string; date: string }[] = [
  { label: "25.1",  date: "2025-01-09" },
  { label: "25.2",  date: "2025-01-22" },
  { label: "25.3",  date: "2025-02-05" },
  { label: "25.4",  date: "2025-02-19" },
  { label: "25.5",  date: "2025-03-05" },
  { label: "25.6",  date: "2025-03-19" },
  { label: "25.7",  date: "2025-04-02" },
  { label: "25.8",  date: "2025-04-16" },
  { label: "25.9",  date: "2025-04-30" },
  { label: "25.10", date: "2025-05-14" },
  { label: "25.11", date: "2025-05-28" },
  { label: "25.12", date: "2025-06-11" },
];
import { motion } from "motion/react";
import { cn } from "./ui/utils";
import {
  getLPHistory,
  computeLPStats,
  getDailyLPSeries,
  formatTotalLP,
  recordLPSnapshot,
  clearLPHistory,
} from "../services/lpTracker";
import { useLanguage } from "../contexts/LanguageContext";

const RANGE_OPTIONS = [7, 14, 30] as const;
type Range = typeof RANGE_OPTIONS[number];

interface Props {
  /** Pass current summoner rank info so we can record a snapshot on render */
  rank?: string;
  division?: string;
  lp?: number;
  wins?: number;
  losses?: number;
}

export function LPTrackerWidget({ rank, division, lp, wins, losses }: Props) {
  const [range, setRange] = useState<Range>(30);
  const [historyVersion, setHistoryVersion] = useState(0);
  const { t } = useLanguage();

  // Only record real LP snapshots in Tauri — mock data produces garbage history
  useMemo(() => {
    if (!IS_TAURI) return;
    if (rank && division !== undefined && lp !== undefined) {
      recordLPSnapshot(rank, division, lp, wins ?? 0, losses ?? 0);
    }
  }, [rank, division, lp, wins, losses]);

  const history = useMemo(() => getLPHistory(), [rank, lp, historyVersion]);
  const series = useMemo(() => getDailyLPSeries(history, range), [history, range]);
  const stats = useMemo(() => computeLPStats(history), [history]);

  const chartData = series.length >= 2 ? series : [];
  const hasData = chartData.length >= 2;

  // Patch markers that fall within the chart range
  const patchMarkers = useMemo(() => {
    if (!hasData) return [];
    const dateSet = new Set(chartData.map(d => d.date));
    return PATCH_DATES.filter(p => dateSet.has(p.date));
  }, [hasData, chartData]);

  const minLP = hasData ? Math.min(...chartData.map(d => d.totalLP)) : 0;
  const maxLP = hasData ? Math.max(...chartData.map(d => d.totalLP)) : 0;
  const yPad = Math.max(30, Math.round((maxLP - minLP) * 0.2));
  const yDomain: [number, number] = hasData ? [minLP - yPad, maxLP + yPad] : [0, 100];
  const firstLP = chartData[0]?.totalLP ?? 0;
  const lastLP = chartData[chartData.length - 1]?.totalLP ?? 0;
  const gainTotal = lastLP - firstLP;
  const isUp = gainTotal >= 0;

  if (!stats && history.length === 0 && !rank) return null;
  const currentRankLabel = rank ? `${rank} ${division ?? ""} — ${lp ?? 0} LP`.trim() : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-card p-6 card-lift card-shine card-border-gradient"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[16px] font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            {t("lp.progression.title") || "LP Progression"}
          </h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {(t("lp.tracker.desc") || "Your elo journey over the last {range} days").replace("{range}", String(range))}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex items-center gap-1 p-0.5 bg-secondary/50 rounded-lg">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                  range === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}d
              </button>
            ))}
          </div>
          {/* Clear history — only shown when there's data */}
          {history.length > 0 && (
            <button
              onClick={() => { clearLPHistory(); setHistoryVersion(v => v + 1); }}
              title="Borrar historial de LP"
              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Current LP */}
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">{t("lp.current.label") || "Current"}</p>
          <p className="text-[18px] font-mono font-semibold text-gradient stat-accent">
            {rank ? `${rank} ${division} — ${lp} LP` : formatTotalLP(lastLP)}
          </p>
        </div>

        {/* Period gain */}
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">{range}d</p>
          <p className={cn(
            "text-[18px] font-mono font-semibold flex items-center gap-1",
            isUp ? "text-green-500" : "text-red-500"
          )}>
            {isUp
              ? <TrendingUp className="w-4 h-4" />
              : gainTotal === 0
              ? <Minus className="w-4 h-4 text-muted-foreground" />
              : <TrendingDown className="w-4 h-4" />
            }
            {isUp ? "+" : ""}{gainTotal} LP
          </p>
        </div>

        {/* Peak */}
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
            <Flame className="inline w-3 h-3 mr-0.5 text-amber-500" />{t("lp.peak.label") || "Peak"}
          </p>
          <p className="text-[14px] font-mono font-medium text-amber-500">
            {stats?.peakFormatted ?? formatTotalLP(maxLP)}
          </p>
        </div>
      </div>

      {/* Chart or empty state */}
      {hasData ? (
        <>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isUp ? "var(--color-primary)" : "var(--color-destructive)"} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={isUp ? "var(--color-primary)" : "var(--color-destructive)"} stopOpacity={0} />
                  </linearGradient>
                  <filter id="lpLineGlow" x="-20%" y="-80%" width="140%" height="260%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <YAxis domain={yDomain} hide />
                <ReferenceLine
                  y={firstLP}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                />
                {patchMarkers.map(p => (
                  <ReferenceLine
                    key={p.label}
                    x={p.date}
                    stroke="rgba(168,85,247,0.4)"
                    strokeDasharray="2 4"
                    label={{ value: p.label, position: "insideTopRight", fontSize: 9, fill: "rgba(168,85,247,0.7)" }}
                  />
                ))}
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                  labelStyle={{ color: "var(--color-muted-foreground)", fontSize: "10px" }}
                  formatter={(value: any, _: any, props: any) => [props.payload.label, ""]}
                  labelFormatter={(label: string) => {
                    const d = new Date(label);
                    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
                  }}
                />
                {/* Glow layer — blurred wide stroke beneath the real line */}
                <Area
                  type="monotone"
                  dataKey="totalLP"
                  stroke={isUp ? "var(--color-primary)" : "var(--color-destructive)"}
                  strokeWidth={6}
                  strokeOpacity={0.35}
                  fill="none"
                  dot={false}
                  activeDot={false}
                  animationDuration={800}
                  style={{ filter: "url(#lpLineGlow)" }}
                />
                {/* Sharp line on top */}
                <Area
                  type="monotone"
                  dataKey="totalLP"
                  stroke={isUp ? "var(--color-primary)" : "var(--color-destructive)"}
                  strokeWidth={2}
                  fill="url(#lpGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: isUp ? "var(--color-primary)" : "var(--color-destructive)" }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/40 font-mono">
            <span>{formatTotalLP(minLP)}</span>
            <span>{formatTotalLP(maxLP)}</span>
          </div>
        </>
      ) : (
        <div className="h-[120px] w-full flex flex-col items-center justify-center gap-2 border border-dashed border-border/40 rounded-xl bg-secondary/20">
          <BarChart2 className="w-5 h-5 text-muted-foreground/30" />
          <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed max-w-[240px]">
            {currentRankLabel
              ? (t("lp.empty.withRank") || "Currently at {rank}. Play more ranked games to track your progression.").replace("{rank}", currentRankLabel)
              : (t("lp.empty.noRank") || "Play ranked games to see your LP progression here.")}
          </p>
        </div>
      )}

      {/* LP 7-day projection */}
      {stats && Math.abs(stats.last7DaysGain) > 5 && (
        <div className={cn(
          "mt-3 px-3 py-2 rounded-xl border flex items-center gap-2.5 text-[11px]",
          stats.last7DaysGain > 0
            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600"
            : "bg-red-500/5 border-red-500/20 text-red-400"
        )}>
          {stats.last7DaysGain > 0
            ? <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            : <TrendingDown className="w-3.5 h-3.5 shrink-0" />
          }
          <span>
            {stats.last7DaysGain > 0 ? "+" : ""}{stats.last7DaysGain} LP / 7d{" · "}
            {t("lp.projection") || "At this rate:"}{" "}
            <span className="font-semibold">{formatTotalLP(Math.max(0, stats.current + stats.last7DaysGain))}</span>
            {" "}{t("lp.inDays") || "in 7 days"}
          </span>
        </div>
      )}
    </motion.div>
  );
}
