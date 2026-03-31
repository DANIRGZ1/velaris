/**
 * CelebrationContext — Orchestrates celebration detection & display.
 *
 * Monitors:
 * • Rank changes (via periodic rank refresh comparison)
 * • Post-game performance (via match history changes)
 *
 * Respects user settings for sensitivity and sound.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import {
  detectRankChange,
  detectGameAchievements,
  filterBySensitivity,
  type AchievementCelebration,
  type RankUpCelebration,
  type CelebrationSensitivity,
} from "../services/celebrationService";
import { loadSettings } from "../services/dataService";
import { getMatchHistory, getSummonerInfo } from "../services/dataService";
import { playAlertSound } from "../utils/audio";
import { AchievementToastStack } from "../components/Celebrations/AchievementToast";
import { RankUpCelebrationView } from "../components/Celebrations/RankUpCelebration";

// ─── Context ──────────────────────────────────────────────────────────────────

interface CelebrationContextType {
  /** Manually trigger an achievement toast (for testing) */
  triggerAchievement: (achievement: AchievementCelebration) => void;
  /** Manually trigger a rank-up celebration (for testing) */
  triggerRankUp: (rankUp: RankUpCelebration) => void;
  /** Force check for new celebrations */
  checkForCelebrations: () => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [achievements, setAchievements] = useState<AchievementCelebration[]>([]);
  const [rankUp, setRankUp] = useState<RankUpCelebration | null>(null);
  // null on first load: intentionally skips the initial check to avoid false positives
  // (we don't want to celebrate a penta that happened days ago when the app boots).
  const lastMatchCount = useRef<number | null>(null);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────
  const getSettings = useCallback(() => loadSettings(), []);

  const playSound = useCallback((tier: "subtle" | "warm" | "epic") => {
    const settings = getSettings();
    if (!settings.celebrationSound) return;
    const vol = parseInt(settings.soundVolume) || 50;
    if (tier === "epic") {
      playAlertSound("celebration_epic", vol);
    } else {
      playAlertSound("celebration", vol);
    }
  }, [getSettings]);

  // ── Manual triggers ─────────────────────────────────────────────────
  const triggerAchievement = useCallback((achievement: AchievementCelebration) => {
    const settings = getSettings();
    if (!settings.celebrationsEnabled) return;

    const filtered = filterBySensitivity(
      [achievement],
      settings.celebrationSensitivity as CelebrationSensitivity,
    );
    if (filtered.length === 0) return;

    setAchievements(prev => [...prev, achievement]);
    playSound(achievement.tier);
  }, [getSettings, playSound]);

  const triggerRankUp = useCallback((ru: RankUpCelebration) => {
    const settings = getSettings();
    if (!settings.celebrationsEnabled) return;
    setRankUp(ru);
    playSound(ru.tier);
  }, [getSettings, playSound]);

  // ── Dismiss handlers ────────────────────────────────────────────────
  const dismissAchievement = useCallback((index: number) => {
    setAchievements(prev => prev.filter((_, i) => i !== index));
  }, []);

  const dismissRankUp = useCallback(() => {
    setRankUp(null);
  }, []);

  // ── Automatic detection ─────────────────────────────────────────────
  const checkForCelebrations = useCallback(async () => {
    const settings = getSettings();
    if (!settings.celebrationsEnabled) return;

    try {
      // Check rank changes
      const info = await getSummonerInfo();
      if (info.rank && info.rank !== "UNRANKED") {
        const rankChange = detectRankChange(info.rank, info.division);
        if (rankChange) {
          triggerRankUp(rankChange);
          return; // Don't stack with achievements on same check
        }
      }

      // Check match achievements
      const matches = await getMatchHistory();
      if (!matches || matches.length === 0) return;

      const currentCount = matches.length;
      // Only check on new match arrival (not on first load)
      if (lastMatchCount.current !== null && currentCount > lastMatchCount.current) {
        // New match detected — evaluate the most recent one
        const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
        const latest = sorted[0];
        const gameAchievements = detectGameAchievements(latest, sorted);

        const filtered = filterBySensitivity(
          gameAchievements,
          settings.celebrationSensitivity as CelebrationSensitivity,
        );

        if (filtered.length > 0) {
          // Stagger achievements slightly
          for (let i = 0; i < filtered.length; i++) {
            const ach = filtered[i] as AchievementCelebration;
            setTimeout(() => {
              triggerAchievement(ach);
            }, i * 800);
          }
        }
      }
      lastMatchCount.current = currentCount;
    } catch {
      // Silently fail — celebrations are non-critical
    }
  }, [getSettings, triggerAchievement, triggerRankUp]);

  // ── Periodic check (every 60s) ─────────────────────────────────────
  useEffect(() => {
    // Initial check after a short delay (let data load first)
    const initialTimer = setTimeout(checkForCelebrations, 5000);

    checkInterval.current = setInterval(checkForCelebrations, 60_000);

    return () => {
      clearTimeout(initialTimer);
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [checkForCelebrations]);

  return (
    <CelebrationContext.Provider
      value={{ triggerAchievement, triggerRankUp, checkForCelebrations }}
    >
      {children}

      {/* Render celebration UI */}
      <AchievementToastStack
        celebrations={achievements}
        onDismiss={dismissAchievement}
      />
      <RankUpCelebrationView
        celebration={rankUp}
        onDismiss={dismissRankUp}
      />
    </CelebrationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error("useCelebration must be used within CelebrationProvider");
  }
  return context;
}