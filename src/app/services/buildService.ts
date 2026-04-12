/**
 * Build Service — Velaris
 *
 * Fetches champion build data from lolalytics via Tauri backend (bypasses CORS).
 * Parses runes + items with real winrates.
 * Falls back gracefully to static CHAMPION_BUILDS if live fetch fails.
 *
 * Cache TTL: 2 hours in localStorage.
 */

import { CHAMPION_BUILDS } from "../data/champion-builds";
import { RUNE_DATA, RUNE_TREES } from "../data/runeData";
import { KEYSTONE_IDS, RUNE_IDS, RUNE_TREE_IDS } from "../data/rune-ids";

import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";

const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// ─── AP champion set for dynamic stat shard computation ──────────────────────
// Champions whose primary damage output is magic — used to select MR vs Armor shards
const AP_CHAMPS = new Set([
  "Ahri","Akali","Amumu","Anivia","Annie","AurelionSol","Azir","Brand",
  "Cassiopeia","Chogath","Diana","Ekko","Elise","Evelynn","Fiddlesticks",
  "Fizz","Galio","Gragas","Hwei","Karthus","Kassadin","Katarina","Kayle",
  "Kennen","KogMaw","Leblanc","LeBlanc","Lissandra","Lux","Malzahar",
  "Mordekaiser","Morgana","Nami","Neeko","Nidalee","Orianna","Rumble",
  "Ryze","Seraphine","Swain","Sylas","Syndra","Taliyah","TwistedFate",
  "Veigar","Velkoz","Vex","Viktor","Vladimir","Xerath","Yuumi","Zac",
  "Ziggs","Zilean","Zoe","Zyra","Karma","Lulu","Sona","Soraka","Milio",
  "Seraphine","Naafiri","Smolder",
]);

/**
 * Compute the 3 stat shard IDs based on the enemy team's damage type.
 *
 * Stat shard IDs:
 *   5008 = Adaptive Force   (Row 1 offense)
 *   5005 = Attack Speed     (Row 1 offense alt)
 *   5007 = Ability Haste    (Row 1 offense alt)
 *   5002 = Armor            (Row 2 / Row 3)
 *   5003 = Magic Resist     (Row 2 / Row 3)
 *   5001 = Scaling Health   (Row 3)
 */
export function computeStatShards(enemies: string[]): [number, number, number] {
  if (!enemies.length) return [5008, 5002, 5001];
  const apCount = enemies.filter(e => AP_CHAMPS.has(e)).length;
  const adCount = enemies.length - apCount;
  // Row 1: always Adaptive Force
  const shard1 = 5008;
  // Row 2 (flex): MR when majority AP, Armor otherwise
  const shard2 = apCount > adCount ? 5003 : 5002;
  // Row 3 (defense): MR if 3+ AP, Armor if 4+ AD, Scaling Health otherwise
  const shard3 = apCount >= 3 ? 5003 : adCount >= 4 ? 5002 : 5001;
  return [shard1, shard2, shard3];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RuneRec {
  id: number;
  name: string;
  icon: string;         // DDragon relative path
  treeId: number;
  treeName: string;
  treeColor: string;    // Tailwind color class
  winrate: number;      // % winrate
  isKeystone: boolean;
}

export interface ItemRec {
  id: number;           // DDragon item ID (0 if unknown)
  name: string;
  winrate: number;
}

export interface BuildRec {
  source: "live" | "static";
  champion: string;
  lane: string;
  winrate: number;
  games: number;
  patch: string;
  // Runes
  keystoneRune: RuneRec | null;
  primaryRunes: RuneRec[];
  secondaryRunes: RuneRec[];
  primaryTreeId: number | null;
  secondaryTreeId: number | null;
  // Items
  coreItems: ItemRec[];
  boots: ItemRec | null;
  skillMax: string;
}

// ─── Rune name → RuneRec helper ───────────────────────────────────────────────

function runeByName(name: string, winrate: number): RuneRec | null {
  const id = KEYSTONE_IDS[name] ?? RUNE_IDS[name];
  if (!id) return null;
  const info = RUNE_DATA[id];
  if (!info) return null;
  const tree = RUNE_TREES[info.treeId];
  return {
    id,
    name: info.name,
    icon: info.icon,
    treeId: info.treeId,
    treeName: tree?.name ?? "",
    treeColor: tree?.color ?? "text-foreground",
    winrate,
    isKeystone: info.row === 0,
  };
}

// ─── Rune ID sets for validation ─────────────────────────────────────────────

const STYLE_IDS = new Set([8000, 8100, 8200, 8300, 8400]);

// Build lookup maps at module load (not inside the hot parser path)
const KEYSTONE_ID_SET: Set<number> = new Set(
  Object.values(RUNE_DATA).filter(r => r.row === 0).map(r => r.id)
);
const VALID_PERK_IDS: Set<number> = new Set(Object.keys(RUNE_DATA).map(Number));
const VALID_SHARD_IDS = new Set([5001, 5002, 5003, 5005, 5007, 5008, 5010]);

// ─── Helper: build a RuneRec from a numeric perk ID ──────────────────────────

function makeRuneRec(id: number, winrate = 0): RuneRec | null {
  const info = RUNE_DATA[id];
  if (!info) return null;
  const tree = RUNE_TREES[info.treeId];
  return {
    id,
    name: info.name,
    icon: info.icon,
    treeId: info.treeId,
    treeName: tree?.name ?? "",
    treeColor: tree?.color ?? "text-foreground",
    winrate,
    isKeystone: info.row === 0,
  };
}

// ─── Strategy A: LoLalytics nested perks.data structure ──────────────────────
// pageProps.data.perks.data[primaryStyleId][keystoneId] = { n, win, sub: { secondaryStyleId: { "r1|r2": { n, win } } } }
// This is the primary format used by LoLalytics as of 2024.

interface RuneExtract {
  primaryStyleId: number;
  secondaryStyleId: number | null;
  keystoneId: number;
  primaryRuneIds: number[];   // rows 1-3 of the primary tree
  secondaryRuneIds: number[]; // 2 runes from the secondary tree
  winrate: number;
  games: number;
}

function extractRunesFromPerksData(perksData: Record<string, any>): RuneExtract | null {
  let best: RuneExtract | null = null;
  let bestCount = 0;

  for (const [styleKey, styleVal] of Object.entries(perksData)) {
    const primaryStyleId = Number(styleKey);
    if (!STYLE_IDS.has(primaryStyleId) || !styleVal || typeof styleVal !== "object") continue;

    for (const [ksKey, ksVal] of Object.entries(styleVal as Record<string, any>)) {
      const keystoneId = Number(ksKey);
      if (!KEYSTONE_ID_SET.has(keystoneId)) continue;

      const ksCount: number = typeof ksVal === "object" ? (ksVal?.n ?? ksVal?.count ?? ksVal?.games ?? 0) : 0;
      const ksWin: number = typeof ksVal === "object" ? (ksVal?.win ?? ksVal?.winRate ?? 0) : 0;

      if (ksCount <= bestCount) continue;

      // Find best secondary style + rune combo
      let secondaryStyleId: number | null = null;
      let secondaryRuneIds: number[] = [];

      const sub = typeof ksVal === "object" ? (ksVal?.sub ?? ksVal?.secondary) : null;
      if (sub && typeof sub === "object") {
        let bestSubCount = 0;
        for (const [subStyleKey, subStyleVal] of Object.entries(sub as Record<string, any>)) {
          const subStyleId = Number(subStyleKey);
          if (!STYLE_IDS.has(subStyleId) || subStyleId === primaryStyleId) continue;

          if (!subStyleVal || typeof subStyleVal !== "object") continue;
          for (const [runeCombo, comboVal] of Object.entries(subStyleVal as Record<string, any>)) {
            const comboCount: number = (comboVal as any)?.n ?? (comboVal as any)?.count ?? 0;
            if (comboCount > bestSubCount) {
              const runeIds = runeCombo.split("|").map(Number).filter(id => VALID_PERK_IDS.has(id));
              if (runeIds.length >= 2) {
                bestSubCount = comboCount;
                secondaryStyleId = subStyleId;
                secondaryRuneIds = runeIds.slice(0, 2);
              }
            }
          }
        }
      }

      // Find best primary runes (rows 1-3 in same tree)
      // LoLalytics sometimes nests them inside the primary style object
      const primaryRuneIds: number[] = [];
      for (let row = 1; row <= 3; row++) {
        let bestRowRune: number | null = null;
        let bestRowCount = 0;
        for (const [runeKey, runeVal] of Object.entries(styleVal as Record<string, any>)) {
          const runeId = Number(runeKey);
          const info = RUNE_DATA[runeId];
          if (!info || info.row !== row || info.treeId !== primaryStyleId) continue;
          const rCount: number = typeof runeVal === "object" ? (runeVal?.n ?? runeVal?.count ?? 0) : 0;
          if (rCount > bestRowCount) { bestRowCount = rCount; bestRowRune = runeId; }
        }
        if (bestRowRune) primaryRuneIds.push(bestRowRune);
      }

      bestCount = ksCount;
      best = {
        primaryStyleId, secondaryStyleId, keystoneId,
        primaryRuneIds, secondaryRuneIds,
        winrate: ksWin, games: ksCount,
      };
    }
  }
  return best;
}

// ─── Strategy B: flat perk-ID array ─────────────────────────────────────────
// Some versions encode the recommended page as a flat array of 6-9 perk IDs
// (keystone, 3 primary, 2 secondary, optionally 3 shard IDs)

function extractRunesFromFlatArray(arr: number[]): RuneExtract | null {
  const runeIds = arr.filter(id => VALID_PERK_IDS.has(id));
  if (runeIds.length < 6) return null;

  const keystoneId = runeIds[0];
  if (!KEYSTONE_ID_SET.has(keystoneId)) return null;

  const ksInfo = RUNE_DATA[keystoneId];
  const primaryStyleId = ksInfo.treeId;

  const primaryRuneIds = runeIds.slice(1, 4).filter(id => {
    const info = RUNE_DATA[id];
    return info && info.treeId === primaryStyleId && info.row > 0;
  });

  const secondaryRuneIds = runeIds.slice(4, 6).filter(id => {
    const info = RUNE_DATA[id];
    return info && info.treeId !== primaryStyleId;
  });

  const secondaryStyleId = secondaryRuneIds.length > 0
    ? (RUNE_DATA[secondaryRuneIds[0]]?.treeId ?? null)
    : null;

  return {
    primaryStyleId, secondaryStyleId, keystoneId,
    primaryRuneIds, secondaryRuneIds, winrate: 0, games: 0,
  };
}

// Recursively search for a flat perk array inside any object/array structure
function findFlatPerkArray(obj: any, depth = 0): number[] | null {
  if (depth > 8 || !obj) return null;

  if (Array.isArray(obj)) {
    // Is this array itself a valid perk sequence?
    if (obj.length >= 6 && obj.every((v: unknown) => typeof v === "number")) {
      const asNums = obj as number[];
      if (KEYSTONE_ID_SET.has(asNums[0]) && asNums.slice(1, 6).every(id => VALID_PERK_IDS.has(id) || VALID_SHARD_IDS.has(id))) {
        return asNums;
      }
    }
    for (const item of obj) {
      const found = findFlatPerkArray(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof obj === "object") {
    // Prioritised keys that LoLalytics or similar sites use
    const priority = ["perks", "selectedPerks", "perkIds", "ids", "selected", "runes", "best", "recommended"];
    for (const key of priority) {
      if (key in obj) {
        const found = findFlatPerkArray(obj[key], depth);
        if (found) return found;
      }
    }
    // General recursion into all object children
    for (const val of Object.values(obj)) {
      const found = findFlatPerkArray(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// ─── Item extraction ──────────────────────────────────────────────────────────

interface ItemExtract {
  coreItems: ItemRec[];
  boots: ItemRec | null;
}

function extractItems(itemsObj: any): ItemExtract {
  const result: ItemExtract = { coreItems: [], boots: null };
  if (!itemsObj || typeof itemsObj !== "object") return result;

  // Core items — LoLalytics stores them as { "id1|id2|id3": { n, win } }
  const coreRaw = itemsObj.core ?? itemsObj.build ?? itemsObj.main ?? itemsObj.coreItems;
  if (coreRaw && typeof coreRaw === "object" && !Array.isArray(coreRaw)) {
    // Pick the combo with most games
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const [key, val] of Object.entries(coreRaw as Record<string, any>)) {
      const count: number = (val as any)?.n ?? (val as any)?.count ?? (val as any)?.games ?? 0;
      if (count > bestCount) { bestCount = count; bestKey = key; }
    }
    if (bestKey) {
      result.coreItems = bestKey.split("|")
        .map(Number)
        .filter(id => id > 0)
        .slice(0, 3)
        .map(id => ({ id, name: `Item ${id}`, winrate: 0 }));
    }
  } else if (Array.isArray(coreRaw)) {
    result.coreItems = coreRaw.slice(0, 3).map((item: any) => ({
      id: item?.id ?? item?.itemId ?? (typeof item === "number" ? item : 0),
      name: item?.name ?? `Item ${item?.id ?? "?"}`,
      winrate: item?.win ?? item?.winRate ?? 0,
    }));
  }

  // Boots — { "itemId": { n, win } } or similar
  const bootRaw = itemsObj.boot ?? itemsObj.boots ?? itemsObj.starter;
  if (bootRaw && typeof bootRaw === "object" && !Array.isArray(bootRaw)) {
    let bestBootKey: string | null = null;
    let bestBootCount = 0;
    for (const [key, val] of Object.entries(bootRaw as Record<string, any>)) {
      const count: number = (val as any)?.n ?? (val as any)?.count ?? 0;
      if (count > bestBootCount) { bestBootCount = count; bestBootKey = key; }
    }
    if (bestBootKey) {
      const bootId = Number(bestBootKey.split("|")[0]);
      if (bootId > 0) result.boots = { id: bootId, name: `Item ${bootId}`, winrate: 0 };
    }
  }

  return result;
}

// ─── Parse lolalytics __NEXT_DATA__ ──────────────────────────────────────────

function parseLolalyticsPageProps(props: any, champion: string, lane: string): BuildRec | null {
  if (!props || typeof props !== "object") return null;

  try {
    // LoLalytics nests build data under different keys across versions.
    // Try each candidate in order until we find usable data.
    const candidates: any[] = [
      props.data,
      props.apiData,
      props.buildData,
      props.championData,
      props.build,
      props,
    ].filter(v => v && typeof v === "object");

    for (const d of candidates) {
      const result = _tryParseCandidate(d, champion, lane);
      if (result) return result;
    }
    return null;
  } catch {
    return null;
  }
}

function _tryParseCandidate(d: any, champion: string, lane: string): BuildRec | null {
  if (!d || typeof d !== "object") return null;

  // ── Metadata ──
  const header: any = d.header ?? d;
  const winrate: number = header.win ?? header.winRate ?? header.win_rate ?? d.win ?? d.winRate ?? 0;
  const games: number   = header.n ?? header.games ?? header.gamesPlayed ?? d.n ?? d.games ?? 0;
  const patch: string   = header.patch ?? header.version ?? d.patch ?? d.version ?? "current";

  // ── Runes: Strategy A — LoLalytics nested perks.data ──
  let runeExtract: RuneExtract | null = null;

  const perksNode: any = d.perks ?? d.runes ?? d.runeData;
  if (perksNode && typeof perksNode === "object") {
    // May be directly the data object OR wrapped under a .data key
    const perksData: Record<string, any> = perksNode.data ?? perksNode;
    if (typeof perksData === "object" && !Array.isArray(perksData)) {
      runeExtract = extractRunesFromPerksData(perksData);
    }
  }

  // ── Runes: Strategy B — look for a flat perk-ID array anywhere in d ──
  if (!runeExtract) {
    const flatArr = findFlatPerkArray(d);
    if (flatArr) runeExtract = extractRunesFromFlatArray(flatArr);
  }

  // ── Build RuneRec objects ──
  const keystoneRune: RuneRec | null = runeExtract
    ? makeRuneRec(runeExtract.keystoneId, Math.round((runeExtract.winrate || winrate) * 10) / 10)
    : null;

  const primaryRunes: RuneRec[] = (runeExtract?.primaryRuneIds ?? [])
    .map(id => makeRuneRec(id))
    .filter((r): r is RuneRec => r !== null);

  const secondaryRunes: RuneRec[] = (runeExtract?.secondaryRuneIds ?? [])
    .map(id => makeRuneRec(id))
    .filter((r): r is RuneRec => r !== null);

  // ── Items ──
  const { coreItems, boots } = extractItems(d.items ?? d.itemData ?? d);

  // Skill order
  const skillMax: string = d.skills?.skillData?.[0]?.key
    ?? d.skillMax ?? d.skillOrder ?? d.skills ?? "";

  // Only return a result if we extracted something useful
  if (!keystoneRune && coreItems.length === 0) return null;

  return {
    source: "live",
    champion, lane,
    winrate: Math.round(winrate * 10) / 10,
    games,
    patch,
    keystoneRune,
    primaryRunes,
    secondaryRunes,
    primaryTreeId: runeExtract?.primaryStyleId ?? keystoneRune?.treeId ?? null,
    secondaryTreeId: runeExtract?.secondaryStyleId ?? null,
    coreItems,
    boots,
    skillMax: typeof skillMax === "string" ? skillMax : "",
  };
}

// ─── Static fallback → BuildRec ──────────────────────────────────────────────

function staticBuildRec(champion: string, lane: string): BuildRec | null {
  const b = CHAMPION_BUILDS[champion];
  if (!b) return null;

  const winrate = b.winrate;

  // Keystone
  const keystoneRune = runeByName(b.keystone, winrate);

  // Primary runes (skip first = keystone duplicate)
  const primaryRunes: RuneRec[] = b.primaryRunes
    .slice(1)
    .map((n) => runeByName(n, winrate))
    .filter((r): r is RuneRec => r !== null);

  // Secondary runes
  const secondaryRunes: RuneRec[] = b.secondaryRunes
    .map((n) => runeByName(n, winrate))
    .filter((r): r is RuneRec => r !== null);

  // Tree IDs
  const primaryTreeId = keystoneRune?.treeId ?? null;
  const secondaryTreeId = RUNE_TREE_IDS[b.secondaryTree] ?? null;

  // Items (IDs filled later by useItemMap)
  const coreItems: ItemRec[] = b.coreItems.map((name) => ({
    id: 0, name, winrate,
  }));
  const boots: ItemRec | null = b.boots
    ? { id: 0, name: b.boots, winrate }
    : null;

  return {
    source: "static",
    champion, lane,
    winrate,
    games: 0,
    patch: "static",
    keystoneRune,
    primaryRunes,
    secondaryRunes,
    primaryTreeId,
    secondaryTreeId,
    coreItems,
    boots,
    skillMax: b.skillMax,
  };
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const _mem: Record<string, { rec: BuildRec; ts: number }> = {};

function cacheKey(champion: string, lane: string) {
  return `velaris-build-${champion}-${lane}`;
}

function readCache(champion: string, lane: string): BuildRec | null {
  const k = `${champion}-${lane}`;
  const mem = _mem[k];
  if (mem && Date.now() - mem.ts < CACHE_TTL) return mem.rec;
  try {
    const raw = localStorage.getItem(cacheKey(champion, lane));
    if (!raw) return null;
    const { rec, ts } = JSON.parse(raw) as { rec: BuildRec; ts: number };
    if (Date.now() - ts < CACHE_TTL) {
      _mem[k] = { rec, ts };
      return rec;
    }
  } catch (e) {
    console.debug("[BuildService] Cache read error:", e);
  }
  return null;
}

function writeCache(champion: string, lane: string, rec: BuildRec) {
  const k = `${champion}-${lane}`;
  const ts = Date.now();
  _mem[k] = { rec, ts };
  try {
    localStorage.setItem(cacheKey(champion, lane), JSON.stringify({ rec, ts }));
  } catch (e) {
    console.debug("[BuildService] Cache write error (quota?):", e);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getBuildRec(
  champion: string,
  lane: string
): Promise<BuildRec | null> {
  if (!champion || champion === "???" || champion === "Unknown") return null;

  // 1. Cache hit
  const cached = readCache(champion, lane);
  if (cached) return cached;

  // 2. Live fetch via Tauri
  if (IS_TAURI) {
    try {
      const pageProps = await tauriInvoke<any>("fetch_champion_build", { champion, lane });
      const live = parseLolalyticsPageProps(pageProps, champion, lane);
      if (live && (live.keystoneRune || live.coreItems.length > 0)) {
        // Merge static rune data whenever live data is incomplete.
        // LCU requires exactly 4 primary + 2 secondary IDs so partial data will fail.
        const isIncomplete =
          !live.keystoneRune ||
          live.primaryRunes.length < 3 ||
          live.secondaryRunes.length < 2 ||
          !live.secondaryTreeId;
        if (isIncomplete) {
          const fallback = staticBuildRec(champion, lane);
          if (fallback) {
            live.keystoneRune   = live.keystoneRune   ?? fallback.keystoneRune;
            live.primaryRunes   = live.primaryRunes.length  >= 3 ? live.primaryRunes   : fallback.primaryRunes;
            live.secondaryRunes = live.secondaryRunes.length >= 2 ? live.secondaryRunes : fallback.secondaryRunes;
            live.primaryTreeId  = live.primaryTreeId  ?? fallback.primaryTreeId;
            live.secondaryTreeId = live.secondaryTreeId ?? fallback.secondaryTreeId;
            live.skillMax = live.skillMax || fallback.skillMax;
            live.boots    = live.boots    ?? fallback.boots;
          }
        }
        writeCache(champion, lane, live);
        return live;
      }
    } catch (e) {
      console.debug(`[BuildService] Live fetch failed for ${champion}/${lane}, using static fallback:`, e);
    }
  }

  // 3. Static fallback
  const rec = staticBuildRec(champion, lane);
  if (rec) writeCache(champion, lane, rec);
  return rec;
}

// ─── Item name → ID helper (uses DDragon item.json) ──────────────────────────

let _itemMap: Record<string, number> | null = null;
let _itemFetchPromise: Promise<Record<string, number>> | null = null;

export async function getItemIdMap(patch: string): Promise<Record<string, number>> {
  if (_itemMap) return _itemMap;
  if (_itemFetchPromise) return _itemFetchPromise;

  _itemFetchPromise = (async () => {
    try {
      const cacheK = `velaris-item-map-${patch}`;
      const cached = localStorage.getItem(cacheK);
      if (cached) {
        _itemMap = JSON.parse(cached);
        return _itemMap!;
      }
      const res = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/item.json`
      );
      const data = await res.json();
      const map: Record<string, number> = {};
      for (const [id, item] of Object.entries(data.data as Record<string, { name: string }>)) {
        map[item.name] = Number(id);
      }
      _itemMap = map;
      try { localStorage.setItem(cacheK, JSON.stringify(map)); } catch {}
      return map;
    } catch {
      return {};
    }
  })();

  return _itemFetchPromise;
}

// ─── Default rune fillers (most popular option per row/tree) ─────────────────
// Used when live data is missing a slot — better than throwing an error.

const TREE_ROW_DEFAULTS: Record<number, Record<number, number>> = {
  8000: { 1: 9111, 2: 9104, 3: 8014 }, // Triumph, Legend: Alacrity, Coup de Grace
  8100: { 1: 8139, 2: 8138, 3: 8105 }, // Taste of Blood, Eyeball Collection, Relentless Hunter
  8200: { 1: 8226, 2: 8210, 3: 8237 }, // Manaflow Band, Transcendence, Scorch
  8300: { 1: 8304, 2: 8345, 3: 8347 }, // Magical Footwear, Biscuit Delivery, Cosmic Insight
  8400: { 1: 8446, 2: 8444, 3: 8451 }, // Demolish, Second Wind, Overgrowth
};

// Pick a secondary tree that differs from primary and has good defaults
function pickDefaultSecondaryTree(primary: number): number {
  const candidates = [8200, 8100, 8000, 8400, 8300].filter(t => t !== primary);
  return candidates[0];
}

const SECONDARY_ROW_DEFAULTS: Record<number, [number, number]> = {
  8000: [9111, 8014],  // Triumph, Coup de Grace
  8100: [8139, 8138],  // Taste of Blood, Eyeball Collection
  8200: [8210, 8237],  // Transcendence, Scorch
  8300: [8345, 8347],  // Biscuit Delivery, Cosmic Insight
  8400: [8444, 8451],  // Second Wind, Overgrowth
};

// ─── Import rune page via LCU ─────────────────────────────────────────────────

export async function importRunePage(
  rec: BuildRec,
  pageName?: string,
  enemies: string[] = [],
): Promise<void> {
  if (!IS_TAURI) throw new Error("Not running in Tauri");
  if (!rec.keystoneRune) throw new Error("No keystone rune in build");

  const primaryStyle = rec.primaryTreeId ?? rec.keystoneRune.treeId;

  // Build primary selections: keystone + up to 3 row runes
  const primaryIds: number[] = [rec.keystoneRune.id];
  for (let row = 1; row <= 3; row++) {
    const fromBuild = rec.primaryRunes.find(r => RUNE_DATA[r.id]?.row === row);
    if (fromBuild) {
      primaryIds.push(fromBuild.id);
    } else {
      // Fill with tree default for this row
      const defaultId = TREE_ROW_DEFAULTS[primaryStyle]?.[row];
      if (defaultId) primaryIds.push(defaultId);
    }
  }

  // Ensure we have exactly 4 primary IDs
  while (primaryIds.length < 4) {
    const missing = primaryIds.length;
    const defaultId = TREE_ROW_DEFAULTS[primaryStyle]?.[missing];
    if (defaultId && !primaryIds.includes(defaultId)) {
      primaryIds.push(defaultId);
    } else break;
  }
  if (primaryIds.length < 4) {
    throw new Error(`Incomplete build for ${rec.champion}: could not fill 4 primary runes`);
  }

  // Secondary style + 2 runes
  const secondaryStyle = rec.secondaryTreeId ?? pickDefaultSecondaryTree(primaryStyle);
  let secondaryIds: number[] = rec.secondaryRunes.slice(0, 2).map(r => r.id);
  if (secondaryIds.length < 2) {
    const defaults = SECONDARY_ROW_DEFAULTS[secondaryStyle] ?? [8210, 8237];
    secondaryIds = [...secondaryIds, ...defaults].slice(0, 2);
  }

  const statShards = computeStatShards(enemies);

  const page = {
    name: pageName ?? `Velaris — ${rec.champion}`,
    primaryStyleId: primaryStyle,
    subStyleId: secondaryStyle,
    selectedPerkIds: [...primaryIds, ...secondaryIds, ...statShards],
    current: true,
  };

  const result = await tauriInvoke<{ success: boolean; message: string }>(
    "import_rune_page",
    { page }
  );
  if (!result.success) throw new Error(result.message);
}

// ─── Import item set via LCU ──────────────────────────────────────────────────

export async function importItemSet(
  rec: BuildRec,
  championId: number,
): Promise<void> {
  if (!IS_TAURI) return;
  // Need at least some item data to push
  const coreItems = rec.coreItems.filter(i => i.id > 0);
  if (coreItems.length === 0 && !(rec.boots && rec.boots.id > 0)) return;

  const blocks: Array<{ items: Array<{ id: string; count: number }>; type: string }> = [];

  if (rec.boots && rec.boots.id > 0) {
    blocks.push({
      items: [{ id: String(rec.boots.id), count: 1 }],
      type: "Boots",
    });
  }
  if (coreItems.length > 0) {
    blocks.push({
      items: coreItems.map(i => ({ id: String(i.id), count: 1 })),
      type: "Core Build",
    });
  }

  const itemSet = {
    associatedChampions: [championId],
    associatedMaps: [11, 12], // Summoner's Rift + ARAM
    blocks,
    map: "any",
    mode: "any",
    preferredItemSlots: [],
    sortrank: 1,
    startedFrom: "blank",
    title: `Velaris — ${rec.champion}`,
    type: "custom",
    uid: `velaris-${rec.champion.toLowerCase()}-${championId}`,
  };

  const result = await tauriInvoke<{ success: boolean; message: string }>(
    "import_item_set",
    { itemSet }
  );
  if (!result.success) throw new Error(result.message);
}

// Apply item IDs from the fetched map to a BuildRec
export function enrichItemIds(rec: BuildRec, itemMap: Record<string, number>): BuildRec {
  return {
    ...rec,
    coreItems: rec.coreItems.map((it) => ({
      ...it,
      id: it.id !== 0 ? it.id : (itemMap[it.name] ?? 0),
    })),
    boots: rec.boots
      ? { ...rec.boots, id: rec.boots.id !== 0 ? rec.boots.id : (itemMap[rec.boots.name] ?? 0) }
      : null,
  };
}
