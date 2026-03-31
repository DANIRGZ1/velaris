/**
 * OverlayInGame - Dedicated overlay rendered in a separate Tauri window
 *
 * The overlay window is fullscreen, transparent, always-on-top.
 *
 * Modes:
 *   Passive (default) — click-through ON, mouse goes to game
 *   Interactive (F8)  — click-through OFF, widgets are draggable/clickable
 *
 * Hotkeys:
 *   F8 — toggle interactive mode (drag widgets, click spells)
 *   F9 — toggle overlay visibility
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, EyeOff, Swords, Move, Settings, Eye } from "lucide-react";
import { cn } from "../components/ui/utils";
import { getLiveGameData, getMockLiveGameData } from "../services/dataService";
import type { LiveGameData } from "../services/dataService";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { CHAMPION_BUILDS } from "../data/champion-builds";
import { getMatchupTip } from "../utils/matchups";
import { CHAMPION_META, TIER_COLOR, ARCHETYPE_COLOR, ARCHETYPE_LABEL, getTeamComp } from "../data/champion-meta";
import { tauriInvoke, tauriListen, closeWindow } from "../helpers/tauriWindow";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WidgetPos { x: number; y: number }

// ─── Spell icon key resolver (display only — no cooldown tracking) ───────────
// rawDisplayName formats from Live Client API:
//   Format A: "GeneratedTip_SummonerKey_SummonerFlash_DisplayName"
//   Format B: "SummonerFlash" (some patches return the ID directly)
//   Format C (old): "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName"
const DISPLAY_NAME_TO_KEY: Record<string, string> = {
  // English
  "flash": "SummonerFlash",
  "teleport": "SummonerTeleport",
  "unleashed teleport": "SummonerTeleport",
  "tp": "SummonerTeleport",
  "smite": "SummonerSmite",
  "challenging smite": "SummonerSmiteAvatarOffensive",
  "chilling smite": "SummonerSmiteAvatarUtility",
  "ignite": "SummonerDot",
  "heal": "SummonerHeal",
  "exhaust": "SummonerExhaust",
  "barrier": "SummonerBarrier",
  "cleanse": "SummonerBoost",
  "ghost": "SummonerHaste",
  "mark": "SummonerSnowball",
  "clarity": "SummonerMana",
  // Spanish
  "destello": "SummonerFlash",
  "teletransporte": "SummonerTeleport",
  "castigo": "SummonerSmite",
  "abrasar": "SummonerDot",
  "curar": "SummonerHeal",
  "agotamiento": "SummonerExhaust",
  "barrera": "SummonerBarrier",
  "purificar": "SummonerBoost",
  "fantasma": "SummonerHaste",
  "marca": "SummonerSnowball",
  "claridad": "SummonerMana",
};

function resolveSpellKey(spell: { displayName: string; rawDisplayName: string }): string {
  if (spell.rawDisplayName) {
    // Format A: "GeneratedTip_SummonerKey_SummonerFlash_DisplayName"
    const mA = spell.rawDisplayName.match(/SummonerKey_(\w+?)(?:_DisplayName|$)/);
    if (mA?.[1]) return mA[1];
    // Format B: "SummonerFlash" directly
    if (/^Summoner\w+$/.test(spell.rawDisplayName)) return spell.rawDisplayName;
    // Format C (old): "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName"
    const mC = spell.rawDisplayName.match(/SummonerSpell_(\w+)_DisplayName/i);
    if (mC?.[1]) return mC[1];
  }
  // Fallback: displayName lookup (English + Spanish)
  return DISPLAY_NAME_TO_KEY[spell.displayName.toLowerCase()] ?? "SummonerFlash";
}

const OBJECTIVE_RESPAWNS: Record<string, number> = {
  "Dragon": 300,
  "Baron": 360,
  "RiftHerald": 360,
};

// ─── Live Client event types ─────────────────────────────────────────────────
interface DragonKillEvent {
  EventName: "DragonKill";
  DragonType: string;
  [key: string]: unknown;
}

// ─── Summoner spell data ──────────────────────────────────────────────────────
const SPELL_KEY: Record<number, string> = {
  1: "SummonerBoost", 3: "SummonerExhaust", 4: "SummonerFlash",
  6: "SummonerHaste", 7: "SummonerHeal", 11: "SummonerSmite",
  12: "SummonerTeleport", 13: "SummonerMana", 14: "SummonerDot",
  21: "SummonerBarrier", 32: "SummonerSnowball",
};
const SPELL_NAME: Record<number, string> = {
  1: "Cleanse", 3: "Exhaust", 4: "Flash", 6: "Ghost",
  7: "Heal", 11: "Smite", 12: "TP", 13: "Clarity",
  14: "Ignite", 21: "Barrier", 32: "Mark",
};

// ─── Role colors ──────────────────────────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  TOP: "#ef4444", JGL: "#22c55e", MID: "#3b82f6",
  ADC: "#f59e0b", SUP: "#a855f7",
};


// ─── localStorage helpers ────────────────────────────────────────────────────

function loadPos(key: string, def: WidgetPos): WidgetPos {
  try {
    const raw = localStorage.getItem(`velaris-overlay-${key}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return def;
}

function savePos(key: string, pos: WidgetPos) {
  try {
    localStorage.setItem(`velaris-overlay-${key}`, JSON.stringify(pos));
  } catch {}
}

// ─── DraggableWidget ─────────────────────────────────────────────────────────

interface DraggableWidgetProps {
  id: string;
  defaultPos: WidgetPos;
  draggable: boolean;
  className?: string;
  children: React.ReactNode;
}

function DraggableWidget({ id, defaultPos, draggable, className, children }: DraggableWidgetProps) {
  const [pos, setPos] = useState<WidgetPos>(() => loadPos(id, defaultPos));
  // Keep a ref so the Tauri event callbacks always see the latest pos
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const dragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos  = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag via WH_MOUSE_LL Tauri events (overlay stays click-through at all times,
  // so DOM mouse events never fire — we receive them from the global Rust hook).
  useEffect(() => {
    if (!draggable) return;
    const dpr = window.devicePixelRatio || 1;

    const p1 = tauriListen("overlay-mouse-down", (e) => {
      const [sx, sy] = e.payload as [number, number];
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = sx / dpr;
      const cy = sy / dpr;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
        dragging.current = true;
        startMouse.current = { x: cx, y: cy };
        startPos.current  = { ...posRef.current };
      }
    });

    const p2 = tauriListen("overlay-mouse-move", (e) => {
      if (!dragging.current) return;
      const [sx, sy] = e.payload as [number, number];
      const cx = sx / dpr;
      const cy = sy / dpr;
      setPos({
        x: startPos.current.x + (cx - startMouse.current.x),
        y: startPos.current.y + (cy - startMouse.current.y),
      });
    });

    const p3 = tauriListen("overlay-mouse-up", () => {
      if (!dragging.current) return;
      dragging.current = false;
      setPos(cur => { savePos(id, cur); return cur; });
    });

    return () => {
      p1.then(fn => fn()).catch(() => {});
      p2.then(fn => fn()).catch(() => {});
      p3.then(fn => fn()).catch(() => {});
    };
  }, [draggable, id]);

  return (
    <div
      ref={containerRef}
      draggable={false}
      className={cn("absolute", draggable && "ring-1 ring-amber-400/40 rounded-xl", className)}
      style={{ left: pos.x, top: pos.y }}
    >
      {draggable && (
        <div className="absolute -top-4 left-0 right-0 flex items-center justify-center gap-1 h-4 pointer-events-none">
          <Move className="w-2.5 h-2.5 text-amber-400/70" />
          <span className="text-[7px] text-amber-400/60 uppercase tracking-widest font-bold">arrastrar</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Overlay Stats Settings ──────────────────────────────────────────────────

type OverlayStats = {
  goldDiff: boolean;
  dragon: boolean;
  baron: boolean;
  csPerMin: boolean;
  visionScore: boolean;
  killParticipation: boolean;
  skillOrder: boolean;
  enemySpells: boolean;
  csComparison: boolean;
};

const STATS_STORAGE_KEY = "velaris-overlay-stats";
const DEFAULT_STATS: OverlayStats = {
  goldDiff: true, dragon: true, baron: true,
  csPerMin: true, visionScore: true, killParticipation: true,
  skillOrder: true, enemySpells: true, csComparison: true,
};
const STATS_LABELS: Record<keyof OverlayStats, string> = {
  goldDiff: "Gold diff", dragon: "Dragon", baron: "Baron",
  csPerMin: "CS/min", visionScore: "Vision/min", killParticipation: "Kill Part.",
  skillOrder: "Skill Order", enemySpells: "Enemy Spells", csComparison: "CS por carril",
};

function loadOverlayStats(): OverlayStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_STATS };
}

function saveOverlayStats(s: OverlayStats) {
  try { localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OverlayInGame() {
  const { version: patchVersion } = usePatchVersion();
  const { t } = useLanguage();
  const [gameData, setGameData] = useState<LiveGameData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [overlayStats, setOverlayStats] = useState<OverlayStats>(loadOverlayStats);
  const [objectiveTimers, setObjectiveTimers] = useState<Record<string, number>>({});
  const [dragonKills, setDragonKills] = useState<string[]>([]);
  const lastEventId = useRef(0);

  // ─── Transparent background — runs before first paint so there's no flash ──
  useLayoutEffect(() => {
    document.documentElement.classList.add("overlay-window");
    return () => {
      document.documentElement.classList.remove("overlay-window");
    };
  }, []);

  // ─── Interactive mode: toggle click-through via Tauri ─────────────────────
  const toggleInteractive = useCallback(() => {
    setInteractiveMode(v => !v);
  }, []);

  // Sync interactive state to backend. Runs whenever interactiveMode changes.
  // Kept outside the toggler so the invoke is never called inside a state setter.
  useEffect(() => {
    tauriInvoke("set_overlay_interactive", { interactive: interactiveMode }).catch(() => {});
  }, [interactiveMode]);

  // ─── Hotkeys via WH_KEYBOARD_LL (emitted from Rust) ──────────────────────
  useEffect(() => {
    const p1 = tauriListen("overlay-toggle-interactive", () => toggleInteractive());
    const p2 = tauriListen("overlay-toggle-visibility", () => setIsVisible(v => !v));
    // Fallback: if Rust fails to close the window, close ourselves on phase change
    const p3 = tauriListen("lcu-phase-changed", (e) => {
      const phase = e.payload as string;
      if (phase === "END_OF_GAME" || phase === "LOBBY" || phase === "DISCONNECTED") {
        closeWindow().catch(() => {});
      }
    });
    return () => {
      p1.then(fn => fn()).catch(() => {});
      p2.then(fn => fn()).catch(() => {});
      p3.then(fn => fn()).catch(() => {});
    };
  }, [toggleInteractive]);

  // ─── Poll Live Client Data ─────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    let nullStreak = 0;
    let everReceivedData = false;
    const poll = async () => {
      try {
        const data = await getLiveGameData();
        if (active) {
          if (data) {
            nullStreak = 0;
            everReceivedData = true;
            setGameData(data);
            processEvents(data);
          } else if (everReceivedData) {
            // API stopped responding after game was active — game likely ended.
            // Close after ~10s of silence.
            nullStreak++;
            if (nullStreak >= 5) closeWindow().catch(() => {});
          }
          // If we've never received data yet (game still loading), keep waiting.
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Process game events ──────────────────────────────────────────────────
  const processEvents = useCallback((data: LiveGameData) => {
    if (!data.events?.Events) return;
    const newEvents = data.events.Events.filter(e => e.EventID > lastEventId.current);
    if (!newEvents.length) return;
    lastEventId.current = Math.max(...data.events.Events.map(e => e.EventID));
    newEvents.forEach(event => {
      if (event.EventName === "DragonKill") {
        const dragonType: string = (event as DragonKillEvent).DragonType || "unknown";
        setDragonKills(prev => [...prev, dragonType]);
        setObjectiveTimers(prev => ({ ...prev, Dragon: OBJECTIVE_RESPAWNS.Dragon }));
      } else if (event.EventName === "BaronKill") {
        setObjectiveTimers(prev => ({ ...prev, Baron: OBJECTIVE_RESPAWNS.Baron }));
      } else if (event.EventName === "HeraldKill") {
        setObjectiveTimers(prev => ({ ...prev, RiftHerald: OBJECTIVE_RESPAWNS.RiftHerald }));
      }
    });
  }, []);


  // ─── Tick objective timers ────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setObjectiveTimers(prev => {
        const next: Record<string, number> = {};
        Object.entries(prev).forEach(([k, v]) => { if (v > 1) next[k] = v - 1; });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);


  // ─── Derived data ─────────────────────────────────────────────────────────
  const activeTeam = gameData?.allPlayers?.find(
    ap => ap.summonerName === gameData.activePlayer.summonerName
  )?.team;
  const allies = gameData?.allPlayers?.filter(p => p.team === activeTeam) || [];
  const enemies = gameData?.allPlayers?.filter(p => p.team !== activeTeam) || [];
  const gameTime = gameData?.gameData?.gameTime || 0;

  // CS benchmarks by role (cs/min at different game stages — industry standard)
  const CS_BENCHMARKS: Record<string, number> = {
    TOP: 6.5, JGL: 5.5, MID: 7.0, ADC: 8.0, SUP: 1.5,
  };

  const myPlayer = gameData?.allPlayers?.find(p => p.summonerName === gameData?.activePlayer?.summonerName);
  const myCS = myPlayer?.scores?.creepScore ?? 0;
  const gameMinutes = Math.max(gameTime / 60, 1);
  const csPerMin = gameMinutes > 1 ? parseFloat((myCS / gameMinutes).toFixed(1)) : 0;
  // Try to detect role from champion name (rough approximation)
  const myChampName = myPlayer?.championName ?? "";
  const myRole = CHAMPION_BUILDS[myChampName]?.role ?? "MID";
  const CS_TARGET = CS_BENCHMARKS[myRole] ?? CS_BENCHMARKS["MID"];
  const showFarmAlarm = gameMinutes > 3 && csPerMin < CS_TARGET;

  // Skill order from static data
  const skillMax = CHAMPION_BUILDS[myChampName]?.skillMax ?? null;

  // Kill participation
  const myKills = myPlayer?.scores.kills ?? 0;
  const myAssists = myPlayer?.scores.assists ?? 0;
  const allyTotalKills = allies.reduce((s, p) => s + p.scores.kills, 0);
  const myKP = allyTotalKills > 0 ? Math.round(((myKills + myAssists) / allyTotalKills) * 100) : 0;

  // Current gold
  const myGold = gameData?.activePlayer?.currentGold ?? 0;

  const teamGoldDiff = useMemo(() => {
    if (!allies.length || !enemies.length) return 0;
    const score = (players: typeof allies) =>
      players.reduce((s, p) => s + p.scores.kills * 300 + p.scores.assists * 150 + p.scores.creepScore * 20, 0);
    return score(allies) - score(enemies);
  }, [allies, enemies]);

  const laneMatchups = useMemo(() => {
    if (!allies.length || !enemies.length) return [];
    const LANE_PATTERNS: Record<string, string[]> = {
      TOP: ["Top"], JGL: ["Jgl", "Jungle"], MID: ["Mid", "Middle"],
      ADC: ["ADC", "Bot", "Bottom"], SUP: ["Sup", "Support", "Utility"],
    };
    return Object.entries(LANE_PATTERNS).flatMap(([lane, patterns]) => {
      const ally = allies.find(a => patterns.some(p => a.summonerName.toLowerCase().includes(p.toLowerCase())));
      const enemy = enemies.find(e => patterns.some(p => e.summonerName.toLowerCase().includes(p.toLowerCase())));
      if (!ally || !enemy) return [];
      return [{ lane, allyCS: ally.scores.creepScore, enemyCS: enemy.scores.creepScore,
        diff: ally.scores.creepScore - enemy.scores.creepScore,
        allyChamp: ally.championName, enemyChamp: enemy.championName }];
    });
  }, [allies, enemies]);

  const teamKDA = useMemo(() => ({
    allyK: allies.reduce((s, p) => s + p.scores.kills, 0),
    allyD: allies.reduce((s, p) => s + p.scores.deaths, 0),
    allyA: allies.reduce((s, p) => s + p.scores.assists, 0),
    enemyK: enemies.reduce((s, p) => s + p.scores.kills, 0),
    enemyD: enemies.reduce((s, p) => s + p.scores.deaths, 0),
    enemyA: enemies.reduce((s, p) => s + p.scores.assists, 0),
  }), [allies, enemies]);

  const killParticipation = useMemo(() => {
    const myK = myPlayer?.scores.kills ?? 0;
    const myA = myPlayer?.scores.assists ?? 0;
    const teamK = teamKDA.allyK;
    return teamK > 0 ? Math.round(((myK + myA) / teamK) * 100) : 0;
  }, [myPlayer, teamKDA.allyK]);

  const myVisionPerMin = myPlayer && gameMinutes > 1
    ? parseFloat((myPlayer.scores.wardScore / gameMinutes).toFixed(1))
    : 0;

  const toggleStat = (key: keyof OverlayStats) => {
    setOverlayStats(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveOverlayStats(next);
      return next;
    });
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-transparent overflow-hidden select-none"
      style={{ pointerEvents: interactiveMode ? "auto" : "none" }}
    >
      {/* ─── Interactive mode banner ─── */}
      <AnimatePresence>
        {interactiveMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-b-xl backdrop-blur-md"
            style={{ pointerEvents: "none" }}
          >
            <Move className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
              {t("overlay.editMode")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Passive hint: tell the user F8 activates the overlay ─── */}
      <AnimatePresence>
        {!interactiveMode && isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{
              pointerEvents: "none",
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(6px)",
            }}
          >
            <kbd
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.55)",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "4px",
                padding: "1px 5px",
              }}
            >
              F8
            </kbd>
            <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)" }}>
              {t("overlay.f8Hint")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <>

            {/* ─── Main Info Widget (Velaris Overlay) ─── */}
            <DraggableWidget
              id="main-widget"
              defaultPos={{ x: window.innerWidth / 2 - 80, y: 12 }}
              draggable={interactiveMode}
            >
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col p-3 shadow-2xl min-w-[160px]"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(12px)",
                  border: interactiveMode ? "1px solid rgba(255,214,10,0.35)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  pointerEvents: interactiveMode ? "auto" : "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.7rem",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                  <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                    Velaris Overlay
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowSettings(v => !v); }}
                    style={{
                      background: showSettings ? "rgba(94,92,230,0.25)" : "transparent",
                      border: "none", cursor: "pointer", padding: "3px", borderRadius: "4px",
                      display: "flex", alignItems: "center", pointerEvents: "auto",
                    }}
                  >
                    <Settings style={{ width: 10, height: 10, color: showSettings ? "#7b79ff" : "rgba(255,255,255,0.3)" }} />
                  </button>
                </div>

                {/* Gold diff */}
                {overlayStats.goldDiff && allies.length > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Gold diff</span>
                      <span style={{ fontWeight: 700, color: teamGoldDiff > 0 ? "#30d158" : teamGoldDiff < 0 ? "#ff453a" : "rgba(255,255,255,0.8)" }}>
                        {teamGoldDiff > 0 ? "+" : ""}{(teamGoldDiff / 1000).toFixed(1)}k
                      </span>
                    </div>
                    <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px", overflow: "hidden", marginTop: "0.3rem", marginBottom: "0.6rem" }}>
                      <div style={{
                        height: "100%", borderRadius: "9999px",
                        background: teamGoldDiff >= 0 ? "#5e5ce6" : "#ff453a",
                        width: `${Math.min(Math.max(50 + (teamGoldDiff / 200), 5), 95)}%`,
                        transition: "width 0.7s ease",
                      }} />
                    </div>
                  </>
                )}

                {/* Dragon */}
                {overlayStats.dragon && (() => {
                  const timer = objectiveTimers["Dragon"];
                  const drakeColors: Record<string, string> = {
                    fire: "#ef4444", earth: "#a16207", water: "#3b82f6",
                    air: "#6ee7b7", hextech: "#a855f7", chemtech: "#22c55e", elder: "#f59e0b",
                  };
                  const lastDrake = dragonKills[dragonKills.length - 1];
                  const isAlive = timer === undefined;
                  const beforeSpawn = gameTime > 0 && gameTime < 300;
                  const valueColor = !isAlive ? "#ffd60a" : beforeSpawn ? "rgba(255,255,255,0.25)" : "#30d158";
                  const valueText = !isAlive ? formatTimer(timer) : beforeSpawn ? formatTimer(300 - gameTime) : "Alive";
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ color: "rgba(255,255,255,0.35)" }}>Dragon</span>
                        {dragonKills.slice(-4).map((d, i) => (
                          <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: drakeColors[d] ?? "#ffd60a", flexShrink: 0 }} />
                        ))}
                      </div>
                      <span style={{ fontWeight: 700, color: valueColor }}>{valueText}</span>
                    </div>
                  );
                })()}

                {/* Baron */}
                {overlayStats.baron && (() => {
                  const timer = objectiveTimers["Baron"];
                  const isAlive = timer === undefined;
                  const beforeSpawn = gameTime > 0 && gameTime < 1200;
                  const valueColor = !isAlive ? "#a78bfa" : beforeSpawn ? "rgba(255,255,255,0.25)" : "#30d158";
                  const valueText = !isAlive ? formatTimer(timer) : beforeSpawn ? formatTimer(1200 - gameTime) : "Alive";
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Baron</span>
                      <span style={{ fontWeight: 700, color: valueColor }}>{valueText}</span>
                    </div>
                  );
                })()}

                {/* CS/min */}
                {overlayStats.csPerMin && gameTime > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", marginTop: "0.1rem" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>CS/min</span>
                      <span style={{ fontWeight: 700, color: showFarmAlarm ? "#ff453a" : "rgba(255,255,255,0.9)" }}>
                        {csPerMin}
                      </span>
                    </div>
                    <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px", overflow: "hidden", marginTop: "0.3rem" }}>
                      <div style={{
                        height: "100%", borderRadius: "9999px",
                        background: showFarmAlarm ? "#ff453a" : "#30d158",
                        width: `${Math.min((csPerMin / CS_TARGET) * 100, 100)}%`,
                        transition: "width 0.7s ease",
                      }} />
                    </div>
                  </>
                )}

                {/* Vision/min */}
                {overlayStats.visionScore && myPlayer && gameMinutes > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", marginTop: "0.1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Eye style={{ width: 9, height: 9, color: "rgba(255,255,255,0.25)" }} />
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Vision/min</span>
                    </div>
                    <span style={{ fontWeight: 700, color: myVisionPerMin >= 1.5 ? "#30d158" : myVisionPerMin >= 0.8 ? "rgba(255,255,255,0.8)" : "#ff453a" }}>
                      {myVisionPerMin}
                    </span>
                  </div>
                )}

                {/* Kill Participation */}
                {overlayStats.killParticipation && myPlayer && teamKDA.allyK > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", marginTop: "0.1rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>KP</span>
                    <span style={{ fontWeight: 700, color: killParticipation >= 60 ? "#30d158" : killParticipation >= 40 ? "rgba(255,255,255,0.8)" : "#ff453a" }}>
                      {killParticipation}%
                    </span>
                  </div>
                )}

                {/* Skill order */}
                {overlayStats.skillOrder && skillMax && myChampName && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.55rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Max</span>
                    {skillMax.split(" > ").map((sk, i, arr) => (
                      <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                        <span style={{
                          width: "16px", height: "16px", borderRadius: "4px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.65rem", fontWeight: 700,
                          background: i === 0 ? "rgba(94,92,230,0.2)" : "rgba(255,255,255,0.05)",
                          color: i === 0 ? "#7b79ff" : i === 1 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)",
                          border: i === 0 ? "1px solid rgba(94,92,230,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        }}>
                          {sk}
                        </span>
                        {i < arr.length - 1 && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.55rem" }}>›</span>}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            </DraggableWidget>

            {/* ─── Settings Panel ─── */}
            {showSettings && (
              <div
                style={{
                  position: "fixed", top: 58, left: "50%", transform: "translateX(-50%)",
                  zIndex: 9999, pointerEvents: "auto",
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-1 p-3 shadow-2xl"
                  style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(94,92,230,0.35)", borderRadius: "12px", minWidth: "190px" }}
                >
                  <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em] mb-1">Estadísticas visibles</div>
                  {(Object.keys(DEFAULT_STATS) as (keyof OverlayStats)[]).map(key => (
                    <button
                      key={key}
                      onClick={(e) => { e.stopPropagation(); toggleStat(key); }}
                      className="flex items-center justify-between gap-3 px-1 py-0.5 rounded"
                      style={{ cursor: "pointer", background: "transparent", border: "none", pointerEvents: "auto" }}
                    >
                      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.65)" }}>{STATS_LABELS[key]}</span>
                      <div style={{
                        width: 28, height: 16, borderRadius: 8, padding: 2,
                        background: overlayStats[key] ? "#5e5ce6" : "rgba(255,255,255,0.1)",
                        display: "flex", alignItems: "center",
                        justifyContent: overlayStats[key] ? "flex-end" : "flex-start",
                        transition: "background 0.2s, justify-content 0s",
                        flexShrink: 0,
                      }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "white", transition: "none" }} />
                      </div>
                    </button>
                  ))}
                </motion.div>
              </div>
            )}

            {/* ─── Enemy Spells (display only — no cooldown tracking per Riot policy) ─── */}
            {overlayStats.enemySpells && enemies.length > 0 && (
              <DraggableWidget
                id="spell-tracker"
                defaultPos={{ x: 12, y: window.innerHeight / 4 }}
                draggable={interactiveMode}
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-1.5 p-2 shadow-2xl"
                  style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", border: interactiveMode ? "1px solid rgba(255,214,10,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", pointerEvents: interactiveMode ? "auto" : "none" }}
                >
                  <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em] px-1 mb-0.5">
                    Enemy Spells
                  </div>
                  {enemies.map((enemy) => (
                    <div key={enemy.summonerName} className="flex items-center gap-2 py-0.5">
                      <div className="relative">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${enemy.championName}.png`}
                          alt={enemy.championName}
                          className={cn(
                            "w-7 h-7 rounded-full border",
                            enemy.isDead ? "border-red-500/50 grayscale opacity-50" : "border-white/20"
                          )}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/Aatrox.png`;
                          }}
                        />
                        {enemy.isDead && enemy.respawnTimer > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-mono font-bold text-red-400 drop-shadow-lg">
                              {Math.ceil(enemy.respawnTimer)}
                            </span>
                          </div>
                        )}
                      </div>
                      {[enemy.summonerSpells.summonerSpellOne, enemy.summonerSpells.summonerSpellTwo].map((spell, idx) => {
                        const spellImgKey = resolveSpellKey(spell);
                        return (
                          <div
                            key={idx}
                            className="w-6 h-6 rounded overflow-hidden border border-white/15"
                            title={spell.displayName}
                          >
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/spell/${spellImgKey}.png`}
                              alt={spell.displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/spell/SummonerFlash.png`;
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </motion.div>
              </DraggableWidget>
            )}

            {/* ─── CS Diff by Lane (draggable) ─── */}
            {overlayStats.csComparison && laneMatchups.length > 0 && (
              <DraggableWidget
                id="cs-diff"
                defaultPos={{ x: window.innerWidth - 160, y: window.innerHeight / 4 }}
                draggable={interactiveMode}
              >
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-1 p-2 shadow-2xl"
                  style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", border: interactiveMode ? "1px solid rgba(255,214,10,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", pointerEvents: interactiveMode ? "auto" : "none" }}
                >
                  <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em] px-1 mb-1">
                    CS by Lane
                  </div>
                  {laneMatchups.map((m) => (
                    <div key={m.lane} className="flex items-center gap-2 px-1 py-0.5">
                      <span className="text-[9px] font-bold text-white/40 w-7 shrink-0">{m.lane}</span>
                      <span className={cn(
                        "text-[10px] font-mono font-bold tabular-nums w-10 text-right",
                        m.diff > 0 ? "text-[#5e5ce6]" : m.diff < 0 ? "text-[#ff453a]" : "text-white/40"
                      )}>
                        {m.diff > 0 ? "+" : ""}{m.diff}
                      </span>
                      <div className="w-[60px] h-1 bg-white/5 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-l-full"
                          style={{ background: "rgba(94,92,230,0.6)", width: `${Math.min(Math.max((m.allyCS / (m.allyCS + m.enemyCS || 1)) * 100, 5), 95)}%` }}
                        />
                        <div className="h-full rounded-r-full flex-1" style={{ background: "rgba(255,69,58,0.6)" }} />
                      </div>
                    </div>
                  ))}
                </motion.div>
              </DraggableWidget>
            )}





            {/* ─── Game Timer + Velaris label (bottom-left) ─── */}
            {gameTime > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/40 rounded-md border border-white/5"
                style={{ pointerEvents: "none" }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "#5e5ce6" }} />
                <span className="text-[10px] font-mono text-white/50">
                  {formatTimer(Math.floor(gameTime))}
                </span>
                <span className="text-[8px] font-mono text-white/25 uppercase tracking-wider">Velaris</span>
                <span className="text-[8px] font-mono text-white/15">F8</span>
              </motion.div>
            )}

          </>
        )}
      </AnimatePresence>

      {/* Hidden state indicator */}
      {!isVisible && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/30 rounded-lg border border-white/5" style={{ pointerEvents: "none" }}>
          <EyeOff className="w-3 h-3 text-white/20" />
          <span className="text-[9px] text-white/20 font-mono">F9</span>
        </div>
      )}
    </div>
  );
}
