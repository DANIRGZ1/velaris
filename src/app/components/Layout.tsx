import { Users, LayoutDashboard, Activity, User, Settings, Minimize2, Maximize2, X, ChevronDown, History, Maximize, StickyNote, ChevronLeft, ChevronRight, RotateCw, Swords, Trophy, PanelLeftClose, PanelLeftOpen, Crosshair, CalendarDays, Sparkles, BotMessageSquare, ArrowLeftRight, Search, Gamepad2, Info } from "lucide-react";
import { cn } from "./ui/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { CommandMenu } from "./CommandMenu";
import { loadSettings } from "../services/dataService";

import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";
import { useLanguage } from "../contexts/LanguageContext";
import { OnboardingTour } from "./OnboardingTour";
import { useLeagueClient, ClientState } from "../contexts/LeagueClientContext";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { usePatchNotes } from "../hooks/usePatchNotes";
import { NotificationPanel } from "./NotificationPanel";
import { ProfileDropdown } from "./ProfileDropdown";
import { ChampionDrawer } from "./ChampionDrawer";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { WhatsNewModal } from "./WhatsNewModal";
import { TitleBarSearch } from "./TitleBarSearch";
import { TiltAlertBanner } from "./TiltAlertBanner";
import { TiltBreakModal } from "./TiltBreakModal";
import { DailyLPGoal } from "./DailyLPGoal";
import { minimizeWindow, toggleMaximizeWindow, closeWindow, isMaximized } from "../helpers/tauriWindow";
import { getMatchHistory } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import { computeDailyStreak, markBrokenShown } from "../services/dailyStreakService";
import { WeeklySummary } from "./WeeklySummary";
import { WEEKLY_GOAL_KEY } from "./DailyLPGoal";
import { getLPHistory } from "../services/lpTracker";
import { RankUpCelebration, useRankUpCelebration } from "./RankUpCelebration";
import { updateBestWeekLP } from "../services/extendedAnalytics";
import { checkAndSaveBadges } from "../services/badgeService";
import { toast } from "sonner";

// ─── Weekly LP nudge helpers ──────────────────────────────────────────────────
const WEEKLY_LP_NUDGE_KEY = "velaris-weekly-lp-nudge-week";

function getWeekId(): string {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD of this Monday
}

function getWeekStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d.getTime();
}

function shouldShowWeeklyLPNudge(): boolean {
  // Show on Wed (3), Thu (4), Fri (5) once per week
  const dow = new Date().getDay(); // 0=Sun
  if (dow < 3 || dow > 5) return false;
  try {
    return localStorage.getItem(WEEKLY_LP_NUDGE_KEY) !== getWeekId();
  } catch { return false; }
}

function markWeeklyLPNudgeShown(): void {
  try { localStorage.setItem(WEEKLY_LP_NUDGE_KEY, getWeekId()); } catch {}
}

// ─── Early tilt nudge helpers ─────────────────────────────────────────────────
const EARLY_TILT_KEY = "velaris-early-tilt-nudge-until";
const NUDGE_COOLDOWN_MS = 45 * 60 * 1000; // 45 min

function earlyTiltDismissed(): boolean {
  try {
    const until = localStorage.getItem(EARLY_TILT_KEY);
    return !!until && Date.now() < Number(until);
  } catch { return false; }
}

function recordEarlyTiltNudge() {
  try { localStorage.setItem(EARLY_TILT_KEY, String(Date.now() + NUDGE_COOLDOWN_MS)); } catch {}
}

function getConsecutiveLosses(matches: import("../utils/analytics").MatchData[]): number {
  if (!matches.length) return 0;
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  let count = 0;
  for (const m of sorted) {
    const win = m.participants[m.playerParticipantIndex]?.win ?? true;
    if (!win) count++;
    else break;
  }
  return count;
}

export function Layout() {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem("velaris-sidebar-collapsed") === "true"; } catch { return false; }
  });
  const { t } = useLanguage();
  const { rankUpEvent, triggerIfRankUp, dismiss: dismissRankUp } = useRankUpCelebration();
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const patchDropdownRef = useRef<HTMLDivElement>(null);
  const { clientState } = useLeagueClient();
  const { version: patchVersion, displayVersion: patchDisplay, isLoading: patchLoading } = usePatchVersion();
  const { notes: patchNotes, isLoading: patchNotesLoading, patchUrl } = usePatchNotes();
  const navigate = useNavigate();
  const location = useLocation();

  // ─── Navigation history tracking ──────────────────────────────────────────
  // React Router doesn't expose canGoBack/canGoForward, so we track it ourselves
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState(-1);
  const isNavAction = useRef(false); // Flag to distinguish user-nav vs back/forward

  useEffect(() => {
    const path = location.pathname;
    if (isNavAction.current) {
      isNavAction.current = false;
      return;
    }
    // Normal navigation: append to history, trim forward entries
    setNavHistory(prev => {
      const newHistory = [...prev.slice(0, navIndex + 1), path];
      return newHistory;
    });
    setNavIndex(prev => prev + 1);
  }, [location.pathname]);

  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;

  const handleGoBack = useCallback(() => {
    if (!canGoBack) return;
    isNavAction.current = true;
    const newIndex = navIndex - 1;
    setNavIndex(newIndex);
    navigate(navHistory[newIndex]);
  }, [canGoBack, navIndex, navHistory, navigate]);

  const handleGoForward = useCallback(() => {
    if (!canGoForward) return;
    isNavAction.current = true;
    const newIndex = navIndex + 1;
    setNavIndex(newIndex);
    navigate(navHistory[newIndex]);
  }, [canGoForward, navIndex, navHistory, navigate]);

  const handleRefresh = useCallback(() => {
    // Re-navigate to the current path to trigger a re-render without full page reload
    navigate(0);
  }, [navigate]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("velaris-sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);

  // Close patch dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patchDropdownRef.current && !patchDropdownRef.current.contains(e.target as Node)) setShowPatchNotes(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── F11 focus mode toggle ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F11") { e.preventDefault(); setIsFocusMode(prev => !prev); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ─── Ctrl+B sidebar toggle (QoL #11) ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        toggleCollapsed();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleCollapsed]);

  // ─── Scroll to top on route change (QoL #8) ──────────────────────────────
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // ─── Scroll progress bar ──────────────────────────────────────────────────
  const { scrollYProgress } = useScroll({ container: mainRef });
  const scrollScaleX = useSpring(scrollYProgress, { stiffness: 300, damping: 50, restDelta: 0.001 });

  // ─── Global click ripple ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const el = target.closest("button, a, [data-ripple]") as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");
      ripple.style.cssText = `
        position:absolute;border-radius:50%;width:${size}px;height:${size}px;
        left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;
        background:rgba(255,255,255,0.14);pointer-events:none;transform:scale(0);
        animation:velaris-ripple 0.55s cubic-bezier(0.4,0,0.2,1) forwards;z-index:9999;
      `;
      const origPos = el.style.position;
      const origOvf = el.style.overflow;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.overflow = "hidden";
      el.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
        el.style.position = origPos;
        el.style.overflow = origOvf;
      }, 600);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Window control handlers — real Tauri v2 calls with web fallback
  const handleMinimize = () => { minimizeWindow(); };
  const handleMaximize = async () => {
    await toggleMaximizeWindow();
    setIsWindowMaximized(await isMaximized());
  };
  const handleClose = () => { closeWindow(); };

  // Track maximize state on mount and on resize
  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await isMaximized();
      setIsWindowMaximized(maximized);
      // Update #root border-radius for transparent window clipping
      const root = document.getElementById("root");
      if (root) root.style.borderRadius = maximized ? "0" : "8px";
    };
    checkMaximized();
    window.addEventListener("resize", checkMaximized);
    return () => window.removeEventListener("resize", checkMaximized);
  }, []);

  const { data: matchesForAlerts } = useAsyncData(() => getMatchHistory(), [clientState]);

  // ─── Rank-up detection on summoner data load ──────────────────────────────
  useEffect(() => {
    import("../services/dataService").then(({ getSummonerInfo }) => {
      getSummonerInfo().then(s => {
        if (s?.rank) triggerIfRankUp(s.rank, s.division ?? "I");
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientState]);

  // ─── Early tilt nudge (2 consecutive losses) ──────────────────────────────
  useEffect(() => {
    if (!matchesForAlerts || matchesForAlerts.length === 0) return;
    if (earlyTiltDismissed()) return;
    const losses = getConsecutiveLosses(matchesForAlerts);
    if (losses === 2) {
      recordEarlyTiltNudge();
      setTimeout(() => {
        toast(t("tilt.nudge.title"), {
          description: t("tilt.nudge.desc"),
          duration: 8000,
          action: {
            label: t("tilt.nudge.action"),
            onClick: () => setIsFocusMode(true),
          },
        });
      }, 800);
    }
  }, [matchesForAlerts]);

  // ─── Daily streak notifications ───────────────────────────────────────────
  useEffect(() => {
    if (!matchesForAlerts || matchesForAlerts.length === 0) return;
    const info = computeDailyStreak(matchesForAlerts);

    if (info.justBroke && info.current === 0) {
      // Find the streak that just broke (last streak before gap)
      // We can't know exactly, so we show the longest as reference
      const lost = info.longest;
      markBrokenShown();
      setTimeout(() => {
        toast(t("streak.broke.title"), {
          description: t("streak.broke.desc").replace("{count}", String(lost)),
          duration: 7000,
        });
      }, 2000);
      return;
    }

    if (info.newMilestone) {
      setTimeout(() => {
        toast(t("streak.milestone.title").replace("{count}", String(info.newMilestone)), {
          description: t("streak.milestone.desc").replace("{count}", String(info.newMilestone!)),
          duration: 8000,
        });
      }, 2500);
    }
  }, [matchesForAlerts]);

  // ─── Weekly LP nudge (Wed/Thu/Fri, once per week) ────────────────────────
  useEffect(() => {
    if (!shouldShowWeeklyLPNudge()) return;
    try {
      const weeklyGoal = Math.max(1, parseInt(localStorage.getItem(WEEKLY_GOAL_KEY) ?? "300", 10) || 300);
      const history = getLPHistory();
      const weekSnaps = history.filter(s => s.timestamp >= getWeekStart());
      if (weekSnaps.length < 1) return;

      const gained = weekSnaps[weekSnaps.length - 1].totalLP - weekSnaps[0].totalLP;
      const today = new Date().getDay() || 7; // 1=Mon … 7=Sun
      const daysLeft = Math.max(1, 8 - today); // days remaining incl. today
      const remaining = weeklyGoal - gained;

      markWeeklyLPNudgeShown();

      setTimeout(() => {
        if (gained >= weeklyGoal) {
          toast(t("lp.weekly.nudge.title"), {
            description: t("lp.weekly.nudge.done")
              .replace("{gained}", String(gained))
              .replace("{goal}", String(weeklyGoal)),
            duration: 7000,
          });
        } else if (remaining > 0) {
          const perDay = Math.ceil(remaining / daysLeft);
          const onTrack = gained >= Math.round(weeklyGoal * ((today - 1) / 7));
          const key = onTrack ? "lp.weekly.nudge.on-track" : "lp.weekly.nudge.behind";
          toast(t("lp.weekly.nudge.title"), {
            description: t(key)
              .replace("{gained}", String(gained))
              .replace("{remaining}", String(remaining))
              .replace("{perDay}", String(perDay)),
            duration: 7000,
          });
        }
      }, 3500);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Best-week LP record notification ────────────────────────────────────
  useEffect(() => {
    try {
      const lpHistory = getLPHistory();
      if (lpHistory.length < 2) return;
      // Compute this week's gain
      const weekStart = getWeekStart();
      const weekSnaps = lpHistory.filter(s => s.timestamp >= weekStart);
      if (weekSnaps.length < 2) return;
      const gained = weekSnaps[weekSnaps.length - 1].totalLP - weekSnaps[0].totalLP;
      if (gained <= 0) return;
      const isNewRecord = updateBestWeekLP(gained);
      if (isNewRecord) {
        setTimeout(() => {
          toast(t("bestweek.title"), {
            description: t("bestweek.desc").replace("{lp}", String(gained)),
            duration: 8000,
          });
        }, 4000);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Badge check on match history load ───────────────────────────────────
  useEffect(() => {
    if (!matchesForAlerts || matchesForAlerts.length === 0) return;
    try {
      const lpHistory = getLPHistory();
      const newBadges = checkAndSaveBadges(matchesForAlerts, lpHistory);
      newBadges.slice(0, 2).forEach((badge, i) => {
        setTimeout(() => {
          toast(`${badge.icon} ${t(badge.titleKey)}`, {
            description: t(badge.descKey),
            duration: 7000,
          });
        }, 5000 + i * 1200);
      });
    } catch { /* ignore */ }
  }, [matchesForAlerts]);

  // ─── Nav groups ────────────────────────────────────────────────────────────
  const appSettings = loadSettings();
  const coachEnabled = appSettings.coachEnabled ?? true;

  const navGroups = [
    {
      label: t("nav.group.live") || "LIVE",
      items: [
        { path: "/champ-select", label: t("nav.draft"), icon: Users, tourId: "step-3" },
        { path: "/live-game", label: t("nav.liveGame"), icon: Gamepad2, tourId: "step-4" },
      ],
    },
    {
      label: t("nav.group.analysis") || "ANALYSIS",
      items: [
        { path: "/dashboard", label: t("nav.dashboard"), icon: Activity, tourId: "step-2" },
        { path: "/matches", label: t("nav.matches"), icon: History, tourId: "step-6" },
        { path: "/profile", label: t("nav.profile"), icon: User, tourId: "step-5" },
      ],
    },
    {
      label: t("nav.group.improve") || "IMPROVE",
      items: [
        { path: "/goals", label: t("nav.goals"), icon: Trophy, tourId: "step-7" },
        ...(coachEnabled ? [{ path: "/coach", label: t("nav.coach") || "AI Coach", icon: BotMessageSquare }] : []),
        { path: "/notes", label: t("nav.notes"), icon: StickyNote },
      ],
    },
  ];

  // Tools section — collapsible
  const toolItems = [
    { path: "/player-lookup", label: t("nav.playerLookup") || "Player Lookup", icon: Search },
    { path: "/compare", label: t("nav.compare") || "Compare", icon: ArrowLeftRight },
    { path: "/matchups", label: t("nav.matchups"), icon: Crosshair },
    { path: "/champion-pool", label: t("nav.champPool"), icon: Swords },
    { path: "/calendar", label: t("nav.calendar"), icon: CalendarDays },
    { path: "/rune-builder", label: t("nav.runeBuilder"), icon: Sparkles },
  ];

  const isInTools = toolItems.some(item => location.pathname.startsWith(item.path));
  const [toolsOpen, setToolsOpen] = useState(isInTools);

  const getStatusColor = (state: ClientState) => {
    switch(state) {
      case 'CONNECTING': return 'bg-amber-400';
      case 'DISCONNECTED': return 'bg-rose-500';
      case 'IN_GAME': return 'bg-emerald-500';
      case 'CHAMP_SELECT': return 'bg-indigo-500';
      default: return 'bg-emerald-400'; // Lobby, Matchmaking, etc.
    }
  };

  const getStatusText = (state: ClientState) => {
    switch(state) {
      case 'CONNECTING': return t('status.connecting');
      case 'DISCONNECTED': return t('status.disconnected');
      case 'IN_GAME': return t('status.inGame');
      case 'CHAMP_SELECT': return t('status.champSelect');
      case 'LOBBY': return t('status.connected');
      case 'MATCHMAKING': return t('status.matchmaking');
      case 'READY_CHECK': return t('status.readyCheck');
      default: return t('status.connected');
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen w-full bg-background text-foreground font-sans overflow-hidden selection:bg-primary/20 selection:text-primary",
      !isWindowMaximized && "rounded-lg border border-border/60 shadow-xl"
    )}>
      {/* Top Title Bar — full width, Blitz-style frameless */}
      <div 
        className={cn(
          "h-10 w-full flex items-center bg-background flex-shrink-0 select-none border-b border-border/25 shadow-[0_1px_0_0_color-mix(in_srgb,var(--primary)_10%,transparent)]",
          !isWindowMaximized && "rounded-t-lg"
        )}
        data-tauri-drag-region
      >
        {/* Left: Brand + Nav buttons */}
        <div className="flex items-center gap-0.5 pl-4 pr-2 shrink-0">
          <span className="brand-wordmark font-bold text-[12px] tracking-[0.22em]" data-tauri-drag-region>VELARIS</span>
          <div className="w-px h-4 bg-border/60 mx-3" />
          
          {/* Navigation: Back */}
          <button
            onClick={handleGoBack}
            disabled={!canGoBack}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-md transition-colors group",
              "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1",
              canGoBack ? "hover:bg-secondary/70 cursor-pointer" : "opacity-30 cursor-default"
            )}
            aria-label="Go back"
            title="Atrás (Alt+←)"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" strokeWidth={2.5} />
          </button>

          {/* Navigation: Forward */}
          <button
            onClick={handleGoForward}
            disabled={!canGoForward}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-md transition-colors group",
              "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1",
              canGoForward ? "hover:bg-secondary/70 cursor-pointer" : "opacity-30 cursor-default"
            )}
            aria-label="Go forward"
            title="Adelante (Alt+→)"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" strokeWidth={2.5} />
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary/70 transition-colors group focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
            aria-label="Refresh"
          >
            <RotateCw className="w-3 h-3 text-muted-foreground group-hover:text-foreground" strokeWidth={2.5} />
          </button>
        </div>

        {/* Center: Search bar */}
        <div className="flex-1 flex items-center justify-center px-2" data-tauri-drag-region>
          <TitleBarSearch />
        </div>

        {/* Right: Window controls */}
        <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
          <button
            className="w-11 h-10 flex items-center justify-center hover:bg-secondary/60 transition-colors group"
            onClick={handleMinimize}
            aria-label="Minimize"
            title="Minimizar"
          >
            <Minimize2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" strokeWidth={2} />
          </button>
          <button
            className="w-11 h-10 flex items-center justify-center hover:bg-secondary/60 transition-colors group"
            onClick={handleMaximize}
            aria-label={isWindowMaximized ? "Restore" : "Maximize"}
            title={isWindowMaximized ? "Restaurar" : "Maximizar"}
          >
            {isWindowMaximized ? (
              <Maximize className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" strokeWidth={2} />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" strokeWidth={2} />
            )}
          </button>
          <button
            className="w-11 h-10 flex items-center justify-center hover:bg-destructive/10 transition-colors group"
            onClick={handleClose}
            aria-label="Close"
            title="Cerrar"
          >
            <X className="w-4 h-4 text-muted-foreground group-hover:text-destructive" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "flex-shrink-0 bg-sidebar flex flex-col pt-4 pb-5 z-20 transition-all duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] relative border-r border-border/40",
          isFocusMode ? "w-0 opacity-0 overflow-hidden" : isCollapsed ? "w-[60px] opacity-100" : "w-[240px] opacity-100"
        )}>
          {/* Connection Status — read-only indicator */}
          <div className={cn("px-4 mb-4", isCollapsed && "px-2")}>
            {isCollapsed ? (
              <div className="flex items-center justify-center py-1.5" title={getStatusText(clientState)}>
                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]", getStatusColor(clientState), clientState !== 'DISCONNECTED' && "animate-pulse")} />
              </div>
            ) : (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border w-full transition-colors",
                clientState === 'IN_GAME' ? "bg-emerald-500/10 border-emerald-500/25" :
                clientState === 'CHAMP_SELECT' ? "bg-indigo-500/10 border-indigo-500/25" :
                clientState === 'DISCONNECTED' ? "bg-rose-500/10 border-rose-500/25" :
                "bg-secondary/60 border-border/50"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusColor(clientState), clientState !== 'DISCONNECTED' && "animate-pulse")} />
                <span className={cn("text-[10px] font-semibold tracking-wide truncate",
                  clientState === 'DISCONNECTED' ? 'text-rose-400' :
                  clientState === 'IN_GAME' ? 'text-emerald-400' :
                  clientState === 'CHAMP_SELECT' ? 'text-indigo-300' :
                  'text-foreground/70'
                )}>{getStatusText(clientState)}</span>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <div className="px-4 mb-6">
              <CommandMenu />
            </div>
          )}
          
          <div className={cn("flex-1 overflow-y-auto", isCollapsed ? "px-1.5" : "px-3")}>
            <nav className="flex flex-col">
              {navGroups.map((group, gi) => (
                <div key={group.label} className={cn(gi > 0 && "mt-3")}>
                  {!isCollapsed && (
                    <div className="px-3 mb-1 mt-0.5">
                      <span className="text-[9px] font-semibold tracking-[0.12em] text-muted-foreground/38 uppercase select-none">
                        {group.label}
                      </span>
                    </div>
                  )}
                  {isCollapsed && gi > 0 && (
                    <div className="mx-auto w-5 h-px bg-border/40 mb-2" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        data-tour={item.tourId}
                        title={isCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center rounded-lg transition-all duration-150 text-[13px] font-medium select-none relative whitespace-nowrap",
                            isCollapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
                            isActive ? "text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-bg-pill"
                                className="absolute inset-0 rounded-lg nav-active-spin-border"
                                style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 16%, transparent) 0%, transparent 100%)" }}
                                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              />
                            )}
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-indicator"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_10px_var(--color-primary),0_0_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                              />
                            )}
                            <item.icon className={cn("w-4 h-4 min-w-[16px] relative z-10 transition-all duration-200", isActive ? "text-primary nav-icon-active scale-110" : "opacity-70 group-hover:opacity-100 group-hover:scale-105")} strokeWidth={2} />
                            {!isCollapsed && <span className="relative z-10">{item.label}</span>}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}

              {/* Tools section — collapsible */}
              <div className="mt-3">
                {!isCollapsed ? (
                  <button
                    onClick={() => setToolsOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 mb-1 group cursor-pointer"
                  >
                    <span className="text-[9px] font-bold tracking-[0.14em] text-muted-foreground/55 uppercase select-none group-hover:text-muted-foreground/75 transition-colors">
                      {t("nav.group.tools") || "TOOLS"}
                    </span>
                    <ChevronDown className={cn("w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-all", toolsOpen && "rotate-180")} />
                  </button>
                ) : (
                  <div className="mx-auto w-5 h-px bg-border/40 mb-2" />
                )}

                <AnimatePresence initial={false}>
                  {(toolsOpen || isCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-0.5">
                        {toolItems.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.label : undefined}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center rounded-lg transition-colors duration-150 text-[13px] font-medium select-none relative whitespace-nowrap",
                                isCollapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
                                isActive ? "text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                {isActive && (
                                  <motion.div
                                    layoutId="sidebar-bg-pill"
                                    className="absolute inset-0 rounded-lg"
                                    style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 100%)" }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                  />
                                )}
                                {isActive && (
                                  <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_10px_var(--color-primary),0_0_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                  />
                                )}
                                <item.icon className={cn("w-4 h-4 min-w-[16px] relative z-10 transition-all duration-200", isActive ? "text-primary nav-icon-active scale-110" : "opacity-70 group-hover:opacity-100 group-hover:scale-105")} strokeWidth={2} />
                                {!isCollapsed && <span className="relative z-10">{item.label}</span>}
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>
          </div>

          {!isCollapsed && <DailyLPGoal />}

          <div className={cn(isCollapsed ? "px-1.5" : "px-3")}>
            <NavLink
              to="/settings"
              title={isCollapsed ? t("nav.settings") : undefined}
              className={({ isActive }) => cn(
                "flex w-full items-center rounded-lg transition-colors duration-150 text-[13px] font-medium select-none relative whitespace-nowrap",
                isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                isActive ? "text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-bg-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 100%)" }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_10px_var(--color-primary),0_0_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <Settings className="w-4 h-4 min-w-[16px] opacity-80 relative z-10" strokeWidth={2} />
                  {!isCollapsed && <span className="relative z-10">{t("nav.settings")}</span>}
                </>
              )}
            </NavLink>
            <NavLink
              to="/about"
              title={isCollapsed ? "Acerca de" : undefined}
              className={({ isActive }) => cn(
                "flex w-full items-center rounded-lg transition-colors duration-150 text-[13px] font-medium select-none relative whitespace-nowrap",
                isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                isActive ? "text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-bg-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 100%)" }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_10px_var(--color-primary),0_0_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <Info className="w-4 h-4 min-w-[16px] opacity-80 relative z-10" strokeWidth={2} />
                  {!isCollapsed && <span className="relative z-10">Acerca de</span>}
                </>
              )}
            </NavLink>
          </div>

          {/* Collapse toggle */}
          <div className={cn("mt-3 px-3", isCollapsed && "px-1.5")}>
            <button
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors cursor-pointer"
              title={`${isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")} (Ctrl+B)`}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" strokeWidth={2} />
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4" strokeWidth={2} />
                  <span className="text-[11px] font-medium flex-1">{t("sidebar.collapse")}</span>
                  <kbd className="text-[9px] font-mono bg-secondary/80 border border-border/40 rounded px-1 py-0.5 text-muted-foreground/50">^B</kbd>
                </>
              )}
            </button>
          </div>

        </aside>

        {/* Main Content Area */}
        <main
          ref={mainRef}
          className={cn(
          "flex-1 overflow-y-auto relative bg-background border-l border-border/40 transition-all duration-300"
        )}>
          {/* Scroll progress indicator */}
          <motion.div
            style={{ scaleX: scrollScaleX, transformOrigin: "0%" }}
            className="sticky top-0 left-0 right-0 h-[2px] z-50 bg-gradient-to-r from-primary via-primary/60 to-transparent"
          />

          {/* Top Bar inside Main Area */}
          <div className="sticky top-0 z-30 flex items-center justify-between h-14 px-8 bg-background/85 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/30 shadow-[0_1px_0_0_color-mix(in_srgb,var(--primary)_8%,transparent)]">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                  isFocusMode 
                    ? "bg-primary/10 border-primary/20 text-primary" 
                    : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                <Maximize className="w-3.5 h-3.5" />
                {isFocusMode ? t("nav.exitFocusMode") : t("nav.focusMode")}
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative" ref={patchDropdownRef}>
                <div onClick={() => setShowPatchNotes(!showPatchNotes)} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-xs font-medium text-foreground cursor-pointer hover:bg-secondary transition-colors", showPatchNotes && "bg-secondary border-primary/30")}>
                  {patchLoading ? t("common.loading") : t("layout.patchTitle").replace("{version}", patchDisplay)}
                  <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", showPatchNotes && "rotate-180")} />
                </div>
                {showPatchNotes && (
                  <div className="absolute right-0 top-full mt-2 w-[320px] bg-card border border-border/60 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-border/40">
                      <h4 className="text-[13px] font-semibold text-foreground">{t("layout.patchTitle").replace("{version}", patchDisplay)}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("layout.patchChanges")}</p>
                    </div>
                    <div className="p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                      {patchNotesLoading && (
                        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span className="text-[12px]">{t("common.loading")}</span>
                        </div>
                      )}
                      {!patchNotesLoading && patchNotes && patchNotes.length > 0 && patchNotes.map((note, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                          <img src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${note.champ}.png`} alt={note.displayName ?? note.champ} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border/40" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-semibold text-foreground">{note.displayName ?? note.champ}</span>
                              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", note.type === "buff" ? "bg-green-500/10 text-green-500" : note.type === "nerf" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500")}>{t(`layout.patch.type.${note.type}`)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{note.detail}</p>
                          </div>
                        </div>
                      ))}
                      {!patchNotesLoading && (!patchNotes || patchNotes.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-6 gap-3 text-muted-foreground/60">
                          <span className="text-[12px]">{t("layout.patchFallback")}</span>
                          <a
                            href={patchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline"
                          >
                            Ver en leagueoflegends.com →
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-border/40">
                      <a href={patchUrl} target="_blank" rel="noopener noreferrer" className="w-full text-center block py-2 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors">
                        {t("layout.viewPatchNotes")}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <NotificationPanel />
              <ProfileDropdown />
            </div>
          </div>
          
          <div className="relative h-full w-full max-w-6xl mx-auto px-10 pb-12 ambient-top">
            {matchesForAlerts && location.pathname !== "/settings" && <TiltAlertBanner matches={matchesForAlerts} />}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <OnboardingTour />
      <ChampionDrawer />
      <KeyboardShortcuts />
      <WhatsNewModal />
      {matchesForAlerts && <TiltBreakModal matches={matchesForAlerts} />}
      {matchesForAlerts && <WeeklySummary matches={matchesForAlerts} />}
      {rankUpEvent && <RankUpCelebration event={rankUpEvent} onClose={dismissRankUp} />}
    </div>
  );
}