import { DashboardSkeleton } from "../components/Skeletons";
import { motion } from "motion/react";
import { ArrowUpRight, TrendingUp, Target, Swords, Eye, Crosshair, TrendingDown, Clock, AlertCircle, Zap, Shield, Info, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { 
  AreaChart, Area, 
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, CartesianGrid, XAxis, YAxis, Bar,
  Tooltip 
} from "recharts";
import { DeferredContainer } from "../components/DeferredChart";
import { cn } from "../components/ui/utils";
import { useState, useId, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getDashboardData, getSummonerInfo, getMatchHistory, wasLastMatchFetchOffline } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import { useLanguage } from "../contexts/LanguageContext";
import { TiltTrackerWidget } from "../components/TiltTracker";
import { GoalsSummaryWidget } from "../components/GoalsSummaryWidget";
import { SessionTracker } from "../components/SessionTracker";
import { RANKED_QUEUE_IDS } from "../utils/analytics";
import { MiniCalendarWidget } from "../components/MiniCalendarWidget";
import { LPTrackerWidget } from "../components/LPTrackerWidget";
import { DuoTrackerWidget } from "../components/DuoTrackerWidget";
import { TiltCard } from "../components/TiltCard";
import { AnimatedNumber } from "../components/AnimatedNumber";

const ICON_MAP = {
  swords: Swords,
  eye: Eye,
  target: Target,
};

const INSIGHT_ICON_MAP = {
  clock: Clock,
  crosshair: Crosshair,
  "trending-down": TrendingDown,
  eye: Eye,
  shield: Shield,
  zap: Zap,
  target: Target,
  swords: Swords,
};

const INSIGHT_COLOR_MAP = {
  good: "text-green-500",
  warning: "text-amber-500",
  danger: "text-red-500",
};

export function Dashboard() {
  const [showSources, setShowSources] = useState<string | null>(null);
  const chartId = useId();
  const { t } = useLanguage();
  
  // All data is computed from the match history via dataService
  const { data, isLoading, error, refetch, isRefetching } = useAsyncData(() => getDashboardData(), []);
  const { data: rawMatches, refetch: refetchMatches } = useAsyncData(() => getMatchHistory(), []);
  // Only ranked games feed the dashboard widgets
  const ranked = rawMatches?.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
  const matchesForTilt = ranked && ranked.length > 0 ? ranked : rawMatches;
  const { data: summoner } = useAsyncData(() => getSummonerInfo(), []);

  // True after rawMatches resolves and the last fetch hit the offline localStorage cache
  const isOfflineCache = rawMatches !== undefined && wasLastMatchFetchOffline();

  // Show success toast when refresh completes
  const wasRefetching = useRef(false);
  useEffect(() => {
    if (wasRefetching.current && !isRefetching) {
      toast.success(t("dashboard.refreshed") || "Datos actualizados");
    }
    wasRefetching.current = isRefetching;
  }, [isRefetching, t]);

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <span className="text-sm text-muted-foreground">{error}</span>
        <button
          onClick={() => { refetch(); refetchMatches(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border/50 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          {t("dashboard.retry")}
        </button>
      </div>
    );
  }

  const offlineBanner = isOfflineCache && (
    <div className="flex items-center gap-2 px-3 py-2 mb-6 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {t("dashboard.offlineCache")}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex flex-col font-sans pb-20 aurora-bg"
    >
      {offlineBanner}

      {/* Narrative Welcome Section - Computed from match data */}
      <div className="mb-10 hero-spotlight">
        <div className="flex items-start justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight brand-wordmark flex items-center gap-3">
            {data?.greeting}
          </h1>
          <button
            onClick={() => { refetch(); refetchMatches(); }}
            disabled={isRefetching || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shrink-0 mt-1"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
            {t("dashboard.refresh")}
          </button>
        </div>
        <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          {data?.narrativeHighlights.map((segment, i) =>
            segment.bold
              ? <strong key={i} className="text-foreground font-medium">{segment.text}</strong>
              : <span key={i}>{segment.text}</span>
          )}
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            {t("dash.calculatedFrom").replace("{count}", String(data?.matchCount ?? 0))}
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" />
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* No-match banner */}
      {data?.matchCount === 0 && (
        <div className="mb-8 flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 text-[13px] text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>{t("dash.noMatchesHint")}</span>
        </div>
      )}

      {/* Tilt Tracker */}
      {matchesForTilt && matchesForTilt.length > 0 && (
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <TiltTrackerWidget matches={matchesForTilt} />
        </motion.div>
      )}

      {/* Session Tracker */}
      {matchesForTilt && matchesForTilt.length > 0 && (
        <div className="mb-8">
          <SessionTracker matches={matchesForTilt} />
        </div>
      )}

      {/* LP Tracker */}
      <div className="mb-8">
        <LPTrackerWidget
          rank={summoner?.rank}
          division={summoner?.division}
          lp={summoner?.lp}
          wins={summoner?.wins}
          losses={summoner?.losses}
        />
      </div>

      {/* Goals Summary */}
      <div className="mb-8">
        <GoalsSummaryWidget />
      </div>

      {/* Duo / Premade Tracker */}
      {matchesForTilt && matchesForTilt.length > 0 && (
        <div className="mb-8">
          <DuoTrackerWidget matches={matchesForTilt} />
        </div>
      )}

      {/* Mini Calendar Widget */}
      {matchesForTilt && matchesForTilt.length > 0 && (
        <div className="mb-8">
          <MiniCalendarWidget matches={matchesForTilt} />
        </div>
      )}

      {/* Dynamic Metric Cards */}
      <div data-tour="step-2" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {data?.metrics.map((metric, idx) => {
          const Icon = ICON_MAP[metric.icon];
          const isGood = metric.severity === "good";
          const isWarning = metric.severity === "warning";
          // Extract leading number for animation (e.g. "67%" → 67, "3.8" → 3.8)
          const numMatch = metric.value.match(/^(\d+\.?\d*)/);
          const numValue = numMatch ? parseFloat(numMatch[1]) : null;
          const suffix = numMatch ? metric.value.slice(numMatch[0].length) : null;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <TiltCard
                intensity={5}
                className={cn(
                  "p-5 rounded-2xl border bg-card group card-premium h-full",
                  isGood ? "border-primary/25" :
                  isWarning ? "border-amber-500/25" :
                  "border-border/60"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isGood ? "icon-container-good text-primary" : isWarning ? "bg-amber-500/10 text-amber-500" : "bg-secondary text-muted-foreground"
                  )}>
                    <Icon className={cn("w-5 h-5", isGood && "drop-shadow-[0_0_6px_color-mix(in_srgb,var(--primary)_70%,transparent)]")} />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold tracking-wider uppercase",
                    metric.trend === "up" && "text-emerald-500 bg-emerald-500/10",
                    metric.trend === "down" && "text-amber-500 bg-amber-500/10",
                    metric.trend === "neutral" && "text-muted-foreground bg-secondary"
                  )}>
                    {metric.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> :
                     metric.trend === "down" ? <AlertCircle className="w-3 h-3" /> :
                     <TrendingUp className="w-3 h-3" />}
                    {metric.trendLabel}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={cn("text-[24px] font-mono font-semibold tracking-tight stat-accent number-emerge", isGood ? "value-good" : isWarning ? "" : "text-foreground")}>
                    {numValue !== null
                      ? <AnimatedNumber value={numValue} decimals={Number.isInteger(numValue) ? 0 : 1} suffix={suffix ?? ""} />
                      : metric.value}
                  </span>
                  <span className="text-[13px] text-muted-foreground">{metric.label}</span>
                </div>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>

      {/* Deep Dive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* CS/min Trend Graph */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6 flex flex-col h-[320px] card-premium">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[16px] font-semibold text-foreground border-l-2 border-primary/50 pl-3">{t("dash.farmConsistency")}</h3>
              <p className="text-[13px] text-muted-foreground mt-1">{t("dash.lastRanked").replace("{count}", String(data?.matchCount ?? 0))}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono text-muted-foreground">{t("dash.currentAvg")}:</span>
              <span className="text-[14px] font-mono font-bold text-primary">{data?.csmAverage}</span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[150px]">
            <DeferredContainer key={`${chartId}-csm-rc`} width="100%" height="100%">
              <AreaChart data={data?.csmTrend} id={`${chartId}-csm`}>
                <defs key="csm-defs">
                  <linearGradient id={`${chartId}-colorCsm`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip
                  key="csm-tooltip"
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value: any) => [`${value} CS/M`, t("common.match")]}
                />
                <Area
                  key="csm-area"
                  type="monotone" 
                  dataKey="csm" 
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill={`url(#${chartId}-colorCsm)`} 
                  animationDuration={1500}
                />
              </AreaChart>
            </DeferredContainer>
          </div>
        </div>

        {/* Playstyle Radar - computed from actual game data */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col h-[320px] card-premium">
          <h3 className="text-[16px] font-semibold text-foreground mb-1 border-l-2 border-primary/50 pl-3">{t("dash.playstyle")}</h3>
          <p className="text-[11px] text-muted-foreground mb-3">{t("dash.basedOn").replace("{count}", String(data?.matchCount ?? 0))}</p>
          <div className="flex-1 w-full min-h-[150px] flex items-center justify-center">
            <DeferredContainer key={`${chartId}-radar-rc`} width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data?.playstyle} id={`${chartId}-radar`}>
                <PolarGrid key="radar-grid" stroke="var(--border)" strokeOpacity={0.5} />
                <PolarAngleAxis key="radar-axis" dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                <Tooltip
                  key="radar-tooltip"
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--primary)' }}
                  formatter={(value: any) => [`${value}/100`, t("common.score")]}
                />
                <Radar key="radar-data" name={t("profile.title")} dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
              </RadarChart>
            </DeferredContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Performance - computed from match history */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6 flex flex-col h-[320px] card-premium">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[16px] font-semibold text-foreground border-l-2 border-primary/50 pl-3">{t("dash.winrateByRole")}</h3>
              <p className="text-[13px] text-muted-foreground mt-1">{t("dash.seasonRanked")}</p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[150px]">
            <DeferredContainer key={`${chartId}-bar-rc`} width="100%" height="100%">
              <BarChart data={data?.roleWinrates} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} id={`${chartId}-bar`}>
                <CartesianGrid key="bar-grid" strokeDasharray="3 3" horizontal={false} stroke="var(--border)" strokeOpacity={0.3} />
                <XAxis key="bar-xaxis" type="number" domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis key="bar-yaxis" dataKey="role" type="category" tick={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip
                  key="bar-tooltip"
                  cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, _name: any, props: any) => {
                    const item = data?.roleWinrates.find(r => r.role === props.payload.role);
                    return [`${value}% (${item?.games || 0} ${t("common.games").toLowerCase()})`, t("common.winrate")];
                  }}
                />
                <Bar key="bar-data" dataKey="winrate" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </DeferredContainer>
          </div>
        </div>

        {/* Actionable Insights - ALL computed from data patterns */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-foreground/70 uppercase tracking-wider border-l-2 border-primary/50 pl-3">{t("dash.autoTips")}</h3>
            <span className="text-[10px] text-muted-foreground/50 font-mono">{data?.insights.length} {t("dash.detected")}</span>
          </div>
          
          {data?.insights.slice(0, 4).map((insight, idx) => {
            const Icon = INSIGHT_ICON_MAP[insight.icon];
            const isShowingSource = showSources === `insight-${idx}`;
            return (
              <motion.div
                key={`insight-${idx}`}
                className="p-4 rounded-xl bg-card border border-border/40 flex flex-col gap-2 cursor-pointer card-premium"
                onClick={() => setShowSources(isShowingSource ? null : `insight-${idx}`)}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex gap-4">
                  <div className={cn("mt-0.5 shrink-0", INSIGHT_COLOR_MAP[insight.severity])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-foreground mb-1">{insight.title}</div>
                    <div className="text-[12px] text-muted-foreground leading-relaxed">
                      {insight.description}
                    </div>
                  </div>
                </div>
                {/* Source data - click to reveal */}
                {isShowingSource && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 pt-2 border-t border-border/40"
                  >
                    <div className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed bg-secondary/30 p-2 rounded">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 block mb-1">{t("dash.sourceLabel")}</span>
                      {insight.source}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          <div className="text-[10px] text-muted-foreground/40 text-center mt-1">
            {t("dash.clickTip")}
          </div>
        </div>
      </div>
    </motion.div>
  );
}