/**
 * GameLoadingOverlay — pantalla de carga estilo Blitz/PoroFessor.
 *
 * Layout: 2 filas × 5 tarjetas
 *   · Fila superior → equipo AZUL
 *   · Fila inferior → equipo ROJO
 *
 * Cada tarjeta muestra:
 *   · Splash art del campeón como fondo de la tarjeta
 *   · Nombre del invocador (grande)
 *   · Tags de rol y rendimiento
 *   · WR%, KDA, rango
 *   · Barra de winrate al pie
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Eye, Flame, TrendingDown, TrendingUp, Zap, Star,
  Shield, Sword,
} from "lucide-react";
import { cn } from "./ui/utils";
import { getLiveGameData } from "../services/dataService";
import { usePatchVersion } from "../hooks/usePatchVersion";
import type { MatchData } from "../utils/analytics";
import type { PlayerProfile } from "../utils/playerScouting";

const AUTO_CLOSE_S = 40;

// ─── Tag system ───────────────────────────────────────────────────────────────

interface Tag {
  label: string;
  color: "emerald" | "red" | "orange" | "yellow" | "purple" | "blue" | "slate";
}

const TAG_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
  red:     "bg-red-500/20 border-red-400/30 text-red-300",
  orange:  "bg-orange-500/20 border-orange-400/30 text-orange-300",
  yellow:  "bg-yellow-500/20 border-yellow-400/30 text-yellow-300",
  purple:  "bg-purple-500/20 border-purple-400/30 text-purple-300",
  blue:    "bg-blue-500/20 border-blue-400/30 text-blue-300",
  slate:   "bg-white/10 border-white/15 text-white/60",
};

const ROLE_LABEL: Record<string, string> = {
  TOP: "Top", JGL: "Jungla", MID: "Mid", ADC: "ADC", SUP: "Support",
};

function computeTags(profile: PlayerProfile): Tag[] {
  const tags: Tag[] = [];
  const {
    currentRole, recentAvgDeaths, recentAvgVisionPerMin,
    recentAvgCsPerMin, recentAvgKda, currentStreak,
    recentWins, recentLosses, champions,
  } = profile;
  const recentGames = recentWins + recentLosses;
  const recentWR = recentGames > 0 ? (recentWins / recentGames) * 100 : 50;

  // Champion main
  const mainChamp = champions?.[0];
  if (mainChamp?.games >= 10 && mainChamp.name && !mainChamp.name.startsWith("Champion")) {
    tags.push({ label: `${mainChamp.name} Main`, color: "blue" });
  }

  // Role main
  if (currentRole && ROLE_LABEL[currentRole]) {
    tags.push({ label: `${ROLE_LABEL[currentRole]} Main`, color: "slate" });
  }

  // Streak
  if (currentStreak >= 3) tags.push({ label: `${currentStreak}V seguidas 🔥`, color: "emerald" });
  else if (currentStreak <= -3) tags.push({ label: `${Math.abs(currentStreak)}D seguidas`, color: "red" });

  // Performance
  if (recentWR >= 60 && recentGames >= 5) tags.push({ label: `${Math.round(recentWR)}% WR`, color: "emerald" });
  if (recentAvgKda >= 4.5) tags.push({ label: `KDA ${recentAvgKda.toFixed(1)}`, color: "emerald" });
  if (recentAvgVisionPerMin >= 1.3) tags.push({ label: "Gran visión", color: "purple" });
  if (recentAvgCsPerMin >= 8.5 && currentRole !== "SUP") tags.push({ label: `${recentAvgCsPerMin.toFixed(1)} CS/min`, color: "yellow" });
  if (recentAvgDeaths >= 6) tags.push({ label: "Muere mucho", color: "red" });
  else if (recentAvgDeaths <= 2.5 && recentGames >= 5) tags.push({ label: "Juego limpio", color: "blue" });

  return tags;
}

// ─── Champion WR helper ───────────────────────────────────────────────────────

function computeChampWr(profile: PlayerProfile): number | null {
  const champName = profile.currentChampion;
  if (!champName || champName === "Unknown") return null;
  const entry = profile.champions?.find(c => c.name === champName);
  if (!entry || entry.games < 3) return null;
  return entry.winrate !== undefined ? Math.round(entry.winrate) : null;
}

// ─── Threat level helper ──────────────────────────────────────────────────────

const TIER_SCORE: Record<string, number> = {
  IRON: 0, BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4,
  EMERALD: 5, DIAMOND: 6, MASTER: 7, GRANDMASTER: 8, CHALLENGER: 9,
};

function computeThreat(profile: PlayerProfile): "alto" | "medio" | "bajo" {
  const recentGames = profile.recentWins + profile.recentLosses;
  const recentWR = recentGames > 0 ? (profile.recentWins / recentGames) * 100 : 50;
  const rankScore = (TIER_SCORE[profile.rank?.toUpperCase() ?? ""] ?? 0) * 10;
  const wrBonus = (recentWR - 50) * 0.5;
  const kdaBonus = ((profile.recentAvgKda ?? 2) - 2) * 3;
  const score = rankScore + wrBonus + kdaBonus;
  if (score >= 50) return "alto";
  if (score >= 25) return "medio";
  return "bajo";
}

// ─── Rank helpers ─────────────────────────────────────────────────────────────

const RANK_COLORS: Record<string, string> = {
  IRON: "text-zinc-400", BRONZE: "text-amber-600", SILVER: "text-slate-300",
  GOLD: "text-yellow-400", PLATINUM: "text-teal-300", EMERALD: "text-emerald-400",
  DIAMOND: "text-blue-400", MASTER: "text-purple-400",
  GRANDMASTER: "text-red-400", CHALLENGER: "text-yellow-200",
  UNRANKED: "text-white/30",
};

const RANK_SHORT: Record<string, string> = {
  IRON: "H", BRONZE: "B", SILVER: "P", GOLD: "O",
  PLATINUM: "PL", EMERALD: "E", DIAMOND: "D",
  MASTER: "M", GRANDMASTER: "GM", CHALLENGER: "CHA",
};

function rankLabel(rank: string, division: string): string {
  const short = RANK_SHORT[rank] ?? rank.slice(0, 1).toUpperCase();
  const noDiv = ["MASTER", "GRANDMASTER", "CHALLENGER", "UNRANKED"].includes(rank);
  if (rank === "UNRANKED") return "Unranked";
  return noDiv ? short : `${short}${division}`;
}

// ─── My streak ────────────────────────────────────────────────────────────────

function getMyStreak(matches: MatchData[]) {
  if (!matches.length) return { count: 0, isWin: null as boolean | null };
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  const first = sorted[0].participants[sorted[0].playerParticipantIndex];
  if (!first) return { count: 0, isWin: null };
  const isWin = first.win;
  let count = 0;
  for (const m of sorted) {
    if (m.participants[m.playerParticipantIndex]?.win === isWin) count++;
    else break;
  }
  return { count, isWin };
}

// ─── PlayerCard ───────────────────────────────────────────────────────────────

function PlayerCard({
  profile,
  patchVersion,
  isMe,
  side,
  index,
}: {
  profile: PlayerProfile;
  patchVersion: string;
  isMe: boolean;
  side: "blue" | "red";
  index: number;
}) {
  const champName = profile.currentChampion && profile.currentChampion !== "Unknown"
    ? profile.currentChampion
    : null;

  const splashUrl = champName
    ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champName}_0.jpg`
    : null;

  const iconUrl = champName && patchVersion
    ? `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${champName}.png`
    : null;

  const recentGames = profile.recentWins + profile.recentLosses;
  const recentWR = recentGames > 0 ? Math.round((profile.recentWins / recentGames) * 100) : null;
  const tags = computeTags(profile);
  const champWr = computeChampWr(profile);
  const threat = computeThreat(profile);

  return (
    <motion.div
      initial={{ opacity: 0, y: side === "blue" ? -16 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex-1 overflow-hidden",
        // Highlight my card
        isMe && "ring-2 ring-inset z-10",
        isMe && side === "blue" && "ring-blue-400/60",
        isMe && side === "red"  && "ring-red-400/60",
      )}
    >
      {/* Champion splash background */}
      {splashUrl ? (
        <motion.img
          src={splashUrl}
          alt={champName ?? ""}
          className="absolute inset-0 w-full h-full object-cover object-[65%_10%]"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
        />
      ) : (
        <div className="absolute inset-0 bg-white/4" />
      )}

      {/* Side-tinted gradient */}
      <div className={cn(
        "absolute inset-0 opacity-20",
        side === "blue" ? "bg-blue-900" : "bg-red-900"
      )} />

      {/* Dark gradient overlay — strong at bottom, light at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/5" />

      {/* "YO" indicator */}
      {isMe && (
        <div className={cn(
          "absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full border",
          side === "blue"
            ? "bg-blue-500/30 border-blue-400/40 text-blue-200"
            : "bg-red-500/30 border-red-400/40 text-red-200"
        )}>
          TÚ
        </div>
      )}

      {/* ── Content: pinned to bottom of card ──────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-2.5 pb-2.5 pt-10">

        {/* Champion icon + name */}
        <div className="flex items-center gap-1.5">
          {iconUrl && (
            <img
              src={iconUrl}
              alt={champName ?? ""}
              className="w-7 h-7 rounded-md border border-white/20 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold text-white/90 leading-tight truncate drop-shadow-md">
              {profile.summonerName}
            </p>
            {champName && (
              <p className="text-[9px] text-white/40 leading-tight truncate">{champName}</p>
            )}
          </div>
        </div>

        {/* Champion-specific WR + threat badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {champWr !== null && champName && (
            <span className={cn(
              "text-[9px] font-bold leading-none px-1.5 py-[2px] rounded-md border",
              champWr >= 55
                ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                : champWr <= 40
                ? "bg-red-500/20 border-red-400/30 text-red-300"
                : "bg-white/8 border-white/10 text-white/40"
            )}>
              {champWr}% en {champName}
            </span>
          )}
          {side === "red" && !isMe && threat === "alto" && (
            <span className="text-[8px] font-black px-1.5 py-[2px] rounded-md bg-red-500/20 border border-red-400/30 text-red-300 uppercase tracking-wider leading-none">
              ⚠ AMENAZA
            </span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className={cn(
                  "text-[9px] font-semibold px-1.5 py-[2px] rounded-md border leading-none",
                  TAG_COLORS[tag.color]
                )}
              >
                {tag.label}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[9px] text-white/30 px-1 self-center">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-end justify-between gap-1">
          <div className="flex items-baseline gap-1.5">
            {recentWR !== null ? (
              <>
                <span className={cn(
                  "text-xl font-black leading-none",
                  recentWR >= 55 ? "text-emerald-400" : recentWR <= 44 ? "text-red-400" : "text-white"
                )}>
                  {recentWR}%
                </span>
                <span className="text-[9px] text-white/40 leading-none">
                  {recentGames}p
                </span>
              </>
            ) : (
              <span className="text-xs text-white/20">Sin datos</span>
            )}
          </div>

          <div className="text-right shrink-0">
            {profile.recentAvgKda > 0 && (
              <p className="text-[10px] font-mono font-bold text-white/70 leading-tight">
                {profile.recentAvgKda.toFixed(1)} KDA
              </p>
            )}
            {profile.rank && profile.rank !== "UNRANKED" && (
              <p className={cn("text-[10px] font-bold leading-tight", RANK_COLORS[profile.rank] ?? "text-white/30")}>
                {rankLabel(profile.rank, profile.division)}
              </p>
            )}
          </div>
        </div>

        {/* Win rate bar */}
        <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
          {recentWR !== null && (
            <motion.div
              className={cn("h-full rounded-full", recentWR >= 50 ? "bg-emerald-500/80" : "bg-red-500/60")}
              initial={{ width: 0 }}
              animate={{ width: `${recentWR}%` }}
              transition={{ delay: 0.3 + index * 0.07, duration: 0.8, ease: "easeOut" }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── TeamRow: one horizontal row of 5 cards ──────────────────────────────────

function TeamRow({
  players,
  side,
  patchVersion,
  myName,
}: {
  players: PlayerProfile[];
  side: "blue" | "red";
  patchVersion: string;
  myName: string | null;
}) {
  // Pad to 5 slots
  const slots: (PlayerProfile | null)[] = [
    ...players.slice(0, 5),
    ...Array(Math.max(0, 5 - players.length)).fill(null),
  ];

  return (
    <div className="flex flex-1 min-h-0">
      {/* Team label strip */}
      <div className={cn(
        "w-5 shrink-0 flex items-center justify-center",
        side === "blue" ? "bg-blue-600/15" : "bg-red-600/15",
      )}>
        <span className={cn(
          "text-[8px] font-black uppercase tracking-[0.3em] rotate-[-90deg] whitespace-nowrap select-none",
          side === "blue" ? "text-blue-400/60" : "text-red-400/60"
        )}>
          {side === "blue" ? "AZUL" : "ROJO"}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-1 min-w-0 divide-x divide-white/5">
        {slots.map((profile, i) =>
          profile ? (
            <PlayerCard
              key={profile.summonerName + i}
              profile={profile}
              patchVersion={patchVersion}
              isMe={!!myName && profile.summonerName === myName}
              side={side}
              index={i}
            />
          ) : (
            <div key={i} className="flex-1 bg-white/2 animate-pulse" />
          )
        )}
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

interface Props {
  matches: MatchData[];
  players: PlayerProfile[];
  onClose: () => void;
}

export function GameLoadingOverlay({ matches, players, onClose }: Props) {
  const { version: patchVersion } = usePatchVersion();
  const [myChampion, setMyChampion] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [livePlayers, setLivePlayers] = useState<PlayerProfile[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_S);
  const cancelledRef = useRef(false);

  // ── Poll Live Client API until game data is available ─────────────────────
  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      for (let i = 0; i < 12; i++) {
        if (cancelledRef.current) return;
        try {
          const data = await getLiveGameData();
          if (data?.activePlayer?.summonerName) {
            const activeName = data.activePlayer.summonerName;
            const me = data.allPlayers.find((p: any) => p.summonerName === activeName);
            if (me) {
              if (!cancelledRef.current) {
                setMyChampion(me.championName);
                setMyName(activeName);
              }
              // Build fallback profiles from live data (no stats, only champion/team)
              const fallback: PlayerProfile[] = (data.allPlayers as any[]).map((p: any) => ({
                summonerName: p.summonerName,
                accountLevel: 0, rank: "UNRANKED", division: "", lp: 0,
                wins: 0, losses: 0, recentWins: 0, recentLosses: 0,
                recentAvgKda: 0, recentAvgCsPerMin: 0,
                recentAvgVisionPerMin: 0, recentAvgDeaths: 0,
                champions: [],
                currentChampion: p.championName,
                currentRole: "MID" as const,
                currentStreak: 0,
                team: p.team === "ORDER" ? ("BLUE" as const) : ("RED" as const),
              }));
              if (!cancelledRef.current) setLivePlayers(fallback);
              return;
            }
          }
        } catch { /* not ready yet */ }
        await new Promise(r => setTimeout(r, 2500));
      }
    })();
    return () => { cancelledRef.current = true; };
  }, []);

  // ── Countdown ─────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(id); handleClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [handleClose]);

  const progress = ((AUTO_CLOSE_S - secondsLeft) / AUTO_CLOSE_S) * 100;

  // ── Player data: prefer champ-select profiles (have stats) ────────────────
  const activePlayers = players.length >= 2 ? players : livePlayers;
  const blueTeam = activePlayers.filter(p => p.team === "BLUE");
  const redTeam  = activePlayers.filter(p => p.team === "RED");

  // My champion for background
  const resolvedChampion = myChampion
    ?? activePlayers.find(p => myName && p.summonerName === myName)?.currentChampion
    ?? null;

  const myStreak = getMyStreak(matches);

  return (
    <AnimatePresence>
      <motion.div
        key="game-loading-overlay"
        className="fixed inset-0 z-[300] flex flex-col overflow-hidden bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ── Subtle background (my champ splash, very dim) ────────────── */}
        {resolvedChampion && (
          <motion.img
            key={resolvedChampion}
            src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${resolvedChampion}_0.jpg`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top opacity-10"
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/80" />

        {/* ── Header bar ───────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between px-4 h-9 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="brand-wordmark text-[9px] font-black tracking-[0.25em] text-white/30 select-none">
              VELARIS
            </span>
            <span className="text-[10px] text-white/25 font-medium">Partida cargando</span>

            {/* My streak pill */}
            {myStreak.count >= 2 && myStreak.isWin !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold",
                  myStreak.isWin
                    ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-300"
                    : "bg-red-500/15 border-red-500/25 text-red-300"
                )}
              >
                {myStreak.isWin
                  ? <Flame className="w-2.5 h-2.5 text-orange-400" />
                  : <TrendingDown className="w-2.5 h-2.5" />}
                {myStreak.isWin
                  ? `${myStreak.count} victorias seguidas`
                  : `${myStreak.count} derrotas seguidas`}
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/25">{secondsLeft}s</span>
            <button
              onClick={handleClose}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── 5v5 layout: 2 rows stacked ───────────────────────────────── */}
        <div className="relative z-10 flex flex-col flex-1 min-h-0 divide-y divide-white/5">
          {/* Blue team row */}
          <TeamRow
            players={blueTeam}
            side="blue"
            patchVersion={patchVersion ?? ""}
            myName={myName}
          />
          {/* Red team row */}
          <TeamRow
            players={redTeam}
            side="red"
            patchVersion={patchVersion ?? ""}
            myName={myName}
          />
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────── */}
        <div className="relative z-10 h-px bg-white/8 shrink-0">
          <motion.div
            className="h-full bg-white/20"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.95, ease: "linear" }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
