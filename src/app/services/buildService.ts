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

// ─── Parse lolalytics __NEXT_DATA__ ──────────────────────────────────────────

function parseLolalyticsPageProps(props: any, champion: string, lane: string): BuildRec | null {
  if (!props || typeof props !== "object") return null;

  try {
    // lolalytics embeds data inside pageProps under various keys depending on version
    const d =
      props.apiData ??
      props.buildData ??
      props.data ??
      props.build ??
      props;

    if (!d || typeof d !== "object") return null;

    const winrate: number =
      d.winRate ?? d.win_rate ?? d.header?.winRate ?? 0;
    const games: number =
      d.games ?? d.gamesPlayed ?? d.header?.games ?? 0;
    const patch: string =
      d.patch ?? d.version ?? d.header?.patch ?? "current";

    // ── Runes ──
    // lolalytics nests rune arrays under d.runes or similar
    const runeArr: any[] =
      d.runes ??
      d.runeStats ??
      d.perks ??
      [];

    const keystoneRune: RuneRec | null = (() => {
      if (!Array.isArray(runeArr) || runeArr.length === 0) return null;
      // Keystones are usually tier:1 or the first row
      const ks = runeArr.find((r: any) => r.tier === 1 || r.isKeystone || r.slot === 0);
      if (!ks) return null;
      const ksId: number = ks.id ?? ks.runeId;
      const ksInfo = ksId ? RUNE_DATA[ksId] : null;
      if (!ksInfo) return null;
      const tree = RUNE_TREES[ksInfo.treeId];
      const wr = ks.winRate ?? (ks.wins != null ? (ks.wins / Math.max(ks.games ?? 1, 1)) * 100 : winrate);
      return {
        id: ksId, name: ksInfo.name, icon: ksInfo.icon,
        treeId: ksInfo.treeId, treeName: tree?.name ?? "",
        treeColor: tree?.color ?? "text-foreground",
        winrate: Math.round(wr * 10) / 10, isKeystone: true,
      };
    })();

    // ── Items ──
    const itemArr: any[] =
      d.items?.core ??
      d.coreItems ??
      d.itemStats?.core ??
      [];

    const coreItems: ItemRec[] = Array.isArray(itemArr)
      ? itemArr.slice(0, 3).map((item: any) => ({
          id: item.id ?? item.itemId ?? 0,
          name: item.name ?? `Item ${item.id ?? "?"}`,
          winrate: Math.round((item.winRate ?? winrate) * 10) / 10,
        }))
      : [];

    return {
      source: "live",
      champion, lane,
      winrate: Math.round(winrate * 10) / 10,
      games,
      patch,
      keystoneRune,
      primaryRunes: [],
      secondaryRunes: [],
      primaryTreeId: null,
      secondaryTreeId: null,
      coreItems,
      boots: null,
      skillMax: d.skillMax ?? d.skillOrder ?? "",
    };
  } catch {
    return null;
  }
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
        // Merge static rune icons when live data has IDs but we need DDragon icons
        if (!live.keystoneRune) {
          const fallback = staticBuildRec(champion, lane);
          if (fallback) {
            live.keystoneRune = fallback.keystoneRune;
            live.primaryRunes = fallback.primaryRunes;
            live.secondaryRunes = fallback.secondaryRunes;
            live.primaryTreeId = fallback.primaryTreeId;
            live.secondaryTreeId = fallback.secondaryTreeId;
            live.skillMax = live.skillMax || fallback.skillMax;
            live.boots = live.boots ?? fallback.boots;
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

// ─── Import rune page via LCU ─────────────────────────────────────────────────

export async function importRunePage(rec: BuildRec, pageName?: string): Promise<void> {
  if (!IS_TAURI) throw new Error("Not running in Tauri");
  if (!rec.keystoneRune) throw new Error("No keystone rune in build");

  const primaryStyle = rec.primaryTreeId ?? rec.keystoneRune.treeId;
  const secondaryStyle = rec.secondaryTreeId ?? 8000;

  const primarySelections = [
    { perk: rec.keystoneRune.id, var1: 0, var2: 0, var3: 0 },
    ...rec.primaryRunes.slice(0, 3).map((r) => ({ perk: r.id, var1: 0, var2: 0, var3: 0 })),
  ];

  const secondarySelections = rec.secondaryRunes.slice(0, 2).map((r) => ({
    perk: r.id, var1: 0, var2: 0, var3: 0,
  }));

  // LCU requires exactly 4 primary + 2 secondary rune IDs (+ 3 shards = 9 total)
  if (primarySelections.length < 4) {
    throw new Error(`Build incompleto para ${rec.champion}: faltan ${4 - primarySelections.length} runa(s) primaria(s)`);
  }
  if (secondarySelections.length < 2) {
    throw new Error(`Build incompleto para ${rec.champion}: faltan ${2 - secondarySelections.length} runa(s) secundaria(s)`);
  }

  const page = {
    name: pageName ?? `Velaris — ${rec.champion}`,
    primaryStyleId: primaryStyle,
    subStyleId: secondaryStyle,
    selectedPerkIds: [
      ...primarySelections.map((s) => s.perk),
      ...secondarySelections.map((s) => s.perk),
      // Stat shards — use adaptive/armor/health defaults
      5008, 5002, 5001,
    ],
    current: true,
  };

  const result = await tauriInvoke<{ success: boolean; message: string }>(
    "import_rune_page",
    { page }
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
