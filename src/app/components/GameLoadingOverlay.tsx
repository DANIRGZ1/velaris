/**
 * GameLoadingOverlay — mostrado cuando la partida empieza a cargar.
 * Muestra estadísticas personalizadas: racha, rendimiento con el campeón,
 * sesión de hoy y un tip clave extraído del historial.
 * Se cierra automáticamente tras AUTO_CLOSE_S segundos o al hacer clic en ×.
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { X, TrendingUp, TrendingDown, Swords, Flame, Target, Lightbulb, Gamepad2 } from "lucide-react";
import { cn } from "./ui/utils";
import { getLiveGameData } from "../services/dataService";
import { usePatchVersion } from "../hooks/usePatchVersion";
import type { MatchData } from "../utils/analytics";

const AUTO_CLOSE_S = 28;

interface Props {
  matches: MatchData[];
  onClose: () => void;
}

// ─── stat helpers ─────────────────────────────────────────────────────────────

function computeStreak(matches: MatchData[]) {
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

function computeChampStats(champName: string, matches: MatchData[]) {
  const games = matches
    .filter(m => m.participants[m.playerParticipantIndex]?.championName === champName)
    .slice(0, 20);
  if (games.length < 3) return null;
  const wins = games.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
  const kdas = games.map(m => {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) return 0;
    return p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists;
  });
  const avgKDA = kdas.reduce((a, b) => a + b, 0) / kdas.length;
  return { games: games.length, winRate: Math.round((wins / games.length) * 100), avgKDA };
}

function computeTodaySession(matches: MatchData[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayGames = matches.filter(m => m.gameCreation >= today.getTime());
  if (todayGames.length === 0) return null;
  const wins = todayGames.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
  return { games: todayGames.length, wins, losses: todayGames.length - wins };
}

function pickInsight(matches: MatchData[], champName: string | null) {
  if (!matches.length) return null;
  const recent = matches.slice(0, 20);
  const champGames = champName
    ? recent.filter(m => m.participants[m.playerParticipantIndex]?.championName === champName)
    : [];

  // Check: high death rate
  const avgDeaths = recent.reduce((s, m) => s + (m.participants[m.playerParticipantIndex]?.deaths ?? 0), 0) / recent.length;
  if (avgDeaths > 5.5) return `Tu media de muertes reciente es alta (${avgDeaths.toFixed(1)}/partida). Prioriza jugar seguro en los primeros 15 min.`;

  // Check: CS is low
  const avgCSM = recent.reduce((s, m) => {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) return s;
    return s + (p.totalMinionsKilled + p.neutralMinionsKilled) / Math.max(1, m.gameDuration / 60);
  }, 0) / recent.length;
  if (avgCSM < 6) return `Tu CS/min medio está en ${avgCSM.toFixed(1)}. Intenta llegar a 7 antes de hacer el primer recall.`;

  // Check: champ-specific WR trend
  if (champGames.length >= 5) {
    const recent5 = champGames.slice(0, 5);
    const wins5 = recent5.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
    if (wins5 >= 4) return `¡Llevas un ${Math.round((wins5 / 5) * 100)}% de WR últimamente con ${champName}! Sigue con esa mentalidad.`;
    if (wins5 <= 1) return `Últimas 5 partidas con ${champName}: ${wins5}V. ¿Repasar una build alternativa podría ayudar?`;
  }

  // Check: win rate overall
  const wins = recent.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
  const wr = Math.round((wins / recent.length) * 100);
  if (wr >= 60) return `Tu WR en las últimas 20 partidas es ${wr}% — estás en buena racha. Confía en tu juego.`;
  if (wr <= 40) return `WR ${wr}% últimas 20 partidas. Céntrate en un solo rol o campeón para estabilizar.`;

  return null;
}

// ─── component ────────────────────────────────────────────────────────────────

export function GameLoadingOverlay({ matches, onClose }: Props) {
  const { version: patchVersion } = usePatchVersion();
  const [champion, setChampion] = useState<string | null>(null);
  const [champLoaded, setChampLoaded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_S);

  // Fetch current champion from Live Client API
  useEffect(() => {
    let cancelled = false;
    const attempt = async () => {
      for (let i = 0; i < 6; i++) {
        if (cancelled) return;
        try {
          const data = await getLiveGameData();
          if (data?.activePlayer?.summonerName) {
            const me = data.allPlayers.find(
              p => p.summonerName === data.activePlayer.summonerName
            );
            if (me?.championName) {
              if (!cancelled) { setChampion(me.championName); setChampLoaded(true); }
              return;
            }
          }
        } catch { /* not ready yet */ }
        await new Promise(r => setTimeout(r, 2000));
      }
      if (!cancelled) setChampLoaded(true); // give up, show without champion
    };
    attempt();
    return () => { cancelled = true; };
  }, []);

  // Countdown auto-close
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s: number) => {
        if (s <= 1) { clearInterval(id); onClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onClose]);

  const streak       = useMemo(() => computeStreak(matches), [matches]);
  const champStats   = useMemo(() => champion ? computeChampStats(champion, matches) : null, [champion, matches]);
  const todaySession = useMemo(() => computeTodaySession(matches), [matches]);
  const insight      = useMemo(() => pickInsight(matches, champion), [matches, champion]);

  const progress = ((AUTO_CLOSE_S - secondsLeft) / AUTO_CLOSE_S) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Champion splash strip (top) */}
        {champion && (
          <div className="relative h-28 overflow-hidden">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion}_0.jpg`}
              alt={champion}
              className="w-full h-full object-cover object-top opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/40 to-card" />
            <div className="absolute bottom-3 left-5 flex items-end gap-3">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${champion}.png`}
                alt={champion}
                className="w-12 h-12 rounded-xl border-2 border-primary/40 shadow-lg"
              />
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Partida cargando</div>
                <div className="text-lg font-bold text-foreground">{champion}</div>
              </div>
            </div>
          </div>
        )}

        {/* Header without splash (no champion yet) */}
        {!champion && (
          <div className="px-5 pt-5 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Partida cargando</div>
              <div className="text-sm text-muted-foreground">
                {champLoaded ? "Campeón no detectado" : "Detectando campeón..."}
              </div>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Stats */}
        <div className="px-5 py-4 flex flex-col gap-3">

          {/* Streak banner */}
          {streak.count >= 2 && streak.isWin !== null && (
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border",
              streak.isWin
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-destructive/10 border-destructive/25 text-destructive"
            )}>
              {streak.isWin
                ? <Flame className="w-5 h-5 shrink-0" />
                : <TrendingDown className="w-5 h-5 shrink-0" />}
              <span className="font-semibold text-sm">
                {streak.isWin
                  ? `🔥 Llevas ${streak.count} victorias seguidas — sigue así`
                  : `${streak.count} derrotas seguidas — mente fría, juega tu juego`}
              </span>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Champion stats */}
            {champStats && champion ? (
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-secondary/40 border border-border/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">
                  <Swords className="w-3 h-3" />
                  {champion}
                </div>
                <div className={cn(
                  "text-xl font-mono font-bold mt-0.5",
                  champStats.winRate >= 55 ? "text-emerald-400" :
                  champStats.winRate <= 45 ? "text-destructive" : "text-foreground"
                )}>
                  {champStats.winRate}% WR
                </div>
                <div className="text-xs text-muted-foreground/70">
                  {champStats.avgKDA.toFixed(1)} KDA · {champStats.games} partidas
                </div>
              </div>
            ) : champLoaded ? (
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-secondary/40 border border-border/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">
                  <Swords className="w-3 h-3" />
                  Campeón
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Sin datos suficientes
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-secondary/40 border border-border/30 animate-pulse">
                <div className="h-3 w-16 bg-secondary rounded mb-2" />
                <div className="h-6 w-20 bg-secondary rounded" />
              </div>
            )}

            {/* Today */}
            {todaySession ? (
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-secondary/40 border border-border/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">
                  <Target className="w-3 h-3" />
                  Hoy
                </div>
                <div className={cn(
                  "text-xl font-mono font-bold mt-0.5",
                  todaySession.wins > todaySession.losses ? "text-emerald-400" :
                  todaySession.wins < todaySession.losses ? "text-destructive" : "text-foreground"
                )}>
                  {todaySession.wins}W – {todaySession.losses}L
                </div>
                <div className="text-xs text-muted-foreground/70">
                  {todaySession.games} {todaySession.games === 1 ? "partida" : "partidas"}
                  {todaySession.wins - todaySession.losses !== 0 && (
                    <span className={cn("ml-1 font-semibold", todaySession.wins > todaySession.losses ? "text-emerald-400" : "text-destructive")}>
                      ({todaySession.wins - todaySession.losses > 0 ? "+" : ""}{todaySession.wins - todaySession.losses})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-secondary/40 border border-border/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold uppercase tracking-wide">
                  <Target className="w-3 h-3" />
                  Primera del día
                </div>
                <div className="text-sm text-foreground font-semibold mt-1">¡Buena suerte!</div>
              </div>
            )}
          </div>

          {/* Insight */}
          {insight && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
              <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
            </div>
          )}
        </div>

        {/* Countdown bar */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground/50 mb-1.5">
            <span>Cierra automáticamente</span>
            <span className="font-mono">{secondsLeft}s</span>
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary/60 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: "linear" }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
