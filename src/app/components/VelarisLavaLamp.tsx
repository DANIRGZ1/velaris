/**
 * VelarisLavaLamp — Glass chimney vessel con estética Velaris
 *
 * Forma trazada de la imagen de referencia: cuello estrecho con lip,
 * cintura, vientre amplio y pétalos decorativos en la base.
 * Efecto metaball SVG dentro del recipiente + animación Blitz.gg.
 */

import { useId, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";

interface VelarisLavaLampProps {
  size?: "sm" | "md" | "lg";
  variant?: "violet" | "cyan" | "amber";
  showTube?: boolean;
  animated?: boolean;
  className?: string;
}

const PALETTE = {
  violet: {
    primary: "#8B5CF6",
    light: "#C084FC",
    dark: "#6D28D9",
    tube: "rgba(139,92,246,0.04)",
    stroke: "rgba(140,100,200,0.45)",
    strokeInner: "rgba(140,100,200,0.2)",
  },
  cyan: {
    primary: "#22D3EE",
    light: "#67E8F9",
    dark: "#0891B2",
    tube: "rgba(34,211,238,0.04)",
    stroke: "rgba(34,211,238,0.45)",
    strokeInner: "rgba(34,211,238,0.2)",
  },
  amber: {
    primary: "#FF9A3C",
    light: "#FFC27A",
    dark: "#FF6A00",
    tube: "rgba(255,154,60,0.04)",
    stroke: "rgba(255,154,60,0.45)",
    strokeInner: "rgba(255,154,60,0.2)",
  },
};

const SIZE_MAP = {
  sm: "w-[120px]",
  md: "w-[200px]",
  lg: "w-[280px]",
};

// ─── Vessel shape traced from reference image ───
// Hurricane lamp chimney: narrow rim → waist → wide belly → petal base

// Outer silhouette
const OUTER = `
  M 114 42 L 146 42
  C 150 42, 152 46, 152 52
  L 150 58
  C 149 68, 146 80, 142 95
  C 137 115, 136 135, 138 160
  C 142 200, 210 300, 212 345
  C 214 380, 195 430, 165 458
  Q 148 475, 130 478
  Q 112 475, 95 458
  C 65 430, 46 380, 48 345
  C 50 300, 118 200, 122 160
  C 124 135, 123 115, 118 95
  C 114 80, 111 68, 110 58
  L 108 52
  C 108 46, 110 42, 114 42
  Z
`;

// Inner contour (second line visible inside, slightly smaller)
const INNER = `
  M 120 60 L 140 60
  C 142 68, 140 82, 137 98
  C 133 118, 132 140, 134 168
  C 138 210, 196 298, 198 338
  C 200 370, 182 418, 156 445
  Q 143 460, 130 462
  Q 117 460, 104 445
  C 78 418, 60 370, 62 338
  C 64 298, 122 210, 126 168
  C 128 140, 127 118, 123 98
  C 120 82, 118 68, 120 60
  Z
`;

// Bottom petal / facet decorative lines
const PETAL_LINES = [
  // Left petal curve — from mid-body to bottom
  "M 62 365 Q 85 430, 113 458",
  // Right petal curve
  "M 198 365 Q 175 430, 147 458",
  // Bottom scallop arc connecting petals
  "M 113 458 Q 130 442, 147 458",
  // Left inner petal accent
  "M 72 380 Q 92 425, 118 452",
  // Right inner petal accent
  "M 188 380 Q 168 425, 142 452",
];

// Small bottom detail (scalloped circle at vessel base)
const BOTTOM_ARC = "M 118 462 Q 124 455, 130 454 Q 136 455, 142 462";

// Clip path for lava (inside the vessel body, from waist down to bottom)
const CLIP = `
  M 116 55 L 144 55
  C 142 68, 140 82, 137 98
  C 133 118, 132 140, 134 168
  C 138 210, 198 298, 200 340
  C 202 375, 184 422, 158 450
  Q 144 468, 130 470
  Q 116 468, 102 450
  C 76 422, 58 375, 60 340
  C 62 298, 122 210, 126 168
  C 128 140, 127 118, 123 98
  C 120 82, 118 68, 116 55
  Z
`;

export function VelarisLavaLamp({
  size = "md",
  variant = "violet",
  showTube = true,
  animated = false,
  className = "",
}: VelarisLavaLampProps) {
  const uid = useId().replace(/:/g, "");
  const p = PALETTE[variant];

  const [phase, setPhase] = useState<"idle" | "draw" | "glow" | "alive">(
    animated ? "idle" : "alive"
  );

  const drawProgress = useMotionValue(0);

  useEffect(() => {
    if (!animated) {
      drawProgress.set(1);
      return;
    }

    const t1 = setTimeout(() => setPhase("draw"), 100);
    const drawAnim = animate(drawProgress, 1, {
      duration: 1.4,
      delay: 0.1,
      ease: [0.16, 1, 0.3, 1],
    });

    const t2 = setTimeout(() => setPhase("glow"), 1000);
    const t3 = setTimeout(() => setPhase("alive"), 1800);

    return () => {
      drawAnim.stop();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [animated]);

  const strokeOff = useTransform(drawProgress, [0, 1], [2200, 0]);

  const isGlowing = phase === "glow" || phase === "alive";
  const isAlive = phase === "alive";

  return (
    <motion.div
      className={`${SIZE_MAP[size]} aspect-[1/2] flex items-center justify-center ${className}`}
      initial={animated ? { opacity: 0, scale: 0.94 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 260 520"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metaball gooey */}
          <filter id={`goo-${uid}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
              result="goo"
            />
          </filter>

          {/* Lava gradient */}
          <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.light} />
            <stop offset="55%" stopColor={p.primary} />
            <stop offset="100%" stopColor={p.dark} />
          </linearGradient>

          {/* Ambient glow */}
          <radialGradient id={`ambGlow-${uid}`} cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor={p.primary} stopOpacity="0.1" />
            <stop offset="100%" stopColor={p.primary} stopOpacity="0" />
          </radialGradient>

          {/* Wire glow */}
          <filter id={`wGlow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Inner fill */}
          <radialGradient id={`iFill-${uid}`} cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor={p.primary} stopOpacity="0.05" />
            <stop offset="100%" stopColor={p.primary} stopOpacity="0" />
          </radialGradient>

          {/* Clip for lava */}
          <clipPath id={`clip-${uid}`}>
            <path d={CLIP} />
          </clipPath>
        </defs>

        {/* Ambient glow */}
        <motion.ellipse
          cx="130" cy="320" rx="150" ry="200"
          fill={`url(#ambGlow-${uid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: isGlowing ? 1 : 0 }}
          transition={{ duration: 1.2 }}
        />

        {/* ═══ VESSEL ═══ */}
        {showTube && (
          <g>
            {/* Glass body fill */}
            <motion.path
              d={OUTER}
              fill={`url(#iFill-${uid})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: isGlowing ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />

            {/* Outer silhouette — draws itself */}
            <motion.path
              d={OUTER}
              fill="none"
              stroke={p.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 2200,
                strokeDashoffset: animated ? strokeOff : 0,
              }}
              filter={isGlowing ? `url(#wGlow-${uid})` : undefined}
            />

            {/* Inner contour */}
            <motion.path
              d={INNER}
              fill="none"
              stroke={p.strokeInner}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 2200,
                strokeDashoffset: animated ? strokeOff : 0,
              }}
            />

            {/* Petal / facet decorative lines */}
            {PETAL_LINES.map((d, i) => (
              <motion.path
                key={`petal-${i}`}
                d={d}
                fill="none"
                stroke={p.strokeInner}
                strokeWidth="1.2"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 400,
                  strokeDashoffset: animated ? strokeOff : 0,
                }}
              />
            ))}

            {/* Bottom scallop detail */}
            <motion.path
              d={BOTTOM_ARC}
              fill="none"
              stroke={p.strokeInner}
              strokeWidth="1.2"
              strokeLinecap="round"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: animated ? strokeOff : 0,
              }}
            />
          </g>
        )}

        {/* ═══ LAVA BLOBS ═══ */}
        <motion.g
          filter={`url(#goo-${uid})`}
          clipPath={`url(#clip-${uid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: isAlive ? 1 : animated ? 0 : 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Bottom pool */}
          <ellipse cx="130" cy="465" rx="50" ry="22" fill={`url(#grad-${uid})`} />
          {/* Top pool */}
          <ellipse cx="130" cy="62" rx="14" ry="8" fill={`url(#grad-${uid})`} />

          {/* Mass 1 */}
          <circle cx="130" cy="460" r="45" fill={`url(#grad-${uid})`}>
            <animate attributeName="cy" values="460; 75; 460" dur="24s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
            <animate attributeName="r" values="45; 22; 45" dur="24s" repeatCount="indefinite" />
            <animate attributeName="cx" values="130; 150; 130" dur="24s" repeatCount="indefinite" />
          </circle>

          {/* Mass 2 */}
          <circle cx="118" cy="460" r="38" fill={`url(#grad-${uid})`}>
            <animate attributeName="cy" values="460; 85; 460" dur="19s" begin="-5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
            <animate attributeName="r" values="38; 45; 38" dur="19s" begin="-5s" repeatCount="indefinite" />
            <animate attributeName="cx" values="118; 132; 118" dur="19s" begin="-5s" repeatCount="indefinite" />
          </circle>

          {/* Mass 3 */}
          <circle cx="142" cy="460" r="42" fill={`url(#grad-${uid})`}>
            <animate attributeName="cy" values="460; 78; 460" dur="27s" begin="-12s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
            <animate attributeName="r" values="42; 25; 42" dur="27s" begin="-12s" repeatCount="indefinite" />
            <animate attributeName="cx" values="142; 112; 142" dur="27s" begin="-12s" repeatCount="indefinite" />
          </circle>

          {/* Connector 1 */}
          <circle cx="130" cy="460" r="28" fill={`url(#grad-${uid})`}>
            <animate attributeName="cy" values="460; 95; 460" dur="15s" begin="-7s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
            <animate attributeName="r" values="28; 38; 28" dur="15s" begin="-7s" repeatCount="indefinite" />
            <animate attributeName="cx" values="130; 142; 130" dur="15s" begin="-7s" repeatCount="indefinite" />
          </circle>

          {/* Connector 2 */}
          <circle cx="122" cy="460" r="32" fill={`url(#grad-${uid})`}>
            <animate attributeName="cy" values="460; 68; 460" dur="22s" begin="-18s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
            <animate attributeName="r" values="32; 20; 32" dur="22s" begin="-18s" repeatCount="indefinite" />
            <animate attributeName="cx" values="122; 145; 122" dur="22s" begin="-18s" repeatCount="indefinite" />
          </circle>
        </motion.g>

        {/* Glass highlight */}
        {showTube && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: isGlowing ? 1 : animated ? 0 : 1 }}
            transition={{ duration: 1 }}
          >
            <path
              d="M 68 200 Q 58 280, 56 340"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.045"
            />
            <circle cx="72" cy="230" r="2" fill="white" opacity="0.05" />
          </motion.g>
        )}

        {/* Pulse ring */}
        {isAlive && (
          <motion.ellipse
            cx="130" cy="340" rx="75" ry="50"
            fill="none"
            stroke={p.primary}
            strokeWidth="0.5"
            initial={{ opacity: 0.2, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </svg>
    </motion.div>
  );
}
