import { motion } from "motion/react";
import { ProfileSkeleton } from "../components/Skeletons";
import { ErrorState } from "../components/ErrorState";
import { TrendingUp, TrendingDown, Swords, ArrowUpRight, ArrowDownRight, ChevronDown, Flame, Mountain, Download } from "lucide-react";
import { getLPHistory, computeLPStats, formatTotalLP } from "../services/lpTracker";
import { AreaChart, Area, XAxis, Tooltip } from "recharts";
import { DeferredContainer } from "../components/DeferredChart";
import { cn } from "../components/ui/utils";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { getProfileStats, getMatchHistory } from "../services/dataService";
import { RANKED_QUEUE_IDS } from "../utils/analytics";
import { useAsyncData } from "../hooks/useAsyncData";
import { useChampionDrawer } from "../contexts/ChampionDrawerContext";
import { useState, useRef, useEffect, useId, useMemo } from "react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { useLanguage } from "../contexts/LanguageContext";
import { DataExportButton } from "../components/DataExport";
import { DuoSynergySection } from "../components/DuoSynergy";
import { WardHeatmap } from "../components/WardHeatmap";
import { AdvancedInsights } from "../components/AdvancedInsights";
import { BadgeDisplay } from "../components/BadgeDisplay";
import { RankEmblem } from "../components/RankEmblem";
import { useLeagueClient } from "../contexts/LeagueClientContext";

// Rank labels now come from LanguageContext via t("rank.IRON"), t("rank.GOLD"), etc.

export function Profile() {
  const { version: patchVersion } = usePatchVersion();
  const { t } = useLanguage();
  const { clientState } = useLeagueClient();
  const { data: stats, isLoading, error, refetch } = useAsyncData(() => getProfileStats(t), [t, clientState]);
  const { data: matches } = useAsyncData(() => getMatchHistory(), [clientState]);
  const [gameFilter, setGameFilter] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(() => {
    try { return localStorage.getItem("velaris-profile-advanced") === "1"; } catch { return false; }
  });
  const filterRef = useRef<HTMLDivElement>(null);
  const chartId = useId();
  const { openChampion } = useChampionDrawer();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getChampImg = (champ: string) => `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${champ}.png`;

  // Compute real filtered stats — must be before early returns (hooks rule)
  // Last 10 ranked game results for recent form indicator
  // Historical streaks
  const streakStats = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    const sorted = [...matches].sort((a, b) => a.gameCreation - b.gameCreation);
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
    for (const m of sorted) {
      const p = m.participants[m.playerParticipantIndex];
      if (!p) continue;
      if (p.win) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
      else { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
    }
    return { maxWin, maxLoss };
  }, [matches]);

  // Compare vs peak LP
  const lpComparison = useMemo(() => {
    const history = getLPHistory();
    const s = computeLPStats(history);
    if (!s) return null;
    return { current: s.current, peak: s.peak, peakFormatted: s.peakFormatted, currentFormatted: formatTotalLP(s.current), diff: s.current - s.peak };
  }, []);

  const recentForm = useMemo(() => {
    if (!matches) return { form: [], streak: 0, streakWin: true };
    const ranked = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
    const source = ranked.length > 0 ? ranked : matches;
    const sorted = [...source].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, 10);
    const form = sorted.flatMap(m => {
      const p = m.participants[m.playerParticipantIndex];
      if (!p) return [];
      return [{ win: p.win, champ: p.championName }];
    });
    // Compute current streak from most recent game
    let streak = 0;
    if (form.length > 0) {
      const dir = form[0].win;
      for (const g of form) {
        if (g.win !== dir) break;
        streak++;
      }
    }
    return { form, streak, streakWin: form[0]?.win ?? true };
  }, [matches]);

  // Most-played role (for contextual rank title)
  const mainRole = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const m of matches) {
      const pos = m.participants[m.playerParticipantIndex]?.teamPosition;
      if (pos) counts[pos] = (counts[pos] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    // Only claim a main role if it's >30% of games
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    return sorted[0][1] / total > 0.3 ? sorted[0][0] : null;
  }, [matches]);

  const filteredStats = useMemo(() => {
    const baseWinrate = stats?.winrate ?? 0;
    const baseKda = stats?.avgKda ?? 0;
    const baseCsPerMin = stats?.avgCsPerMin ?? 0;
    const baseTotalGames = stats?.totalGames ?? 0;
    if (!stats || !matches || matches.length === 0) {
      return { winrate: baseWinrate, kda: baseKda, csPerMin: baseCsPerMin, count: baseTotalGames };
    }
    // Only count ranked games for stats
    const ranked = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
    const source = ranked.length > 0 ? ranked : matches;
    const sorted = [...source].sort((a, b) => b.gameCreation - a.gameCreation);
    const subset = gameFilter ? sorted.slice(0, gameFilter) : sorted;
    if (subset.length === 0) return { winrate: baseWinrate, kda: baseKda, csPerMin: baseCsPerMin, count: baseTotalGames };
    const validSubset = subset.filter(m => m.participants[m.playerParticipantIndex] != null);
    if (validSubset.length === 0) return { winrate: baseWinrate, kda: baseKda, csPerMin: baseCsPerMin, count: baseTotalGames };
    const wins = validSubset.filter(m => m.participants[m.playerParticipantIndex].win).length;
    const fw = Math.round((wins / validSubset.length) * 100);
    const fk = parseFloat((validSubset.reduce((s, m) => {
      const p = m.participants[m.playerParticipantIndex];
      return s + (p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists);
    }, 0) / validSubset.length).toFixed(1));
    const fc = parseFloat((validSubset.reduce((s, m) => {
      const p = m.participants[m.playerParticipantIndex];
      return s + (p.totalMinionsKilled + p.neutralMinionsKilled) / (Math.max(m.gameDuration, 1) / 60);
    }, 0) / validSubset.length).toFixed(1));
    return { winrate: fw, kda: fk, csPerMin: fc, count: validSubset.length };
  }, [matches, gameFilter, stats]);

  // M11 — Champion heatmap (all played champs, sorted by games played)
  const champGrid = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    const map: Record<string, { wins: number; games: number }> = {};
    for (const m of matches) {
      const p = m.participants[m.playerParticipantIndex];
      if (!p) continue;
      if (!map[p.championName]) map[p.championName] = { wins: 0, games: 0 };
      map[p.championName].games++;
      if (p.win) map[p.championName].wins++;
    }
    return Object.entries(map)
      .map(([name, { wins, games }]) => ({ name, games, wr: Math.round((wins / games) * 100) }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 24);
  }, [matches]);

  // M12 — Death phase analysis (early/mid/late per game)
  const phaseDeaths = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    let early = 0, mid = 0, late = 0, games = 0;
    for (const m of matches) {
      const p = m.participants[m.playerParticipantIndex];
      if (!p?.deathTimestamps?.length) continue;
      games++;
      for (const ts of p.deathTimestamps) {
        if (ts <= 14) early++;
        else if (ts <= 25) mid++;
        else late++;
      }
    }
    if (games === 0) return null;
    const e = +(early / games).toFixed(1);
    const m2 = +(mid / games).toFixed(1);
    const l = +(late / games).toFixed(1);
    const maxVal = Math.max(e, m2, l, 0.1);
    const worstPhase = e >= m2 && e >= l ? "early" : m2 >= l ? "mid" : "late";
    return { early: e, mid: m2, late: l, maxVal, games, worstPhase };
  }, [matches]);

  // F6 — WR by hour of day
  const hourlyWR = useMemo(() => {
    if (!matches || matches.length < 5) return null;
    const buckets: Record<number, { wins: number; total: number }> = {};
    for (const m of matches) {
      const hour = new Date(m.gameCreation).getHours();
      if (!buckets[hour]) buckets[hour] = { wins: 0, total: 0 };
      buckets[hour].total++;
      const p = m.participants[m.playerParticipantIndex];
      if (p?.win) buckets[hour].wins++;
    }
    const result = Object.entries(buckets)
      .map(([h, { wins, total }]) => ({ hour: Number(h), wr: Math.round((wins / total) * 100), total }))
      .filter(h => h.total >= 2)
      .sort((a, b) => a.hour - b.hour);
    return result.length >= 3 ? result : null;
  }, [matches]);

  // F7 — Death context (solo / skirmish / teamfight)
  const deathContext = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    let solo = 0, skirmish = 0, teamfight = 0, total = 0;
    for (const m of matches) {
      const p = m.participants[m.playerParticipantIndex];
      if (!p?.deathTimestamps?.length) continue;
      for (const ts of p.deathTimestamps) {
        total++;
        if (ts < 5) solo++;
        else if (ts < 15) skirmish++;
        else teamfight++;
      }
    }
    if (total < 5) return null;
    return {
      solo:       Math.round((solo       / total) * 100),
      skirmish:   Math.round((skirmish   / total) * 100),
      teamfight:  Math.round((teamfight  / total) * 100),
      total,
    };
  }, [matches]);

  if (isLoading && !stats) {
    return <ProfileSkeleton />;
  }
  if (error && !stats) {
    return <ErrorState error={error} onRetry={refetch} />;
  }
  if (!stats) return null;

  const { summoner, winrate, totalGames, avgKda, avgCsPerMin, avgVisionPerMin, bestChampions, recentTrend, roleDistribution, strengths, weaknesses } = stats;

  const displayGames = gameFilter ?? totalGames;
  const filteredWinrate = filteredStats.winrate;
  const filteredKda = filteredStats.kda;
  const filteredCsPerMin = filteredStats.csPerMin;
  const sampleSize = filteredStats.count;

  const profileIconUrl = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/profileicon/${summoner.profileIconId}.png`;
  const rankLabel = t(`rank.${summoner.rank}`) || summoner.rank;

  return (
    <motion.div id="profile-stats-export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full max-w-4xl mx-auto flex flex-col font-sans gap-8 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{t("profile.title")}</h1>
        <div className="relative" ref={filterRef}>
          <button onClick={() => setFilterOpen(!filterOpen)} className={cn("flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer", filterOpen ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/60 hover:bg-secondary border-border/50")}>
            {displayGames} {t("profile.gamesPlayed")} <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", filterOpen && "rotate-180")} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border/60 rounded-lg shadow-xl z-20 overflow-hidden min-w-[140px]">
              {[{ label: t("profile.last10"), value: 10 }, { label: t("profile.last20"), value: 20 }, { label: `${t("profile.all")} (${totalGames})`, value: null as number | null }].map((opt) => (
                <button key={opt.label} onClick={() => { setGameFilter(opt.value); setFilterOpen(false); }} className={cn("w-full text-left px-4 py-2 text-[13px] font-medium hover:bg-secondary/50 transition-colors cursor-pointer", (gameFilter ?? null) === opt.value ? "text-primary bg-primary/5" : "text-foreground")}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="p-6 bg-card rounded-2xl flex items-center justify-between shadow-sm card-lift card-shine card-border-gradient">
        <div className="flex items-center gap-5">
          <div className="relative w-[96px] h-[96px] shrink-0">
            {/* Winrate ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="44" fill="none" stroke="var(--border)" strokeWidth="4" />
              <circle
                cx="48" cy="48" r="44" fill="none"
                stroke={filteredWinrate >= 50 ? "var(--color-chart-2)" : "var(--color-destructive)"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - filteredWinrate / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-[6px] rounded-full overflow-hidden border-2 border-background shadow-md">
              <img src={profileIconUrl} alt={summoner.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/1.png"; }} />
            </div>
          </div>

          {/* Rank emblem */}
          <RankEmblem
            rank={summoner.rank}
            division={summoner.division}
            lp={summoner.lp}
            wins={summoner.wins}
            losses={summoner.losses}
            size="lg"
            showStats
            role={mainRole}
            streak={recentForm.streak >= 3 ? { count: recentForm.streak, isWin: recentForm.streakWin } : null}
          />

          <div className="flex flex-col gap-1">
            <h2 className="text-[24px] font-semibold tracking-tight">{summoner.name}<span className="text-muted-foreground text-[14px] font-normal ml-2">#{summoner.tag}</span></h2>
            <span className="text-sm font-medium flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_var(--color-primary)]" />
                {rankLabel} {summoner.division} — {summoner.lp} LP
              </span>
              <span className="text-muted-foreground/60 text-[12px]">{t("profile.level")} {summoner.level}</span>
            </span>
            {/* Recent form dots */}
            {recentForm.form.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold mr-0.5">{t("profile.recentForm")}</span>
                {recentForm.form.map((g, i) => (
                  <div
                    key={i}
                    title={`${g.win ? t("profile.win") : t("profile.loss")} · ${g.champ}`}
                    className={cn(
                      "w-[18px] h-[18px] rounded-full border-2 overflow-hidden relative shrink-0",
                      g.win ? "border-emerald-500/60" : "border-red-500/60"
                    )}
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${g.champ}.png`}
                      className="w-full h-full object-cover scale-125"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className={cn("absolute inset-0 opacity-30", g.win ? "bg-emerald-500" : "bg-red-500")} />
                  </div>
                ))}
                {recentForm.streak >= 3 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded ml-0.5",
                    recentForm.streakWin ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                  )}>
                    {recentForm.streakWin
                      ? t("profile.streakWin").replace("{count}", String(recentForm.streak))
                      : t("profile.streakLoss").replace("{count}", String(recentForm.streak))}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/40 ml-0.5">
                  {t("profile.lastN").replace("{count}", String(recentForm.form.length))}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-8 pr-4">
          {gameFilter && (
            <span className="text-[10px] text-muted-foreground/50 font-mono border border-border/40 rounded px-2 py-0.5">
              {sampleSize} {t("common.games").toLowerCase()}
            </span>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t("profile.victoryRate")}</span>
            <AnimatedNumber
              value={filteredWinrate}
              suffix="%"
              className={cn("text-xl font-bold stat-accent", filteredWinrate >= 50 ? "text-emerald-500" : "text-destructive")}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">KDA</span>
            <AnimatedNumber
              value={filteredKda}
              decimals={1}
              className="text-xl font-bold text-gradient stat-accent"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">CS/Min</span>
            <AnimatedNumber
              value={filteredCsPerMin}
              decimals={1}
              className="text-xl font-bold stat-accent"
            />
          </div>
        </div>
      </div>

      {/* Champion Mastery */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground section-title">{t("profile.mostPlayed")}</h2>
          <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{t("profile.top")} {bestChampions.length}</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>{t("profile.champion")}</span><span>{t("common.games")}</span><span>KDA</span><span>{t("common.winrate")}</span>
          </div>
          {bestChampions.length === 0 && (
            <div className="flex items-center justify-center h-24 rounded-xl border border-border/40 border-dashed text-[13px] text-muted-foreground/60">
              {t("profile.noChampions")}
            </div>
          )}
          {bestChampions.map((champ) => (
            <div key={champ.name} onClick={() => openChampion(champ.name)} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center p-3 bg-card border border-border/60 rounded-xl hover:border-primary/30 transition-colors cursor-pointer card-lift card-shine">
              <div className="flex items-center gap-3">
                <img src={getChampImg(champ.name)} alt={champ.name} className="w-10 h-10 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold">{champ.name}</span>
                  <span className="text-[11px] text-muted-foreground">{champ.games} {t("profile.gamesPlayed")}</span>
                </div>
              </div>
              <span className="font-mono text-[13px]">{champ.games}</span>
              <span className="font-mono text-[13px] font-medium">{champ.kda}</span>
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <span className={cn(champ.winrate >= 55 ? "text-emerald-500" : champ.winrate >= 50 ? "text-foreground" : "text-destructive")}>{champ.winrate}%</span>
                {champ.winrate >= 55 ? <TrendingUp className="w-3 h-3 text-green-500" /> : champ.winrate < 50 ? <TrendingDown className="w-3 h-3 text-red-500" /> : null}
              </div>
            </div>
          ))}
        </div>

        {/* ── Champion heatmap (M11) ── */}
        {champGrid.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {champGrid.map(c => (
              <div
                key={c.name}
                title={`${c.name}: ${c.wr}% WR (${c.games}p)`}
                className={cn(
                  "relative rounded-lg overflow-hidden ring-2 cursor-default",
                  c.wr >= 55 ? "ring-emerald-500/60" : c.wr <= 44 ? "ring-red-400/60" : "ring-white/15"
                )}
                style={{ width: 40, height: 40 }}
              >
                <img src={getChampImg(c.name)} alt={c.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="absolute bottom-0 left-0 right-0 text-center text-[7px] font-bold bg-black/70 text-white leading-none py-[2px]">
                  {c.wr}%
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Death phase analysis (M12) ── */}
      {phaseDeaths && (
        <section className="flex flex-col gap-4 p-6 bg-card border border-border/60 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">{t("profile.phaseDeaths.title")}</h2>
            <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{t("profile.phaseDeaths.games").replace("{count}", String(phaseDeaths.games))}</span>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: t("profile.phaseDeaths.early"), sub: "0–14min",  val: phaseDeaths.early, isWorst: phaseDeaths.worstPhase === "early" },
              { label: t("profile.phaseDeaths.mid"),   sub: "14–25min", val: phaseDeaths.mid,   isWorst: phaseDeaths.worstPhase === "mid" },
              { label: t("profile.phaseDeaths.late"),  sub: "25min+",   val: phaseDeaths.late,  isWorst: phaseDeaths.worstPhase === "late" },
            ].map(({ label, sub, val, isWorst }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex flex-col w-[120px] shrink-0">
                  <span className={cn("text-[12px] font-semibold", isWorst ? "text-destructive" : "text-foreground")}>{label}</span>
                  <span className="text-[10px] text-muted-foreground">{sub}</span>
                </div>
                <div className="flex-1 h-2 bg-secondary/60 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", isWorst ? "bg-destructive/70" : "bg-primary/50")}
                    style={{ width: `${(val / phaseDeaths.maxVal) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 w-[80px] shrink-0 text-right">
                  <span className={cn("text-[12px] font-mono font-bold", isWorst ? "text-destructive" : "text-muted-foreground")}>{val}</span>
                  <span className="text-[10px] text-muted-foreground">{t("profile.phaseDeaths.deathsPerGame")}</span>
                  {isWorst && <span className="text-[9px] text-destructive ml-1">{t("profile.phaseDeaths.worst")}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Roles & Stats */}
      <section className="grid grid-cols-[2fr_1fr] gap-6">
        <div className="flex flex-col gap-4 p-6 bg-card border border-border/60 rounded-2xl shadow-sm card-lift card-shine">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-semibold text-foreground section-title">{t("profile.lpTrend")}</h2>
            <span className="text-[11px] font-medium bg-secondary px-2 py-1 rounded-md">{t("profile.last10Label")}</span>
          </div>
          <div className="h-[200px] w-full mt-4 min-h-[200px]">
            <DeferredContainer key={`${chartId}-lp-rc`} width="100%" height="100%">
              <AreaChart data={recentTrend} id={`${chartId}-lp`}>
                <defs key={`${chartId}-defs`}>
                  <linearGradient id={`${chartId}-colorValueProfile`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis key={`${chartId}-xaxis`} dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip key={`${chartId}-tooltip`} contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }} formatter={(value: number) => [`${value > 0 ? "+" : ""}${value} LP`, t("profile.accumulated")]} />
                <Area key={`${chartId}-area`} type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill={`url(#${chartId}-colorValueProfile)`} />
              </AreaChart>
            </DeferredContainer>
          </div>
          <div className="pt-4 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block mb-3">{t("profile.roleDistribution")}</span>
            {(() => {
              const total = roleDistribution.reduce((s, r) => s + r.games, 0);
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider w-[38px] shrink-0">{t("profile.roleHeader.role")}</span>
                    <span className="flex-1 text-[9px] text-muted-foreground/40 uppercase tracking-wider">{t("profile.roleHeader.games")}</span>
                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider w-[26px] text-right shrink-0">%</span>
                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider w-[30px] text-right shrink-0">WR</span>
                  </div>
                  {roleDistribution.map(r => {
                    const pct = total > 0 ? Math.round((r.games / total) * 100) : 0;
                    return (
                      <div key={r.role} className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground w-[38px] shrink-0">{r.role}</span>
                        <div className="flex-1 h-[6px] bg-secondary/60 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", r.winrate >= 55 ? "bg-emerald-500" : r.winrate >= 50 ? "bg-primary" : "bg-destructive/60")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/60 w-[26px] text-right shrink-0">{pct}%</span>
                        <span className={cn("text-[10px] font-bold w-[30px] text-right shrink-0", r.winrate >= 55 ? "text-emerald-500" : r.winrate >= 50 ? "text-foreground" : "text-destructive")}>{r.winrate}%</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 bg-card border border-border/60 rounded-2xl shadow-sm card-lift card-shine">
          <h2 className="text-[15px] font-semibold text-foreground mb-2 border-l-2 border-primary/50 pl-3">{t("profile.autoAnalysis")}</h2>
          {strengths.length > 0 && (
            <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-3 h-3" /> {t("profile.strengths")}
              </span>
              <div className="flex flex-col gap-1.5">
                {strengths.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />{s}
                  </div>
                ))}
              </div>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="flex flex-col gap-2 pt-3 border-t border-border/40">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownRight className="w-3 h-3" /> {t("profile.improvements")}
              </span>
              <div className="flex flex-col gap-1.5">
                {weaknesses.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/15 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />{w}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Historical Streaks + LP vs Peak */}
      {(streakStats || lpComparison) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {streakStats && (
            <div className="p-5 rounded-2xl border border-border/60 bg-card card-lift">
              <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-amber-500" />
                {t("profile.streaks.title")}
              </h3>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">{t("profile.streaks.bestWin")}</p>
                  <p className="text-[28px] font-mono font-bold text-emerald-500">{streakStats.maxWin}</p>
                  <p className="text-[11px] text-muted-foreground">{t("profile.streaks.winsRow")}</p>
                </div>
                <div className="w-px bg-border/40" />
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">{t("profile.streaks.worstLoss")}</p>
                  <p className="text-[28px] font-mono font-bold text-red-400">{streakStats.maxLoss}</p>
                  <p className="text-[11px] text-muted-foreground">{t("profile.streaks.lossesRow")}</p>
                </div>
              </div>
            </div>
          )}
          {lpComparison && (
            <div className="p-5 rounded-2xl border border-border/60 bg-card card-lift">
              <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2 mb-4">
                <Mountain className="w-4 h-4 text-primary" />
                {t("profile.peak.title")}
              </h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{t("profile.peak.allTime")}</span>
                  <span className="font-mono font-semibold text-amber-500">{lpComparison.peakFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{t("profile.peak.now")}</span>
                  <span className="font-mono font-semibold text-foreground">{lpComparison.currentFormatted}</span>
                </div>
                <div className="h-px bg-border/40 my-1" />
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{t("profile.peak.diff")}</span>
                  <span className={cn("font-mono font-bold", lpComparison.diff >= 0 ? "text-emerald-500" : "text-red-400")}>
                    {lpComparison.diff >= 0 ? "+" : ""}{lpComparison.diff} LP
                  </span>
                </div>
                {lpComparison.diff < 0 && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {t("profile.peak.below").replace("{diff}", String(Math.abs(lpComparison.diff)))}
                  </p>
                )}
                {lpComparison.diff >= 0 && (
                  <p className="text-[10px] text-emerald-500/80 mt-1 font-medium">
                    {t("profile.peak.atPeak")}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Toggle secciones avanzadas */}
      <div className="flex justify-center">
        <button
          onClick={() => {
            const next = !showAdvanced;
            setShowAdvanced(next);
            try { localStorage.setItem("velaris-profile-advanced", next ? "1" : "0"); } catch {}
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/40"
        >
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showAdvanced && "rotate-180")} />
          {showAdvanced ? t("profile.hideAdvanced") : t("profile.showAdvanced")}
        </button>
      </div>

      {showAdvanced && <>

      {/* F6 — WR por franja horaria */}
      {hourlyWR && (
        <section className="p-6 bg-card border border-border/60 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground">{t("profile.hourlyWR.title")}</h2>
          </div>
          <div className="flex flex-col gap-2">
            {hourlyWR.map(({ hour, wr, total }: { hour: number; wr: number; total: number }) => (
              <div key={hour} className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-muted-foreground w-8 shrink-0">{String(hour).padStart(2, "0")}h</span>
                <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden relative">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      wr >= 55 ? "bg-emerald-500/70" : wr >= 50 ? "bg-primary/60" : wr >= 45 ? "bg-amber-500/60" : "bg-destructive/50"
                    )}
                    style={{ width: `${wr}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-foreground/80">{wr}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground/50 w-12 text-right shrink-0">{t("profile.hourlyWR.games").replace("{count}", String(total))}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* F7 — Contexto de muertes */}
      {deathContext && (
        <section className="p-6 bg-card border border-border/60 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-destructive/80" />
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground">{t("profile.deathCtx.title")}</h2>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">{t("profile.deathCtx.analyzed").replace("{count}", String(deathContext.total))}</span>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: t("profile.deathCtx.solo"),      pct: deathContext.solo,      desc: t("profile.deathCtx.before5"), color: "bg-amber-500/60" },
              { label: t("profile.deathCtx.skirmish"),  pct: deathContext.skirmish,  desc: t("profile.deathCtx.min515"),  color: "bg-primary/60" },
              { label: t("profile.deathCtx.teamfight"), pct: deathContext.teamfight, desc: t("profile.deathCtx.after15"), color: "bg-destructive/60" },
            ].map(({ label, pct, desc, color }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-foreground">{label}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{pct}% <span className="text-muted-foreground/50">({desc})</span></span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Duo Synergy */}
      {matches && matches.length > 0 && (
        <DuoSynergySection matches={matches} />
      )}

      {/* Ward Heatmap */}
      {matches && matches.length > 0 && (
        <WardHeatmap />
      )}

      {/* Advanced Insights */}
      {matches && matches.length >= 5 && (
        <AdvancedInsights matches={matches} />
      )}

      {/* Badges */}
      {matches && (
        <BadgeDisplay matches={matches} lpHistory={getLPHistory()} />
      )}

      {/* Export Row */}
      {matches && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const style = document.createElement("style");
              style.textContent = `@media print { body * { visibility: hidden !important; } #profile-stats-export, #profile-stats-export * { visibility: visible !important; } #profile-stats-export { position: fixed !important; left: 0; top: 0; width: 100vw; } }`;
              document.head.appendChild(style);
              window.print();
              setTimeout(() => document.head.removeChild(style), 500);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-secondary/40 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {t("profile.exportStats")}
          </button>
          <DataExportButton matches={matches} summoner={summoner} />
        </div>
      )}

      </>}
    </motion.div>
  );
}