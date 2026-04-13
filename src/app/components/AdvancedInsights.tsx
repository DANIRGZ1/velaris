/**
 * AdvancedInsights — Velaris
 *
 * Collapsible section shown in the Profile page with:
 *  - Nemesis champions
 *  - Hour-of-day performance heatmap
 *  - Day-of-week performance heatmap
 *  - Objective correlation bars
 *  - KDA win-rate sweet spot
 *  - Role distribution + stats
 */
import { useMemo, useState } from "react";
import { ChevronDown, Skull, Clock, Calendar, Target, Swords, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import type { MatchData } from "../utils/analytics";
import {
  computeNemesisList,
  computeHourlyPerformance,
  computeDayOfWeekPerformance,
  computeObjectiveCorrelation,
  computeKDABuckets,
  computeRoleStats,
} from "../services/extendedAnalytics";
import { usePatchVersion } from "../hooks/usePatchVersion";

// ─── Sub-panel wrapper ────────────────────────────────────────────────────────

function SubPanel({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-card border border-border/60 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary/70" />
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

// ─── WR colour helper ─────────────────────────────────────────────────────────

function wrColor(wr: number): string {
  if (wr >= 60) return "text-emerald-400";
  if (wr >= 50) return "text-foreground";
  if (wr >= 40) return "text-amber-400";
  return "text-red-400";
}

function wrBg(wr: number): string {
  if (wr >= 60) return "bg-emerald-500";
  if (wr >= 50) return "bg-primary";
  if (wr >= 40) return "bg-amber-500";
  return "bg-red-500";
}

/** CSS hex colour for inline style use (canvas / dynamic height bars). */
function wrHex(wr: number): string {
  if (wr >= 60) return "#34d399";
  if (wr >= 50) return "#6366f1";
  if (wr >= 40) return "#f59e0b";
  return "#f87171";
}

// ─── Nemesis panel ────────────────────────────────────────────────────────────

function NemesisPanel({ matches }: { matches: MatchData[] }) {
  const { t } = useLanguage();
  const { version } = usePatchVersion();
  const list = useMemo(() => computeNemesisList(matches, 5), [matches]);

  if (list.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{t("insights.noData")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {list.map(n => (
        <div key={n.champion} className="flex items-center gap-3">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${n.champion}.png`}
            alt={n.champion}
            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border/40"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[12px] font-medium text-foreground truncate">{n.champion}</span>
              <span className={cn("text-[12px] font-bold tabular-nums ml-2 shrink-0", wrColor(n.winRate))}>
                {n.winRate}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-secondary/60 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", wrBg(n.winRate))}
                style={{ width: `${n.winRate}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {n.playerWins}W {n.playerLosses}L · {n.encounters} {t("insights.encounters")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Hourly heatmap ───────────────────────────────────────────────────────────

function HourlyPanel({ matches }: { matches: MatchData[] }) {
  const { t } = useLanguage();
  const buckets = useMemo(() => computeHourlyPerformance(matches), [matches]);

  if (buckets.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{t("insights.noData")}</p>;
  }

  const best = buckets.reduce((a, b) => (a.games >= 3 && a.winRate > b.winRate ? a : b.games >= 3 ? b : a));

  return (
    <div>
      <div className="flex items-end gap-1 h-14 mb-2">
        {buckets.map(b => (
          <div key={b.hour} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${b.label}: ${b.winRate}% (${b.games}g)`}>
            <div
              className="w-full rounded-sm transition-all duration-300"
              style={{
                height: `${Math.max(4, b.winRate)}%`,
                background: wrHex(b.winRate) + (b.winRate < 50 ? "bb" : ""),
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground/60 mb-2">
        <span>{buckets[0]?.label}</span>
        <span>{buckets[Math.floor(buckets.length / 2)]?.label}</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>
      {best.games >= 3 && (
        <p className="text-[11px] text-muted-foreground">
          {t("insights.bestHour")
            .replace("{label}", best.label)
            .replace("{wr}", String(best.winRate))}
        </p>
      )}
    </div>
  );
}

// ─── Day-of-week heatmap ──────────────────────────────────────────────────────

function DayOfWeekPanel({ matches }: { matches: MatchData[] }) {
  const { t } = useLanguage();
  const buckets = useMemo(() => computeDayOfWeekPerformance(matches), [matches]);

  const active = buckets.filter(b => b.games > 0);
  if (active.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{t("insights.noData")}</p>;
  }

  const best = active.reduce((a, b) => (a.winRate > b.winRate ? a : b));
  const worst = active.reduce((a, b) => (a.winRate < b.winRate ? a : b));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {buckets.map(b => (
          <div key={b.day} className="flex flex-col items-center gap-1">
            <div
              className={cn("w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-bold transition-all", b.games > 0 ? "text-white" : "bg-secondary/30 text-muted-foreground/30")}
              style={b.games > 0 ? { background: `${b.winRate >= 60 ? "#34d399" : b.winRate >= 50 ? "#6366f1" : b.winRate >= 40 ? "#f59e0b" : "#f87171"}${b.games < 3 ? "70" : ""}` } : {}}
              title={b.games > 0 ? `${b.label}: ${b.winRate}% (${b.games}g)` : b.label}
            >
              {b.games > 0 ? `${b.winRate}%` : ""}
            </div>
            <span className="text-[9px] text-muted-foreground/60">{b.shortLabel}</span>
          </div>
        ))}
      </div>
      {best.games >= 2 && worst.games >= 2 && best.day !== worst.day && (
        <p className="text-[11px] text-muted-foreground">
          {t("insights.bestDay")
            .replace("{best}", best.label)
            .replace("{bestWr}", String(best.winRate))
            .replace("{worst}", worst.label)
            .replace("{worstWr}", String(worst.winRate))}
        </p>
      )}
    </div>
  );
}

// ─── Objective correlation ────────────────────────────────────────────────────

function ObjectivePanel({ matches }: { matches: MatchData[] }) {
  const { t } = useLanguage();
  const rows = useMemo(() => computeObjectiveCorrelation(matches), [matches]);

  if (rows.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{t("insights.noData")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift)).map(row => (
        <div key={row.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-foreground">{t(row.key) || row.label}</span>
            <span className={cn("text-[11px] font-bold", row.lift > 0 ? "text-emerald-400" : "text-red-400")}>
              {row.lift > 0 ? "+" : ""}{row.lift}% WR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
              <div className={cn("h-full rounded-full", wrBg(row.withWinRate))} style={{ width: `${row.withWinRate}%` }} />
            </div>
            <span className={cn("text-[11px] tabular-nums w-8 text-right", wrColor(row.withWinRate))}>{row.withWinRate}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t("insights.obj.without")
              .replace("{wr}", String(row.withoutWinRate))
              .replace("{games}", String(row.withGames))}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── KDA sweet spot ───────────────────────────────────────────────────────────

function KDAPanel({ matches }: { matches: MatchData[] }) {
  const { t } = useLanguage();
  const buckets = useMemo(() => computeKDABuckets(matches), [matches]);

  if (buckets.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{t("insights.noData")}</p>;
  }

  const sweetSpot = buckets.reduce((a, b) => (a.games >= 3 && a.winRate > b.winRate ? a : b.games >= 3 ? b : a));

  return (
    <div>
      <div className="flex items-end gap-2 h-16 mb-2">
        {buckets.map(b => (
          <div key={b.label} className={cn("flex-1 flex flex-col items-center gap-1 relative", b.label === sweetSpot.label && "opacity-100")} title={`KDA ${b.label}: ${b.winRate}% WR (${b.games}g)`}>
            {b.label === sweetSpot.label && b.games >= 3 && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap border border-emerald-500/25">
                {t("insights.optimal")}
              </span>
            )}
            <div
              className={cn("w-full rounded-t-sm", wrBg(b.winRate))}
              style={{ height: `${Math.max(4, b.winRate * 0.6)}px` }}
            />
            <span className="text-[9px] text-muted-foreground">{b.label}</span>
          </div>
        ))}
      </div>
      {sweetSpot.games >= 3 && (
        <p className="text-[11px] text-muted-foreground">
          {t("insights.kdaSweetSpot")
            .replace("{range}", sweetSpot.label)
            .replace("{wr}", String(sweetSpot.winRate))}
        </p>
      )}
    </div>
  );
}

// ─── Role stats ───────────────────────────────────────────────────────────────

function RolePanel({ matches }: { matches: MatchData[] }) {
  const { t } = useLanguage();
  const rows = useMemo(() => computeRoleStats(matches), [matches]);

  if (rows.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{t("insights.noData")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(r => (
        <div key={r.role} className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold text-muted-foreground w-8 shrink-0">{r.role}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-muted-foreground">{r.games}g · {r.avgKDA} KDA · {r.avgCsMin} cs/m</span>
              <span className={cn("text-[12px] font-bold tabular-nums ml-2", wrColor(r.winRate))}>{r.winRate}%</span>
            </div>
            <div className="h-1 rounded-full bg-secondary/60 overflow-hidden">
              <div className={cn("h-full rounded-full", wrBg(r.winRate))} style={{ width: `${r.winRate}%` }} />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground/50 w-8 text-right shrink-0">{r.pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  matches: MatchData[];
}

export function AdvancedInsights({ matches }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!matches || matches.length < 5) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary/70" />
          <span className="text-[15px] font-semibold text-foreground">{t("insights.title")}</span>
          <span className="text-[11px] text-muted-foreground/60 ml-1">{t("insights.subtitle")}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 grid grid-cols-2 gap-4">
              <SubPanel icon={Skull} label={t("insights.nemesis")}>
                <NemesisPanel matches={matches} />
              </SubPanel>

              <SubPanel icon={Clock} label={t("insights.hourly")}>
                <HourlyPanel matches={matches} />
              </SubPanel>

              <SubPanel icon={Calendar} label={t("insights.dayofweek")}>
                <DayOfWeekPanel matches={matches} />
              </SubPanel>

              <SubPanel icon={Target} label={t("insights.objectives")}>
                <ObjectivePanel matches={matches} />
              </SubPanel>

              <SubPanel icon={Swords} label={t("insights.kda")}>
                <KDAPanel matches={matches} />
              </SubPanel>

              <SubPanel icon={Shield} label={t("insights.roles")}>
                <RolePanel matches={matches} />
              </SubPanel>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
