/**
 * Rune ID Mapping — League of Legends
 * Maps rune display names to their LCU perk IDs.
 * Used for auto-importing rune pages via PUT /lol-perks/v1/pages
 *
 * Sources: Data Dragon, LCU API, Community Wiki
 * Last verified: Patch 14.x
 */

// ─── Rune Trees (Styles) ─────────────────────────────────────────────────────

export const RUNE_TREE_IDS: Record<string, number> = {
  "Precision": 8000,
  "Domination": 8100,
  "Sorcery": 8200,
  "Resolve": 8400,
  "Inspiration": 8300,
};

// ─── Keystones ───────────────────────────────────────────────────────────────

export const KEYSTONE_IDS: Record<string, number> = {
  // Precision
  "Press the Attack": 8005,
  "Lethal Tempo": 8008,
  "Fleet Footwork": 8021,
  "Conqueror": 8010,
  // Domination
  "Electrocute": 8112,
  "Dark Harvest": 8128,
  "Hail of Blades": 9923,
  // Sorcery
  "Summon Aery": 8214,
  "Arcane Comet": 8229,
  "Phase Rush": 8230,
  // Resolve
  "Grasp of the Undying": 8437,
  "Aftershock": 8439,
  "Guardian": 8465,
  // Inspiration
  "Glacial Augment": 8351,
  "Unsealed Spellbook": 8360,
  "First Strike": 8369,
};

// ─── Minor Runes ─────────────────────────────────────────────────────────────

export const RUNE_IDS: Record<string, number> = {
  // === Precision ===
  "Overheal": 9101,
  "Triumph": 9111,
  "Presence of Mind": 8009,
  "Legend: Alacrity": 9104,
  "Legend: Tenacity": 9105,
  "Legend: Bloodline": 9103,
  "Coup de Grace": 8014,
  "Cut Down": 8017,
  "Last Stand": 8299,

  // === Domination ===
  "Cheap Shot": 8126,
  "Taste of Blood": 8139,
  "Sudden Impact": 8143,
  "Zombie Ward": 8136,
  "Ghost Poro": 8120,
  "Eyeball Collection": 8138,
  "Treasure Hunter": 8135,
  "Ingenious Hunter": 8134,
  "Relentless Hunter": 8105,
  "Ultimate Hunter": 8106,

  // === Sorcery ===
  "Nullifying Orb": 8224,
  "Manaflow Band": 8226,
  "Nimbus Cloak": 8275,
  "Transcendence": 8210,
  "Celerity": 8234,
  "Absolute Focus": 8233,
  "Scorch": 8237,
  "Waterwalking": 8232,
  "Gathering Storm": 8236,

  // === Resolve ===
  "Demolish": 8446,
  "Font of Life": 8463,
  "Shield Bash": 8401,
  "Conditioning": 8429,
  "Second Wind": 8444,
  "Bone Plating": 8473,
  "Overgrowth": 8451,
  "Revitalize": 8453,
  "Unflinching": 8242,

  // === Inspiration ===
  "Hextech Flashtraption": 8306,
  "Magical Footwear": 8304,
  "Cash Back": 8321,
  "Triple Tonic": 8313,
  "Time Warp Tonic": 8352,
  "Biscuit Delivery": 8345,
  "Cosmic Insight": 8347,
  "Approach Velocity": 8410,
  "Jack of All Trades": 8316,
};

// ─── Stat Shards ─────────────────────────────────────────────────────────────

export const STAT_SHARD_IDS = {
  "Adaptive Force": 5008,
  "Attack Speed": 5005,
  "Ability Haste": 5007,
  "Armor": 5002,
  "Magic Resist": 5003,
  "Health Scaling": 5001,
  "Move Speed": 5010,
};

// ─── Keystone → Tree Mapping ─────────────────────────────────────────────────

export const KEYSTONE_TO_TREE: Record<string, string> = {
  "Press the Attack": "Precision",
  "Lethal Tempo": "Precision",
  "Fleet Footwork": "Precision",
  "Conqueror": "Precision",
  "Electrocute": "Domination",
  "Dark Harvest": "Domination",
  "Hail of Blades": "Domination",
  "Summon Aery": "Sorcery",
  "Arcane Comet": "Sorcery",
  "Phase Rush": "Sorcery",
  "Grasp of the Undying": "Resolve",
  "Aftershock": "Resolve",
  "Guardian": "Resolve",
  "Glacial Augment": "Inspiration",
  "Unsealed Spellbook": "Inspiration",
  "First Strike": "Inspiration",
};

// ─── Resolve Rune Name → ID (combined lookup) ───────────────────────────────

/** Resolves any rune name (keystone or minor) to its numeric perk ID */
export function resolveRuneId(name: string): number {
  return KEYSTONE_IDS[name] ?? RUNE_IDS[name] ?? 0;
}

/** Resolves a tree name to its style ID */
export function resolveTreeId(name: string): number {
  return RUNE_TREE_IDS[name] ?? 0;
}

/**
 * Converts a full build's rune configuration to the LCU perk page format.
 * 
 * @param keystone - Keystone name (e.g. "Conqueror")
 * @param primaryRunes - Array of 4 primary rune names (including keystone)
 * @param secondaryTree - Secondary tree name (e.g. "Resolve")
 * @param secondaryRunes - Array of 2 secondary rune names
 * @param statShards - Optional [offense, flex, defense] shard names
 * @returns Object ready for LCU PUT /lol-perks/v1/pages
 */
export function buildRunePage(
  pageName: string,
  keystone: string,
  primaryRunes: string[],
  secondaryTree: string,
  secondaryRunes: string[],
  statShards?: [string, string, string]
): {
  name: string;
  primaryStyleId: number;
  subStyleId: number;
  selectedPerkIds: number[];
  current: boolean;
} {
  const primaryTree = KEYSTONE_TO_TREE[keystone] || "Precision";
  const primaryStyleId = resolveTreeId(primaryTree);
  const subStyleId = resolveTreeId(secondaryTree);

  // Build perk array: [keystone, slot1, slot2, slot3, secondary1, secondary2, shard1, shard2, shard3]
  const primaryPerkIds = primaryRunes.map(resolveRuneId);
  const secondaryPerkIds = secondaryRunes.map(resolveRuneId);

  // Default stat shards: Adaptive, Adaptive, Armor
  const shards = statShards
    ? statShards.map(s => STAT_SHARD_IDS[s as keyof typeof STAT_SHARD_IDS] ?? 5008)
    : [5008, 5008, 5002];

  const selectedPerkIds = [...primaryPerkIds, ...secondaryPerkIds, ...shards];

  return {
    name: pageName,
    primaryStyleId,
    subStyleId,
    selectedPerkIds,
    current: true,
  };
}
