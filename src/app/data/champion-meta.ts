/**
 * Champion Meta — Tier + Archetype per champion
 *
 * Tier:      S → A → B → C → D  (aproximado, patch actual)
 * Archetype: used to compute team composition tags
 */

export type Tier = "S" | "A" | "B" | "C" | "D";
export type Archetype =
  | "engage"
  | "poke"
  | "splitpush"
  | "teamfight"
  | "assassin"
  | "sustain"
  | "tank"
  | "skirmish"
  | "utility"
  | "burst";

export interface ChampionMeta {
  tier: Tier;
  arch: Archetype[];
}

// ─── Archetype display labels ─────────────────────────────────────────────────
export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  engage:    "Engage",
  poke:      "Poke",
  splitpush: "Split Push",
  teamfight: "Teamfight",
  assassin:  "Assassin",
  sustain:   "Sustain",
  tank:      "Tank",
  skirmish:  "Skirmish",
  utility:   "Utility",
  burst:     "Burst",
};

// ─── Tier badge colors ────────────────────────────────────────────────────────
export const TIER_COLOR: Record<Tier, { bg: string; text: string; border: string }> = {
  S: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.4)" },
  A: { bg: "rgba(34,197,94,0.15)",  text: "#22c55e", border: "rgba(34,197,94,0.4)"  },
  B: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.4)" },
  C: { bg: "rgba(168,85,247,0.15)", text: "#c084fc", border: "rgba(168,85,247,0.4)" },
  D: { bg: "rgba(107,114,128,0.15)",text: "#9ca3af", border: "rgba(107,114,128,0.4)"},
};

// ─── Champion Meta Database ───────────────────────────────────────────────────
export const CHAMPION_META: Record<string, ChampionMeta> = {
  // TOP
  Aatrox:       { tier: "A", arch: ["skirmish", "teamfight"] },
  Camille:      { tier: "A", arch: ["skirmish", "splitpush"] },
  Darius:       { tier: "B", arch: ["skirmish", "tank"] },
  DrMundo:      { tier: "A", arch: ["sustain", "tank", "splitpush"] },
  Fiora:        { tier: "S", arch: ["splitpush", "skirmish"] },
  Gangplank:    { tier: "A", arch: ["poke", "teamfight"] },
  Garen:        { tier: "B", arch: ["tank", "skirmish"] },
  Gnar:         { tier: "B", arch: ["poke", "engage"] },
  Gwen:         { tier: "B", arch: ["skirmish", "splitpush"] },
  Illaoi:       { tier: "B", arch: ["skirmish", "teamfight"] },
  Irelia:       { tier: "B", arch: ["skirmish", "splitpush"] },
  Jax:          { tier: "A", arch: ["splitpush", "skirmish"] },
  Jayce:        { tier: "A", arch: ["poke", "skirmish"] },
  KSante:       { tier: "A", arch: ["tank", "engage"] },
  Kled:         { tier: "B", arch: ["skirmish", "engage"] },
  Mordekaiser:  { tier: "A", arch: ["skirmish", "teamfight"] },
  Nasus:        { tier: "C", arch: ["splitpush", "tank"] },
  Olaf:         { tier: "B", arch: ["skirmish", "splitpush"] },
  Ornn:         { tier: "A", arch: ["tank", "engage", "teamfight"] },
  Pantheon:     { tier: "B", arch: ["poke", "skirmish"] },
  Renekton:     { tier: "B", arch: ["skirmish", "engage"] },
  Riven:        { tier: "A", arch: ["skirmish", "splitpush"] },
  Rumble:       { tier: "A", arch: ["poke", "teamfight"] },
  Sett:         { tier: "B", arch: ["tank", "engage", "skirmish"] },
  Singed:       { tier: "C", arch: ["tank", "utility"] },
  Teemo:        { tier: "B", arch: ["poke", "splitpush"] },
  Trundle:      { tier: "B", arch: ["tank", "skirmish"] },
  Tryndamere:   { tier: "B", arch: ["splitpush", "skirmish"] },
  Udyr:         { tier: "B", arch: ["tank", "skirmish"] },
  Urgot:        { tier: "A", arch: ["skirmish", "teamfight"] },
  Volibear:     { tier: "A", arch: ["engage", "tank", "splitpush"] },
  Warwick:      { tier: "B", arch: ["sustain", "skirmish"] },
  Yorick:       { tier: "A", arch: ["splitpush", "tank"] },
  Briar:        { tier: "B", arch: ["skirmish", "engage"] },
  Malphite:     { tier: "A", arch: ["engage", "tank", "teamfight"] },

  // JUNGLE
  Amumu:        { tier: "S", arch: ["engage", "tank", "teamfight"] },
  BelVeth:      { tier: "B", arch: ["skirmish", "splitpush"] },
  Diana:        { tier: "A", arch: ["burst", "engage"] },
  Elise:        { tier: "B", arch: ["burst", "engage"] },
  Evelynn:      { tier: "B", arch: ["assassin", "burst"] },
  Fiddlesticks: { tier: "A", arch: ["teamfight", "burst"] },
  Graves:       { tier: "A", arch: ["skirmish", "poke"] },
  Hecarim:      { tier: "A", arch: ["engage", "teamfight"] },
  Ivern:        { tier: "B", arch: ["utility", "sustain"] },
  JarvanIV:     { tier: "B", arch: ["engage", "tank"] },
  Karthus:      { tier: "A", arch: ["teamfight", "burst"] },
  Kayn:         { tier: "A", arch: ["assassin", "skirmish"] },
  Khazix:       { tier: "A", arch: ["assassin", "burst"] },
  Kindred:      { tier: "B", arch: ["skirmish", "utility"] },
  LeeSin:       { tier: "A", arch: ["skirmish", "engage"] },
  Lillia:       { tier: "A", arch: ["teamfight", "engage"] },
  MasterYi:     { tier: "B", arch: ["skirmish", "splitpush"] },
  Nidalee:      { tier: "B", arch: ["poke", "skirmish"] },
  Nocturne:     { tier: "B", arch: ["assassin", "engage"] },
  Nunu:         { tier: "A", arch: ["engage", "tank"] },
  "Nunu&Willump": { tier: "A", arch: ["engage", "tank"] },
  RekSai:       { tier: "B", arch: ["skirmish", "engage"] },
  Rengar:       { tier: "A", arch: ["assassin", "burst"] },
  Sejuani:      { tier: "A", arch: ["engage", "tank", "teamfight"] },
  Shaco:        { tier: "B", arch: ["assassin", "utility"] },
  Shyvana:      { tier: "B", arch: ["teamfight", "splitpush"] },
  Skarner:      { tier: "S", arch: ["engage", "tank"] },
  Vi:           { tier: "B", arch: ["engage", "skirmish"] },
  Viego:        { tier: "A", arch: ["skirmish", "assassin"] },
  Wukong:       { tier: "B", arch: ["engage", "teamfight"] },
  XinZhao:      { tier: "B", arch: ["engage", "skirmish"] },
  Zac:          { tier: "A", arch: ["engage", "tank"] },
  Zed:          { tier: "A", arch: ["assassin", "burst"] },

  // MID
  Ahri:         { tier: "A", arch: ["burst", "assassin"] },
  Akali:        { tier: "A", arch: ["assassin", "burst"] },
  Akshan:       { tier: "B", arch: ["poke", "skirmish"] },
  Anivia:       { tier: "B", arch: ["teamfight", "utility"] },
  Annie:        { tier: "B", arch: ["burst", "engage"] },
  Aurora:       { tier: "A", arch: ["burst", "skirmish"] },
  Azir:         { tier: "A", arch: ["teamfight", "poke"] },
  Cassiopeia:   { tier: "A", arch: ["teamfight", "sustain"] },
  Corki:        { tier: "B", arch: ["poke", "teamfight"] },
  Ekko:         { tier: "A", arch: ["assassin", "burst"] },
  Fizz:         { tier: "A", arch: ["assassin", "burst"] },
  Galio:        { tier: "A", arch: ["engage", "tank", "teamfight"] },
  Kassadin:     { tier: "A", arch: ["assassin", "burst"] },
  Katarina:     { tier: "A", arch: ["assassin", "teamfight"] },
  LeBlanc:      { tier: "A", arch: ["assassin", "burst"] },
  Lissandra:    { tier: "A", arch: ["engage", "burst"] },
  Malzahar:     { tier: "A", arch: ["teamfight", "utility"] },
  Naafiri:      { tier: "B", arch: ["assassin", "burst"] },
  Orianna:      { tier: "A", arch: ["teamfight", "utility"] },
  Qiyana:       { tier: "B", arch: ["assassin", "engage"] },
  Ryze:         { tier: "B", arch: ["teamfight", "poke"] },
  Smolder:      { tier: "A", arch: ["poke", "teamfight"] },
  Sylas:        { tier: "A", arch: ["skirmish", "burst"] },
  Syndra:       { tier: "A", arch: ["burst", "poke"] },
  Taliyah:      { tier: "A", arch: ["teamfight", "utility"] },
  Talon:        { tier: "A", arch: ["assassin", "burst"] },
  Twisted:      { tier: "B", arch: ["poke", "utility"] },
  TwistedFate:  { tier: "B", arch: ["poke", "utility"] },
  Veigar:       { tier: "B", arch: ["burst", "utility"] },
  Viktor:       { tier: "A", arch: ["teamfight", "poke"] },
  Vladimir:     { tier: "A", arch: ["teamfight", "sustain"] },
  Yasuo:        { tier: "B", arch: ["teamfight", "skirmish"] },
  Yone:         { tier: "A", arch: ["skirmish", "teamfight"] },
  Zoe:          { tier: "B", arch: ["poke", "burst"] },

  // BOT / ADC
  Ashe:         { tier: "A", arch: ["poke", "utility", "teamfight"] },
  Caitlyn:      { tier: "A", arch: ["poke", "teamfight"] },
  Draven:       { tier: "A", arch: ["skirmish", "burst"] },
  Ezreal:       { tier: "A", arch: ["poke", "teamfight"] },
  Jinx:         { tier: "A", arch: ["teamfight", "burst"] },
  Jhin:         { tier: "A", arch: ["poke", "burst"] },
  Kaisa:        { tier: "A", arch: ["skirmish", "teamfight"] },
  Kalista:      { tier: "B", arch: ["skirmish", "utility"] },
  KogMaw:       { tier: "A", arch: ["teamfight", "poke"] },
  Lucian:       { tier: "B", arch: ["skirmish", "poke"] },
  MissFortune:  { tier: "A", arch: ["teamfight", "burst"] },
  Samira:       { tier: "A", arch: ["skirmish", "teamfight"] },
  Sivir:        { tier: "B", arch: ["teamfight", "utility"] },
  Tristana:     { tier: "A", arch: ["burst", "skirmish"] },
  Twitch:       { tier: "B", arch: ["teamfight", "assassin"] },
  Varus:        { tier: "B", arch: ["poke", "utility"] },
  Vayne:        { tier: "A", arch: ["skirmish", "splitpush"] },
  Xayah:        { tier: "A", arch: ["teamfight", "skirmish"] },
  Zeri:         { tier: "B", arch: ["skirmish", "teamfight"] },
  Ziggs:        { tier: "B", arch: ["poke", "splitpush"] },

  // SUPPORT
  Alistar:      { tier: "B", arch: ["engage", "tank"] },
  Bard:         { tier: "B", arch: ["utility", "engage"] },
  Blitzcrank:   { tier: "A", arch: ["engage", "utility"] },
  Brand:        { tier: "A", arch: ["burst", "teamfight"] },
  Braum:        { tier: "B", arch: ["engage", "utility"] },
  Enchanteress: { tier: "B", arch: ["sustain", "utility"] },
  Janna:        { tier: "A", arch: ["utility", "sustain"] },
  Karma:        { tier: "A", arch: ["poke", "utility"] },
  Lulu:         { tier: "A", arch: ["utility", "sustain"] },
  Lux:          { tier: "B", arch: ["poke", "burst"] },
  Milio:        { tier: "A", arch: ["sustain", "utility"] },
  Morgana:      { tier: "A", arch: ["utility", "burst"] },
  Nami:         { tier: "A", arch: ["sustain", "utility", "engage"] },
  Nautilus:     { tier: "A", arch: ["engage", "tank"] },
  Neeko:        { tier: "B", arch: ["burst", "engage"] },
  Pyke:         { tier: "A", arch: ["assassin", "engage"] },
  Rakan:        { tier: "A", arch: ["engage", "utility"] },
  Rell:         { tier: "A", arch: ["engage", "tank"] },
  Renata:       { tier: "B", arch: ["utility", "teamfight"] },
  Senna:        { tier: "A", arch: ["sustain", "utility", "poke"] },
  Seraphine:    { tier: "B", arch: ["sustain", "teamfight"] },
  Sona:         { tier: "B", arch: ["sustain", "teamfight"] },
  Soraka:       { tier: "A", arch: ["sustain", "utility"] },
  Swain:        { tier: "A", arch: ["teamfight", "sustain"] },
  TahmKench:    { tier: "B", arch: ["tank", "utility"] },
  Thresh:       { tier: "S", arch: ["engage", "utility"] },
  VelKoz:       { tier: "B", arch: ["poke", "burst"] },
  Xerath:       { tier: "B", arch: ["poke", "burst"] },
  Yuumi:        { tier: "C", arch: ["sustain", "utility"] },
  Zilean:       { tier: "B", arch: ["utility", "sustain"] },
  Zyra:         { tier: "B", arch: ["poke", "teamfight"] },
};

// ─── Team composition analysis ────────────────────────────────────────────────

const ARCHETYPE_PRIORITY: Archetype[] = [
  "engage", "poke", "assassin", "teamfight",
  "splitpush", "sustain", "burst", "skirmish", "tank", "utility",
];

/**
 * Given a list of champion names, returns the 2 dominant archetypes.
 * E.g. ["Malphite","Amumu","Orianna","Jinx","Thresh"] → ["Engage","Teamfight"]
 */
export function getTeamComp(champions: string[]): Archetype[] {
  const counts: Partial<Record<Archetype, number>> = {};
  for (const champ of champions) {
    const meta = CHAMPION_META[champ];
    if (!meta) continue;
    for (const arch of meta.arch) {
      counts[arch] = (counts[arch] ?? 0) + 1;
    }
  }

  return ARCHETYPE_PRIORITY
    .filter(a => (counts[a] ?? 0) >= 1)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, 2) as Archetype[];
}

// ─── Archetype badge colors ───────────────────────────────────────────────────
export const ARCHETYPE_COLOR: Record<Archetype, { bg: string; text: string }> = {
  engage:    { bg: "rgba(239,68,68,0.15)",   text: "#f87171" },
  poke:      { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  splitpush: { bg: "rgba(34,197,94,0.15)",   text: "#4ade80" },
  teamfight: { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa" },
  assassin:  { bg: "rgba(168,85,247,0.15)",  text: "#c084fc" },
  sustain:   { bg: "rgba(20,184,166,0.15)",  text: "#2dd4bf" },
  tank:      { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  skirmish:  { bg: "rgba(249,115,22,0.15)",  text: "#fb923c" },
  utility:   { bg: "rgba(6,182,212,0.15)",   text: "#22d3ee" },
  burst:     { bg: "rgba(236,72,153,0.15)",  text: "#f472b6" },
};
