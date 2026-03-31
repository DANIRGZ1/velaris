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
      title: "3 derrotas seguidas — Velaris",
      body: "Detectamos un patrón de tilt. Un descanso corto puede marcar la diferencia.",
    },
    4: {
      title: "4 derrotas seguidas — Para y descansa",
      body: "Estás en racha negativa. Sal 10 minutos antes de la siguiente partida.",
    },
    5: {
      title: "5 derrotas — Cierra el cliente",
      body: "Velaris recomienda parar por hoy. Vuelve mañana con la mente fresca.",
    },
  };

  const n = streakCount >= 5 ? 5 : streakCount >= 4 ? 4 : 3;
  const msg = messages[n];
  if (msg) sendNotification(msg.title, msg.body, `tilt-${n}`);
}

export function notifyWinStreak(streakCount: number): void {
  if (streakCount < 5) return;
  sendNotification(
    `${streakCount} victorias seguidas — Velaris`,
    "¡Racha increíble! Sigue así.",
    `winstreak-${streakCount}`
  );
}

export function notifyLCUConnected(): void {
  sendNotification("Cliente conectado", "Velaris detectó el cliente de LoL.", "lcu-connected");
}

export function notifyGameResult(won: boolean, champion: string, kda: string): void {
  const key = `game-result-${Date.now()}`;
  if (won) {
    sendNotification(`Victoria con ${champion} — Velaris`, `KDA: ${kda}. ¡Buena partida!`, key);
  } else {
    sendNotification(`Derrota con ${champion} — Velaris`, `KDA: ${kda}. Revisa el análisis en Post-Game.`, key);
  }
}
