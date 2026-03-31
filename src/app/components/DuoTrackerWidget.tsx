import { useMemo } from "react";
import { Users } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import type { MatchData } from "../utils/analytics";

interface DuoStat {
  name: string;
  games: number;
  wins: number;
}

interface Props {
  matches: MatchData[];
}

export function DuoTrackerWidget({ matches }: Props) {
  const { t } = useLanguage();

  const duos = useMemo((): DuoStat[] => {
    const map: Record<string, { games: number; wins: number }> = {};

    for (const m of matches) {
      const playerIdx = m.playerParticipantIndex;
      const playerTeamId = m.participants[playerIdx]?.teamId;
      const isWin = m.participants[playerIdx]?.win;

      for (let i = 0; i < m.participants.length; i++) {
        if (i === playerIdx) continue;
        const p = m.participants[i];
        // Only count teammates (same team)
        if (playerTeamId !== undefined && p.teamId !== undefined && p.teamId !== playerTeamId) continue;
        if (!p.summonerName || p.summonerName.startsWith("Player")) continue;

        if (!map[p.summonerName]) map[p.summonerName] = { games: 0, wins: 0 };
        map[p.summonerName].games++;
        if (isWin) map[p.summonerName].wins++;
      }
    }

    return Object.entries(map)
      .map(([name, s]) => ({ name, ...s }))
      .filter(d => d.games >= 2)
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);
  }, [matches]);

  if (duos.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 card-lift card-shine">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-[13px] font-semibold text-foreground">{t("duotracker.title") || "Frequent Teammates"}</h3>
        <span className="text-[10px] text-muted-foreground/50 font-mono ml-auto">{t("duotracker.subtitle") || "Recurring duos"}</span>
      </div>

      <div className="flex flex-col gap-2">
        {duos.map(duo => {
          const wr = Math.round((duo.wins / duo.games) * 100);
          return (
            <div key={duo.name} className="flex items-center gap-3">
              {/* Avatar placeholder */}
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{duo.name[0]}</span>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[12px] font-medium text-foreground truncate">{duo.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {/* WR bar */}
                  <div className="flex-1 h-1 rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", wr >= 50 ? "bg-emerald-500" : "bg-destructive")}
                      style={{ width: `${wr}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className={cn("text-[13px] font-mono font-bold", wr >= 55 ? "text-emerald-500" : wr >= 45 ? "text-foreground" : "text-destructive")}>
                  {wr}%
                </span>
                <span className="text-[10px] text-muted-foreground/50 font-mono">{duo.games}g</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
