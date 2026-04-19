/**
 * BadgeIcon — Hexagonal achievement badge with tier gradient + Lucide icon.
 * Replaces flat emojis with a polished gaming-style icon frame.
 */
import type { LucideIcon } from "lucide-react";
import {
  Gamepad2, Flame, Zap, Skull, Crown,
  Eye, Trophy, Wheat, Shield, Shuffle,
  Star, Swords,
} from "lucide-react";

// ─── Badge ID → Lucide icon ───────────────────────────────────────────────────

export const BADGE_ICON_MAP: Partial<Record<string, LucideIcon>> = {
  games_10:      Gamepad2,
  games_50:      Gamepad2,
  games_100:     Gamepad2,
  streak_3:      Flame,
  streak_5:      Flame,
  streak_10:     Flame,
  kda_5:         Zap,
  kda_10:        Zap,
  kills_20:      Skull,
  penta:         Crown,
  vision_50:     Eye,
  lp_100_day:    Trophy,
  lp_500_total:  Trophy,
  cs_300:        Wheat,
  deathless:     Shield,
  flex_5:        Shuffle,
  flex_15:       Shuffle,
};

// ─── Tier visual styles ───────────────────────────────────────────────────────

const TIER_STYLE = {
  bronze: {
    stop0: "#e8a75a",
    stop1: "#92400e",
    stroke: "#d97706",
    glow: "0 0 10px rgba(217,119,6,0.55)",
  },
  silver: {
    stop0: "#e2e8f0",
    stop1: "#64748b",
    stroke: "#94a3b8",
    glow: "0 0 8px rgba(148,163,184,0.40)",
  },
  gold: {
    stop0: "#fde68a",
    stop1: "#b45309",
    stroke: "#fbbf24",
    glow: "0 0 14px rgba(251,191,36,0.65)",
  },
  diamond: {
    stop0: "#bae6fd",
    stop1: "#0369a1",
    stroke: "#38bdf8",
    glow: "0 0 16px rgba(56,189,248,0.70)",
  },
} as const;

const LOCKED_STYLE = {
  stop0: "#374151",
  stop1: "#1f2937",
  stroke: "#374151",
  glow: "none",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface BadgeIconProps {
  badgeId: string;
  tier: keyof typeof TIER_STYLE;
  locked?: boolean;
  size?: number;
}

export function BadgeIcon({ badgeId, tier, locked = false, size = 56 }: BadgeIconProps) {
  const Icon: LucideIcon = BADGE_ICON_MAP[badgeId] ?? Star;
  const s = locked ? LOCKED_STYLE : TIER_STYLE[tier];
  const gradId = `bg-${badgeId}-${tier}`;
  const iconPx = Math.round(size * 0.38);

  // Hexagon points for a 100×100 viewBox (flat-top orientation)
  const HEX = "50,4 95,27 95,73 50,96 5,73 5,27";
  const HEX_INNER = "50,12 87,31 87,69 50,88 13,69 13,31";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ filter: locked ? "none" : `drop-shadow(${s.glow})` }}
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={(s as typeof TIER_STYLE.bronze).stop0} />
            <stop offset="100%" stopColor={(s as typeof TIER_STYLE.bronze).stop1} />
          </linearGradient>
        </defs>

        {/* Body */}
        <polygon
          points={HEX}
          fill={`url(#${gradId})`}
          stroke={(s as typeof TIER_STYLE.bronze).stroke}
          strokeWidth="2"
          opacity={locked ? 0.35 : 1}
        />

        {/* Inner bevel highlight */}
        {!locked && (
          <polygon
            points={HEX_INNER}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1"
          />
        )}

        {/* Diamond tier: subtle star sparkles */}
        {!locked && tier === "diamond" && (
          <>
            <circle cx="18" cy="18" r="1.5" fill="white" opacity="0.6" />
            <circle cx="82" cy="22" r="1"   fill="white" opacity="0.5" />
            <circle cx="78" cy="78" r="1.5" fill="white" opacity="0.6" />
          </>
        )}

        {/* Gold tier: bottom shine */}
        {!locked && tier === "gold" && (
          <ellipse cx="50" cy="82" rx="18" ry="4" fill="rgba(255,255,255,0.12)" />
        )}
      </svg>

      {/* Lucide icon */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: locked ? 0.25 : 1 }}
      >
        <Icon size={iconPx} color="white" strokeWidth={2.2} />
      </div>
    </div>
  );
}
