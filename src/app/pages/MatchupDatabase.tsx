/**
 * MatchupDatabase — Velaris
 * 
 * Analyzes match history to show your win/loss record against every champion
 * you've faced. Filters by role and queue type. Uses existing match history data.
 */

import { motion, AnimatePresence } from "motion/react";
import { Swords, Search, Filter, TrendingUp, TrendingDown, Minus, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "../components/ui/utils";
import { useState, useMemo, useRef, useEffect } from "react";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { getMatchHistory } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import { useLanguage } from "../contexts/LanguageContext";
import { useChampionDrawer } from "../contexts/ChampionDrawerContext";
import { PageHeader } from "../components/PageHeader";
import type { MatchData, MatchParticipant } from "../utils/analytics";
import { RANKED_QUEUE_IDS } from "../utils/analytics";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MatchupRecord {
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKda: number;
  avgCs: number;
  roles: Set<string>;
  lastPlayed: number;
  // Your avg stats in those games
  yourAvgDmg: number;
  theirAvgDmg: number;
}

type SortKey = "games" | "winrate" | "kda" | "name";
type SortDir = "asc" | "desc";

// Role options use i18n
const ROLE_KEYS = [
  { value: "ALL", key: "role.all" },
  { value: "TOP", key: "role.top" },
  { value: "JUNGLE", key: "role.jungle" },
  { value: "MIDDLE", key: "role.mid" },
  { value: "BOTTOM", key: "role.adc" },
  { value: "UTILITY", key: "role.sup" },
] as const;

// Persist filters in sessionStorage
const MATCHUP_FILTERS_KEY = "velaris-matchup-filters";
function loadMatchupFilters(): { role: string; sort: SortKey; sortDir: SortDir } {
  try {
    const stored = sessionStorage.getItem(MATCHUP_FILTERS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { role: "ALL", sort: "games", sortDir: "desc" };
}

export function MatchupDatabase() {
  const { t } = useLanguage();
  const { version: patchVersion } = usePatchVersion();
  const { data: matches, isLoading, error } = useAsyncData(() => getMatchHistory(), []);
  const { openChampion } = useChampionDrawer();
  
  const savedFilters = loadMatchupFilters();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(savedFilters.role);
  const [sortKey, setSortKey] = useState<SortKey>(savedFilters.sort);
  const [sortDir, setSortDir] = useState<SortDir>(savedFilters.sortDir);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  // Persist filters
  useEffect(() => {
    try { sessionStorage.setItem(MATCHUP_FILTERS_KEY, JSON.stringify({ role: roleFilter, sort: sortKey, sortDir })); } catch {}
  }, [roleFilter, sortKey, sortDir]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setShowRoleDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Compute matchup records from ranked match history only ─────────────
  const matchups = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    const ranked = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
    const source = ranked.length > 0 ? ranked : matches;

    const records: Record<string, {
      games: number;
      wins: number;
      kills: number;
      deaths: number;
      assists: number;
      cs: number;
      yourDmg: number;
      theirDmg: number;
      roles: Set<string>;
      lastPlayed: number;
    }> = {};

    source.forEach((match) => {
      const player = match.participants[match.playerParticipantIndex];
      if (!player) return;

      // Use teamId if available (more reliable), otherwise fall back to index position
      const playerTeamId = player.teamId;
      const enemies = playerTeamId != null
        ? match.participants.filter(p => p.teamId != null && p.teamId !== playerTeamId)
        : match.participants.filter((_, i) => (i < 5 ? 100 : 200) !== (match.playerParticipantIndex < 5 ? 100 : 200));

      if (enemies.length === 0) return; // No enemy data available for this game

      // Apply role filter on the player's role
      if (roleFilter !== "ALL" && player.teamPosition !== roleFilter) return;

      enemies.forEach((enemy) => {
        const name = enemy.championName;
        if (!records[name]) {
          records[name] = {
            games: 0, wins: 0, kills: 0, deaths: 0, assists: 0,
            cs: 0, yourDmg: 0, theirDmg: 0, roles: new Set(), lastPlayed: 0,
          };
        }
        const r = records[name];
        r.games++;
        if (player.win) r.wins++;
        r.kills += player.kills;
        r.deaths += player.deaths;
        r.assists += player.assists;
        r.cs += player.totalMinionsKilled + player.neutralMinionsKilled;
        r.yourDmg += player.totalDamageDealtToChampions;
        r.theirDmg += enemy.totalDamageDealtToChampions;
        r.roles.add(player.teamPosition);
        if (match.gameCreation > r.lastPlayed) r.lastPlayed = match.gameCreation;
      });
    });

    return Object.entries(records).map(([championName, r]): MatchupRecord => ({
      championName,
      games: r.games,
      wins: r.wins,
      losses: r.games - r.wins,
      winrate: r.games > 0 ? Math.round((r.wins / r.games) * 100) : 0,
      avgKills: r.games > 0 ? parseFloat((r.kills / r.games).toFixed(1)) : 0,
      avgDeaths: r.games > 0 ? parseFloat((r.deaths / r.games).toFixed(1)) : 0,
      avgAssists: r.games > 0 ? parseFloat((r.assists / r.games).toFixed(1)) : 0,
      avgKda: r.games > 0 ? parseFloat(((r.kills + r.assists) / Math.max(r.deaths, 1)).toFixed(1)) : 0,
      avgCs: r.games > 0 ? Math.round(r.cs / r.games) : 0,
      roles: r.roles,
      lastPlayed: r.lastPlayed,
      yourAvgDmg: r.games > 0 ? Math.round(r.yourDmg / r.games) : 0,
      theirAvgDmg: r.games > 0 ? Math.round(r.theirDmg / r.games) : 0,
    }));
  }, [matches, roleFilter]);

  // ─── Filter & sort ──────────────────────────────────────────────────────
  const filteredMatchups = useMemo(() => {
    let result = matchups;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => m.championName.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "games": cmp = a.games - b.games; break;
        case "winrate": cmp = a.winrate - b.winrate; break;
        case "kda": cmp = a.avgKda - b.avgKda; break;
        case "name": cmp = a.championName.localeCompare(b.championName); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [matchups, search, sortKey, sortDir]);

  // ─── Stats summary ──────────────────────────────────────────────────────
  const totalEncounters = matchups.reduce((s, m) => s + m.games, 0);
  const uniqueChamps = matchups.length;
  const worstMatchup = matchups.filter(m => m.games >= 2).sort((a, b) => a.winrate - b.winrate)[0];
  const bestMatchup = matchups.filter(m => m.games >= 2).sort((a, b) => b.winrate - a.winrate)[0];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (isLoading && !matches) {
    return (
      <div className="w-full flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <span className="text-sm text-muted-foreground">{error}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col font-sans pb-20"
    >
      <PageHeader
        title={t("matchups.title")}
        subtitle={t("matchups.subtitle")}
        icon={Swords}
        badge={`${uniqueChamps} ${t("matchups.champsFaced")}`}
        badgeVariant="primary"
        breadcrumbs={[
          { label: t("nav.matches"), to: "/matches" },
          { label: t("matchups.title") },
        ]}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-border/60 bg-card">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            {t("matchups.encounters")}
          </span>
          <span className="text-[22px] font-mono font-bold text-foreground">{totalEncounters}</span>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-card">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            {t("matchups.unique")}
          </span>
          <span className="text-[22px] font-mono font-bold text-foreground">{uniqueChamps}</span>
        </div>
        {bestMatchup && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">
              {t("matchups.best")}
            </span>
            <span className="text-[14px] font-semibold text-foreground">{bestMatchup.championName}</span>
            <span className="text-[12px] font-mono text-emerald-500 block">{bestMatchup.wins}W {bestMatchup.losses}L ({bestMatchup.winrate}%)</span>
          </div>
        )}
        {worstMatchup && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-1">
              {t("matchups.worst")}
            </span>
            <span className="text-[14px] font-semibold text-foreground">{worstMatchup.championName}</span>
            <span className="text-[12px] font-mono text-red-500 block">{worstMatchup.wins}W {worstMatchup.losses}L ({worstMatchup.winrate}%)</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("matchups.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Role filter */}
        <div ref={roleRef} className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border border-border/50 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {t(ROLE_KEYS.find(r => r.value === roleFilter)?.key || "role.all")}
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showRoleDropdown && "rotate-180")} />
          </button>
          {showRoleDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-card border border-border/60 rounded-xl shadow-xl z-30 overflow-hidden min-w-[160px]">
              {ROLE_KEYS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setRoleFilter(opt.value); setShowRoleDropdown(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-secondary/50 transition-colors",
                    roleFilter === opt.value ? "text-primary bg-primary/5" : "text-foreground"
                  )}
                >
                  {t(opt.key)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1 bg-secondary/30 rounded-xl p-1 border border-border/30">
          {([
            { key: "games" as SortKey, label: t("matchups.sortGames") },
            { key: "winrate" as SortKey, label: t("matchups.sortWR") },
            { key: "kda" as SortKey, label: "KDA" },
            { key: "name" as SortKey, label: t("matchups.sortName") },
          ]).map(s => (
            <button
              key={s.key}
              onClick={() => toggleSort(s.key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                sortKey === s.key
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
              {sortKey === s.key && (
                <span className="ml-1 text-[9px]">{sortDir === "desc" ? "\u2193" : "\u2191"}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Matchup table */}
      <div className="flex flex-col gap-2">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span className="w-[220px]">{t("matchups.champion")}</span>
          <span className="w-[100px] text-center">{t("matchups.record")}</span>
          <span className="w-[60px] text-center">WR</span>
          <span className="w-[100px] text-center">{t("matchups.avgKDA")}</span>
          <span className="w-[60px] text-center">CS</span>
          <span className="flex-1 text-center">{t("matchups.dmgComparison")}</span>
        </div>

        <AnimatePresence>
          {filteredMatchups.map((matchup, idx) => {
            const wrColor = matchup.winrate >= 55 ? "text-emerald-500" : matchup.winrate <= 40 ? "text-red-500" : "text-foreground";
            const kdaColor = matchup.avgKda >= 3 ? "text-primary" : matchup.avgKda >= 2 ? "text-foreground" : "text-destructive/80";
            const maxDmg = Math.max(matchup.yourAvgDmg, matchup.theirAvgDmg, 1);

            return (
              <motion.div
                key={matchup.championName}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/40 bg-card hover:bg-secondary/20 hover:border-foreground/10 transition-colors cursor-pointer group card-lift card-shine"
                onClick={() => openChampion(matchup.championName)}
              >
                {/* Champion */}
                <div className="flex items-center gap-3 w-[220px]">
                  <div className="w-9 h-9 rounded-lg bg-secondary border border-border/60 overflow-hidden shrink-0">
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${matchup.championName}.png`}
                      alt={matchup.championName}
                      className="w-full h-full object-cover scale-110"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {matchup.championName}
                      </span>
                      {matchup.winrate <= 35 && matchup.games >= 2 && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
                          WEAK
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {matchup.games} {matchup.games === 1 ? "game" : "games"}
                    </span>
                  </div>
                </div>

                {/* Record */}
                <div className="w-[100px] text-center">
                  <span className="text-[13px] font-mono font-semibold">
                    <span className="text-emerald-500">{matchup.wins}W</span>
                    {" "}
                    <span className="text-red-500">{matchup.losses}L</span>
                  </span>
                </div>

                {/* Winrate */}
                <div className="w-[72px] flex flex-col items-center gap-0.5">
                  <div className="relative w-10 h-10">
                    <svg viewBox="0 0 40 40" className="-rotate-90 w-full h-full">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--secondary)" strokeWidth="3.5" />
                      <circle
                        cx="20" cy="20" r="16" fill="none"
                        stroke={matchup.winrate >= 55 ? "#22c55e" : matchup.winrate <= 40 ? "#ef4444" : "var(--color-primary)"}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 16}`}
                        strokeDashoffset={`${2 * Math.PI * 16 * (1 - matchup.winrate / 100)}`}
                      />
                    </svg>
                    <span className={cn("absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono", wrColor)}>
                      {matchup.winrate}
                    </span>
                  </div>
                </div>

                {/* Avg KDA */}
                <div className="w-[100px] text-center">
                  <span className="text-[12px] font-mono text-foreground">
                    {matchup.avgKills}/{matchup.avgDeaths}/{matchup.avgAssists}
                  </span>
                  <span className={cn("text-[11px] font-mono block", kdaColor)}>
                    {matchup.avgKda} KDA
                  </span>
                </div>

                {/* CS */}
                <div className="w-[60px] text-center">
                  <span className="text-[12px] font-mono text-muted-foreground">{matchup.avgCs}</span>
                </div>

                {/* Damage comparison bars */}
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">You</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${(matchup.yourAvgDmg / maxDmg) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground/60 w-10 text-right">
                      {(matchup.yourAvgDmg / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">Foe</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-destructive/40 rounded-full"
                        style={{ width: `${(matchup.theirAvgDmg / maxDmg) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground/60 w-10 text-right">
                      {(matchup.theirAvgDmg / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredMatchups.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center">
              <Swords className="w-8 h-8 text-muted-foreground/25" />
            </div>
            <div className="text-center max-w-[300px]">
              <p className="text-[15px] font-semibold text-foreground mb-1.5">
                {search ? (t("matchups.noResultsFor") || t("matchups.noResults")).replace("{search}", search) : matchups.length === 0 ? t("matchups.noData") : t("matchups.noResults")}
              </p>
              <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
                {search
                  ? t("matchups.tryOtherChamp")
                  : matchups.length === 0
                  ? t("matchups.playRanked")
                  : t("matchups.tryAll")}
              </p>
            </div>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="px-4 py-2 rounded-lg text-[12px] font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                {t("matchups.clearSearch")}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
