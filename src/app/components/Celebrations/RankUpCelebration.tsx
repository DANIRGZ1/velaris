/**
 * RankUpCelebration — Premium rank promotion banner.
 *
 * Two modes:
 * • Division promotion (Gold III → Gold II): warm, elegant banner from top
 * • Tier promotion (Gold I → Platinum IV): epic, full overlay with particles
 *
 * Visual cues:
 * • Rank emblem with radial glow pulse
 * • Floating light particles (zinc/violet dust)
 * • Old rank fades out → new rank scales in
 * • Warm, understated — not carnival confetti
 */

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useMemo, useId } from "react";
import { X, ChevronRight } from "lucide-react";
import { cn } from "../ui/utils";
import type { RankUpCelebration as RankUpType } from "../../services/celebrationService";
import { useLanguage } from "../../contexts/LanguageContext";

// ─── Rank Colors ──────────────────────────────────────────────────────────────

const RANK_STYLES: Record<string, { color: string; glow: string; gradient: string }> = {
  IRON:        { color: "text-gray-400",    glow: "rgba(156,163,175,0.3)", gradient: "from-gray-500/20 to-gray-600/5" },
  BRONZE:      { color: "text-amber-700",   glow: "rgba(180,83,9,0.3)",    gradient: "from-amber-700/20 to-amber-800/5" },
  SILVER:      { color: "text-gray-300",    glow: "rgba(209,213,219,0.3)", gradient: "from-gray-300/20 to-gray-400/5" },
  GOLD:        { color: "text-yellow-500",  glow: "rgba(234,179,8,0.35)",  gradient: "from-yellow-500/20 to-yellow-600/5" },
  PLATINUM:    { color: "text-cyan-400",    glow: "rgba(34,211,238,0.3)",  gradient: "from-cyan-400/20 to-cyan-500/5" },
  EMERALD:     { color: "text-emerald-400", glow: "rgba(52,211,153,0.3)",  gradient: "from-emerald-400/20 to-emerald-500/5" },
  DIAMOND:     { color: "text-blue-400",    glow: "rgba(96,165,250,0.35)", gradient: "from-blue-400/20 to-blue-500/5" },
  MASTER:      { color: "text-purple-400",  glow: "rgba(192,132,252,0.4)", gradient: "from-purple-400/20 to-purple-500/5" },
  GRANDMASTER: { color: "text-red-400",     glow: "rgba(248,113,113,0.4)", gradient: "from-red-400/20 to-red-500/5" },
  CHALLENGER:  { color: "text-amber-300",   glow: "rgba(252,211,77,0.45)", gradient: "from-amber-300/20 to-amber-400/5" },
};

function getRankStyle(rank: string) {
  return RANK_STYLES[rank.toUpperCase()] || RANK_STYLES.IRON;
}

function formatRank(rank: string, division: string): string {
  const masterPlus = ["MASTER", "GRANDMASTER", "CHALLENGER"];
  if (masterPlus.includes(rank.toUpperCase())) return rank;
  return `${rank} ${division}`;
}

// ─── Floating Particles (light dust, not confetti) ───────────────────────────

function CelebrationParticles({ color, count = 20 }: { color: string; count?: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 4,
      size: 2 + Math.random() * 3,
      opacity: 0.2 + Math.random() * 0.4,
    })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: "-5%",
            width: p.size,
            height: p.size,
            background: color,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [0, -400 - Math.random() * 200],
            opacity: [0, p.opacity, p.opacity, 0],
            x: [0, (Math.random() - 0.5) * 60],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

// ─── Rank Emblem (SVG shield shape) ──────────────────────────────────────────

function RankEmblem({ rank, className }: { rank: string; className?: string }) {
  const style = getRankStyle(rank);
  const uid = useId().replace(/:/g, "");

  return (
    <div className={cn("relative", className)}>
      {/* Radial glow behind */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: style.glow }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [0.9, 1.15, 0.9],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Shield with rank initial */}
      <svg width="72" height="80" viewBox="0 0 72 80" className="relative">
        <defs>
          <linearGradient id={`rankGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={style.glow.replace(/[,\s]*[\d.]+\)$/, ", 0.6)")} />
            <stop offset="100%" stopColor={style.glow.replace(/[,\s]*[\d.]+\)$/, ", 0.15)")} />
          </linearGradient>
        </defs>
        <path
          d="M36 2 L68 18 L68 50 Q68 68 36 78 Q4 68 4 50 L4 18 Z"
          fill={`url(#rankGrad-${uid})`}
          stroke={style.glow.replace(/[,\s]*[\d.]+\)$/, ", 0.5)")}
          strokeWidth="1.5"
        />
        <text
          x="36"
          y="48"
          textAnchor="middle"
          className={cn("font-bold text-[28px]", style.color)}
          fill="currentColor"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {rank.charAt(0)}
        </text>
      </svg>
    </div>
  );
}

// ─── Division Promotion Banner ───────────────────────────────────────────────

function DivisionBanner({
  celebration,
  onDismiss,
}: {
  celebration: RankUpType;
  onDismiss: () => void;
}) {
  const { t } = useLanguage();
  const newStyle = getRankStyle(celebration.newRank);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onDismiss, 600);
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -80, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -40, opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/40",
            "bg-gradient-to-r", newStyle.gradient,
            "bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/15",
            "px-6 py-4 w-[420px]"
          )}
        >
          {/* Subtle shimmer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={{ duration: 2, delay: 0.4, ease: "easeInOut" }}
            style={{
              background: `linear-gradient(90deg, transparent, ${newStyle.glow.replace(/[\d.]+\)$/, "0.1)")}, transparent)`,
              width: "33%",
            }}
          />

          <div className="relative flex items-center gap-5">
            {/* Mini rank emblem */}
            <div className="relative flex-shrink-0">
              <motion.div
                className="absolute inset-0 rounded-full blur-lg"
                style={{ background: newStyle.glow }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0.3] }}
                transition={{ duration: 1.5 }}
              />
              <div className={cn(
                "relative w-12 h-12 rounded-xl flex items-center justify-center",
                "bg-background/60 border border-border/40"
              )}>
                <motion.span
                  className={cn("text-xl font-bold", newStyle.color)}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {celebration.newRank.charAt(0)}
                </motion.span>
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <motion.span
                  className="text-[11px] font-medium text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {formatRank(celebration.previousRank, celebration.previousDivision)}
                </motion.span>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </motion.div>
                <motion.span
                  className={cn("text-[12px] font-bold", newStyle.color)}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  {formatRank(celebration.newRank, celebration.newDivision)}
                </motion.span>
              </div>
              <motion.p
                className="text-[13px] font-semibold text-foreground mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {t("celebration.promoted")}
              </motion.p>
              <motion.p
                className="text-[11px] text-muted-foreground mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {t("celebration.keepClimbing")}
              </motion.p>
            </div>

            <button
              onClick={() => {
                setShow(false);
                setTimeout(onDismiss, 500);
              }}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Drain bar */}
          <div className="mt-3 h-[2px] w-full bg-border/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: newStyle.glow.replace(/[\d.]+\)$/, "0.6)") }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 8, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Tier Promotion Overlay (Epic) ───────────────────────────────────────────

function TierOverlay({
  celebration,
  onDismiss,
}: {
  celebration: RankUpType;
  onDismiss: () => void;
}) {
  const { t } = useLanguage();
  const newStyle = getRankStyle(celebration.newRank);
  const oldStyle = getRankStyle(celebration.previousRank);
  const [phase, setPhase] = useState<"enter" | "reveal" | "hold" | "exit">("enter");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("reveal"), 800),
      setTimeout(() => setPhase("hold"), 2200),
      setTimeout(() => {
        setPhase("exit");
        setTimeout(onDismiss, 800);
      }, 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(12px)" }}
          transition={{ duration: 0.6 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            onClick={() => {
              setPhase("exit");
              setTimeout(onDismiss, 600);
            }}
          />

          {/* Particles */}
          <CelebrationParticles color={newStyle.glow.replace(/[\d.]+\)$/, "0.6)")} count={24} />

          {/* Content card */}
          <motion.div
            className={cn(
              "relative z-10 flex flex-col items-center gap-6 px-12 py-10",
              "rounded-3xl border border-border/30",
              "bg-card/90 backdrop-blur-xl shadow-2xl"
            )}
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: -20, opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Dismiss */}
            <button
              onClick={() => {
                setPhase("exit");
                setTimeout(onDismiss, 600);
              }}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {/* Rank transition */}
            <div className="flex items-center gap-8">
              {/* Old rank — fading */}
              <motion.div
                className="flex flex-col items-center gap-2 opacity-40"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0.25, scale: 0.85 }}
                transition={{ delay: 1.2, duration: 1 }}
              >
                <RankEmblem rank={celebration.previousRank} className="w-[72px] h-[80px]" />
                <span className={cn("text-xs font-medium", oldStyle.color)}>
                  {formatRank(celebration.previousRank, celebration.previousDivision)}
                </span>
              </motion.div>

              {/* Arrow */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <ChevronRight className="w-6 h-6 text-muted-foreground/50" />
              </motion.div>

              {/* New rank — glorious reveal */}
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.5, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ delay: 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <RankEmblem rank={celebration.newRank} className="w-[72px] h-[80px]" />
                <motion.span
                  className={cn("text-sm font-bold", newStyle.color)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                >
                  {formatRank(celebration.newRank, celebration.newDivision)}
                </motion.span>
              </motion.div>
            </div>

            {/* Text */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.h2
                className="text-xl font-semibold text-foreground tracking-tight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.5 }}
              >
                {t("celebration.tierPromotion")}
              </motion.h2>
              <motion.p
                className="text-[13px] text-muted-foreground text-center max-w-[260px]"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.0, duration: 0.5 }}
              >
                {t("celebration.tierPromotion.desc", {
                  old: celebration.previousRank,
                  new: celebration.newRank,
                })}
              </motion.p>
            </div>

            {/* Subtle GG tag */}
            <motion.div
              className="px-4 py-1.5 rounded-full bg-secondary/50 border border-border/40"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                GG WP
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Main RankUpCelebration Switch ───────────────────────────────────────────

interface RankUpCelebrationProps {
  celebration: RankUpType | null;
  onDismiss: () => void;
}

export function RankUpCelebrationView({ celebration, onDismiss }: RankUpCelebrationProps) {
  if (!celebration) return null;

  if (celebration.isTierPromotion) {
    return <TierOverlay celebration={celebration} onDismiss={onDismiss} />;
  }

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[90] pointer-events-auto">
      <DivisionBanner celebration={celebration} onDismiss={onDismiss} />
    </div>
  );
}
