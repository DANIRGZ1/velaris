import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY    = "velaris-patch-version";
const ACK_KEY        = "velaris-last-ack-patch";
const HARDCODED_FALLBACK = "26.7.1";

function getCachedVersion(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const { version, timestamp } = JSON.parse(cached);
      if (version && Date.now() - timestamp < 6 * 60 * 60 * 1000) return version;
    }
  } catch { /* ignore */ }
  return HARDCODED_FALLBACK;
}

function cacheVersion(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, timestamp: Date.now() }));
  } catch { /* ignore */ }
}

function getLastAckedPatch(): string {
  try { return localStorage.getItem(ACK_KEY) ?? ""; } catch { return ""; }
}

/** Call this when the user has seen the new-patch notification. */
export function acknowledgePatch(version: string) {
  try { localStorage.setItem(ACK_KEY, version); } catch { /* ignore */ }
}

/** Wipe cached data that becomes stale on every patch. */
export function invalidatePatchCaches() {
  try {
    localStorage.removeItem("velaris-tierlist-v2");
    // Remove versioned patch-notes caches
    const keys = Object.keys(localStorage).filter(k => k.startsWith("velaris-patch-notes"));
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function usePatchVersion() {
  const [version, setVersion]   = useState(getCachedVersion);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewPatch, setIsNewPatch] = useState(false);

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/realms/na.json")
      .then(r => r.json())
      .then(data => {
        if (data?.v) {
          const v: string = data.v;
          const display = v.split(".").slice(0, 2).join(".");
          setVersion(v);
          cacheVersion(v);

          // Detect new patch: compare display version with last acknowledged
          const lastAck = getLastAckedPatch();
          if (lastAck !== display) {
            setIsNewPatch(true);
            // Immediately invalidate stale caches
            invalidatePatchCaches();
          }
        }
      })
      .catch(err => console.error("[velaris] patch version fetch:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const ack = useCallback(() => {
    const display = version.split(".").slice(0, 2).join(".");
    acknowledgePatch(display);
    setIsNewPatch(false);
  }, [version]);

  const displayVersion = version.split(".").slice(0, 2).join(".");

  return { version, displayVersion, isLoading, isNewPatch, acknowledgeNewPatch: ack };
}