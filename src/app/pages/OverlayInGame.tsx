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
import { Zap, EyeOff, Swords, Move, Settings, Eye, X } from "lucide-react";
import { cn } from "../components/ui/utils";
import { getLiveGameData, getMockLiveGameData, getMatchHistory, loadSettings, saveSettings } from "../services/dataService";
import type { LiveGameData } from "../services/dataService";
import type { MatchData } from "../utils/analytics";
import { getChampionAverage } from "../services/dataService";
import { GameLoadingOverlay } from "../components/GameLoadingOverlay";
import type { PlayerProfile } from "../utils/playerScouting";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { CHAMPION_BUILDS } from "../data/champion-builds";
import { getBuildRec } from "../services/buildService";
import type { BuildRec } from "../services/buildService";
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

// ─── Spell cooldown base values (seconds, no CDR) ────────────────────────────
const SPELL_CD: Record<string, number> = {
  SummonerFlash: 300, SummonerTeleport: 360, SummonerDot: 180,
  SummonerSmite: 70,  SummonerExhaust: 210,  SummonerHeal: 240,
  SummonerBarrier: 180, SummonerBoost: 210,  SummonerHaste: 210,
  SummonerSnowball: 80, SummonerMana: 240,
};
function spellCd(spellKey: string): number {
  return SPELL_CD[spellKey] ?? 240;
}

// ─── Role colors ──────────────────────────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  TOP: "#ef4444", JGL: "#22c55e", MID: "#3b82f6",
  ADC: "#f59e0b", SUP: "#a855f7",
};

// ─── AP champion set (for damage-type widget) ────────────────────────────────
const AP_CHAMPS = new Set([
  "Lux","Syndra","Orianna","Viktor","Cassiopeia","Ryze","Vel'Koz","Zilean",
  "Malzahar","Brand","Annie","Veigar","Akali","Zoe","LeBlanc","Diana",
  "Katarina","Fizz","Ekko","Neeko","Sylas","Ahri","Twisted Fate","Aurelion Sol",
  "Galio","Kassadin","Karthus","Anivia","Azir","Corki","Heimerdinger","Karma",
  "Kennen","Lillia","Lissandra","Mordekaiser","Morgana","Nami","Nidalee",
  "Rumble","Seraphine","Sona","Soraka","Swain","Taliyah","Teemo","Vladimir",
  "Zyra","Elise","Fiddlesticks","Evelynn","Amumu","Maokai","Gragas","Gangplank",
  "Ziggs","Xerath","Vex","Yone","Yasuo","Akshan","Renata Glasc","Sett",
]);

function getDamageType(champName: string): "AP" | "AD" {
  return AP_CHAMPS.has(champName) ? "AP" : "AD";
}

// ─── Scuttle crab timer (static time-based) ──────────────────────────────────
function getScuttleStatus(gameTime: number): { label: string; color: string } {
  if (gameTime <= 0) return { label: "—", color: "rgba(255,255,255,0.2)" };
  if (gameTime < 210) {
    const secs = Math.ceil(210 - gameTime);
    const m = Math.floor(secs / 60), s = secs % 60;
    return { label: `${m}:${s.toString().padStart(2, "0")}`, color: "rgba(255,255,255,0.25)" };
  }
  const elapsed = (gameTime - 210) % 150;
  const remaining = Math.ceil(150 - elapsed);
  if (remaining > 140) return { label: "Alive", color: "#30d158" };
  const m = Math.floor(remaining / 60), s = remaining % 60;
  return { label: `${m}:${s.toString().padStart(2, "0")}`, color: "#ffd60a" };
}


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
      onDoubleClick={draggable ? () => { setPos(defaultPos); savePos(id, defaultPos); } : undefined}
    >
      {draggable && (
        <div className="absolute -top-4 left-0 right-0 flex items-center justify-center gap-1 h-4 pointer-events-none" title="Doble-click para resetear posición">
          <Move className="w-2.5 h-2.5 text-amber-400/70" />
          <span className="text-[9px] text-amber-400/60 uppercase tracking-widest font-bold">arrastrar · 2×click reset</span>
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
  scuttle: boolean;
  csPerMin: boolean;
  visionScore: boolean;
  killParticipation: boolean;
  skillOrder: boolean;
  enemySpells: boolean;
  csComparison: boolean;
  damageType: boolean;
  liveKda: boolean;
  itemBuild: boolean;
};

const STATS_STORAGE_KEY = "velaris-overlay-stats";
const DEFAULT_STATS: OverlayStats = {
  goldDiff: true, dragon: true, baron: true, scuttle: true,
  csPerMin: true, visionScore: true, killParticipation: true,
  skillOrder: true, enemySpells: true, csComparison: true,
  damageType: true, liveKda: true, itemBuild: true,
};
const STATS_LABELS: Record<keyof OverlayStats, string> = {
  goldDiff: "Gold diff", dragon: "Dragon", baron: "Baron", scuttle: "Scuttlecrab",
  csPerMin: "CS/min", visionScore: "Vision/min", killParticipation: "Kill Part.",
  skillOrder: "Skill Order", enemySpells: "Enemy Spells", csComparison: "CS por carril",
  damageType: "Tipo de daño", liveKda: "KDA vs media", itemBuild: "Build guide",
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
  // Timestamp of the last successful gameData poll — used to interpolate
  // respawnTimer between 2 s API ticks so death timers count down smoothly.
  const lastPollTimestampRef = useRef(Date.now());

  // ─── Spell cooldown tracking ─────────────────────────────────────────────
  // key: "${summonerName}_1" | "${summonerName}_2" → expiry timestamp ms
  const [spellCds, setSpellCds] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

  // ─── CS deficit alert ────────────────────────────────────────────────────
  const [csAlert, setCsAlert] = useState<{ diff: number } | null>(null);
  const csAlertShownRef = useRef(false);

  // ─── Adaptive item reminder (F9) ─────────────────────────────────────────
  const [adaptiveAlert, setAdaptiveAlert] = useState<{ text: string } | null>(null);
  const adaptiveShownRef = useRef(false);

  // ─── Objective 30s alert ──────────────────────────────────────────────────
  const [objectiveAlert, setObjectiveAlert] = useState<{ name: string; color: string } | null>(null);
  // Tracks which alert windows are currently active (prevents re-firing mid-window)
  const objAlertActiveRef = useRef<Set<string>>(new Set());

  // ─── Item cost map (DDragon, for gold-needed display) ────────────────────
  const [itemCostMap, setItemCostMap] = useState<Record<number, number>>({});

  // ─── Loading screen overlay ───────────────────────────────────────────────
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState<PlayerProfile[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<MatchData[]>([]);

  // ─── Live KDA vs champion average ────────────────────────────────────────
  const [champKdaAvg, setChampKdaAvg] = useState<number | null>(null);
  const [myMatchHistory, setMyMatchHistory] = useState<MatchData[] | null>(null);

  // ─── Build recommendation (LoLalytics, cached) ───────────────────────────
  const [buildRec, setBuildRec] = useState<BuildRec | null>(null);

  // ─── Overlay opacity from settings (live-editable from gear panel) ──────
  const [overlayOpacity, setOverlayOpacity] = useState<number>(() => {
    try {
      const s = loadSettings();
      return parseInt((s as any).overlayOpacity ?? "75") / 100;
    } catch { return 0.75; }
  });

  const handleOpacityChange = useCallback((pct: number) => {
    setOverlayOpacity(pct / 100);
    try {
      const s = loadSettings();
      saveSettings({ ...s, overlayOpacity: String(pct) } as any);
    } catch {}
  }, []);

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
    // F7: toggle settings panel (open enables interactive; close disables it)
    const p4 = tauriListen("overlay-open-settings", () => {
      setShowSettings(prev => {
        if (prev) {
          setInteractiveMode(false);
          return false;
        }
        setInteractiveMode(true);
        return true;
      });
    });
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
      p4.then(fn => fn()).catch(() => {});
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
            lastPollTimestampRef.current = Date.now();
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
        const dragonType: string = (event as unknown as DragonKillEvent).DragonType || "unknown";
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

  // ─── Tick for spell cooldown countdown ───────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ─── CS deficit detection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!gameData) return;
    const gTime = gameData.gameData?.gameTime ?? 0;
    if (gTime < 180) return; // skip first 3 minutes
    const activePlayerData = gameData.allPlayers?.find(
      p => p.summonerName === gameData.activePlayer.summonerName
    );
    if (!activePlayerData) return;
    const myTeam = activePlayerData.team;
    const enemyPlayers = gameData.allPlayers?.filter(p => p.team !== myTeam) ?? [];
    const myCs = activePlayerData.scores.creepScore;
    // Find the enemy whose CS is closest to ours (most likely the lane opponent)
    const laneOpponent = enemyPlayers
      .filter(e => e.scores.creepScore > 0)
      .sort((a, b) => Math.abs(a.scores.creepScore - myCs) - Math.abs(b.scores.creepScore - myCs))[0];
    if (!laneOpponent) return;
    const diff = myCs - laneOpponent.scores.creepScore;
    if (diff <= -15 && !csAlertShownRef.current) {
      csAlertShownRef.current = true;
      setCsAlert({ diff });
      setTimeout(() => { setCsAlert(null); csAlertShownRef.current = false; }, 8000);
    }
    if (diff > -10) csAlertShownRef.current = false; // reset if recovered
  }, [gameData]);

  // ─── Adaptive item reminder (F9) — fires once between min 12-18 ──────────
  useEffect(() => {
    if (!gameData || adaptiveShownRef.current) return;
    const gTime = gameData.gameData?.gameTime ?? 0;
    if (gTime < 720 || gTime > 1080) return; // 12–18 min window
    const allPlayers = gameData.allPlayers ?? [];
    const active = allPlayers.find(p => p.summonerName === gameData.activePlayer?.summonerName);
    if (!active) return;
    const enemyPlayers = allPlayers.filter(p => p.team !== active.team);
    const enemyAP = enemyPlayers.filter(e => AP_CHAMPS.has(e.championName)).length;
    const enemyAD = enemyPlayers.length - enemyAP;
    if (enemyAP >= 3) {
      adaptiveShownRef.current = true;
      setAdaptiveAlert({ text: t("overlay.ap.alert") });
      setTimeout(() => setAdaptiveAlert(null), 12000);
    } else if (enemyAD >= 4) {
      adaptiveShownRef.current = true;
      setAdaptiveAlert({ text: t("overlay.ad.alert") });
      setTimeout(() => setAdaptiveAlert(null), 12000);
    }
  }, [gameData]);

  // ─── Objective 30 s alert (Dragon / Baron first spawn + respawn) ─────────
  useEffect(() => {
    // gameTime is a derived const declared later, so compute it inline here
    const gTime = (gameData?.gameData?.gameTime ?? 0) +
      (Date.now() - lastPollTimestampRef.current) / 1000;
    if (gTime <= 0) return;
    const tryAlert = (key: string, name: string, color: string, inWindow: boolean) => {
      if (inWindow && !objAlertActiveRef.current.has(key)) {
        objAlertActiveRef.current.add(key);
        setObjectiveAlert({ name, color });
        setTimeout(() => setObjectiveAlert(null), 5000);
      } else if (!inWindow) {
        // Left the window — clear so the next respawn cycle can fire again
        objAlertActiveRef.current.delete(key);
      }
    };
    // Dragon first spawn at 5:00 (300 s) — alert window 4:30–5:00
    tryAlert("dragon-first", "Dragon en ~30s", "#22c55e",
      gTime >= 270 && gTime < 300 && dragonKills.length === 0);
    // Dragon respawn timer (counts down from ~300 s)
    const dragonTimer = objectiveTimers["Dragon"];
    tryAlert("dragon-resp", "Dragon reaparece en 30s", "#22c55e",
      dragonTimer !== undefined && dragonTimer <= 30);
    // Baron first spawn at 20:00 (1200 s) — alert window 19:30–20:00
    tryAlert("baron-first", "Baron en ~30s", "#a855f7",
      gTime >= 1170 && gTime < 1200);
    // Baron respawn timer
    const baronTimer = objectiveTimers["Baron"];
    tryAlert("baron-resp", "Baron reaparece en 30s", "#a855f7",
      baronTimer !== undefined && baronTimer <= 30);
  }, [gameData, objectiveTimers, dragonKills.length]);

  // ─── Fetch item costs from DDragon once patch version is known ────────────
  useEffect(() => {
    if (!patchVersion) return;
    const cacheKey = `velaris-item-costs-${patchVersion}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { try { setItemCostMap(JSON.parse(cached)); return; } catch {} }
    fetch(`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/en_US/item.json`)
      .then(r => { if (!r.ok) throw new Error(`ddragon items ${r.status}`); return r.json(); })
      .then(data => {
        const costs: Record<number, number> = {};
        for (const [id, item] of Object.entries(data.data as Record<string, any>)) {
          costs[parseInt(id)] = (item as any).gold?.total ?? 0;
        }
        localStorage.setItem(cacheKey, JSON.stringify(costs));
        setItemCostMap(costs);
      })
      .catch(() => {});
  }, [patchVersion]);

  // ─── Load match history once ──────────────────────────────────────────────
  useEffect(() => {
    getMatchHistory().then(data => {
      setMyMatchHistory(data);
      setLoadingMatches(data);
    }).catch(() => {});
  }, []);

  // ─── Bootstrap loading screen from champ select snapshot ─────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("velaris-pregame-snapshot");
      if (!raw) return;
      const snap = JSON.parse(raw);
      // Ignore stale snapshots (older than 30 min)
      if (Date.now() - snap.savedAt > 30 * 60 * 1000) return;
      const makeProfile = (p: any, team: "BLUE" | "RED"): PlayerProfile => ({
        summonerName: p.player || p.champ || "???",
        currentChampion: p.champ || "",
        currentRole: p.role || "MID",
        team,
        rank: "UNRANKED", division: "", lp: 0,
        wins: 0, losses: 0,
        recentWins: 0, recentLosses: 0,
        recentAvgKda: 0, recentAvgCsPerMin: 0,
        recentAvgVisionPerMin: 0, recentAvgDeaths: 0,
        champions: [], currentStreak: 0, accountLevel: 0,
      });
      const profiles: PlayerProfile[] = [
        ...(snap.allies ?? []).map((a: any) => makeProfile(a, "BLUE")),
        ...(snap.enemies ?? []).map((e: any) => makeProfile(e, "RED")),
      ];
      if (profiles.length >= 2) setLoadingProfiles(profiles);
    } catch {}
  }, []);

  // ─── Hide loading overlay once Live Client API responds ──────────────────
  useEffect(() => {
    if (gameData && showLoadingOverlay) setShowLoadingOverlay(false);
  }, [gameData, showLoadingOverlay]);

  // ─── Load champion KDA average when champion is known ────────────────────
  useEffect(() => {
    if (!myMatchHistory || myMatchHistory.length === 0) return;
    const champName = gameData?.allPlayers?.find(
      p => p.summonerName === gameData.activePlayer.summonerName
    )?.championName;
    if (!champName) return;
    const result = getChampionAverage(champName, "kda", myMatchHistory);
    if (result) setChampKdaAvg(result.avg);
  }, [myMatchHistory, gameData?.activePlayer?.summonerName]);

  // ─── Fetch recommended build when we know the champion ───────────────────
  useEffect(() => {
    const champName = gameData?.allPlayers?.find(
      p => p.summonerName === gameData?.activePlayer?.summonerName
    )?.championName;
    if (!champName || champName === "Unknown") return;
    if (buildRec?.champion === champName) return; // already loaded
    const role = CHAMPION_BUILDS[champName]?.role ?? "MID";
    getBuildRec(champName, role).then(rec => {
      if (rec) setBuildRec(rec);
    }).catch(() => {});
  }, [gameData?.activePlayer?.summonerName, buildRec]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const activeTeam = gameData?.allPlayers?.find(
    ap => ap.summonerName === gameData.activePlayer.summonerName
  )?.team;
  const allies = gameData?.allPlayers?.filter(p => p.team === activeTeam) || [];
  const enemies = gameData?.allPlayers?.filter(p => p.team !== activeTeam) || [];
  // Interpolate gameTime: advance it by the time elapsed since the last 2 s poll
  // so objective countdowns and CS/min don't stutter every 2 seconds.
  const rawGameTime = gameData?.gameData?.gameTime || 0;
  const gameTime = rawGameTime > 0
    ? rawGameTime + (now - lastPollTimestampRef.current) / 1000
    : 0;

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

  // ─── Build guide: current items vs recommended ────────────────────────────
  // Live Client API: myPlayer.items = [{itemID, slot, count, displayName, ...}]
  const currentItemIds = useMemo(
    () => new Set<number>((myPlayer?.items ?? []).map((i: any) => i.itemID)),
    [myPlayer?.items]
  );
  // Recommended items: boots first, then core (skip starters — sold by mid-game)
  const recommendedItems = useMemo(() => {
    if (!buildRec) return [];
    const items: { id: number; name: string }[] = [];
    if (buildRec.boots) items.push(buildRec.boots);
    buildRec.coreItems.slice(0, 5).forEach(i => items.push(i));
    return items;
  }, [buildRec]);
  const nextItemIdx = useMemo(
    () => recommendedItems.findIndex(i => !currentItemIds.has(i.id)),
    [recommendedItems, currentItemIds]
  );

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

  const markSpellUsed = useCallback((enemyName: string, spellSlot: 1 | 2, spellKey: string) => {
    const cd = spellCd(spellKey);
    const key = `${enemyName}_${spellSlot}`;
    setSpellCds(prev => ({ ...prev, [key]: Date.now() + cd * 1000 }));
  }, []);

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
      {/* ─── Loading screen overlay (shown while Live Client API is not yet up) ─── */}
      <AnimatePresence>
        {showLoadingOverlay && (
          <div className="fixed inset-0 z-[500]" style={{ pointerEvents: "auto" }}>
            <GameLoadingOverlay
              matches={loadingMatches}
              players={loadingProfiles}
              onClose={() => setShowLoadingOverlay(false)}
            />
          </div>
        )}
      </AnimatePresence>
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
            className="absolute z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{
              bottom: "55px",
              right: "360px",
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
                  background: `linear-gradient(135deg, rgba(94,92,230,0.06) 0%, rgba(8,8,16,${overlayOpacity}) 40%)`,
                  backdropFilter: "blur(14px)",
                  border: interactiveMode ? "1px solid rgba(255,214,10,0.35)" : "1px solid rgba(255,255,255,0.09)",
                  borderTop: interactiveMode ? "2px solid rgba(255,214,10,0.5)" : "2px solid rgba(94,92,230,0.6)",
                  borderRadius: "12px",
                  pointerEvents: interactiveMode ? "auto" : "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.7rem",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#5e5ce6", animation: "pulse 2s ease-in-out infinite" }} />
                    <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800 }}>
                      Velaris
                    </span>
                  </div>
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

                {/* Scuttlecrab */}
                {overlayStats.scuttle && gameTime > 0 && (() => {
                  const scuttle = getScuttleStatus(gameTime);
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Scuttle</span>
                      <span style={{ fontWeight: 700, color: scuttle.color }}>{scuttle.label}</span>
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

                {/* Live KDA vs champion average */}
                {overlayStats.liveKda && myPlayer && gameMinutes > 2 && (() => {
                  const myK = myPlayer.scores.kills;
                  const myD = myPlayer.scores.deaths;
                  const myA = myPlayer.scores.assists;
                  const liveKda = myD > 0 ? ((myK + myA) / myD).toFixed(1) : `${myK + myA}.0`;
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", marginTop: "0.1rem" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>KDA</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                          {myK}/{myD}/{myA}
                        </span>
                        {champKdaAvg !== null && (
                          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>
                            vs {champKdaAvg.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
                  {/* ─ Panel header with close button ─ */}
                  <div className="flex items-center justify-between mb-1 pb-1.5 border-b border-white/8">
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}>AJUSTES · F7</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowSettings(false); setInteractiveMode(false); }}
                      style={{ cursor: "pointer", background: "transparent", border: "none", padding: 0, lineHeight: 1 }}
                    >
                      <X style={{ width: 10, height: 10, color: "rgba(255,255,255,0.3)" }} />
                    </button>
                  </div>

                  {/* ─ Opacity control ─ */}
                  <div className="mb-2 pb-2 border-b border-white/8">
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.65)" }}>{t("overlay.opacity")}</span>
                      <span style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>
                        {Math.round(overlayOpacity * 100)}%
                      </span>
                    </div>
                    {/* Presets */}
                    <div className="flex gap-1 mb-1.5">
                      {[25, 50, 75, 90].map(pct => (
                        <button
                          key={pct}
                          onClick={(e) => { e.stopPropagation(); handleOpacityChange(pct); }}
                          style={{
                            flex: 1, fontSize: "0.6rem", fontWeight: 700, padding: "2px 0", borderRadius: 4, border: "none", cursor: "pointer",
                            background: Math.round(overlayOpacity * 100) === pct ? "rgba(94,92,230,0.5)" : "rgba(255,255,255,0.07)",
                            color: Math.round(overlayOpacity * 100) === pct ? "#fff" : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    {/* Slider */}
                    <input
                      type="range" min={20} max={100} step={5}
                      value={Math.round(overlayOpacity * 100)}
                      onChange={(e) => { e.stopPropagation(); handleOpacityChange(parseInt(e.target.value)); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: "100%", accentColor: "#5e5ce6", cursor: "pointer", height: 3 }}
                    />
                  </div>
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

            {/* ─── Enemy Spells ─── */}
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
                  className="flex flex-col gap-0 shadow-2xl overflow-hidden"
                  style={{
                    background: `rgba(8,8,16,${overlayOpacity})`,
                    backdropFilter: "blur(14px)",
                    border: interactiveMode ? "1px solid rgba(255,214,10,0.35)" : "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "12px",
                    borderTop: "2px solid rgba(239,68,68,0.5)",
                    // Always clickable so spells can be tracked without F8
                    pointerEvents: "auto",
                  }}
                >
                  <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em] px-2.5 pt-2 pb-1">
                    {t("overlay.spellClickHint")}
                  </div>
                  {enemies.map((enemy, ei) => (
                    <div
                      key={enemy.summonerName}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5",
                        ei < enemies.length - 1 && "border-b border-white/5"
                      )}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${enemy.championName}.png`}
                          alt={enemy.championName}
                          className={cn(
                            "w-8 h-8 rounded-full border",
                            enemy.isDead ? "border-red-500/50 grayscale opacity-40" : "border-white/20"
                          )}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/Aatrox.png`;
                          }}
                        />
                        {enemy.isDead && enemy.respawnTimer > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                            <span className="text-[9px] font-mono font-black text-red-300 drop-shadow-lg">
                              {Math.ceil(enemy.respawnTimer)}
                            </span>
                          </div>
                        )}
                      </div>
                      {[enemy.summonerSpells.summonerSpellOne, enemy.summonerSpells.summonerSpellTwo].map((spell, idx) => {
                        const spellImgKey = resolveSpellKey(spell);
                        const cdKey = `${enemy.summonerName}_${idx + 1}`;
                        const expiresAt = spellCds[cdKey] ?? null;
                        const secsLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
                        const onCd = secsLeft > 0;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "relative w-8 h-8 rounded-lg overflow-hidden border cursor-pointer transition-all",
                              onCd ? "border-red-400/60 opacity-55" : "border-white/15 hover:border-white/35 hover:ring-1 hover:ring-white/20"
                            )}
                            title={onCd ? `${spell.displayName} — ${secsLeft}s` : spell.displayName}
                            onClick={(e) => { e.stopPropagation(); markSpellUsed(enemy.summonerName, (idx + 1) as 1 | 2, spellImgKey); }}
                          >
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/spell/${spellImgKey}.png`}
                              alt={spell.displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/spell/SummonerFlash.png`;
                              }}
                            />
                            {onCd && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/75">
                                <span className="text-[11px] font-black text-white leading-none drop-shadow">{secsLeft}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* ─ Ally death timers ─ */}
                  {(() => {
                    // Interpolate between 2 s API ticks so the countdown is smooth.
                    const secsSincePoll = (now - lastPollTimestampRef.current) / 1000;
                    const dead = allies.filter(a => a.isDead && Math.max(0, a.respawnTimer - secsSincePoll) > 0);
                    if (!dead.length) return null;
                    return (
                      <div className="border-t border-white/10 px-2.5 pt-1.5 pb-1.5 mt-0.5">
                        <div className="text-[7px] text-white/20 uppercase tracking-[0.15em] mb-1">Aliados</div>
                        {dead.map(ally => (
                          <div key={ally.summonerName} className="flex items-center gap-1.5 py-0.5">
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${ally.championName}.png`}
                              alt={ally.championName}
                              className="w-5 h-5 rounded-full grayscale opacity-50"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="text-[10px] font-mono font-bold text-blue-300">
                              {Math.ceil(Math.max(0, ally.respawnTimer - secsSincePoll))}s
                            </span>
                            <span className="text-[8px] text-white/30 truncate max-w-[80px]">{ally.summonerName}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
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
                  className="flex flex-col gap-1 p-2 shadow-2xl overflow-hidden"
                  style={{ background: `rgba(8,8,16,${overlayOpacity})`, backdropFilter: "blur(14px)", border: interactiveMode ? "1px solid rgba(255,214,10,0.35)" : "1px solid rgba(255,255,255,0.09)", borderTop: "2px solid rgba(59,130,246,0.5)", borderRadius: "12px", pointerEvents: interactiveMode ? "auto" : "none" }}
                >
                  <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em] px-1 mb-1">
                    CS by Lane
                  </div>
                  {laneMatchups.map((m) => (
                    <div key={m.lane} className="flex items-center gap-2 px-1 py-0.5">
                      <span className="text-[9px] font-bold text-white/40 w-7 shrink-0">{m.lane}</span>
                      <span className={cn(
                        "text-[11px] font-mono font-bold tabular-nums w-10 text-right",
                        m.diff > 0 ? "text-[#5e5ce6]" : m.diff < 0 ? "text-[#ff453a]" : "text-white/40"
                      )}>
                        {m.diff > 0 ? "+" : ""}{m.diff}
                      </span>
                      <div className="w-[60px] h-1.5 bg-white/5 rounded-full overflow-hidden flex">
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





            {/* ─── Damage Type Widget (draggable) ─── */}
            {overlayStats.damageType && (allies.length > 0 || enemies.length > 0) && (() => {
              const allyAP = allies.filter(p => getDamageType(p.championName) === "AP").length;
              const allyAD = allies.length - allyAP;
              const enemyAP = enemies.filter(p => getDamageType(p.championName) === "AP").length;
              const enemyAD = enemies.length - enemyAP;
              const allyTotal = allies.length || 1;
              const enemyTotal = enemies.length || 1;
              const enemyAPPct = enemyAP / enemyTotal;
              const enemyADPct = enemyAD / enemyTotal;
              const alert = enemyAPPct >= 0.8 ? "Stackea resist. mágica"
                : enemyADPct >= 0.8 ? "Stackea resist. física"
                : null;
              return (
                <DraggableWidget
                  id="damage-type"
                  defaultPos={{ x: window.innerWidth - 220, y: 460 }}
                  draggable={interactiveMode}
                >
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-1.5 p-2 shadow-2xl w-[170px] overflow-hidden"
                    style={{ background: `rgba(8,8,16,${overlayOpacity})`, backdropFilter: "blur(14px)", border: interactiveMode ? "1px solid rgba(255,214,10,0.35)" : "1px solid rgba(255,255,255,0.09)", borderTop: "2px solid rgba(168,85,247,0.5)", borderRadius: "12px", pointerEvents: interactiveMode ? "auto" : "none" }}
                  >
                    <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em] px-1 mb-0.5">
                      Tipo de daño
                    </div>
                    {/* Allies bar */}
                    {allies.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[7px] text-white/30 px-0.5">
                          <span>Aliados</span>
                          <span className="font-mono">{allyAD}AD · {allyAP}AP</span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden flex bg-white/5">
                          <div style={{ width: `${(allyAD / allyTotal) * 100}%`, background: "#60a5fa" }} className="h-full" />
                          <div style={{ width: `${(allyAP / allyTotal) * 100}%`, background: "#a78bfa" }} className="h-full" />
                        </div>
                      </div>
                    )}
                    {/* Enemies bar */}
                    {enemies.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[7px] text-white/30 px-0.5">
                          <span>Enemigos</span>
                          <span className="font-mono">{enemyAD}AD · {enemyAP}AP</span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden flex bg-white/5">
                          <div style={{ width: `${(enemyAD / enemyTotal) * 100}%`, background: "#f87171" }} className="h-full" />
                          <div style={{ width: `${(enemyAP / enemyTotal) * 100}%`, background: "#c084fc" }} className="h-full" />
                        </div>
                      </div>
                    )}
                    {alert && (
                      <div className="text-[8px] text-amber-300 text-center mt-0.5 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {alert}
                      </div>
                    )}
                  </motion.div>
                </DraggableWidget>
              );
            })()}

            {/* ─── Build Guide Widget ─── */}
            {overlayStats.itemBuild && buildRec && myChampName && (
              <DraggableWidget
                id="build-guide"
                defaultPos={{ x: Math.round(window.innerWidth / 2) - 140, y: 12 }}
                draggable={interactiveMode}
              >
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: overlayOpacity }}
                  style={{
                    background: `linear-gradient(135deg, rgba(94,92,230,0.07) 0%, rgba(8,8,16,${overlayOpacity}) 40%)`,
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderTop: "2px solid rgba(94,92,230,0.55)",
                    borderRadius: "10px",
                    padding: "7px 10px",
                    minWidth: 240,
                    maxWidth: 320,
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.13em", textTransform: "uppercase" }}>
                        Build
                      </span>
                      <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.15)", fontWeight: 600 }}>
                        {myChampName}
                      </span>
                    </div>
                    <span style={{
                      fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.08em",
                      color: buildRec.source === "live" ? "rgba(94,211,130,0.7)" : "rgba(255,255,255,0.15)",
                      textTransform: "uppercase",
                    }}>
                      {buildRec.source === "live" ? "LIVE" : "ESTÁTICO"}
                    </span>
                  </div>

                  {/* Gold needed for next item */}
                  {nextItemIdx >= 0 && recommendedItems[nextItemIdx] && (() => {
                    const nextItem = recommendedItems[nextItemIdx];
                    const cost = itemCostMap[nextItem.id] ?? 0;
                    const needed = cost > 0 ? Math.max(0, cost - myGold) : 0;
                    if (needed === 0 && cost === 0) return null;
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                        <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>{nextItem.name}</span>
                        {needed > 0 ? (
                          <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#ffd60a", fontFamily: "'JetBrains Mono', monospace" }}>
                            -{needed}g
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#30d158" }}>¡Compra ya!</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Keystone + Items row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {/* Keystone rune */}
                    {buildRec.keystoneRune && (
                      <div title={buildRec.keystoneRune.name} style={{
                        width: 30, height: 30, borderRadius: "50%",
                        border: "1px solid rgba(94,92,230,0.55)",
                        background: "rgba(94,92,230,0.12)",
                        overflow: "hidden", flexShrink: 0,
                      }}>
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/img/${buildRec.keystoneRune.icon}`}
                          alt={buildRec.keystoneRune.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}

                    {/* Separator */}
                    <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

                    {/* Recommended items */}
                    {recommendedItems.map((item, i) => {
                      const owned = currentItemIds.has(item.id);
                      const isNext = !owned && i === nextItemIdx;
                      return (
                        <div
                          key={`${item.id}-${i}`}
                          title={item.name}
                          style={{
                            position: "relative",
                            width: 28, height: 28,
                            borderRadius: 6,
                            border: isNext
                              ? "1px solid rgba(94,92,230,0.9)"
                              : owned
                                ? "1px solid rgba(255,255,255,0.1)"
                                : "1px solid rgba(255,255,255,0.06)",
                            background: owned ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.45)",
                            overflow: "hidden",
                            flexShrink: 0,
                            boxShadow: isNext ? "0 0 10px rgba(94,92,230,0.5)" : "none",
                            opacity: owned ? 0.45 : 1,
                          }}
                        >
                          {item.id > 0 && (
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/item/${item.id}.png`}
                              alt={item.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                          {/* Checkmark overlay for owned items */}
                          {owned && (
                            <div style={{
                              position: "absolute", inset: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: "rgba(0,0,0,0.45)",
                            }}>
                              <svg width="9" height="9" viewBox="0 0 9 9">
                                <polyline points="1,4.5 3.5,7 8,2" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                          {/* "Next" label */}
                          {isNext && (
                            <div style={{
                              position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
                              fontSize: "0.38rem", fontWeight: 800, color: "rgba(94,92,230,0.9)",
                              whiteSpace: "nowrap", letterSpacing: "0.04em",
                            }}>
                              NEXT
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Skill max order */}
                  {buildRec.skillMax && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 10, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>MAX</span>
                      {buildRec.skillMax.split(/\s*[>→]\s*/).map((sk, i, arr) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: 4,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.6rem", fontWeight: 700,
                            background: i === 0 ? "rgba(94,92,230,0.22)" : "rgba(255,255,255,0.05)",
                            color: i === 0 ? "#7b79ff" : i === 1 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.18)",
                            border: i === 0 ? "1px solid rgba(94,92,230,0.4)" : "1px solid rgba(255,255,255,0.07)",
                          }}>
                            {sk}
                          </span>
                          {i < arr.length - 1 && (
                            <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.5rem" }}>›</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
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

      {/* ─── Objective 30s Alert Toast ─── */}
      <AnimatePresence>
        {objectiveAlert && (
          <motion.div
            key={objectiveAlert.name}
            initial={{ opacity: 0, y: -16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-2.5 rounded-2xl"
            style={{
              background: "rgba(0,0,0,0.88)",
              backdropFilter: "blur(16px)",
              border: `1px solid ${objectiveAlert.color}40`,
              boxShadow: `0 0 24px ${objectiveAlert.color}20`,
              pointerEvents: "none",
            }}
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: objectiveAlert.color, animation: "pulse 1s ease-in-out infinite" }} />
            <span className="text-white font-bold text-[13px]">{objectiveAlert.name}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CS Deficit Alert Toast (fixed, outside draggable widgets) ─── */}
      <AnimatePresence>
        {csAlert && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="fixed bottom-14 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(251,146,60,0.25)",
              pointerEvents: "none",
            }}
          >
            <span className="text-orange-300 font-bold text-[12px]">
              {Math.abs(csAlert.diff)} CS de déficit
            </span>
            <span className="text-white/40 text-[11px]">— prioriza farm</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Adaptive Item Reminder Toast (F9) ─── */}
      <AnimatePresence>
        {adaptiveAlert && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="fixed bottom-28 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(139,92,246,0.30)",
              pointerEvents: "none",
            }}
          >
            <span className="text-violet-300 font-bold text-[12px]">
              {adaptiveAlert.text}
            </span>
          </motion.div>
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
