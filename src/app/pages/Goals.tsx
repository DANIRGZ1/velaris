/**
 * Goals & Milestones — Velaris
 * 
 * Long-term progression tracking system. Users set goals (LP target,
 * champion mastery, performance streaks) and Velaris auto-tracks progress
 * from match history data. Achievements unlock as milestones are reached.
 * 
 * All data persisted in localStorage.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target, Trophy, Flame, TrendingUp, Plus, Check, Trash2, ChevronRight,
  Swords, Eye, Crosshair, Star, Medal, Crown, Zap, Shield, Edit2, X, GripVertical, Loader2
} from "lucide-react";
import { cn } from "../components/ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { getMatchHistory, getSummonerInfo } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import type { MatchData } from "../utils/analytics";
import { RANKED_QUEUE_IDS } from "../utils/analytics";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Goal {
  id: string;
  type: "lp" | "winstreak" | "champion" | "cs" | "vision" | "kda" | "games" | "deathless";
  title: string;
  description: string;
  target: number;
  current: number;
  createdAt: number;
  completedAt?: number;
  icon: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  category: "skill" | "consistency" | "mastery" | "milestone";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS_KEY = "velaris-goals";
const ACHIEVEMENTS_KEY = "velaris-achievements-unlocked";

// Template types with i18n keys
const GOAL_TEMPLATE_DEFS = [
  { type: "lp" as const, titleKey: "goals.tpl.lp", descKey: "goals.tpl.lp.desc", icon: "trending-up", defaultTarget: 100, unit: "LP" },
  { type: "winstreak" as const, titleKey: "goals.tpl.winstreak", descKey: "goals.tpl.winstreak.desc", icon: "flame", defaultTarget: 5, unit: "wins" },
  { type: "champion" as const, titleKey: "goals.tpl.champion", descKey: "goals.tpl.champion.desc", icon: "swords", defaultTarget: 20, unit: "games" },
  { type: "cs" as const, titleKey: "goals.tpl.cs", descKey: "goals.tpl.cs.desc", icon: "crosshair", defaultTarget: 8, unit: "CS/min" },
  { type: "vision" as const, titleKey: "goals.tpl.vision", descKey: "goals.tpl.vision.desc", icon: "eye", defaultTarget: 1.2, unit: "/min" },
  { type: "kda" as const, titleKey: "goals.tpl.kda", descKey: "goals.tpl.kda.desc", icon: "target", defaultTarget: 3.5, unit: "KDA" },
  { type: "games" as const, titleKey: "goals.tpl.games", descKey: "goals.tpl.games.desc", icon: "trophy", defaultTarget: 50, unit: "games" },
  { type: "deathless" as const, titleKey: "goals.tpl.deathless", descKey: "goals.tpl.deathless.desc", icon: "shield", defaultTarget: 3, unit: "games" },
];

// Resolved at render time — helper to get localized templates
function getGoalTemplates(t: (key: string) => string) {
  return GOAL_TEMPLATE_DEFS.map(d => ({
    type: d.type,
    title: t(d.titleKey),
    description: t(d.descKey),
    icon: d.icon,
    defaultTarget: d.defaultTarget,
    unit: d.unit,
  }));
}

// Achievement defs with i18n keys
const ALL_ACHIEVEMENT_DEFS = [
  { id: "first-blood-king", titleKey: "goals.ach.firstBloodKing", descKey: "goals.ach.firstBloodKing.desc", icon: "zap", category: "skill" as const },
  { id: "perfect-game", titleKey: "goals.ach.perfectGame", descKey: "goals.ach.perfectGame.desc", icon: "crown", category: "skill" as const },
  { id: "cs-machine", titleKey: "goals.ach.csMachine", descKey: "goals.ach.csMachine.desc", icon: "crosshair", category: "skill" as const },
  { id: "vision-master", titleKey: "goals.ach.visionMaster", descKey: "goals.ach.visionMaster.desc", icon: "eye", category: "skill" as const },
  { id: "iron-will", titleKey: "goals.ach.ironWill", descKey: "goals.ach.ironWill.desc", icon: "shield", category: "consistency" as const },
  { id: "grinder", titleKey: "goals.ach.grinder", descKey: "goals.ach.grinder.desc", icon: "flame", category: "consistency" as const },
  { id: "comeback-king", titleKey: "goals.ach.comebackKing", descKey: "goals.ach.comebackKing.desc", icon: "trending-up", category: "consistency" as const },
  { id: "diverse-pool", titleKey: "goals.ach.diversePool", descKey: "goals.ach.diversePool.desc", icon: "swords", category: "consistency" as const },
  { id: "one-trick", titleKey: "goals.ach.oneTrick", descKey: "goals.ach.oneTrick.desc", icon: "star", category: "mastery" as const },
  { id: "role-master", titleKey: "goals.ach.roleMaster", descKey: "goals.ach.roleMaster.desc", icon: "medal", category: "mastery" as const },
  { id: "kda-god", titleKey: "goals.ach.kdaGod", descKey: "goals.ach.kdaGod.desc", icon: "target", category: "mastery" as const },
  { id: "first-win", titleKey: "goals.ach.firstVictory", descKey: "goals.ach.firstVictory.desc", icon: "trophy", category: "milestone" as const },
  { id: "win-streak-3", titleKey: "goals.ach.hotStreak", descKey: "goals.ach.hotStreak.desc", icon: "flame", category: "milestone" as const },
  { id: "win-streak-5", titleKey: "goals.ach.unstoppable", descKey: "goals.ach.unstoppable.desc", icon: "flame", category: "milestone" as const },
  { id: "ten-games", titleKey: "goals.ach.gettingStarted", descKey: "goals.ach.gettingStarted.desc", icon: "trophy", category: "milestone" as const },
];

function getAllAchievements(t: (key: string) => string): Achievement[] {
  return ALL_ACHIEVEMENT_DEFS.map(d => ({
    id: d.id,
    title: t(d.titleKey),
    description: t(d.descKey),
    icon: d.icon,
    category: d.category,
  }));
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadGoals(): Goal[] {
  try {
    const stored = localStorage.getItem(GOALS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveGoals(goals: Goal[]) {
  try { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); } catch {}
}

function loadUnlockedAchievements(): string[] {
  try {
    const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveUnlockedAchievements(ids: string[]) {
  try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids)); } catch {}
}

// ─── Achievement checker ──────────────────────────────────────────────────────

function checkAchievements(matches: MatchData[]): string[] {
  const unlocked: string[] = [];
  const players = matches.map(m => ({
    match: m,
    player: m.participants[m.playerParticipantIndex],
  }));
  const sorted = [...players].sort((a, b) => b.match.gameCreation - a.match.gameCreation);
  
  // first-win
  if (players.some(p => p.player.win)) unlocked.push("first-win");
  
  // ten-games
  if (players.length >= 10) unlocked.push("ten-games");
  
  // iron-will
  if (players.length >= 50) unlocked.push("iron-will");
  
  // grinder
  if (players.length >= 100) unlocked.push("grinder");
  
  // Win streaks
  let streak = 0;
  let maxStreak = 0;
  for (const p of sorted) {
    if (p.player.win) { streak++; maxStreak = Math.max(maxStreak, streak); }
    else streak = 0;
  }
  if (maxStreak >= 3) unlocked.push("win-streak-3");
  if (maxStreak >= 5) unlocked.push("win-streak-5");
  
  // first-blood-king
  const fbGames = players.filter(p => p.player.firstBloodKill).length;
  if (fbGames >= 5) unlocked.push("first-blood-king");
  
  // perfect-game
  if (players.some(p => p.player.win && p.player.deaths === 0 && p.player.kills >= 10)) {
    unlocked.push("perfect-game");
  }
  
  // cs-machine
  if (players.length >= 10) {
    const last10 = sorted.slice(0, 10);
    const avgCsm = last10.reduce((s, p) => {
      const cs = p.player.totalMinionsKilled + p.player.neutralMinionsKilled;
      return s + cs / (p.match.gameDuration / 60);
    }, 0) / 10;
    if (avgCsm >= 8) unlocked.push("cs-machine");
  }
  
  // vision-master
  const totalWards = players.reduce((s, p) => s + p.player.wardsPlaced, 0);
  if (totalWards >= 200) unlocked.push("vision-master");
  
  // comeback-king
  const comebacks = players.filter(p => {
    const earlyDeaths = p.player.deathTimestamps.filter(t => t <= 5).length;
    return earlyDeaths >= 3 && p.player.win;
  }).length;
  if (comebacks >= 3) unlocked.push("comeback-king");
  
  // diverse-pool
  const uniqueChamps = new Set(players.map(p => p.player.championName));
  if (uniqueChamps.size >= 10) unlocked.push("diverse-pool");
  
  // one-trick
  const champCounts: Record<string, number> = {};
  players.forEach(p => { champCounts[p.player.championName] = (champCounts[p.player.championName] || 0) + 1; });
  if (Object.values(champCounts).some(c => c >= 20)) unlocked.push("one-trick");
  
  // role-master
  const roleCounts: Record<string, { wins: number; total: number }> = {};
  players.forEach(p => {
    const r = p.player.teamPosition;
    if (!roleCounts[r]) roleCounts[r] = { wins: 0, total: 0 };
    roleCounts[r].total++;
    if (p.player.win) roleCounts[r].wins++;
  });
  if (Object.values(roleCounts).some(r => r.total >= 10 && (r.wins / r.total) >= 0.7)) {
    unlocked.push("role-master");
  }
  
  // kda-god
  if (players.length >= 15) {
    const last15 = sorted.slice(0, 15);
    const avgKda = last15.reduce((s, p) => {
      return s + (p.player.kills + p.player.assists) / Math.max(p.player.deaths, 1);
    }, 0) / 15;
    if (avgKda >= 4) unlocked.push("kda-god");
  }
  
  return unlocked;
}

// ─── Auto goal suggestions ────────────────────────────────────────────────────

interface GoalSuggestion {
  id: string;
  type: Goal["type"];
  titleKey: string;
  descKey: string;
  target: number;
  icon: string;
}

function computeGoalSuggestions(matches: MatchData[]): GoalSuggestion[] {
  if (matches.length < 5) return [];
  const players = matches.map(m => ({ match: m, player: m.participants[m.playerParticipantIndex] }));
  const sorted = [...players].sort((a, b) => b.match.gameCreation - a.match.gameCreation);
  const recent = sorted.slice(0, 20);
  const suggestions: GoalSuggestion[] = [];

  // Suggest CS goal if avg < 7
  const avgCsm = recent.reduce((s, p) => {
    return s + (p.player.totalMinionsKilled + p.player.neutralMinionsKilled) / (p.match.gameDuration / 60);
  }, 0) / recent.length;
  if (avgCsm < 7) suggestions.push({ id: "sug-cs", type: "cs", titleKey: "goals.tpl.cs", descKey: "goals.tpl.cs.desc", target: 7, icon: "crosshair" });

  // Suggest KDA goal if avg < 2
  const avgKda = recent.reduce((s, p) => {
    return s + (p.player.kills + p.player.assists) / Math.max(p.player.deaths, 1);
  }, 0) / recent.length;
  if (avgKda < 2) suggestions.push({ id: "sug-kda", type: "kda", titleKey: "goals.tpl.kda", descKey: "goals.tpl.kda.desc", target: 2.5, icon: "target" });

  // Suggest vision goal if avg vision score < 20
  const avgVision = recent.reduce((s, p) => s + (p.player.visionScore ?? 0), 0) / recent.length;
  if (avgVision < 20) suggestions.push({ id: "sug-vision", type: "vision", titleKey: "goals.tpl.vision", descKey: "goals.tpl.vision.desc", target: 1.2, icon: "eye" });

  // Suggest winstreak if WR > 55%
  const wins = recent.filter(p => p.player.win).length;
  const wr = wins / recent.length;
  if (wr > 0.55) suggestions.push({ id: "sug-streak", type: "winstreak", titleKey: "goals.tpl.winstreak", descKey: "goals.tpl.winstreak.desc", target: 3, icon: "flame" });

  return suggestions.slice(0, 3);
}

// ─── Goal progress calculator ─────────────────────────────────────────────────

function computeGoalProgress(goal: Goal, matches: MatchData[], summonerLp: number): number {
  const players = matches.map(m => ({
    match: m,
    player: m.participants[m.playerParticipantIndex],
  }));
  const sorted = [...players].sort((a, b) => b.match.gameCreation - a.match.gameCreation);
  
  switch (goal.type) {
    case "lp":
      return summonerLp;
    case "winstreak": {
      let streak = 0;
      for (const p of sorted) {
        if (p.player.win) streak++;
        else break;
      }
      return streak;
    }
    case "champion": {
      const champCounts: Record<string, number> = {};
      players.forEach(p => { champCounts[p.player.championName] = (champCounts[p.player.championName] || 0) + 1; });
      return Math.max(...Object.values(champCounts), 0);
    }
    case "cs": {
      if (sorted.length === 0) return 0;
      const recent = sorted.slice(0, 10);
      return parseFloat((recent.reduce((s, p) => {
        return s + (p.player.totalMinionsKilled + p.player.neutralMinionsKilled) / (p.match.gameDuration / 60);
      }, 0) / recent.length).toFixed(1));
    }
    case "vision": {
      if (sorted.length === 0) return 0;
      const recent = sorted.slice(0, 10);
      return parseFloat((recent.reduce((s, p) => s + p.player.visionScore / (p.match.gameDuration / 60), 0) / recent.length).toFixed(1));
    }
    case "kda": {
      if (sorted.length === 0) return 0;
      const recent = sorted.slice(0, 15);
      return parseFloat((recent.reduce((s, p) => s + (p.player.kills + p.player.assists) / Math.max(p.player.deaths, 1), 0) / recent.length).toFixed(1));
    }
    case "games":
      return players.length;
    case "deathless":
      return players.filter(p => p.player.win && p.player.deaths === 0).length;
    default:
      return 0;
  }
}

// ─── Icon resolver ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "trending-up": TrendingUp,
  flame: Flame,
  swords: Swords,
  crosshair: Crosshair,
  eye: Eye,
  target: Target,
  trophy: Trophy,
  shield: Shield,
  star: Star,
  medal: Medal,
  crown: Crown,
  zap: Zap,
};

function GoalIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] || Target;
  return <Icon className={className} />;
}

// ─── Components ───────────────────────────────────────────────────────────────

export function Goals() {
  const { t } = useLanguage();
  const GOAL_TEMPLATES = getGoalTemplates(t);
  const ALL_ACHIEVEMENTS = getAllAchievements(t);
  const [goals, setGoals] = useState<Goal[]>(loadGoals);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [activeTab, setActiveTab] = useState<"goals" | "achievements">("goals");
  const [unlockedIds, setUnlockedIds] = useState<string[]>(loadUnlockedAchievements);
  const deletedGoalRef = useRef<Goal | null>(null);
  const [pendingDeleteGoalId, setPendingDeleteGoalId] = useState<string | null>(null);
  
  const { data: matches, isLoading: matchesLoading } = useAsyncData(() => getMatchHistory(), []);
  const { data: summoner } = useAsyncData(() => getSummonerInfo(), []);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("velaris-dismissed-goal-sug") || "[]"); } catch { return []; }
  });

  // Update goal progress whenever matches change
  useEffect(() => {
    if (!matches || !summoner) return;
    // Only ranked games count toward goal progress
    const ranked = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
    const rankedMatches = ranked.length > 0 ? ranked : matches;

    setGoals(prev => {
      const updated = prev.map(g => {
        const progress = computeGoalProgress(g, rankedMatches, summoner.lp);
        const wasCompleted = !!g.completedAt;
        const isNowComplete = progress >= g.target;
        if (!wasCompleted && isNowComplete) {
          setTimeout(() => toast.success(t("goals.goal.completed"), { description: g.title }), 100);
        }
        return { ...g, current: progress, completedAt: g.completedAt || (isNowComplete ? Date.now() : undefined) };
      });
      saveGoals(updated);
      return updated;
    });

    // Check achievements — toast for newly unlocked ones
    const newUnlocked = checkAchievements(matches);
    setUnlockedIds(prev => {
      const merged = [...new Set([...prev, ...newUnlocked])];
      const brandNew = merged.filter(id => !prev.includes(id));
      if (brandNew.length > 0) {
        const achDef = ALL_ACHIEVEMENT_DEFS.find(a => a.id === brandNew[0]);
        if (achDef) {
          setTimeout(() => toast.success(t("goals.ach.unlocked"), {
            description: t(achDef.titleKey),
          }), 400);
        }
      }
      saveUnlockedAchievements(merged);
      return merged;
    });
  }, [matches, summoner, t]);

  const addGoal = useCallback((type: string, target: number) => {
    const template = GOAL_TEMPLATES.find(t => t.type === type);
    if (!template) return;
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      type: type as Goal["type"],
      title: template.title,
      description: template.description,
      target,
      current: 0,
      createdAt: Date.now(),
      icon: template.icon,
    };
    setGoals(prev => {
      const next = [...prev, newGoal];
      saveGoals(next);
      return next;
    });
    setShowNewGoal(false);
    toast.success(t("qol.goalCreated"));
  }, [GOAL_TEMPLATES, t]);

  const removeGoal = useCallback((id: string) => {
    setGoals(prev => {
      const removed = prev.find(g => g.id === id);
      if (removed) deletedGoalRef.current = removed;
      const next = prev.filter(g => g.id !== id);
      saveGoals(next);
      return next;
    });
    toast(t("qol.goalDeleted"), {
      action: {
        label: t("qol.undo"),
        onClick: () => {
          if (deletedGoalRef.current) {
            setGoals(prev => {
              const next = [...prev, deletedGoalRef.current!];
              saveGoals(next);
              return next;
            });
          }
        },
      },
    });
  }, [t]);

  const moveGoal = useCallback((dragId: string, hoverId: string) => {
    setGoals(prev => {
      const dragIdx = prev.findIndex(g => g.id === dragId);
      const hoverIdx = prev.findIndex(g => g.id === hoverId);
      if (dragIdx < 0 || hoverIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(hoverIdx, 0, moved);
      saveGoals(next);
      return next;
    });
  }, []);

  const activeGoals = goals.filter(g => !g.completedAt);
  const completedGoals = goals.filter(g => g.completedAt);
  const totalAchievements = ALL_ACHIEVEMENT_DEFS.length;
  const unlockedCount = unlockedIds.length;

  const goalSuggestions = useMemo(() => {
    if (!matches) return [];
    const ranked = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
    const src = ranked.length > 0 ? ranked : matches;
    return computeGoalSuggestions(src).filter(s => !dismissedSuggestions.includes(s.id));
  }, [matches, dismissedSuggestions]);

  const dismissSuggestion = useCallback((id: string) => {
    setDismissedSuggestions(prev => {
      const next = [...prev, id];
      try { localStorage.setItem("velaris-dismissed-goal-sug", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col font-sans max-w-4xl pt-4 pb-20"
    >
      {/* Header */}
      <PageHeader
        title={t("goals.title")}
        subtitle={t("goals.subtitle")}
        icon={Trophy}
      />

      {/* Matches loading indicator */}
      {matchesLoading && (
        <div className="flex items-center gap-2 mb-4 text-[12px] text-muted-foreground/60">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col gap-1 card-lift card-shine">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("goals.activeGoals")}</span>
          <span className="text-2xl font-bold text-foreground">{activeGoals.length}</span>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col gap-1 card-lift card-shine">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("goals.completed")}</span>
          <span className="text-2xl font-bold text-emerald-500">{completedGoals.length}</span>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col gap-1 card-lift card-shine">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("goals.achievements")}</span>
          <span className="text-2xl font-bold text-primary">{unlockedCount}/{totalAchievements}</span>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex bg-secondary/40 p-1 rounded-xl border border-border/30 mb-6 w-fit">
        {(["goals", "achievements"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200",
              activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="goals-tab"
                className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/50"
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <span className="relative z-10">
              {tab === "goals" ? <Target className="w-4 h-4 inline mr-1.5" /> : <Medal className="w-4 h-4 inline mr-1.5" />}
              {tab === "goals" ? t("goals.tabGoals") : t("goals.tabAchievements")}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "goals" ? (
          <motion.div
            key="goals"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            {/* Auto-suggestions */}
            <AnimatePresence>
              {goalSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-2"
                >
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    {t("goals.suggested") || "Suggested for you"}
                  </span>
                  {goalSuggestions.map(sug => (
                    <div key={sug.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                      <GoalIcon icon={sug.icon} className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[12px] font-semibold text-foreground">{t(sug.titleKey)}</span>
                        <span className="text-[11px] text-muted-foreground">{t(sug.descKey)}</span>
                      </div>
                      <button onClick={() => addGoal(sug.type, sug.target)}
                        className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 transition-colors cursor-pointer shrink-0">
                        {t("goals.addGoal") || "Add"}
                      </button>
                      <button onClick={() => dismissSuggestion(sug.id)}
                        className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add goal button */}
            <button
              onClick={() => setShowNewGoal(true)}
              className="flex items-center gap-3 px-5 py-4 bg-card border-2 border-dashed border-border/60 rounded-2xl text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-200 group"
            >
              <Plus className="w-5 h-5 group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">{t("goals.addNew")}</span>
            </button>

            {/* New goal modal */}
            <AnimatePresence>
              {showNewGoal && (
                <NewGoalPanel onAdd={addGoal} onCancel={() => setShowNewGoal(false)} />
              )}
            </AnimatePresence>

            {/* Active goals */}
            {activeGoals.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("goals.active")}</h3>
                {activeGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} onRemove={(id) => setPendingDeleteGoalId(id)} onMove={moveGoal} />
                ))}
              </div>
            )}

            {/* Completed goals */}
            {completedGoals.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  {t("goals.completed")}
                </h3>
                {completedGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} onRemove={(id) => setPendingDeleteGoalId(id)} completed />
                ))}
              </div>
            )}

            {goals.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center">
                  <Target className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">{t("goals.noGoals")}</p>
                  <p className="text-[13px] text-muted-foreground">{t("goals.noGoalsDesc")}</p>
                </div>
                <button
                  onClick={() => setShowNewGoal(true)}
                  className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer btn-press"
                >
                  <Plus className="w-4 h-4" />
                  {t("qol.createFirstGoal")}
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="achievements"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            {/* Achievement progress */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">{t("goals.overallProgress")}</span>
                <span className="text-sm font-mono font-bold text-primary">{Math.round((unlockedCount / totalAchievements) * 100)}%</span>
              </div>
              <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlockedCount / totalAchievements) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Achievement categories */}
            {(["milestone", "skill", "consistency", "mastery"] as const).map(category => {
              const categoryAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === category);
              const categoryLabel = t(`goals.${category}`);
              
              return (
                <div key={category} className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{categoryLabel}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoryAchievements.map(achievement => {
                      const isUnlocked = unlockedIds.includes(achievement.id);
                      return (
                        <motion.div
                          key={achievement.id}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                            isUnlocked
                              ? "bg-primary/5 border-primary/20"
                              : "bg-card border-border/60 opacity-60"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            isUnlocked ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground/40"
                          )}>
                            <GoalIcon icon={achievement.icon} className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-sm font-medium truncate", isUnlocked ? "text-foreground" : "text-muted-foreground")}>
                                {achievement.title}
                              </span>
                              {isUnlocked && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </div>
                            <p className="text-[12px] text-muted-foreground truncate">{achievement.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!pendingDeleteGoalId}
        title={t("common.confirmDeleteGoal")}
        description={t("common.confirmDeleteGoalDesc")}
        onConfirm={() => {
          if (pendingDeleteGoalId) {
            removeGoal(pendingDeleteGoalId);
            setPendingDeleteGoalId(null);
          }
        }}
        onCancel={() => setPendingDeleteGoalId(null)}
      />
    </motion.div>
    </DndProvider>
  );
}

// ─── Goal Card ───────────────────────────────────────────────────────────────

function GoalCard({ goal, onRemove, onMove = () => {}, completed = false }: { goal: Goal; onRemove: (id: string) => void; onMove?: (dragId: string, hoverId: string) => void; completed?: boolean }) {
  const { t } = useLanguage();
  const progress = Math.min((goal.current / goal.target) * 100, 100);
  const templates = getGoalTemplates(t);
  const template = templates.find(tp => tp.type === goal.type);
  
  const [{ isDragging }, dragRef] = useDrag({
    type: "goal",
    item: { id: goal.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: "goal",
    drop: (item: { id: string }) => onMove(item.id, goal.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <motion.div
      ref={dropRef}
      layout
      initial={completed ? { scale: 0.98, opacity: 0.8 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
        completed
          ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.12)]"
          : "bg-card border-border/60 hover:border-border/80 card-lift card-shine",
        isDragging && "opacity-40",
        isOver && !isDragging && "border-primary/40 bg-primary/5",
      )}
    >
      {/* Drag handle */}
      {!completed && (
        <div
          ref={dragRef}
          className="w-5 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <div className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
        completed ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"
      )}>
        <GoalIcon icon={goal.icon} className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground truncate">{goal.title}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs text-muted-foreground">
              {goal.current}{template?.unit ? ` ${template.unit}` : ""} / {goal.target}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(goal.id); }}
              className="w-6 h-6 rounded-md hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              completed ? "bg-emerald-500" : "bg-primary",
              !completed && progress >= 90 && "shadow-[0_0_6px_2px_rgba(99,102,241,0.5)]"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        {!completed && progress >= 90 && (
          <span className="text-[10px] text-primary font-semibold mt-0.5">{t("goals.almostDone")} {Math.round(progress)}%</span>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">{goal.description}</p>
      </div>
    </motion.div>
  );
}

// ─── New Goal Panel ───────────────────────────────────────────────────────────

function NewGoalPanel({ onAdd, onCancel }: { onAdd: (type: string, target: number) => void; onCancel: () => void }) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const { t } = useLanguage();
  const GOAL_TEMPLATES = getGoalTemplates(t);
  const selected = GOAL_TEMPLATES.find(t => t.type === selectedType);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-card border border-primary/20 rounded-2xl p-5 shadow-lg card-shine">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{t("goals.createNew")}</h3>
          <button onClick={onCancel} className="w-6 h-6 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!selectedType ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GOAL_TEMPLATES.map(template => (
              <button
                key={template.type}
                onClick={() => { setSelectedType(template.type); setTarget(String(template.defaultTarget)); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-center"
              >
                <GoalIcon icon={template.icon} className="w-5 h-5 text-primary" />
                <span className="text-[12px] font-medium text-foreground">{template.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              <GoalIcon icon={selected!.icon} className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{selected!.title}</p>
                <p className="text-[12px] text-muted-foreground">{selected!.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground shrink-0">{t("goals.target")}</label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="flex-1 bg-secondary/50 border border-border/50 text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                step={selectedType === "cs" || selectedType === "vision" || selectedType === "kda" ? 0.1 : 1}
                min={0}
              />
              <span className="text-sm text-muted-foreground shrink-0">{selected!.unit}</span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setSelectedType(null)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("goals.back")}
              </button>
              <button
                onClick={() => { if (target && parseFloat(target) > 0) onAdd(selectedType, parseFloat(target)); }}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t("goals.createGoal")}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}