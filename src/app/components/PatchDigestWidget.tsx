import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "./ui/utils";
import { fetchTierList, tierColor, type ChampionTierEntry, type TierRole } from "../services/tierListService";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePatchVersion } from "../hooks/usePatchVersion";
import type { MatchData } from "../utils/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatchDigestWidgetProps {
  matches: MatchData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, TierRole> = {
  TOP: "TOP", JUNGLE: "JUNGLE", MIDDLE: "MIDDLE", BOTTOM: "BOTTOM", UTILITY: "UTILITY",
};

function getTopChampions(matches: MatchData[], topN = 5): { name: string; role: TierRole; games: number }[] {
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
    .slice(0, topN)
    .map(e => ({ name: e.name, role: ROLE_MAP[e.role] ?? "MIDDLE", games: e.games }));
}

// ─── Champion row ─────────────────────────────────────────────────────────────

function ChampRow({
  name,
  role,
  games,
  entry,
  patch,
}: {
  name: string;
  role: TierRole;
  games: number;
  entry: ChampionTierEntry | null;
  patch: string;
}) {
  const ddragonName = name.replace(/[' ]/g, "").replace(/\./g, "");

  return (
    <div className="flex items-center gap-3">
      {/* Portrait */}
      <div className="relative shrink-0">
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${ddragonName}.png`}
          alt={name}
          loading="lazy"
          className="w-9 h-9 rounded-lg object-cover bg-muted"
          onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
        />
      </div>

      {/* Name + games */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground">{games} {games === 1 ? "game" : "games"} · {role === "MIDDLE" ? "MID" : role === "BOTTOM" ? "ADC" : role === "UTILITY" ? "SUP" : role === "JUNGLE" ? "JGL" : "TOP"}</p>
      </div>

      {/* Tier + WR */}
      {entry ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-[10px] font-black px-1.5 py-0.5 rounded border",
            tierColor(entry.tier),
          )}>
            {entry.tier}
          </span>
          <span className={cn(
            "text-[11px] font-mono font-semibold",
            entry.winRate >= 52 ? "text-emerald-400" :
            entry.winRate >= 50 ? "text-foreground" : "text-destructive/70",
          )}>
            {entry.winRate}%
          </span>
          {entry.winRate >= 52 ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : entry.winRate < 49 ? (
            <TrendingDown className="w-3 h-3 text-destructive/60" />
          ) : (
            <Minus className="w-3 h-3 text-muted-foreground/40" />
          )}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground/40">–</span>
      )}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function PatchDigestWidget({ matches }: PatchDigestWidgetProps) {
  const { version: patch, displayVersion } = usePatchVersion();
  const { data: tierData } = useAsyncData(() => fetchTierList(), []);

  const topChamps = useMemo(() => getTopChampions(matches, 5), [matches]);

  if (topChamps.length === 0) return null;

  const resolveEntry = (name: string, role: TierRole): ChampionTierEntry | null => {
    if (!tierData) return null;
    const roleEntries = tierData.byRole[role] ?? [];
    return roleEntries.find(e => e.name.toLowerCase() === name.toLowerCase()) ?? null;
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-[13px] font-semibold text-foreground">Your Pool · Patch {displayVersion}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">Meta standing for your most played</p>
        </div>
        {tierData && (
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            {tierData.patch}
          </span>
        )}
      </div>

      {/* Champion list */}
      <div className="flex flex-col gap-3">
        {topChamps.map(({ name, role, games }) => (
          <ChampRow
            key={`${name}:${role}`}
            name={name}
            role={role}
            games={games}
            entry={resolveEntry(name, role)}
            patch={patch}
          />
        ))}
      </div>

      {!tierData && (
        <p className="text-[10px] text-muted-foreground/40 text-center mt-3">
          Tier data loading…
        </p>
      )}
    </div>
  );
}
