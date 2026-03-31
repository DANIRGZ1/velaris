/**
 * VelarisLogoAnim — "V" logo with stroke-draw animation + glow
 *
 * Sequence: idle → draw stroke → fill gradient → dot pulses
 * Replaces VelarisLavaLamp as the loading screen centerpiece.
 */

import { motion } from "motion/react";
import { useId } from "react";

interface VelarisLogoAnimProps {
  animated?: boolean;
  onDrawComplete?: () => void;
  /** Use light colors (for dark backgrounds) */
  light?: boolean;
}

// V path from preview.html reference, adjusted for a 220×220 viewBox
const V_PATH =
  "M120 150 L220 360 Q256 420 292 360 L392 150 L330 150 L256 310 L182 150 Z";

// Total approximate path length for dasharray
const PATH_LENGTH = 900;

export function VelarisLogoAnim({
  animated = true,
  onDrawComplete,
  light = false,
}: VelarisLogoAnimProps) {
  const uid = useId().replace(/:/g, "");
  const strokeColor = light ? "#ffffff" : "#18181b";

  return (
    <div className="w-[100px] h-[100px] flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 512 512">
        <defs>
          {/* Gradient for the filled V */}
          <linearGradient
            id={`vGrad-${uid}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            {light ? (
              <>
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="60%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#5b21b6" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#3f3f46" />
                <stop offset="60%" stopColor="#18181b" />
                <stop offset="100%" stopColor="#09090b" />
              </>
            )}
          </linearGradient>

          {/* Glow filter for the stroke */}
          <filter
            id={`vGlow-${uid}`}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* V stroke — draws itself */}
        <motion.path
          d={V_PATH}
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#vGlow-${uid})`}
          initial={{ strokeDasharray: PATH_LENGTH, strokeDashoffset: PATH_LENGTH }}
          animate={{ strokeDashoffset: 0 }}
          transition={{
            duration: 1.4,
            ease: [0.16, 1, 0.3, 1],
            delay: animated ? 0.2 : 0,
          }}
        />

        {/* V fill — fades in after stroke completes */}
        <motion.path
          d={V_PATH}
          fill={`url(#vGrad-${uid})`}
          stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: animated ? 1.3 : 0,
            ease: [0.16, 1, 0.3, 1],
          }}
          onAnimationComplete={onDrawComplete}
        />

        {/* Apex dot — pulses after fill */}
        <motion.circle
          cx="256"
          cy="95"
          r="10"
          fill={strokeColor}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0.6, 1], scale: [0, 1.2, 1, 1] }}
          transition={{
            duration: 1.6,
            delay: animated ? 1.8 : 0,
            ease: [0.16, 1, 0.3, 1],
          }}
        />

        {/* Apex dot glow ring — breathing */}
        <motion.circle
          cx="256"
          cy="95"
          r="10"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: [0, 0.4, 0],
            scale: [1, 2.5, 3],
          }}
          transition={{
            duration: 2.5,
            delay: animated ? 2.4 : 0,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      </svg>
    </div>
  );
}