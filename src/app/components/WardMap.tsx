import { useEffect, useRef } from "react";
import { Eye } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WardMapProps {
  wardsPlaced: number;
  controlWardsPlaced: number;
  role: string;
  gameDuration: number; // seconds
}

// ─── Seeded pseudo-random ─────────────────────────────────────────────────────
// Same approach as DeathMap — deterministic from seed so positions don't jump.

function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Role-biased ward zones ───────────────────────────────────────────────────
// Each zone is [xMin, xMax, yMin, yMax] in 0-1 space on the Summoner's Rift map.
// The map is oriented with Blue side bottom-left, Red side top-right.
//   x: 0 = left, 1 = right
//   y: 0 = top,  1 = bottom  (canvas origin top-left)

const ROLE_ZONES: Record<string, [number, number, number, number][]> = {
  TOP: [
    [0.05, 0.30, 0.05, 0.45], // blue top jungle / top lane
    [0.30, 0.55, 0.05, 0.35], // river top
  ],
  JUNGLE: [
    [0.10, 0.45, 0.35, 0.65], // blue jungle deep
    [0.55, 0.90, 0.35, 0.65], // red jungle deep
    [0.35, 0.65, 0.20, 0.55], // river objectives
  ],
  MIDDLE: [
    [0.30, 0.55, 0.35, 0.65], // mid river
    [0.20, 0.45, 0.25, 0.55], // blue jungle side
    [0.55, 0.80, 0.45, 0.75], // red jungle side
  ],
  BOTTOM: [
    [0.70, 0.95, 0.55, 0.95], // red bottom jungle / bot lane
    [0.45, 0.70, 0.65, 0.90], // river bot
  ],
  UTILITY: [
    [0.45, 0.70, 0.65, 0.90], // bot river / dragon pit
    [0.55, 0.85, 0.55, 0.85], // bot jungle
    [0.35, 0.65, 0.55, 0.75], // mid-bot
  ],
};

function getZones(role: string): [number, number, number, number][] {
  return ROLE_ZONES[role] ?? ROLE_ZONES["MIDDLE"];
}

interface WardDot {
  x: number; // 0-1
  y: number; // 0-1
  type: "control" | "stealth";
}

function generateWardPositions(
  wardsPlaced: number,
  controlWardsPlaced: number,
  role: string,
  gameDuration: number,
): WardDot[] {
  const zones = getZones(role);
  const dots: WardDot[] = [];

  const total = wardsPlaced + controlWardsPlaced;
  const clampedTotal = Math.min(total, 30);

  for (let i = 0; i < clampedTotal; i++) {
    const isControl = i < controlWardsPlaced;
    const zoneIdx = Math.floor(seeded(i * 7.3 + gameDuration * 0.001) * zones.length);
    const zone = zones[zoneIdx % zones.length];
    const [xMin, xMax, yMin, yMax] = zone;

    const x = xMin + seeded(i * 13.7 + 1.1) * (xMax - xMin);
    const y = yMin + seeded(i * 9.1 + 2.3) * (yMax - yMin);

    dots.push({ x, y, type: isControl ? "control" : "stealth" });
  }

  return dots;
}

// ─── Map image URL (Community Dragon Minimap) ─────────────────────────────────
const MAP_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-gameplay-renderer/global/default/assets/images/minimap/minimap11.png";

// ─── Component ────────────────────────────────────────────────────────────────

export function WardMap({ wardsPlaced, controlWardsPlaced, role, gameDuration }: WardMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dots = generateWardPositions(wardsPlaced, controlWardsPlaced, role, gameDuration);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const size = container.clientWidth;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw map background
    const mapImg = new Image();
    mapImg.crossOrigin = "anonymous";
    mapImg.src = MAP_URL;

    const drawDots = () => {
      ctx.clearRect(0, 0, size, size);
      // Draw map if loaded
      if (mapImg.complete) {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(mapImg, 0, 0, size, size);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "rgba(20,22,28,0.8)";
        ctx.fillRect(0, 0, size, size);
      }

      for (const dot of dots) {
        const px = dot.x * size;
        const py = dot.y * size;

        // Outer glow
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, 10);
        if (dot.type === "control") {
          gradient.addColorStop(0, "rgba(251,191,36,0.5)");
          gradient.addColorStop(1, "transparent");
        } else {
          gradient.addColorStop(0, "rgba(56,189,248,0.4)");
          gradient.addColorStop(1, "transparent");
        }
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(px, py, dot.type === "control" ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = dot.type === "control" ? "#fbbf24" : "#38bdf8";
        ctx.fill();
        ctx.strokeStyle = dot.type === "control" ? "#92400e" : "#0c4a6e";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    mapImg.onload = drawDots;
    mapImg.onerror = drawDots;
    // Draw immediately in case image is cached
    if (mapImg.complete) drawDots();
  }, [dots]);

  if (wardsPlaced === 0 && controlWardsPlaced === 0) return null;

  return (
    <div className="bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-sky-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Ward Map
          </h3>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            Stealth ({wardsPlaced})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Control ({controlWardsPlaced})
          </span>
        </div>
      </div>
      <div ref={containerRef} className="relative w-full aspect-square max-w-xs mx-auto">
        <canvas ref={canvasRef} className="rounded-xl w-full h-full" />
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        Positions approximated by role tendencies
      </p>
    </div>
  );
}
