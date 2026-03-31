import { Swords } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { usePatchVersion } from "../hooks/usePatchVersion";
import type { MatchParticipant } from "../utils/analytics";

interface LaneComparisonProps {
  player: MatchParticipant;
  opponent: MatchParticipant;
  gameDuration: number;
}

interface StatRow {
  label: string;
  playerVal: number;
  opponentVal: number;
  format: (v: number) => string;
  higherIsBetter?: boolean;
}

export function LaneComparison({ player, opponent, gameDuration }: LaneComparisonProps) {
  const { t } = useLanguage();
  const { version: patchVersion } = usePatchVersion();
  const durationMin = gameDuration / 60;

  const playerCS = player.totalMinionsKilled + player.neutralMinionsKilled;
  const opponentCS = opponent.totalMinionsKilled + opponent.neutralMinionsKilled;
  const playerCSM = parseFloat((playerCS / durationMin).toFixed(1));
  const opponentCSM = parseFloat((opponentCS / durationMin).toFixed(1));
  const playerKDA = player.deaths > 0 ? (player.kills + player.assists) / player.deaths : player.kills + player.assists;
  const opponentKDA = opponent.deaths > 0 ? (opponent.kills + opponent.assists) / opponent.deaths : opponent.kills + opponent.assists;

  const stats: StatRow[] = [
    {
      label: "KDA",
      playerVal: playerKDA,
      opponentVal: opponentKDA,
      format: (v) => v.toFixed(1),
      higherIsBetter: true,
    },
    {
      label: "CS",
      playerVal: playerCS,
      opponentVal: opponentCS,
      format: (v) => `${v} (${(v / durationMin).toFixed(1)}/m)`,
      higherIsBetter: true,
    },
    {
      label: t("postgame.gold"),
      playerVal: player.goldEarned,
      opponentVal: opponent.goldEarned,
      format: (v) => `${(v / 1000).toFixed(1)}k`,
      higherIsBetter: true,
    },
    {
      label: t("postgame.dmg"),
      playerVal: player.totalDamageDealtToChampions,
      opponentVal: opponent.totalDamageDealtToChampions,
      format: (v) => `${(v / 1000).toFixed(1)}k`,
      higherIsBetter: true,
    },
    {
      label: t("postgame.vision"),
      playerVal: player.visionScore,
      opponentVal: opponent.visionScore,
      format: (v) => String(v),
      higherIsBetter: true,
    },
  ];

  const roleLabel = (pos: string) => {
    switch (pos) {
      case "BOTTOM": return "ADC";
      case "MIDDLE": return "MID";
      case "JUNGLE": return "JGL";
      case "UTILITY": return "SUP";
      default: return pos;
    }
  };

  return (
    <div className="bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <Swords className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {t("postgame.laneMatchup")}
        </h3>
      </div>

      {/* Champion portraits */}
      <div className="flex items-center justify-between">
        {/* Player */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0",
            player.win ? "border-emerald-500/50" : "border-destructive/50"
          )}>
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${player.championName}.png`}
              alt={player.championName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-foreground">{player.championName}</span>
            <span className="text-[11px] text-muted-foreground">
              {player.kills}/{player.deaths}/{player.assists}
            </span>
          </div>
        </div>

        {/* VS badge */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            {roleLabel(player.teamPosition)}
          </span>
          <span className="text-[16px] font-bold text-muted-foreground/30">VS</span>
        </div>

        {/* Opponent */}
        <div className="flex items-center gap-3 flex-row-reverse">
          <div className={cn(
            "w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0",
            opponent.win ? "border-emerald-500/50" : "border-destructive/50"
          )}>
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${opponent.championName}.png`}
              alt={opponent.championName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[13px] font-semibold text-foreground">{opponent.championName}</span>
            <span className="text-[11px] text-muted-foreground">
              {opponent.kills}/{opponent.deaths}/{opponent.assists}
            </span>
          </div>
        </div>
      </div>

      {/* Stat comparison bars */}
      <div className="flex flex-col gap-3 mt-1">
        {stats.map((stat) => {
          const total = stat.playerVal + stat.opponentVal;
          const playerPct = total > 0 ? (stat.playerVal / total) * 100 : 50;
          const opponentPct = 100 - playerPct;
          const playerWins = stat.higherIsBetter
            ? stat.playerVal > stat.opponentVal
            : stat.playerVal < stat.opponentVal;
          const opponentWins = stat.higherIsBetter
            ? stat.opponentVal > stat.playerVal
            : stat.opponentVal < stat.playerVal;
          const tied = stat.playerVal === stat.opponentVal;

          return (
            <div key={stat.label} className="flex flex-col gap-1">
              {/* Label row */}
              <div className="flex items-center justify-between text-[11px]">
                <span className={cn(
                  "font-mono tabular-nums",
                  playerWins ? "text-primary font-semibold" : tied ? "text-muted-foreground" : "text-muted-foreground"
                )}>
                  {stat.format(stat.playerVal)}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                  {stat.label}
                </span>
                <span className={cn(
                  "font-mono tabular-nums",
                  opponentWins ? "text-destructive font-semibold" : tied ? "text-muted-foreground" : "text-muted-foreground"
                )}>
                  {stat.format(stat.opponentVal)}
                </span>
              </div>
              {/* Bar */}
              <div className="flex gap-0.5 h-1.5">
                <div
                  className={cn(
                    "rounded-l-full transition-all duration-700",
                    playerWins ? "bg-primary" : tied ? "bg-muted-foreground/30" : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${playerPct}%` }}
                />
                <div
                  className={cn(
                    "rounded-r-full transition-all duration-700",
                    opponentWins ? "bg-destructive" : tied ? "bg-muted-foreground/30" : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${opponentPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {(() => {
        const winsCount = stats.filter(s => s.higherIsBetter ? s.playerVal > s.opponentVal : s.playerVal < s.opponentVal).length;
        const totalStats = stats.length;
        const goldDiff = player.goldEarned - opponent.goldEarned;
        const csDiff = playerCS - opponentCS;

        return (
          <div className="mt-1 p-3 rounded-xl bg-secondary/40 border border-border/30">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {winsCount >= 3 ? (
                <span>
                  {t("postgame.laneWon")} 
                  <strong className="text-primary ml-1">
                    {goldDiff > 0 ? `+${(goldDiff/1000).toFixed(1)}k gold` : ""} 
                    {csDiff > 0 ? ` +${csDiff} CS` : ""}
                  </strong>
                </span>
              ) : winsCount <= 2 ? (
                <span>
                  {t("postgame.laneLost")}
                  <strong className="text-destructive ml-1">
                    {goldDiff < 0 ? `${(goldDiff/1000).toFixed(1)}k gold` : ""}
                    {csDiff < 0 ? ` ${csDiff} CS` : ""}
                  </strong>
                </span>
              ) : (
                <span>{t("postgame.laneEven")}</span>
              )}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
