import { motion, AnimatePresence } from "motion/react";
import { X, Shield, Swords, Zap, TrendingUp, TrendingDown, BookOpen, Plus, StickyNote, Heart } from "lucide-react";
import { cn } from "./ui/utils";
import { useChampionDrawer } from "../contexts/ChampionDrawerContext";
import { useNotes } from "../contexts/NotesContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { useState } from "react";
import { useFavoriteChampions } from "../hooks/useFavoriteChampions";

// ─── Champion Data (mock — in production from Data Dragon + community APIs) ──

interface ChampionData {
  name: string;
  displayName: string;
  title: string;
  roles: string[];
  difficulty: number; // 1-3
  winrate: number;
  pickrate: number;
  banrate: number;
  tier: "S" | "A" | "B" | "C" | "D";
  primaryRole: string;
  // Build
  coreItems: { name: string; id: number }[];
  boots: { name: string; id: number };
  startingItems: { name: string; id: number }[];
  // Runes
  primaryTree: string;
  primaryKeystone: string;
  primaryRunes: string[];
  secondaryTree: string;
  secondaryRunes: string[];
  statShards: string[];
  // Spells
  summonerSpells: string[];
  skillOrder: string[];
  // Matchups
  strongAgainst: { name: string; winrate: number }[];
  weakAgainst: { name: string; winrate: number }[];
  // Power spikes
  powerSpikes: { level: string; description: string }[];
  // Tips
  tips: string[];
}

const CHAMPION_DATABASE: Record<string, ChampionData> = {
  Tristana: {
    name: "Tristana", displayName: "Tristana", title: "The Yordle Gunner",
    roles: ["ADC", "MID"], difficulty: 1, winrate: 51.8, pickrate: 8.2, banrate: 3.1, tier: "A", primaryRole: "ADC",
    coreItems: [
      { name: "Kraken Slayer", id: 6672 }, { name: "Phantom Dancer", id: 3046 }, { name: "Infinity Edge", id: 3031 }
    ],
    boots: { name: "Berserker's Greaves", id: 3006 },
    startingItems: [{ name: "Doran's Blade", id: 1055 }, { name: "Health Potion", id: 2003 }],
    primaryTree: "Precision", primaryKeystone: "Lethal Tempo",
    primaryRunes: ["Triumph", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    statShards: ["Attack Speed", "Adaptive Force", "Health"],
    summonerSpells: ["Flash", "Heal"],
    skillOrder: ["E", "Q", "W", "E", "E", "R", "E", "Q", "E", "Q", "R", "Q", "Q", "W", "W", "R", "W", "W"],
    strongAgainst: [{ name: "Jhin", winrate: 54.2 }, { name: "Ezreal", winrate: 53.1 }, { name: "Ashe", winrate: 52.8 }],
    weakAgainst: [{ name: "Draven", winrate: 46.1 }, { name: "Kalista", winrate: 47.2 }, { name: "Lucian", winrate: 47.8 }],
    powerSpikes: [
      { level: "Level 2", description: "W + E combo. If your support lands CC, it's a guaranteed kill." },
      { level: "Level 6", description: "R gives burst + range. Full combo E > AA > AA > AA > R to execute." },
      { level: "2 items", description: "With Kraken + PD, DPS scales massively. Start dominating teamfights." },
    ],
    tips: [
      "Your passive E pushes the wave — be careful not to overextend",
      "Use W to reposition, not to engage (unless it's a 100% secure kill)",
      "R can be used as defensive peel against divers like Zed or Camille",
    ],
  },
  Jinx: {
    name: "Jinx", displayName: "Jinx", title: "The Loose Cannon",
    roles: ["ADC"], difficulty: 2, winrate: 52.3, pickrate: 12.5, banrate: 5.2, tier: "S", primaryRole: "ADC",
    coreItems: [
      { name: "Kraken Slayer", id: 6672 }, { name: "Runaan's Hurricane", id: 3085 }, { name: "Infinity Edge", id: 3031 }
    ],
    boots: { name: "Berserker's Greaves", id: 3006 },
    startingItems: [{ name: "Doran's Blade", id: 1055 }, { name: "Health Potion", id: 2003 }],
    primaryTree: "Precision", primaryKeystone: "Lethal Tempo",
    primaryRunes: ["Triumph", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    statShards: ["Attack Speed", "Adaptive Force", "Health"],
    summonerSpells: ["Flash", "Heal"],
    skillOrder: ["Q", "W", "E", "Q", "Q", "R", "Q", "W", "Q", "W", "R", "W", "W", "E", "E", "R", "E", "E"],
    strongAgainst: [{ name: "Ashe", winrate: 54.1 }, { name: "Sivir", winrate: 53.5 }, { name: "Varus", winrate: 52.9 }],
    weakAgainst: [{ name: "Draven", winrate: 45.8 }, { name: "Lucian", winrate: 46.5 }, { name: "Samira", winrate: 47.1 }],
    powerSpikes: [
      { level: "Level 1", description: "Minigun with Lethal Tempo stacked trades very well." },
      { level: "Level 6", description: "Global R to execute or assist in distant fights." },
      { level: "3 items", description: "With Kraken + Runaan's + IE, Jinx in teamfights is unstoppable with the passive." },
    ],
    tips: [
      "Start with minigun and switch to rockets after getting the passive (kill/assist)",
      "E traps are great as peel — place them at your feet when divers come at you",
      "Your R deals more damage the further it travels — cross-map snipes are legit",
    ],
  },
  Aatrox: {
    name: "Aatrox", displayName: "Aatrox", title: "The Darkin Blade",
    roles: ["TOP"], difficulty: 2, winrate: 50.5, pickrate: 9.8, banrate: 12.1, tier: "A", primaryRole: "TOP",
    coreItems: [
      { name: "Eclipse", id: 6692 }, { name: "Black Cleaver", id: 3071 }, { name: "Serylda's Grudge", id: 6694 }
    ],
    boots: { name: "Plated Steelcaps", id: 3047 },
    startingItems: [{ name: "Doran's Blade", id: 1055 }, { name: "Health Potion", id: 2003 }],
    primaryTree: "Precision", primaryKeystone: "Conqueror",
    primaryRunes: ["Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Revitalize", "Unflinching"],
    statShards: ["Adaptive Force", "Adaptive Force", "Health"],
    summonerSpells: ["Flash", "Teleport"],
    skillOrder: ["Q", "E", "W", "Q", "Q", "R", "Q", "E", "Q", "E", "R", "E", "E", "W", "W", "R", "W", "W"],
    strongAgainst: [{ name: "Sion", winrate: 55.2 }, { name: "Ornn", winrate: 54.1 }, { name: "Malphite", winrate: 53.5 }],
    weakAgainst: [{ name: "Fiora", winrate: 44.8 }, { name: "Irelia", winrate: 45.5 }, { name: "Camille", winrate: 46.2 }],
    powerSpikes: [
      { level: "Level 3", description: "With Q + E + W available, your full trades are devastating." },
      { level: "Level 6", description: "R increases your AD and healing. All-in with ignite/TP advantage is a guaranteed kill." },
      { level: "1 item", description: "Eclipse + stacked Conqueror = absurd healing in extended fights." },
    ],
    tips: [
      "Save your E to land Q sweet spots, especially Q2 and Q3",
      "W is for securing Q3 — combo: Q1 > E+Q2 > W > Q3",
      "Your biggest weakness is Grievous Wounds — if they buy it, play more for splitpush",
    ],
  },
  Ahri: {
    name: "Ahri", displayName: "Ahri", title: "The Nine-Tailed Fox",
    roles: ["MID"], difficulty: 1, winrate: 52.1, pickrate: 10.3, banrate: 4.5, tier: "S", primaryRole: "MID",
    coreItems: [
      { name: "Luden's Companion", id: 3118 }, { name: "Shadowflame", id: 4645 }, { name: "Rabadon's Deathcap", id: 3089 }
    ],
    boots: { name: "Sorcerer's Shoes", id: 3020 },
    startingItems: [{ name: "Doran's Ring", id: 1056 }, { name: "Health Potion x2", id: 2003 }],
    primaryTree: "Domination", primaryKeystone: "Electrocute",
    primaryRunes: ["Taste of Blood", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    statShards: ["Adaptive Force", "Adaptive Force", "Health"],
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: ["Q", "W", "E", "Q", "Q", "R", "Q", "W", "Q", "W", "R", "W", "W", "E", "E", "R", "E", "E"],
    strongAgainst: [{ name: "Veigar", winrate: 55.1 }, { name: "Lux", winrate: 53.8 }, { name: "Brand", winrate: 53.2 }],
    weakAgainst: [{ name: "Kassadin", winrate: 44.5 }, { name: "Fizz", winrate: 45.8 }, { name: "Yasuo", winrate: 46.3 }],
    powerSpikes: [
      { level: "Level 3", description: "E > W > Q combo with Electrocute deals massive burst." },
      { level: "Level 6", description: "R gives 3 dashes. Roaming with active R is deadly for bot/top." },
      { level: "2 items", description: "Luden's + Shadowflame = one-shot squishies with full combo." },
    ],
    tips: [
      "Your Q has a return trajectory — position so both hits land on the enemy",
      "E passes through minions on the first unit it hits — look for clean angles",
      "Post-6 your best play is to push the wave and roam with R",
    ],
  },
  LeeSin: {
    name: "LeeSin", displayName: "Lee Sin", title: "The Blind Monk",
    roles: ["JGL", "TOP"], difficulty: 3, winrate: 48.9, pickrate: 14.2, banrate: 8.5, tier: "B", primaryRole: "JGL",
    coreItems: [
      { name: "Goredrinker", id: 6630 }, { name: "Black Cleaver", id: 3071 }, { name: "Death's Dance", id: 6333 }
    ],
    boots: { name: "Plated Steelcaps", id: 3047 },
    startingItems: [{ name: "Gustwalker Hatchling", id: 1102 }],
    primaryTree: "Precision", primaryKeystone: "Conqueror",
    primaryRunes: ["Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    statShards: ["Adaptive Force", "Adaptive Force", "Health"],
    summonerSpells: ["Flash", "Smite"],
    skillOrder: ["Q", "W", "E", "Q", "Q", "R", "Q", "W", "Q", "W", "R", "W", "W", "E", "E", "R", "E", "E"],
    strongAgainst: [{ name: "Evelynn", winrate: 55.3 }, { name: "Karthus", winrate: 54.8 }, { name: "Nidalee", winrate: 53.5 }],
    weakAgainst: [{ name: "Rammus", winrate: 44.2 }, { name: "Amumu", winrate: 45.1 }, { name: "Udyr", winrate: 46.5 }],
    powerSpikes: [
      { level: "Level 3", description: "Full clear + gank with Q > Q2 > E > W is your first action window." },
      { level: "Level 6", description: "Insec (Q > Ward > W > R > Q2) is one of the most impactful mechanics in the game." },
      { level: "1 item", description: "Goredrinker gives you sustain for river skirmishes and objective fights." },
    ],
    tips: [
      "Practice the Insec in Practice Tool — it's your most powerful tool",
      "Your late game is weak — aim to close out before 30 minutes",
      "W onto allied wards to escape — always carry Control Wards",
    ],
  },
  Nautilus: {
    name: "Nautilus", displayName: "Nautilus", title: "The Titan of the Depths",
    roles: ["SUP"], difficulty: 1, winrate: 51.2, pickrate: 7.8, banrate: 6.3, tier: "A", primaryRole: "SUP",
    coreItems: [
      { name: "Locket of the Iron Solari", id: 3190 }, { name: "Knight's Vow", id: 3109 }, { name: "Zeke's Convergence", id: 3050 }
    ],
    boots: { name: "Mobility Boots", id: 3117 },
    startingItems: [{ name: "Relic Shield", id: 3858 }, { name: "Health Potion x2", id: 2003 }],
    primaryTree: "Resolve", primaryKeystone: "Aftershock",
    primaryRunes: ["Shield Bash", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    statShards: ["Health", "Armor", "Health"],
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: ["Q", "W", "E", "Q", "Q", "R", "Q", "E", "Q", "E", "R", "E", "E", "W", "W", "R", "W", "W"],
    strongAgainst: [{ name: "Senna", winrate: 55.8 }, { name: "Lux", winrate: 54.2 }, { name: "Soraka", winrate: 53.1 }],
    weakAgainst: [{ name: "Morgana", winrate: 43.5 }, { name: "Braum", winrate: 46.1 }, { name: "Alistar", winrate: 46.8 }],
    powerSpikes: [
      { level: "Level 2", description: "Q + passive auto-attack = lethal CC chain with an aggressive ADC." },
      { level: "Level 6", description: "R is point-and-click — impossible to dodge. Great for picks." },
      { level: "Mobility Boots", description: "With Mobi Boots you can roam to mid and create map pressure." },
    ],
    tips: [
      "Your passive roots on the first auto — use it before E to maximize CC",
      "Q has a generous hitbox — throw it through minions at an angle",
      "In teamfights, R the enemy carry then Q to block their escape",
    ],
  },
};

// ─── Known champion roles for fallback when champ is not in CHAMPION_DATABASE ──
const KNOWN_ROLES: Record<string, { roles: string[]; primaryRole: string }> = {
  Morgana: { roles: ["SUP", "MID"], primaryRole: "SUP" },
  Nami: { roles: ["SUP"], primaryRole: "SUP" },
  Seraphine: { roles: ["SUP", "APC"], primaryRole: "SUP" },
  Blitzcrank: { roles: ["SUP"], primaryRole: "SUP" },
  Lulu: { roles: ["SUP"], primaryRole: "SUP" },
  Janna: { roles: ["SUP"], primaryRole: "SUP" },
  Sona: { roles: ["SUP"], primaryRole: "SUP" },
  Soraka: { roles: ["SUP"], primaryRole: "SUP" },
  Thresh: { roles: ["SUP"], primaryRole: "SUP" },
  Leona: { roles: ["SUP"], primaryRole: "SUP" },
  Braum: { roles: ["SUP"], primaryRole: "SUP" },
  Karma: { roles: ["SUP", "MID"], primaryRole: "SUP" },
  Zyra: { roles: ["SUP"], primaryRole: "SUP" },
  Brand: { roles: ["SUP", "MID"], primaryRole: "SUP" },
  Pyke: { roles: ["SUP"], primaryRole: "SUP" },
  Rakan: { roles: ["SUP"], primaryRole: "SUP" },
  Yuumi: { roles: ["SUP"], primaryRole: "SUP" },
  Renata: { roles: ["SUP"], primaryRole: "SUP" },
  Milio: { roles: ["SUP"], primaryRole: "SUP" },
  Alistar: { roles: ["SUP"], primaryRole: "SUP" },
  Taric: { roles: ["SUP"], primaryRole: "SUP" },
  Bard: { roles: ["SUP"], primaryRole: "SUP" },
  Senna: { roles: ["SUP", "ADC"], primaryRole: "SUP" },
  Lux: { roles: ["SUP", "MID"], primaryRole: "SUP" },
  Xerath: { roles: ["SUP", "MID"], primaryRole: "MID" },
  Velkoz: { roles: ["SUP", "MID"], primaryRole: "MID" },
  Swain: { roles: ["SUP", "MID"], primaryRole: "SUP" },
  Maokai: { roles: ["SUP", "TOP"], primaryRole: "SUP" },
  Poppy: { roles: ["SUP", "TOP", "JGL"], primaryRole: "SUP" },
  // ADC
  Caitlyn: { roles: ["ADC"], primaryRole: "ADC" },
  Ezreal: { roles: ["ADC"], primaryRole: "ADC" },
  Kaisa: { roles: ["ADC"], primaryRole: "ADC" },
  Vayne: { roles: ["ADC", "TOP"], primaryRole: "ADC" },
  Lucian: { roles: ["ADC", "MID"], primaryRole: "ADC" },
  MissFortune: { roles: ["ADC"], primaryRole: "ADC" },
  Aphelios: { roles: ["ADC"], primaryRole: "ADC" },
  Jhin: { roles: ["ADC"], primaryRole: "ADC" },
  Ashe: { roles: ["ADC", "SUP"], primaryRole: "ADC" },
  Draven: { roles: ["ADC"], primaryRole: "ADC" },
  Samira: { roles: ["ADC"], primaryRole: "ADC" },
  Xayah: { roles: ["ADC"], primaryRole: "ADC" },
  Sivir: { roles: ["ADC"], primaryRole: "ADC" },
  Varus: { roles: ["ADC"], primaryRole: "ADC" },
  Twitch: { roles: ["ADC"], primaryRole: "ADC" },
  Kogmaw: { roles: ["ADC"], primaryRole: "ADC" },
  Zeri: { roles: ["ADC"], primaryRole: "ADC" },
  Nilah: { roles: ["ADC"], primaryRole: "ADC" },
  Smolder: { roles: ["ADC"], primaryRole: "ADC" },
  Corki: { roles: ["MID"], primaryRole: "MID" },
  // MID
  Zed: { roles: ["MID"], primaryRole: "MID" },
  Yasuo: { roles: ["MID", "ADC"], primaryRole: "MID" },
  Yone: { roles: ["MID", "TOP"], primaryRole: "MID" },
  Syndra: { roles: ["MID"], primaryRole: "MID" },
  Orianna: { roles: ["MID"], primaryRole: "MID" },
  Viktor: { roles: ["MID"], primaryRole: "MID" },
  Azir: { roles: ["MID"], primaryRole: "MID" },
  Katarina: { roles: ["MID"], primaryRole: "MID" },
  Akali: { roles: ["MID", "TOP"], primaryRole: "MID" },
  Sylas: { roles: ["MID", "TOP"], primaryRole: "MID" },
  Leblanc: { roles: ["MID"], primaryRole: "MID" },
  Fizz: { roles: ["MID"], primaryRole: "MID" },
  Vex: { roles: ["MID"], primaryRole: "MID" },
  Taliyah: { roles: ["MID", "JGL"], primaryRole: "MID" },
  Cassiopeia: { roles: ["MID"], primaryRole: "MID" },
  Anivia: { roles: ["MID"], primaryRole: "MID" },
  Malzahar: { roles: ["MID"], primaryRole: "MID" },
  Veigar: { roles: ["MID"], primaryRole: "MID" },
  Annie: { roles: ["MID"], primaryRole: "MID" },
  TwistedFate: { roles: ["MID"], primaryRole: "MID" },
  Galio: { roles: ["MID", "SUP"], primaryRole: "MID" },
  Naafiri: { roles: ["MID"], primaryRole: "MID" },
  Hwei: { roles: ["MID"], primaryRole: "MID" },
  Aurora: { roles: ["MID", "TOP"], primaryRole: "MID" },
  // TOP
  Darius: { roles: ["TOP"], primaryRole: "TOP" },
  Garen: { roles: ["TOP"], primaryRole: "TOP" },
  Camille: { roles: ["TOP"], primaryRole: "TOP" },
  Fiora: { roles: ["TOP"], primaryRole: "TOP" },
  Jax: { roles: ["TOP"], primaryRole: "TOP" },
  Irelia: { roles: ["TOP", "MID"], primaryRole: "TOP" },
  Riven: { roles: ["TOP"], primaryRole: "TOP" },
  Mordekaiser: { roles: ["TOP"], primaryRole: "TOP" },
  Sett: { roles: ["TOP", "SUP"], primaryRole: "TOP" },
  Ornn: { roles: ["TOP"], primaryRole: "TOP" },
  Malphite: { roles: ["TOP"], primaryRole: "TOP" },
  Sion: { roles: ["TOP"], primaryRole: "TOP" },
  Gnar: { roles: ["TOP"], primaryRole: "TOP" },
  KSante: { roles: ["TOP"], primaryRole: "TOP" },
  Renekton: { roles: ["TOP"], primaryRole: "TOP" },
  Nasus: { roles: ["TOP"], primaryRole: "TOP" },
  Teemo: { roles: ["TOP"], primaryRole: "TOP" },
  Kennen: { roles: ["TOP"], primaryRole: "TOP" },
  Jayce: { roles: ["TOP"], primaryRole: "TOP" },
  Gangplank: { roles: ["TOP"], primaryRole: "TOP" },
  Illaoi: { roles: ["TOP"], primaryRole: "TOP" },
  Urgot: { roles: ["TOP"], primaryRole: "TOP" },
  Singed: { roles: ["TOP"], primaryRole: "TOP" },
  Tryndamere: { roles: ["TOP"], primaryRole: "TOP" },
  Ambessa: { roles: ["TOP"], primaryRole: "TOP" },
  Mel: { roles: ["MID"], primaryRole: "MID" },
  // JGL
  Viego: { roles: ["JGL"], primaryRole: "JGL" },
  Graves: { roles: ["JGL"], primaryRole: "JGL" },
  Kindred: { roles: ["JGL"], primaryRole: "JGL" },
  Nidalee: { roles: ["JGL"], primaryRole: "JGL" },
  Elise: { roles: ["JGL"], primaryRole: "JGL" },
  Evelynn: { roles: ["JGL"], primaryRole: "JGL" },
  Kayn: { roles: ["JGL"], primaryRole: "JGL" },
  Hecarim: { roles: ["JGL"], primaryRole: "JGL" },
  Jarvan: { roles: ["JGL"], primaryRole: "JGL" },
  JarvanIV: { roles: ["JGL"], primaryRole: "JGL" },
  Warwick: { roles: ["JGL", "TOP"], primaryRole: "JGL" },
  Amumu: { roles: ["JGL"], primaryRole: "JGL" },
  Rammus: { roles: ["JGL"], primaryRole: "JGL" },
  Sejuani: { roles: ["JGL"], primaryRole: "JGL" },
  Zac: { roles: ["JGL"], primaryRole: "JGL" },
  Volibear: { roles: ["JGL", "TOP"], primaryRole: "JGL" },
  Diana: { roles: ["JGL", "MID"], primaryRole: "JGL" },
  Ekko: { roles: ["JGL", "MID"], primaryRole: "JGL" },
  Shaco: { roles: ["JGL"], primaryRole: "JGL" },
  Rengar: { roles: ["JGL", "TOP"], primaryRole: "JGL" },
  Khazix: { roles: ["JGL"], primaryRole: "JGL" },
  Lillia: { roles: ["JGL"], primaryRole: "JGL" },
  Belveth: { roles: ["JGL"], primaryRole: "JGL" },
  Briar: { roles: ["JGL"], primaryRole: "JGL" },
  Ivern: { roles: ["JGL"], primaryRole: "JGL" },
  Fiddlesticks: { roles: ["JGL"], primaryRole: "JGL" },
  Nocturne: { roles: ["JGL"], primaryRole: "JGL" },
  XinZhao: { roles: ["JGL"], primaryRole: "JGL" },
  Vi: { roles: ["JGL"], primaryRole: "JGL" },
  Nunu: { roles: ["JGL"], primaryRole: "JGL" },
  Skarner: { roles: ["JGL"], primaryRole: "JGL" },
  Udyr: { roles: ["JGL", "TOP"], primaryRole: "JGL" },
  Shyvana: { roles: ["JGL"], primaryRole: "JGL" },
  MasterYi: { roles: ["JGL"], primaryRole: "JGL" },
};

function getDefaultChampData(name: string): ChampionData {
  const knownRole = KNOWN_ROLES[name];
  const roles = knownRole?.roles || ["MID"];
  const primaryRole = knownRole?.primaryRole || "MID";
  const isSup = primaryRole === "SUP";

  return {
    name, displayName: name, title: "Champion",
    roles, difficulty: 2, winrate: 50.0, pickrate: 5.0, banrate: 3.0, tier: "B", primaryRole,
    coreItems: [{ name: "Item 1", id: 0 }, { name: "Item 2", id: 0 }, { name: "Item 3", id: 0 }],
    boots: { name: "Boots", id: 0 },
    startingItems: [{ name: isSup ? "World Atlas" : "Doran's Item", id: 0 }],
    primaryTree: isSup ? "Resolve" : "Precision",
    primaryKeystone: isSup ? "Guardian" : "Conqueror",
    primaryRunes: isSup ? ["Font of Life", "Bone Plating", "Revitalize"] : ["Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: isSup ? "Inspiration" : "Resolve",
    secondaryRunes: isSup ? ["Biscuit Delivery", "Cosmic Insight"] : ["Bone Plating", "Overgrowth"],
    statShards: isSup ? ["Ability Haste", "Adaptive Force", "Health"] : ["Adaptive Force", "Adaptive Force", "Health"],
    summonerSpells: ["Flash", isSup ? "Exhaust" : "Ignite"],
    skillOrder: ["Q", "W", "E", "Q", "Q", "R"],
    strongAgainst: [], weakAgainst: [],
    powerSpikes: [{ level: "Nivel 6", description: "Power spike con la definitiva." }],
    tips: ["Datos detallados no disponibles aún para este campeón."],
  };
}

// ─── Tree Colors ──
const TREE_COLORS: Record<string, string> = {
  Precision: "text-amber-500",
  Domination: "text-red-500",
  Sorcery: "text-blue-500",
  Resolve: "text-green-500",
  Inspiration: "text-cyan-500",
};

// ─── Tier Badge Colors ──
const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  A: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
  B: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  C: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  D: "bg-red-500/15 text-red-500 border-red-500/20",
};

export function ChampionDrawer() {
  const { isOpen, championName, close } = useChampionDrawer();
  const { version: patchVersion } = usePatchVersion();
  const { getNotesForChampion, addNote } = useNotes();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"build" | "matchups" | "tips" | "notes">("build");
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const { isFavorite, toggleFavorite } = useFavoriteChampions();

  if (!championName) return null;

  const data = CHAMPION_DATABASE[championName] || getDefaultChampData(championName);
  const champNotes = getNotesForChampion(championName);
  const champImg = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${championName}.png`;
  const splashImg = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championName}_0.jpg`;

  // Resolve i18n'd power spikes and tips for this champion
  const isKnownChamp = !!CHAMPION_DATABASE[championName];
  const resolvedSpikes = data.powerSpikes.map((spike, i) => {
    const levelKey = isKnownChamp
      ? `champ.${championName}.spike${i + 1}.level`
      : "champ.default.spike.level";
    const descKey = isKnownChamp
      ? `champ.${championName}.spike${i + 1}.desc`
      : "champ.default.spike.desc";
    return {
      level: t(levelKey),
      description: t(descKey),
    };
  });
  const resolvedTips = data.tips.map((tip, i) => {
    const tipKey = isKnownChamp
      ? `champ.${championName}.tip${i + 1}`
      : "champ.default.tip";
    return t(tipKey);
  });

  const handleAddNote = () => {
    if (!newNoteTitle.trim()) return;
    addNote({
      title: newNoteTitle,
      content: newNoteContent,
      champion: championName,
      tags: ["champion"],
      pinned: false,
    });
    setNewNoteTitle("");
    setNewNoteContent("");
    setShowAddNote(false);
  };

  const tabs = [
    { id: "build" as const, label: t("drawer.tabBuild") },
    { id: "matchups" as const, label: t("drawer.tabMatchups") },
    { id: "tips" as const, label: t("drawer.tabTips") },
    { id: "notes" as const, label: t("drawer.tabNotes", { count: champNotes.length }) },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-[61] w-[520px] max-w-[90vw] bg-background border-l border-border/60 shadow-2xl flex flex-col overflow-hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header with champion splash */}
            <div className="relative h-[200px] flex-shrink-0 overflow-hidden">
              <img
                src={splashImg}
                alt={data.displayName}
                className="absolute inset-0 w-full h-full object-cover object-top"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

              {/* Favorite + Close buttons */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={() => toggleFavorite(championName)}
                  className={cn(
                    "w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-200 border cursor-pointer",
                    isFavorite(championName)
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-500 hover:bg-rose-500/30"
                      : "bg-background/80 border-border/40 text-muted-foreground hover:text-rose-500 hover:bg-background"
                  )}
                  title={isFavorite(championName) ? t("fav.remove") : t("fav.add")}
                >
                  <Heart className={cn("w-4 h-4", isFavorite(championName) && "fill-current")} />
                </button>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors border border-border/40 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Champion info overlay */}
              <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                <div className="flex items-end gap-4">
                  <motion.img
                    layoutId={`champ-icon-${championName}`}
                    src={champImg}
                    alt={data.displayName}
                    className="w-16 h-16 rounded-xl border-2 border-background shadow-lg object-cover"
                  />
                  <div>
                    <h2 className="text-[22px] font-semibold text-foreground">{data.displayName}</h2>
                    <p className="text-[12px] text-muted-foreground">{data.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-1 rounded-md text-[11px] font-bold border", TIER_COLORS[data.tier])}>
                    Tier {data.tier}
                  </span>
                  {data.roles.map(r => (
                    <span key={r} className="px-2 py-1 rounded-md bg-secondary/80 text-[11px] font-medium text-foreground border border-border/30">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 px-6 py-3 border-b border-border/40 bg-secondary/20 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[12px] font-medium">{data.winrate}% WR</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-medium">{data.pickrate}% Pick</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[12px] font-medium">{data.banrate}% Ban</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-muted-foreground font-mono">{t("drawer.patch")} {patchVersion}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-border/40 flex-shrink-0 px-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-3 text-[12px] font-medium transition-colors relative cursor-pointer",
                    activeTab === tab.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="champion-tab"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full"
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "build" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-6"
                >
                  {/* Runes */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      {t("drawer.runes")}
                    </h3>
                    <div className="flex gap-4">
                      <div className="flex-1 p-3 rounded-xl bg-secondary/40 border border-border/30">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", TREE_COLORS[data.primaryTree])}>
                          {data.primaryTree}
                        </span>
                        <p className="text-[13px] font-semibold mt-1">{data.primaryKeystone}</p>
                        <div className="flex flex-col gap-1 mt-2">
                          {data.primaryRunes.map(r => (
                            <span key={r} className="text-[11px] text-muted-foreground">{r}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 p-3 rounded-xl bg-secondary/40 border border-border/30">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", TREE_COLORS[data.secondaryTree])}>
                          {data.secondaryTree}
                        </span>
                        <div className="flex flex-col gap-1 mt-3">
                          {data.secondaryRunes.map(r => (
                            <span key={r} className="text-[11px] text-muted-foreground">{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {data.statShards.map((s, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-secondary/50 text-[10px] text-muted-foreground font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Skill Order */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground mb-3">{t("drawer.skillOrder")}</h3>
                    <div className="flex gap-1 flex-wrap">
                      {data.skillOrder.slice(0, 18).map((skill, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold border",
                            skill === "R" ? "bg-primary/15 text-primary border-primary/30" :
                            skill === "Q" ? "bg-blue-500/15 text-blue-500 border-blue-500/30" :
                            skill === "W" ? "bg-green-500/15 text-green-500 border-green-500/30" :
                            "bg-amber-500/15 text-amber-500 border-amber-500/30"
                          )}
                        >
                          {skill}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                      Max: {data.skillOrder[0]} → {data.skillOrder.find((s, i) => s !== data.skillOrder[0] && s !== "R" && i > 3) || "W"} → {data.skillOrder.find((s, i) => i > 6 && s !== data.skillOrder[0] && s !== "R" && s !== data.skillOrder.find((ss, ii) => ss !== data.skillOrder[0] && ss !== "R" && ii > 3)) || "E"}
                    </p>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-primary" />
                      {t("drawer.buildCore")}
                    </h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-12">{t("drawer.starter")}</span>
                        {data.startingItems.map(item => (
                          <span key={item.name} className="px-2 py-1 rounded bg-secondary/50 text-[11px] font-medium border border-border/30">
                            {item.name}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-12">{t("drawer.boots")}</span>
                        <span className="px-2 py-1 rounded bg-secondary/50 text-[11px] font-medium border border-border/30">
                          {data.boots.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground w-12">{t("drawer.core")}</span>
                        {data.coreItems.map((item, i) => (
                          <span key={item.name} className="flex items-center gap-1">
                            <span className="px-2 py-1 rounded bg-primary/10 text-[11px] font-medium text-primary border border-primary/20">
                              {item.name}
                            </span>
                            {i < data.coreItems.length - 1 && <span className="text-muted-foreground text-[10px]">→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Power Spikes */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      {t("drawer.powerSpikes")}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {resolvedSpikes.map((spike, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20">
                          <span className="text-[11px] font-bold text-primary whitespace-nowrap">{spike.level}</span>
                          <span className="text-[11px] text-muted-foreground">{spike.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "matchups" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-6"
                >
                  {/* Strong Against */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-emerald-500 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {t("drawer.strongAgainst")}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {data.strongAgainst.map(m => (
                        <div key={m.name} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${m.name}.png`}
                              alt={m.name}
                              className="w-8 h-8 rounded-lg object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="text-[13px] font-medium">{m.name}</span>
                          </div>
                          <span className="text-[12px] font-bold text-emerald-500">{m.winrate}% WR</span>
                        </div>
                      ))}
                      {data.strongAgainst.length === 0 && (
                        <p className="text-[12px] text-muted-foreground italic">{t("drawer.dataUnavailable")}</p>
                      )}
                    </div>
                  </div>

                  {/* Weak Against */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-red-500 mb-3 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      {t("drawer.weakAgainst")}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {data.weakAgainst.map(m => (
                        <div key={m.name} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${m.name}.png`}
                              alt={m.name}
                              className="w-8 h-8 rounded-lg object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="text-[13px] font-medium">{m.name}</span>
                          </div>
                          <span className="text-[12px] font-bold text-red-500">{m.winrate}% WR</span>
                        </div>
                      ))}
                      {data.weakAgainst.length === 0 && (
                        <p className="text-[12px] text-muted-foreground italic">{t("drawer.dataUnavailable")}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "tips" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {t("drawer.gameTips")}
                  </h3>
                  {resolvedTips.map((tip, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-secondary/30 border border-border/20">
                      <span className="text-primary font-bold text-[12px] mt-0.5">{i + 1}.</span>
                      <p className="text-[12px] text-foreground/80 leading-relaxed">{tip}</p>
                    </div>
                  ))}

                  <div className="mt-4">
                    <h3 className="text-[13px] font-semibold text-foreground mb-3">{t("drawer.summonerSpells")}</h3>
                    <div className="flex gap-2">
                      {data.summonerSpells.map(spell => (
                        <span key={spell} className="px-3 py-1.5 rounded-lg bg-secondary/50 text-[12px] font-medium border border-border/30">
                          {spell}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2">
                    <h3 className="text-[13px] font-semibold text-foreground mb-2">{t("drawer.difficulty")}</h3>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(d => (
                        <div
                          key={d}
                          className={cn(
                            "w-8 h-2 rounded-full",
                            d <= data.difficulty ? "bg-primary" : "bg-secondary"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "notes" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                      <StickyNote className="w-4 h-4 text-primary" />
                      {t("drawer.notesAbout", { name: data.displayName })}
                    </h3>
                    <button
                      onClick={() => setShowAddNote(!showAddNote)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/15 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t("drawer.newNote")}
                    </button>
                  </div>

                  {showAddNote && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex flex-col gap-2 p-4 rounded-xl bg-secondary/30 border border-primary/20"
                    >
                      <input
                        type="text"
                        placeholder={t("drawer.noteTitle")}
                        value={newNoteTitle}
                        onChange={e => setNewNoteTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-[13px] focus:outline-none focus:border-primary/50"
                      />
                      <textarea
                        placeholder={t("drawer.writeNote")}
                        value={newNoteContent}
                        onChange={e => setNewNoteContent(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-[12px] resize-none focus:outline-none focus:border-primary/50"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAddNote(false)} className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          {t("drawer.cancel")}
                        </button>
                        <button onClick={handleAddNote} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition-opacity cursor-pointer">
                          {t("drawer.save")}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {champNotes.length === 0 && !showAddNote && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <StickyNote className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-[12px] text-muted-foreground">{t("drawer.noNotes", { name: data.displayName })}</p>
                      <p className="text-[11px] text-muted-foreground/60">{t("drawer.notesPlaceholder")}</p>
                    </div>
                  )}

                  {champNotes.map(note => (
                    <div key={note.id} className="p-4 rounded-xl bg-secondary/30 border border-border/20">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-[13px] font-semibold text-foreground">{note.title}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(note.updatedAt).toLocaleDateString(language === "kr" ? "ko-KR" : language === "es" ? "es-ES" : "en-US", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/80 whitespace-pre-line leading-relaxed">{note.content}</p>
                      {note.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-3">
                          {note.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-secondary text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}