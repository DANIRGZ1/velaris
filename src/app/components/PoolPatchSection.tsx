/**
 * PoolPatchSection — Personalised patch view inside the dropdown.
 * Shows the user's top 5 champions with their current Meraki tier/WR.
 * Rendered when the CommunityDragon champion-changes feed is unavailable.
 */
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "./ui/utils";
import { fetchTierList, tierColor, type ChampionTierEntry, type TierRole } from "../services/tierListService";
import { useAsyncData } from "../hooks/useAsyncData";
import { useLanguage } from "../contexts/LanguageContext";
import type { MatchData } from "../utils/analytics";

const ROLE_MAP: Record<string, TierRole> = {
  TOP: "TOP", JUNGLE: "JUNGLE", MIDDLE: "MIDDLE", BOTTOM: "BOTTOM", UTILITY: "UTILITY",
};
const ROLE_SHORT: Record<TierRole, string> = {
  TOP: "TOP", JUNGLE: "JGL", MIDDLE: "MID", BOTTOM: "ADC", UTILITY: "SUP",
};

function getTopChampions(matches: MatchData[], n = 5) {
  const map: Record<string, { name: string; role: string; games: number }> = {};
  for (const m of matches) {
    const p = m.participants[m.playerParticipantIndex];
    if (!p?.championName) continue;
    const key = `${p.championName}:${p.teamPosition}`;
    if (!map[key]) map[key] = { name: p.championName, role: p.teamPosition, games: 0 };
    map[key].games++;
  }
  return Object.values(map)
    .sort((a, b) => b.games - a.games)
    .slice(0, n)
    .map(e => ({ name: e.name, role: ROLE_MAP[e.role] ?? "MIDDLE" as TierRole, games: e.games }));
}

interface Props {
  matches: MatchData[];
  patchVersion: string;
}

export function PoolPatchSection({ matches, patchVersion }: Props) {
  const { t } = useLanguage();
  const { data: tierData, isLoading } = useAsyncData(() => fetchTierList(), []);
  const top = useMemo(() => getTopChampions(matches, 5), [matches]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground/50">
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px]">{t("common.loading")}</span>
      </div>
    );
  }

  if (top.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground/50 text-center py-6">
        Juega partidas para ver tu pool personalizado.
      </p>
    );
  }

  const resolve = (name: string, role: TierRole): ChampionTierEntry | null => {
    if (!tierData) return null;
    return (tierData.byRole[role] ?? []).find(e => e.name.toLowerCase() === name.toLowerCase()) ?? null;
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Section label */}
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 px-1 pb-1">
        {t("pool.thisPatche")}
      </p>

      {top.map(({ name, role, games }) => {
        const entry = resolve(name, role);
        const ddragonName = name.replace(/[' ]/g, "").replace(/\./g, "");

        return (
          <div key={`${name}:${role}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
            {/* Portrait */}
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${ddragonName}.png`}
              alt={name}
              loading="lazy"
              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border/40 bg-muted"
              onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />

            {/* Name + role + games */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground truncate">{name}</p>
              <p className="text-[10px] text-muted-foreground/60">
                {ROLE_SHORT[role]} · {games} {games === 1 ? t("common.game") : t("common.games")}
              </p>
            </div>

            {/* Tier + WR */}
            {entry ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border", tierColor(entry.tier))}>
                  {entry.tier}
                </span>
                <span className={cn(
                  "text-[11px] font-mono font-semibold",
                  entry.winRate >= 52 ? "text-emerald-400" :
                  entry.winRate >= 50 ? "text-foreground" : "text-destructive/70",
                )}>
                  {entry.winRate}%
                </span>
                {entry.winRate >= 52
                  ? <TrendingUp className="w-3 h-3 text-emerald-400" />
                  : entry.winRate < 49
                  ? <TrendingDown className="w-3 h-3 text-destructive/60" />
                  : <Minus className="w-3 h-3 text-muted-foreground/40" />}
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/30">–</span>
            )}
          </div>
        );
      })}

      {tierData && (
        <p className="text-[9px] text-muted-foreground/30 text-right pt-1 font-mono">
          datos: {tierData.patch}
        </p>
      )}
    </div>
  );
}
