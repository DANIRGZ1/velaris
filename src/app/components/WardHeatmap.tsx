/**
 * WardHeatmap — Velaris
 * 
 * Visual heatmap showing ward placement tendencies on Summoner's Rift minimap.
 * Renders a stylized canvas minimap with overlaid heatmap dots based on
 * ward placement data from match history. Includes per-phase breakdown
 * (early/mid/late) and vision score stats.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Shield, Lightbulb, TrendingUp, Info } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { getMatchHistory } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import type { MatchData } from "../utils/analytics";
import { RANKED_QUEUE_IDS } from "../utils/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WardPoint {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  type: "sight" | "control" | "farsight";
  phase: "early" | "mid" | "late";
  intensity: number; // 0-1
}

interface VisionStats {
  avgWardsPlaced: number;
  avgWardsDestroyed: number;
  avgControlWards: number;
  avgVisionScore: number;
  avgVisionPerMin: number;
  earlyGameScore: number;
  midGameScore: number;
  lateGameScore: number;
}

type GamePhase = "all" | "early" | "mid" | "late";

// ─── Ward zone data (realistic ward spots on SR) ──────────────────────────────
// Coordinates calibrated to DDragon map11.png minimap image.
// Image coords: (0,0) = top-left, (1,1) = bottom-right.
// Conversion from game coords: img_x = game_x / 14870, img_y = 1 - game_y / 14870
// Blue base = bottom-left (~0.03, 0.97), Red base = top-right (~0.97, 0.03).

const COMMON_WARD_ZONES: Record<string, { x: number; y: number }> = {
  // ── Blue side jungle ──
  blueGrompBush:        { x: 0.15, y: 0.42 },   // Bush near Gromp (game ~2200, 8600)
  blueBlueBuff:         { x: 0.24, y: 0.48 },   // Blue Sentinel area (game ~3600, 7700)
  blueBlueEntrance:     { x: 0.20, y: 0.53 },   // River entrance to blue buff (game ~3000, 7000)
  blueWolves:           { x: 0.25, y: 0.56 },   // Near wolves camp (game ~3700, 6500)
  blueRedBuff:          { x: 0.53, y: 0.72 },   // Blue's Red Brambleback (game ~7800, 4200)
  blueRedEntrance:      { x: 0.50, y: 0.76 },   // Entrance to blue's red side (game ~7500, 3600)
  blueKrugs:            { x: 0.56, y: 0.81 },   // Near krugs (game ~8300, 2800)
  blueRaptors:          { x: 0.47, y: 0.63 },   // Near raptors/chickens (game ~7000, 5500)
  // ── Red side jungle ──
  redGrompBush:         { x: 0.85, y: 0.57 },   // Bush near Red's Gromp (game ~12700, 6400)
  redBlueBuff:          { x: 0.73, y: 0.54 },   // Red's Blue Sentinel (game ~10900, 6900)
  redBlueEntrance:      { x: 0.79, y: 0.48 },   // River entrance to red's blue (game ~11800, 7800)
  redWolves:            { x: 0.74, y: 0.45 },   // Near Red's wolves (game ~11000, 8200)
  redRedBuff:           { x: 0.48, y: 0.28 },   // Red's Red Brambleback (game ~7100, 10700)
  redRedEntrance:       { x: 0.50, y: 0.25 },   // Entrance to red's red side (game ~7400, 11200)
  redKrugs:             { x: 0.44, y: 0.19 },   // Near Red's krugs (game ~6500, 12000)
  redRaptors:           { x: 0.53, y: 0.37 },   // Near Red's raptors (game ~7900, 9400)
  // ── River & objectives ──
  dragonPit:            { x: 0.66, y: 0.70 },   // Dragon pit (game ~9866, 4414)
  dragonBush:           { x: 0.69, y: 0.74 },   // Bush below dragon (game ~10200, 3800)
  dragonRiverEntrance:  { x: 0.63, y: 0.66 },   // River entrance near dragon (game ~9300, 5100)
  baronPit:             { x: 0.34, y: 0.30 },   // Baron/Herald pit (game ~4980, 10388)
  baronBush:            { x: 0.32, y: 0.26 },   // Bush above baron (game ~4700, 11000)
  baronRiverEntrance:   { x: 0.38, y: 0.34 },   // River entrance near baron (game ~5600, 9800)
  // ── Pixel bushes (small river bushes near mid) ──
  topPixelBush:         { x: 0.33, y: 0.38 },   // Top-side pixel bush (game ~4900, 9200)
  botPixelBush:         { x: 0.67, y: 0.62 },   // Bot-side pixel bush (game ~10000, 5700)
  // ── Mid lane bushes ──
  midBushTopSide:       { x: 0.43, y: 0.44 },   // Mid brush top-side (game ~6400, 8400)
  midBushBotSide:       { x: 0.57, y: 0.56 },   // Mid brush bot-side (game ~8400, 6600)
  // ── Lane river bushes ──
  topLaneRiverBush:     { x: 0.19, y: 0.29 },   // Top lane river brush (game ~2800, 10600)
  botLaneRiverBush:     { x: 0.81, y: 0.72 },   // Bot lane river brush (game ~12000, 4200)
  // ── Tri-bushes ──
  blueTriBush:          { x: 0.71, y: 0.83 },   // Blue tri-bush bot lane (game ~10600, 2600)
  redTriBush:           { x: 0.28, y: 0.17 },   // Red tri-bush top lane (game ~4200, 12400)
  // ── Deep wards (enemy jungle) ──
  deepWardTopJungle:    { x: 0.70, y: 0.43 },   // Deep ward in red jungle (game ~10400, 8500)
  deepWardBotJungle:    { x: 0.30, y: 0.57 },   // Deep ward in blue jungle (game ~4400, 6400)
};

// i18n keys for zone names
const ZONE_I18N_KEYS: Record<string, string> = {
  blueGrompBush: "ward.zone.blueGrompBush",
  blueBlueBuff: "ward.zone.blueBlueBuff",
  blueBlueEntrance: "ward.zone.blueBlueEntrance",
  blueWolves: "ward.zone.blueWolves",
  blueRedBuff: "ward.zone.blueRedBuff",
  blueRedEntrance: "ward.zone.blueRedEntrance",
  blueKrugs: "ward.zone.blueKrugs",
  blueRaptors: "ward.zone.blueRaptors",
  redGrompBush: "ward.zone.redGrompBush",
  redBlueBuff: "ward.zone.redBlueBuff",
  redBlueEntrance: "ward.zone.redBlueEntrance",
  redWolves: "ward.zone.redWolves",
  redRedBuff: "ward.zone.redRedBuff",
  redRedEntrance: "ward.zone.redRedEntrance",
  redKrugs: "ward.zone.redKrugs",
  redRaptors: "ward.zone.redRaptors",
  dragonPit: "ward.zone.dragonPit",
  dragonBush: "ward.zone.dragonBush",
  dragonRiverEntrance: "ward.zone.dragonRiverEntrance",
  baronPit: "ward.zone.baronPit",
  baronBush: "ward.zone.baronBush",
  baronRiverEntrance: "ward.zone.baronRiverEntrance",
  topPixelBush: "ward.zone.topPixelBush",
  botPixelBush: "ward.zone.botPixelBush",
  midBushTopSide: "ward.zone.midBushTopSide",
  midBushBotSide: "ward.zone.midBushBotSide",
  topLaneRiverBush: "ward.zone.topLaneRiverBush",
  botLaneRiverBush: "ward.zone.botLaneRiverBush",
  blueTriBush: "ward.zone.blueTriBush",
  redTriBush: "ward.zone.redTriBush",
  deepWardTopJungle: "ward.zone.deepWardTopJungle",
  deepWardBotJungle: "ward.zone.deepWardBotJungle",
};

// ─── Generate ward points from match data ─────────────────────────────────────

function generateWardPoints(matches: MatchData[]): WardPoint[] {
  const points: WardPoint[] = [];
  const zones = Object.values(COMMON_WARD_ZONES);
  
  matches.forEach((match) => {
    const player = match.participants[match.playerParticipantIndex];
    if (!player) return;
    const gameMins = match.gameDuration / 60;
    const wardsPerZone = Math.max(1, Math.floor(player.wardsPlaced / 6));
    const controlWards = player.controlWardsPlaced;
    
    // Distribute wards across zones with some randomness
    const usedZones = new Set<number>();
    const totalWards = Math.min(player.wardsPlaced, 25);
    
    for (let i = 0; i < totalWards; i++) {
      // Prefer certain zones based on role
      let zoneIdx: number;
      const role = player.teamPosition;
      
      // Zone index ranges in COMMON_WARD_ZONES:
      // 0-7:   Blue jungle
      // 8-15:  Red jungle
      // 16-21: River & objectives (dragon, baron)
      // 22-23: Pixel bushes
      // 24-25: Mid lane bushes
      // 26-27: Lane river bushes
      // 28-29: Tri-bushes
      // 30-31: Deep wards
      
      if (role === "BOTTOM" || role === "UTILITY") {
        // Bot-side: dragon, bot tri-bush, bot river, blue red-side jungle
        const botZones = [4, 5, 6, 7, 16, 17, 18, 23, 27, 28];
        zoneIdx = Math.random() < 0.65
          ? botZones[Math.floor(Math.random() * botZones.length)]
          : Math.floor(Math.random() * zones.length);
      } else if (role === "TOP") {
        // Top-side: baron, top tri-bush, top river, red red-side jungle
        const topZones = [12, 13, 14, 15, 19, 20, 21, 22, 26, 29];
        zoneIdx = Math.random() < 0.65
          ? topZones[Math.floor(Math.random() * topZones.length)]
          : Math.floor(Math.random() * zones.length);
      } else if (role === "JUNGLE") {
        // Spread across all jungle + objectives
        zoneIdx = Math.floor(Math.random() * zones.length);
      } else {
        // Mid — pixel bushes, mid bushes, river entrances
        const midZones = [22, 23, 24, 25, 18, 21, 30, 31];
        zoneIdx = Math.random() < 0.55
          ? midZones[Math.floor(Math.random() * midZones.length)]
          : Math.floor(Math.random() * zones.length);
      }
      
      zoneIdx = Math.min(zoneIdx, zones.length - 1);
      const zone = zones[zoneIdx];
      
      // Add random jitter so wards cluster naturally
      const jitterX = (Math.random() - 0.5) * 0.035;
      const jitterY = (Math.random() - 0.5) * 0.035;
      
      // Determine phase
      const wardMinute = (i / totalWards) * gameMins;
      const phase: "early" | "mid" | "late" = wardMinute < 15 ? "early" : wardMinute < 25 ? "mid" : "late";
      
      // Type
      const type: "sight" | "control" | "farsight" = 
        i < controlWards ? "control" : 
        Math.random() < 0.1 ? "farsight" : "sight";
      
      points.push({
        x: Math.max(0.02, Math.min(0.98, zone.x + jitterX)),
        y: Math.max(0.02, Math.min(0.98, zone.y + jitterY)),
        type,
        phase,
        intensity: 0.3 + Math.random() * 0.7,
      });
    }
  });
  
  return points;
}

// ─── Compute vision stats ─────────────────────────────────────────────────────

function computeVisionStats(matches: MatchData[]): VisionStats {
  if (matches.length === 0) {
    return { avgWardsPlaced: 0, avgWardsDestroyed: 0, avgControlWards: 0, avgVisionScore: 0, avgVisionPerMin: 0, earlyGameScore: 0, midGameScore: 0, lateGameScore: 0 };
  }
  
  let totalWards = 0, totalControl = 0, totalVision = 0, totalVisionPerMin = 0;
  // We approximate wards destroyed from vision score - wards placed ratio
  let totalDestroyed = 0;
  
  matches.forEach(m => {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) return;
    totalWards += p.wardsPlaced;
    totalControl += p.controlWardsPlaced;
    totalVision += p.visionScore;
    totalVisionPerMin += p.visionScore / (m.gameDuration / 60);
    // Approximate wards destroyed
    totalDestroyed += Math.max(0, Math.round(p.visionScore * 0.3 - p.wardsPlaced * 0.1));
  });
  
  const n = matches.length;
  
  // Phase scores (normalized 0-100)
  const avgVPM = totalVisionPerMin / n;
  return {
    avgWardsPlaced: parseFloat((totalWards / n).toFixed(1)),
    avgWardsDestroyed: parseFloat((totalDestroyed / n).toFixed(1)),
    avgControlWards: parseFloat((totalControl / n).toFixed(1)),
    avgVisionScore: parseFloat((totalVision / n).toFixed(1)),
    avgVisionPerMin: parseFloat(avgVPM.toFixed(2)),
    earlyGameScore: Math.min(100, Math.round(avgVPM * 80)),
    midGameScore: Math.min(100, Math.round(avgVPM * 95)),
    lateGameScore: Math.min(100, Math.round(avgVPM * 110)),
  };
}

// ─── Vision tips ──────────────────────────────────────────────────────────────

const VISION_TIPS = [
  "Place a control ward in river brush before the 3-minute mark to track the enemy jungler's first gank path.",
  "Clear enemy wards near Dragon/Baron 60 seconds before they spawn to deny vision and set up plays.",
  "As support, use your Oracle Lens after placing your 3rd ward to maximize your vision denial.",
  "Deep wards in the enemy jungle provide the best information — place one at their buff when you have priority.",
  "In late game, ward the flanks around your team's formation, not just the objectives.",
  "Vision score above 1.5/min is considered excellent. Track yours to improve consistently.",
  "Control wards in pixel bushes (river edges near mid) give the longest-lasting vision value.",
  "Switch to Oracle Lens once your support item completes its ward quest for maximum efficiency.",
];

const VISION_TIP_KEYS = [
  "ward.tip1", "ward.tip2", "ward.tip3", "ward.tip4",
  "ward.tip5", "ward.tip6", "ward.tip7", "ward.tip8",
];
// ─── Canvas Minimap Renderer ──────────────────────────────────────────────────

// Helper: find nearest zone to a normalized point
function findNearestZone(nx: number, ny: number, threshold: number = 0.06): string | null {
  let nearest: string | null = null;
  let minDist = threshold;
  for (const [key, zone] of Object.entries(COMMON_WARD_ZONES)) {
    const dx = nx - zone.x;
    const dy = ny - zone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = key;
    }
  }
  return nearest;
}

function MinimapCanvas({ 
  wardPoints, 
  selectedPhase, 
  width, 
  height,
  patchVersion,
  onHoverZone,
  onHoverPos,
}: { 
  wardPoints: WardPoint[]; 
  selectedPhase: GamePhase; 
  width: number; 
  height: number;
  patchVersion: string;
  onHoverZone: (zone: string | null) => void;
  onHoverPos: (pos: { x: number; y: number; nx: number; ny: number } | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const filteredPoints = useMemo(() => {
    if (selectedPhase === "all") return wardPoints;
    return wardPoints.filter(p => p.phase === selectedPhase);
  }, [wardPoints, selectedPhase]);

  // Load the real Summoner's Rift minimap from DDragon
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/map/map11.png`;
    img.onload = () => {
      mapImgRef.current = img;
      setMapLoaded(true);
    };
    img.onerror = () => {
      // Fallback: try without specific patch version
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.src = "https://ddragon.leagueoflegends.com/cdn/14.10.1/img/map/map11.png";
      fallback.onload = () => {
        mapImgRef.current = fallback;
        setMapLoaded(true);
      };
    };
  }, [patchVersion]);
  
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // ── Draw minimap background ──
    if (mapImgRef.current) {
      // Draw the real Summoner's Rift minimap
      ctx.drawImage(mapImgRef.current, 0, 0, width, height);
      
      // Subtle desaturation + darken for a clean overlay look
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(10, 10, 18, 0.18)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      
      // Vignette effect — darkens edges, keeps center clear
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.28,
        width / 2, height / 2, width * 0.72
      );
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(1, "rgba(8, 8, 16, 0.45)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Fallback: dark terrain if image hasn't loaded
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
      bgGrad.addColorStop(0, "#1a1d25");
      bgGrad.addColorStop(1, "#13151b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }
    
    // ── Draw ward heatmap ──
    // First pass: soft ambient glow per ward cluster
    ctx.globalCompositeOperation = "screen";
    filteredPoints.forEach(point => {
      const px = point.x * width;
      const py = point.y * height;
      const radius = 10 + point.intensity * 8;
      
      const glowColor = point.type === "control" 
        ? `rgba(244, 114, 182, ${0.05 * point.intensity})`
        : point.type === "farsight"
        ? `rgba(96, 165, 250, ${0.04 * point.intensity})`
        : `rgba(139, 92, 246, ${0.06 * point.intensity})`;
      
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grad.addColorStop(0, glowColor);
      grad.addColorStop(0.6, glowColor.replace(/[\d.]+\)$/, "0)"));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    });
    ctx.globalCompositeOperation = "source-over";
    
    // Second pass: crisp ward dots with dark outline for readability
    filteredPoints.forEach(point => {
      const px = point.x * width;
      const py = point.y * height;
      const dotRadius = 2.5 + point.intensity * 1.2;
      
      // Dark outline ring
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.arc(px, py, dotRadius + 1.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Colored dot
      const dotColor = point.type === "control"
        ? `rgba(244, 114, 182, ${0.6 + point.intensity * 0.4})`
        : point.type === "farsight"
        ? `rgba(96, 165, 250, ${0.55 + point.intensity * 0.45})`
        : `rgba(167, 139, 250, ${0.55 + point.intensity * 0.45})`;
      
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Tiny bright center highlight
      if (point.intensity > 0.6) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(px - dotRadius * 0.2, py - dotRadius * 0.2, dotRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
  }, [filteredPoints, width, height, mapLoaded]);
  
  useEffect(() => {
    drawMap();
  }, [drawMap]);
  
  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
      onMouseMove={(e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = (e.clientX - rect.left) / rect.width;
        const my = (e.clientY - rect.top) / rect.height;
        const zone = findNearestZone(mx, my);
        onHoverZone(zone);
        if (zone) {
          // Pass both pixel position relative to container AND normalized coords
          onHoverPos({ 
            x: e.clientX - rect.left, 
            y: e.clientY - rect.top,
            nx: mx,
            ny: my,
          });
        } else {
          onHoverPos(null);
        }
      }}
      onMouseLeave={() => {
        onHoverZone(null);
        onHoverPos(null);
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WardHeatmap({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { version: patchVersion } = usePatchVersion();
  const { data: allWardMatches } = useAsyncData(() => getMatchHistory(), []);
  const rankedWard = allWardMatches?.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
  const matches = rankedWard && rankedWard.length > 0 ? rankedWard : allWardMatches;
  const [selectedPhase, setSelectedPhase] = useState<GamePhase>("all");
  const [tipIndex, setTipIndex] = useState(0);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; nx: number; ny: number } | null>(null);
  
  const wardPoints = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    return generateWardPoints(matches);
  }, [matches]);
  
  const stats = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    return computeVisionStats(matches);
  }, [matches]);
  
  // Count wards per zone for tooltip display
  const wardsPerZone = useMemo(() => {
    const zoneKeys = Object.keys(COMMON_WARD_ZONES);
    const zones = Object.values(COMMON_WARD_ZONES);
    const filteredPts = selectedPhase === "all" ? wardPoints : wardPoints.filter(p => p.phase === selectedPhase);
    const counts: Record<string, number> = {};
    filteredPts.forEach(point => {
      let minDist = 0.06;
      let nearest = "";
      zones.forEach((zone, idx) => {
        const dx = point.x - zone.x;
        const dy = point.y - zone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = zoneKeys[idx];
        }
      });
      if (nearest) {
        counts[nearest] = (counts[nearest] || 0) + 1;
      }
    });
    return counts;
  }, [wardPoints, selectedPhase]);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % VISION_TIPS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);
  
  const phases: { key: GamePhase; label: string }[] = [
    { key: "all", label: t("pool.all") },
    { key: "early", label: t("ward.earlyGame") },
    { key: "mid", label: t("ward.midGame") },
    { key: "late", label: t("ward.lateGame") },
  ];
  
  if (!matches || !stats) return null;

  const phasePointCount = selectedPhase === "all" ? wardPoints.length : wardPoints.filter(p => p.phase === selectedPhase).length;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex flex-col gap-6", className)}
    >
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-foreground flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-primary" />
          {t("ward.title")}
        </h2>
        <p className="text-[13px] text-muted-foreground mt-1">{t("ward.subtitle")}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          label={t("ward.placed")} 
          value={String(stats.avgWardsPlaced)} 
          subtext="/game"
          color="text-primary"
        />
        <StatCard 
          label={t("ward.destroyed")} 
          value={String(stats.avgWardsDestroyed)} 
          subtext="/game"
          color="text-pink-400"
        />
        <StatCard 
          label={t("ward.controlWards")} 
          value={String(stats.avgControlWards)} 
          subtext="/game"
          color="text-amber-400"
        />
        <StatCard 
          label={t("ward.visionScore")} 
          value={String(stats.avgVisionScore)}
          subtext={`${stats.avgVisionPerMin}/min`}
          color="text-emerald-400"
        />
      </div>

      {/* Heatmap + phase breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* Canvas Minimap */}
        <div className="flex flex-col gap-3">
          {/* Phase filter */}
          <div className="flex items-center gap-2">
            {phases.map(phase => (
              <button
                key={phase.key}
                onClick={() => setSelectedPhase(phase.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
                  selectedPhase === phase.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {phase.label}
              </button>
            ))}
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
              {t("ward.wardCount", { count: phasePointCount })}
            </span>
          </div>

          {/* Canvas */}
          <div className="relative bg-[#13151b] rounded-2xl border border-border/40 overflow-hidden aspect-square max-w-[480px]">
            <MinimapCanvas
              wardPoints={wardPoints}
              selectedPhase={selectedPhase}
              width={480}
              height={480}
              patchVersion={patchVersion}
              onHoverZone={setHoveredZone}
              onHoverPos={setTooltipPos}
            />
            
            {/* Zone tooltip */}
            <AnimatePresence>
              {hoveredZone && tooltipPos && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  className="absolute z-10 pointer-events-none bg-background/90 backdrop-blur-md rounded-lg px-3 py-2 border border-border/50 shadow-lg"
                  style={{
                    left: tooltipPos.x,
                    top: tooltipPos.y,
                    // Always centered above the cursor — no threshold-based flip that causes jitter
                    transform: tooltipPos.ny > 0.82
                      ? "translate(-50%, 12px)"    // near bottom: show below instead
                      : "translate(-50%, calc(-100% - 10px))",
                  }}
                >
                  <span className="text-[11px] font-semibold text-foreground block whitespace-nowrap">
                    {t(ZONE_I18N_KEYS[hoveredZone] || hoveredZone)}
                  </span>
                  {wardsPerZone[hoveredZone] && (
                    <span className="text-[10px] text-primary font-mono">
                      {wardsPerZone[hoveredZone]} {t("ward.sight").toLowerCase()}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border/30">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] text-muted-foreground">{t("ward.sight")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pink-400" />
                <span className="text-[10px] text-muted-foreground">{t("ward.control")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] text-muted-foreground">{t("ward.farsight")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel: Phase breakdown + tip */}
        <div className="flex flex-col gap-4">
          {/* Phase breakdown bars */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col gap-4">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("ward.visionByPhase")}
            </h3>
            <PhaseBar label={t("ward.earlyGame")} score={stats.earlyGameScore} color="bg-emerald-500" />
            <PhaseBar label={t("ward.midGame")} score={stats.midGameScore} color="bg-primary" />
            <PhaseBar label={t("ward.lateGame")} score={stats.lateGameScore} color="bg-amber-500" />
          </div>

          {/* Vision benchmark */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col gap-3">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("ward.visionBenchmark")}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">{t("ward.yourVpm")}</span>
              <span className="text-[14px] font-mono font-bold text-foreground">{stats.avgVisionPerMin}</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden relative">
              {/* Tier markers */}
              <div className="absolute top-0 left-[40%] w-px h-full bg-muted-foreground/20" />
              <div className="absolute top-0 left-[60%] w-px h-full bg-muted-foreground/20" />
              <div className="absolute top-0 left-[80%] w-px h-full bg-muted-foreground/20" />
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  stats.avgVisionPerMin >= 1.2 ? "bg-emerald-500" :
                  stats.avgVisionPerMin >= 0.8 ? "bg-primary" :
                  stats.avgVisionPerMin >= 0.5 ? "bg-amber-500" : "bg-destructive"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (stats.avgVisionPerMin / 1.5) * 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground/50">
              <span>{t("ward.tierIron")}</span>
              <span>{t("ward.tierSilver")}</span>
              <span>{t("ward.tierGold")}</span>
              <span>{t("ward.tierDiamond")}</span>
            </div>
          </div>

          {/* Vision tip */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block mb-1.5">
                  {t("ward.tip")}
                </span>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tipIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="text-[12px] text-muted-foreground leading-relaxed"
                  >
                    {t(VISION_TIP_KEYS[tipIndex])}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, subtext, color }: { label: string; value: string; subtext: string; color: string }) {
  return (
    <div className="p-3.5 rounded-xl border border-border/60 bg-card flex flex-col gap-1">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-[20px] font-mono font-bold", color)}>{value}</span>
        <span className="text-[10px] text-muted-foreground">{subtext}</span>
      </div>
    </div>
  );
}

function PhaseBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="text-[12px] font-mono font-bold text-foreground">{score}</span>
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}