import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo, useEffect } from "react";
import { Search, X, Shield, Swords, Heart, Zap, Eye, Flame, ArrowRight, ChevronRight, Coins, Star, Package, Filter, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "../components/ui/utils";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { useLanguage } from "../contexts/LanguageContext";
import { useSearchParams } from "react-router";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ItemData {
  id: string;
  name: string;
  description: string;
  plaintext: string;
  gold: { total: number; base: number; sell: number };
  stats: Record<string, number>;
  tags: string[];
  from?: string[];
  into?: string[];
  depth?: number;
  image: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

type ItemCategory = "all" | "starter" | "boots" | "basic" | "epic" | "legendary" | "consumable";

const CATEGORIES: { key: ItemCategory; label: string; icon: any }[] = [
  { key: "all", label: "All Items", icon: Package },
  { key: "starter", label: "Starter", icon: Star },
  { key: "boots", label: "Boots", icon: Zap },
  { key: "basic", label: "Basic", icon: Shield },
  { key: "epic", label: "Epic", icon: Flame },
  { key: "legendary", label: "Legendary", icon: Swords },
  { key: "consumable", label: "Consumables", icon: Heart },
];

// ─── Stat Tags ───────────────────────────────────────────────────────────────

type StatFilter = "all" | "ad" | "ap" | "armor" | "mr" | "health" | "mana" | "crit" | "attackspeed" | "cdr" | "lifesteal" | "lethality";

const STAT_FILTERS: { key: StatFilter; label: string; color: string }[] = [
  { key: "all", label: "All", color: "text-foreground" },
  { key: "ad", label: "AD", color: "text-red-400" },
  { key: "ap", label: "AP", color: "text-purple-400" },
  { key: "armor", label: "Armor", color: "text-yellow-500" },
  { key: "mr", label: "Magic Resist", color: "text-blue-400" },
  { key: "health", label: "Health", color: "text-green-400" },
  { key: "mana", label: "Mana", color: "text-cyan-400" },
  { key: "crit", label: "Crit", color: "text-amber-400" },
  { key: "attackspeed", label: "Attack Speed", color: "text-yellow-400" },
  { key: "cdr", label: "CDR", color: "text-sky-400" },
  { key: "lifesteal", label: "Lifesteal", color: "text-emerald-400" },
  { key: "lethality", label: "Lethality", color: "text-red-300" },
];

// ─── Complete Item Database ──────────────────────────────────────────────────

export const ITEMS_DATABASE: ItemData[] = [
  // ══════════════════════════════════ STARTER ══════════════════════════════════
  { id: "1055", name: "Doran's Blade", description: "A sharp short sword that provides attack damage, health, and omnivamp on hit.", plaintext: "Good starting item for physical damage dealers", gold: { total: 450, base: 450, sell: 180 }, stats: { FlatPhysicalDamageMod: 10, FlatHPPoolMod: 100 }, tags: ["Damage", "Health", "Lane"], from: [], into: [], depth: 1, image: "1055" },
  { id: "1056", name: "Doran's Ring", description: "A magical ring that provides ability power, health, and mana regeneration.", plaintext: "Good starting item for casters", gold: { total: 400, base: 400, sell: 160 }, stats: { FlatMagicDamageMod: 15, FlatHPPoolMod: 80 }, tags: ["SpellDamage", "Health", "ManaRegen", "Lane"], from: [], into: [], depth: 1, image: "1056" },
  { id: "1054", name: "Doran's Shield", description: "A sturdy shield that provides health and passive health regeneration.", plaintext: "Good starting item for tanks and sustain", gold: { total: 450, base: 450, sell: 180 }, stats: { FlatHPPoolMod: 110 }, tags: ["Health", "HealthRegen", "Lane"], from: [], into: [], depth: 1, image: "1054" },
  { id: "2003", name: "Health Potion", description: "Restores 120 health over 15 seconds.", plaintext: "Consume to restore health", gold: { total: 50, base: 50, sell: 20 }, stats: {}, tags: ["Consumable", "Health"], from: [], into: [], depth: 1, image: "2003" },
  { id: "3340", name: "Stealth Ward", description: "Places a ward that reveals the surrounding area for 90-120 seconds.", plaintext: "Trinket to reveal areas of the map", gold: { total: 0, base: 0, sell: 0 }, stats: {}, tags: ["Vision", "Trinket"], from: [], into: [], depth: 1, image: "3340" },
  { id: "3364", name: "Oracle Lens", description: "Reveals and disables nearby invisible traps and wards for 10 seconds.", plaintext: "Reveals nearby invisible units and wards", gold: { total: 0, base: 0, sell: 0 }, stats: {}, tags: ["Vision", "Trinket"], from: [], into: [], depth: 1, image: "3364" },
  { id: "3363", name: "Farsight Alteration", description: "Places a visible ward with a long cast range that lasts indefinitely.", plaintext: "Long range ward trinket", gold: { total: 0, base: 0, sell: 0 }, stats: {}, tags: ["Vision", "Trinket"], from: [], into: [], depth: 1, image: "3363" },
  { id: "1083", name: "Cull", description: "A modest blade that rewards CS farming with bonus gold.", plaintext: "Provides bonus gold on minion kills", gold: { total: 450, base: 450, sell: 180 }, stats: { FlatPhysicalDamageMod: 7 }, tags: ["Damage", "Lane", "GoldPer"], from: [], into: [], depth: 1, image: "1083" },
  { id: "1082", name: "Dark Seal", description: "A tome that grows stronger with champion kills and assists.", plaintext: "Provides AP that scales with takedowns", gold: { total: 350, base: 350, sell: 140 }, stats: { FlatMagicDamageMod: 15 }, tags: ["SpellDamage", "Lane"], from: [], into: ["3041"], depth: 1, image: "1082" },
  { id: "1101", name: "Scorchclaw Pup", description: "Jungle starter pet that deals bonus burn damage.", plaintext: "Jungle starter with burn", gold: { total: 450, base: 450, sell: 180 }, stats: {}, tags: ["Jungle", "Lane"], from: [], into: [], depth: 1, image: "1101" },
  { id: "1102", name: "Gustwalker Hatchling", description: "Jungle starter pet that grants bonus movement speed.", plaintext: "Jungle starter with move speed", gold: { total: 450, base: 450, sell: 180 }, stats: {}, tags: ["Jungle", "Lane"], from: [], into: [], depth: 1, image: "1102" },
  { id: "1103", name: "Mosstomper Seedling", description: "Jungle starter pet that provides a shield.", plaintext: "Jungle starter with shield", gold: { total: 450, base: 450, sell: 180 }, stats: {}, tags: ["Jungle", "Lane"], from: [], into: [], depth: 1, image: "1103" },
  { id: "3862", name: "Spectral Sickle", description: "Support starter that generates gold when damaging champions.", plaintext: "AD support starter item", gold: { total: 400, base: 400, sell: 160 }, stats: { FlatPhysicalDamageMod: 5 }, tags: ["Damage", "Lane", "GoldPer"], from: [], into: [], depth: 1, image: "3862" },
  { id: "3858", name: "Relic Shield", description: "Support starter that generates gold by executing minions.", plaintext: "Tank support starter item", gold: { total: 400, base: 400, sell: 160 }, stats: { FlatHPPoolMod: 30 }, tags: ["Health", "Lane", "GoldPer"], from: [], into: [], depth: 1, image: "3858" },
  { id: "3850", name: "Spellthief's Edge", description: "Support starter that generates gold when dealing damage.", plaintext: "AP support starter item", gold: { total: 400, base: 400, sell: 160 }, stats: { FlatMagicDamageMod: 8 }, tags: ["SpellDamage", "Lane", "GoldPer"], from: [], into: [], depth: 1, image: "3850" },
  { id: "3854", name: "Steel Shoulderguards", description: "Melee AD support starter item.", plaintext: "Melee AD support starter", gold: { total: 400, base: 400, sell: 160 }, stats: { FlatPhysicalDamageMod: 3, FlatHPPoolMod: 30 }, tags: ["Damage", "Health", "Lane", "GoldPer"], from: [], into: [], depth: 1, image: "3854" },
  { id: "2051", name: "Guardian's Horn", description: "Starter item for ARAM that provides health and damage reduction.", plaintext: "ARAM starter with tank stats", gold: { total: 950, base: 950, sell: 380 }, stats: { FlatHPPoolMod: 150 }, tags: ["Health", "Lane"], from: [], into: [], depth: 1, image: "2051" },

  // ══════════════════════════════════ BOOTS ══════════════════════════════════
  { id: "1001", name: "Boots", description: "Slightly increases movement speed.", plaintext: "Slightly increases Movement Speed", gold: { total: 300, base: 300, sell: 210 }, stats: {}, tags: ["Boots"], from: [], into: ["3006", "3020", "3047", "3111", "3158", "3009"], depth: 1, image: "1001" },
  { id: "3006", name: "Berserker's Greaves", description: "Enhanced footwear that provides attack speed and movement.", plaintext: "Enhanced attack speed and movement", gold: { total: 1100, base: 800, sell: 770 }, stats: { PercentAttackSpeedMod: 0.35 }, tags: ["Boots", "AttackSpeed"], from: ["1001"], into: [], depth: 2, image: "3006" },
  { id: "3020", name: "Sorcerer's Shoes", description: "Enhanced footwear that provides magic penetration and movement.", plaintext: "Enhanced magic damage and movement", gold: { total: 1100, base: 800, sell: 770 }, stats: { FlatMagicPenetrationMod: 15 }, tags: ["Boots", "SpellDamage"], from: ["1001"], into: [], depth: 2, image: "3020" },
  { id: "3047", name: "Plated Steelcaps", description: "Enhanced footwear that blocks basic attack damage and provides armor.", plaintext: "Enhanced defense and movement", gold: { total: 1100, base: 700, sell: 770 }, stats: { FlatArmorMod: 25 }, tags: ["Boots", "Armor"], from: ["1001"], into: [], depth: 2, image: "3047" },
  { id: "3111", name: "Mercury's Treads", description: "Enhanced footwear that provides magic resistance and tenacity.", plaintext: "Enhanced magic defense and movement", gold: { total: 1100, base: 700, sell: 770 }, stats: { FlatSpellBlockMod: 25 }, tags: ["Boots", "SpellBlock", "Tenacity"], from: ["1001"], into: [], depth: 2, image: "3111" },
  { id: "3158", name: "Ionian Boots of Lucidity", description: "Enhanced footwear that provides ability haste and movement.", plaintext: "Enhanced ability haste and movement", gold: { total: 900, base: 600, sell: 630 }, stats: {}, tags: ["Boots", "CooldownReduction"], from: ["1001"], into: [], depth: 2, image: "3158" },
  { id: "3009", name: "Boots of Swiftness", description: "Enhanced footwear that provides extra movement speed and slow resistance.", plaintext: "Enhanced movement and slow resist", gold: { total: 900, base: 600, sell: 630 }, stats: {}, tags: ["Boots"], from: ["1001"], into: [], depth: 2, image: "3009" },
  { id: "3013", name: "Symbiotic Soles", description: "Boots that gain movement speed while near allies.", plaintext: "Movement speed near allies", gold: { total: 1000, base: 700, sell: 700 }, stats: {}, tags: ["Boots"], from: ["1001"], into: [], depth: 2, image: "3013" },

  // ══════════════════════════════════ BASIC ══════════════════════════════════
  { id: "1036", name: "Long Sword", description: "A straightforward sword that provides a small amount of attack damage.", plaintext: "Slightly increases attack damage", gold: { total: 350, base: 350, sell: 245 }, stats: { FlatPhysicalDamageMod: 10 }, tags: ["Damage"], from: [], into: ["3134", "3044"], depth: 1, image: "1036" },
  { id: "1037", name: "Pickaxe", description: "A sharp pickaxe that provides attack damage.", plaintext: "Moderately increases attack damage", gold: { total: 875, base: 875, sell: 613 }, stats: { FlatPhysicalDamageMod: 25 }, tags: ["Damage"], from: [], into: ["3031", "3004"], depth: 1, image: "1037" },
  { id: "1038", name: "B. F. Sword", description: "A massive sword forged to slash through the toughest armor.", plaintext: "Greatly increases attack damage", gold: { total: 1300, base: 1300, sell: 910 }, stats: { FlatPhysicalDamageMod: 40 }, tags: ["Damage"], from: [], into: ["3026", "3072"], depth: 1, image: "1038" },
  { id: "1052", name: "Amplifying Tome", description: "A large tome that slightly increases ability power.", plaintext: "Slightly increases ability power", gold: { total: 435, base: 435, sell: 305 }, stats: { FlatMagicDamageMod: 20 }, tags: ["SpellDamage"], from: [], into: ["3108", "3113"], depth: 1, image: "1052" },
  { id: "1058", name: "Needlessly Large Rod", description: "An extremely powerful arcane staff.", plaintext: "Greatly increases ability power", gold: { total: 1250, base: 1250, sell: 875 }, stats: { FlatMagicDamageMod: 60 }, tags: ["SpellDamage"], from: [], into: ["3089", "3157"], depth: 1, image: "1058" },
  { id: "1026", name: "Blasting Wand", description: "A wand that increases ability power.", plaintext: "Moderately increases ability power", gold: { total: 850, base: 850, sell: 595 }, stats: { FlatMagicDamageMod: 40 }, tags: ["SpellDamage"], from: [], into: ["3116", "3151"], depth: 1, image: "1026" },
  { id: "1029", name: "Cloth Armor", description: "Basic armor component.", plaintext: "Slightly increases armor", gold: { total: 300, base: 300, sell: 210 }, stats: { FlatArmorMod: 15 }, tags: ["Armor"], from: [], into: ["3082"], depth: 1, image: "1029" },
  { id: "1031", name: "Chain Vest", description: "A sturdy chain-link vest.", plaintext: "Moderately increases armor", gold: { total: 800, base: 800, sell: 560 }, stats: { FlatArmorMod: 40 }, tags: ["Armor"], from: [], into: ["3075", "3068"], depth: 1, image: "1031" },
  { id: "1033", name: "Null-Magic Mantle", description: "A thin scarf woven with magic-resistant fiber.", plaintext: "Slightly increases magic resistance", gold: { total: 450, base: 450, sell: 315 }, stats: { FlatSpellBlockMod: 25 }, tags: ["SpellBlock"], from: [], into: ["3211"], depth: 1, image: "1033" },
  { id: "1057", name: "Negatron Cloak", description: "A thick cloak of heavy magic-resistant fabric.", plaintext: "Moderately increases magic resistance", gold: { total: 900, base: 900, sell: 630 }, stats: { FlatSpellBlockMod: 50 }, tags: ["SpellBlock"], from: [], into: ["3194", "3102"], depth: 1, image: "1057" },
  { id: "1028", name: "Ruby Crystal", description: "A gem that provides a solid health bonus.", plaintext: "Increases health", gold: { total: 400, base: 400, sell: 280 }, stats: { FlatHPPoolMod: 150 }, tags: ["Health"], from: [], into: ["3044", "3067"], depth: 1, image: "1028" },
  { id: "1027", name: "Sapphire Crystal", description: "A simple blue crystal that increases mana.", plaintext: "Increases mana", gold: { total: 350, base: 350, sell: 245 }, stats: { FlatMPPoolMod: 250 }, tags: ["Mana"], from: [], into: ["3024", "3802"], depth: 1, image: "1027" },
  { id: "1018", name: "Cloak of Agility", description: "A lightweight cloak that grants critical strike chance.", plaintext: "Increases critical strike chance", gold: { total: 600, base: 600, sell: 420 }, stats: { FlatCritChanceMod: 0.15 }, tags: ["CriticalStrike"], from: [], into: ["3031", "3085"], depth: 1, image: "1018" },
  { id: "1042", name: "Dagger", description: "A lightweight knife that provides a small attack speed bonus.", plaintext: "Slightly increases attack speed", gold: { total: 300, base: 300, sell: 210 }, stats: { PercentAttackSpeedMod: 0.12 }, tags: ["AttackSpeed"], from: [], into: ["3086"], depth: 1, image: "1042" },
  { id: "1053", name: "Vampiric Scepter", description: "A blade infused with dark energy that heals you on hit.", plaintext: "Basic lifesteal and attack damage", gold: { total: 900, base: 550, sell: 630 }, stats: { FlatPhysicalDamageMod: 15 }, tags: ["Damage", "LifeSteal"], from: ["1036"], into: ["3153", "3072"], depth: 2, image: "1053" },

  // ══════════════════════════════════ EPIC ══════════════════════════════════
  { id: "3134", name: "Serrated Dirk", description: "A wicked looking blade that provides attack damage and lethality.", plaintext: "AD and Lethality", gold: { total: 1100, base: 400, sell: 770 }, stats: { FlatPhysicalDamageMod: 25 }, tags: ["Damage", "ArmorPenetration"], from: ["1036", "1036"], into: ["6693", "6694", "3814"], depth: 2, image: "3134" },
  { id: "3133", name: "Caulfield's Warhammer", description: "A hammer that provides attack damage and ability haste.", plaintext: "AD and Ability Haste", gold: { total: 1100, base: 400, sell: 770 }, stats: { FlatPhysicalDamageMod: 25 }, tags: ["Damage", "CooldownReduction"], from: ["1036", "1036"], into: ["6693", "6694", "3071"], depth: 2, image: "3133" },
  { id: "3108", name: "Fiendish Codex", description: "A secret tome that provides ability power and ability haste.", plaintext: "AP and Ability Haste", gold: { total: 900, base: 465, sell: 630 }, stats: { FlatMagicDamageMod: 30 }, tags: ["SpellDamage", "CooldownReduction"], from: ["1052"], into: ["6655", "3165"], depth: 2, image: "3108" },
  { id: "3067", name: "Kindlegem", description: "A solid gem that provides health and ability haste.", plaintext: "Health and Ability Haste", gold: { total: 800, base: 400, sell: 560 }, stats: { FlatHPPoolMod: 200 }, tags: ["Health", "CooldownReduction"], from: ["1028"], into: ["3190", "6630"], depth: 2, image: "3067" },
  { id: "1043", name: "Recurve Bow", description: "A bow for the discerning marksman that increases attack speed.", plaintext: "Attack Speed", gold: { total: 1000, base: 1000, sell: 700 }, stats: { PercentAttackSpeedMod: 0.25 }, tags: ["AttackSpeed"], from: [], into: ["3153", "3085"], depth: 2, image: "1043" },
  { id: "3044", name: "Phage", description: "Grants health, attack damage, and movement speed on dealing damage.", plaintext: "AD, Health, and Move Speed on hit", gold: { total: 1100, base: 350, sell: 770 }, stats: { FlatPhysicalDamageMod: 15, FlatHPPoolMod: 200 }, tags: ["Damage", "Health"], from: ["1036", "1028"], into: ["3078", "6631"], depth: 2, image: "3044" },
  { id: "3082", name: "Warden's Mail", description: "A heavy mail coat that reduces incoming auto-attack damage.", plaintext: "Armor and attack damage reduction", gold: { total: 1000, base: 400, sell: 700 }, stats: { FlatArmorMod: 40 }, tags: ["Armor"], from: ["1029", "1029"], into: ["3143", "3110"], depth: 2, image: "3082" },
  { id: "3211", name: "Spectre's Cowl", description: "Provides magic resist and health regen after being hit by spells.", plaintext: "MR and sustain vs magic damage", gold: { total: 1250, base: 400, sell: 875 }, stats: { FlatSpellBlockMod: 25, FlatHPPoolMod: 250 }, tags: ["SpellBlock", "Health", "HealthRegen"], from: ["1033", "1028"], into: ["3065", "3194"], depth: 2, image: "3211" },
  { id: "3113", name: "Aether Wisp", description: "A light wisp that provides ability power and movement speed.", plaintext: "AP and Movement Speed", gold: { total: 850, base: 415, sell: 595 }, stats: { FlatMagicDamageMod: 25 }, tags: ["SpellDamage"], from: ["1052"], into: ["3100", "3504"], depth: 2, image: "3113" },
  { id: "3086", name: "Zeal", description: "A lightweight glove that provides attack speed, critical chance and movement speed.", plaintext: "AS + Crit + Move Speed", gold: { total: 1050, base: 450, sell: 735 }, stats: { PercentAttackSpeedMod: 0.15, FlatCritChanceMod: 0.15 }, tags: ["AttackSpeed", "CriticalStrike"], from: ["1042", "1042"], into: ["3094", "3085", "3046"], depth: 2, image: "3086" },
  { id: "3057", name: "Sheen", description: "After using an ability, your next basic attack deals bonus damage.", plaintext: "Empowers auto after ability", gold: { total: 700, base: 700, sell: 490 }, stats: {}, tags: ["Damage"], from: [], into: ["3078", "3100"], depth: 1, image: "3057" },
  { id: "3802", name: "Lost Chapter", description: "Provides ability power, mana, and restores mana on level up.", plaintext: "AP + Mana + Mana restore on level", gold: { total: 1300, base: 515, sell: 910 }, stats: { FlatMagicDamageMod: 40, FlatMPPoolMod: 300 }, tags: ["SpellDamage", "Mana"], from: ["1052", "1027"], into: ["6655", "3003"], depth: 2, image: "3802" },
  { id: "3024", name: "Glacial Buckler", description: "Provides armor, mana, and ability haste.", plaintext: "Armor + Mana + CDR", gold: { total: 900, base: 250, sell: 630 }, stats: { FlatArmorMod: 20, FlatMPPoolMod: 250 }, tags: ["Armor", "Mana", "CooldownReduction"], from: ["1029", "1027"], into: ["3110", "3119"], depth: 2, image: "3024" },
  { id: "3066", name: "Winged Moonplate", description: "Provides health and bonus movement speed.", plaintext: "Health and Move Speed", gold: { total: 800, base: 400, sell: 560 }, stats: { FlatHPPoolMod: 150 }, tags: ["Health", "NonbootsMovement"], from: ["1028"], into: ["3742", "3143"], depth: 2, image: "3066" },
  { id: "3916", name: "Oblivion Orb", description: "Provides AP and applies Grievous Wounds on magic damage.", plaintext: "AP with Grievous Wounds", gold: { total: 800, base: 365, sell: 560 }, stats: { FlatMagicDamageMod: 25 }, tags: ["SpellDamage", "GrievousWounds"], from: ["1052"], into: ["3165"], depth: 2, image: "3916" },
  { id: "3076", name: "Bramble Vest", description: "Reflects damage and applies Grievous Wounds to attackers.", plaintext: "Armor with anti-heal on hit", gold: { total: 800, base: 200, sell: 560 }, stats: { FlatArmorMod: 30 }, tags: ["Armor", "GrievousWounds"], from: ["1029", "1029"], into: ["3075"], depth: 2, image: "3076" },
  { id: "3114", name: "Forbidden Idol", description: "Provides mana regen and increases healing/shielding power.", plaintext: "Mana Regen + Heal/Shield Power", gold: { total: 800, base: 550, sell: 560 }, stats: {}, tags: ["ManaRegen"], from: [], into: ["3504", "3107"], depth: 2, image: "3114" },
  { id: "2015", name: "Kircheis Shard", description: "Stores energy on move and attack, dealing bonus magic damage.", plaintext: "Energized bonus damage", gold: { total: 700, base: 400, sell: 490 }, stats: { PercentAttackSpeedMod: 0.15 }, tags: ["AttackSpeed"], from: ["1042"], into: ["3094", "3095"], depth: 2, image: "2015" },
  { id: "3155", name: "Hexdrinker", description: "Provides AD and MR. Grants a magic damage shield at low health.", plaintext: "AD + MR + magic shield", gold: { total: 1300, base: 500, sell: 910 }, stats: { FlatPhysicalDamageMod: 20, FlatSpellBlockMod: 35 }, tags: ["Damage", "SpellBlock"], from: ["1036", "1033"], into: ["3156"], depth: 2, image: "3155" },
  { id: "3077", name: "Tiamat", description: "Provides AD and cleaves nearby enemies on hit.", plaintext: "AD with AoE cleave", gold: { total: 1200, base: 150, sell: 840 }, stats: { FlatPhysicalDamageMod: 25 }, tags: ["Damage"], from: ["1036", "1036"], into: ["3074", "3748"], depth: 2, image: "3077" },
  { id: "3101", name: "Stinger", description: "Provides attack speed and ability haste.", plaintext: "Attack Speed + CDR", gold: { total: 1100, base: 500, sell: 770 }, stats: { PercentAttackSpeedMod: 0.30 }, tags: ["AttackSpeed", "CooldownReduction"], from: ["1042", "1042"], into: ["3078", "3115"], depth: 2, image: "3101" },
  { id: "3145", name: "Hextech Alternator", description: "Provides AP and deals bonus magic damage on hit.", plaintext: "AP + bonus magic damage", gold: { total: 1050, base: 180, sell: 735 }, stats: { FlatMagicDamageMod: 40 }, tags: ["SpellDamage"], from: ["1052", "1052"], into: ["3152", "4636"], depth: 2, image: "3145" },
  { id: "3191", name: "Seeker's Armguard", description: "Provides AP and armor.", plaintext: "AP + Armor", gold: { total: 1000, base: 265, sell: 700 }, stats: { FlatMagicDamageMod: 20, FlatArmorMod: 15 }, tags: ["SpellDamage", "Armor"], from: ["1052", "1029"], into: ["3157"], depth: 2, image: "3191" },
  { id: "6029", name: "Ironspike Whip", description: "Active deals damage in a cone. Provides AD.", plaintext: "AD + AoE active", gold: { total: 1100, base: 400, sell: 770 }, stats: { FlatPhysicalDamageMod: 25 }, tags: ["Damage", "Active"], from: ["1036", "1036"], into: ["6630", "6631"], depth: 2, image: "6029" },
  { id: "4642", name: "Bandleglass Mirror", description: "Provides AP, ability haste, and mana regen.", plaintext: "AP + CDR + Mana Regen", gold: { total: 950, base: 265, sell: 665 }, stats: { FlatMagicDamageMod: 25 }, tags: ["SpellDamage", "CooldownReduction", "ManaRegen"], from: ["1052"], into: ["6617"], depth: 2, image: "4642" },
  { id: "3105", name: "Aegis of the Legion", description: "Provides armor, MR, and ability haste for tanks.", plaintext: "Armor + MR + Ability Haste", gold: { total: 1500, base: 400, sell: 1050 }, stats: { FlatArmorMod: 25, FlatSpellBlockMod: 25 }, tags: ["Armor", "SpellBlock"], from: ["1029", "1033"], into: ["3190"], depth: 2, image: "3105" },

  // ══════════════════════════════════ LEGENDARY ══════════════════════════════════
  // ── AD / Crit ──
  { id: "3031", name: "Infinity Edge", description: "Massively boosts the damage of critical strikes. If you have at least 60% crit chance, your crits deal bonus damage.", plaintext: "Massive crit damage increase", gold: { total: 3400, base: 625, sell: 2380 }, stats: { FlatPhysicalDamageMod: 70, FlatCritChanceMod: 0.25 }, tags: ["Damage", "CriticalStrike"], from: ["1037", "1018", "1036"], into: [], depth: 3, image: "3031" },
  { id: "3072", name: "Bloodthirster", description: "Provides massive AD and lifesteal. Overhealing creates a shield.", plaintext: "AD + Lifesteal + Overheal shield", gold: { total: 3400, base: 600, sell: 2380 }, stats: { FlatPhysicalDamageMod: 55 }, tags: ["Damage", "LifeSteal"], from: ["1038", "1053"], into: [], depth: 3, image: "3072" },
  { id: "3508", name: "Essence Reaver", description: "Provides AD, crit, and ability haste. Spellblade empowers autos.", plaintext: "AD + Crit + CDR + Spellblade", gold: { total: 2900, base: 400, sell: 2030 }, stats: { FlatPhysicalDamageMod: 45, FlatCritChanceMod: 0.25 }, tags: ["Damage", "CriticalStrike", "CooldownReduction"], from: ["3057", "1018", "1036"], into: [], depth: 3, image: "3508" },
  { id: "3094", name: "Rapid Firecannon", description: "Energized attacks gain extra range and deal bonus magic damage.", plaintext: "Energized + range + magic damage", gold: { total: 2500, base: 450, sell: 1750 }, stats: { PercentAttackSpeedMod: 0.30, FlatCritChanceMod: 0.25 }, tags: ["AttackSpeed", "CriticalStrike"], from: ["3086", "2015"], into: [], depth: 3, image: "3094" },
  { id: "3046", name: "Phantom Dancer", description: "Provides AS, crit, and movement speed. Stacking AS on attack.", plaintext: "AS + Crit + Move Speed on attack", gold: { total: 2600, base: 950, sell: 1820 }, stats: { PercentAttackSpeedMod: 0.30, FlatCritChanceMod: 0.20 }, tags: ["AttackSpeed", "CriticalStrike"], from: ["3086", "1042"], into: [], depth: 3, image: "3046" },
  { id: "3004", name: "Muramana", description: "Provides AD, mana, and ability haste. Abilities consume mana for bonus damage.", plaintext: "AD + Mana + CDR + on-hit mana burn", gold: { total: 2900, base: 1025, sell: 2030 }, stats: { FlatPhysicalDamageMod: 35, FlatMPPoolMod: 500 }, tags: ["Damage", "Mana", "CooldownReduction"], from: ["1037"], into: [], depth: 3, image: "3004" },
  { id: "3095", name: "Stormrazor", description: "Energized attacks slow and deal bonus damage.", plaintext: "AD + AS + Energized slow", gold: { total: 2700, base: 600, sell: 1890 }, stats: { FlatPhysicalDamageMod: 40, PercentAttackSpeedMod: 0.15 }, tags: ["Damage", "AttackSpeed", "Slow"], from: ["1036", "2015"], into: [], depth: 3, image: "3095" },
  { id: "6672", name: "Kraken Slayer", description: "Every third attack deals bonus true damage.", plaintext: "AD + AS + true damage on 3rd hit", gold: { total: 3100, base: 600, sell: 2170 }, stats: { FlatPhysicalDamageMod: 40, PercentAttackSpeedMod: 0.30 }, tags: ["Damage", "AttackSpeed", "OnHit"], from: ["1037", "1043"], into: [], depth: 3, image: "6672" },
  { id: "3156", name: "Maw of Malmortius", description: "Provides AD, MR, and ability haste. Lifeline shield vs magic damage.", plaintext: "AD + MR + CDR + magic shield", gold: { total: 2800, base: 600, sell: 1960 }, stats: { FlatPhysicalDamageMod: 55, FlatSpellBlockMod: 40 }, tags: ["Damage", "SpellBlock", "CooldownReduction"], from: ["3155", "3133"], into: [], depth: 3, image: "3156" },
  { id: "3071", name: "Black Cleaver", description: "Provides AD, health, and ability haste. Attacks reduce enemy armor.", plaintext: "AD + Health + CDR + armor shred", gold: { total: 3000, base: 600, sell: 2100 }, stats: { FlatPhysicalDamageMod: 40, FlatHPPoolMod: 350 }, tags: ["Damage", "Health", "CooldownReduction", "ArmorPenetration"], from: ["3133", "1028"], into: [], depth: 3, image: "3071" },
  { id: "3074", name: "Ravenous Hydra", description: "Provides AD, ability haste, and omnivamp. AoE cleave on hit.", plaintext: "AD + CDR + Omnivamp + cleave", gold: { total: 3300, base: 900, sell: 2310 }, stats: { FlatPhysicalDamageMod: 65 }, tags: ["Damage", "LifeSteal", "CooldownReduction"], from: ["3077", "1053"], into: [], depth: 3, image: "3074" },
  { id: "3748", name: "Titanic Hydra", description: "Provides AD, health, and AoE cleave that scales with max HP.", plaintext: "AD + Health + HP-scaling cleave", gold: { total: 3300, base: 600, sell: 2310 }, stats: { FlatPhysicalDamageMod: 30, FlatHPPoolMod: 500 }, tags: ["Damage", "Health"], from: ["3077", "1028"], into: [], depth: 3, image: "3748" },
  { id: "6333", name: "Death's Dance", description: "Stores damage taken and drains it over time. Heals on takedown.", plaintext: "AD + Armor + CDR + damage delay", gold: { total: 3100, base: 500, sell: 2170 }, stats: { FlatPhysicalDamageMod: 55, FlatArmorMod: 45 }, tags: ["Damage", "Armor", "CooldownReduction"], from: ["3133", "1031"], into: [], depth: 3, image: "6333" },
  { id: "3161", name: "Spear of Shojin", description: "Provides AD, health, and ability haste. Abilities deal bonus damage.", plaintext: "AD + Health + CDR + bonus ability damage", gold: { total: 3100, base: 500, sell: 2170 }, stats: { FlatPhysicalDamageMod: 55, FlatHPPoolMod: 300 }, tags: ["Damage", "Health", "CooldownReduction"], from: ["3133", "1028"], into: [], depth: 3, image: "3161" },
  { id: "3179", name: "Umbral Glaive", description: "Provides AD, lethality, and CDR. Reveals and one-shots wards.", plaintext: "AD + Lethality + ward control", gold: { total: 2300, base: 400, sell: 1610 }, stats: { FlatPhysicalDamageMod: 50 }, tags: ["Damage", "ArmorPenetration", "CooldownReduction", "Vision"], from: ["3134", "1036"], into: [], depth: 3, image: "3179" },
  { id: "6676", name: "The Collector", description: "Provides AD, crit, and lethality. Executes low HP targets.", plaintext: "AD + Crit + Lethality + execute", gold: { total: 3000, base: 500, sell: 2100 }, stats: { FlatPhysicalDamageMod: 50, FlatCritChanceMod: 0.25 }, tags: ["Damage", "CriticalStrike", "ArmorPenetration"], from: ["3134", "1018"], into: [], depth: 3, image: "6676" },
  { id: "3036", name: "Lord Dominik's Regards", description: "Provides AD, crit, and armor penetration.", plaintext: "AD + Crit + % armor pen", gold: { total: 3000, base: 600, sell: 2100 }, stats: { FlatPhysicalDamageMod: 35, FlatCritChanceMod: 0.25 }, tags: ["Damage", "CriticalStrike", "ArmorPenetration"], from: ["1037", "1018"], into: [], depth: 3, image: "3036" },
  { id: "3033", name: "Mortal Reminder", description: "Provides AD, crit, and applies Grievous Wounds.", plaintext: "AD + Crit + anti-healing", gold: { total: 2600, base: 400, sell: 1820 }, stats: { FlatPhysicalDamageMod: 25, FlatCritChanceMod: 0.25 }, tags: ["Damage", "CriticalStrike", "GrievousWounds"], from: ["1036", "1018"], into: [], depth: 3, image: "3033" },

  // ── On-hit / Attack Speed ──
  { id: "3153", name: "Blade of the Ruined King", description: "Deals current health damage on-hit and steals movement speed.", plaintext: "On-hit damage and movement speed steal", gold: { total: 3200, base: 700, sell: 2240 }, stats: { FlatPhysicalDamageMod: 40, PercentAttackSpeedMod: 0.25 }, tags: ["Damage", "AttackSpeed", "LifeSteal", "OnHit"], from: ["1043", "1036", "1053"], into: [], depth: 3, image: "3153" },
  { id: "3085", name: "Runaan's Hurricane", description: "Fires bolts at 2 nearby enemies on-hit. Provides crit and attack speed.", plaintext: "Multi-target on-hit AoE", gold: { total: 2600, base: 800, sell: 1820 }, stats: { FlatCritChanceMod: 0.25, PercentAttackSpeedMod: 0.40 }, tags: ["CriticalStrike", "AttackSpeed", "OnHit"], from: ["1043", "1018"], into: [], depth: 3, image: "3085" },
  { id: "3091", name: "Wit's End", description: "Provides AS, MR, and on-hit magic damage.", plaintext: "AS + MR + on-hit magic damage", gold: { total: 2800, base: 600, sell: 1960 }, stats: { PercentAttackSpeedMod: 0.40, FlatSpellBlockMod: 40 }, tags: ["AttackSpeed", "SpellBlock", "OnHit"], from: ["1043", "1033"], into: [], depth: 3, image: "3091" },
  { id: "3115", name: "Nashor's Tooth", description: "Provides AP, AS, and on-hit magic damage scaling with AP.", plaintext: "AP + AS + on-hit magic damage", gold: { total: 3000, base: 450, sell: 2100 }, stats: { FlatMagicDamageMod: 100, PercentAttackSpeedMod: 0.50 }, tags: ["SpellDamage", "AttackSpeed", "OnHit"], from: ["3101", "1026"], into: [], depth: 3, image: "3115" },
  { id: "3124", name: "Guinsoo's Rageblade", description: "Converts crit chance to on-hit damage. Every 3rd hit procs on-hit twice.", plaintext: "Crit → on-hit conversion", gold: { total: 2600, base: 600, sell: 1820 }, stats: { PercentAttackSpeedMod: 0.25 }, tags: ["AttackSpeed", "OnHit", "CriticalStrike"], from: ["1043", "1018"], into: [], depth: 3, image: "3124" },

  // ── Bruiser / Fighter ──
  { id: "3078", name: "Trinity Force", description: "Grants a variety of stats and empowers auto-attacks after using abilities.", plaintext: "The ultimate multi-stat item", gold: { total: 3333, base: 333, sell: 2333 }, stats: { FlatPhysicalDamageMod: 35, FlatHPPoolMod: 300, PercentAttackSpeedMod: 0.30 }, tags: ["Damage", "Health", "AttackSpeed", "CooldownReduction", "NonbootsMovement"], from: ["3044", "3101"], into: [], depth: 3, image: "3078" },
  { id: "6631", name: "Stridebreaker", description: "Provides AD, health, AS, and a movement slow active.", plaintext: "AD + Health + AS + slow active", gold: { total: 3200, base: 300, sell: 2240 }, stats: { FlatPhysicalDamageMod: 45, FlatHPPoolMod: 400, PercentAttackSpeedMod: 0.20 }, tags: ["Damage", "Health", "AttackSpeed", "Slow"], from: ["3044", "6029"], into: [], depth: 3, image: "6631" },
  { id: "6630", name: "Goredrinker", description: "Provides AD, health, CDR. Active heals based on missing HP.", plaintext: "AD + Health + CDR + AoE heal active", gold: { total: 3200, base: 400, sell: 2240 }, stats: { FlatPhysicalDamageMod: 45, FlatHPPoolMod: 450 }, tags: ["Damage", "Health", "CooldownReduction", "Active", "LifeSteal"], from: ["6029", "3067"], into: [], depth: 3, image: "6630" },
  { id: "3026", name: "Guardian Angel", description: "Provides AD, armor, and revives you upon death.", plaintext: "AD + Armor + Revive", gold: { total: 3200, base: 600, sell: 2240 }, stats: { FlatPhysicalDamageMod: 55, FlatArmorMod: 45 }, tags: ["Damage", "Armor"], from: ["1038", "1029"], into: [], depth: 3, image: "3026" },
  { id: "3742", name: "Dead Man's Plate", description: "Provides health, armor, and bonus move speed building on move.", plaintext: "Health + Armor + Move Speed", gold: { total: 2900, base: 800, sell: 2030 }, stats: { FlatHPPoolMod: 300, FlatArmorMod: 45 }, tags: ["Health", "Armor", "NonbootsMovement"], from: ["3066", "1031"], into: [], depth: 3, image: "3742" },

  // ── Lethality / Assassin ──
  { id: "6694", name: "Serylda's Grudge", description: "Provides AD, ability haste, and armor penetration with a slow on abilities.", plaintext: "AD + armor pen + slow", gold: { total: 3200, base: 700, sell: 2240 }, stats: { FlatPhysicalDamageMod: 45 }, tags: ["Damage", "ArmorPenetration", "CooldownReduction", "Slow"], from: ["3134", "3133"], into: [], depth: 3, image: "6694" },
  { id: "6693", name: "Prowler's Claw", description: "Provides AD, lethality, and a dash active to gap close to targets.", plaintext: "AD + Lethality + dash", gold: { total: 2800, base: 600, sell: 1960 }, stats: { FlatPhysicalDamageMod: 55 }, tags: ["Damage", "ArmorPenetration", "Active"], from: ["3134", "3133"], into: [], depth: 3, image: "6693" },
  { id: "3814", name: "Edge of Night", description: "Provides AD, health, lethality, and a spell shield passive.", plaintext: "AD + Lethality + Spell Shield", gold: { total: 2800, base: 500, sell: 1960 }, stats: { FlatPhysicalDamageMod: 50, FlatHPPoolMod: 250 }, tags: ["Damage", "Health", "ArmorPenetration", "SpellBlock"], from: ["3134", "1028"], into: [], depth: 3, image: "3814" },
  { id: "6701", name: "Opportunity", description: "Provides AD and lethality. Bonus movement speed out of combat.", plaintext: "AD + Lethality + out-of-combat MS", gold: { total: 2700, base: 800, sell: 1890 }, stats: { FlatPhysicalDamageMod: 55 }, tags: ["Damage", "ArmorPenetration", "NonbootsMovement"], from: ["3134", "1036"], into: [], depth: 3, image: "6701" },
  { id: "6697", name: "Hubris", description: "Provides AD and lethality. Grants bonus AD on champion takedowns.", plaintext: "AD + Lethality + snowball AD", gold: { total: 2600, base: 500, sell: 1820 }, stats: { FlatPhysicalDamageMod: 50 }, tags: ["Damage", "ArmorPenetration", "CooldownReduction"], from: ["3134", "1036"], into: [], depth: 3, image: "6697" },
  { id: "6698", name: "Voltaic Cyclosword", description: "Provides AD and lethality. Energized attacks slow.", plaintext: "AD + Lethality + energized slow", gold: { total: 2800, base: 700, sell: 1960 }, stats: { FlatPhysicalDamageMod: 50 }, tags: ["Damage", "ArmorPenetration", "Slow"], from: ["3134", "1036"], into: [], depth: 3, image: "6698" },

  // ── AP ──
  { id: "6655", name: "Luden's Companion", description: "Provides AP, mana, and a powerful echo passive that deals bonus damage.", plaintext: "Burst AP item with mana", gold: { total: 2900, base: 850, sell: 2030 }, stats: { FlatMagicDamageMod: 90, FlatMPPoolMod: 600 }, tags: ["SpellDamage", "Mana"], from: ["3108", "3802"], into: [], depth: 3, image: "6655" },
  { id: "3089", name: "Rabadon's Deathcap", description: "Massively increases ability power. Unique passive: increases total AP by 35%.", plaintext: "Massive AP amplification", gold: { total: 3600, base: 1100, sell: 2520 }, stats: { FlatMagicDamageMod: 120 }, tags: ["SpellDamage"], from: ["1058", "1026"], into: [], depth: 3, image: "3089" },
  { id: "3157", name: "Zhonya's Hourglass", description: "Provides AP, armor, and CDR. Active: become invulnerable for 2.5s.", plaintext: "AP + Armor + CDR + stasis active", gold: { total: 2600, base: 350, sell: 1820 }, stats: { FlatMagicDamageMod: 80, FlatArmorMod: 45 }, tags: ["SpellDamage", "Armor", "CooldownReduction", "Active"], from: ["3191", "3108"], into: [], depth: 3, image: "3157" },
  { id: "3165", name: "Morellonomicon", description: "Provides AP and applies Grievous Wounds on magic damage.", plaintext: "AP with anti-healing", gold: { total: 2200, base: 550, sell: 1540 }, stats: { FlatMagicDamageMod: 70, FlatHPPoolMod: 200 }, tags: ["SpellDamage", "Health", "GrievousWounds"], from: ["3108", "3916"], into: [], depth: 3, image: "3165" },
  { id: "3116", name: "Rylai's Crystal Scepter", description: "Provides AP and health. Abilities slow enemies.", plaintext: "AP + Health + slow on abilities", gold: { total: 2600, base: 750, sell: 1820 }, stats: { FlatMagicDamageMod: 75, FlatHPPoolMod: 350 }, tags: ["SpellDamage", "Health", "Slow"], from: ["1026", "1028"], into: [], depth: 3, image: "3116" },
  { id: "3100", name: "Lich Bane", description: "Provides AP and empowers the next auto-attack after using an ability.", plaintext: "AP + empowered auto after ability", gold: { total: 3000, base: 750, sell: 2100 }, stats: { FlatMagicDamageMod: 100 }, tags: ["SpellDamage", "NonbootsMovement"], from: ["3113", "3057"], into: [], depth: 3, image: "3100" },
  { id: "3151", name: "Liandry's Torment", description: "Provides AP, health, and burns enemies for max HP damage over time.", plaintext: "AP + Health + burn damage", gold: { total: 3000, base: 750, sell: 2100 }, stats: { FlatMagicDamageMod: 70, FlatHPPoolMod: 300 }, tags: ["SpellDamage", "Health"], from: ["1026", "1028"], into: [], depth: 3, image: "3151" },
  { id: "3041", name: "Mejai's Soulstealer", description: "Grows in power with kills and assists, but loses stacks on death.", plaintext: "Snowball AP with risk", gold: { total: 1600, base: 1250, sell: 1120 }, stats: { FlatMagicDamageMod: 20 }, tags: ["SpellDamage"], from: ["1082"], into: [], depth: 2, image: "3041" },
  { id: "3003", name: "Archangel's Staff", description: "Provides AP, mana, and CDR. Transforms into Seraph's Embrace when stacked.", plaintext: "AP + Mana + CDR, transforms when stacked", gold: { total: 2600, base: 550, sell: 1820 }, stats: { FlatMagicDamageMod: 60, FlatMPPoolMod: 500 }, tags: ["SpellDamage", "Mana", "CooldownReduction"], from: ["3802"], into: [], depth: 3, image: "3003" },
  { id: "4645", name: "Shadowflame", description: "Provides AP. Deals bonus damage based on target's missing health.", plaintext: "AP + bonus damage on low HP targets", gold: { total: 2800, base: 700, sell: 1960 }, stats: { FlatMagicDamageMod: 100 }, tags: ["SpellDamage"], from: ["1058", "1052"], into: [], depth: 3, image: "4645" },
  { id: "3152", name: "Hextech Rocketbelt", description: "Provides AP, health, and CDR. Active: dash forward firing magic bolts.", plaintext: "AP + Health + CDR + dash active", gold: { total: 2600, base: 650, sell: 1820 }, stats: { FlatMagicDamageMod: 60, FlatHPPoolMod: 250 }, tags: ["SpellDamage", "Health", "CooldownReduction", "Active"], from: ["3145", "1028"], into: [], depth: 3, image: "3152" },
  { id: "4636", name: "Night Harvester", description: "Provides AP, health, and CDR. Damaging champions deals bonus burst damage.", plaintext: "AP + Health + CDR + burst on champions", gold: { total: 2800, base: 700, sell: 1960 }, stats: { FlatMagicDamageMod: 80, FlatHPPoolMod: 200 }, tags: ["SpellDamage", "Health", "CooldownReduction"], from: ["3145", "1028"], into: [], depth: 3, image: "4636" },
  { id: "3118", name: "Malignance", description: "Provides AP, mana, and CDR. Enhances ultimate ability.", plaintext: "AP + Mana + CDR + ult enhancement", gold: { total: 2700, base: 600, sell: 1890 }, stats: { FlatMagicDamageMod: 80, FlatMPPoolMod: 600 }, tags: ["SpellDamage", "Mana", "CooldownReduction"], from: ["3802"], into: [], depth: 3, image: "3118" },
  { id: "3102", name: "Banshee's Veil", description: "Provides AP, MR, and CDR. Grants a spell shield that blocks one ability.", plaintext: "AP + MR + CDR + spell shield", gold: { total: 2500, base: 400, sell: 1750 }, stats: { FlatMagicDamageMod: 80, FlatSpellBlockMod: 45 }, tags: ["SpellDamage", "SpellBlock", "CooldownReduction"], from: ["1057", "1052"], into: [], depth: 3, image: "3102" },
  { id: "3135", name: "Void Staff", description: "Provides AP and magic penetration percentage.", plaintext: "AP + % magic penetration", gold: { total: 2700, base: 850, sell: 1890 }, stats: { FlatMagicDamageMod: 65 }, tags: ["SpellDamage"], from: ["1026", "1052"], into: [], depth: 3, image: "3135" },
  { id: "3011", name: "Chemtech Putrifier", description: "Provides AP and ability haste. Heals and shields apply Grievous Wounds.", plaintext: "AP + CDR + ally-applied anti-heal", gold: { total: 2300, base: 500, sell: 1610 }, stats: { FlatMagicDamageMod: 50 }, tags: ["SpellDamage", "CooldownReduction", "GrievousWounds"], from: ["3108"], into: [], depth: 3, image: "3011" },
  { id: "6617", name: "Imperial Mandate", description: "Provides AP, health, and CDR. Marks enemies for allies to detonate.", plaintext: "AP + Health + CDR + ally coordination", gold: { total: 2300, base: 450, sell: 1610 }, stats: { FlatMagicDamageMod: 40, FlatHPPoolMod: 200 }, tags: ["SpellDamage", "Health", "CooldownReduction"], from: ["4642", "1028"], into: [], depth: 3, image: "6617" },
  { id: "3119", name: "Winter's Approach", description: "Provides health, mana, and CDR. Transforms into Fimbulwinter.", plaintext: "Health + Mana + CDR, transforms", gold: { total: 2600, base: 500, sell: 1820 }, stats: { FlatHPPoolMod: 350, FlatMPPoolMod: 500 }, tags: ["Health", "Mana", "CooldownReduction"], from: ["3024", "1028"], into: [], depth: 3, image: "3119" },
  { id: "4628", name: "Horizon Focus", description: "Provides AP. Reveals and deals bonus damage to distant targets.", plaintext: "AP + reveal + bonus damage at range", gold: { total: 2700, base: 700, sell: 1890 }, stats: { FlatMagicDamageMod: 85 }, tags: ["SpellDamage"], from: ["1058", "1052"], into: [], depth: 3, image: "4628" },
  { id: "3907", name: "Staff of Flowing Water", description: "Provides AP and heals/shields give allies bonus AP and ability haste.", plaintext: "AP + ally empowerment on heal/shield", gold: { total: 2300, base: 450, sell: 1610 }, stats: { FlatMagicDamageMod: 50 }, tags: ["SpellDamage", "ManaRegen"], from: ["3114", "1052"], into: [], depth: 3, image: "3907" },
  { id: "3504", name: "Ardent Censer", description: "Provides AP and gives allies bonus attack speed when healed/shielded.", plaintext: "Heals/shields empower allies' autos", gold: { total: 2300, base: 600, sell: 1610 }, stats: { FlatMagicDamageMod: 50 }, tags: ["SpellDamage", "ManaRegen", "AttackSpeed"], from: ["3113", "3114"], into: [], depth: 3, image: "3504" },
  { id: "3107", name: "Redemption", description: "Active: heals allies and damages enemies in a large area after delay.", plaintext: "AoE heal/damage active", gold: { total: 2300, base: 600, sell: 1610 }, stats: { FlatHPPoolMod: 200 }, tags: ["Health", "ManaRegen", "Active"], from: ["3114", "1028"], into: [], depth: 3, image: "3107" },
  { id: "3222", name: "Mikael's Blessing", description: "Active: cleanses a targeted ally of all CC. Provides heal/shield power.", plaintext: "Ally cleanse + Heal/Shield power", gold: { total: 2300, base: 700, sell: 1610 }, stats: { FlatSpellBlockMod: 30 }, tags: ["SpellBlock", "ManaRegen", "Active"], from: ["3114", "1033"], into: [], depth: 3, image: "3222" },

  // ── Tank / Armor ──
  { id: "3143", name: "Randuin's Omen", description: "Provides armor, health, and reduces damage from critical strikes.", plaintext: "Armor + anti-crit defense", gold: { total: 2700, base: 600, sell: 1890 }, stats: { FlatArmorMod: 60, FlatHPPoolMod: 400 }, tags: ["Armor", "Health", "Active", "Slow"], from: ["3082", "1028"], into: [], depth: 3, image: "3143" },
  { id: "3075", name: "Thornmail", description: "Provides armor, health, and reflects damage. Applies Grievous Wounds.", plaintext: "Armor + Health + reflect + anti-heal", gold: { total: 2450, base: 350, sell: 1715 }, stats: { FlatArmorMod: 60, FlatHPPoolMod: 350 }, tags: ["Armor", "Health", "GrievousWounds"], from: ["3076", "1028"], into: [], depth: 3, image: "3075" },
  { id: "3068", name: "Sunfire Aegis", description: "Provides health, armor, MR. Burns nearby enemies with Immolate.", plaintext: "Health + Armor + MR + burn aura", gold: { total: 2700, base: 600, sell: 1890 }, stats: { FlatHPPoolMod: 350, FlatArmorMod: 35, FlatSpellBlockMod: 35 }, tags: ["Health", "Armor", "SpellBlock"], from: ["1031", "1033"], into: [], depth: 3, image: "3068" },
  { id: "6665", name: "Jak'Sho, The Protean", description: "Provides health, armor, MR. Stacks resistances in combat.", plaintext: "Health + Armor + MR + stacking defense", gold: { total: 2900, base: 700, sell: 2030 }, stats: { FlatHPPoolMod: 300, FlatArmorMod: 30, FlatSpellBlockMod: 30 }, tags: ["Health", "Armor", "SpellBlock"], from: ["1031", "1033"], into: [], depth: 3, image: "6665" },
  { id: "3110", name: "Frozen Heart", description: "Provides armor, mana, and reduces nearby enemies' attack speed.", plaintext: "Armor + mana + AS slow aura", gold: { total: 2400, base: 500, sell: 1680 }, stats: { FlatArmorMod: 65, FlatMPPoolMod: 400 }, tags: ["Armor", "Mana", "CooldownReduction", "Aura"], from: ["3082", "3024"], into: [], depth: 3, image: "3110" },
  { id: "3001", name: "Abyssal Mask", description: "Provides health and MR. Immobilizing enemies increases magic damage they take.", plaintext: "Health + MR + magic damage amp on CC", gold: { total: 2300, base: 500, sell: 1610 }, stats: { FlatHPPoolMod: 300, FlatSpellBlockMod: 30 }, tags: ["Health", "SpellBlock", "CooldownReduction"], from: ["1028", "1033"], into: [], depth: 3, image: "3001" },
  { id: "6664", name: "Hollow Radiance", description: "Provides health, armor, MR, and waveclear aura.", plaintext: "Health + Armor + MR + waveclear", gold: { total: 2800, base: 600, sell: 1960 }, stats: { FlatHPPoolMod: 350, FlatArmorMod: 30, FlatSpellBlockMod: 30 }, tags: ["Health", "Armor", "SpellBlock"], from: ["1031", "1033"], into: [], depth: 3, image: "6664" },
  { id: "2502", name: "Unending Despair", description: "Provides health, armor, and drains nearby enemies to heal you.", plaintext: "Health + Armor + drain aura", gold: { total: 2800, base: 600, sell: 1960 }, stats: { FlatHPPoolMod: 400, FlatArmorMod: 50 }, tags: ["Health", "Armor", "LifeSteal"], from: ["1031", "1028"], into: [], depth: 3, image: "2502" },
  { id: "3109", name: "Knight's Vow", description: "Binds to an ally, sharing damage taken and healing from their damage.", plaintext: "Health + CDR + ally damage share", gold: { total: 2300, base: 400, sell: 1610 }, stats: { FlatHPPoolMod: 350 }, tags: ["Health", "CooldownReduction"], from: ["3067", "1028"], into: [], depth: 3, image: "3109" },

  // ── Tank / MR ──
  { id: "3065", name: "Spirit Visage", description: "Increases all healing and shielding received. Provides health and MR.", plaintext: "Amplified healing and MR", gold: { total: 2900, base: 550, sell: 2030 }, stats: { FlatSpellBlockMod: 50, FlatHPPoolMod: 450 }, tags: ["SpellBlock", "Health", "HealthRegen", "CooldownReduction"], from: ["3211", "3067"], into: [], depth: 3, image: "3065" },
  { id: "3194", name: "Force of Nature", description: "Provides massive magic resist stacking and movement speed.", plaintext: "Stacking MR + move speed", gold: { total: 2900, base: 600, sell: 2030 }, stats: { FlatSpellBlockMod: 60, FlatHPPoolMod: 350 }, tags: ["SpellBlock", "Health", "NonbootsMovement"], from: ["3211", "1057"], into: [], depth: 3, image: "3194" },
  { id: "4401", name: "Kaenic Rookern", description: "Provides health and MR. Grants a magic damage shield after avoiding damage.", plaintext: "Health + MR + magic shield", gold: { total: 2900, base: 600, sell: 2030 }, stats: { FlatHPPoolMod: 400, FlatSpellBlockMod: 80 }, tags: ["Health", "SpellBlock"], from: ["1057", "1028"], into: [], depth: 3, image: "4401" },

  // ── Support / Utility ──
  { id: "3190", name: "Locket of the Iron Solari", description: "Grants a shield to all nearby allies when activated.", plaintext: "AoE team shield", gold: { total: 2300, base: 500, sell: 1610 }, stats: { FlatArmorMod: 30, FlatSpellBlockMod: 30 }, tags: ["Armor", "SpellBlock", "Active", "Aura"], from: ["3067", "1029"], into: [], depth: 3, image: "3190" },
  { id: "3002", name: "Trailblazer", description: "Provides health and armor. Grants nearby allies bonus movement speed.", plaintext: "Health + Armor + ally move speed aura", gold: { total: 2500, base: 500, sell: 1750 }, stats: { FlatHPPoolMod: 250, FlatArmorMod: 40 }, tags: ["Health", "Armor", "NonbootsMovement", "Aura"], from: ["3066", "1029"], into: [], depth: 3, image: "3002" },
  { id: "3050", name: "Zeke's Convergence", description: "Binds to an ally. Provides bonus damage when you immobilize enemies.", plaintext: "Health + Armor + MR + ally empowerment", gold: { total: 2200, base: 400, sell: 1540 }, stats: { FlatHPPoolMod: 250, FlatArmorMod: 25, FlatSpellBlockMod: 25 }, tags: ["Health", "Armor", "SpellBlock", "CooldownReduction"], from: ["1029", "1033"], into: [], depth: 3, image: "3050" },

  // ── Season 14+ / Additional Legendaries ──
  { id: "3084", name: "Heartsteel", description: "Provides health. Attacks on champions charge a stacking max HP bonus.", plaintext: "Health + infinite HP stacking", gold: { total: 3000, base: 600, sell: 2100 }, stats: { FlatHPPoolMod: 800 }, tags: ["Health"], from: ["1028", "1028"], into: [], depth: 3, image: "3084" },
  { id: "6662", name: "Iceborn Gauntlet", description: "Provides armor, health, ability haste, and Spellblade with slow zone.", plaintext: "Armor + Health + CDR + Spellblade slow", gold: { total: 2600, base: 500, sell: 1820 }, stats: { FlatHPPoolMod: 300, FlatArmorMod: 50 }, tags: ["Armor", "Health", "CooldownReduction", "Slow"], from: ["3057", "3024"], into: [], depth: 3, image: "6662" },
  { id: "6696", name: "Axiom Arc", description: "Provides AD, lethality, and CDR. Reduces ultimate CD on takedowns.", plaintext: "AD + Lethality + CDR + ult reset", gold: { total: 2800, base: 600, sell: 1960 }, stats: { FlatPhysicalDamageMod: 55 }, tags: ["Damage", "ArmorPenetration", "CooldownReduction"], from: ["3134", "3133"], into: [], depth: 3, image: "6696" },
  { id: "4646", name: "Stormsurge", description: "Provides AP, movement speed, and magic pen. Burst triggers bonus damage.", plaintext: "AP + Move Speed + MPen + burst", gold: { total: 2900, base: 700, sell: 2030 }, stats: { FlatMagicDamageMod: 90 }, tags: ["SpellDamage", "NonbootsMovement"], from: ["3113", "1026"], into: [], depth: 3, image: "4646" },
  { id: "4629", name: "Cosmic Drive", description: "Provides AP, health, and CDR. Damaging abilities grant bonus move speed.", plaintext: "AP + Health + CDR + move speed", gold: { total: 2900, base: 650, sell: 2030 }, stats: { FlatMagicDamageMod: 80, FlatHPPoolMod: 200 }, tags: ["SpellDamage", "Health", "CooldownReduction", "NonbootsMovement"], from: ["1026", "3067"], into: [], depth: 3, image: "4629" },
  { id: "6657", name: "Rod of Ages", description: "Provides AP, health, and mana. Stats grow over time up to 10 minutes.", plaintext: "AP + Health + Mana, scaling over time", gold: { total: 2600, base: 415, sell: 1820 }, stats: { FlatMagicDamageMod: 60, FlatHPPoolMod: 300, FlatMPPoolMod: 400 }, tags: ["SpellDamage", "Health", "Mana"], from: ["3802", "1028"], into: [], depth: 3, image: "6657" },
  { id: "6620", name: "Echoes of Helia", description: "Provides AP and CDR. Heals/shields charge Echoes that heal allies and damage enemies.", plaintext: "AP + CDR + heal/shield enhancement", gold: { total: 2300, base: 450, sell: 1610 }, stats: { FlatMagicDamageMod: 40 }, tags: ["SpellDamage", "CooldownReduction", "ManaRegen"], from: ["3108", "3114"], into: [], depth: 3, image: "6620" },
  { id: "6699", name: "Profane Hydra", description: "Provides AD, lethality, and CDR. Active deals AoE damage.", plaintext: "AD + Lethality + CDR + AoE active", gold: { total: 3300, base: 800, sell: 2310 }, stats: { FlatPhysicalDamageMod: 60 }, tags: ["Damage", "ArmorPenetration", "CooldownReduction"], from: ["3077", "3134"], into: [], depth: 3, image: "6699" },
  { id: "6616", name: "Bloodsong", description: "Support item. Damaging abilities mark enemies for bonus damage from allies.", plaintext: "Support + ally damage coordination", gold: { total: 2300, base: 450, sell: 1610 }, stats: { FlatMagicDamageMod: 40 }, tags: ["SpellDamage", "CooldownReduction"], from: ["4642", "1028"], into: [], depth: 3, image: "6616" },
  { id: "6621", name: "Dream Maker", description: "Support item. Heals/shields give allies bonus damage and damage reduction.", plaintext: "Support + ally buff on heal/shield", gold: { total: 2300, base: 450, sell: 1610 }, stats: { FlatHPPoolMod: 200 }, tags: ["Health", "ManaRegen"], from: ["3114", "1028"], into: [], depth: 3, image: "6621" },
  { id: "6622", name: "Zaz'Zak's Realmspike", description: "Provides AP and CDR. Abilities create a damaging void rift.", plaintext: "AP + CDR + void explosion", gold: { total: 2300, base: 450, sell: 1610 }, stats: { FlatMagicDamageMod: 50 }, tags: ["SpellDamage", "CooldownReduction"], from: ["3108", "1028"], into: [], depth: 3, image: "6622" },
  { id: "6695", name: "Serpent's Fang", description: "Provides AD and lethality. Dealing damage reduces enemy shields.", plaintext: "AD + Lethality + anti-shield", gold: { total: 2500, base: 400, sell: 1750 }, stats: { FlatPhysicalDamageMod: 55 }, tags: ["Damage", "ArmorPenetration"], from: ["3134", "1036"], into: [], depth: 3, image: "6695" },
  { id: "6675", name: "Navori Flickerblade", description: "Provides AD, crit, and AS. Crits reduce ability CDs.", plaintext: "AD + Crit + AS + ability CD on crit", gold: { total: 3400, base: 600, sell: 2380 }, stats: { FlatPhysicalDamageMod: 60, FlatCritChanceMod: 0.25 }, tags: ["Damage", "CriticalStrike", "CooldownReduction"], from: ["1037", "1018", "1042"], into: [], depth: 3, image: "6675" },
  { id: "3087", name: "Statikk Shiv", description: "Provides AS and crit. Energized attacks chain lightning to nearby enemies.", plaintext: "AS + Crit + chain lightning", gold: { total: 2600, base: 600, sell: 1820 }, stats: { PercentAttackSpeedMod: 0.30, FlatCritChanceMod: 0.25 }, tags: ["AttackSpeed", "CriticalStrike"], from: ["3086", "2015"], into: [], depth: 3, image: "3087" },
  { id: "6673", name: "Immortal Shieldbow", description: "Provides AD, crit, and lifesteal. Grants a shield at low HP.", plaintext: "AD + Crit + Lifesteal + Lifeline shield", gold: { total: 3200, base: 500, sell: 2240 }, stats: { FlatPhysicalDamageMod: 50, FlatCritChanceMod: 0.25 }, tags: ["Damage", "CriticalStrike", "LifeSteal"], from: ["1038", "1018"], into: [], depth: 3, image: "6673" },
  { id: "6610", name: "Sundered Sky", description: "Provides AD, health, and CDR. First hit on champions heals.", plaintext: "AD + Health + CDR + healing on 1st hit", gold: { total: 3100, base: 500, sell: 2170 }, stats: { FlatPhysicalDamageMod: 45, FlatHPPoolMod: 350 }, tags: ["Damage", "Health", "CooldownReduction", "LifeSteal"], from: ["3044", "3133"], into: [], depth: 3, image: "6610" },
  { id: "6670", name: "Yun Tal Wildarrows", description: "Provides AD and crit. Auto attacks apply bonus damage over time.", plaintext: "AD + Crit + bleed DoT", gold: { total: 2850, base: 500, sell: 1995 }, stats: { FlatPhysicalDamageMod: 50, FlatCritChanceMod: 0.25 }, tags: ["Damage", "CriticalStrike"], from: ["1037", "1018"], into: [], depth: 3, image: "6670" },
  { id: "6609", name: "Overlord's Bloodmail", description: "Provides AD and massive health. Bonus AD based on max HP.", plaintext: "AD + Health + AD from max HP", gold: { total: 3300, base: 500, sell: 2310 }, stats: { FlatPhysicalDamageMod: 40, FlatHPPoolMod: 500 }, tags: ["Damage", "Health"], from: ["1028", "1038"], into: [], depth: 3, image: "6609" },
  { id: "3121", name: "Terminus", description: "Provides AD and AS. Alternates between bonus armor/MR and magic damage.", plaintext: "AD + AS + alternating resist/damage", gold: { total: 3000, base: 600, sell: 2100 }, stats: { FlatPhysicalDamageMod: 30, PercentAttackSpeedMod: 0.30 }, tags: ["Damage", "AttackSpeed", "Armor", "SpellBlock"], from: ["1043", "1037"], into: [], depth: 3, image: "3121" },
  { id: "6611", name: "Cryptbloom", description: "Provides AP and CDR. Takedowns create healing zones for allies.", plaintext: "AP + CDR + healing zone on kill", gold: { total: 2600, base: 500, sell: 1820 }, stats: { FlatMagicDamageMod: 70 }, tags: ["SpellDamage", "CooldownReduction"], from: ["3108", "1033"], into: [], depth: 3, image: "6611" },
  { id: "4633", name: "Riftmaker", description: "Provides AP, health, and omnivamp. Deals increasing damage over time.", plaintext: "AP + Health + Omnivamp + ramping", gold: { total: 3000, base: 650, sell: 2100 }, stats: { FlatMagicDamageMod: 70, FlatHPPoolMod: 350 }, tags: ["SpellDamage", "Health", "LifeSteal"], from: ["1026", "1028"], into: [], depth: 3, image: "4633" },
  { id: "6612", name: "Blackfire Torch", description: "Provides AP, mana, and CDR. Damaging abilities burn enemies.", plaintext: "AP + Mana + CDR + burn on ability", gold: { total: 2800, base: 700, sell: 1960 }, stats: { FlatMagicDamageMod: 80, FlatMPPoolMod: 600 }, tags: ["SpellDamage", "Mana", "CooldownReduction"], from: ["3802"], into: [], depth: 3, image: "6612" },
  { id: "6667", name: "Experimental Hexplate", description: "Provides AD, health, and AS. Using ult grants burst of AS and MS.", plaintext: "AD + Health + AS + ult empowerment", gold: { total: 2800, base: 600, sell: 1960 }, stats: { FlatPhysicalDamageMod: 40, FlatHPPoolMod: 300, PercentAttackSpeedMod: 0.25 }, tags: ["Damage", "Health", "AttackSpeed"], from: ["1037", "1028"], into: [], depth: 3, image: "6667" },
  { id: "3181", name: "Hullbreaker", description: "Provides AD and health. Enhanced siege damage and defense when alone.", plaintext: "AD + Health + split push power", gold: { total: 2800, base: 600, sell: 1960 }, stats: { FlatPhysicalDamageMod: 50, FlatHPPoolMod: 400 }, tags: ["Damage", "Health"], from: ["1037", "1028"], into: [], depth: 3, image: "3181" },
  { id: "4644", name: "Crown of the Shattered Queen", description: "Provides AP, health, mana, CDR. Safeguard reduces burst damage taken.", plaintext: "AP + Health + Mana + CDR + anti-burst", gold: { total: 2800, base: 600, sell: 1960 }, stats: { FlatMagicDamageMod: 80, FlatHPPoolMod: 250, FlatMPPoolMod: 600 }, tags: ["SpellDamage", "Health", "Mana", "CooldownReduction"], from: ["3802", "1028"], into: [], depth: 3, image: "4644" },

  // ── CONSUMABLE ──
  { id: "2031", name: "Refillable Potion", description: "A potion that refills on recall. Holds 2 charges.", plaintext: "Reusable healing potion", gold: { total: 150, base: 150, sell: 60 }, stats: {}, tags: ["Consumable", "Health"], from: [], into: ["2033"], depth: 1, image: "2031" },
  { id: "2033", name: "Corrupting Potion", description: "An upgraded potion with 3 charges that heals and deals damage on hit.", plaintext: "Reusable sustain + damage", gold: { total: 500, base: 350, sell: 200 }, stats: {}, tags: ["Consumable", "Health", "Mana"], from: ["2031"], into: [], depth: 2, image: "2033" },
  { id: "2055", name: "Control Ward", description: "A ward that reveals and disables nearby enemy wards.", plaintext: "Vision denial", gold: { total: 75, base: 75, sell: 30 }, stats: {}, tags: ["Consumable", "Vision"], from: [], into: [], depth: 1, image: "2055" },
  { id: "2138", name: "Elixir of Iron", description: "Increases health, tenacity, and size for 3 minutes.", plaintext: "Temporary tank buffs", gold: { total: 500, base: 500, sell: 200 }, stats: {}, tags: ["Consumable", "Health", "Tenacity"], from: [], into: [], depth: 1, image: "2138" },
  { id: "2139", name: "Elixir of Sorcery", description: "Increases AP and mana regen for 3 minutes.", plaintext: "Temporary AP buffs", gold: { total: 500, base: 500, sell: 200 }, stats: {}, tags: ["Consumable", "SpellDamage"], from: [], into: [], depth: 1, image: "2139" },
  { id: "2140", name: "Elixir of Wrath", description: "Increases AD and grants physical vamp for 3 minutes.", plaintext: "Temporary AD buffs", gold: { total: 500, base: 500, sell: 200 }, stats: {}, tags: ["Consumable", "Damage", "LifeSteal"], from: [], into: [], depth: 1, image: "2140" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getItemCategory(item: ItemData): ItemCategory {
  if (item.tags.includes("Consumable") || item.id === "2055" || item.id === "2138" || item.id === "2139" || item.id === "2140") return "consumable";
  if (item.tags.includes("Boots")) return "boots";
  if (item.tags.includes("Lane") || item.tags.includes("Trinket") || item.tags.includes("Jungle") || (item.depth === 1 && item.gold.total <= 500)) return "starter";
  if (item.depth === 1 && !item.into?.length) return "basic";
  if (item.depth === 1) return "basic";
  if (item.depth === 2) return "epic";
  if (item.depth === 3 || item.gold.total >= 2500) return "legendary";
  return "basic";
}

function matchesStatFilter(item: ItemData, filter: StatFilter): boolean {
  if (filter === "all") return true;
  const statMap: Record<StatFilter, string[]> = {
    all: [],
    ad: ["FlatPhysicalDamageMod", "Damage"],
    ap: ["FlatMagicDamageMod", "SpellDamage"],
    armor: ["FlatArmorMod", "Armor"],
    mr: ["FlatSpellBlockMod", "SpellBlock"],
    health: ["FlatHPPoolMod", "Health"],
    mana: ["FlatMPPoolMod", "Mana", "ManaRegen"],
    crit: ["FlatCritChanceMod", "CriticalStrike"],
    attackspeed: ["PercentAttackSpeedMod", "AttackSpeed"],
    cdr: ["CooldownReduction"],
    lifesteal: ["LifeSteal"],
    lethality: ["ArmorPenetration"],
  };
  const keys = statMap[filter];
  const hasStatKey = keys.some(k => item.stats[k] !== undefined && item.stats[k] !== 0);
  const hasTag = keys.some(k => item.tags.includes(k));
  return hasStatKey || hasTag;
}

function getStatDisplay(stats: Record<string, number>): { label: string; value: string; color: string }[] {
  const out: { label: string; value: string; color: string }[] = [];
  if (stats.FlatPhysicalDamageMod) out.push({ label: "AD", value: `+${stats.FlatPhysicalDamageMod}`, color: "text-red-400" });
  if (stats.FlatMagicDamageMod) out.push({ label: "AP", value: `+${stats.FlatMagicDamageMod}`, color: "text-purple-400" });
  if (stats.FlatHPPoolMod) out.push({ label: "HP", value: `+${stats.FlatHPPoolMod}`, color: "text-green-400" });
  if (stats.FlatMPPoolMod) out.push({ label: "Mana", value: `+${stats.FlatMPPoolMod}`, color: "text-cyan-400" });
  if (stats.FlatArmorMod) out.push({ label: "Armor", value: `+${stats.FlatArmorMod}`, color: "text-yellow-500" });
  if (stats.FlatSpellBlockMod) out.push({ label: "MR", value: `+${stats.FlatSpellBlockMod}`, color: "text-blue-400" });
  if (stats.FlatCritChanceMod) out.push({ label: "Crit", value: `+${Math.round(stats.FlatCritChanceMod * 100)}%`, color: "text-amber-400" });
  if (stats.PercentAttackSpeedMod) out.push({ label: "AS", value: `+${Math.round(stats.PercentAttackSpeedMod * 100)}%`, color: "text-yellow-400" });
  if (stats.FlatMagicPenetrationMod) out.push({ label: "MPen", value: `+${stats.FlatMagicPenetrationMod}`, color: "text-purple-300" });
  return out;
}

// ─── Category Badge ──────────────────────────────────────────────────────────

function getCategoryBadge(item: ItemData): { label: string; color: string; bg: string } {
  const cat = getItemCategory(item);
  switch (cat) {
    case "starter": return { label: "START", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
    case "boots": return { label: "BOOTS", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" };
    case "basic": return { label: "BASIC", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" };
    case "epic": return { label: "EPIC", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" };
    case "legendary": return { label: "LEGEND", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
    case "consumable": return { label: "CONSUM", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
    default: return { label: "ITEM", color: "text-muted-foreground", bg: "bg-secondary/40 border-border/20" };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ItemExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("all");
  const [selectedStat, setSelectedStat] = useState<StatFilter>("all");
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const { version: patchVersion } = usePatchVersion();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  const patch = patchVersion || "14.10.1";

  // Auto-select item from URL params (coming from TitleBarSearch)
  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId) {
      const found = ITEMS_DATABASE.find(i => i.id === itemId);
      if (found) setSelectedItem(found);
    }
  }, [searchParams]);

  const filteredItems = useMemo(() => {
    let items = ITEMS_DATABASE;

    if (selectedCategory !== "all") {
      items = items.filter(item => getItemCategory(item) === selectedCategory);
    }

    if (selectedStat !== "all") {
      items = items.filter(item => matchesStatFilter(item, selectedStat));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.plaintext.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    return items;
  }, [searchQuery, selectedCategory, selectedStat]);

  const getItemById = (id: string) => ITEMS_DATABASE.find(i => i.id === id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex flex-col font-sans pb-20"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Package className="w-7 h-7 text-primary" />
          {t("items.title") || "Item Explorer"}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          {t("items.subtitle") || "Browse, search and understand every item in League of Legends"}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("items.searchPlaceholder") || "Search items by name or stat..."}
            className="w-full h-10 pl-10 pr-4 bg-card border border-border/50 rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border",
                selectedCategory === cat.key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
              )}
            >
              <cat.icon className="w-3 h-3" />
              {t(`items.cat.${cat.key}`) || cat.label}
            </button>
          ))}
        </div>

        {/* Stat Filters */}
        <div className="flex gap-1 flex-wrap">
          {STAT_FILTERS.map(sf => (
            <button
              key={sf.key}
              onClick={() => setSelectedStat(sf.key)}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer border",
                selectedStat === sf.key
                  ? `bg-primary/8 border-primary/20 ${sf.color}`
                  : "bg-transparent border-border/20 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/40"
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Items Count */}
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          {filteredItems.length} {t("items.count") || "items"}
        </span>

        {/* Items Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-2">
          {filteredItems.map(item => {
            const stats = getStatDisplay(item.stats);
            const isSelected = selectedItem?.id === item.id;
            const badge = getCategoryBadge(item);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(isSelected ? null : item)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer group text-center relative",
                  isSelected
                    ? "bg-primary/8 border-primary/30 ring-2 ring-primary/15"
                    : "bg-card border-border/30 hover:border-primary/20 hover:bg-secondary/30"
                )}
              >
                {/* Category indicator */}
                <span className={cn("absolute top-1.5 right-1.5 px-1 py-0.5 rounded border text-[7px] font-mono font-bold tracking-wider", badge.bg, badge.color)}>
                  {badge.label}
                </span>
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${item.image}.png`}
                  className={cn(
                    "w-10 h-10 rounded-lg border transition-all",
                    isSelected ? "border-primary/40" : "border-border/30 group-hover:border-border/60"
                  )}
                  alt={item.name}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                />
                <span className="text-[11px] font-medium text-foreground leading-tight">{item.name}</span>
                {stats.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {stats.slice(0, 2).map(s => (
                      <span key={s.label} className={cn("text-[9px] font-mono", s.color)}>{s.value} {s.label}</span>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground/40 font-mono flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5 text-yellow-500/50" />
                  {item.gold.total}
                </span>
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Package className="w-8 h-8 text-muted-foreground/20" />
            <span className="text-[13px] text-muted-foreground/40">{t("items.noResults") || "No items match your filters"}</span>
          </div>
        )}

        {/* Inline Item Detail */}
        <AnimatePresence mode="wait">
          {selectedItem && (
            <motion.div
              key={selectedItem.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
                {/* Item Header */}
                <div className="p-5 border-b border-border/30 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-start gap-4">
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${selectedItem.image}.png`}
                      className="w-14 h-14 rounded-xl border-2 border-border/40 shadow-lg"
                      alt={selectedItem.name}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-bold text-foreground">{selectedItem.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{selectedItem.plaintext}</p>
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="shrink-0 w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Inline detail grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/30">
                  {/* Gold + Stats */}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t("items.detail.cost") || "Cost"}</span>
                      <span className="flex items-center gap-1 text-[13px] font-bold text-foreground font-mono">
                        <Coins className="w-3.5 h-3.5 text-yellow-500" />
                        {selectedItem.gold.total}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t("items.detail.sell") || "Sell"}</span>
                      <span className="text-[11px] text-muted-foreground/50 font-mono">{selectedItem.gold.sell}</span>
                    </div>
                    {getStatDisplay(selectedItem.stats).length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t("items.detail.stats") || "Stats"}</span>
                        {getStatDisplay(selectedItem.stats).map(stat => (
                          <div key={stat.label} className="flex items-center justify-between">
                            <span className="text-[12px] text-muted-foreground">{stat.label}</span>
                            <span className={cn("text-[13px] font-mono font-bold", stat.color)}>{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="p-4">
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-2">{t("items.detail.description") || "Description"}</span>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{selectedItem.description}</p>
                  </div>

                  {/* Build Path */}
                  <div className="p-4">
                    {selectedItem.from && selectedItem.from.length > 0 && (
                      <>
                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-2">{t("items.detail.builtFrom") || "Built From"}</span>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedItem.from.map(fromId => {
                            const fromItem = getItemById(fromId);
                            return fromItem ? (
                              <button
                                key={fromId}
                                onClick={() => setSelectedItem(fromItem)}
                                className="flex items-center gap-2 px-2 py-1.5 bg-secondary/40 rounded-lg border border-border/20 hover:border-primary/30 transition-all cursor-pointer"
                              >
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${fromItem.image}.png`}
                                  className="w-6 h-6 rounded"
                                  alt={fromItem.name}
                                />
                                <span className="text-[10px] text-foreground">{fromItem.name}</span>
                              </button>
                            ) : (
                              <div key={fromId} className="flex items-center gap-2 px-2 py-1.5 bg-secondary/20 rounded-lg border border-border/10">
                                <div className="w-6 h-6 rounded bg-secondary/60" />
                                <span className="text-[10px] text-muted-foreground/40">{t("items.detail.component") || "Component"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {selectedItem.into && selectedItem.into.length > 0 && (
                      <>
                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-2">{t("items.detail.buildsInto") || "Builds Into"}</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedItem.into.map(intoId => {
                            const intoItem = getItemById(intoId);
                            return intoItem ? (
                              <button
                                key={intoId}
                                onClick={() => setSelectedItem(intoItem)}
                                className="flex items-center gap-2 px-2 py-1.5 bg-secondary/40 rounded-lg border border-border/20 hover:border-primary/30 transition-all cursor-pointer"
                              >
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${intoItem.image}.png`}
                                  className="w-6 h-6 rounded"
                                  alt={intoItem.name}
                                />
                                <span className="text-[10px] text-foreground">{intoItem.name}</span>
                              </button>
                            ) : (
                              <div key={intoId} className="flex items-center gap-2 px-2 py-1.5 bg-secondary/20 rounded-lg border border-border/10">
                                <div className="w-6 h-6 rounded bg-secondary/60" />
                                <span className="text-[10px] text-muted-foreground/40">{t("items.detail.upgrade") || "Upgrade"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {(!selectedItem.from || selectedItem.from.length === 0) && (!selectedItem.into || selectedItem.into.length === 0) && (
                      <span className="text-[11px] text-muted-foreground/40">{t("items.detail.noBuildPath") || "No build path"}</span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="p-4">
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-2">{t("items.detail.tags") || "Tags"}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-secondary/40 rounded text-[9px] text-muted-foreground/60 font-mono">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/30 px-1 mt-6">
        <Shield className="w-3 h-3" />
        {t("items.disclaimer") || "Item data from Riot Games Data Dragon. Images are property of Riot Games."}
      </div>
    </motion.div>
  );
}
