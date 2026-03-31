/**
 * Rune Localization — Official Riot Games translations
 *
 * Maps rune IDs → localized names for EN / ES / KR.
 * Source: Riot Games Data Dragon + official in-client translations.
 */

type Lang = "en" | "es" | "kr";

type LocaleEntry = Record<Lang, string>;

// ─── Rune Tree Names ──────────────────────────────────────────────────────────

const TREE_NAMES: Record<number, LocaleEntry> = {
  8000: { en: "Precision",   es: "Precisión",    kr: "정밀" },
  8100: { en: "Domination",  es: "Dominación",   kr: "지배" },
  8200: { en: "Sorcery",     es: "Brujería",     kr: "마법" },
  8300: { en: "Inspiration", es: "Inspiración",  kr: "영감" },
  8400: { en: "Resolve",     es: "Determinación", kr: "결의" },
};

// ─── All Rune Names (Keystones + Minor) ───────────────────────────────────────

const RUNE_NAMES: Record<number, LocaleEntry> = {
  // ══════ PRECISION (8000) ══════
  // Keystones
  8005: { en: "Press the Attack",    es: "Ataque certero",           kr: "집중 공격" },
  8008: { en: "Lethal Tempo",        es: "Cadencia letal",           kr: "치명적 속도" },
  8021: { en: "Fleet Footwork",      es: "Juego de pies",            kr: "기민한 발놀림" },
  8010: { en: "Conqueror",           es: "Conquistador",             kr: "정복자" },
  // Row 1
  9101: { en: "Overheal",            es: "Sobrecuración",            kr: "과잉 치유" },
  9111: { en: "Triumph",             es: "Triunfo",                  kr: "승전보" },
  8009: { en: "Presence of Mind",    es: "Presencia de espíritu",    kr: "침착" },
  // Row 2
  9104: { en: "Legend: Alacrity",     es: "Leyenda: Presteza",        kr: "전설: 민첩함" },
  9105: { en: "Legend: Tenacity",     es: "Leyenda: Tenacidad",       kr: "전설: 강인함" },
  9103: { en: "Legend: Bloodline",    es: "Leyenda: Linaje",          kr: "전설: 핏줄" },
  // Row 3
  8014: { en: "Coup de Grace",       es: "Golpe de gracia",          kr: "최후의 일격" },
  8017: { en: "Cut Down",            es: "Derribar",                 kr: "체력 차 극복" },
  8299: { en: "Last Stand",          es: "Última batalla",           kr: "최후의 저항" },

  // ══════ DOMINATION (8100) ══════
  // Keystones
  8112: { en: "Electrocute",         es: "Electrocutar",             kr: "감전" },
  8124: { en: "Predator",            es: "Depredador",               kr: "포식자" },
  8128: { en: "Dark Harvest",        es: "Cosecha oscura",           kr: "어둠의 수확" },
  9923: { en: "Hail of Blades",      es: "Lluvia de cuchillas",      kr: "칼날비" },
  // Row 1
  8126: { en: "Cheap Shot",          es: "Golpe bajo",               kr: "비열한 한 방" },
  8139: { en: "Taste of Blood",      es: "Sabor a sangre",           kr: "피의 맛" },
  8143: { en: "Sudden Impact",       es: "Impacto repentino",        kr: "돌발 일격" },
  // Row 2
  8136: { en: "Zombie Ward",         es: "Guardia zombi",            kr: "좀비 와드" },
  8120: { en: "Ghost Poro",          es: "Poro fantasma",            kr: "유령 포로" },
  8138: { en: "Eyeball Collection",  es: "Colección de ojos",        kr: "안구 수집기" },
  // Row 3
  8135: { en: "Treasure Hunter",     es: "Cazatesoros",              kr: "보물 사냥꾼" },
  8134: { en: "Ingenious Hunter",    es: "Cazador ingenioso",        kr: "교묘한 사냥꾼" },
  8105: { en: "Relentless Hunter",   es: "Cazador incansable",       kr: "끈질긴 사냥꾼" },
  8106: { en: "Ultimate Hunter",     es: "Cazador definitivo",       kr: "궁극의 사냥꾼" },

  // ══════ SORCERY (8200) ══════
  // Keystones
  8214: { en: "Summon Aery",         es: "Invocar a Aery",           kr: "에어리 소환" },
  8229: { en: "Arcane Comet",        es: "Cometa arcano",            kr: "비전 혜성" },
  8230: { en: "Phase Rush",          es: "Velocidad de fase",        kr: "난입" },
  // Row 1
  8224: { en: "Nullifying Orb",      es: "Orbe anulador",            kr: "무효화 구슬" },
  8226: { en: "Manaflow Band",       es: "Banda de maná",            kr: "마나순환 팔찌" },
  8275: { en: "Nimbus Cloak",        es: "Capa de nimbo",            kr: "구름 망토" },
  // Row 2
  8210: { en: "Transcendence",       es: "Trascendencia",            kr: "깨달음" },
  8234: { en: "Celerity",            es: "Celeridad",                kr: "신속함" },
  8233: { en: "Absolute Focus",      es: "Concentración absoluta",   kr: "절대 집중" },
  // Row 3
  8237: { en: "Scorch",              es: "Chamuscar",                kr: "주문 작열" },
  8232: { en: "Waterwalking",        es: "Caminar sobre las aguas",  kr: "수상 보행" },
  8236: { en: "Gathering Storm",     es: "Tormenta creciente",       kr: "폭풍의 결집" },

  // ══════ RESOLVE (8400) ══════
  // Keystones
  8437: { en: "Grasp of the Undying", es: "Agarre del inmortal",     kr: "착취의 손아귀" },
  8439: { en: "Aftershock",           es: "Sacudida posterior",       kr: "여진" },
  8465: { en: "Guardian",             es: "Guardián",                 kr: "수호자" },
  // Row 1
  8446: { en: "Demolish",            es: "Demoler",                  kr: "철거" },
  8463: { en: "Font of Life",        es: "Fuente de vida",           kr: "생명의 샘" },
  8401: { en: "Shield Bash",         es: "Embate de escudo",         kr: "방패 강타" },
  // Row 2
  8429: { en: "Conditioning",        es: "Acondicionamiento",        kr: "사전 준비" },
  8444: { en: "Second Wind",         es: "Segundo aliento",          kr: "재생의 바람" },
  8473: { en: "Bone Plating",        es: "Revestimiento óseo",       kr: "뼈 방패" },
  // Row 3
  8451: { en: "Overgrowth",          es: "Crecimiento excesivo",     kr: "과잉 성장" },
  8453: { en: "Revitalize",          es: "Revitalizar",              kr: "소생" },
  8242: { en: "Unflinching",         es: "Inquebrantable",           kr: "불굴의 의지" },

  // ══════ INSPIRATION (8300) ══════
  // Keystones
  8351: { en: "Glacial Augment",     es: "Aumento glacial",          kr: "빙결 강화" },
  8360: { en: "Unsealed Spellbook",  es: "Grimorio sin sellar",      kr: "봉인 풀린 주문서" },
  8369: { en: "First Strike",        es: "Primer golpe",             kr: "선제공격" },
  // Row 1
  8306: { en: "Hextech Flashtraption", es: "Flashparación hextech",  kr: "마법공학 점멸기" },
  8304: { en: "Magical Footwear",    es: "Calzado mágico",           kr: "마법의 신발" },
  8321: { en: "Cash Back",           es: "Reembolso",                kr: "환급" },
  // Row 2
  8313: { en: "Triple Tonic",        es: "Triple tónico",            kr: "삼중 강장제" },
  8352: { en: "Time Warp Tonic",     es: "Tónico de distorsión temporal", kr: "시간 왜곡 물약" },
  8345: { en: "Biscuit Delivery",    es: "Entrega de galletas",      kr: "비스킷 배달" },
  // Row 3
  8347: { en: "Cosmic Insight",      es: "Perspicacia cósmica",      kr: "우주적 통찰력" },
  8410: { en: "Approach Velocity",   es: "Velocidad de aproximación", kr: "접근 속도" },
  8316: { en: "Jack of All Trades",  es: "Todoterreno",              kr: "팔방미인" },
};

// ─── Stat Shard Names ─────────────────────────────────────────────────────────

const SHARD_NAMES: Record<number, LocaleEntry> = {
  5008: { en: "Adaptive Force", es: "Fuerza adaptativa",        kr: "적응형 능력치" },
  5005: { en: "Attack Speed",   es: "Velocidad de ataque",      kr: "공격 속도" },
  5007: { en: "Ability Haste",  es: "Aceleración de habilidad", kr: "스킬 가속" },
  5002: { en: "Armor",          es: "Armadura",                 kr: "방어력" },
  5003: { en: "Magic Resist",   es: "Resistencia mágica",       kr: "마법 저항력" },
  5001: { en: "Health Scaling", es: "Salud progresiva",         kr: "체력 (레벨별)" },
  5010: { en: "Move Speed",     es: "Velocidad de movimiento",  kr: "이동 속도" },
};

// ─── Stat Shard Descriptions ──────────────────────────────────────────────────

const SHARD_DESCRIPTIONS: Record<number, LocaleEntry> = {
  5008: { en: "+9 Adaptive Force",  es: "+9 Fuerza adaptativa",          kr: "+9 적응형 능력치" },
  5005: { en: "+10% Attack Speed",  es: "+10% Velocidad de ataque",      kr: "+10% 공격 속도" },
  5007: { en: "+8 Ability Haste",   es: "+8 Aceleración de habilidad",   kr: "+8 스킬 가속" },
  5002: { en: "+6 Armor",           es: "+6 Armadura",                   kr: "+6 방어력" },
  5003: { en: "+8 Magic Resist",    es: "+8 Resistencia mágica",         kr: "+8 마법 저항력" },
  5001: { en: "+15-140 Health",     es: "+15-140 Salud",                 kr: "+15-140 체력" },
  5010: { en: "+2% Move Speed",     es: "+2% Velocidad de movimiento",   kr: "+2% 이동 속도" },
};

// ─── Public API ───────────────────────────────────────────────────────────────

function normalizeLang(lang: string): Lang {
  if (lang === "es") return "es";
  if (lang === "kr") return "kr";
  return "en";
}

/** Get localized rune tree name (Precision, Domination, etc.) */
export function getLocalizedTreeName(treeId: number, lang: string): string {
  const l = normalizeLang(lang);
  return TREE_NAMES[treeId]?.[l] ?? TREE_NAMES[treeId]?.en ?? `Tree ${treeId}`;
}

/** Get localized rune name (keystone or minor rune) */
export function getLocalizedRuneName(runeId: number, lang: string): string {
  const l = normalizeLang(lang);
  // Check runes first, then shards
  if (RUNE_NAMES[runeId]) return RUNE_NAMES[runeId][l] ?? RUNE_NAMES[runeId].en;
  if (SHARD_NAMES[runeId]) return SHARD_NAMES[runeId][l] ?? SHARD_NAMES[runeId].en;
  return `Rune ${runeId}`;
}

/** Get localized stat shard name */
export function getLocalizedShardName(shardId: number, lang: string): string {
  const l = normalizeLang(lang);
  return SHARD_NAMES[shardId]?.[l] ?? SHARD_NAMES[shardId]?.en ?? `Shard ${shardId}`;
}

/** Get localized stat shard description */
export function getLocalizedShardDesc(shardId: number, lang: string): string {
  const l = normalizeLang(lang);
  return SHARD_DESCRIPTIONS[shardId]?.[l] ?? SHARD_DESCRIPTIONS[shardId]?.en ?? "";
}
