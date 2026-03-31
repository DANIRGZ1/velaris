/**
 * GameTimeline — Interactive event timeline for PostGame analysis
 * 
 * Shows key events across the game duration:
 * - Deaths (with timestamps from deathTimestamps)
 * - First Blood
 * - Objective estimates (dragon, towers)
 * - Game phases (early/mid/late)
 */

import { cn } from "./ui/utils";
import { Skull, Crosshair, Castle, Flame, Flag, Trophy, Shield, Swords } from "lucide-react";
import { useState } from "react";
import type { MatchParticipant, MatchData } from "../utils/analytics";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  time: number; // minutes
  type: "death" | "kill" | "first-blood" | "tower" | "dragon" | "baron" | "game-end";
  label: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
}

type TFunc = (key: string, params?: Record<string, string | number>) => string;

// ─── Event Generation ─────────────────────────────────────────────────────────

export function generateTimelineEvents(match: MatchData, t: TFunc): TimelineEvent[] {
  const player = match.participants[match.playerParticipantIndex];
  const durationMin = match.gameDuration / 60;
  const events: TimelineEvent[] = [];

  // Deaths
  player.deathTimestamps.forEach((ts, i) => {
    const isEarly = ts <= 5;
    events.push({
      time: ts,
      type: "death",
      label: t("timeline.death", { num: i + 1 }),
      description: isEarly 
        ? t("timeline.earlyDeathDesc", { time: formatMin(ts) })
        : t("timeline.deathDesc", { time: formatMin(ts) }),
      impact: "negative",
    });
  });

  // First Blood
  if (player.firstBloodKill) {
    const fbTime = Math.min(3, player.deathTimestamps[0] || 3) - 0.5;
    events.push({
      time: Math.max(1.5, fbTime),
      type: "first-blood",
      label: t("timeline.firstBlood"),
      description: t("timeline.firstBloodDesc"),
      impact: "positive",
    });
  }

  // Estimated tower takes
  if (player.turretKills >= 1) {
    const towerTimes = [];
    if (durationMin > 12) towerTimes.push(12 + Math.random() * 4);
    if (player.turretKills >= 2 && durationMin > 20) towerTimes.push(20 + Math.random() * 5);
    if (player.turretKills >= 3 && durationMin > 28) towerTimes.push(28 + Math.random() * 4);
    
    towerTimes.slice(0, player.turretKills).forEach((ts, i) => {
      events.push({
        time: ts,
        type: "tower",
        label: t("timeline.tower", { num: i + 1 }),
        description: t("timeline.towerDesc"),
        impact: "positive",
      });
    });
  }

  // Estimated dragon kills
  if (player.dragonKills >= 1) {
    for (let i = 0; i < player.dragonKills; i++) {
      events.push({
        time: 6 + i * 5 + Math.random() * 3,
        type: "dragon",
        label: t("timeline.dragon", { num: i + 1 }),
        description: t("timeline.dragonDesc"),
        impact: "positive",
      });
    }
  }

  // Kill sprees
  if (player.kills >= 5) {
    const midPoint = durationMin / 2;
    events.push({
      time: midPoint + Math.random() * 5,
      type: "kill",
      label: t("timeline.killSpree"),
      description: t("timeline.killSpreeDesc"),
      impact: "positive",
    });
  }

  // Game end
  events.push({
    time: durationMin,
    type: "game-end",
    label: player.win ? t("timeline.victory") : t("timeline.defeat"),
    description: player.win
      ? t("timeline.victoryDesc", { time: formatMin(durationMin) })
      : t("timeline.defeatDesc", { time: formatMin(durationMin) }),
    impact: player.win ? "positive" : "negative",
  });

  return events.sort((a, b) => a.time - b.time);
}

function formatMin(minutes: number): string {
  const m = Math.floor(minutes);
  const s = Math.round((minutes % 1) * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── UI Component ─────────────────────────────────────────────────────────────

const EVENT_ICONS: Record<TimelineEvent["type"], typeof Skull> = {
  "death": Skull,
  "kill": Swords,
  "first-blood": Crosshair,
  "tower": Castle,
  "dragon": Flame,
  "baron": Shield,
  "game-end": Flag,
};

const EVENT_COLORS: Record<TimelineEvent["impact"], { dot: string; text: string; bg: string }> = {
  positive: { dot: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/10" },
  negative: { dot: "bg-red-500", text: "text-red-500", bg: "bg-red-500/10" },
  neutral: { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-secondary" },
};

export function GameTimeline({ match, className }: { match: MatchData; className?: string }) {
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);
  const { t } = useLanguage();
  const events = generateTimelineEvents(match, t);
  const durationMin = match.gameDuration / 60;
  const player = match.participants[match.playerParticipantIndex];

  // Phase boundaries
  const earlyEnd = 14;
  const midEnd = 25;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Visual timeline bar */}
      <div className="relative">
        {/* Phase background */}
        <div className="h-10 rounded-xl overflow-hidden flex bg-secondary/50 border border-border/40">
          <div className="h-full bg-blue-500/8 border-r border-border/30" style={{ width: `${(earlyEnd / durationMin) * 100}%` }}>
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400/60 px-2 pt-1 block">{t("timeline.early")}</span>
          </div>
          <div className="h-full bg-amber-500/8 border-r border-border/30" style={{ width: `${((midEnd - earlyEnd) / durationMin) * 100}%` }}>
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/60 px-2 pt-1 block">{t("timeline.mid")}</span>
          </div>
          <div className="h-full bg-purple-500/8" style={{ width: `${((durationMin - midEnd) / durationMin) * 100}%` }}>
            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400/60 px-2 pt-1 block">{t("timeline.late")}</span>
          </div>
        </div>

        {/* Event markers on the bar */}
        {events.filter(e => e.type !== "game-end").map((event, i) => {
          const leftPct = Math.min(97, Math.max(1, (event.time / durationMin) * 100));
          const colors = EVENT_COLORS[event.impact];
          const Icon = EVENT_ICONS[event.type];
          const isHovered = hoveredEvent === i;

          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 z-10"
              style={{ left: `${leftPct}%` }}
              onMouseEnter={() => setHoveredEvent(i)}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              <div className={cn(
                "w-5 h-5 -ml-2.5 rounded-full flex items-center justify-center border-2 border-card cursor-pointer transition-transform",
                colors.dot,
                isHovered && "scale-150 z-20"
              )}>
                <Icon className="w-2.5 h-2.5 text-white" />
              </div>
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg p-2.5 min-w-[180px] z-30 pointer-events-none">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={cn("w-3 h-3", colors.text)} />
                    <span className="text-[11px] font-semibold text-foreground">{event.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">{formatMin(event.time)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{event.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground px-1">
        <span>0:00</span>
        <span>{formatMin(earlyEnd)}</span>
        <span>{formatMin(midEnd)}</span>
        <span>{formatMin(durationMin)}</span>
      </div>

      {/* Event list */}
      <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
        {events.map((event, i) => {
          const colors = EVENT_COLORS[event.impact];
          const Icon = EVENT_ICONS[event.type];
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[12px]",
                hoveredEvent === i ? "bg-secondary" : "hover:bg-secondary/50"
              )}
              onMouseEnter={() => setHoveredEvent(i)}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              <span className="font-mono text-[11px] text-muted-foreground w-10 shrink-0 tabular-nums">
                {formatMin(event.time)}
              </span>
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", colors.bg)}>
                <Icon className={cn("w-3 h-3", colors.text)} />
              </div>
              <span className="text-foreground font-medium truncate">{event.label}</span>
              <span className="text-muted-foreground truncate hidden sm:block flex-1 text-right">{event.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
