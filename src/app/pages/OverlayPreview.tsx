import { motion, AnimatePresence } from "motion/react";
import { Monitor, Move, Zap, Eye, ShieldAlert, Crosshair, Map, Timer, GripHorizontal, RefreshCw, Layers, MousePointer2, Gamepad2, Radio, Wifi } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../components/ui/utils";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { getLiveGameData, isLiveGameRunning } from "../services/dataService";
import { useLeagueClient } from "../contexts/LeagueClientContext";
import { toast } from "sonner";
import { useLanguage } from "../contexts/LanguageContext";

// Mock data for enemy summoner spells
const enemyTeam = [
  { role: "TOP", champ: "Malphite", spells: ["Flash", "Teleport"], ultCd: 130 },
  { role: "JGL", champ: "LeeSin", spells: ["Flash", "Smite"], ultCd: 110 },
  { role: "MID", champ: "Syndra", spells: ["Flash", "Ignite"], ultCd: 120 },
  { role: "ADC", champ: "Jhin", spells: ["Flash", "Heal"], ultCd: 120 },
  { role: "SUP", champ: "Nautilus", spells: ["Flash", "Ignite"], ultCd: 100 },
];

const spellIcons = (patch: string): Record<string, string> => ({
  Flash: `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/SummonerFlash.png`,
  Teleport: `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/SummonerTeleport.png`,
  Smite: `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/SummonerSmite.png`,
  Ignite: `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/SummonerDot.png`,
  Heal: `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/SummonerHeal.png`,
});

const defaultCooldowns: Record<string, number> = {
  Flash: 300,
  Teleport: 360,
  Smite: 15,
  Ignite: 180,
  Heal: 240,
};

export function OverlayPreview() {
  const [opacity, setOpacity] = useState(90);
  const [isLocked, setIsLocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { version: patchVersion } = usePatchVersion();
  const { clientState } = useLeagueClient();
  const currentSpellIcons = spellIcons(patchVersion);
  const [isInGame, setIsInGame] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const { t } = useLanguage();

  // Detect if we're in a live game — use clientState as primary, poll Live Client Data as confirmation in Tauri
  const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;
  
  // Track if real Live Client Data API is available (real game detected)
  const [isRealGame, setIsRealGame] = useState(false);

  useEffect(() => {
    if (isSimulating) return; // Don't override simulation mode

    // Always try the real Live Client Data API first (works in both Tauri and web)
    let active = true;
    let hasFoundRealGame = false;
    let autoSimTimer: ReturnType<typeof setTimeout> | null = null;

    const check = async () => {
      try {
        const running = await isLiveGameRunning();
        if (!active) return;
        if (running) {
          hasFoundRealGame = true;
          setIsRealGame(true);
          setIsInGame(true);
          if (autoSimTimer) { clearTimeout(autoSimTimer); autoSimTimer = null; }
        } else {
          // If clientState says IN_GAME (LCU event), trust it
          if (clientState === 'IN_GAME') {
            setIsInGame(true);
          } else if (hasFoundRealGame) {
            // Game ended
            hasFoundRealGame = false;
            setIsRealGame(false);
            setIsInGame(false);
          }
        }
      } catch {
        if (active && !hasFoundRealGame && clientState !== 'IN_GAME') {
          // No game running — for web preview, auto-simulate after delay
        }
      }
    };

    check();
    const interval = setInterval(check, 3000);

    // In web preview (no Tauri), if no real game found after 2s, auto-simulate
    if (!IS_TAURI && clientState !== 'IN_GAME') {
      autoSimTimer = setTimeout(() => {
        if (active && !hasFoundRealGame) {
          setIsSimulating(true);
          setIsInGame(true);
        }
      }, 2000);
    }

    return () => {
      active = false;
      clearInterval(interval);
      if (autoSimTimer) clearTimeout(autoSimTimer);
    };
  }, [clientState, isSimulating]);

  const handleSimulateGame = () => {
    setIsSimulating(true);
    setIsInGame(true);
    toast.success(t("overlay.simulationStarted") || "Simulation mode activated");
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setIsInGame(false);
    toast.info(t("overlay.simulationStopped") || "Simulation stopped");
  };

  // Active modules
  const [modules, setModules] = useState({
    hud: true,
    jungle: true,
    spells: true,
    gank: false
  });

  // Spell Cooldown State: { "role-spellIndex": remainingTime }
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  // Timer tick for cooldowns — only runs when there are active cooldowns
  useEffect(() => {
    const hasActive = Object.values(cooldowns).some(v => v > 0);
    if (!hasActive) return;

    const timer = setInterval(() => {
      setCooldowns(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(key => {
          if (next[key] > 0) {
            next[key] -= 1;
            changed = true;
          } else {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldowns]);

  const handleSpellClick = (role: string, spellIndex: number, spellName: string) => {
    if (isLocked) return; // Prevent interaction if locked
    const key = `${role}-${spellIndex}`;
    setCooldowns(prev => ({
      ...prev,
      [key]: prev[key] ? 0 : defaultCooldowns[spellName] // Toggle: if on CD, clear it; else set full CD
    }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleModule = (id: keyof typeof modules) => {
    setModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetPositions = () => {
    setModules({ hud: true, jungle: true, spells: true, gank: false });
    setIsLocked(false);
    setOpacity(90);
    setCooldowns({});
    toast.success(t("overlay.positionsReset"));
  };

  // ─── Waiting State: No active live game ───────────────────────────
  if (!isInGame) {
    const isConnected = clientState !== 'DISCONNECTED' && clientState !== 'CONNECTING';
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full flex flex-col font-sans pb-20"
      >
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3">
            {t("overlay.title")}
            <span className="px-2.5 py-1 rounded-full bg-secondary/80 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">{t("overlay.inactive")}</span>
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            {t("overlay.autoActivate")}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            <motion.div 
              animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-secondary/50 border border-border/60 flex items-center justify-center"
            >
              <Gamepad2 className="w-9 h-9 text-muted-foreground/50" />
            </motion.div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[18px] font-semibold text-foreground">
                {t("overlay.waitingGame")}
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {t("overlay.waitingDesc")}
              </p>
            </div>

            <div className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[12px] font-medium",
              isConnected 
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600" 
                : "bg-amber-500/5 border-amber-500/20 text-amber-600"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"
              )} />
              {isConnected 
                ? t("overlay.connectedWaiting") 
                : t("overlay.waitingClient")
              }
            </div>

            <div className="grid grid-cols-3 gap-3 w-full mt-4">
              {[
                { icon: Eye, label: t("overlay.spellTracker"), desc: t("overlay.spellDesc") },
                { icon: Timer, label: t("overlay.jungleTimers"), desc: t("overlay.jungleDesc") },
                { icon: Radio, label: t("overlay.gankAlerts"), desc: t("overlay.gankDesc") },
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.2, ease: "easeOut" }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/40"
                >
                  <feature.icon className="w-5 h-5 text-primary/60" />
                  <span className="text-[11px] font-semibold text-foreground">{feature.label}</span>
                  <span className="text-[10px] text-muted-foreground">{feature.desc}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 mt-2">
              <Wifi className="w-3 h-3" />
              {t("overlay.detectionInfo")}
            </div>

            {/* Simulate Game Button */}
            <button
              onClick={handleSimulateGame}
              className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-[13px] font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" />
              {t("overlay.simulateGame") || "Simular Partida"}
            </button>
            <p className="text-[10px] text-muted-foreground/40 mt-1">
              {t("overlay.simulateDesc") || "Previsualiza el overlay con datos de ejemplo"}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col lg:flex-row gap-8 font-sans pb-20 pt-4 h-[calc(100vh-80px)]"
    >
      {/* Settings Panel */}
      <div className="w-full lg:w-[320px] flex flex-col gap-8 shrink-0 lg:border-r border-border/40 lg:pr-8 overflow-y-auto custom-scrollbar">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3 mb-2">
            {t("overlay.title")}
            {isSimulating ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-bold uppercase tracking-wider border border-amber-500/20">
                {t("overlay.simulation") || "SIMULACIÓN"}
              </span>
            ) : (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            {t("overlay.overlayDesc")}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Global Settings */}
          <div className="p-4 rounded-xl bg-card border border-border/60 flex flex-col gap-5 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4" /> {t("overlay.globalOpacity")}
                </label>
                <span className="text-[12px] font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">{opacity}%</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="100" 
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" 
              />
            </div>

            <div className="w-full h-px bg-border/40" />

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                  <MousePointer2 className="w-4 h-4" /> {t("overlay.lockClicks")}
                </label>
                <span className="text-[11px] text-muted-foreground mt-0.5">{t("overlay.lockDesc")}</span>
              </div>
              <button 
                onClick={() => setIsLocked(!isLocked)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isLocked ? "bg-primary" : "bg-secondary"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  isLocked ? "translate-x-2" : "-translate-x-2"
                )} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4" /> {t("overlay.activeModules")}
            </label>
            <div className="flex flex-col gap-2">
              {[
                { id: "hud", label: t("overlay.smartNotifications"), desc: t("overlay.smartNotificationsDesc") },
                { id: "jungle", label: t("overlay.jungleTimersLabel"), desc: t("overlay.jungleTimersDesc") },
                { id: "spells", label: t("overlay.spellTrackerLabel"), desc: t("overlay.spellTrackerDesc") },
                { id: "gank", label: t("overlay.visionRadar"), desc: t("overlay.visionRadarDesc") },
              ].map(trigger => (
                <div 
                  key={trigger.id} 
                  onClick={() => toggleModule(trigger.id as keyof typeof modules)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200",
                    modules[trigger.id as keyof typeof modules] 
                      ? "border-primary/50 bg-primary/5" 
                      : "border-border/40 bg-card hover:bg-secondary/20"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">{trigger.label}</span>
                    <span className="text-[11px] text-muted-foreground">{trigger.desc}</span>
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                    modules[trigger.id as keyof typeof modules] ? "border-primary bg-primary" : "border-border/80"
                  )}>
                    {modules[trigger.id as keyof typeof modules] && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button onClick={handleResetPositions} className="px-4 py-2.5 bg-secondary border border-border/60 text-secondary-foreground rounded-xl text-[13px] font-medium hover:bg-secondary/80 transition-colors w-full text-center flex items-center justify-center gap-2 cursor-pointer">
            <RefreshCw className="w-4 h-4" /> {t("overlay.resetPositions")}
          </button>

          {isSimulating && (
            <button 
              onClick={handleStopSimulation} 
              className="px-4 py-2.5 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-[13px] font-medium hover:bg-destructive/20 transition-colors w-full text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" /> {t("overlay.stopSimulation") || "Detener Simulación"}
            </button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex flex-col gap-4 min-h-[500px]">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <Monitor className="w-4 h-4" />
            {t("overlay.gameSimulator")}
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded-md bg-secondary/50 border border-border/40 text-[11px] font-mono text-muted-foreground">
              {isLocked ? t("overlay.gameMode") : t("overlay.editMode")}
            </span>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="flex-1 rounded-2xl overflow-hidden border border-border/60 relative bg-black shadow-xl"
        >
          {/* Mock Game Background */}
          <img 
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1lJTIwbGFuZHNjYXBlfGVufDB8fHx8MTc3MzE0MTY4NQ&ixlib=rb-4.1.0&q=80&w=1920"
            alt="Game Background" 
            className="w-full h-full object-cover opacity-40 absolute inset-0 pointer-events-none filter grayscale-[0.3] contrast-125"
          />

          {/* OVERLAY RENDER LAYER */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{ opacity: opacity / 100 }}>
            <AnimatePresence>
              {/* DRAGGABLE MAIN HUD */}
              {modules.hud && (
                <motion.div 
                  key="hud-module"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  drag={!isLocked}
                  dragConstraints={containerRef}
                  dragMomentum={false}
                  className={cn(
                    "absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1",
                    !isLocked ? "pointer-events-auto cursor-grab active:cursor-grabbing" : ""
                  )}
                >
                  {!isLocked && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-t-lg border border-white/10 border-b-0 text-white/50 text-[10px] uppercase tracking-wider font-semibold opacity-0 hover:opacity-100 transition-opacity">
                      <GripHorizontal className="w-3 h-3" /> {t("overlay.dragToMove")}
                    </div>
                  )}
                  <div className="flex items-center gap-4 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden relative">
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-white uppercase tracking-wider">{t("overlay.missingChamp")}</span>
                        <span className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {t("overlay.highGankProb")}
                        </span>
                      </div>
                    </div>

                    <div className="w-px h-8 bg-white/10 mx-2" />

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                        <Crosshair className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">{t("overlay.infernalDragon")}</span>
                        <span className="text-[14px] font-mono text-blue-400 font-bold">1:45</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* DRAGGABLE ENEMY SPELL TRACKER */}
              {modules.spells && (
                <motion.div
                  key="spells-module"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  drag={!isLocked}
                  dragConstraints={containerRef}
                  dragMomentum={false}
                  className={cn(
                    "absolute top-32 left-8 flex flex-col gap-2 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
                    !isLocked ? "pointer-events-auto cursor-grab active:cursor-grabbing hover:border-white/30 transition-colors" : "pointer-events-auto"
                  )}
                >
                  <div className="flex items-center justify-between mb-1 px-1">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                      {!isLocked && <GripHorizontal className="w-3 h-3" />}
                      {t("overlay.enemies")}
                    </span>
                    <span className="text-[10px] text-white/30 font-mono">TAB</span>
                  </div>
                  
                  {enemyTeam.map((enemy) => (
                    <div key={enemy.role} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors group">
                      {/* Champion Avatar */}
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-border/40">
                          <img 
                            src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${enemy.champ}.png`} 
                            alt={enemy.champ}
                            className="w-full h-full object-cover scale-110 grayscale-[0.2]"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-black/80 px-1 rounded text-[8px] font-bold text-white/80 border border-white/10">
                          {enemy.role}
                        </div>
                      </div>

                      {/* Summoner Spells */}
                      <div className="flex items-center gap-1.5">
                        {enemy.spells.map((spell, idx) => {
                          const key = `${enemy.role}-${idx}`;
                          const isOnCd = (cooldowns[key] || 0) > 0;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => handleSpellClick(enemy.role, idx, spell)}
                              className={cn(
                                "w-7 h-7 rounded relative overflow-hidden border cursor-pointer transition-all",
                                isOnCd ? "border-red-500/50 grayscale opacity-60" : "border-border/40 hover:border-primary/50 hover:scale-105"
                              )}
                            >
                              <img src={currentSpellIcons[spell]} alt={spell} className="w-full h-full object-cover" />
                              {isOnCd && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-[10px] font-mono font-bold text-white shadow-black drop-shadow-md">
                                    {cooldowns[key]}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Ultimate tracking simple indicator */}
                      <div className="w-7 h-7 rounded-full border border-border/40 bg-black/40 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer text-white/50 text-[10px] font-bold">
                        R
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* FAKE MINIMAP BACKGROUND EFFECT AND DRAGGABLE JUNGLE TIMERS */}
              {modules.jungle && (
                <motion.div key="jungle-module" className="contents">
                  <div className="absolute bottom-4 right-4 w-[280px] h-[280px] rounded-lg border-2 border-[#5C5C3D]/60 bg-black/40 backdrop-blur-sm overflow-hidden pointer-events-none">
                    <img 
                      src="https://images.unsplash.com/photo-1716873105093-4a25256c2131?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWRlbyUyMGdhbWUlMjBtYXAlMjB1aXxlbnwxfHx8fDE3NzMxNDE2ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                      alt="Minimap Texture"
                      className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/5 to-red-500/5" />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 rounded text-[10px] text-white/50 font-mono">
                      {t("overlay.minimap")}
                    </div>
                  </div>

                  <motion.div 
                    initial={{ bottom: 16, right: 16, opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    drag={!isLocked}
                    dragConstraints={containerRef}
                    dragMomentum={false}
                    className={cn(
                      "absolute z-30 w-[280px] h-[280px] group flex items-center justify-center",
                      !isLocked ? "pointer-events-auto cursor-grab active:cursor-grabbing" : "pointer-events-none"
                    )}
                  >
                    {!isLocked && (
                      <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 bg-primary/0 group-hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center pointer-events-none z-50">
                        <div className="opacity-0 group-hover:opacity-100 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-2 shadow-lg transition-opacity translate-y-[-120px]">
                          <Move className="w-3.5 h-3.5" />
                          {t("overlay.dragOverMinimap")}
                        </div>
                      </div>
                    )}

                    <div className="relative w-full h-full pointer-events-none">
                      {/* Blue Buff */}
                      <div className="absolute top-[25%] left-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                        <div className="w-7 h-7 rounded-full bg-black/80 border border-[#3b82f6]/60 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] text-[#93c5fd]">
                          <Timer className="w-3.5 h-3.5" />
                        </div>
                        <span className="px-1.5 py-0.5 bg-black/90 rounded text-[10px] font-mono font-bold text-[#60a5fa] border border-[#3b82f6]/30">
                          0:45
                        </span>
                      </div>

                      {/* Red Buff */}
                      <div className="absolute bottom-[35%] right-[30%] translate-x-1/2 translate-y-1/2 flex flex-col items-center gap-0.5">
                        <div className="w-7 h-7 rounded-full bg-black/80 border border-[#ef4444]/60 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)] text-[#fca5a5]">
                          <Timer className="w-3.5 h-3.5" />
                        </div>
                        <span className="px-1.5 py-0.5 bg-black/90 rounded text-[10px] font-mono font-bold text-[#f87171] border border-[#ef4444]/30">
                          1:20
                        </span>
                      </div>

                      {/* Dragon */}
                      <div className="absolute bottom-[20%] left-[30%] -translate-x-1/2 translate-y-1/2 flex flex-col items-center gap-0.5">
                        <div className="w-9 h-9 rounded-full bg-black/90 border border-[#f59e0b]/60 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] text-[#fcd34d]">
                          <Zap className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 bg-black/90 rounded text-[11px] font-mono font-bold text-[#fbbf24] border border-[#f59e0b]/40">
                          4:30
                        </span>
                      </div>

                       {/* Baron */}
                       <div className="absolute top-[25%] right-[25%] translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                        <div className="w-9 h-9 rounded-full bg-black/90 border border-[#a855f7]/60 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] text-[#d8b4fe]">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 bg-primary/20 rounded text-[11px] font-mono font-bold text-[#c084fc] border border-[#a855f7]/40 animate-pulse">
                          {t("overlay.alive")}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}