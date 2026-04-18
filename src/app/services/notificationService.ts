/**
 * Notification Service — Velaris
 *
 * Sends OS-level notifications via Tauri's notification plugin.
 * Falls back to a no-op in web preview mode.
 */

import { IS_TAURI } from "../helpers/tauriWindow";

// Debounce: don't spam the same notification
const _sent = new Map<string, number>();
const DEDUP_MS = 5 * 60 * 1000; // 5 minutes per unique notification key

async function sendNotification(title: string, body: string, key: string): Promise<void> {
  const now = Date.now();
  const last = _sent.get(key);
  if (last && now - last < DEDUP_MS) return;
  _sent.set(key, now);

  if (!IS_TAURI) return;

  try {
    const { isPermissionGranted, requestPermission, sendNotification: tauriSend } =
      await import("@tauri-apps/plugin-notification");

    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    if (!granted) return;

    tauriSend({ title, body, icon: "icons/icon.png" });
  } catch {
    // Plugin not available or permission denied — silently skip
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function notifyTilt(streakCount: number): void {
  const messages: Record<number, { title: string; body: string }> = {
    3: {
      title: "3 losses in a row — Velaris",
      body: "We detected a tilt pattern. A short break can make all the difference.",
    },
    4: {
      title: "4 losses in a row — Stop and rest",
      body: "You're on a negative streak. Take a 10-minute break before your next game.",
    },
    5: {
      title: "5 losses — Close the client",
      body: "Velaris recommends stopping for today. Come back tomorrow with a fresh mind.",
    },
  };

  const n = streakCount >= 5 ? 5 : streakCount >= 4 ? 4 : 3;
  const msg = messages[n];
  if (msg) sendNotification(msg.title, msg.body, `tilt-${n}`);
}

export function notifyWinStreak(streakCount: number): void {
  if (streakCount < 5) return;
  sendNotification(
    `${streakCount} wins in a row — Velaris`,
    "Incredible streak! Keep it up.",
    `winstreak-${streakCount}`
  );
}

export function notifyLCUConnected(): void {
  sendNotification("Client connected", "Velaris detected the LoL client.", "lcu-connected");
}

export function notifyGameResult(won: boolean, champion: string, kda: string): void {
  const key = `game-result-${Date.now()}`;
  if (won) {
    sendNotification(`Win with ${champion} — Velaris`, `KDA: ${kda}. Good game!`, key);
  } else {
    sendNotification(`Loss with ${champion} — Velaris`, `KDA: ${kda}. Check the analysis in Post-Game.`, key);
  }
}
