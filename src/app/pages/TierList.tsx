import { useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, AlertCircle, TrendingUp, Flame } from "lucide-react";
import { cn } from "../components/ui/utils";
import {
  fetchTierList,
  TierListData,
  TierRole,
  Tier,
  tierColor,
  ROLE_LABELS,
} from "../services/tierListService";
import { useAsyncData } from "../hooks/useAsyncData";
import { useLanguage } from "../contexts/LanguageContext";
import { usePatchVersion } from "../hooks/usePatchVersion";

// ─── Champion portrait ────────────────────────────────────────────────────────

function ChampPortrait({ name, patch }: { name: string; patch: string }) {
  // DDragon names have no spaces: "Miss Fortune" → "MissFortune"
  const ddragonName = name.replace(/[' ]/g, "").replace(/\./g, "");
  return (
    <img
      src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${ddragonName}.png`}
      alt={name}
      loading="lazy"
      className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0"
      onError={e => { (e.target as HTMLImageElement).style.opacity = "0.4"; }}
    />
  );
}

// ─── Tier section ─────────────────────────────────────────────────────────────

const TIER_LABEL: Record<Tier, string> = {
  "S+": "S+", S: "S", A: "A", B: "B", C: "C", D: "D",
};

function TierSection({
  tier,
  entries,
  patch,
}: {
  tier: Tier;
  entries: { name: string; winRate: number; playRate: number; banRate: number }[];
  patch: string;
}) {
  const color = tierColor(tier);
  if (entries.length === 0) return null;
  return (
    <div className="flex gap-4">
      {/* Tier label column */}
      <div className="w-10 shrink-0 flex items-start justify-center pt-2">
        <span className={cn(
          "text-[13px] font-black w-9 h-9 flex items-center justify-center rounded-lg border",
          color,
        )}>
          {TIER_LABEL[tier]}
        </span>
      </div>

      {/* Champions grid */}
      <div className="flex flex-wrap gap-2 flex-1">
        {entries.map(entry => (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="relative">
              <ChampPortrait name={entry.name} patch={patch} />
              {entry.banRate >= 10 && (
                <span className="absolute -top-1 -right-1 text-[9px] text-red-400">
                  <Flame className="w-3 h-3" />
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[44px] truncate">
              {entry.name.split(" ")[0]}
            </span>
            {/* Tooltip on hover */}
            <div className="hidden group-hover:flex absolute z-20 -translate-y-16 flex-col gap-0.5 bg-popover border border-border rounded-lg px-2.5 py-2 shadow-lg text-[11px] font-mono whitespace-nowrap">
              <span className="font-semibold text-foreground">{entry.name}</span>
              <span className="text-emerald-400">{entry.winRate}% WR</span>
              <span className="text-muted-foreground">{entry.playRate}% PR</span>
              {entry.banRate > 0 && <span className="text-red-400">{entry.banRate}% BAN</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Role tab ─────────────────────────────────────────────────────────────────

const ROLE_ICONS: Record<TierRole, string> = {
  TOP: "⚔️", JUNGLE: "🌲", MIDDLE: "⚡", BOTTOM: "🏹", UTILITY: "🛡️",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const TIERS: Tier[] = ["S+", "S", "A", "B", "C", "D"];
const ROLES: TierRole[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

export function TierList() {
  const { t } = useLanguage();
  const { version: patch, displayVersion } = usePatchVersion();
  const [activeRole, setActiveRole] = useState<TierRole>("MIDDLE");
  const [forceRefresh, setForceRefresh] = useState(0);

  const { data, isLoading, error, refetch, isRefetching } = useAsyncData<TierListData>(
    () => fetchTierList(forceRefresh > 0),
    [forceRefresh],
  );

  const handleRefresh = () => {
    setForceRefresh(n => n + 1);
    refetch();
  };

  const roleEntries = data?.byRole[activeRole] ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full flex flex-col gap-6 pb-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t("tierlist.title") || "Tier List"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data
              ? (t("tierlist.patchLabel") || "Patch {patch}").replace("{patch}", data.patch)
              : `Patch ${displayVersion}`}
            {" · "}
            {t("tierlist.source") || "via Meraki Analytics"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", (isLoading || isRefetching) && "animate-spin")} />
          {t("common.refresh") || "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {t("tierlist.fetchError") || "Could not load tier list. Check your internet connection."}
        </div>
      )}

      {/* Role selector */}
      <div className="flex gap-1.5 p-1 bg-secondary/50 rounded-xl border border-border/40 w-fit">
        {ROLES.map(role => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer",
              activeRole === role
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            <span>{ROLE_ICONS[role]}</span>
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {/* Tier list body */}
      {isLoading && !data ? (
        <div className="flex flex-col gap-3">
          {TIERS.map(tier => (
            <div key={tier} className="flex gap-4 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-muted/40 shrink-0" />
              <div className="flex gap-2 flex-wrap">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-10 h-14 rounded-lg bg-muted/40" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-b border-border pb-4">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t("tierlist.legend") || "Hover champions for WR / play rate"}</span>
            <span className="flex items-center gap-1 ml-2">
              <Flame className="w-3 h-3 text-red-400" />
              {t("tierlist.highBan") || "High ban rate (≥10%)"}
            </span>
          </div>

          {/* Tiers */}
          {TIERS.map(tier => {
            const entries = roleEntries.filter(e => e.tier === tier);
            return (
              <TierSection
                key={tier}
                tier={tier}
                entries={entries}
                patch={patch}
              />
            );
          })}

          {roleEntries.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("tierlist.noData") || "No data available for this role."}
            </p>
          )}
        </div>
      )}

      {/* Stats table */}
      {data && roleEntries.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              {t("tierlist.statsTable") || "Full Stats — "}{ROLE_LABELS[activeRole]}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">{t("tierlist.col.champ") || "Champion"}</th>
                  <th className="text-center px-3 py-2 font-medium">Tier</th>
                  <th className="text-right px-3 py-2 font-medium">WR %</th>
                  <th className="text-right px-3 py-2 font-medium">PR %</th>
                  <th className="text-right px-4 py-2 font-medium">Ban %</th>
                </tr>
              </thead>
              <tbody>
                {roleEntries.slice(0, 30).map((entry, i) => (
                  <tr
                    key={entry.name}
                    className={cn(
                      "border-b border-border/40 hover:bg-secondary/30 transition-colors",
                      i % 2 === 0 ? "" : "bg-secondary/10",
                    )}
                  >
                    <td className="px-4 py-2 flex items-center gap-2.5">
                      <ChampPortrait name={entry.name} patch={patch} />
                      <span className="font-medium text-foreground">{entry.name}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn(
                        "text-[11px] font-bold px-1.5 py-0.5 rounded border",
                        tierColor(entry.tier),
                      )}>
                        {entry.tier}
                      </span>
                    </td>
                    <td className={cn(
                      "px-3 py-2 text-right font-mono font-semibold",
                      entry.winRate >= 52 ? "text-emerald-400" :
                      entry.winRate >= 50 ? "text-foreground" : "text-destructive/70",
                    )}>
                      {entry.winRate}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {entry.playRate}%
                    </td>
                    <td className={cn(
                      "px-4 py-2 text-right font-mono",
                      entry.banRate >= 10 ? "text-red-400" : "text-muted-foreground",
                    )}>
                      {entry.banRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
