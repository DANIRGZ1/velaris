/**
 * DuoSynergy — Velaris
 * 
 * Analyzes performance with frequent teammates (premades/duos).
 * Detects players who appear in multiple games on your team,
 * computes synergy stats, and displays best/worst duo partners.
 */

import { motion } from "motion/react";
import { Users, TrendingUp, TrendingDown, Swords, Shield, Star, ChevronRight } from "lucide-react";
import { cn } from "./ui/utils";
import { usePatchVersion } from "../hooks/usePatchVersion";
import type { MatchData } from "../utils/analytics";
import { useLanguage } from "../contexts/LanguageContext";

interface DuoStats {
  name: string;
  games: number;
  wins: number;
  winrate: number;
  avgKdaWith: number;
  avgKdaWithout: number;
  mostPlayedChamp: string;
  yourMostPlayedChamp: string;
  synergyScore: number; // -100 to +100
}

// Ranked queue IDs: 420 = Solo/Duo, 440 = Flex
const RANKED_QUEUE_IDS = new Set([420, 440]);

function analyzeDuos(matches: MatchData[]): DuoStats[] {
  // Only count ranked games — normals have no LP at stake
  const rankedMatches = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
  if (rankedMatches.length === 0) return [];

  const myPuuids = new Set<string>();
  rankedMatches.forEach(m => {
    const p = m.participants[m.playerParticipantIndex];
    if (p) myPuuids.add(p.puuid);
  });

  // Count teammate appearances
  const teammateMap: Record<string, {
    name: string;
    games: { win: boolean; myKda: number; theirChamp: string; myChamp: string }[];
  }> = {};

  rankedMatches.forEach(m => {
    const me = m.participants[m.playerParticipantIndex];
    if (!me) return;
    const allies = m.participants.filter((p, i) => i !== m.playerParticipantIndex && p.win === me.win);

    allies.forEach(ally => {
      if (myPuuids.has(ally.puuid)) return; // Skip self
      const key = ally.summonerName;
      if (!teammateMap[key]) teammateMap[key] = { name: key, games: [] };
      teammateMap[key].games.push({
        win: me.win,
        myKda: (me.kills + me.assists) / Math.max(me.deaths, 1),
        theirChamp: ally.championName,
        myChamp: me.championName,
      });
    });
  });

  // Overall stats (for comparison) — ranked games only
  const allMyGames = rankedMatches.flatMap(m => {
    const me = m.participants[m.playerParticipantIndex];
    if (!me) return [];
    return [{ win: me.win, kda: (me.kills + me.assists) / Math.max(me.deaths, 1) }];
  });
  const overallKda = allMyGames.length > 0
    ? allMyGames.reduce((s, g) => s + g.kda, 0) / allMyGames.length
    : 0;

  // Filter to frequent teammates (2+ games)
  return Object.values(teammateMap)
    .filter(t => t.games.length >= 2)
    .map(t => {
      const wins = t.games.filter(g => g.win).length;
      const winrate = Math.round((wins / t.games.length) * 100);
      const avgKdaWith = t.games.reduce((s, g) => s + g.myKda, 0) / t.games.length;

      // KDA in games WITHOUT this teammate
      const gamesWithout = allMyGames.length - t.games.length;
      const kdaTotalAll = allMyGames.reduce((s, g) => s + g.kda, 0);
      const kdaTotalWith = t.games.reduce((s, g) => s + g.myKda, 0);
      const avgKdaWithout = gamesWithout > 0 ? (kdaTotalAll - kdaTotalWith) / gamesWithout : overallKda;

      // Most played champion for both
      const theirChampCounts: Record<string, number> = {};
      const myChampCounts: Record<string, number> = {};
      t.games.forEach(g => {
        theirChampCounts[g.theirChamp] = (theirChampCounts[g.theirChamp] || 0) + 1;
        myChampCounts[g.myChamp] = (myChampCounts[g.myChamp] || 0) + 1;
      });
      const mostPlayedChamp = Object.entries(theirChampCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
      const yourMostPlayedChamp = Object.entries(myChampCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

      // Synergy score: combination of WR delta vs overall and KDA delta
      const overallWr = allMyGames.length > 0
        ? Math.round((allMyGames.filter(g => g.win).length / allMyGames.length) * 100)
        : 50;
      const wrDelta = winrate - overallWr;
      const kdaDelta = avgKdaWith - avgKdaWithout;
      const synergyScore = Math.round(wrDelta * 0.6 + kdaDelta * 10 * 0.4);

      return {
        name: t.name,
        games: t.games.length,
        wins,
        winrate,
        avgKdaWith: parseFloat(avgKdaWith.toFixed(1)),
        avgKdaWithout: parseFloat(avgKdaWithout.toFixed(1)),
        mostPlayedChamp,
        yourMostPlayedChamp,
        synergyScore: Math.max(-100, Math.min(100, synergyScore)),
      };
    })
    .sort((a, b) => b.synergyScore - a.synergyScore);
}

// ─── Widget for Profile page ──────────────────────────────────────────────────

export function DuoSynergyWidget({ matches, className }: { matches: MatchData[]; className?: string }) {
  const duos = analyzeDuos(matches);
  const { version: patchVersion } = usePatchVersion();
  const { t } = useLanguage();

  if (duos.length === 0) {
    return (
      <div className={cn("bg-card border border-border rounded-2xl p-5", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("duo.title")}</h3>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {t("duo.noData")}
        </p>
      </div>
    );
  }

  const topDuos = duos.slice(0, 4);

  return (
    <div className={cn("bg-card border border-border rounded-2xl p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t("duo.title")}</h3>
        <span className="text-[11px] text-muted-foreground ml-auto">{t("duo.gamesPlayed", { count: duos.length })}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {topDuos.map((duo, i) => (
          <DuoCard key={duo.name} duo={duo} rank={i + 1} patchVersion={patchVersion} />
        ))}
      </div>
    </div>
  );
}

// ─── Full section for Profile page ────────────────────────────────────────────

export function DuoSynergySection({ matches, className }: { matches: MatchData[]; className?: string }) {
  const duos = analyzeDuos(matches);
  const { version: patchVersion } = usePatchVersion();
  const { t } = useLanguage();

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("duo.title")}</h3>
        <span className="text-[11px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{duos.length}</span>
      </div>

      {duos.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("duo.noData")}</p>
          <p className="text-[12px] text-muted-foreground/60 mt-1">{t("duo.noDataDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {duos.map((duo, i) => (
            <DuoCard key={duo.name} duo={duo} rank={i + 1} patchVersion={patchVersion} expanded />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Duo Card ─────────────────────────────────────────────────────────────────

function DuoCard({ duo, rank, patchVersion, expanded = false }: {
  duo: DuoStats;
  rank: number;
  patchVersion: string;
  expanded?: boolean;
}) {
  const isPositive = duo.synergyScore >= 0;
  const kdaDelta = duo.avgKdaWith - duo.avgKdaWithout;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: rank * 0.03, duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        isPositive
          ? "bg-emerald-500/[0.03] border-emerald-500/15 hover:border-emerald-500/30"
          : "bg-destructive/[0.03] border-destructive/15 hover:border-destructive/30"
      )}
    >
      {/* Rank badge */}
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0",
        rank === 1 ? "bg-amber-500/15 text-amber-500" :
        rank === 2 ? "bg-slate-400/15 text-slate-400" :
        rank === 3 ? "bg-amber-700/15 text-amber-700" :
        "bg-secondary text-muted-foreground"
      )}>
        #{rank}
      </div>

      {/* Champion icon */}
      <div className="w-9 h-9 rounded-lg bg-secondary border border-border/60 overflow-hidden shrink-0">
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${duo.mostPlayedChamp}.png`}
          alt={duo.mostPlayedChamp}
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-medium text-foreground truncate">{duo.name}</span>
          <span className="text-[11px] text-muted-foreground">{duo.games}G</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={cn("font-mono font-medium", duo.winrate >= 55 ? "text-emerald-500" : duo.winrate <= 45 ? "text-destructive" : "text-muted-foreground")}>
            {duo.winrate}% WR
          </span>
          <span className="text-muted-foreground">&bull;</span>
          <span className="text-muted-foreground">{duo.mostPlayedChamp}</span>
        </div>
      </div>

      {/* Synergy score */}
      <div className="flex flex-col items-end shrink-0">
        <div className={cn(
          "flex items-center gap-1 text-[12px] font-mono font-bold",
          isPositive ? "text-emerald-500" : "text-destructive"
        )}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? "+" : ""}{duo.synergyScore}
        </div>
        {expanded && (
          <span className="text-[10px] text-muted-foreground">
            KDA {kdaDelta >= 0 ? "+" : ""}{kdaDelta.toFixed(1)}
          </span>
        )}
      </div>
    </motion.div>
  );
}