/**
 * personalRecordsService — Personal best (PB) tracking
 *
 * Tracks all-time and per-champion records.
 * Compares the just-played match and returns which records were broken.
 */

import type { MatchData } from "../utils/analytics";

const RECORDS_KEY = "velaris-personal-records-v2";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChampRecord {
  kda: number;
  kills: number;
  csPerMin: number;
  matchId?: string;
}

interface RecordStore {
  overall: ChampRecord;
  byChamp: Record<string, ChampRecord>;
}

export interface BrokenRecord {
  type: "kda" | "kills" | "csPerMin";
  scope: "overall" | "champion";
  champion: string;
  oldValue: number;
  newValue: number;
}

// ─── Storage helpers ────────────────────────────────────────────────────────────

function load(): RecordStore {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw) return JSON.parse(raw) as RecordStore;
  } catch {}
  return { overall: { kda: 0, kills: 0, csPerMin: 0 }, byChamp: {} };
}

function save(store: RecordStore): void {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(store)); } catch {}
}

// ─── Main API ───────────────────────────────────────────────────────────────────

/**
 * Checks the given match for personal records.
 * Saves any new records and returns the list of broken records for display.
 *
 * Call this once per match (it doesn't deduplicate by matchId intentionally —
 * the caller should guard against calling twice for the same match).
 */
export function checkAndSavePersonalRecords(match: MatchData): BrokenRecord[] {
  const player = match.participants[match.playerParticipantIndex];
  if (!player) return [];

  const champ     = player.championName ?? "Unknown";
  const durationMin = match.gameDuration / 60;
  const kda       = player.deaths === 0
    ? player.kills + player.assists
    : (player.kills + player.assists) / player.deaths;
  const kills     = player.kills;
  const csPerMin  = (player.totalMinionsKilled + player.neutralMinionsKilled) / durationMin;

  const store   = load();
  const broken: BrokenRecord[] = [];

  // Helper: check one metric for a record bucket
  function check(
    bucket: ChampRecord,
    field: keyof ChampRecord,
    current: number,
    scope: "overall" | "champion",
    champName: string,
  ) {
    if (field === "matchId") return;
    const prev = (bucket[field] as number) ?? 0;
    if (current > prev + 0.05) {  // 0.05 tolerance to avoid float noise
      broken.push({ type: field as BrokenRecord["type"], scope, champion: champName, oldValue: prev, newValue: current });
      (bucket[field] as number) = current;
    }
  }

  // Overall records
  check(store.overall, "kda",      kda,      "overall",   champ);
  check(store.overall, "kills",    kills,    "overall",   champ);
  check(store.overall, "csPerMin", csPerMin, "overall",   champ);

  // Per-champion records
  if (!store.byChamp[champ]) {
    store.byChamp[champ] = { kda: 0, kills: 0, csPerMin: 0 };
  }
  check(store.byChamp[champ], "kda",      kda,      "champion", champ);
  check(store.byChamp[champ], "kills",    kills,    "champion", champ);
  check(store.byChamp[champ], "csPerMin", csPerMin, "champion", champ);

  if (broken.length > 0) save(store);
  return broken;
}

/** Seeds records from the full match history (run once on first load if store is empty). */
export function seedRecordsFromHistory(matches: MatchData[]): void {
  try {
    const existing = localStorage.getItem(RECORDS_KEY);
    if (existing) return; // already seeded
  } catch {}

  const store: RecordStore = { overall: { kda: 0, kills: 0, csPerMin: 0 }, byChamp: {} };

  for (const m of matches) {
    const player = m.participants[m.playerParticipantIndex];
    if (!player) continue;
    const champ = player.championName ?? "Unknown";
    const dmin  = m.gameDuration / 60;
    const kda   = player.deaths === 0
      ? player.kills + player.assists
      : (player.kills + player.assists) / player.deaths;
    const cs    = (player.totalMinionsKilled + player.neutralMinionsKilled) / dmin;

    if (kda    > store.overall.kda)      store.overall.kda      = kda;
    if (player.kills > store.overall.kills)  store.overall.kills    = player.kills;
    if (cs     > store.overall.csPerMin) store.overall.csPerMin = cs;

    if (!store.byChamp[champ]) store.byChamp[champ] = { kda: 0, kills: 0, csPerMin: 0 };
    if (kda    > store.byChamp[champ].kda)      store.byChamp[champ].kda      = kda;
    if (player.kills > store.byChamp[champ].kills)  store.byChamp[champ].kills    = player.kills;
    if (cs     > store.byChamp[champ].csPerMin) store.byChamp[champ].csPerMin = cs;
  }

  save(store);
}
