/**
 * VelarisIcon — Icono de app basado en la forma del recipiente de lava lamp
 *
 * Usa los paths originales del vessel con viewBox recortado al bounding box.
 */

import { useId } from "react";

interface VelarisIconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

// Paths idénticos al vessel de VelarisLavaLamp
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

const PETALS = [
  "M 62 365 Q 85 430, 113 458",
  "M 198 365 Q 175 430, 147 458",
  "M 113 458 Q 130 442, 147 458",
];

export function VelarisIcon({ size = 24, className = "", filled = true }: VelarisIconProps) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="30 30 200 460"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`viGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C084FC" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={`viStroke-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      {filled && (
        <path d={OUTER} fill={`url(#viGrad-${uid})`} opacity="0.18" />
      )}

      <path
        d={OUTER}
        stroke={`url(#viStroke-${uid})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d={INNER}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.2"
      />

      {PETALS.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.2"
        />
      ))}
    </svg>
  );
}
