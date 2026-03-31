/**
 * ChampionPool — Manage your ranked champion pool
 * 
 * Features:
 * - Define picks per role
 * - Track practice sessions
 * - Pool health metrics
 * - Suggestions based on playstyle
 * - Favorites filter integration
 */

import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { Plus, X, Star, TrendingUp, TrendingDown, Target, Shield, Swords, Loader2, AlertCircle, Crown, Sparkles, Heart, Skull } from "lucide-react";
import { cn } from "../components/ui/utils";
import { useState, useMemo } from "react";
import { TiltCard } from "../components/TiltCard";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { getMatchHistory } from "../services/dataService";
import { RANKED_QUEUE_IDS } from "../utils/analytics";
import { useAsyncData } from "../hooks/useAsyncData";
import { useChampionDrawer } from "../contexts/ChampionDrawerContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useFavoriteChampions } from "../hooks/useFavoriteChampions";
import { ChampionPoolSkeleton } from "../components/Skeletons";
import { PageHeader } from "../components/PageHeader";

const ROLES = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;
type Role = typeof ROLES[number];

interface PoolChampion {
  name: string;
  role: Role;
  tier: "main" | "secondary" | "pocket";
  games: number;
  wins: number;
  avgKda: number;
  lastPlayed: number; // timestamp
  healthScore: number; // 0-100
}

function computeHealthScore(wr: number, games: number, lastPlayed: number): number {
  const wrScore = (wr / 100) * 50;
  const gamesScore = Math.min(games / 20, 1) * 30;
  const daysSince = (Date.now() - lastPlayed) / 86400000;
  const recencyScore = daysSince < 7 ? 20 : daysSince < 14 ? 10 : 0;
  return Math.round(wrScore + gamesScore + recencyScore);
}

const TIER_CONFIG = {
  main:      { label: "Main",      color: "text-yellow-500",  bg: "bg-yellow-500/15",  border: "border-yellow-500/30",  icon: Crown },
  secondary: { label: "Secondary", color: "text-zinc-400",    bg: "bg-zinc-400/15",    border: "border-zinc-400/30",    icon: Star },
  pocket:    { label: "Pocket",    color: "text-orange-600",  bg: "bg-orange-600/15",  border: "border-orange-600/30",  icon: Sparkles },
};

const ROLE_LABELS: Record<Role, string> = {
  TOP: "Top", JGL: "Jungle", MID: "Mid", ADC: "Bot", SUP: "Support",
};

export function ChampionPool() {
  const { version: patchVersion } = usePatchVersion();
  const { data: matches, isLoading, error } = useAsyncData(() => getMatchHistory(), []);
  const { openChampion } = useChampionDrawer();
  const { t } = useLanguage();
  const { favorites, isFavorite } = useFavoriteChampions();
  const [selectedRole, setSelectedRole] = useState<Role | "ALL" | "FAVORITES">("ALL");

  // Compute worst matchups from ranked match history
  const worstMatchups = useMemo(() => {
    if (!matches) return [];
    const ranked = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
    const source = ranked.length > 0 ? ranked : matches;
    const oppMap: Record<string, { games: number; wins: number }> = {};
    source.forEach(m => {
      const me = m.participants[m.playerParticipantIndex];
      if (!me) return;
      m.participants.forEach((p, i) => {
        if (i === m.playerParticipantIndex) return;
        if (p.teamId === me.teamId) return; // skip allies
        const key = p.championName;
        if (!key) return;
        if (!oppMap[key]) oppMap[key] = { games: 0, wins: 0 };
        oppMap[key].games++;
        if (me.win) oppMap[key].wins++;
      });
    });
    return Object.entries(oppMap)
      .filter(([, s]) => s.games >= 2)
      .map(([name, s]) => ({ name, games: s.games, wr: Math.round((s.wins / s.games) * 100) }))
      .sort((a, b) => a.wr - b.wr)
      .slice(0, 6);
  }, [matches]);

  // Compute pool from ranked match history only
  const pool = useMemo(() => {
    if (!matches) return [];
    const ranked = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
    const source = ranked.length > 0 ? ranked : matches;

    const champMap: Record<string, { games: number; wins: number; kills: number; deaths: number; assists: number; role: string; lastPlayed: number }> = {};

    source.forEach(m => {
      const p = m.participants[m.playerParticipantIndex];
      if (!p) return; // guard: skip malformed match entries
      const key = p.championName;
      const role = p.teamPosition === "MIDDLE" ? "MID" : p.teamPosition === "BOTTOM" ? "ADC" : p.teamPosition === "JUNGLE" ? "JGL" : p.teamPosition === "UTILITY" ? "SUP" : "TOP";
      
      if (!champMap[key]) champMap[key] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, role, lastPlayed: 0 };
      champMap[key].games++;
      if (p.win) champMap[key].wins++;
      champMap[key].kills += p.kills;
      champMap[key].deaths += p.deaths;
      champMap[key].assists += p.assists;
      if (m.gameCreation > champMap[key].lastPlayed) {
        champMap[key].lastPlayed = m.gameCreation;
        champMap[key].role = role;
      }
    });

    return Object.entries(champMap)
      .map(([name, stats]): PoolChampion => {
        const wr = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
        return {
          name,
          role: stats.role as Role,
          tier: stats.games >= 5 ? "main" : stats.games >= 3 ? "secondary" : "pocket",
          games: stats.games,
          wins: stats.wins,
          avgKda: stats.deaths > 0 ? parseFloat(((stats.kills + stats.assists) / stats.deaths).toFixed(1)) : stats.kills + stats.assists,
          lastPlayed: stats.lastPlayed,
          healthScore: computeHealthScore(wr, stats.games, stats.lastPlayed),
        };
      })
      .sort((a, b) => b.games - a.games);
  }, [matches]);

  const filteredPool = selectedRole === "FAVORITES"
    ? pool.filter(c => isFavorite(c.name))
    : selectedRole === "ALL"
    ? pool
    : pool.filter(c => c.role === selectedRole);

  // Pool health metrics
  const totalGames = pool.reduce((s, c) => s + c.games, 0);
  const uniqueChamps = pool.length;
  const mainCount = pool.filter(c => c.tier === "main").length;
  const overallWr = totalGames > 0 ? Math.round(pool.reduce((s, c) => s + c.wins, 0) / totalGames * 100) : 0;
  const rolesPlayed = new Set(pool.map(c => c.role)).size;
  const favCount = pool.filter(c => isFavorite(c.name)).length;

  if (isLoading && !matches) {
    return <ChampionPoolSkeleton />;
  }
  if (error) {
    return (<div className="w-full flex flex-col items-center justify-center h-[60vh] gap-4"><AlertCircle className="w-6 h-6 text-destructive" /><span className="text-sm text-muted-foreground">{error}</span></div>);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="w-full flex flex-col font-sans pb-20">
      <PageHeader
        title={t("pool.title")}
        subtitle={t("pool.subtitle", { count: totalGames })}
        icon={Swords}
      />

      {/* Pool Health Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { delay: 0 },
          { delay: 0.06 },
          { delay: 0.12 },
          { delay: 0.18 },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: item.delay, ease: [0.16, 1, 0.3, 1] }}
          >
            <TiltCard intensity={4} className="p-4 rounded-xl border border-border/60 bg-card card-shine h-full">
              {idx === 0 && <>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{t("pool.champions")}</span>
                <span className="text-[22px] font-mono font-bold text-foreground number-emerge"><AnimatedNumber value={uniqueChamps} decimals={0} /></span>
                <span className="text-[11px] text-muted-foreground block">{t("pool.mains", { count: mainCount })}</span>
              </>}
              {idx === 1 && <>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{t("pool.winrate")}</span>
                <span className={cn("text-[22px] font-mono font-bold number-emerge", overallWr >= 50 ? "value-good-emerald" : "value-bad")}><AnimatedNumber value={overallWr} decimals={0} suffix="%" /></span>
                <span className="text-[11px] text-muted-foreground block">{t("pool.games", { count: totalGames })}</span>
              </>}
              {idx === 2 && <>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{t("pool.roles")}</span>
                <span className="text-[22px] font-mono font-bold text-foreground number-emerge"><AnimatedNumber value={rolesPlayed} decimals={0} suffix="/5" /></span>
                <span className="text-[11px] text-muted-foreground block">{t("pool.rolesCovered")}</span>
              </>}
              {idx === 3 && <>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{t("pool.diversity")}</span>
                <span className={cn("text-[22px] font-mono font-bold number-emerge", uniqueChamps <= 4 ? "value-good-emerald" : uniqueChamps <= 7 ? "text-amber-500" : "value-bad")}>
                  {uniqueChamps <= 4 ? t("pool.focused") : uniqueChamps <= 7 ? t("pool.varied") : t("pool.wide")}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {uniqueChamps <= 4 ? t("pool.idealRanked") : uniqueChamps <= 7 ? t("pool.considerReduce") : t("pool.tooMany")}
                </span>
              </>}
            </TiltCard>
          </motion.div>
        ))}
      </div>

      {/* Role Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedRole("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
            selectedRole === "ALL" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          {t("pool.all")}
        </button>
        {/* Favorites filter */}
        <button
          onClick={() => setSelectedRole("FAVORITES")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5",
            selectedRole === "FAVORITES" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("w-3 h-3", selectedRole === "FAVORITES" ? "fill-primary-foreground" : "")} />
          {t("pool.favorites")}
          {favCount > 0 && (
            <span className={cn("text-[10px] font-mono", selectedRole === "FAVORITES" ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
              {favCount}
            </span>
          )}
        </button>
        {ROLES.map(role => {
          const roleChamps = pool.filter(c => c.role === role);
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5",
                selectedRole === role ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {ROLE_LABELS[role]}
              {roleChamps.length > 0 && (
                <span className={cn("text-[10px] font-mono", selectedRole === role ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                  {roleChamps.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Champion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredPool.map((champ, champIdx) => {
            const config = TIER_CONFIG[champ.tier];
            const TierIcon = config.icon;
            const wr = champ.games > 0 ? Math.round((champ.wins / champ.games) * 100) : 0;
            const daysSinceLastPlayed = Math.floor((Date.now() - champ.lastPlayed) / 86400000);

            return (
              <motion.div
                key={champ.name}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(champIdx * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "rounded-xl border bg-card p-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors cursor-pointer group card-lift card-shine",
                  config.border
                )}
                onClick={() => openChampion(champ.name)}
              >
                {/* Champion icon */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0 champ-icon-ring">
                    <motion.img
                      layoutId={`champ-icon-${champ.name}`}
                      src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${champ.name}.png`}
                      alt={champ.name}
                      className="w-full h-full object-cover scale-110 transition-transform duration-300 group-hover:scale-125"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div className={cn("absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-card", config.bg)}>
                    <TierIcon className={cn("w-3 h-3", config.color)} />
                  </div>
                  {isFavorite(champ.name) && (
                    <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center border border-card bg-primary/10">
                      <Heart className="w-3 h-3 text-primary fill-primary" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-foreground truncate" title={champ.name}>{champ.name}</span>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", config.bg, config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[12px] text-muted-foreground">
                    <span className="font-mono">{champ.games}g</span>
                    <span className={cn("font-mono font-medium", wr >= 50 ? "text-emerald-500" : "text-destructive")}>{wr}%</span>
                    <span className="font-mono">{champ.avgKda} KDA</span>
                    <span className="text-[10px]">{ROLE_LABELS[champ.role]}</span>
                  </div>
                  {daysSinceLastPlayed > 7 && (
                    <span className="text-[10px] text-amber-500 mt-1">{t("pool.notPlayed", { days: daysSinceLastPlayed })}</span>
                  )}
                </div>

                {/* Winrate bar + Health score */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={cn("text-[16px] font-mono font-bold", wr >= 55 ? "value-good-emerald" : wr >= 45 ? "text-foreground" : "value-bad")}>
                    {wr}%
                  </span>
                  <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={cn("wr-bar-fill", wr >= 50 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-destructive to-red-400")}
                      initial={{ width: 0 }}
                      animate={{ width: `${wr}%` }}
                      transition={{ duration: 0.7, delay: Math.min(champIdx * 0.04, 0.24) + 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5",
                    champ.healthScore >= 70 ? "bg-emerald-500/10 text-emerald-500" :
                    champ.healthScore >= 45 ? "bg-amber-500/10 text-amber-500" :
                    "bg-red-500/10 text-red-400"
                  )}>
                    {champ.healthScore}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredPool.length === 0 && selectedRole === "FAVORITES" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-7 h-7 text-primary/60" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-foreground">{t("pool.noFavorites")}</p>
              <p className="text-[12px] text-muted-foreground mt-1">{t("pool.noFavoritesDesc")}</p>
            </div>
          </motion.div>
        )}

        {filteredPool.length === 0 && selectedRole !== "FAVORITES" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center border border-dashed border-border">
              <Swords className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-foreground">{t("pool.noChamps")}</p>
              <p className="text-[12px] text-muted-foreground mt-1">{t("pool.noChamps.hint") || "Play ranked games to populate your pool"}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Worst Matchups */}
      {worstMatchups.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-2 mb-4">
            <Skull className="w-4 h-4 text-red-400" />
            Matchups más difíciles
            <span className="text-[11px] font-normal text-muted-foreground">(basado en tu historial)</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {worstMatchups.map(opp => (
              <div key={opp.name} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-red-500/10">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/${opp.name}_0.jpg`}
                  alt={opp.name}
                  className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border/40"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate">{opp.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      "text-[13px] font-mono font-bold",
                      opp.wr < 40 ? "text-red-400" : opp.wr < 50 ? "text-amber-400" : "text-emerald-500"
                    )}>{opp.wr}%</span>
                    <span className="text-[10px] text-muted-foreground/60">{opp.games}G</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pool Advice */}
      {pool.length > 0 && (
        <div className="mt-8 p-5 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-foreground">{t("pool.advice")}</span>
              <span className="text-[12px] text-muted-foreground leading-relaxed">
                {uniqueChamps <= 3
                  ? t("pool.adviceCompact")
                  : uniqueChamps <= 5
                  ? t("pool.adviceBalanced", { mains: mainCount })
                  : t("pool.adviceWide", { count: uniqueChamps })
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}