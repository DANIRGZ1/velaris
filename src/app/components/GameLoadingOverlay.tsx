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

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Eye, Flame, TrendingDown, TrendingUp, Zap, Star,
  Shield, Sword,
} from "lucide-react";
import { cn } from "./ui/utils";
import { getLiveGameData } from "../services/dataService";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { useLanguage } from "../contexts/LanguageContext";
import type { MatchData } from "../utils/analytics";
import type { PlayerProfile } from "../utils/playerScouting";


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

function computeTags(profile: PlayerProfile, t: (key: string) => string): Tag[] {
  const tags: Tag[] = [];
  const {
    currentRole, recentAvgDeaths, recentAvgVisionPerMin,
    recentAvgCsPerMin, recentAvgKda, currentStreak,
    recentWins, recentLosses,
  } = profile;
  const recentGames = recentWins + recentLosses;
  const recentWR = recentGames > 0 ? (recentWins / recentGames) * 100 : 50;

  // Streak
  if (currentStreak >= 3) tags.push({ label: `${currentStreak}V ${t("profile.streaks.winsRow")} 🔥`, color: "emerald" });
  else if (currentStreak <= -3) tags.push({ label: `${Math.abs(currentStreak)}D ${t("profile.streaks.lossesRow")}`, color: "red" });

  // Performance — only extreme values
  if (recentWR >= 65 && recentGames >= 8) tags.push({ label: `${Math.round(recentWR)}% WR`, color: "emerald" });
  if (recentAvgKda >= 5.5) tags.push({ label: `KDA ${recentAvgKda.toFixed(1)}`, color: "emerald" });
  if (recentAvgVisionPerMin >= 1.6) tags.push({ label: t("overlay.loading.tags.greatVision"), color: "purple" });
  if (recentAvgCsPerMin >= 9.5 && currentRole !== "SUP") tags.push({ label: `${recentAvgCsPerMin.toFixed(1)} CS/min`, color: "yellow" });
  if (recentAvgDeaths >= 7.5) tags.push({ label: t("overlay.loading.tags.diesALot"), color: "red" });
  else if (recentAvgDeaths <= 2.5 && recentGames >= 8) tags.push({ label: t("overlay.loading.tags.cleanPlay"), color: "blue" });

  return tags.slice(0, 1);
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

function rankLabel(rank: string, division: string, unrankedLabel: string): string {
  const short = RANK_SHORT[rank] ?? rank.slice(0, 1).toUpperCase();
  const noDiv = ["MASTER", "GRANDMASTER", "CHALLENGER", "UNRANKED"].includes(rank);
  if (rank === "UNRANKED") return unrankedLabel;
  return noDiv ? short : `${short}${division}`;
}

// ─── W/L form dots ───────────────────────────────────────────────────────────

function getFormDots(profile: PlayerProfile): ("win" | "loss")[] {
  const streak = profile.currentStreak ?? 0;
  const recentGames = profile.recentWins + profile.recentLosses;
  const recentWR = recentGames > 0 ? profile.recentWins / recentGames : 0.5;
  const streakCount = Math.min(Math.abs(streak), 5);
  const streakColor: "win" | "loss" = streak > 0 ? "win" : "loss";
  const nonStreakCount = 5 - streakCount;
  const winsInNonStreak = Math.round(recentWR * nonStreakCount);
  const dots: ("win" | "loss")[] = [];
  for (let i = 0; i < nonStreakCount; i++) dots.push(i < winsInNonStreak ? "win" : "loss");
  for (let i = 0; i < streakCount; i++) dots.push(streakColor);
  return dots;
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
  t,
  onSelect,
}: {
  profile: PlayerProfile;
  patchVersion: string;
  isMe: boolean;
  side: "blue" | "red";
  index: number;
  t: (key: string) => string;
  onSelect: (p: PlayerProfile) => void;
}) {
  const champName = profile.currentChampion && profile.currentChampion !== "Unknown"
    ? profile.currentChampion
    : null;

  const splashUrl = champName
    ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champName}_0.jpg`
    : null;

  const recentGames = profile.recentWins + profile.recentLosses;
  const recentWR = recentGames > 0 ? Math.round((profile.recentWins / recentGames) * 100) : null;
  const tags = computeTags(profile, t);
  const threat = computeThreat(profile);

  const roleColor = ROLE_COLOR[profile.currentRole ?? ""] ?? "rgba(255,255,255,0.2)";

  return (
    <motion.div
      initial={{ opacity: 0, y: side === "blue" ? -16 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onSelect(profile)}
      className={cn(
        "relative flex-1 overflow-hidden cursor-pointer group",
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
          className="absolute inset-0 w-full h-full object-cover object-[65%_10%] group-hover:scale-105 transition-transform duration-500"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
        />
      ) : (
        <div className="absolute inset-0 bg-white/4" />
      )}

      {/* Hover highlight */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 pointer-events-none" />

      {/* Side-tinted gradient */}
      <div className={cn(
        "absolute inset-0",
        side === "blue" ? "bg-gradient-to-r from-blue-900/30 to-transparent" : "bg-gradient-to-r from-red-900/30 to-transparent"
      )} />

      {/* Dark gradient overlay — strong at bottom, light at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/5" />

      {/* "YOU" indicator */}
      {isMe && (
        <div className={cn(
          "absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full border",
          side === "blue"
            ? "bg-blue-500/30 border-blue-400/40 text-blue-200"
            : "bg-red-500/30 border-red-400/40 text-red-200"
        )}>
          {t("overlay.loading.you")}
        </div>
      )}

      {/* ── Content: pinned to bottom of card ──────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-2.5 pb-2.5 pt-10">

        {/* Summoner name + role dot */}
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: roleColor }} />
          <p className="text-xs font-bold text-white/90 leading-tight truncate drop-shadow-md">
            {profile.summonerName}
          </p>
        </div>

        {/* Threat badge (enemies only) */}
        {side === "red" && !isMe && threat === "alto" && (
          <span className="text-[8px] font-black px-1.5 py-[2px] rounded-md bg-red-500/20 border border-red-400/30 text-red-300 uppercase tracking-wider leading-none self-start">
            {t("overlay.loading.threat")}
          </span>
        )}

        {/* Tag (max 1) */}
        {tags.length > 0 && (
          <span className={cn(
            "text-[9px] font-semibold px-1.5 py-[2px] rounded-md border leading-none self-start",
            TAG_COLORS[tags[0].color]
          )}>
            {tags[0].label}
          </span>
        )}

        {/* Stats row: WR% + rank */}
        <div className="flex items-end justify-between gap-1">
          <div className="flex items-baseline gap-1">
            {recentWR !== null ? (
              <span className={cn(
                "text-2xl font-black leading-none",
                recentWR >= 55 ? "text-emerald-400" : recentWR <= 44 ? "text-red-400" : "text-white"
              )}>
                {recentWR}%
              </span>
            ) : (
              <span className="text-xs text-white/20">{t("overlay.loading.noData")}</span>
            )}
          </div>

          {profile.rank && profile.rank !== "UNRANKED" && (
            <p className={cn("text-[10px] font-bold leading-tight shrink-0", RANK_COLORS[profile.rank] ?? "text-white/30")}>
              {rankLabel(profile.rank, profile.division, t("overlay.loading.unranked"))}
            </p>
          )}
        </div>

        {/* W/L form dots (last 3) */}
        {recentGames > 0 && (
          <div className="flex gap-0.5 mb-0.5">
            {getFormDots(profile).slice(-3).map((r, i) => (
              <div
                key={i}
                className={cn("w-1.5 h-1.5 rounded-full", r === "win" ? "bg-emerald-400" : "bg-red-400/70")}
              />
            ))}
          </div>
        )}
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
  t,
  onSelect,
}: {
  players: PlayerProfile[];
  side: "blue" | "red";
  patchVersion: string;
  myName: string | null;
  t: (key: string) => string;
  onSelect: (p: PlayerProfile) => void;
}) {
  // Pad to 5 slots
  const slots: (PlayerProfile | null)[] = [
    ...players.slice(0, 5),
    ...Array(Math.max(0, 5 - players.length)).fill(null),
  ];

  // Team composition bar (AD vs AP approximate)
  const AP_CHAMPS_SET = new Set(["Lux","Syndra","Orianna","Veigar","Viktor","Ryze","Cassiopeia","Katarina","LeBlanc","Zoe","Ahri","Diana","Fizz","Ekko","Twisted Fate","Zilean","Lissandra","Annie","Morgana","Zyra","Brand","Vel'Koz","Xerath","Malzahar","Azir","Taliyah","Aurelion Sol","Karthus","Swain","Vladimir","Heimerdinger","Teemo","Kennen","Rumble","Grasp","Elise","Nidalee","Fiddlesticks","Evelynn","Shaco","Akali","Seraphine","Nami","Karma","Sona","Janna"]);
  const knownPlayers = players.slice(0, 5).filter(p => p.currentChampion);
  const apCount = knownPlayers.filter(p => AP_CHAMPS_SET.has(p.currentChampion ?? "")).length;
  const adCount = knownPlayers.length - apCount;
  const total = knownPlayers.length || 1;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
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
            {side === "blue" ? t("overlay.loading.blueTeam") : t("overlay.loading.redTeam")}
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
                t={t}
                onSelect={onSelect}
              />
            ) : (
              <div key={i} className="flex-1 bg-white/2 animate-pulse" />
            )
          )}
        </div>
      </div>

      {/* Team composition bar */}
      {knownPlayers.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/30">
          <span className="text-[7px] text-blue-400/50 font-bold w-5 shrink-0">{adCount}AD</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden flex bg-white/5">
            <div style={{ width: `${(adCount / total) * 100}%`, background: side === "blue" ? "rgba(96,165,250,0.7)" : "rgba(248,113,113,0.7)" }} className="h-full transition-all duration-700" />
            <div style={{ width: `${(apCount / total) * 100}%`, background: "rgba(167,139,250,0.7)" }} className="h-full transition-all duration-700" />
          </div>
          <span className="text-[7px] text-purple-400/50 font-bold w-5 shrink-0 text-right">{apCount}AP</span>
        </div>
      )}
    </div>
  );
}

// ─── Player Detail Panel (slide-in on card click) ────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  TOP: "#ef4444", JGL: "#22c55e", MID: "#3b82f6", ADC: "#f59e0b", SUP: "#a855f7",
};

function PlayerDetailPanel({
  profile,
  patchVersion,
  onClose,
  t,
}: {
  profile: PlayerProfile;
  patchVersion: string;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const champName = profile.currentChampion && profile.currentChampion !== "Unknown" ? profile.currentChampion : null;
  const splashUrl = champName ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champName}_0.jpg` : null;
  const recentGames = profile.recentWins + profile.recentLosses;
  const recentWR = recentGames > 0 ? Math.round((profile.recentWins / recentGames) * 100) : null;
  const formDots = getFormDots(profile);
  const tags = computeTags(profile, t);
  const roleColor = ROLE_COLOR[profile.currentRole ?? ""] ?? "rgba(255,255,255,0.2)";

  return (
    <motion.div
      initial={{ x: 290, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 290, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="fixed right-0 top-9 bottom-1 w-72 z-[410] flex flex-col overflow-hidden"
      style={{
        background: "rgba(8,8,16,0.97)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Champion splash header */}
      <div className="relative h-44 shrink-0 overflow-hidden">
        {splashUrl ? (
          <img
            src={splashUrl}
            alt={champName ?? ""}
            className="absolute inset-0 w-full h-full object-cover object-[65%_15%]"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
          />
        ) : (
          <div className="absolute inset-0 bg-white/4" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-[#08080f]/30 to-transparent" />
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/50 border border-white/15 text-white/60 hover:text-white hover:bg-black/70 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {/* Name + role */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: roleColor }} />
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">{profile.currentRole ?? "—"}</span>
          </div>
          <p className="text-sm font-bold text-white leading-tight truncate">{profile.summonerName}</p>
          {champName && <p className="text-[10px] text-white/40">{champName}</p>}
        </div>
      </div>

      {/* Stats body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{t("overlay.loading.recentStats")}</p>

        {recentGames === 0 ? (
          <p className="text-[11px] text-white/25 italic">{t("overlay.loading.noProfile")}</p>
        ) : (
          <>
            {/* WR + games */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-black leading-none" style={{ color: recentWR !== null && recentWR >= 55 ? "#30d158" : recentWR !== null && recentWR <= 44 ? "#ff453a" : "white" }}>
                  {recentWR ?? "—"}%
                </p>
                <p className="text-[9px] text-white/35 mt-0.5">{recentGames} {t("overlay.loading.gamesAbbr").replace("{n}", "").trim()}</p>
              </div>
              {/* Form dots */}
              <div className="flex gap-1 mb-1">
                {formDots.map((r, i) => (
                  <div key={i} className={cn("w-2 h-2 rounded-full", r === "win" ? "bg-emerald-400" : "bg-red-400/70")} />
                ))}
              </div>
            </div>
            {/* WR bar */}
            {recentWR !== null && (
              <div className="h-1 bg-white/8 rounded-full overflow-hidden -mt-1">
                <motion.div
                  className={cn("h-full rounded-full", recentWR >= 50 ? "bg-emerald-500/80" : "bg-red-500/60")}
                  initial={{ width: 0 }}
                  animate={{ width: `${recentWR}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
            )}

            {/* KDA + Rank row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/4 rounded-lg px-2.5 py-2">
                <p className="text-[8px] text-white/30 uppercase tracking-wider mb-0.5">KDA</p>
                <p className="text-sm font-bold text-white/90">{profile.recentAvgKda > 0 ? profile.recentAvgKda.toFixed(1) : "—"}</p>
              </div>
              <div className="bg-white/4 rounded-lg px-2.5 py-2">
                <p className="text-[8px] text-white/30 uppercase tracking-wider mb-0.5">Rank</p>
                <p className={cn("text-sm font-bold", RANK_COLORS[profile.rank ?? ""] ?? "text-white/25")}>
                  {rankLabel(profile.rank ?? "UNRANKED", profile.division ?? "", t("overlay.loading.unranked"))}
                </p>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, i) => (
                  <span key={i} className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-md border leading-none", TAG_COLORS[tag.color])}>
                    {tag.label}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
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
  const { t } = useLanguage();
  const [myChampion, setMyChampion] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [livePlayers, setLivePlayers] = useState<PlayerProfile[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);
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
            <span className="brand-wordmark text-[10px] font-black tracking-[0.25em] text-white/50 select-none">
              VELARIS
            </span>
            <span className="text-[10px] text-white/25 font-medium">{t("overlay.loading.title")}</span>

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
                  ? `${myStreak.count} ${t("profile.streaks.winsRow")}`
                  : `${myStreak.count} ${t("profile.streaks.lossesRow")}`}
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
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
            t={t}
            onSelect={setSelectedPlayer}
          />
          {/* Red team row */}
          <TeamRow
            players={redTeam}
            side="red"
            patchVersion={patchVersion ?? ""}
            myName={myName}
            t={t}
            onSelect={setSelectedPlayer}
          />
        </div>

        {/* ── Loading bar (indeterminate) ───────────────────────────────── */}
        <div className="relative z-10 h-px bg-white/8 shrink-0 overflow-hidden">
          <motion.div
            className="absolute h-full w-1/3 bg-white/25"
            animate={{ x: ["-33%", "400%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* ── Player detail panel (slide-in on card click) ─────────────── */}
      <AnimatePresence>
        {selectedPlayer && (
          <PlayerDetailPanel
            key={selectedPlayer.summonerName}
            profile={selectedPlayer}
            patchVersion={patchVersion ?? ""}
            onClose={() => setSelectedPlayer(null)}
            t={t}
          />
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
