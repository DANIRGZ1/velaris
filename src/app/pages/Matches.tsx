import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, TrendingUp, Cpu, ChevronRight, Calendar, Crosshair, Loader2, Shield, Swords, Crown, Star, Eye, Flame, Zap, Skull, Target, Heart, Droplets, History, X, Filter, BarChart3 } from "lucide-react";
import { cn } from "../components/ui/utils";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { getMatchHistory, clearMatchCache } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import type { MatchData } from "../utils/analytics";
import { useLanguage } from "../contexts/LanguageContext";
import { RuneTreeCompact, RuneTreeFull } from "../components/RuneTreeDisplay";
import { MatchesSkeleton } from "../components/Skeletons";
import { PageHeader } from "../components/PageHeader";
import { timeAgo } from "../utils/timeAgo";
import { useNavigate } from "react-router";

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// ─── Summoner Spell i18n helper ───────────────────────────────────────────────
const SPELL_IDS = [1, 3, 4, 6, 7, 11, 12, 13, 14, 21, 32, 39];
function getSpellName(id: number, t: (key: string) => string): string {
  return SPELL_IDS.includes(id) ? t(`spell.${id}`) : `Spell ${id}`;
}

// ─── Role i18n helper ─────────────────────────────────────────────────────────
const ROLE_KEY_MAP: Record<string, string> = {
  TOP: "role.top", JUNGLE: "role.jgl", MIDDLE: "role.mid", BOTTOM: "role.adc", UTILITY: "role.sup",
};
function getRoleLabel(role: string, t: (key: string) => string): string {
  return ROLE_KEY_MAP[role] ? t(ROLE_KEY_MAP[role]) : role;
}

// ─── Streak detection (#24) ──────────────────────────────────────────────────
function detectStreaks(matches: MatchData[]): Map<string, { type: "win" | "loss"; count: number }> {
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  const streakMap = new Map<string, { type: "win" | "loss"; count: number }>();
  
  let i = 0;
  while (i < sorted.length) {
    const m = sorted[i];
    const p = m.participants[m.playerParticipantIndex];
    const isWin = p.win;
    let count = 1;
    let j = i + 1;
    while (j < sorted.length) {
      const mj = sorted[j];
      const pj = mj.participants[mj.playerParticipantIndex];
      if (pj.win !== isWin) break;
      count++;
      j++;
    }
    if (count >= 3) {
      for (let k = i; k < j; k++) {
        streakMap.set(sorted[k].matchId, { type: isWin ? "win" : "loss", count });
      }
    }
    i = j;
  }
  return streakMap;
}

// ─── Template interpolation helper ──────────────────────────────────────────
function interp(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

function generateAutopsy(match: MatchData, t: (key: string) => string) {
  const player = match.participants[match.playerParticipantIndex];
  const durationMin = match.gameDuration / 60;
  const csPerMin = (player.totalMinionsKilled + player.neutralMinionsKilled) / durationMin;
  const earlyDeaths = player.deathTimestamps.filter(t => t <= 5).length;

  const teamParticipants = match.participants.filter((_, i) => {
    const playerTeam = match.playerParticipantIndex < 5 ? 0 : 1;
    const pTeam = i < 5 ? 0 : 1;
    return playerTeam === pTeam;
  });
  const teamKills = teamParticipants.reduce((sum, p) => sum + p.kills, 0);
  const teamDamage = teamParticipants.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);
  const kp = teamKills > 0 ? ((player.kills + player.assists) / teamKills) * 100 : 0;
  const damageShare = teamDamage > 0 ? (player.totalDamageDealtToChampions / teamDamage) * 100 : 0;
  const kda = player.deaths > 0 ? (player.kills + player.assists) / player.deaths : player.kills + player.assists;
  const isSup = player.teamPosition === "UTILITY";
  const isJgl = player.teamPosition === "JUNGLE";
  const goldUnspent = player.goldEarned - player.goldSpent;

  // Common variables for template interpolation
  const v = {
    minutes: Math.floor(durationMin),
    champion: player.championName,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    dmgShare: damageShare.toFixed(0),
    csPerMin: csPerMin.toFixed(1),
    kp: kp.toFixed(0),
    visionScore: player.visionScore ?? 0,
    role: isSup ? t("role.support") : t("role.jungler"),
    turretKills: player.turretKills,
    earlyDeaths,
    kda: kda.toFixed(1),
    goldUnspent: goldUnspent.toLocaleString(),
  };

  const auto = (key: string) => ({
    title: interp(t(`autopsy.${key}.title`), v),
    autopsy: interp(t(`autopsy.${key}.body`), v),
  });

  if (player.win) {
    if (player.deaths === 0 && durationMin > 20) return auto("win.deathless");
    if (player.kills >= 10 && damageShare > 30) return auto("win.carry");
    if (csPerMin >= 8 && player.deaths <= 2) return auto("win.perfectFarm");
    if (damageShare > 35) return auto("win.mainDmg");
    if (player.assists > player.kills * 2 && kp > 60) return auto("win.facilitator");
    if ((player.visionScore ?? 0) > 40 && (isSup || isJgl)) return auto("win.mapControl");
    if (player.turretKills >= 2) return auto("win.demolisher");
    if (durationMin < 20) return auto("win.stomp");
    if (durationMin > 35) return auto("win.lateGame");
    if (player.firstBloodKill) return auto("win.firstBlood");
    if (earlyDeaths >= 2 && player.win) return auto("win.comeback");
    return auto("win.solid");
  } else {
    if (earlyDeaths >= 3) return auto("loss.earlyCollapse");
    if (earlyDeaths >= 2) return auto("loss.earlyAmbush");
    if (player.deaths >= 8) return auto("loss.tooManyDeaths");
    if (kp < 30 && !isSup) return auto("loss.disconnected");
    if (damageShare < 12 && !isSup) return auto("loss.noImpact");
    if (csPerMin < 4 && !isSup && !isJgl) return auto("loss.resourceStarved");
    if (goldUnspent > 2000) return auto("loss.goldWasted");
    if (kda >= 3 && !player.win) return auto("loss.goodKda");
    if (durationMin < 20) return auto("loss.quickDefeat");
    if (durationMin > 35) return auto("loss.longDefeat");
    if (player.deaths >= 6) return auto("loss.excessDeaths");
    return auto("loss.close");
  }
}

type TagCategory = "positive" | "carry" | "support" | "map" | "tempo" | "result";
interface TagInfo { label: string; category: TagCategory; }

const TAG_COLORS: Record<TagCategory, string> = {
  positive: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
  carry:    "bg-orange-500/15 text-orange-500 border border-orange-500/20",
  support:  "bg-sky-500/15 text-sky-500 border border-sky-500/20",
  map:      "bg-violet-500/15 text-violet-500 border border-violet-500/20",
  tempo:    "bg-amber-500/15 text-amber-500 border border-amber-500/20",
  result:   "bg-secondary text-muted-foreground border border-border/40",
};

function generateTags(match: MatchData, t: (key: string) => string): TagInfo[] {
  const player = match.participants[match.playerParticipantIndex];
  const durationMin = match.gameDuration / 60;
  const csPerMin = (player.totalMinionsKilled + player.neutralMinionsKilled) / durationMin;
  const earlyDeaths = player.deathTimestamps.filter(t => t <= 5).length;

  const teamParticipants = match.participants.filter((_, i) => {
    const playerTeam = match.playerParticipantIndex < 5 ? 0 : 1;
    return (i < 5 ? 0 : 1) === playerTeam;
  });
  const teamKills = teamParticipants.reduce((sum, p) => sum + p.kills, 0);
  const kp = teamKills > 0 ? ((player.kills + player.assists) / teamKills) * 100 : 0;
  const teamDamage = teamParticipants.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);
  const damageShare = teamDamage > 0 ? (player.totalDamageDealtToChampions / teamDamage) * 100 : 0;
  const teamDamageTaken = teamParticipants.reduce((sum, p) => sum + p.totalDamageTaken, 0);
  const tankShare = teamDamageTaken > 0 ? (player.totalDamageTaken / teamDamageTaken) * 100 : 0;

  const tags: TagInfo[] = [];

  if (player.deaths === 0 && durationMin > 15) tags.push({ label: t("tag.deathless"), category: "positive" });
  if (csPerMin >= 8) tags.push({ label: t("tag.perfectFarm"), category: "positive" });
  if (player.kills >= 10) tags.push({ label: t("tag.carry"), category: "carry" });
  if (player.assists >= 15) tags.push({ label: t("tag.facilitator"), category: "support" });
  if (player.firstBloodKill) tags.push({ label: t("tag.firstBlood"), category: "carry" });
  if (damageShare > 35) tags.push({ label: t("tag.maxDmg"), category: "carry" });
  if (kp > 75) tags.push({ label: t("tag.omnipresent"), category: "support" });
  if (tankShare > 35 && player.teamPosition !== "UTILITY") tags.push({ label: t("tag.frontline"), category: "support" });
  if ((player.visionScore ?? 0) > 40) tags.push({ label: t("tag.visionPro"), category: "map" });
  if (player.turretKills >= 2) tags.push({ label: t("tag.splitpusher"), category: "map" });
  if (player.dragonKills >= 1) tags.push({ label: t("tag.dragonSlayer"), category: "map" });
  if (earlyDeaths >= 2 && player.win) tags.push({ label: t("tag.comeback"), category: "tempo" });
  if (durationMin < 20 && player.win) tags.push({ label: t("tag.stomp"), category: "tempo" });
  if (durationMin > 35 && player.win) tags.push({ label: t("tag.lateGameHero"), category: "tempo" });
  if (player.kills >= 5 && player.firstBloodKill) tags.push({ label: t("tag.snowball"), category: "carry" });

  if (tags.length === 0) tags.push({ label: player.win ? t("tag.victory") : t("tag.defeat"), category: "result" });
  return tags.slice(0, 3);
}

const RANKED_IDS = new Set([420, 440]);

const QUEUE_META_MATCHES: Record<number, { short: string; color: string; bg: string; border: string }> = {
  420: { short: "SoloQ",  color: "#60a5fa", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)" },
  440: { short: "Flex",   color: "#a78bfa", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)" },
  450: { short: "ARAM",   color: "#fbbf24", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)" },
  400: { short: "Normal", color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)" },
  430: { short: "Normal", color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)" },
  490: { short: "Quick",  color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)" },
};

// ─── Win celebration particles ────────────────────────────────────────────────
const WIN_COLORS = ["#5e5ce6", "#30d158", "#ffd60a", "#a78bfa", "#60a5fa", "#f472b6"];
function WinParticles({ active }: { active: boolean }) {
  const count = 16;
  return (
    <AnimatePresence>
      {active && (
        <>
          {Array.from({ length: count }, (_, i) => {
            const angle = (i / count) * 360;
            const dist = 28 + (i % 4) * 14;
            return (
              <motion.span
                key={i}
                className="absolute pointer-events-none rounded-full"
                style={{
                  width: i % 3 === 0 ? 7 : 5,
                  height: i % 3 === 0 ? 7 : 5,
                  background: WIN_COLORS[i % WIN_COLORS.length],
                  left: 12,
                  top: "50%",
                  zIndex: 30,
                  boxShadow: `0 0 6px ${WIN_COLORS[i % WIN_COLORS.length]}`,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((angle * Math.PI) / 180) * dist,
                  y: Math.sin((angle * Math.PI) / 180) * dist - 10,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 0.65, delay: i * 0.018, ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
        </>
      )}
    </AnimatePresence>
  );
}

export function Matches() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterResult, setFilterResult] = useState<"win" | "loss" | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterChamp, setFilterChamp] = useState<string | null>(null);
  const [filterQueue, setFilterQueue] = useState<number | "ranked" | null>("ranked");
  const [filterDateRange, setFilterDateRange] = useState<"today" | "week" | "month" | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [view, setView] = useState<"list" | "champions">("list");
  const { version: patchVersion } = usePatchVersion();
  const navigate = useNavigate();
  const { data: matches, isLoading, isRefetching, error, refetch } = useAsyncData(() => getMatchHistory(), []);

  const handleRefresh = () => {
    clearMatchCache();
    refetch();
  };
  const { t, language } = useLanguage();

  const formatDate = (timestamp: number) => {
    const diffDays = Math.floor((Date.now() - timestamp) / 86400000);
    if (diffDays === 0) return t("common.today");
    if (diffDays === 1) return t("common.yesterday");
    if (diffDays < 7) return `${diffDays} ${t("common.daysAgo")}`;
    const locale = language === "kr" ? "ko-KR" : language === "en" ? "en-US" : "es-ES";
    return new Date(timestamp).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  };

  const sortedMatches = React.useMemo(() => matches ? [...matches].sort((a, b) => b.gameCreation - a.gameCreation) : [], [matches]);
  const streakMap = React.useMemo(() => matches ? detectStreaks(matches) : new Map(), [matches]);

  // Available queue types in this match history
  const availableQueues = useMemo(() => {
    const ids = new Set(sortedMatches.map(m => m.queueId).filter(id => QUEUE_META_MATCHES[id]));
    const hasRanked = [...ids].some(id => RANKED_IDS.has(id));
    return { ids: [...ids].sort((a, b) => a - b), hasRanked };
  }, [sortedMatches]);

  // Queue-filtered base list
  const queueFilteredMatches = useMemo(() => sortedMatches.filter(m => {
    if (filterQueue === null) return true;
    if (filterQueue === "ranked") return RANKED_IDS.has(m.queueId);
    return m.queueId === filterQueue;
  }), [sortedMatches, filterQueue]);

  // Unique roles and champions for filter dropdowns (from queue-filtered list)
  const availableRoles = useMemo(() => {
    const roles = new Set(queueFilteredMatches.map(m => m.participants[m.playerParticipantIndex].teamPosition).filter(Boolean));
    return [...roles];
  }, [queueFilteredMatches]);
  const availableChamps = useMemo(() => {
    const champs = new Set(queueFilteredMatches.map(m => m.participants[m.playerParticipantIndex].championName).filter(Boolean));
    return [...champs].sort();
  }, [queueFilteredMatches]);

  // Date range cutoff
  const dateFromTs = useMemo(() => {
    if (!filterDateRange) return null;
    const d = new Date();
    if (filterDateRange === "today") { d.setHours(0, 0, 0, 0); return d.getTime(); }
    if (filterDateRange === "week") { d.setDate(d.getDate() - 7); return d.getTime(); }
    if (filterDateRange === "month") { d.setDate(d.getDate() - 30); return d.getTime(); }
    return null;
  }, [filterDateRange]);

  // Apply secondary filters
  const filteredMatches = useMemo(() => queueFilteredMatches.filter(m => {
    const p = m.participants[m.playerParticipantIndex];
    if (filterResult === "win" && !p.win) return false;
    if (filterResult === "loss" && p.win) return false;
    if (filterRole && p.teamPosition !== filterRole) return false;
    if (filterChamp && p.championName !== filterChamp) return false;
    if (dateFromTs && m.gameCreation < dateFromTs) return false;
    return true;
  }), [queueFilteredMatches, filterResult, filterRole, filterChamp, dateFromTs]);

  const totalWins = queueFilteredMatches.filter(m => m.participants[m.playerParticipantIndex].win).length;
  const totalLosses = queueFilteredMatches.length - totalWins;
  const hasFilters = filterResult !== null || filterRole !== null || filterChamp !== null || filterDateRange !== null;
  const clearFilters = () => { setFilterResult(null); setFilterRole(null); setFilterChamp(null); setFilterDateRange(null); };

  // Champion stats — aggregated from the queue-filtered match list
  const champStats = useMemo(() => {
    const map: Record<string, { games: number; wins: number; kills: number; deaths: number; assists: number; cs: number; duration: number }> = {};
    for (const m of queueFilteredMatches) {
      const p = m.participants[m.playerParticipantIndex];
      if (!p?.championName) continue;
      const k = p.championName;
      if (!map[k]) map[k] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, duration: 0 };
      map[k].games++;
      if (p.win) map[k].wins++;
      map[k].kills += p.kills;
      map[k].deaths += p.deaths;
      map[k].assists += p.assists;
      map[k].cs += p.totalMinionsKilled + p.neutralMinionsKilled;
      map[k].duration += m.gameDuration;
    }
    return Object.entries(map)
      .map(([name, s]) => ({
        name,
        games: s.games,
        wins: s.wins,
        wr: Math.round((s.wins / s.games) * 100),
        avgKda: s.deaths > 0 ? ((s.kills + s.assists) / s.deaths).toFixed(2) : (s.kills + s.assists).toFixed(2),
        avgCsMin: (s.cs / (s.duration / 60)).toFixed(1),
        lastPlayed: queueFilteredMatches.filter(m => m.participants[m.playerParticipantIndex]?.championName === name)
          .reduce((max, m) => Math.max(max, m.gameCreation), 0),
      }))
      .sort((a, b) => b.games - a.games);
  }, [queueFilteredMatches]);

  // Highlight a specific match linked from Notes
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  useEffect(() => {
    if (!matches) return;
    const targetId = sessionStorage.getItem("velaris-highlight-match");
    if (!targetId) return;
    sessionStorage.removeItem("velaris-highlight-match");
    const target = sortedMatches.find(m => m.matchId === targetId);
    if (!target) return;
    // Clear all filters so the match is visible
    setFilterQueue(null);
    setFilterResult(null);
    setFilterRole(null);
    setFilterChamp(null);
    setFilterDateRange(null);
    setExpandedId(targetId);
    setVisibleCount(prev => {
      const idx = sortedMatches.indexOf(target);
      return idx >= prev ? idx + 5 : prev;
    });
    // Scroll after a brief render delay
    setTimeout(() => {
      const el = cardRefs.current.get(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQueueFilter = (q: number | "ranked" | null) => {
    setFilterQueue(q);
    setFilterResult(null);
    setFilterRole(null);
    setFilterChamp(null);
    setFilterDateRange(null);
    setExpandedId(null);
    setVisibleCount(20);
  };

  const effectiveExpanded = expandedId ?? filteredMatches[0]?.matchId;

  if (isLoading && !matches) {
    return <MatchesSkeleton />;
  }
  if (error) {
    return (<div className="w-full flex flex-col items-center justify-center h-[60vh] gap-4"><AlertCircle className="w-6 h-6 text-destructive" /><span className="text-sm text-muted-foreground">{error}</span></div>);
  }
  if (!isLoading && sortedMatches.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center">
          <History className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-[15px] font-medium text-foreground">{t("matches.empty.title") || "Sin partidas aún"}</p>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-sm">{t("matches.empty.sub") || "Juega una partida y vuelve aquí para ver tu análisis."}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/60 hover:bg-secondary text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Loader2 className={cn("w-4 h-4", isRefetching ? "animate-spin" : "hidden")} />
          {isRefetching ? (t("common.loading") || "Actualizando...") : (t("matches.refresh") || "Actualizar partidas")}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full flex flex-col font-sans max-w-4xl pt-4 pb-20">
      <PageHeader
        title={t("matches.title")}
        subtitle={t("matches.subtitle").replace("{count}", String(sortedMatches.length))}
        icon={History}
        badge={t("common.season")}
      />

      {/* W/L Summary + Filters */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Summary bar */}
        <div className="flex items-center gap-4 p-3 bg-card border border-border/60 rounded-xl">
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">{t("common.season")}</span>
          <span className="text-[13px] font-bold text-emerald-500">{totalWins}V</span>
          <span className="text-muted-foreground/40 text-[11px]">—</span>
          <span className="text-[13px] font-bold text-destructive">{totalLosses}D</span>
          {queueFilteredMatches.length > 0 && (
            <>
              <span className="text-muted-foreground/40 text-[11px]">·</span>
              <span className={cn("text-[12px] font-semibold", Math.round(totalWins / queueFilteredMatches.length * 100) >= 50 ? "text-emerald-500" : "text-destructive")}>
                {Math.round(totalWins / queueFilteredMatches.length * 100)}% WR
              </span>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 p-0.5 bg-secondary/50 rounded-lg border border-border/40">
              <button onClick={() => setView("list")} className={cn("px-2 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer", view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {t("matches.byGame") || "Partidas"}
              </button>
              <button onClick={() => setView("champions")} className={cn("px-2 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer", view === "champions" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {t("matches.byChamp") || "Campeones"}
              </button>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-50"
            >
              <Loader2 className={cn("w-3.5 h-3.5", isRefetching ? "animate-spin" : "hidden")} />
              {!isRefetching && <span className="text-[11px]">↻</span>}
              {isRefetching ? t("common.loading") || "Actualizando..." : t("matches.refresh") || "Actualizar"}
            </button>
          </div>
          {hasFilters && (
            <span className="ml-auto text-[11px] font-mono text-muted-foreground/50">
              {filteredMatches.length} / {queueFilteredMatches.length} {t("common.games").toLowerCase()}
            </span>
          )}
        </div>

        {/* Queue type filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleQueueFilter(null)}
            className={cn("px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer",
              filterQueue === null
                ? "bg-foreground/10 text-foreground border-foreground/20"
                : "bg-secondary/50 text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground"
            )}
          >
            ALL
          </button>
          {availableQueues.hasRanked && (
            <button
              onClick={() => handleQueueFilter(filterQueue === "ranked" ? null : "ranked")}
              style={filterQueue === "ranked" ? { backgroundColor: "rgba(99,102,241,0.12)", color: "#818cf8", borderColor: "rgba(99,102,241,0.3)", boxShadow: "0 0 6px rgba(99,102,241,0.25)" } : undefined}
              className={cn("px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer",
                filterQueue === "ranked" ? "" : "bg-secondary/50 text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground"
              )}
            >
              RANKED
            </button>
          )}
          {availableQueues.ids.filter(id => !RANKED_IDS.has(id)).map(qid => {
            const meta = QUEUE_META_MATCHES[qid];
            const isActive = filterQueue === qid;
            return (
              <button
                key={qid}
                onClick={() => handleQueueFilter(isActive ? null : qid)}
                style={isActive ? { backgroundColor: meta.bg, color: meta.color, borderColor: meta.border, boxShadow: `0 0 6px ${meta.color}40` } : undefined}
                className={cn("px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer",
                  isActive ? "" : "bg-secondary/50 text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground"
                )}
              >
                {meta.short}
              </button>
            );
          })}
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
          {([["today", t("matches.today") || "Today"], ["week", t("matches.week") || "7d"], ["month", t("matches.month") || "30d"]] as const).map(([range, label]) => (
            <button key={range} onClick={() => setFilterDateRange(filterDateRange === range ? null : range)}
              className={cn("px-3 py-1 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer",
                filterDateRange === range
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "border-border/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
          {/* Result filter */}
          {(["win", "loss"] as const).map(r => (
            <button key={r} onClick={() => setFilterResult(filterResult === r ? null : r)}
              className={cn("px-3 py-1 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer",
                filterResult === r
                  ? r === "win" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500" : "bg-destructive/15 border-destructive/30 text-destructive"
                  : "border-border/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}>
              {r === "win" ? t("common.victory") : t("common.defeat")}
            </button>
          ))}
          {/* Role filter */}
          {availableRoles.length > 0 && (
            <select value={filterRole ?? ""} onChange={e => setFilterRole(e.target.value || null)}
              className="px-3 py-1 rounded-lg text-[12px] font-medium border border-border/40 bg-card text-muted-foreground cursor-pointer focus:outline-none hover:border-foreground/20">
              <option value="">{t("matches.allRoles")}</option>
              {availableRoles.map(r => <option key={r} value={r}>{getRoleLabel(r, t)}</option>)}
            </select>
          )}
          {/* Champion filter */}
          {availableChamps.length > 0 && (
            <select value={filterChamp ?? ""} onChange={e => setFilterChamp(e.target.value || null)}
              className="px-3 py-1 rounded-lg text-[12px] font-medium border border-border/40 bg-card text-muted-foreground cursor-pointer focus:outline-none hover:border-foreground/20">
              <option value="">{t("matches.allChamps")}</option>
              {availableChamps.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border/40 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer">
              <X className="w-3 h-3" /> {t("matches.clearFilters")}
            </button>
          )}
        </div>
      </div>

      {/* Champion stats view */}
      {view === "champions" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">{t("matches.champStats.title") || "Estadísticas por campeón"}</p>
          {champStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <BarChart3 className="w-8 h-8 opacity-30" />
              <span className="text-[13px]">{t("matches.noResults") || "Sin datos"}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {champStats.map(cs => (
                <div key={cs.name} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-foreground/20 transition-colors">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${cs.name}.png`}
                    alt={cs.name}
                    loading="lazy"
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground truncate">{cs.name}</span>
                      <span className={cn("text-[11px] font-bold ml-auto shrink-0", cs.wr >= 55 ? "text-emerald-500" : cs.wr >= 50 ? "text-primary" : cs.wr >= 45 ? "text-amber-500" : "text-destructive")}>
                        {cs.wr}% WR
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{cs.games} {t("common.games") || "partidas"}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span>{t("matches.champStats.avgKda") || "KDA"} <span className="text-foreground font-mono">{cs.avgKda}</span></span>
                      <span className="text-muted-foreground/30">·</span>
                      <span><span className="text-foreground font-mono">{cs.avgCsMin}</span> CS/m</span>
                    </div>
                    {/* WR bar */}
                    <div className="mt-1.5 h-1 rounded-full bg-secondary/60 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", cs.wr >= 55 ? "bg-emerald-500" : cs.wr >= 50 ? "bg-primary" : cs.wr >= 45 ? "bg-amber-500" : "bg-destructive")}
                        style={{ width: `${cs.wr}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Match list */}
      <div className={cn("flex flex-col gap-4", view === "champions" && "hidden")}>
        {filteredMatches.length === 0 && hasFilters && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Filter className="w-8 h-8 opacity-30" />
            <span className="text-[13px]">{t("matches.noResults")}</span>
            <button onClick={clearFilters} className="text-[12px] text-primary hover:underline cursor-pointer">{t("matches.clearFilters")}</button>
          </div>
        )}
        {filteredMatches.slice(0, visibleCount).map((match, listIdx) => {
          const player = match.participants[match.playerParticipantIndex];
          const isExpanded = effectiveExpanded === match.matchId;
          const durationMin = match.gameDuration / 60;
          const csPerMin = ((player.totalMinionsKilled + player.neutralMinionsKilled) / durationMin).toFixed(1);
          const { title, autopsy } = generateAutopsy(match, t);
          const tags = generateTags(match, t);
          // LP changes are not available from match history API — omit the field
          const lp: string | null = null;
          const streak = streakMap.get(match.matchId);
          const matchIndexInAll = sortedMatches.indexOf(match);

          return (
            <motion.div
              key={match.matchId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(listIdx * 0.045, 0.27), ease: [0.16, 1, 0.3, 1] }}
              ref={el => { if (el) cardRefs.current.set(match.matchId, el as HTMLDivElement); else cardRefs.current.delete(match.matchId); }}
              className={cn(
                "rounded-2xl border transition-all duration-300 overflow-hidden bg-card group card-lift card-shine",
                isExpanded ? "border-primary/30 shadow-lg" : "border-border/60 hover:border-foreground/30 hover:shadow-md cursor-pointer",
                expandedId === match.matchId && "ring-2 ring-primary/40"
              )}
              onClick={() => !isExpanded && setExpandedId(match.matchId)}
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between relative">
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl", player.win ? "win-strip" : "loss-strip")} />
                {player.win && <WinParticles active={isExpanded} />}
                <div className="flex items-center gap-4 pl-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 champ-icon-ring">
                      <img src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${player.championName}.png`} alt={player.championName} loading="lazy" className="w-full h-full object-cover scale-110 transition-transform duration-300 group-hover:scale-125" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center border border-card z-10", player.win ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground")}>
                      {player.win ? <TrendingUp className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[15px] font-bold text-foreground">{player.win ? t("common.victory") : t("common.defeat")}</span>
                      <span className="text-muted-foreground text-[13px]">&bull;</span>
                      <span className="text-[14px] font-medium text-muted-foreground">{player.championName}</span>
                      <span className="text-[11px] font-mono font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{getRoleLabel(player.teamPosition, t)}</span>
                      {streak && (
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full font-mono border",
                          streak.type === "win"
                            ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 shadow-[0_0_6px_rgba(34,197,94,0.2)]"
                            : "bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_6px_rgba(239,68,68,0.2)]"
                        )}>
                          {streak.type === "win" ? "🔥 " : "❄️ "}{streak.type === "win" ? t("qol.winStreak").replace("{count}", String(streak.count)) : t("qol.lossStreak").replace("{count}", String(streak.count))}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {timeAgo(match.gameCreation, language)}</span>
                      <span>&bull;</span>
                      <span>{formatDuration(match.gameDuration)}</span>
                      {player.perk0 && player.perk0 > 0 && (
                        <>
                          <span>&bull;</span>
                          <RuneTreeCompact perks={player} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto pl-3 sm:pl-0">
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[13px] text-muted-foreground font-medium mb-0.5">KDA</span>
                    <span className={cn("font-mono text-[15px] font-bold", player.deaths === 0 ? "value-good-emerald" : "text-foreground")}>{player.kills}/{player.deaths}/{player.assists}</span>
                  </div>
                  {lp !== null && (
                    <div className="flex flex-col items-start sm:items-end w-16">
                      <span className="text-[13px] text-muted-foreground font-medium mb-0.5">LP</span>
                      <span className={cn("font-mono text-[16px] font-bold", player.win ? "value-good" : "value-bad")}>{lp}</span>
                    </div>
                  )}
                  {/* Team composition preview */}
                  {!isExpanded && (() => {
                    const playerChamp = player.championName;
                    const blue = match.participants.filter(p => p.teamId === 100);
                    const red = match.participants.filter(p => p.teamId === 200);
                    const teams = blue.length > 0 && red.length > 0
                      ? [blue, red]
                      : [match.participants.slice(0, 5), match.participants.slice(5, 10)];
                    return (
                      <div className="hidden md:flex flex-col gap-0.5 shrink-0">
                        {teams.map((team, ti) => (
                          <div key={ti} className="flex gap-0.5">
                            {team.map((p, pi) => {
                              const isMe = p.championName === playerChamp;
                              return (
                                <div key={pi} className={cn("w-[22px] h-[22px] rounded-sm overflow-hidden border shrink-0", isMe ? "border-primary/70 ring-1 ring-primary/30" : "border-border/30")}>
                                  <img
                                    src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${p.championName}.png`}
                                    alt={p.championName}
                                    loading="lazy"
                                    className="w-full h-full object-cover scale-110"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <button onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : match.matchId); }} className="ml-1 w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground">
                    <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", isExpanded && "rotate-90")} />
                  </button>
                </div>
              </div>

              <div className={cn("grid transition-all duration-300 ease-in-out", isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <div className="overflow-hidden">
                  <div className="p-5 pt-0 border-t border-border/40 mt-1 pl-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="flex flex-col gap-4">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t("matches.performance")}</span>
                        <div className="flex items-center gap-3 flex-wrap">
                          <motion.div
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary/50 rounded-lg text-[13px] font-medium text-foreground"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-muted-foreground" /> {csPerMin} CS/min
                          </motion.div>
                          {tags.map((tag, ti) => (
                            <motion.div
                              key={tag.label}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: 0.08 + ti * 0.04 }}
                              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold", TAG_COLORS[tag.category])}
                            >
                              {tag.label}
                            </motion.div>
                          ))}
                        </div>

                        {/* Items */}
                        {(() => {
                          const items = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5, player.item6].filter(id => id > 0);
                          if (items.length === 0) return null;
                          return (
                            <div className="flex flex-col gap-2">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("matches.items")}</span>
                              <div className="flex items-center gap-1.5">
                                {items.map((itemId, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.5, y: 4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.22, delay: i * 0.045 + 0.05, ease: [0.16, 1, 0.3, 1] }}
                                    className="w-8 h-8 rounded-md bg-secondary border border-border/60 overflow-hidden hover:scale-125 hover:z-10 hover:shadow-lg transition-transform duration-200"
                                  >
                                    <img
                                      src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/item/${itemId}.png`}
                                      alt={`Item ${itemId}`}
                                      loading="lazy"
                                      className="w-full h-full object-cover"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                    />
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Runes */}
                        {player.perk0 && player.perk0 > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("matches.runes")}</span>
                            <RuneTreeFull perks={player} />
                          </div>
                        )}
                      </div>
                      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex gap-3">
                        <Cpu className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[12px] uppercase tracking-wider font-semibold text-primary">{t("matches.aiAutopsy")}</span>
                          <h4 className="text-[14px] font-medium text-foreground">{title}</h4>
                          <p className="text-[13px] text-foreground/80 leading-relaxed mt-1">{autopsy}</p>
                        </div>
                      </div>
                    </div>

                    {/* Team Compositions */}
                    {(() => {
                      const blue = match.participants.slice(0, 5);
                      const red = match.participants.slice(5, 10);
                      const playerIdx = match.playerParticipantIndex;
                      const blueWon = blue[0]?.win;
                      const scorePlayer = (p: typeof player) => {
                        const dur = match.gameDuration / 60;
                        const kda = p.deaths > 0 ? (p.kills + p.assists) / p.deaths : (p.kills + p.assists) * 1.5;
                        const cs = (p.totalMinionsKilled + p.neutralMinionsKilled) / dur;
                        const dmgNorm = p.totalDamageDealtToChampions / 1000;
                        const vision = (p.visionScore ?? 0) / dur;
                        return kda * 3 + cs * 1.2 + dmgNorm * 0.8 + vision * 2 + (p.kills * 2) + (p.assists * 1.2) - (p.deaths * 1.5) + (p.firstBloodKill ? 3 : 0);
                      };
                      const allScored = match.participants.map((p, i) => ({ p, i, score: scorePlayer(p) }));
                      const winnerScores = allScored.filter(x => x.p.win).sort((a, b) => b.score - a.score);
                      const loserScores = allScored.filter(x => !x.p.win).sort((a, b) => b.score - a.score);
                      const mvpIdx = winnerScores[0]?.i ?? -1;
                      const aceIdx = winnerScores[1]?.i ?? -1;
                      const svpIdx = loserScores[0]?.i ?? -1;
                      const all = match.participants;
                      const topKillsIdx = all.reduce((best, p, i) => p.kills > all[best].kills ? i : best, 0);
                      const topDmgIdx = all.reduce((best, p, i) => p.totalDamageDealtToChampions > all[best].totalDamageDealtToChampions ? i : best, 0);
                      const topTankIdx = all.reduce((best, p, i) => p.totalDamageTaken > all[best].totalDamageTaken ? i : best, 0);
                      const topVisionIdx = all.reduce((best, p, i) => (p.visionScore ?? 0) > (all[best].visionScore ?? 0) ? i : best, 0);
                      const topCsIdx = all.reduce((best, p, i) => (p.totalMinionsKilled + p.neutralMinionsKilled) > (all[best].totalMinionsKilled + all[best].neutralMinionsKilled) ? i : best, 0);
                      const topGoldIdx = all.reduce((best, p, i) => p.goldEarned > all[best].goldEarned ? i : best, 0);
                      const deathlessIdxs = new Set(all.map((p, i) => p.deaths === 0 ? i : -1).filter(i => i >= 0));
                      const firstBloodIdx = all.findIndex(p => p.firstBloodKill);
                      const maxDmg = Math.max(...all.map(p => p.totalDamageDealtToChampions), 1);
                      const maxGold = Math.max(...all.map(p => p.goldEarned), 1);

                      type BadgeInfo = { label: string; detail?: string; icon: React.ReactNode; colors: string; primary?: boolean };
                      const getBadges = (idx: number): BadgeInfo[] => {
                        const badges: BadgeInfo[] = [];
                        const p = all[idx];
                        const score = (p.deaths > 0 ? (p.kills + p.assists) / p.deaths : (p.kills + p.assists) * 1.5).toFixed(1);
                        if (idx === mvpIdx) badges.push({ label: "MVP", detail: `${score} KDA score`, icon: <Crown className="w-3 h-3" />, colors: "bg-amber-500/15 text-amber-400 ring-amber-500/30", primary: true });
                        else if (idx === aceIdx) badges.push({ label: "ACE", detail: `${score} KDA score`, icon: <Flame className="w-3 h-3" />, colors: "bg-orange-500/15 text-orange-400 ring-orange-500/30", primary: true });
                        else if (idx === svpIdx) badges.push({ label: "SVP", detail: `${score} KDA score`, icon: <Star className="w-3 h-3" />, colors: "bg-sky-500/15 text-sky-400 ring-sky-500/30", primary: true });
                        if (idx === topKillsIdx && p.kills >= 5) badges.push({ label: "TOP KILLS", detail: `${p.kills} kills`, icon: <Skull className="w-2.5 h-2.5" />, colors: "bg-red-500/15 text-red-400 ring-red-500/30" });
                        if (idx === topDmgIdx) badges.push({ label: "TOP DMG", detail: `${formatK(p.totalDamageDealtToChampions)}`, icon: <Target className="w-2.5 h-2.5" />, colors: "bg-rose-500/15 text-rose-400 ring-rose-500/30" });
                        if (idx === topTankIdx && p.totalDamageTaken > 20000) badges.push({ label: "TANK", detail: `${formatK(p.totalDamageTaken)} taken`, icon: <Heart className="w-2.5 h-2.5" />, colors: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30" });
                        if (idx === topVisionIdx && (p.visionScore ?? 0) >= 20) badges.push({ label: "VISION", detail: `${p.visionScore} score`, icon: <Eye className="w-2.5 h-2.5" />, colors: "bg-teal-500/15 text-teal-400 ring-teal-500/30" });
                        if (idx === topCsIdx) badges.push({ label: "CS KING", detail: `${p.totalMinionsKilled + p.neutralMinionsKilled} cs`, icon: <Crosshair className="w-2.5 h-2.5" />, colors: "bg-violet-500/15 text-violet-400 ring-violet-500/30" });
                        if (idx === topGoldIdx) badges.push({ label: "RICH", detail: `${formatK(p.goldEarned)} gold`, icon: <Zap className="w-2.5 h-2.5" />, colors: "bg-yellow-500/15 text-yellow-500 ring-yellow-500/30" });
                        if (deathlessIdxs.has(idx) && match.gameDuration > 900) badges.push({ label: "DEATHLESS", detail: "0 deaths", icon: <Droplets className="w-2.5 h-2.5" />, colors: "bg-cyan-500/15 text-cyan-400 ring-cyan-500/30" });
                        if (idx === firstBloodIdx) badges.push({ label: "1ST BLOOD", detail: "First kill", icon: <Flame className="w-2.5 h-2.5" />, colors: "bg-pink-500/15 text-pink-400 ring-pink-500/30" });
                        return badges;
                      };
                      const formatK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

                      const TeamRow = ({ p, idx }: { p: typeof player; idx: number }) => {
                        const isYou = idx === playerIdx;
                        const kdaVal = p.deaths > 0 ? ((p.kills + p.assists) / p.deaths) : -1;
                        const kdaStr = kdaVal < 0 ? "Perfect" : kdaVal.toFixed(1);
                        const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
                        const badges = getBadges(idx);
                        const primaryBadge = badges.find(b => b.primary) ?? null;
                        const secondaryBadges = badges.filter(b => !b.primary).slice(0, 3);
                        const dmgPct = (p.totalDamageDealtToChampions / maxDmg) * 100;
                        const goldPct = (p.goldEarned / maxGold) * 100;

                        return (
                          <div className={cn("py-2 px-3 rounded-xl transition-colors group/row", isYou ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-secondary/40")}>
                            <div className="flex items-center gap-2.5">
                              <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-lg bg-secondary border border-border/60 overflow-hidden">
                                  <img src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${p.championName}.png`} alt={p.championName} loading="lazy" className="w-full h-full object-cover scale-110" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                                </div>
                                {primaryBadge && (
                                  <div className={cn("absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center ring-1", primaryBadge.colors)}>{primaryBadge.icon}</div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("text-[13px] font-medium truncate", isYou ? "text-primary" : "text-foreground")}>{p.championName}</span>
                                  {isYou && <span className="text-[9px] font-mono font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded shrink-0">YOU</span>}
                                  {primaryBadge && (
                                    <span className="relative group/badge shrink-0">
                                      <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ring-1 inline-flex items-center gap-1 cursor-default", primaryBadge.colors)}>{primaryBadge.icon}{primaryBadge.label}</span>
                                      {primaryBadge.detail && (
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-popover border border-border shadow-lg text-[11px] font-mono text-foreground whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover/badge:opacity-100 group-hover/badge:scale-100 transition-all duration-150 z-50">
                                          <span className="font-bold">{primaryBadge.label}</span><span className="text-muted-foreground"> — {primaryBadge.detail}</span>
                                          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-border" />
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-mono text-muted-foreground/50">{getRoleLabel(p.teamPosition, t)}</span>
                                  {secondaryBadges.map(b => (
                                    <span key={b.label} className="relative group/badge shrink-0">
                                      <span className={cn("w-[18px] h-[18px] rounded-full ring-1 flex items-center justify-center cursor-default", b.colors)}>{b.icon}</span>
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-popover border border-border shadow-lg text-[11px] font-mono text-foreground whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover/badge:opacity-100 group-hover/badge:scale-100 transition-all duration-150 z-50">
                                        <span className="font-bold">{b.label}</span>{b.detail && <span className="text-muted-foreground"> — {b.detail}</span>}
                                        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-border" />
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <span className="text-[13px] font-mono font-medium text-foreground tabular-nums">{p.kills}<span className="text-muted-foreground/40">/</span>{p.deaths}<span className="text-muted-foreground/40">/</span>{p.assists}</span>
                                <span className={cn("text-[11px] font-mono w-[48px] text-right", kdaStr === "Perfect" ? "text-amber-400" : kdaVal >= 4 ? "text-primary" : kdaVal >= 2 ? "text-muted-foreground" : "text-destructive/80")}>{kdaStr}</span>
                                <span className="text-[11px] font-mono text-muted-foreground/60 w-[36px] text-right tabular-nums">{cs}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 ml-[46px]">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-[10px] font-mono text-muted-foreground/40 w-[24px] shrink-0">dmg</span>
                                <div className="flex-1 h-[5px] bg-secondary/50 rounded-full overflow-hidden"><div className={cn("h-full rounded-full", p.win ? "bg-primary/50" : "bg-destructive/40")} style={{ width: `${dmgPct}%` }} /></div>
                                <span className="text-[11px] font-mono text-foreground/60 w-[38px] text-right tabular-nums">{formatK(p.totalDamageDealtToChampions)}</span>
                              </div>
                              <div className="flex items-center gap-2 w-[40%] shrink-0">
                                <span className="text-[10px] font-mono text-muted-foreground/40 w-[24px] shrink-0">gold</span>
                                <div className="flex-1 h-[5px] bg-secondary/50 rounded-full overflow-hidden"><div className="h-full rounded-full bg-amber-500/40" style={{ width: `${goldPct}%` }} /></div>
                                <span className="text-[11px] font-mono text-amber-400/70 w-[38px] text-right tabular-nums">{formatK(p.goldEarned)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      const teamStats = (team: typeof blue) => ({
                        kills: team.reduce((s, p) => s + p.kills, 0),
                        deaths: team.reduce((s, p) => s + p.deaths, 0),
                        assists: team.reduce((s, p) => s + p.assists, 0),
                        gold: team.reduce((s, p) => s + p.goldEarned, 0),
                        dmg: team.reduce((s, p) => s + p.totalDamageDealtToChampions, 0),
                      });
                      const blueStats = teamStats(blue);
                      const redStats = teamStats(red);

                      return (
                        <div className="mt-4 border-t border-border/40 pt-4">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-3">{t("matches.teams")}</span>
                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center justify-between mb-2 px-2.5">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                                  <span className={cn("text-[12px] font-semibold", blueWon ? "text-primary" : "text-muted-foreground")}>{t("matches.blueTeam")}</span>
                                  <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full", blueWon ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive")}>{blueWon ? "WIN" : "LOSS"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground/70">
                                  <span>{blueStats.kills}/{blueStats.deaths}/{blueStats.assists}</span>
                                  <span className="text-amber-400/60">{formatK(blueStats.gold)} gold</span>
                                  <span>{formatK(blueStats.dmg)} dmg</span>
                                </div>
                              </div>
                              {blue.map((p, i) => <TeamRow key={`b-${i}`} p={p} idx={i} />)}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center justify-between mb-2 px-2.5">
                                <div className="flex items-center gap-2">
                                  <Swords className="w-3.5 h-3.5 text-red-400" />
                                  <span className={cn("text-[12px] font-semibold", !blueWon ? "text-primary" : "text-muted-foreground")}>{t("matches.redTeam")}</span>
                                  <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full", !blueWon ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive")}>{!blueWon ? "WIN" : "LOSS"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground/70">
                                  <span>{redStats.kills}/{redStats.deaths}/{redStats.assists}</span>
                                  <span className="text-amber-400/60">{formatK(redStats.gold)} gold</span>
                                  <span>{formatK(redStats.dmg)} dmg</span>
                                </div>
                              </div>
                              {red.map((p, i) => <TeamRow key={`r-${i}`} p={p} idx={i + 5} />)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Full analysis CTA */}
                    <div className="mt-4 pt-4 border-t border-border/30 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/post-game?match=${matchIndexInAll}`); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-[13px] font-semibold cursor-pointer"
                      >
                        <BarChart3 className="w-4 h-4" />
                        {t("matches.fullAnalysis") || "Ver análisis completo"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Load more */}
        {filteredMatches.length > visibleCount && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              onClick={() => setVisibleCount(c => c + 20)}
              className="px-6 py-2.5 rounded-xl text-[13px] font-medium border border-border/60 bg-card hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t("common.loadMore") || "Cargar más"} ({filteredMatches.length - visibleCount} {t("common.remaining") || "restantes"})
            </button>
          </div>
        )}
        {filteredMatches.length > 0 && filteredMatches.length <= visibleCount && visibleCount > 20 && (
          <p className="text-center text-[11px] text-muted-foreground/40 pt-2">{t("common.allLoaded") || "Todas las partidas cargadas"}</p>
        )}
      </div>
    </motion.div>
  );
}