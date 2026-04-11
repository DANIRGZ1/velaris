/**
 * GameLoadingOverlay — pantalla de carga al estilo Blitz/PoroFessor.
 * Ocupa toda la ventana con el splash art del campeón y muestra:
 *   · Racha actual (victorias o derrotas consecutivas)
 *   · Puntos fuertes personales detectados del historial
 *   · Mini-stats: WR con ese campeón, sesión de hoy
 * Se cierra automáticamente tras AUTO_CLOSE_S segundos o al pulsar ×.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Flame, Shield, Sword, Eye, Zap, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "./ui/utils";
import { getLiveGameData } from "../services/dataService";
import { usePatchVersion } from "../hooks/usePatchVersion";
import type { MatchData } from "../utils/analytics";

const AUTO_CLOSE_S = 35;

interface Props {
  matches: MatchData[];
  onClose: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getStreak(matches: MatchData[]) {
  if (!matches.length) return { count: 0, isWin: null as boolean | null };
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  const first = sorted[0].participants[sorted[0].playerParticipantIndex];
  if (!first) return { count: 0, isWin: null };
  const isWin = first.win;
  let count = 0;
  for (const m of sorted) {
    const p = m.participants[m.playerParticipantIndex];
    if (p?.win === isWin) count++;
    else break;
  }
  return { count, isWin };
}

interface Strength {
  label: string;
  icon: typeof Flame;
  color: string;   // tailwind color token
}

function computeStrengths(matches: MatchData[], champName: string | null): Strength[] {
  if (matches.length < 5) return [];
  const recent = matches.slice(0, 20);
  const out: Strength[] = [];

  // ── CS/min ──────────────────────────────────────────────────────────────
  const avgCSM = recent.reduce((s, m) => {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) return s;
    return s + (p.totalMinionsKilled + p.neutralMinionsKilled) / Math.max(1, m.gameDuration / 60);
  }, 0) / recent.length;
  if (avgCSM >= 7.5) out.push({ label: `Gran farmer (${avgCSM.toFixed(1)} CS/min)`, icon: Star, color: "yellow" });

  // ── Deaths ──────────────────────────────────────────────────────────────
  const avgDeaths = recent.reduce((s, m) => s + (m.participants[m.playerParticipantIndex]?.deaths ?? 0), 0) / recent.length;
  if (avgDeaths <= 3.2) out.push({ label: "Juego limpio — pocas muertes", icon: Shield, color: "blue" });

  // ── Vision ──────────────────────────────────────────────────────────────
  const avgVision = recent.reduce((s, m) => {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) return s;
    return s + p.visionScore / Math.max(1, m.gameDuration / 60);
  }, 0) / recent.length;
  if (avgVision >= 1.1) out.push({ label: `Control de visión (${avgVision.toFixed(1)}/min)`, icon: Eye, color: "purple" });

  // ── KDA ─────────────────────────────────────────────────────────────────
  const avgKDA = recent.reduce((s, m) => {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) return s;
    return s + (p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists);
  }, 0) / recent.length;
  if (avgKDA >= 4) out.push({ label: `KDA alto (${avgKDA.toFixed(1)})`, icon: Zap, color: "orange" });

  // ── Champion expertise ───────────────────────────────────────────────────
  if (champName) {
    const cg = matches.filter(m => m.participants[m.playerParticipantIndex]?.championName === champName).slice(0, 15);
    if (cg.length >= 5) {
      const cWins = cg.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
      const cWR = Math.round((cWins / cg.length) * 100);
      if (cWR >= 58) out.push({ label: `${cWR}% WR con ${champName} (${cg.length}p)`, icon: Sword, color: "emerald" });
    }
  }

  // ── Overall WR ───────────────────────────────────────────────────────────
  const wins = recent.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
  const wr = Math.round((wins / recent.length) * 100);
  if (wr >= 58 && !out.some(s => s.icon === Sword))
    out.push({ label: `${wr}% WR últimas ${recent.length} partidas`, icon: TrendingUp, color: "emerald" });

  return out.slice(0, 4);
}

function computeWeaknesses(matches: MatchData[]): string | null {
  if (matches.length < 5) return null;
  const recent = matches.slice(0, 20);

  const avgDeaths = recent.reduce((s, m) => s + (m.participants[m.playerParticipantIndex]?.deaths ?? 0), 0) / recent.length;
  if (avgDeaths > 5.5) return `Media de ${avgDeaths.toFixed(1)} muertes — intenta jugar más seguro`;

  const avgCSM = recent.reduce((s, m) => {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) return s;
    return s + (p.totalMinionsKilled + p.neutralMinionsKilled) / Math.max(1, m.gameDuration / 60);
  }, 0) / recent.length;
  if (avgCSM < 6) return `CS/min en ${avgCSM.toFixed(1)} — céntrate en farmear en los primeros 10 min`;

  const wins = recent.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
  if (wins / recent.length < 0.40) return `WR reciente bajo — prueba a simplificar el pool`;

  return null;
}

function computeToday(matches: MatchData[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tg = matches.filter(m => m.gameCreation >= today.getTime());
  if (!tg.length) return null;
  const wins = tg.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
  return { games: tg.length, wins, losses: tg.length - wins };
}

const COLOR: Record<string, string> = {
  yellow:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/25",
  blue:    "text-blue-400 bg-blue-400/10 border-blue-400/25",
  purple:  "text-purple-400 bg-purple-400/10 border-purple-400/25",
  orange:  "text-orange-400 bg-orange-400/10 border-orange-400/25",
  emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
};

// ─── component ────────────────────────────────────────────────────────────────

export function GameLoadingOverlay({ matches, onClose }: Props) {
  const { version: patchVersion } = usePatchVersion();
  const [champion, setChampion] = useState<string | null>(null);
  const [allies, setAllies]     = useState<string[]>([]);
  const [champLoaded, setChampLoaded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_S);

  // Fetch live game data — retry until Live Client API responds
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 8; i++) {
        if (cancelled) return;
        try {
          const data = await getLiveGameData();
          if (data?.activePlayer?.summonerName) {
            const myName = data.activePlayer.summonerName;
            const me = data.allPlayers.find(p => p.summonerName === myName);
            if (me?.championName) {
              const team = data.allPlayers
                .filter(p => p.team === me.team && p.summonerName !== myName)
                .map(p => p.championName)
                .filter(Boolean);
              if (!cancelled) {
                setChampion(me.championName);
                setAllies(team);
                setChampLoaded(true);
              }
              return;
            }
          }
        } catch { /* live client not ready yet */ }
        await new Promise(r => setTimeout(r, 2500));
      }
      if (!cancelled) setChampLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Countdown auto-close
  const handleClose = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s: number) => {
        if (s <= 1) { clearInterval(id); handleClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [handleClose]);

  const streak    = useMemo(() => getStreak(matches), [matches]);
  const strengths = useMemo(() => computeStrengths(matches, champion), [matches, champion]);
  const weakness  = useMemo(() => computeWeaknesses(matches), [matches]);
  const today     = useMemo(() => computeToday(matches), [matches]);

  const progress = ((AUTO_CLOSE_S - secondsLeft) / AUTO_CLOSE_S) * 100;

  const splashUrl = champion
    ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion}_0.jpg`
    : null;

  return (
    <AnimatePresence>
      <motion.div
        key="game-loading"
        className="fixed inset-0 z-[300] flex flex-col overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* ── Background splash art ─────────────────────────────────── */}
        <div className="absolute inset-0">
          {splashUrl ? (
            <motion.img
              key={splashUrl}
              src={splashUrl}
              alt={champion ?? ""}
              className="w-full h-full object-cover object-top"
              initial={{ scale: 1.06, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          ) : (
            <div className="w-full h-full bg-background" />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
        </div>

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          <span className="brand-wordmark text-xs font-bold tracking-[0.22em] text-foreground/60 select-none">
            VELARIS
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground/50">{secondsLeft}s</span>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-6 gap-5">

          {/* Champion name + allies row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-1">
                Partida cargando
              </p>
              <h1 className={cn(
                "text-4xl font-black tracking-tight text-foreground drop-shadow-lg",
                !champLoaded && "opacity-30 animate-pulse"
              )}>
                {champion ?? (champLoaded ? "—" : "···")}
              </h1>
            </div>

            {/* Allied champion icons */}
            {allies.length > 0 && (
              <div className="flex items-center gap-1.5 pb-1">
                {allies.slice(0, 4).map((ally: string) => (
                  <div key={ally} className="relative group">
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${ally}.png`}
                      alt={ally}
                      className="w-9 h-9 rounded-lg border border-white/20 shadow-lg opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {ally}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Streak banner ───────────────────────────────────────── */}
          {streak.count >= 2 && streak.isWin !== null && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "inline-flex items-center gap-3 self-start px-5 py-3 rounded-2xl border backdrop-blur-sm",
                streak.isWin
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/15 border-red-500/30 text-red-300"
              )}
            >
              {streak.isWin
                ? <Flame className="w-5 h-5 shrink-0 text-orange-400" />
                : <TrendingDown className="w-5 h-5 shrink-0" />}
              <span className="text-base font-bold drop-shadow">
                {streak.isWin
                  ? `${streak.count} victorias seguidas 🔥`
                  : `${streak.count} derrotas seguidas — mente fría`}
              </span>
            </motion.div>
          )}

          {/* ── Puntos fuertes ──────────────────────────────────────── */}
          {strengths.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="flex flex-col gap-2"
            >
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                Tus puntos fuertes
              </p>
              <div className="flex flex-wrap gap-2">
                {strengths.map((s: Strength, i: number) => {
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.3 }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold backdrop-blur-sm",
                        COLOR[s.color]
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {s.label}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Weakness tip ────────────────────────────────────────── */}
          {weakness && strengths.length < 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 text-xs text-muted-foreground/70"
            >
              <span className="text-amber-400">⚠</span>
              {weakness}
            </motion.div>
          )}

          {/* ── Stats row ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="flex items-center gap-4 text-sm"
          >
            {/* Champion WR */}
            {champion && (() => {
              const cg = matches.filter(m => m.participants[m.playerParticipantIndex]?.championName === champion).slice(0, 15);
              if (cg.length < 3) return null;
              const cWins = cg.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
              const cWR = Math.round((cWins / cg.length) * 100);
              return (
                <div className="flex items-center gap-1.5">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${champion}.png`}
                    alt={champion}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-muted-foreground/60">Con {champion}:</span>
                  <span className={cn(
                    "font-bold font-mono",
                    cWR >= 55 ? "text-emerald-400" : cWR <= 45 ? "text-red-400" : "text-foreground"
                  )}>{cWR}% WR</span>
                  <span className="text-muted-foreground/40 text-xs">({cg.length}p)</span>
                </div>
              );
            })()}

            {/* Separator */}
            {champion && today && <span className="text-muted-foreground/20">·</span>}

            {/* Today */}
            {today && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/60">Hoy:</span>
                <span className="font-bold font-mono text-foreground">
                  {today.wins}V {today.losses}D
                </span>
                {today.wins - today.losses !== 0 && (
                  <span className={cn(
                    "text-xs font-bold",
                    today.wins > today.losses ? "text-emerald-400" : "text-red-400"
                  )}>
                    ({today.wins > today.losses ? "+" : ""}{today.wins - today.losses})
                  </span>
                )}
              </div>
            )}
          </motion.div>

          {/* ── Countdown bar ───────────────────────────────────────── */}
          <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white/30 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: "linear" }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
