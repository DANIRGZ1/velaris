/**
 * usePatchNotes — Fetches real League of Legends patch notes
 *
 * Sources (tried in order):
 * 1. localStorage cache (24h TTL)
 * 2. CommunityDragon patchnotes JSON
 * 3. League of Legends page-data.json (Gatsby static)
 * 4. null → graceful fallback in UI
 */

import { useState, useEffect } from "react";
import { usePatchVersion } from "./usePatchVersion";

export interface PatchNoteEntry {
  champ: string;
  displayName?: string;
  type: "buff" | "nerf" | "adjust";
  detail: string;
}

interface UsePatchNotesResult {
  notes: PatchNoteEntry[] | null;
  isLoading: boolean;
  patchUrl: string;
  patchTitle: string;
}

const CACHE_KEY = "velaris-patch-notes-v2";
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Tries to detect buff/nerf/adjust from change text
function classifyChange(text: string): "buff" | "nerf" | "adjust" {
  const lower = text.toLowerCase();
  if (/increased|improved|enhanced|higher|more|buffed|\+[0-9]/.test(lower)) return "buff";
  if (/decreased|reduced|lowered|less|nerfed|-[0-9]/.test(lower)) return "nerf";
  return "adjust";
}

// Best-effort parser for CommunityDragon patchnotes JSON
function parseCDragonNotes(raw: unknown): PatchNoteEntry[] | null {
  try {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;

    // CommunityDragon format: { champions: { [name]: { changes: string[] } } }
    if (obj.champions && typeof obj.champions === "object") {
      const entries: PatchNoteEntry[] = [];
      for (const [name, data] of Object.entries(obj.champions as Record<string, unknown>)) {
        const d = data as Record<string, unknown>;
        const changes = Array.isArray(d.changes) ? d.changes : [];
        const summary = (changes[0] as string | undefined) || String(d.summary || "Changes in this patch");
        const type = classifyChange(summary);
        entries.push({ champ: name, type, detail: summary.slice(0, 80) });
        if (entries.length >= 8) break;
      }
      if (entries.length > 0) return entries;
    }

    // Alternate format: array of { name, type, changes }
    if (Array.isArray(obj)) {
      const entries: PatchNoteEntry[] = [];
      for (const item of obj as Record<string, unknown>[]) {
        if (!item.name) continue;
        const name = String(item.name);
        const changes = Array.isArray(item.changes) ? (item.changes as string[]) : [];
        const summary = changes[0] || String(item.summary || "Changes in this patch");
        const type = item.type === "buff" || item.type === "nerf" ? item.type as "buff" | "nerf" : classifyChange(summary);
        entries.push({ champ: name, type, detail: summary.slice(0, 80) });
        if (entries.length >= 8) break;
      }
      if (entries.length > 0) return entries;
    }

    return null;
  } catch {
    return null;
  }
}

// Best-effort parser for League website page-data.json (Gatsby/Contentstack)
function parsePageDataNotes(raw: unknown): PatchNoteEntry[] | null {
  try {
    const str = JSON.stringify(raw);
    // Look for buff/nerf/adjust sections referencing champion names
    // Pattern: find champion names near keywords
    const champPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/g;
    const buffPattern = /increased|improved|enhanced/gi;
    const nerfPattern = /decreased|reduced|lowered/gi;

    const champMatches = [...str.matchAll(champPattern)].map(m => m[1]).filter(n => n.length > 3 && n.length < 20);
    if (champMatches.length < 3) return null;

    // This is too noisy without a real HTML parser, return null to use fallback
    void buffPattern; void nerfPattern; void champMatches;
    return null;
  } catch {
    return null;
  }
}

// Riot patch notes URL — tries the versioned slug first, falls back to the news index.
// Data Dragon version "26.6.1" → display "26.6" → slug "patch-26-6-notes"
// If Riot changes their URL scheme again, the fallback is always the news page.
function buildPatchUrl(displayVersion: string): string {
  const [major, minor] = (displayVersion || "").split(".");
  if (major && minor) {
    return `https://www.leagueoflegends.com/en-us/news/game-updates/patch-${major}-${minor}-notes/`;
  }
  return "https://www.leagueoflegends.com/en-us/news/";
}

const PATCH_NEWS_FALLBACK = "https://www.leagueoflegends.com/en-us/news/game-updates/";

export function usePatchNotes(): UsePatchNotesResult {
  const { displayVersion } = usePatchVersion();
  const [notes, setNotes] = useState<PatchNoteEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [major, minor] = (displayVersion || "").split(".");
  const patchSlug = major && minor ? `patch-${major}-${minor}-notes` : "";
  const patchUrl = displayVersion ? buildPatchUrl(displayVersion) : PATCH_NEWS_FALLBACK;
  const patchTitle = displayVersion ? `Patch ${displayVersion}` : "Patch Notes";

  useEffect(() => {
    if (!displayVersion || !patchSlug) return;

    const cacheKey = `${CACHE_KEY}-${patchSlug}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setNotes(data);
          return;
        }
      }
    } catch { /* ignore */ }

    setIsLoading(true);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8000);

    const tryFetch = async () => {
      // Source 1: CommunityDragon patchnotes
      try {
        const res = await fetch(
          `https://raw.communitydragon.org/latest/cdragon/patchnotes/en_us.json`,
          { signal: ac.signal }
        );
        if (res.ok) {
          const data = await res.json();
          const parsed = parseCDragonNotes(data);
          if (parsed && parsed.length > 0) return parsed;
        }
      } catch { /* try next */ }

      // Source 2: League website page-data.json
      try {
        const res = await fetch(
          `https://www.leagueoflegends.com/page-data/en-us/news/game-updates/${patchSlug}/page-data.json`,
          { signal: ac.signal }
        );
        if (res.ok) {
          const data = await res.json();
          const parsed = parsePageDataNotes(data);
          if (parsed && parsed.length > 0) return parsed;
        }
      } catch { /* try next */ }

      return null;
    };

    tryFetch()
      .then(result => {
        clearTimeout(timer);
        setNotes(result);
        if (result) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ data: result, ts: Date.now() }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => setNotes(null))
      .finally(() => setIsLoading(false));

    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [displayVersion, patchSlug]);

  return { notes, isLoading, patchUrl, patchTitle };
}
