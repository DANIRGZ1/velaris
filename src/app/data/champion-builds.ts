/**
 * Champion Builds Database — ~50 most popular champions
 * Detailed rune + item builds per champion.
 * Champions not listed here use the generic fallback in matchups.ts.
 */

export interface ChampionBuild {
  champion: string;
  role: string;
  winrate: number;
  pickrate: number;
  banrate: number;
  keystone: string;
  primaryRunes: string[];
  secondaryTree: string;
  secondaryRunes: string[];
  coreItems: string[];
  boots: string;
  skillOrder: string[];
  skillMax: string;
  earlyLevels: string;
  situationalItems: string[];
  source: string;
}

export const CHAMPION_BUILDS: Record<string, ChampionBuild> = {
  // ═══ TOP ════════════════════════════════════════════════════════════
  Aatrox: {
    champion: "Aatrox", role: "TOP", winrate: 50.5, pickrate: 10.2, banrate: 8.1,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Unflinching"],
    coreItems: ["Eclipse", "Black Cleaver", "Serylda's Grudge"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Death's Dance", "Spirit Visage", "Maw of Malmortius", "Guardian Angel"],
    source: "u.gg"
  },
  Camille: {
    champion: "Camille", role: "TOP", winrate: 51.3, pickrate: 8.5, banrate: 6.4,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Shield Bash", "Bone Plating", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Legend: Tenacity", "Last Stand"],
    coreItems: ["Trinity Force", "Ravenous Hydra", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Sterak's Gage", "Guardian Angel", "Maw of Malmortius", "Hullbreaker"],
    source: "u.gg"
  },
  Darius: {
    champion: "Darius", role: "TOP", winrate: 50.8, pickrate: 9.5, banrate: 12.3,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Unflinching"],
    coreItems: ["Trinity Force", "Sterak's Gage", "Dead Man's Plate"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Death's Dance", "Force of Nature", "Randuin's Omen", "Gargoyle Stoneplate"],
    source: "u.gg"
  },
  Fiora: {
    champion: "Fiora", role: "TOP", winrate: 51.0, pickrate: 7.2, banrate: 5.8,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Ravenous Hydra", "Trinity Force", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Hullbreaker", "Maw of Malmortius", "Guardian Angel", "Blade of the Ruined King"],
    source: "u.gg"
  },
  Garen: {
    champion: "Garen", role: "TOP", winrate: 53.1, pickrate: 8.8, banrate: 3.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Dead Man's Plate", "Mortal Reminder"], boots: "Berserker's Greaves",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "Q > E > W",
    situationalItems: ["Sterak's Gage", "Force of Nature", "Randuin's Omen", "Death's Dance"],
    source: "u.gg"
  },
  Jax: {
    champion: "Jax", role: "TOP", winrate: 51.2, pickrate: 7.6, banrate: 9.1,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Trinity Force", "Blade of the Ruined King", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "E > Q > W",
    situationalItems: ["Death's Dance", "Randuin's Omen", "Maw of Malmortius", "Hullbreaker"],
    source: "u.gg"
  },
  Malphite: {
    champion: "Malphite", role: "TOP", winrate: 52.4, pickrate: 6.8, banrate: 4.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Iceborn Gauntlet", "Sunfire Aegis", "Thornmail"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Force of Nature", "Randuin's Omen", "Gargoyle Stoneplate", "Abyssal Mask"],
    source: "u.gg"
  },
  Mordekaiser: {
    champion: "Mordekaiser", role: "TOP", winrate: 51.5, pickrate: 8.2, banrate: 7.3,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Riftmaker", "Rylai's Crystal Scepter", "Zhonya's Hourglass"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Spirit Visage", "Nashor's Tooth", "Demonic Embrace", "Thornmail"],
    source: "u.gg"
  },
  Sett: {
    champion: "Sett", role: "TOP", winrate: 51.8, pickrate: 6.5, banrate: 4.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Unflinching"],
    coreItems: ["Blade of the Ruined King", "Sterak's Gage", "Dead Man's Plate"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > E > W",
    situationalItems: ["Death's Dance", "Force of Nature", "Gargoyle Stoneplate", "Titanic Hydra"],
    source: "u.gg"
  },
  Shen: {
    champion: "Shen", role: "TOP", winrate: 52.0, pickrate: 5.8, banrate: 3.1,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Shield Bash", "Bone Plating", "Overgrowth"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Unflinching"],
    coreItems: ["Heartsteel", "Titanic Hydra", "Sunfire Aegis"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Randuin's Omen", "Force of Nature", "Spirit Visage", "Gargoyle Stoneplate"],
    source: "u.gg"
  },

  // ═══ JUNGLE ═════════════════════════════════════════════════════════
  LeeSin: {
    champion: "LeeSin", role: "JGL", winrate: 48.5, pickrate: 16.8, banrate: 6.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Eclipse", "Black Cleaver", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > E > W", earlyLevels: "Q > W > E",
    situationalItems: ["Guardian Angel", "Maw of Malmortius", "Sterak's Gage", "Randuin's Omen"],
    source: "u.gg"
  },
  Vi: {
    champion: "Vi", role: "JGL", winrate: 52.0, pickrate: 5.5, banrate: 2.8,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Eclipse", "Black Cleaver", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Guardian Angel", "Maw of Malmortius", "Sterak's Gage", "Randuin's Omen"],
    source: "u.gg"
  },
  Amumu: {
    champion: "Amumu", role: "JGL", winrate: 53.2, pickrate: 4.8, banrate: 1.5,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Conditioning", "Unflinching"],
    secondaryTree: "Precision", secondaryRunes: ["Legend: Tenacity", "Last Stand"],
    coreItems: ["Sunfire Aegis", "Demonic Embrace", "Thornmail"], boots: "Plated Steelcaps",
    skillOrder: ["W", "E", "Q"], skillMax: "W > E > Q", earlyLevels: "W > Q > E",
    situationalItems: ["Abyssal Mask", "Randuin's Omen", "Force of Nature", "Gargoyle Stoneplate"],
    source: "u.gg"
  },
  Viego: {
    champion: "Viego", role: "JGL", winrate: 50.8, pickrate: 9.2, banrate: 5.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Blade of the Ruined King", "Trinity Force", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > W > E",
    situationalItems: ["Sterak's Gage", "Guardian Angel", "Wit's End", "Maw of Malmortius"],
    source: "u.gg"
  },
  Graves: {
    champion: "Graves", role: "JGL", winrate: 50.2, pickrate: 8.5, banrate: 3.8,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Waterwalking"],
    coreItems: ["Eclipse", "The Collector", "Infinity Edge"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Lord Dominik's", "Maw of Malmortius", "Guardian Angel", "Bloodthirster"],
    source: "u.gg"
  },
  Diana: {
    champion: "Diana", role: "JGL", winrate: 52.1, pickrate: 7.1, banrate: 4.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Coup de Grace"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Nashor's Tooth", "Zhonya's Hourglass", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Banshee's Veil", "Void Staff", "Rabadon's Deathcap", "Morellonomicon"],
    source: "u.gg"
  },
  Hecarim: {
    champion: "Hecarim", role: "JGL", winrate: 51.5, pickrate: 6.2, banrate: 3.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Trinity Force", "Death's Dance", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > W > E",
    situationalItems: ["Force of Nature", "Randuin's Omen", "Maw of Malmortius", "Guardian Angel"],
    source: "u.gg"
  },
  JarvanIV: {
    champion: "JarvanIV", role: "JGL", winrate: 51.0, pickrate: 5.8, banrate: 2.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Eclipse", "Black Cleaver", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Sterak's Gage", "Guardian Angel", "Maw of Malmortius", "Randuin's Omen"],
    source: "u.gg"
  },

  // ═══ MID ════════════════════════════════════════════════════════════
  Ahri: {
    champion: "Ahri", role: "MID", winrate: 52.3, pickrate: 11.4, banrate: 3.6,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Cheap Shot", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Zhonya's Hourglass"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Banshee's Veil", "Void Staff", "Rabadon's Deathcap", "Morellonomicon"],
    source: "u.gg"
  },
  Syndra: {
    champion: "Syndra", role: "MID", winrate: 50.6, pickrate: 8.2, banrate: 4.1,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Cheap Shot", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Biscuit Delivery"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > E > W", earlyLevels: "Q > W > E",
    situationalItems: ["Zhonya's Hourglass", "Banshee's Veil", "Void Staff", "Morellonomicon"],
    source: "u.gg"
  },
  Katarina: {
    champion: "Katarina", role: "MID", winrate: 50.1, pickrate: 7.5, banrate: 8.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Nashor's Tooth", "Riftmaker", "Zhonya's Hourglass"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Void Staff", "Rabadon's Deathcap", "Banshee's Veil", "Shadowflame"],
    source: "u.gg"
  },
  Yasuo: {
    champion: "Yasuo", role: "MID", winrate: 49.5, pickrate: 10.5, banrate: 15.2,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Blade of the Ruined King", "Infinity Edge", "Death's Dance"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Guardian Angel", "Maw of Malmortius", "Mortal Reminder", "Wit's End"],
    source: "u.gg"
  },
  Yone: {
    champion: "Yone", role: "MID", winrate: 50.2, pickrate: 9.8, banrate: 14.5,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Blade of the Ruined King", "Infinity Edge", "Death's Dance"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Guardian Angel", "Maw of Malmortius", "Mortal Reminder", "Wit's End"],
    source: "u.gg"
  },
  Zed: {
    champion: "Zed", role: "MID", winrate: 50.8, pickrate: 12.1, banrate: 20.5,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Sudden Impact", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Scorch"],
    coreItems: ["Eclipse", "The Collector", "Serylda's Grudge"], boots: "Ionian Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Maw of Malmortius", "Guardian Angel", "Lord Dominik's", "Edge of Night"],
    source: "u.gg"
  },
  Viktor: {
    champion: "Viktor", role: "MID", winrate: 51.5, pickrate: 6.8, banrate: 3.2,
    keystone: "First Strike", primaryRunes: ["First Strike", "Magical Footwear", "Biscuit Delivery", "Cosmic Insight"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Zhonya's Hourglass", "Banshee's Veil", "Void Staff", "Lich Bane"],
    source: "u.gg"
  },
  Lux: {
    champion: "Lux", role: "MID", winrate: 52.0, pickrate: 7.5, banrate: 5.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Zhonya's Hourglass", "Banshee's Veil", "Void Staff", "Morellonomicon"],
    source: "u.gg"
  },

  // ═══ ADC ════════════════════════════════════════════════════════════
  Tristana: {
    champion: "Tristana", role: "ADC", winrate: 52.8, pickrate: 8.3, banrate: 2.1,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Biscuit Delivery"],
    coreItems: ["Navori Quickblades", "Galeforce", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > W > Q",
    situationalItems: ["Lord Dominik's", "Death's Dance", "Guardian Angel", "Mortal Reminder"],
    source: "u.gg"
  },
  Jinx: {
    champion: "Jinx", role: "ADC", winrate: 51.5, pickrate: 12.1, banrate: 3.4,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Infinity Edge", "Runaan's Hurricane", "Lord Dominik's"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Rapid Firecannon", "Bloodthirster", "Guardian Angel", "Mortal Reminder"],
    source: "u.gg"
  },
  Jhin: {
    champion: "Jhin", role: "ADC", winrate: 51.9, pickrate: 14.6, banrate: 1.8,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Presence of Mind", "Legend: Bloodline", "Coup de Grace"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Biscuit Delivery"],
    coreItems: ["Galeforce", "The Collector", "Infinity Edge"], boots: "Swiftness Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Rapid Firecannon", "Lord Dominik's", "Guardian Angel", "Mortal Reminder"],
    source: "u.gg"
  },
  Caitlyn: {
    champion: "Caitlyn", role: "ADC", winrate: 51.2, pickrate: 15.3, banrate: 5.2,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Infinity Edge", "Rapid Firecannon", "The Collector"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Bloodthirster", "Guardian Angel", "Stormrazor"],
    source: "u.gg"
  },
  Vayne: {
    champion: "Vayne", role: "ADC", winrate: 52.1, pickrate: 9.8, banrate: 7.3,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Triumph", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Blade of the Ruined King", "Guinsoo's Rageblade", "Wit's End"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Randuin's Omen", "Guardian Angel", "Immortal Shieldbow", "Phantom Dancer"],
    source: "u.gg"
  },
  Ezreal: {
    champion: "Ezreal", role: "ADC", winrate: 49.8, pickrate: 18.2, banrate: 1.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Biscuit Delivery"],
    coreItems: ["Trinity Force", "Muramana", "Serylda's Grudge"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Frozen Heart", "Guardian Angel", "Maw of Malmortius", "Blade of the Ruined King"],
    source: "u.gg"
  },
  Kaisa: {
    champion: "Kaisa", role: "ADC", winrate: 50.5, pickrate: 13.5, banrate: 4.5,
    keystone: "Hail of Blades", primaryRunes: ["Hail of Blades", "Taste of Blood", "Eyeball Collection", "Treasure Hunter"],
    secondaryTree: "Precision", secondaryRunes: ["Presence of Mind", "Legend: Bloodline"],
    coreItems: ["Kraken Slayer", "Nashor's Tooth", "Rageblade"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Zhonya's Hourglass", "Guardian Angel", "Wit's End", "Void Staff"],
    source: "u.gg"
  },
  Lucian: {
    champion: "Lucian", role: "ADC", winrate: 50.8, pickrate: 11.2, banrate: 3.2,
    keystone: "Press the Attack", primaryRunes: ["Press the Attack", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Biscuit Delivery"],
    coreItems: ["Kraken Slayer", "Essence Reaver", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Lord Dominik's", "Guardian Angel", "Bloodthirster", "Mortal Reminder"],
    source: "u.gg"
  },
  MissFortune: {
    champion: "MissFortune", role: "ADC", winrate: 51.8, pickrate: 10.5, banrate: 2.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Absolute Focus", "Gathering Storm"],
    secondaryTree: "Precision", secondaryRunes: ["Presence of Mind", "Legend: Bloodline"],
    coreItems: ["Eclipse", "The Collector", "Serylda's Grudge"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Guardian Angel", "Edge of Night", "Mortal Reminder"],
    source: "u.gg"
  },
  Ashe: {
    champion: "Ashe", role: "ADC", winrate: 51.8, pickrate: 8.5, banrate: 1.8,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Approach Velocity"],
    coreItems: ["Kraken Slayer", "Runaan's Hurricane", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Lord Dominik's", "Bloodthirster", "Guardian Angel", "Mortal Reminder"],
    source: "u.gg"
  },
  Draven: {
    champion: "Draven", role: "ADC", winrate: 50.5, pickrate: 6.8, banrate: 5.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Bloodline", "Last Stand"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Eclipse", "The Collector", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Bloodthirster", "Guardian Angel", "Mortal Reminder"],
    source: "u.gg"
  },
  Samira: {
    champion: "Samira", role: "ADC", winrate: 50.2, pickrate: 7.5, banrate: 6.8,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Bloodline", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Immortal Shieldbow", "The Collector", "Infinity Edge"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Lord Dominik's", "Guardian Angel", "Bloodthirster", "Death's Dance"],
    source: "u.gg"
  },

  // ═══ SUPPORT ════════════════════════════════════════════════════════
  Nautilus: {
    champion: "Nautilus", role: "SUP", winrate: 51.8, pickrate: 7.6, banrate: 4.5,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence"], boots: "Mobility Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Frozen Heart", "Redemption", "Mikael's Blessing", "Thornmail"],
    source: "u.gg"
  },
  Thresh: {
    champion: "Thresh", role: "SUP", winrate: 50.3, pickrate: 9.5, banrate: 5.8,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Redemption"], boots: "Mobility Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "E > Q > W",
    situationalItems: ["Zeke's Convergence", "Frozen Heart", "Mikael's Blessing", "Thornmail"],
    source: "u.gg"
  },
  Leona: {
    champion: "Leona", role: "SUP", winrate: 52.0, pickrate: 8.2, banrate: 4.8,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence"], boots: "Plated Steelcaps",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "E > Q > W",
    situationalItems: ["Thornmail", "Frozen Heart", "Redemption", "Gargoyle Stoneplate"],
    source: "u.gg"
  },
  Lulu: {
    champion: "Lulu", role: "SUP", winrate: 52.5, pickrate: 6.5, banrate: 5.2,
    keystone: "Summon Aery", primaryRunes: ["Summon Aery", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Revitalize"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Ardent Censer"], boots: "Ionian Boots",
    skillOrder: ["E", "W", "Q"], skillMax: "E > W > Q", earlyLevels: "E > Q > W",
    situationalItems: ["Redemption", "Mikael's Blessing", "Chemtech Putrifier", "Zhonya's Hourglass"],
    source: "u.gg"
  },
  Morgana: {
    champion: "Morgana", role: "SUP", winrate: 51.5, pickrate: 7.8, banrate: 12.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Revitalize"],
    coreItems: ["Zhonya's Hourglass", "Mandate", "Redemption"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > W > E", earlyLevels: "Q > E > W",
    situationalItems: ["Banshee's Veil", "Mikael's Blessing", "Chemtech Putrifier", "Rylai's Crystal Scepter"],
    source: "u.gg"
  },
  Blitzcrank: {
    champion: "Blitzcrank", role: "SUP", winrate: 51.0, pickrate: 6.5, banrate: 18.5,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Frozen Heart"], boots: "Mobility Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Zeke's Convergence", "Thornmail", "Redemption", "Gargoyle Stoneplate"],
    source: "u.gg"
  },
  Bard: {
    champion: "Bard", role: "SUP", winrate: 52.5, pickrate: 5.2, banrate: 2.8,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Cheap Shot", "Zombie Ward", "Relentless Hunter"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Revitalize"],
    coreItems: ["Imperial Mandate", "Dead Man's Plate", "Redemption"], boots: "Mobility Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Zhonya's Hourglass", "Knight's Vow", "Mikael's Blessing", "RFC"],
    source: "u.gg"
  },
  Senna: {
    champion: "Senna", role: "SUP", winrate: 50.8, pickrate: 8.5, banrate: 6.2,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Presence of Mind", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Approach Velocity"],
    coreItems: ["Eclipse", "Rapid Firecannon", "Infinity Edge"], boots: "Swiftness Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Umbral Glaive", "The Collector", "Guardian Angel"],
    source: "u.gg"
  },

  // ═══ TOP (additional) ═══════════════════════════════════════════════════════
  Chogath: {
    champion: "Chogath", role: "TOP", winrate: 53.2, pickrate: 5.8, banrate: 2.1,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Demolish", "Conditioning", "Overgrowth"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Heartsteel", "Sunfire Aegis", "Thornmail"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Force of Nature", "Warmog's Armor", "Abyssal Mask", "Gargoyle Stoneplate"],
    source: "u.gg"
  },
  DrMundo: {
    champion: "DrMundo", role: "TOP", winrate: 52.5, pickrate: 6.3, banrate: 2.8,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Demolish", "Conditioning", "Overgrowth"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Heartsteel", "Spirit Visage", "Force of Nature"], boots: "Plated Steelcaps",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Warmog's Armor", "Thornmail", "Gargoyle Stoneplate", "Sunfire Aegis"],
    source: "u.gg"
  },
  Gangplank: {
    champion: "Gangplank", role: "TOP", winrate: 49.5, pickrate: 5.2, banrate: 3.1,
    keystone: "First Strike", primaryRunes: ["First Strike", "Magical Footwear", "Triple Tonic", "Cosmic Insight"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Trinity Force", "Essence Reaver", "Infinity Edge"], boots: "Ionian Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Lord Dominik's", "Death's Dance", "Guardian Angel", "Maw of Malmortius"],
    source: "u.gg"
  },
  Gnar: {
    champion: "Gnar", role: "TOP", winrate: 50.8, pickrate: 5.5, banrate: 2.4,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Shield Bash", "Conditioning", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Alacrity"],
    coreItems: ["Trinity Force", "Dead Man's Plate", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Randuin's Omen", "Force of Nature", "Maw of Malmortius", "Sunfire Aegis"],
    source: "u.gg"
  },
  Gwen: {
    champion: "Gwen", role: "TOP", winrate: 51.2, pickrate: 6.4, banrate: 3.8,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Riftmaker", "Nashor's Tooth", "Zhonya's Hourglass"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Cosmic Drive", "Shadowflame", "Rabadon's Deathcap", "Void Staff"],
    source: "u.gg"
  },
  Illaoi: {
    champion: "Illaoi", role: "TOP", winrate: 51.5, pickrate: 5.8, banrate: 4.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Sterak's Gage", "Dead Man's Plate"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "E > Q > W",
    situationalItems: ["Black Cleaver", "Death's Dance", "Thornmail", "Hullbreaker"],
    source: "u.gg"
  },
  Irelia: {
    champion: "Irelia", role: "TOP", winrate: 49.8, pickrate: 8.5, banrate: 14.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Trinity Force", "Blade of the Ruined King", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Sterak's Gage", "Guardian Angel", "Maw of Malmortius", "Wit's End"],
    source: "u.gg"
  },
  Jayce: {
    champion: "Jayce", role: "TOP", winrate: 49.2, pickrate: 6.1, banrate: 3.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Precision", secondaryRunes: ["Presence of Mind", "Legend: Alacrity"],
    coreItems: ["Trinity Force", "Manamune", "Serylda's Grudge"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Death's Dance", "Guardian Angel", "Maw of Malmortius", "Lord Dominik's"],
    source: "u.gg"
  },
  Kennen: {
    champion: "Kennen", role: "TOP", winrate: 50.5, pickrate: 4.2, banrate: 2.1,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Hextech Rocketbelt", "Shadowflame", "Zhonya's Hourglass"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Rabadon's Deathcap", "Void Staff", "Banshee's Veil", "Rylai's Crystal Scepter"],
    source: "u.gg"
  },
  Kled: {
    champion: "Kled", role: "TOP", winrate: 50.2, pickrate: 3.8, banrate: 2.3,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Unflinching"],
    coreItems: ["Trinity Force", "Death's Dance", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > E > W",
    situationalItems: ["Guardian Angel", "Maw of Malmortius", "Black Cleaver", "Randuin's Omen"],
    source: "u.gg"
  },
  KSante: {
    champion: "KSante", role: "TOP", winrate: 49.5, pickrate: 6.8, banrate: 8.5,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Demolish", "Bone Plating", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Tenacity"],
    coreItems: ["Heartsteel", "Sunfire Aegis", "Unending Despair"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Thornmail", "Force of Nature", "Gargoyle Stoneplate", "Warmog's Armor"],
    source: "u.gg"
  },
  Nasus: {
    champion: "Nasus", role: "TOP", winrate: 51.8, pickrate: 6.1, banrate: 2.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Sterak's Gage", "Warmog's Armor"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Spirit Visage", "Dead Man's Plate", "Force of Nature", "Randuin's Omen"],
    source: "u.gg"
  },
  Olaf: {
    champion: "Olaf", role: "TOP", winrate: 51.5, pickrate: 5.2, banrate: 3.1,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Sterak's Gage", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Hullbreaker", "Maw of Malmortius", "Randuin's Omen", "Force of Nature"],
    source: "u.gg"
  },
  Ornn: {
    champion: "Ornn", role: "TOP", winrate: 52.0, pickrate: 5.5, banrate: 3.2,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Demolish", "Conditioning", "Overgrowth"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Heartsteel", "Sunfire Aegis", "Warmog's Armor"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Thornmail", "Force of Nature", "Abyssal Mask", "Gargoyle Stoneplate"],
    source: "u.gg"
  },
  Pantheon: {
    champion: "Pantheon", role: "TOP", winrate: 50.1, pickrate: 5.5, banrate: 4.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Unflinching"],
    coreItems: ["Eclipse", "Death's Dance", "Guardian Angel"], boots: "Plated Steelcaps",
    skillOrder: ["W", "Q", "E"], skillMax: "Q > W > E", earlyLevels: "W > Q > E",
    situationalItems: ["Maw of Malmortius", "Sterak's Gage", "Black Cleaver", "Serylda's Grudge"],
    source: "u.gg"
  },
  Quinn: {
    champion: "Quinn", role: "TOP", winrate: 50.8, pickrate: 4.2, banrate: 2.1,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Kraken Slayer", "The Collector", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["E", "Q", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Lord Dominik's", "Death's Dance", "Guardian Angel", "Mortal Reminder"],
    source: "u.gg"
  },
  Renekton: {
    champion: "Renekton", role: "TOP", winrate: 50.5, pickrate: 7.8, banrate: 6.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Unflinching"],
    coreItems: ["Eclipse", "Black Cleaver", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Sterak's Gage", "Maw of Malmortius", "Guardian Angel", "Serylda's Grudge"],
    source: "u.gg"
  },
  Riven: {
    champion: "Riven", role: "TOP", winrate: 50.2, pickrate: 8.8, banrate: 10.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Eclipse", "Death's Dance", "Black Cleaver"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Sterak's Gage", "Guardian Angel", "Maw of Malmortius", "Serylda's Grudge"],
    source: "u.gg"
  },
  Rumble: {
    champion: "Rumble", role: "TOP", winrate: 51.2, pickrate: 4.5, banrate: 3.2,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Liandry's Anguish", "Rylai's Crystal Scepter", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Rabadon's Deathcap", "Banshee's Veil"],
    source: "u.gg"
  },
  Ryze: {
    champion: "Ryze", role: "MID", winrate: 49.5, pickrate: 5.8, banrate: 2.1,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Biscuit Delivery"],
    coreItems: ["Seraph's Embrace", "Rod of Ages", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "E > Q > W",
    situationalItems: ["Rabadon's Deathcap", "Void Staff", "Zhonya's Hourglass", "Banshee's Veil"],
    source: "u.gg"
  },
  Singed: {
    champion: "Singed", role: "TOP", winrate: 51.8, pickrate: 3.5, banrate: 2.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Demonic Embrace", "Force of Nature", "Rylai's Crystal Scepter"], boots: "Mercury's Treads",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Warmog's Armor", "Abyssal Mask", "Spirit Visage", "Thornmail"],
    source: "u.gg"
  },
  Sion: {
    champion: "Sion", role: "TOP", winrate: 51.5, pickrate: 4.8, banrate: 2.2,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Demolish", "Conditioning", "Overgrowth"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Heartsteel", "Sunfire Aegis", "Warmog's Armor"], boots: "Plated Steelcaps",
    skillOrder: ["W", "E", "Q"], skillMax: "W > E > Q", earlyLevels: "W > Q > E",
    situationalItems: ["Thornmail", "Force of Nature", "Gargoyle Stoneplate", "Randuin's Omen"],
    source: "u.gg"
  },
  Teemo: {
    champion: "Teemo", role: "TOP", winrate: 51.2, pickrate: 5.5, banrate: 12.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Liandry's Anguish", "Shadowflame", "Demonic Embrace"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Rabadon's Deathcap", "Void Staff", "Zhonya's Hourglass", "Banshee's Veil"],
    source: "u.gg"
  },
  Tryndamere: {
    champion: "Tryndamere", role: "TOP", winrate: 51.8, pickrate: 6.2, banrate: 8.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Kraken Slayer", "Infinity Edge", "Blade of the Ruined King"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Mortal Reminder", "Death's Dance", "Guardian Angel", "Wit's End"],
    source: "u.gg"
  },
  Urgot: {
    champion: "Urgot", role: "TOP", winrate: 51.5, pickrate: 4.8, banrate: 3.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Unflinching"],
    coreItems: ["Black Cleaver", "Heartsteel", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Death's Dance", "Guardian Angel", "Thornmail", "Force of Nature"],
    source: "u.gg"
  },
  Vladimir: {
    champion: "Vladimir", role: "MID", winrate: 51.2, pickrate: 6.5, banrate: 5.2,
    keystone: "Phase Rush", primaryRunes: ["Phase Rush", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Riftmaker", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > E > W",
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Cosmic Drive", "Banshee's Veil"],
    source: "u.gg"
  },
  Volibear: {
    champion: "Volibear", role: "TOP", winrate: 51.5, pickrate: 5.8, banrate: 4.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Heartsteel", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Spirit Visage", "Force of Nature", "Randuin's Omen", "Death's Dance"],
    source: "u.gg"
  },
  Yorick: {
    champion: "Yorick", role: "TOP", winrate: 51.8, pickrate: 4.5, banrate: 3.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Heartsteel", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Hullbreaker", "Death's Dance", "Black Cleaver", "Maw of Malmortius"],
    source: "u.gg"
  },

  // ═══ JUNGLE (additional) ════════════════════════════════════════════════════
  Belveth: {
    champion: "Belveth", role: "JGL", winrate: 50.8, pickrate: 5.2, banrate: 4.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Blade of the Ruined King", "Guinsoo's Rageblade", "Wit's End"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Kraken Slayer", "Death's Dance", "Sterak's Gage", "Guardian Angel"],
    source: "u.gg"
  },
  Briar: {
    champion: "Briar", role: "JGL", winrate: 51.2, pickrate: 6.5, banrate: 5.8,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Trinity Force", "Black Cleaver", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Sterak's Gage", "Guardian Angel", "Maw of Malmortius", "Serylda's Grudge"],
    source: "u.gg"
  },
  Ekko: {
    champion: "Ekko", role: "JGL", winrate: 51.5, pickrate: 8.2, banrate: 5.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Hextech Rocketbelt", "Zhonya's Hourglass", "Riftmaker"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Shadowflame", "Rabadon's Deathcap", "Void Staff", "Banshee's Veil"],
    source: "u.gg"
  },
  Elise: {
    champion: "Elise", role: "JGL", winrate: 50.2, pickrate: 5.8, banrate: 3.5,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Cheap Shot", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Hextech Rocketbelt", "Void Staff", "Zhonya's Hourglass"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "Q", "W"], skillMax: "Q > E > W", earlyLevels: "E > Q > W",
    situationalItems: ["Rabadon's Deathcap", "Shadowflame", "Banshee's Veil", "Cosmic Drive"],
    source: "u.gg"
  },
  Evelynn: {
    champion: "Evelynn", role: "JGL", winrate: 50.8, pickrate: 6.2, banrate: 4.8,
    keystone: "Dark Harvest", primaryRunes: ["Dark Harvest", "Cheap Shot", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Alacrity"],
    coreItems: ["Riftmaker", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "W > Q > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Cosmic Drive"],
    source: "u.gg"
  },
  Fiddlesticks: {
    champion: "Fiddlesticks", role: "JGL", winrate: 52.5, pickrate: 5.5, banrate: 4.2,
    keystone: "Dark Harvest", primaryRunes: ["Dark Harvest", "Cheap Shot", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Liandry's Anguish", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Rylai's Crystal Scepter"],
    source: "u.gg"
  },
  Gragas: {
    champion: "Gragas", role: "JGL", winrate: 51.0, pickrate: 5.2, banrate: 2.8,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Tenacity"],
    coreItems: ["Sunfire Aegis", "Demonic Embrace", "Zhonya's Hourglass"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > W > E",
    situationalItems: ["Warmog's Armor", "Force of Nature", "Abyssal Mask", "Gargoyle Stoneplate"],
    source: "u.gg"
  },
  Ivern: {
    champion: "Ivern", role: "JGL", winrate: 51.5, pickrate: 3.2, banrate: 1.8,
    keystone: "Summon Aery", primaryRunes: ["Summon Aery", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Redemption"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Ardent Censer", "Mikael's Blessing", "Chemtech Putrifier", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Karthus: {
    champion: "Karthus", role: "JGL", winrate: 52.2, pickrate: 4.8, banrate: 6.5,
    keystone: "Dark Harvest", primaryRunes: ["Dark Harvest", "Cheap Shot", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Liandry's Anguish", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Cosmic Drive"],
    source: "u.gg"
  },
  Kayn: {
    champion: "Kayn", role: "JGL", winrate: 51.2, pickrate: 10.5, banrate: 5.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Eclipse", "Black Cleaver", "Serylda's Grudge"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Death's Dance", "Guardian Angel", "Maw of Malmortius", "Sterak's Gage"],
    source: "u.gg"
  },
  Khazix: {
    champion: "Khazix", role: "JGL", winrate: 51.5, pickrate: 9.2, banrate: 8.5,
    keystone: "Dark Harvest", primaryRunes: ["Dark Harvest", "Taste of Blood", "Eyeball Collection", "Treasure Hunter"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Duskblade of Draktharr", "Eclipse", "The Collector"], boots: "Ionian Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Serylda's Grudge", "Edge of Night", "Guardian Angel", "Lord Dominik's"],
    source: "u.gg"
  },
  Kindred: {
    champion: "Kindred", role: "JGL", winrate: 50.5, pickrate: 5.8, banrate: 3.2,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Kraken Slayer", "Runaan's Hurricane", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Death's Dance", "Guardian Angel", "Mortal Reminder"],
    source: "u.gg"
  },
  Lillia: {
    champion: "Lillia", role: "JGL", winrate: 51.8, pickrate: 6.5, banrate: 4.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Liandry's Anguish", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Rylai's Crystal Scepter", "Cosmic Drive", "Void Staff", "Zhonya's Hourglass"],
    source: "u.gg"
  },
  MasterYi: {
    champion: "MasterYi", role: "JGL", winrate: 51.5, pickrate: 9.8, banrate: 10.5,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Kraken Slayer", "Guinsoo's Rageblade", "Blade of the Ruined King"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Death's Dance", "Guardian Angel", "Wit's End", "Mortal Reminder"],
    source: "u.gg"
  },
  Nidalee: {
    champion: "Nidalee", role: "JGL", winrate: 49.8, pickrate: 5.5, banrate: 2.8,
    keystone: "Dark Harvest", primaryRunes: ["Dark Harvest", "Cheap Shot", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Hextech Rocketbelt", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Banshee's Veil", "Zhonya's Hourglass", "Cosmic Drive"],
    source: "u.gg"
  },
  Nocturne: {
    champion: "Nocturne", role: "JGL", winrate: 51.8, pickrate: 7.5, banrate: 5.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Eclipse", "Black Cleaver", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Sterak's Gage", "Guardian Angel", "Maw of Malmortius", "Serylda's Grudge"],
    source: "u.gg"
  },
  Nunu: {
    champion: "Nunu", role: "JGL", winrate: 52.5, pickrate: 5.2, banrate: 3.5,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Tenacity"],
    coreItems: ["Sunfire Aegis", "Demonic Embrace", "Warmog's Armor"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Thornmail", "Force of Nature", "Heartsteel", "Abyssal Mask"],
    source: "u.gg"
  },
  Poppy: {
    champion: "Poppy", role: "JGL", winrate: 51.8, pickrate: 5.2, banrate: 3.8,
    keystone: "Grasp of the Undying", primaryRunes: ["Grasp of the Undying", "Demolish", "Bone Plating", "Overgrowth"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Sunfire Aegis", "Heartsteel", "Warmog's Armor"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Thornmail", "Force of Nature", "Gargoyle Stoneplate", "Randuin's Omen"],
    source: "u.gg"
  },
  Rammus: {
    champion: "Rammus", role: "JGL", winrate: 52.8, pickrate: 4.5, banrate: 3.2,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Demolish", "Conditioning", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Tenacity"],
    coreItems: ["Sunfire Aegis", "Thornmail", "Warmog's Armor"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "E > Q > W", earlyLevels: "Q > E > W",
    situationalItems: ["Force of Nature", "Gargoyle Stoneplate", "Randuin's Omen", "Abyssal Mask"],
    source: "u.gg"
  },
  RekSai: {
    champion: "RekSai", role: "JGL", winrate: 51.2, pickrate: 4.8, banrate: 3.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Black Cleaver", "Death's Dance", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Guardian Angel", "Maw of Malmortius", "Serylda's Grudge", "Randuin's Omen"],
    source: "u.gg"
  },
  Rengar: {
    champion: "Rengar", role: "JGL", winrate: 50.5, pickrate: 6.5, banrate: 7.2,
    keystone: "Dark Harvest", primaryRunes: ["Dark Harvest", "Taste of Blood", "Eyeball Collection", "Treasure Hunter"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Alacrity"],
    coreItems: ["Duskblade of Draktharr", "Edge of Night", "The Collector"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Serylda's Grudge", "Guardian Angel", "Lord Dominik's", "Death's Dance"],
    source: "u.gg"
  },
  Sejuani: {
    champion: "Sejuani", role: "JGL", winrate: 51.5, pickrate: 4.8, banrate: 2.5,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Tenacity"],
    coreItems: ["Sunfire Aegis", "Thornmail", "Warmog's Armor"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Force of Nature", "Heartsteel", "Gargoyle Stoneplate", "Abyssal Mask"],
    source: "u.gg"
  },
  Shaco: {
    champion: "Shaco", role: "JGL", winrate: 50.8, pickrate: 6.8, banrate: 5.5,
    keystone: "Dark Harvest", primaryRunes: ["Dark Harvest", "Cheap Shot", "Eyeball Collection", "Relentless Hunter"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Duskblade of Draktharr", "Edge of Night", "Serpent's Fang"], boots: "Ionian Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Umbral Glaive", "The Collector", "Guardian Angel", "Lord Dominik's"],
    source: "u.gg"
  },
  Shyvana: {
    champion: "Shyvana", role: "JGL", winrate: 51.5, pickrate: 4.5, banrate: 2.8,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Nashor's Tooth", "Void Staff"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Shadowflame", "Rabadon's Deathcap", "Zhonya's Hourglass", "Banshee's Veil"],
    source: "u.gg"
  },
  Skarner: {
    champion: "Skarner", role: "JGL", winrate: 52.2, pickrate: 5.5, banrate: 6.8,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Demolish", "Conditioning", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Tenacity"],
    coreItems: ["Sunfire Aegis", "Heartsteel", "Thornmail"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Force of Nature", "Gargoyle Stoneplate", "Warmog's Armor", "Randuin's Omen"],
    source: "u.gg"
  },
  Sylas: {
    champion: "Sylas", role: "JGL", winrate: 50.5, pickrate: 6.2, banrate: 4.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Riftmaker", "Zhonya's Hourglass", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Rabadon's Deathcap", "Void Staff", "Banshee's Veil", "Cosmic Drive"],
    source: "u.gg"
  },
  Taliyah: {
    champion: "Taliyah", role: "JGL", winrate: 51.0, pickrate: 4.8, banrate: 2.8,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Liandry's Anguish", "Rylai's Crystal Scepter", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Rabadon's Deathcap", "Void Staff", "Zhonya's Hourglass", "Cosmic Drive"],
    source: "u.gg"
  },
  Trundle: {
    champion: "Trundle", role: "JGL", winrate: 51.5, pickrate: 4.2, banrate: 2.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Sterak's Gage", "Dead Man's Plate"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Death's Dance", "Thornmail", "Force of Nature", "Black Cleaver"],
    source: "u.gg"
  },
  Udyr: {
    champion: "Udyr", role: "JGL", winrate: 51.8, pickrate: 5.5, banrate: 4.2,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Heartsteel", "Sunfire Aegis"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "E > Q > W", earlyLevels: "Q > E > W",
    situationalItems: ["Warmog's Armor", "Force of Nature", "Sterak's Gage", "Randuin's Omen"],
    source: "u.gg"
  },
  Warwick: {
    champion: "Warwick", role: "JGL", winrate: 52.5, pickrate: 7.2, banrate: 3.8,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Bloodline", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Trinity Force", "Black Cleaver", "Sterak's Gage"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Death's Dance", "Guardian Angel", "Spirit Visage", "Randuin's Omen"],
    source: "u.gg"
  },
  XinZhao: {
    champion: "XinZhao", role: "JGL", winrate: 51.2, pickrate: 5.8, banrate: 3.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Domination", secondaryRunes: ["Sudden Impact", "Treasure Hunter"],
    coreItems: ["Trinity Force", "Black Cleaver", "Death's Dance"], boots: "Plated Steelcaps",
    skillOrder: ["E", "Q", "W"], skillMax: "Q > E > W", earlyLevels: "E > Q > W",
    situationalItems: ["Sterak's Gage", "Guardian Angel", "Maw of Malmortius", "Serylda's Grudge"],
    source: "u.gg"
  },
  Zac: {
    champion: "Zac", role: "JGL", winrate: 52.8, pickrate: 5.5, banrate: 4.2,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Conditioning", "Overgrowth"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Tenacity"],
    coreItems: ["Sunfire Aegis", "Warmog's Armor", "Thornmail"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "E", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Force of Nature", "Heartsteel", "Gargoyle Stoneplate", "Abyssal Mask"],
    source: "u.gg"
  },

  // ═══ MID (additional) ═══════════════════════════════════════════════════════
  Akali: {
    champion: "Akali", role: "MID", winrate: 49.8, pickrate: 9.5, banrate: 18.5,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Sudden Impact", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Hextech Rocketbelt", "Shadowflame", "Zhonya's Hourglass"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Rabadon's Deathcap", "Void Staff", "Serylda's Grudge", "Edge of Night"],
    source: "u.gg"
  },
  Akshan: {
    champion: "Akshan", role: "MID", winrate: 50.5, pickrate: 5.5, banrate: 3.2,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Triumph", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Domination", secondaryRunes: ["Eyeball Collection", "Treasure Hunter"],
    coreItems: ["Kraken Slayer", "The Collector", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Lord Dominik's", "Mortal Reminder", "Guardian Angel", "Edge of Night"],
    source: "u.gg"
  },
  Anivia: {
    champion: "Anivia", role: "MID", winrate: 52.0, pickrate: 3.8, banrate: 2.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Seraph's Embrace", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Rylai's Crystal Scepter"],
    source: "u.gg"
  },
  Annie: {
    champion: "Annie", role: "MID", winrate: 51.5, pickrate: 4.5, banrate: 2.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Banshee's Veil", "Rylai's Crystal Scepter"],
    source: "u.gg"
  },
  AurelionSol: {
    champion: "AurelionSol", role: "MID", winrate: 52.8, pickrate: 5.8, banrate: 4.2,
    keystone: "Phase Rush", primaryRunes: ["Phase Rush", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Tenacity"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Cosmic Drive", "Banshee's Veil"],
    source: "u.gg"
  },
  Azir: {
    champion: "Azir", role: "MID", winrate: 49.5, pickrate: 4.8, banrate: 3.5,
    keystone: "Conqueror", primaryRunes: ["Conqueror", "Triumph", "Legend: Alacrity", "Last Stand"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Liandry's Anguish", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Cosmic Drive", "Banshee's Veil"],
    source: "u.gg"
  },
  Cassiopeia: {
    champion: "Cassiopeia", role: "MID", winrate: 51.5, pickrate: 4.2, banrate: 3.8,
    keystone: "Phase Rush", primaryRunes: ["Phase Rush", "Nimbus Cloak", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Liandry's Anguish", "Rylai's Crystal Scepter", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Rabadon's Deathcap", "Void Staff", "Banshee's Veil", "Zhonya's Hourglass"],
    source: "u.gg"
  },
  Corki: {
    champion: "Corki", role: "MID", winrate: 49.8, pickrate: 4.5, banrate: 1.8,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Presence of Mind", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Trinity Force", "Essence Reaver", "Infinity Edge"], boots: "Ionian Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Guardian Angel", "Maw of Malmortius", "Death's Dance"],
    source: "u.gg"
  },
  Fizz: {
    champion: "Fizz", role: "MID", winrate: 51.2, pickrate: 6.8, banrate: 8.5,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Cheap Shot", "Eyeball Collection", "Treasure Hunter"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Scorch"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Banshee's Veil", "Lich Bane"],
    source: "u.gg"
  },
  Galio: {
    champion: "Galio", role: "MID", winrate: 51.8, pickrate: 6.2, banrate: 4.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Void Staff"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Zhonya's Hourglass", "Rabadon's Deathcap", "Banshee's Veil", "Cosmic Drive"],
    source: "u.gg"
  },
  Heimerdinger: {
    champion: "Heimerdinger", role: "MID", winrate: 52.5, pickrate: 3.8, banrate: 5.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Liandry's Anguish", "Rylai's Crystal Scepter", "Void Staff"], boots: "Sorcerer's Shoes",
    skillOrder: ["E", "W", "Q"], skillMax: "E > Q > W", earlyLevels: "E > W > Q",
    situationalItems: ["Rabadon's Deathcap", "Shadowflame", "Banshee's Veil", "Zhonya's Hourglass"],
    source: "u.gg"
  },
  Hwei: {
    champion: "Hwei", role: "MID", winrate: 50.8, pickrate: 5.2, banrate: 2.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Cosmic Drive"],
    source: "u.gg"
  },
  Kassadin: {
    champion: "Kassadin", role: "MID", winrate: 51.0, pickrate: 6.5, banrate: 8.5,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Presence of Mind", "Legend: Tenacity", "Last Stand"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Rod of Ages", "Lich Bane", "Zhonya's Hourglass"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "R > Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Rabadon's Deathcap", "Void Staff", "Banshee's Veil", "Seraph's Embrace"],
    source: "u.gg"
  },
  Kayle: {
    champion: "Kayle", role: "MID", winrate: 51.5, pickrate: 5.2, banrate: 4.2,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Overgrowth"],
    coreItems: ["Nashor's Tooth", "Guinsoo's Rageblade", "Kraken Slayer"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Void Staff", "Rabadon's Deathcap", "Zhonya's Hourglass", "Wit's End"],
    source: "u.gg"
  },
  Leblanc: {
    champion: "Leblanc", role: "MID", winrate: 50.5, pickrate: 8.2, banrate: 12.5,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Cheap Shot", "Eyeball Collection", "Ultimate Hunter"],
    secondaryTree: "Sorcery", secondaryRunes: ["Transcendence", "Gathering Storm"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Cryptbloom"],
    source: "u.gg"
  },
  Lissandra: {
    champion: "Lissandra", role: "MID", winrate: 51.8, pickrate: 4.2, banrate: 3.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Luden's Tempest", "Zhonya's Hourglass", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Rabadon's Deathcap", "Banshee's Veil", "Rylai's Crystal Scepter"],
    source: "u.gg"
  },
  Malzahar: {
    champion: "Malzahar", role: "MID", winrate: 52.5, pickrate: 5.5, banrate: 4.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Liandry's Anguish", "Rylai's Crystal Scepter", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Void Staff", "Rabadon's Deathcap", "Zhonya's Hourglass", "Banshee's Veil"],
    source: "u.gg"
  },
  Neeko: {
    champion: "Neeko", role: "MID", winrate: 51.5, pickrate: 3.8, banrate: 2.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Rylai's Crystal Scepter"],
    source: "u.gg"
  },
  Orianna: {
    champion: "Orianna", role: "MID", winrate: 51.8, pickrate: 5.5, banrate: 2.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Cosmic Drive"],
    source: "u.gg"
  },
  Qiyana: {
    champion: "Qiyana", role: "MID", winrate: 50.2, pickrate: 5.8, banrate: 6.5,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Cheap Shot", "Eyeball Collection", "Treasure Hunter"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Alacrity"],
    coreItems: ["Duskblade of Draktharr", "Eclipse", "The Collector"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Serylda's Grudge", "Edge of Night", "Guardian Angel", "Lord Dominik's"],
    source: "u.gg"
  },
  Talon: {
    champion: "Talon", role: "MID", winrate: 50.8, pickrate: 7.5, banrate: 6.5,
    keystone: "Electrocute", primaryRunes: ["Electrocute", "Cheap Shot", "Eyeball Collection", "Relentless Hunter"],
    secondaryTree: "Precision", secondaryRunes: ["Triumph", "Legend: Alacrity"],
    coreItems: ["Duskblade of Draktharr", "Edge of Night", "The Collector"], boots: "Ionian Boots",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Serylda's Grudge", "Lord Dominik's", "Guardian Angel", "Death's Dance"],
    source: "u.gg"
  },
  TwistedFate: {
    champion: "TwistedFate", role: "MID", winrate: 50.5, pickrate: 5.2, banrate: 3.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Precision", secondaryRunes: ["Presence of Mind", "Legend: Alacrity"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Banshee's Veil", "Zhonya's Hourglass", "Cosmic Drive"],
    source: "u.gg"
  },
  Veigar: {
    champion: "Veigar", role: "MID", winrate: 52.5, pickrate: 5.8, banrate: 3.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Horizon Focus"],
    source: "u.gg"
  },
  Vex: {
    champion: "Vex", role: "MID", winrate: 52.2, pickrate: 5.5, banrate: 4.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Cryptbloom"],
    source: "u.gg"
  },
  Xerath: {
    champion: "Xerath", role: "MID", winrate: 51.5, pickrate: 4.2, banrate: 3.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Banshee's Veil", "Zhonya's Hourglass", "Horizon Focus"],
    source: "u.gg"
  },
  Ziggs: {
    champion: "Ziggs", role: "MID", winrate: 51.2, pickrate: 4.8, banrate: 2.2,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Horizon Focus"],
    source: "u.gg"
  },
  Zoe: {
    champion: "Zoe", role: "MID", winrate: 51.8, pickrate: 6.2, banrate: 5.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Horizon Focus"],
    source: "u.gg"
  },

  // ═══ ADC (additional) ═══════════════════════════════════════════════════════
  Aphelios: {
    champion: "Aphelios", role: "ADC", winrate: 50.8, pickrate: 8.5, banrate: 5.5,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Kraken Slayer", "Runaan's Hurricane", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Mortal Reminder", "Bloodthirster", "Guardian Angel"],
    source: "u.gg"
  },
  Kalista: {
    champion: "Kalista", role: "ADC", winrate: 50.5, pickrate: 5.8, banrate: 3.5,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Resolve", secondaryRunes: ["Second Wind", "Overgrowth"],
    coreItems: ["Kraken Slayer", "Blade of the Ruined King", "Runaan's Hurricane"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Mortal Reminder", "Lord Dominik's", "Guardian Angel", "Wit's End"],
    source: "u.gg"
  },
  KogMaw: {
    champion: "KogMaw", role: "ADC", winrate: 52.5, pickrate: 5.2, banrate: 2.5,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Runaan's Hurricane", "Blade of the Ruined King", "Kraken Slayer"], boots: "Berserker's Greaves",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Rageblade", "Lord Dominik's", "Mortal Reminder", "Wit's End"],
    source: "u.gg"
  },
  Nilah: {
    champion: "Nilah", role: "ADC", winrate: 50.8, pickrate: 4.5, banrate: 3.2,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Resolve", secondaryRunes: ["Bone Plating", "Revitalize"],
    coreItems: ["Blade of the Ruined King", "Guinsoo's Rageblade", "Kraken Slayer"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Wit's End", "Death's Dance", "Mortal Reminder", "Guardian Angel"],
    source: "u.gg"
  },
  Sivir: {
    champion: "Sivir", role: "ADC", winrate: 51.5, pickrate: 6.8, banrate: 2.2,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Kraken Slayer", "Runaan's Hurricane", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Mortal Reminder", "Bloodthirster", "Guardian Angel"],
    source: "u.gg"
  },
  Smolder: {
    champion: "Smolder", role: "ADC", winrate: 50.5, pickrate: 7.2, banrate: 3.5,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Manamune", "Kraken Slayer", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Lord Dominik's", "Mortal Reminder", "Guardian Angel", "Bloodthirster"],
    source: "u.gg"
  },
  Twitch: {
    champion: "Twitch", role: "ADC", winrate: 51.8, pickrate: 5.5, banrate: 4.2,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Triumph", "Legend: Alacrity", "Coup de Grace"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Kraken Slayer", "Runaan's Hurricane", "Blade of the Ruined King"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Lord Dominik's", "Mortal Reminder", "Infinity Edge", "Phantom Dancer"],
    source: "u.gg"
  },
  Varus: {
    champion: "Varus", role: "ADC", winrate: 51.2, pickrate: 6.2, banrate: 2.8,
    keystone: "Fleet Footwork", primaryRunes: ["Fleet Footwork", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Kraken Slayer", "Runaan's Hurricane", "Guinsoo's Rageblade"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Lord Dominik's", "Mortal Reminder", "Wit's End", "Bloodthirster"],
    source: "u.gg"
  },
  Xayah: {
    champion: "Xayah", role: "ADC", winrate: 51.5, pickrate: 7.8, banrate: 3.5,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Bloodline", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Kraken Slayer", "Runaan's Hurricane", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["E", "Q", "W"], skillMax: "E > Q > W", earlyLevels: "E > Q > W",
    situationalItems: ["Lord Dominik's", "Mortal Reminder", "Bloodthirster", "Guardian Angel"],
    source: "u.gg"
  },
  Zeri: {
    champion: "Zeri", role: "ADC", winrate: 50.5, pickrate: 6.5, banrate: 4.8,
    keystone: "Lethal Tempo", primaryRunes: ["Lethal Tempo", "Presence of Mind", "Legend: Alacrity", "Cut Down"],
    secondaryTree: "Sorcery", secondaryRunes: ["Absolute Focus", "Gathering Storm"],
    coreItems: ["Kraken Slayer", "Runaan's Hurricane", "Infinity Edge"], boots: "Berserker's Greaves",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Lord Dominik's", "Phantom Dancer", "Mortal Reminder", "Guardian Angel"],
    source: "u.gg"
  },

  // ═══ SUPPORT (additional) ═══════════════════════════════════════════════════
  Alistar: {
    champion: "Alistar", role: "SUP", winrate: 51.5, pickrate: 6.8, banrate: 4.5,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence"], boots: "Mobility Boots",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Frozen Heart", "Redemption", "Thornmail", "Warmog's Armor"],
    source: "u.gg"
  },
  Brand: {
    champion: "Brand", role: "SUP", winrate: 52.5, pickrate: 6.8, banrate: 4.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Domination", secondaryRunes: ["Cheap Shot", "Treasure Hunter"],
    coreItems: ["Liandry's Anguish", "Rylai's Crystal Scepter", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Void Staff", "Rabadon's Deathcap", "Zhonya's Hourglass", "Morellonomicon"],
    source: "u.gg"
  },
  Braum: {
    champion: "Braum", role: "SUP", winrate: 51.8, pickrate: 5.5, banrate: 3.2,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Redemption"], boots: "Mobility Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "E > Q > W", earlyLevels: "Q > E > W",
    situationalItems: ["Frozen Heart", "Zeke's Convergence", "Thornmail", "Warmog's Armor"],
    source: "u.gg"
  },
  Janna: {
    champion: "Janna", role: "SUP", winrate: 52.5, pickrate: 7.2, banrate: 3.5,
    keystone: "Summon Aery", primaryRunes: ["Summon Aery", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Ardent Censer"], boots: "Ionian Boots",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Redemption", "Mikael's Blessing", "Chemtech Putrifier", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Karma: {
    champion: "Karma", role: "SUP", winrate: 51.5, pickrate: 6.5, banrate: 3.8,
    keystone: "Summon Aery", primaryRunes: ["Summon Aery", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Ardent Censer"], boots: "Ionian Boots",
    skillOrder: ["E", "Q", "W"], skillMax: "Q > E > W", earlyLevels: "E > Q > W",
    situationalItems: ["Redemption", "Chemtech Putrifier", "Mikael's Blessing", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Maokai: {
    champion: "Maokai", role: "SUP", winrate: 52.3, pickrate: 4.5, banrate: 2.8,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Overgrowth"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Redemption"], boots: "Mobility Boots",
    skillOrder: ["E", "W", "Q"], skillMax: "E > W > Q", earlyLevels: "E > W > Q",
    situationalItems: ["Warmog's Armor", "Thornmail", "Abyssal Mask", "Force of Nature"],
    source: "u.gg"
  },
  Milio: {
    champion: "Milio", role: "SUP", winrate: 52.8, pickrate: 5.5, banrate: 3.8,
    keystone: "Summon Aery", primaryRunes: ["Summon Aery", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Ardent Censer"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Redemption", "Mikael's Blessing", "Chemtech Putrifier", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Nami: {
    champion: "Nami", role: "SUP", winrate: 52.2, pickrate: 7.8, banrate: 3.2,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Chemtech Putrifier"], boots: "Ionian Boots",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Ardent Censer", "Redemption", "Mikael's Blessing", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Pyke: {
    champion: "Pyke", role: "SUP", winrate: 50.5, pickrate: 7.5, banrate: 8.5,
    keystone: "Hail of Blades", primaryRunes: ["Hail of Blades", "Cheap Shot", "Eyeball Collection", "Treasure Hunter"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Duskblade of Draktharr", "Edge of Night", "Serylda's Grudge"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Umbral Glaive", "The Collector", "Lord Dominik's", "Guardian Angel"],
    source: "u.gg"
  },
  Rakan: {
    champion: "Rakan", role: "SUP", winrate: 51.5, pickrate: 6.5, banrate: 4.8,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Redemption"], boots: "Mobility Boots",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Zeke's Convergence", "Frozen Heart", "Mikael's Blessing", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Rell: {
    champion: "Rell", role: "SUP", winrate: 51.2, pickrate: 4.8, banrate: 3.5,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Redemption"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Frozen Heart", "Thornmail", "Zeke's Convergence", "Warmog's Armor"],
    source: "u.gg"
  },
  Renata: {
    champion: "Renata", role: "SUP", winrate: 51.8, pickrate: 4.2, banrate: 2.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Chemtech Putrifier", "Redemption"], boots: "Ionian Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Staff of Flowing Water", "Mikael's Blessing", "Shurelya's Battlesong", "Zhonya's Hourglass"],
    source: "u.gg"
  },
  Seraphine: {
    champion: "Seraphine", role: "SUP", winrate: 52.0, pickrate: 4.5, banrate: 3.2,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Redemption"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Chemtech Putrifier", "Ardent Censer", "Mikael's Blessing", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Sona: {
    champion: "Sona", role: "SUP", winrate: 53.0, pickrate: 5.8, banrate: 4.2,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Ardent Censer"], boots: "Ionian Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Chemtech Putrifier", "Redemption", "Mikael's Blessing", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Soraka: {
    champion: "Soraka", role: "SUP", winrate: 53.5, pickrate: 6.2, banrate: 5.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Resolve", secondaryRunes: ["Revitalize", "Overgrowth"],
    coreItems: ["Moonstone Renewer", "Warmog's Armor", "Redemption"], boots: "Ionian Boots",
    skillOrder: ["Q", "W", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Mikael's Blessing", "Chemtech Putrifier", "Staff of Flowing Water", "Zhonya's Hourglass"],
    source: "u.gg"
  },
  Swain: {
    champion: "Swain", role: "SUP", winrate: 51.5, pickrate: 4.8, banrate: 3.5,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Liandry's Anguish", "Rylai's Crystal Scepter", "Demonic Embrace"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Shadowflame", "Void Staff", "Zhonya's Hourglass", "Morellonomicon"],
    source: "u.gg"
  },
  TahmKench: {
    champion: "TahmKench", role: "SUP", winrate: 52.5, pickrate: 4.2, banrate: 4.8,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Unflinching"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Warmog's Armor", "Thornmail"], boots: "Plated Steelcaps",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Spirit Visage", "Force of Nature", "Abyssal Mask", "Zeke's Convergence"],
    source: "u.gg"
  },
  Taric: {
    champion: "Taric", role: "SUP", winrate: 51.5, pickrate: 3.5, banrate: 2.5,
    keystone: "Aftershock", primaryRunes: ["Aftershock", "Font of Life", "Bone Plating", "Revitalize"],
    secondaryTree: "Inspiration", secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
    coreItems: ["Locket of the Iron Solari", "Knight's Vow", "Redemption"], boots: "Plated Steelcaps",
    skillOrder: ["W", "Q", "E"], skillMax: "W > Q > E", earlyLevels: "W > Q > E",
    situationalItems: ["Zeke's Convergence", "Frozen Heart", "Warmog's Armor", "Thornmail"],
    source: "u.gg"
  },
  Velkoz: {
    champion: "Velkoz", role: "SUP", winrate: 52.5, pickrate: 4.5, banrate: 3.2,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Gathering Storm"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Luden's Tempest", "Shadowflame", "Rabadon's Deathcap"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Zhonya's Hourglass", "Banshee's Veil", "Horizon Focus"],
    source: "u.gg"
  },
  Yuumi: {
    champion: "Yuumi", role: "SUP", winrate: 46.5, pickrate: 5.5, banrate: 28.5,
    keystone: "Summon Aery", primaryRunes: ["Summon Aery", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Staff of Flowing Water", "Ardent Censer"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Chemtech Putrifier", "Redemption", "Mikael's Blessing", "Shurelya's Battlesong"],
    source: "u.gg"
  },
  Zilean: {
    champion: "Zilean", role: "SUP", winrate: 52.5, pickrate: 3.5, banrate: 2.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Inspiration", secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
    coreItems: ["Moonstone Renewer", "Warmog's Armor", "Shurelya's Battlesong"], boots: "Ionian Boots",
    skillOrder: ["Q", "E", "W"], skillMax: "Q > E > W", earlyLevels: "Q > E > W",
    situationalItems: ["Redemption", "Cosmic Drive", "Zhonya's Hourglass", "Locket of the Iron Solari"],
    source: "u.gg"
  },
  Zyra: {
    champion: "Zyra", role: "SUP", winrate: 52.0, pickrate: 5.2, banrate: 3.8,
    keystone: "Arcane Comet", primaryRunes: ["Arcane Comet", "Manaflow Band", "Transcendence", "Scorch"],
    secondaryTree: "Domination", secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
    coreItems: ["Liandry's Anguish", "Rylai's Crystal Scepter", "Shadowflame"], boots: "Sorcerer's Shoes",
    skillOrder: ["Q", "W", "E"], skillMax: "Q > W > E", earlyLevels: "Q > W > E",
    situationalItems: ["Void Staff", "Rabadon's Deathcap", "Zhonya's Hourglass", "Morellonomicon"],
    source: "u.gg"
  },
};
