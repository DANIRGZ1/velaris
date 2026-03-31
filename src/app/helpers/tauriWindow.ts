// Tauri v2 helpers
// Uses window.__TAURI__ global injected by the Tauri runtime.
// Falls back gracefully in web/dev environments.

// ─── Environment ──────────────────────────────────────────────────────────────

export const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

// ─── Typed invoke / listen ────────────────────────────────────────────────────

type TauriGlobal = {
  core: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
  event: { listen: (event: string, handler: (e: { payload: unknown }) => void) => Promise<() => void> };
};

function getTauri(): TauriGlobal | null {
  try {
    const t = (window as unknown as { __TAURI__: TauriGlobal }).__TAURI__;
    return t ?? null;
  } catch {
    return null;
  }
}

/** Invoke a Tauri command. Rejects with an error when not running inside Tauri. */
export function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const t = getTauri();
  if (!t?.core?.invoke) return Promise.reject(new Error("Tauri not available"));
  return t.core.invoke(command, args) as Promise<T>;
}

/** Subscribe to a Tauri backend event. Returns an unsubscribe function. */
export function tauriListen(
  event: string,
  handler: (e: { payload: unknown }) => void,
): Promise<() => void> {
  const t = getTauri();
  if (!t?.event?.listen) return Promise.reject(new Error("Tauri events not available"));
  return t.event.listen(event, handler);
}

// ─── Window helpers ───────────────────────────────────────────────────────────

function getWindow() {
  try {
    const tauri = getTauri() as unknown as { window?: { getCurrentWindow?: () => unknown; appWindow?: unknown } };
    if (tauri?.window?.getCurrentWindow) return tauri.window.getCurrentWindow();
    if (tauri?.window?.appWindow) return tauri.window.appWindow;
  } catch {
    // Not in Tauri environment
  }
  return null;
}

export async function minimizeWindow() {
  const win = getWindow();
  if (win) {
    await win.minimize();
  } else {
    console.log("[Velaris] Minimize — no Tauri runtime detected");
  }
}

export async function toggleMaximizeWindow() {
  const win = getWindow();
  if (win) {
    await win.toggleMaximize();
  } else {
    console.log("[Velaris] Toggle maximize — no Tauri runtime detected");
  }
}

export async function closeWindow() {
  const win = getWindow();
  if (win) {
    await win.close();
  } else {
    console.log("[Velaris] Close — no Tauri runtime detected");
  }
}

export async function isMaximized(): Promise<boolean> {
  const win = getWindow();
  if (win) {
    return await win.isMaximized();
  }
  return false;
}
