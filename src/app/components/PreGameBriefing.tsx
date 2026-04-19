/**
 * PreGameBriefing — Slide-in card in ChampSelect when your champion is picked.
 *
 * Shows:
 *  - Last 5 ranked games with that champion (W/L + KDA)
 *  - Win rate vs the enemy in your lane
 *  - A quick matchup tip
 */
import { motion, AnimatePresence } from "motion/react";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Swords, Lightbulb, ChevronRight } from "lucide-react";
import { cn } from "./ui/utils";
import type { MatchData } from "../utils/analytics";
import { getMatchupTip } from "../utils/matchups";
import { useLanguage } from "../contexts/LanguageContext";

interface Props {
  champName: string;
  role: string;
  enemyChamp?: string;
  matches: MatchData[];
}

export function PreGameBriefing({ champName, role, enemyChamp, matches }: Props) {
  const { t } = useLanguage();
  const show = !!champName && champName !== "???" && champName !== "Unknown";

  // Last 5 games with this champion
  const champGames = useMemo(() => {
    if (!matches.length) return [];
    return matches
      .filter(m => {
        const me = m.participants[m.playerParticipantIndex];
        return me?.championName === champName;
      })
      .slice(0, 5);
  }, [matches, champName]);

  // Win rate with this champion
  const champWr = useMemo(() => {
    if (!champGames.length) return null;
    const wins = champGames.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
    return Math.round((wins / champGames.length) * 100);
  }, [champGames]);

  // Win rate vs enemy champ (all matches)
  const vsEnemyWr = useMemo(() => {
    if (!enemyChamp || !matches.length) return null;
    const vsGames = matches.filter(m => {
      const me = m.participants[m.playerParticipantIndex];
      if (!me) return false;
      return m.participants.some((p, i) => i !== m.playerParticipantIndex && p.teamId !== me.teamId && p.championName === enemyChamp);
    });
    if (vsGames.length < 2) return null;
    const wins = vsGames.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
    return { wr: Math.round((wins / vsGames.length) * 100), games: vsGames.length };
  }, [matches, enemyChamp]);

  const matchupTip = useMemo(() => {
    if (!enemyChamp || enemyChamp === "Unknown") return null;
    return getMatchupTip(champName, enemyChamp);
  }, [champName, enemyChamp]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden mb-6"
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Swords className="w-4 h-4 text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">
                {t("pregame.briefing").replace("{champ}", champName)}
              </span>
              {role && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 uppercase tracking-wider">
                  {role}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Last games */}
              <div className="col-span-2 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("pregame.lastGames").replace("{count}", String(champGames.length > 0 ? champGames.length : "—")).replace("{champ}", champName)}
                </span>
                {champGames.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {champGames.map((m, i) => {
                      const me = m.participants[m.playerParticipantIndex];
                      const win = me?.win ?? false;
                      const kda = `${me?.kills ?? 0}/${me?.deaths ?? 0}/${me?.assists ?? 0}`;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex flex-col items-center px-2 py-1.5 rounded-lg border text-center",
                            win ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
                          )}
                          title={kda}
                        >
                          <span className={cn("text-[10px] font-bold uppercase", win ? "text-emerald-500" : "text-red-400")}>
                            {win ? "V" : "D"}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono mt-0.5">{kda}</span>
                        </div>
                      );
                    })}
                    {champGames.length > 0 && champWr !== null && (
                      <span className={cn(
                        "text-[12px] font-bold ml-1",
                        champWr >= 55 ? "text-emerald-500" : champWr >= 45 ? "text-amber-500" : "text-red-400"
                      )}>
                        {champWr}% WR
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[12px] text-muted-foreground">{t("pregame.noGames").replace("{champ}", champName)}</span>
                )}
              </div>

              {/* vs Enemy */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {enemyChamp ? t("pregame.vs").replace("{enemy}", enemyChamp) : "vs —"}
                </span>
                {vsEnemyWr ? (
                  <div className="flex items-center gap-1.5">
                    {vsEnemyWr.wr >= 50
                      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    }
                    <span className={cn(
                      "text-[14px] font-mono font-bold",
                      vsEnemyWr.wr >= 55 ? "text-emerald-500" : vsEnemyWr.wr >= 45 ? "text-amber-500" : "text-red-400"
                    )}>
                      {vsEnemyWr.wr}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">({vsEnemyWr.games}p)</span>
                  </div>
                ) : (
                  <span className="text-[12px] text-muted-foreground">{t("pregame.noData")}</span>
                )}
              </div>
            </div>

            {/* Matchup tip */}
            {matchupTip && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-card border border-border/40">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-muted-foreground leading-relaxed">{matchupTip}</p>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 mt-0.5" />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
