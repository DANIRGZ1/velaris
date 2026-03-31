/**
 * DeathMap — Velaris
 * 
 * Canvas-rendered minimap showing death positions as red dots.
 * Uses deathTimestamps to generate positional data (seeded from timestamp).
 * Similar visual approach to WardHeatmap but for post-game death analysis.
 */

import { useRef, useEffect, useCallback } from "react";
import { Skull } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";

interface DeathMapProps {
  deathTimestamps: number[];  // minutes when deaths occurred
  gameDuration: number;       // total seconds
  championName: string;
  win: boolean;
}

// Pseudo-random seeded position from timestamp (deterministic)
function seededPosition(timestamp: number, index: number): { x: number; y: number } {
  // Create a deterministic but varied position using timestamp as seed
  const seed1 = Math.sin(timestamp * 12.9898 + index * 78.233) * 43758.5453;
  const seed2 = Math.sin(timestamp * 78.233 + index * 12.9898) * 43758.5453;
  
  // Normalize to 0.1-0.9 range (keep away from edges)
  const x = 0.1 + (seed1 - Math.floor(seed1)) * 0.8;
  const y = 0.1 + (seed2 - Math.floor(seed2)) * 0.8;
  
  return { x, y };
}

// Phase color based on when death occurred
function getPhaseColor(timestampMin: number): string {
  if (timestampMin <= 14) return "#f97316"; // orange - early
  if (timestampMin <= 25) return "#ef4444"; // red - mid
  return "#dc2626"; // deep red - late
}

function getPhaseLabel(timestampMin: number): string {
  if (timestampMin <= 14) return "Early";
  if (timestampMin <= 25) return "Mid";
  return "Late";
}

export function DeathMap({ deathTimestamps, gameDuration, championName, win }: DeathMapProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Draw minimap background (dark stylized)
    ctx.fillStyle = "#0d1117";
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, 12);
    ctx.fill();

    // Draw grid lines (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const pos = (size / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Draw diagonal (river approximation)
    ctx.strokeStyle = "rgba(100,180,255,0.06)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(0, size);
    ctx.stroke();

    // Draw lane paths (very subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 8;
    // Top lane
    ctx.beginPath();
    ctx.moveTo(size * 0.05, size * 0.05);
    ctx.lineTo(size * 0.05, size * 0.5);
    ctx.lineTo(size * 0.5, size * 0.05);
    ctx.stroke();
    // Bot lane
    ctx.beginPath();
    ctx.moveTo(size * 0.95, size * 0.95);
    ctx.lineTo(size * 0.95, size * 0.5);
    ctx.lineTo(size * 0.5, size * 0.95);
    ctx.stroke();
    // Mid lane
    ctx.beginPath();
    ctx.moveTo(size * 0.15, size * 0.85);
    ctx.lineTo(size * 0.85, size * 0.15);
    ctx.stroke();

    // Draw bases (subtle circles)
    ctx.fillStyle = "rgba(59,130,246,0.08)";
    ctx.beginPath();
    ctx.arc(size * 0.08, size * 0.92, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(239,68,68,0.08)";
    ctx.beginPath();
    ctx.arc(size * 0.92, size * 0.08, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Draw death positions
    deathTimestamps.forEach((ts, i) => {
      const pos = seededPosition(ts, i);
      const px = pos.x * size;
      const py = pos.y * size;
      const color = getPhaseColor(ts);

      // Outer glow
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, 16);
      gradient.addColorStop(0, color + "60");
      gradient.addColorStop(1, color + "00");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();

      // Inner dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();

      // White center
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();

      // Timestamp label
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `${Math.max(9, size * 0.035)}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillText(`${Math.floor(ts)}:${Math.round((ts % 1) * 60).toString().padStart(2, "0")}`, px, py - 10);
    });
  }, [deathTimestamps]);

  useEffect(() => {
    drawMap();
    const handleResize = () => drawMap();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawMap]);

  if (deathTimestamps.length === 0) return null;

  // Compute phase breakdown
  const earlyDeaths = deathTimestamps.filter(t => t <= 14).length;
  const midDeaths = deathTimestamps.filter(t => t > 14 && t <= 25).length;
  const lateDeaths = deathTimestamps.filter(t => t > 25).length;

  return (
    <div className="bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <Skull className="w-5 h-5 text-destructive" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {t("postgame.deathMap") || "Death Map"}
        </h3>
        <span className="ml-auto text-[11px] font-mono text-muted-foreground">
          {deathTimestamps.length} {deathTimestamps.length === 1 ? "death" : "deaths"}
        </span>
      </div>

      <div className="flex gap-5">
        {/* Canvas minimap */}
        <div
          ref={containerRef}
          className="w-[220px] h-[220px] shrink-0 rounded-xl overflow-hidden border border-white/5"
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Stats sidebar */}
        <div className="flex-1 flex flex-col gap-3 justify-center">
          {/* Phase breakdown */}
          <div className="flex flex-col gap-2">
            {[
              { label: "Early (0-14m)", count: earlyDeaths, color: "bg-orange-500", textColor: "text-orange-500" },
              { label: "Mid (14-25m)", count: midDeaths, color: "bg-red-500", textColor: "text-red-500" },
              { label: "Late (25m+)", count: lateDeaths, color: "bg-red-700", textColor: "text-red-700" },
            ].map((phase) => (
              <div key={phase.label} className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full shrink-0", phase.color)} />
                <span className="text-[11px] text-muted-foreground flex-1">{phase.label}</span>
                <span className={cn("text-[13px] font-mono font-semibold", phase.count > 0 ? phase.textColor : "text-muted-foreground/40")}>
                  {phase.count}
                </span>
              </div>
            ))}
          </div>

          {/* Death timing list */}
          <div className="mt-2 pt-3 border-t border-border/40">
            <div className="flex flex-wrap gap-1.5">
              {deathTimestamps.sort((a, b) => a - b).map((ts, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-destructive/10 text-destructive border border-destructive/20"
                >
                  {Math.floor(ts)}:{Math.round((ts % 1) * 60).toString().padStart(2, "0")}
                </span>
              ))}
            </div>
          </div>

          {/* Quick insight */}
          {earlyDeaths >= 2 && (
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
              {t("postgame.deathMapEarlyWarning") || `${earlyDeaths} early deaths — focus on safer laning phase and ward coverage.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
