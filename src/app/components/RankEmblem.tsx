/**
 * RankEmblem — rank badge with official Riot emblem image + dynamic title.
 * Images served from CommunityDragon (already in the app's CSP img-src).
 */
import { cn } from "./ui/utils";

// ─── Emblem image URLs ────────────────────────────────────────────────────────

const BASE = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem";

const EMBLEM_URL: Record<string, string> = {
  IRON:         `${BASE}/emblem-iron.png`,
  BRONZE:       `${BASE}/emblem-bronze.png`,
  SILVER:       `${BASE}/emblem-silver.png`,
  GOLD:         `${BASE}/emblem-gold.png`,
  PLATINUM:     `${BASE}/emblem-platinum.png`,
  EMERALD:      `${BASE}/emblem-emerald.png`,
  DIAMOND:      `${BASE}/emblem-diamond.png`,
  MASTER:       `${BASE}/emblem-master.png`,
  GRANDMASTER:  `${BASE}/emblem-grandmaster.png`,
  CHALLENGER:   `${BASE}/emblem-challenger.png`,
  UNRANKED:     `${BASE}/emblem-unranked.png`,
};

// ─── Rank colours ─────────────────────────────────────────────────────────────

export const RANK_COLORS: Record<string, string> = {
  IRON:         "text-slate-400",
  BRONZE:       "text-amber-700",
  SILVER:       "text-slate-300",
  GOLD:         "text-yellow-500",
  PLATINUM:     "text-cyan-400",
  EMERALD:      "text-emerald-400",
  DIAMOND:      "text-blue-400",
  MASTER:       "text-purple-400",
  GRANDMASTER:  "text-rose-500",
  CHALLENGER:   "text-yellow-300",
  UNRANKED:     "text-muted-foreground",
};

// ─── Dynamic titles (4 per tier, one per division I–IV) ──────────────────────
// Solo-queue flavour titles, inspired by Blitz / Porofessor style.

const RANK_TITLES: Record<string, [string, string, string, string]> = {
  IRON:        ["Iron Spirit",      "Learning the Ropes",  "Finding the Way",   "Starting the Climb"],
  BRONZE:      ["Bronze Fighter",   "On the Rise",         "The Persistent",    "Breaking Ground"],
  SILVER:      ["Silver Tactician", "Sharp & Steady",      "The Reliable",      "The Contender"],
  GOLD:        ["Gold Rush",        "Seasoned Veteran",    "Consistent Climber","Gold Standard"],
  PLATINUM:    ["Platinum Elite",   "Rising Threat",       "Sharp-Minded",      "Platinum Bound"],
  EMERALD:     ["Emerald Guardian", "Refined Tactician",   "High Caliber",      "The Specialist"],
  DIAMOND:     ["Diamond Edge",     "Elite Competitor",    "The Dominant",      "Diamond Cutter"],
  MASTER:      ["Apex Predator",    "The Master",          "Rank Conqueror",    "Master Duelist"],
  GRANDMASTER: ["Among the Best",   "The Formidable",      "Grandmaster",       "Near-Perfect"],
  CHALLENGER:  ["Server Royalty",   "Top of the World",    "The Untouchable",   "The Challenger"],
  UNRANKED:    ["Unranked",         "Unranked",            "Unranked",          "Unranked"],
};

export function getRankTitle(rank?: string, division?: string): string {
  const tier = (rank ?? "UNRANKED").toUpperCase();
  const titles = RANK_TITLES[tier] ?? RANK_TITLES.UNRANKED;
  const divIdx = ["I", "II", "III", "IV"].indexOf((division ?? "IV").toUpperCase());
  return titles[divIdx >= 0 ? divIdx : 3];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RankEmblemProps {
  rank?: string;
  division?: string;
  lp?: number;
  wins?: number;
  losses?: number;
  /** "sm" = 40px  "md" = 72px  "lg" = 100px */
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
  showStats?: boolean;
  className?: string;
}

const SIZE_PX = { sm: 40, md: 72, lg: 100 } as const;

export function RankEmblem({
  rank = "UNRANKED",
  division,
  lp,
  wins,
  losses,
  size = "md",
  showTitle = true,
  showStats = false,
  className,
}: RankEmblemProps) {
  const tier   = rank.toUpperCase();
  const imgUrl = EMBLEM_URL[tier] ?? EMBLEM_URL.UNRANKED;
  const color  = RANK_COLORS[tier] ?? "text-muted-foreground";
  const title  = getRankTitle(rank, division);
  const px     = SIZE_PX[size];
  const totalGames = (wins ?? 0) + (losses ?? 0);
  const wr         = totalGames > 0 ? Math.round(((wins ?? 0) / totalGames) * 100) : null;
  const hasDivision = !["MASTER", "GRANDMASTER", "CHALLENGER", "UNRANKED"].includes(tier);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {/* Emblem image */}
      <div style={{ width: px, height: px }} className="relative shrink-0">
        <img
          src={imgUrl}
          alt={tier}
          style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
        />
      </div>

      {/* Rank name + division */}
      {showTitle && (
        <div className="flex flex-col items-center gap-0.5">
          <span className={cn("font-bold uppercase tracking-wider leading-none", color,
            size === "lg" ? "text-[16px]" : size === "md" ? "text-[13px]" : "text-[10px]"
          )}>
            {tier}{hasDivision && division ? ` ${division}` : ""}
          </span>
          {size !== "sm" && (
            <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wide">
              {title}
            </span>
          )}
        </div>
      )}

      {/* LP + WR stats */}
      {showStats && (
        <div className="flex items-center gap-3 mt-0.5">
          {lp !== undefined && (
            <span className="text-[12px] font-mono font-semibold text-foreground">
              {lp} <span className="text-muted-foreground/50 font-normal">LP</span>
            </span>
          )}
          {wr !== null && (
            <span className={cn("text-[12px] font-mono font-semibold",
              wr >= 55 ? "text-emerald-400" : wr >= 50 ? "text-foreground" : "text-destructive/70"
            )}>
              {wr}% <span className="text-muted-foreground/50 font-normal">WR</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
