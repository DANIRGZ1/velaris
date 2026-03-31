/**
 * Rune Data — Complete ID → Icon + Name + Tree mapping
 * 
 * Uses Data Dragon CDN for rune icons.
 * All IDs match Riot's perk system (LCU API / Match-V5).
 * 
 * Icon URL pattern: https://ddragon.leagueoflegends.com/cdn/img/{path}
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RuneInfo {
  id: number;
  name: string;
  icon: string; // relative path for DDragon
  row: number;  // 0 = keystone, 1-3 = slots
  treeId: number;
}

export interface RuneTreeInfo {
  id: number;
  name: string;
  icon: string;
  color: string;     // Tailwind color class
  colorHex: string;  // For dynamic styling
}

// ─── Rune Trees ───────────────────────────────────────────────────────────────

export const RUNE_TREES: Record<number, RuneTreeInfo> = {
  8000: { id: 8000, name: "Precision",   icon: "perk-images/Styles/7201_Precision.png",   color: "text-yellow-500", colorHex: "#C8AA6E" },
  8100: { id: 8100, name: "Domination",  icon: "perk-images/Styles/7200_Domination.png",  color: "text-red-500",    colorHex: "#D44242" },
  8200: { id: 8200, name: "Sorcery",     icon: "perk-images/Styles/7202_Sorcery.png",     color: "text-blue-400",   colorHex: "#6B8CE8" },
  8300: { id: 8300, name: "Inspiration", icon: "perk-images/Styles/7203_Whimsy.png",      color: "text-cyan-400",   colorHex: "#49AAA7" },
  8400: { id: 8400, name: "Resolve",     icon: "perk-images/Styles/7204_Resolve.png",     color: "text-emerald-500", colorHex: "#A1D586" },
};

// ─── All Runes (Keystones + Minor) ────────────────────────────────────────────

export const RUNE_DATA: Record<number, RuneInfo> = {
  // ══════ PRECISION (8000) ══════
  // Keystones (row 0)
  8005: { id: 8005, name: "Press the Attack", icon: "perk-images/Styles/Precision/PressTheAttack/PressTheAttack.png", row: 0, treeId: 8000 },
  8008: { id: 8008, name: "Lethal Tempo",     icon: "perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png", row: 0, treeId: 8000 },
  8021: { id: 8021, name: "Fleet Footwork",   icon: "perk-images/Styles/Precision/FleetFootwork/FleetFootwork.png", row: 0, treeId: 8000 },
  8010: { id: 8010, name: "Conqueror",        icon: "perk-images/Styles/Precision/Conqueror/Conqueror.png",         row: 0, treeId: 8000 },
  // Row 1
  9101: { id: 9101, name: "Overheal",         icon: "perk-images/Styles/Precision/Overheal.png",         row: 1, treeId: 8000 },
  9111: { id: 9111, name: "Triumph",          icon: "perk-images/Styles/Precision/Triumph.png",          row: 1, treeId: 8000 },
  8009: { id: 8009, name: "Presence of Mind", icon: "perk-images/Styles/Precision/PresenceOfMind/PresenceOfMind.png", row: 1, treeId: 8000 },
  // Row 2
  9104: { id: 9104, name: "Legend: Alacrity",  icon: "perk-images/Styles/Precision/LegendAlacrity/LegendAlacrity.png", row: 2, treeId: 8000 },
  9105: { id: 9105, name: "Legend: Tenacity",  icon: "perk-images/Styles/Precision/LegendTenacity/LegendTenacity.png", row: 2, treeId: 8000 },
  9103: { id: 9103, name: "Legend: Bloodline", icon: "perk-images/Styles/Precision/LegendBloodline/LegendBloodline.png", row: 2, treeId: 8000 },
  // Row 3
  8014: { id: 8014, name: "Coup de Grace",    icon: "perk-images/Styles/Precision/CoupDeGrace/CoupDeGrace.png",   row: 3, treeId: 8000 },
  8017: { id: 8017, name: "Cut Down",         icon: "perk-images/Styles/Precision/CutDown/CutDown.png",           row: 3, treeId: 8000 },
  8299: { id: 8299, name: "Last Stand",       icon: "perk-images/Styles/Precision/LastStand/LastStand.png",        row: 3, treeId: 8000 },

  // ══════ DOMINATION (8100) ══════
  // Keystones (row 0)
  8112: { id: 8112, name: "Electrocute",      icon: "perk-images/Styles/Domination/Electrocute/Electrocute.png",   row: 0, treeId: 8100 },
  8124: { id: 8124, name: "Predator",         icon: "perk-images/Styles/Domination/Predator/Predator.png",         row: 0, treeId: 8100 },
  8128: { id: 8128, name: "Dark Harvest",     icon: "perk-images/Styles/Domination/DarkHarvest/DarkHarvest.png",   row: 0, treeId: 8100 },
  9923: { id: 9923, name: "Hail of Blades",   icon: "perk-images/Styles/Domination/HailOfBlades/HailOfBlades.png", row: 0, treeId: 8100 },
  // Row 1
  8126: { id: 8126, name: "Cheap Shot",       icon: "perk-images/Styles/Domination/CheapShot/CheapShot.png",       row: 1, treeId: 8100 },
  8139: { id: 8139, name: "Taste of Blood",   icon: "perk-images/Styles/Domination/TasteOfBlood/GreenTerror_TasteOfBlood.png", row: 1, treeId: 8100 },
  8143: { id: 8143, name: "Sudden Impact",    icon: "perk-images/Styles/Domination/SuddenImpact/SuddenImpact.png", row: 1, treeId: 8100 },
  // Row 2
  8136: { id: 8136, name: "Zombie Ward",      icon: "perk-images/Styles/Domination/ZombieWard/ZombieWard.png",     row: 2, treeId: 8100 },
  8120: { id: 8120, name: "Ghost Poro",       icon: "perk-images/Styles/Domination/GhostPoro/GhostPoro.png",       row: 2, treeId: 8100 },
  8138: { id: 8138, name: "Eyeball Collection", icon: "perk-images/Styles/Domination/EyeballCollection/EyeballCollection.png", row: 2, treeId: 8100 },
  // Row 3
  8135: { id: 8135, name: "Treasure Hunter",  icon: "perk-images/Styles/Domination/TreasureHunter/TreasureHunter.png", row: 3, treeId: 8100 },
  8134: { id: 8134, name: "Ingenious Hunter", icon: "perk-images/Styles/Domination/IngeniousHunter/IngeniousHunter.png", row: 3, treeId: 8100 },
  8105: { id: 8105, name: "Relentless Hunter", icon: "perk-images/Styles/Domination/RelentlessHunter/RelentlessHunter.png", row: 3, treeId: 8100 },
  8106: { id: 8106, name: "Ultimate Hunter", icon: "perk-images/Styles/Domination/UltimateHunter/UltimateHunter.png", row: 3, treeId: 8100 },

  // ══════ SORCERY (8200) ══════
  // Keystones (row 0)
  8214: { id: 8214, name: "Summon Aery",    icon: "perk-images/Styles/Sorcery/SummonAery/SummonAery.png",       row: 0, treeId: 8200 },
  8229: { id: 8229, name: "Arcane Comet",   icon: "perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png",     row: 0, treeId: 8200 },
  8230: { id: 8230, name: "Phase Rush",     icon: "perk-images/Styles/Sorcery/PhaseRush/PhaseRush.png",         row: 0, treeId: 8200 },
  // Row 1
  8224: { id: 8224, name: "Nullifying Orb", icon: "perk-images/Styles/Sorcery/NullifyingOrb/Pokeshield.png",    row: 1, treeId: 8200 },
  8226: { id: 8226, name: "Manaflow Band", icon: "perk-images/Styles/Sorcery/ManaflowBand/ManaflowBand.png",   row: 1, treeId: 8200 },
  8275: { id: 8275, name: "Nimbus Cloak",   icon: "perk-images/Styles/Sorcery/NimbusCloak/6361.png",            row: 1, treeId: 8200 },
  // Row 2
  8210: { id: 8210, name: "Transcendence",  icon: "perk-images/Styles/Sorcery/Transcendence/Transcendence.png", row: 2, treeId: 8200 },
  8234: { id: 8234, name: "Celerity",       icon: "perk-images/Styles/Sorcery/Celerity/CelerityTemp.png",       row: 2, treeId: 8200 },
  8233: { id: 8233, name: "Absolute Focus", icon: "perk-images/Styles/Sorcery/AbsoluteFocus/AbsoluteFocus.png", row: 2, treeId: 8200 },
  // Row 3
  8237: { id: 8237, name: "Scorch",         icon: "perk-images/Styles/Sorcery/Scorch/Scorch.png",               row: 3, treeId: 8200 },
  8232: { id: 8232, name: "Waterwalking",   icon: "perk-images/Styles/Sorcery/Waterwalking/Waterwalking.png",   row: 3, treeId: 8200 },
  8236: { id: 8236, name: "Gathering Storm", icon: "perk-images/Styles/Sorcery/GatheringStorm/GatheringStorm.png", row: 3, treeId: 8200 },

  // ══════ RESOLVE (8400) ══════
  // Keystones (row 0)
  8437: { id: 8437, name: "Grasp of the Undying", icon: "perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png", row: 0, treeId: 8400 },
  8439: { id: 8439, name: "Aftershock",           icon: "perk-images/Styles/Resolve/VeteranAftershock/VeteranAftershock.png", row: 0, treeId: 8400 },
  8465: { id: 8465, name: "Guardian",             icon: "perk-images/Styles/Resolve/Guardian/Guardian.png",                   row: 0, treeId: 8400 },
  // Row 1
  8446: { id: 8446, name: "Demolish",        icon: "perk-images/Styles/Resolve/Demolish/Demolish.png",           row: 1, treeId: 8400 },
  8463: { id: 8463, name: "Font of Life",    icon: "perk-images/Styles/Resolve/FontOfLife/FontOfLife.png",       row: 1, treeId: 8400 },
  8401: { id: 8401, name: "Shield Bash",     icon: "perk-images/Styles/Resolve/MirrorShell/MirrorShell.png",    row: 1, treeId: 8400 },
  // Row 2
  8429: { id: 8429, name: "Conditioning",    icon: "perk-images/Styles/Resolve/Conditioning/Conditioning.png",   row: 2, treeId: 8400 },
  8444: { id: 8444, name: "Second Wind",     icon: "perk-images/Styles/Resolve/SecondWind/SecondWind.png",       row: 2, treeId: 8400 },
  8473: { id: 8473, name: "Bone Plating",    icon: "perk-images/Styles/Resolve/BonePlating/BonePlating.png",     row: 2, treeId: 8400 },
  // Row 3
  8451: { id: 8451, name: "Overgrowth",      icon: "perk-images/Styles/Resolve/Overgrowth/Overgrowth.png",       row: 3, treeId: 8400 },
  8453: { id: 8453, name: "Revitalize",      icon: "perk-images/Styles/Resolve/Revitalize/Revitalize.png",       row: 3, treeId: 8400 },
  8242: { id: 8242, name: "Unflinching",     icon: "perk-images/Styles/Resolve/Unflinching/Unflinching.png",     row: 3, treeId: 8400 },

  // ══════ INSPIRATION (8300) ══════
  // Keystones (row 0)
  8351: { id: 8351, name: "Glacial Augment",     icon: "perk-images/Styles/Inspiration/GlacialAugment/GlacialAugment.png", row: 0, treeId: 8300 },
  8360: { id: 8360, name: "Unsealed Spellbook",  icon: "perk-images/Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png", row: 0, treeId: 8300 },
  8369: { id: 8369, name: "First Strike",        icon: "perk-images/Styles/Inspiration/FirstStrike/FirstStrike.png", row: 0, treeId: 8300 },
  // Row 1
  8306: { id: 8306, name: "Hextech Flashtraption", icon: "perk-images/Styles/Inspiration/HextechFlashtraption/HextechFlashtraption.png", row: 1, treeId: 8300 },
  8304: { id: 8304, name: "Magical Footwear",     icon: "perk-images/Styles/Inspiration/MagicalFootwear/MagicalFootwear.png", row: 1, treeId: 8300 },
  8321: { id: 8321, name: "Cash Back",            icon: "perk-images/Styles/Inspiration/CashBack/CashBack.png", row: 1, treeId: 8300 },
  // Row 2
  8313: { id: 8313, name: "Triple Tonic",         icon: "perk-images/Styles/Inspiration/TripleTonic/TripleTonic.png", row: 2, treeId: 8300 },
  8352: { id: 8352, name: "Time Warp Tonic",      icon: "perk-images/Styles/Inspiration/TimeWarpTonic/TimeWarpTonic.png", row: 2, treeId: 8300 },
  8345: { id: 8345, name: "Biscuit Delivery",     icon: "perk-images/Styles/Inspiration/BiscuitDelivery/BiscuitDelivery.png", row: 2, treeId: 8300 },
  // Row 3
  8347: { id: 8347, name: "Cosmic Insight",       icon: "perk-images/Styles/Inspiration/CosmicInsight/CosmicInsight.png", row: 3, treeId: 8300 },
  8410: { id: 8410, name: "Approach Velocity",    icon: "perk-images/Styles/Inspiration/ApproachVelocity/ApproachVelocity.png", row: 3, treeId: 8300 },
  8316: { id: 8316, name: "Jack of All Trades",   icon: "perk-images/Styles/Inspiration/JackOfAllTrades/JackOfAllTrades.png", row: 3, treeId: 8300 },
};

// ─── Stat Shards ──────────────────────────────────────────────────────────────

export interface StatShardInfo {
  id: number;
  name: string;
  icon: string;
  description: string;
}

export const STAT_SHARDS: Record<number, StatShardInfo> = {
  5008: { id: 5008, name: "Adaptive Force", icon: "perk-images/StatMods/StatModsAdaptiveForceIcon.png", description: "+9 Adaptive Force" },
  5005: { id: 5005, name: "Attack Speed",   icon: "perk-images/StatMods/StatModsAttackSpeedIcon.png",   description: "+10% Attack Speed" },
  5007: { id: 5007, name: "Ability Haste",  icon: "perk-images/StatMods/StatModsCDRScalingIcon.png",    description: "+8 Ability Haste" },
  5002: { id: 5002, name: "Armor",          icon: "perk-images/StatMods/StatModsArmorIcon.png",         description: "+6 Armor" },
  5003: { id: 5003, name: "Magic Resist",   icon: "perk-images/StatMods/StatModsMagicResIcon.MagicResist_Fix.png", description: "+8 Magic Resist" },
  5001: { id: 5001, name: "Health Scaling", icon: "perk-images/StatMods/StatModsHealthScalingIcon.png", description: "+15-140 Health" },
  5010: { id: 5010, name: "Move Speed",     icon: "perk-images/StatMods/StatModsMovementSpeedIcon.png", description: "+2% Move Speed" },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn/img";

/** Get full DDragon URL for a rune icon */
export function getRuneIconUrl(runeId: number): string {
  const rune = RUNE_DATA[runeId];
  if (rune) return `${DDRAGON_CDN}/${rune.icon}`;
  const shard = STAT_SHARDS[runeId];
  if (shard) return `${DDRAGON_CDN}/${shard.icon}`;
  return "";
}

/** Get full DDragon URL for a rune tree icon */
export function getTreeIconUrl(treeId: number): string {
  const tree = RUNE_TREES[treeId];
  return tree ? `${DDRAGON_CDN}/${tree.icon}` : "";
}

/** Get rune name by ID */
export function getRuneName(runeId: number): string {
  return RUNE_DATA[runeId]?.name || STAT_SHARDS[runeId]?.name || `Rune ${runeId}`;
}

/** Get tree info by ID */
export function getTreeInfo(treeId: number): RuneTreeInfo | null {
  return RUNE_TREES[treeId] || null;
}

/** Parse a full rune page from perk IDs */
export function parseRunePage(perks: {
  perk0?: number; perk1?: number; perk2?: number; perk3?: number;
  perk4?: number; perk5?: number;
  perkPrimaryStyle?: number; perkSubStyle?: number;
}): {
  primaryTree: RuneTreeInfo | null;
  secondaryTree: RuneTreeInfo | null;
  keystone: RuneInfo | null;
  primaryRunes: RuneInfo[];
  secondaryRunes: RuneInfo[];
} {
  const primaryTree = perks.perkPrimaryStyle ? RUNE_TREES[perks.perkPrimaryStyle] || null : null;
  const secondaryTree = perks.perkSubStyle ? RUNE_TREES[perks.perkSubStyle] || null : null;
  const keystone = perks.perk0 ? RUNE_DATA[perks.perk0] || null : null;
  
  const primaryRunes: RuneInfo[] = [];
  if (perks.perk1 && RUNE_DATA[perks.perk1]) primaryRunes.push(RUNE_DATA[perks.perk1]);
  if (perks.perk2 && RUNE_DATA[perks.perk2]) primaryRunes.push(RUNE_DATA[perks.perk2]);
  if (perks.perk3 && RUNE_DATA[perks.perk3]) primaryRunes.push(RUNE_DATA[perks.perk3]);
  
  const secondaryRunes: RuneInfo[] = [];
  if (perks.perk4 && RUNE_DATA[perks.perk4]) secondaryRunes.push(RUNE_DATA[perks.perk4]);
  if (perks.perk5 && RUNE_DATA[perks.perk5]) secondaryRunes.push(RUNE_DATA[perks.perk5]);
  
  return { primaryTree, secondaryTree, keystone, primaryRunes, secondaryRunes };
}
