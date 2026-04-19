/**
 * FirstRunReveal — Post-onboarding "here's your data" moment
 *
 * Shown once, right after the OnboardingWizard completes.
 * Fetches match history in the background and reveals the user's stats
 * with a dramatic animated entrance to make the first experience memorable.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, TrendingUp, Sword, Trophy } from "lucide-react";
import { cn } from "./ui/utils";
import { getMatchHistory, getSummonerInfo } from "../services/dataService";
import { useLanguage } from "../contexts/LanguageContext";
import { RANKED_QUEUE_IDS } from "../utils/analytics";

const REVEAL_KEY = "velaris-first-reveal-shown";

export function markRevealShown(): void {
  try { localStorage.setItem(REVEAL_KEY, "1"); } catch {}
}

export function needsReveal(): boolean {
  try { return !localStorage.getItem(REVEAL_KEY); } catch { return false; }
}

interface RevealStats {
  rank: string;
  winrate: number;
  games: number;
  topChamp: string;
  topChampWr: number;
}

interface Props {
  onComplete: () => void;
}

type Phase = "loading" | "reveal" | "done";

export function FirstRunReveal({ onComplete }: Props) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>("loading");
  const [gameCount, setGameCount] = useState(0);
  const [stats, setStats] = useState<RevealStats | null>(null);
  const [visibleStats, setVisibleStats] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [matches, summoner] = await Promise.all([
          getMatchHistory(),
          getSummonerInfo().catch(() => null),
        ]);

        if (cancelled) return;

        const ranked = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
        const pool   = ranked.length > 0 ? ranked : matches;

        // Animate count-up
        const total = pool.length;
        setGameCount(total);

        if (total === 0) {
          // No data — skip to done quickly
          setTimeout(() => { if (!cancelled) onComplete(); }, 2200);
          return;
        }

        // Compute quick stats
        const wins = pool.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
        const wr   = Math.round((wins / total) * 100);

        const champMap: Record<string, { games: number; wins: number }> = {};
        for (const m of pool) {
          const p = m.participants[m.playerParticipantIndex];
          if (!p?.championName) continue;
          if (!champMap[p.championName]) champMap[p.championName] = { games: 0, wins: 0 };
          champMap[p.championName].games++;
          if (p.win) champMap[p.championName].wins++;
        }
        const topEntry = Object.entries(champMap).sort((a, b) => b[1].games - a[1].games)[0];
        const topChamp = topEntry?.[0] ?? "—";
        const topWr    = topEntry ? Math.round((topEntry[1].wins / topEntry[1].games) * 100) : 0;

        const rank = summoner?.rank && summoner?.division
          ? `${summoner.rank} ${summoner.division}`
          : "—";

        setTimeout(() => {
          if (cancelled) return;
          setStats({ rank, winrate: wr, games: total, topChamp, topChampWr: topWr });
          setPhase("reveal");

          // Stagger stat cards appearing
          [1, 2, 3].forEach((n, i) => {
            setTimeout(() => {
              if (!cancelled) setVisibleStats(n);
            }, 300 + i * 200);
          });
        }, 1200);

      } catch {
        if (!cancelled) setTimeout(() => onComplete(), 1500);
      }
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    markRevealShown();
    setPhase("done");
    setTimeout(onComplete, 350);
  };

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9995] bg-background/96 backdrop-blur-md flex flex-col items-center justify-center p-8"
        >
          {/* Ambient glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

          {phase === "loading" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[18px] font-semibold text-foreground">{t("reveal.analyzing")}</p>
                {gameCount > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[13px] text-muted-foreground"
                  >
                    {t("reveal.games").replace("{count}", String(gameCount))}
                  </motion.p>
                )}
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary/50"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {phase === "reveal" && stats && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-8 w-full max-w-sm"
            >
              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-[11px] font-bold text-primary uppercase tracking-[0.14em] mb-2"
                >
                  {t("reveal.games").replace("{count}", String(stats.games))}
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-[26px] font-bold tracking-tight text-foreground"
                >
                  {t("reveal.title")}
                </motion.h2>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { label: t("reveal.rank"),    value: stats.rank,          icon: Trophy,    visible: visibleStats >= 1 },
                  { label: t("reveal.winrate"),  value: `${stats.winrate}%`, icon: TrendingUp, visible: visibleStats >= 2 },
                  { label: t("reveal.topChamp"), value: stats.topChamp,      icon: Sword,     visible: visibleStats >= 3 },
                ].map(({ label, value, icon: Icon, visible }, i) => (
                  <AnimatePresence key={i}>
                    {visible && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/60"
                      >
                        <Icon className="w-4 h-4 text-primary/60" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                        <span className="text-[16px] font-bold text-foreground text-center leading-tight">{value}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: visibleStats >= 3 ? 1 : 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleContinue}
                className={cn(
                  "px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px]",
                  "hover:bg-primary/90 transition-colors cursor-pointer shadow-lg shadow-primary/20",
                  visibleStats < 3 && "pointer-events-none"
                )}
              >
                {t("reveal.cta")}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
