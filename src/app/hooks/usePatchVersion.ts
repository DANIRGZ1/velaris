import { useState, useEffect } from "react";

const STORAGE_KEY = "velaris-patch-version";
const HARDCODED_FALLBACK = "26.7.1";

function getCachedVersion(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const { version, timestamp } = JSON.parse(cached);
      // Cache valid for 6 hours
      if (version && Date.now() - timestamp < 6 * 60 * 60 * 1000) {
        return version;
      }
    }
  } catch { /* ignore corrupt cache */ }
  return HARDCODED_FALLBACK;
}

function cacheVersion(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, timestamp: Date.now() }));
  } catch { /* localStorage full or unavailable */ }
}

export function usePatchVersion() {
  const [version, setVersion] = useState(getCachedVersion);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/realms/na.json")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.v) {
          setVersion(data.v);
          cacheVersion(data.v);
        }
      })
      .catch((err) => {
        console.error("Error fetching patch version from Data Dragon:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Public-facing patch: first two segments (e.g. "26.6.1" → "26.6")
  const displayVersion = version.split(".").slice(0, 2).join(".");

  return { version, displayVersion, isLoading };
}