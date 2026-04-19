/**
 * AI Coach Service — Velaris
 *
 * Uses Groq (https://groq.com) for fast, free cloud AI coaching.
 * Groq provides a free tier with generous limits — no credit card needed.
 *
 * Model: llama-3.3-70b-versatile (free, very fast)
 * API key stored in localStorage under "groq-api-key".
 */

import { type MatchData } from "./dataService";
import { computeDashboardData, type MatchParticipant } from "../utils/analytics";
import { getStoredIdentity } from "./dataService";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";

// ─── Config ───────────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_KEY_STORAGE = "groq-api-key";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type StreamCallback = (delta: string) => void;
export type DoneCallback = () => void;

export interface GroqStatus {
  available: boolean;
  apiKey: string | null;
}

// ─── Groq Key Check ───────────────────────────────────────────────────────────

export function checkGroq(): GroqStatus {
  // In Tauri: async key is fetched separately; use localStorage as cache
  const apiKey = localStorage.getItem(GROQ_KEY_STORAGE);
  return { available: !!apiKey, apiKey: apiKey ?? null };
}

/**
 * Saves the Groq API key.
 * In Tauri: writes to OS config dir (outside the WebView sandbox).
 * Also mirrors to localStorage so checkGroq() stays synchronous.
 */
export async function saveGroqKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (IS_TAURI) {
    await tauriInvoke("save_groq_key", { key: trimmed });
  }
  localStorage.setItem(GROQ_KEY_STORAGE, trimmed);
}

export async function clearGroqKey(): Promise<void> {
  if (IS_TAURI) {
    await tauriInvoke("clear_groq_key");
  }
  localStorage.removeItem(GROQ_KEY_STORAGE);
}

/**
 * Loads the Groq key from secure storage (Tauri) and syncs it to localStorage.
 * Call this once at app startup / Coach page mount.
 */
export async function loadGroqKey(): Promise<string | null> {
  if (IS_TAURI) {
    const key = await tauriInvoke<string | null>("get_groq_key").catch(() => null);
    if (key) {
      localStorage.setItem(GROQ_KEY_STORAGE, key);
      return key;
    }
    // Key not in secure storage — clear any stale localStorage value
    localStorage.removeItem(GROQ_KEY_STORAGE);
    return null;
  }
  return localStorage.getItem(GROQ_KEY_STORAGE);
}

// ─── Context Builder ──────────────────────────────────────────────────────────

function buildPlayerContext(matches: MatchData[]): string {
  const identity = getStoredIdentity();
  const name = identity ? `${identity.name}#${identity.tag}` : "Invocador";
  const rank = identity?.rank && identity?.division
    ? `${identity.rank} ${identity.division} — ${identity.lp ?? "??"} LP`
    : "Rango desconocido";

  if (matches.length === 0) {
    return `Jugador: ${name}\nRango: ${rank}\nHistorial: Sin partidas registradas aún.`;
  }

  // Always sort newest first so slice(0,N) gives the most recent N games
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);

  const data = computeDashboardData(
    sorted,
    identity?.rank ?? "EMERALD",
    identity?.name ?? "Invocador",
  );

  // ── Última partida: análisis completo ────────────────────────────────────
  const lastMatch = sorted[0];
  const lp = lastMatch?.participants?.[lastMatch.playerParticipantIndex];
  let lastGameStr = "";
  if (lp) {
    const dMin = Math.max(lastMatch.gameDuration / 60, 1);
    const cs = ((lp.totalMinionsKilled + lp.neutralMinionsKilled) / dMin).toFixed(1);
    const kdaRatio = lp.deaths === 0 ? "Perfect" : ((lp.kills + lp.assists) / lp.deaths).toFixed(2);
    const vpm = (lp.visionScore / dMin).toFixed(2);
    const dmgK = (lp.totalDamageDealtToChampions / 1000).toFixed(1);
    const dmgTakenK = (lp.totalDamageTaken / 1000).toFixed(1);
    const goldK = (lp.goldEarned / 1000).toFixed(1);
    const goldEff = lp.goldEarned > 0 ? Math.round((lp.goldSpent / lp.goldEarned) * 100) : 0;
    const durationStr = `${Math.floor(lastMatch.gameDuration / 60)}m${lastMatch.gameDuration % 60}s`;

    const teamPlayers = lastMatch.participants.filter((p: MatchParticipant) => p.teamId === lp.teamId);
    const teamKills = teamPlayers.reduce((s: number, p: MatchParticipant) => s + p.kills, 0);
    const teamDmg = teamPlayers.reduce((s: number, p: MatchParticipant) => s + p.totalDamageDealtToChampions, 0);
    const kp = teamKills > 0 ? Math.round(((lp.kills + lp.assists) / teamKills) * 100) : 0;
    const dmgShare = teamDmg > 0 ? Math.round((lp.totalDamageDealtToChampions / teamDmg) * 100) : 0;

    // Death timing breakdown
    let deathTimingStr = "";
    if (lp.deathTimestamps && lp.deathTimestamps.length > 0) {
      const ts = [...lp.deathTimestamps].sort((a, b) => a - b);
      const early = ts.filter(t => t <= 14).length;
      const mid   = ts.filter(t => t > 14 && t <= 25).length;
      const late  = ts.filter(t => t > 25).length;
      deathTimingStr = `  Minutos de muerte: ${ts.map(t => `${t}'`).join(", ")}
  Distribución: ${early} early (≤14min) / ${mid} mid (14-25min) / ${late} late (>25min)`;
    } else if (lp.deaths === 0) {
      deathTimingStr = "  Sin muertes en esta partida.";
    }

    // Multikills
    const multikills: string[] = [];
    if (lp.pentaKills)  multikills.push(`${lp.pentaKills} Penta`);
    if (lp.quadraKills) multikills.push(`${lp.quadraKills} Quadra`);
    if (lp.tripleKills) multikills.push(`${lp.tripleKills} Triple`);
    if (lp.doubleKills) multikills.push(`${lp.doubleKills} Double`);

    lastGameStr = `ÚLTIMA PARTIDA — ${lp.win ? "VICTORIA" : "DERROTA"} con ${lp.championName} [${lp.teamPosition ?? "?"}] (${durationStr}):
  KDA: ${lp.kills}/${lp.deaths}/${lp.assists} (ratio ${kdaRatio}) | KP: ${kp}% | Daño del equipo: ${dmgShare}%
  CS/min: ${cs} | CS total: ${lp.totalMinionsKilled + lp.neutralMinionsKilled}
  Visión: ${lp.visionScore} pts (${vpm}/min) | Wards colocados: ${lp.wardsPlaced ?? 0} + ${lp.controlWardsPlaced ?? 0} de control
  Daño hecho: ${dmgK}k | Daño recibido: ${dmgTakenK}k (ratio hecho/recibido: ${lp.totalDamageTaken > 0 ? (lp.totalDamageDealtToChampions / lp.totalDamageTaken).toFixed(2) : "N/A"})
  Oro: ${goldK}k ganado / ${goldEff}% gastado | Torres destruidas: ${lp.turretKills ?? 0}
  First blood: ${lp.firstBloodKill ? "Kill" : lp.firstBloodAssist ? "Assist" : "No"}${multikills.length ? ` | Multikills: ${multikills.join(", ")}` : ""}
MUERTES:
${deathTimingStr || "  Sin datos de timestamps"}`;
  }

  // ── Top campeones (pool real del jugador) ─────────────────────────────────
  const champMap: Record<string, { games: number; wins: number; totalKda: number }> = {};
  for (const m of sorted) {
    const p = m.participants?.[m.playerParticipantIndex];
    if (!p?.championName) continue;
    if (!champMap[p.championName]) champMap[p.championName] = { games: 0, wins: 0, totalKda: 0 };
    champMap[p.championName].games++;
    if (p.win) champMap[p.championName].wins++;
    champMap[p.championName].totalKda += p.deaths === 0
      ? p.kills + p.assists
      : (p.kills + p.assists) / p.deaths;
  }
  const topChamps = Object.entries(champMap)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 6)
    .map(([n, s]) => {
      const wr = Math.round(s.wins / s.games * 100);
      const avgKda = (s.totalKda / s.games).toFixed(1);
      return `  ${n}: ${s.games}P  ${wr}% WR  ${avgKda} KDA avg`;
    })
    .join("\n");

  // ── Forma reciente (últimas 10) ───────────────────────────────────────────
  const last10 = sorted.slice(0, 10);
  const last10Wins = last10.filter(m => m.participants?.[m.playerParticipantIndex]?.win).length;
  const recentForm = `${last10Wins}V-${last10.length - last10Wins}D últimas ${last10.length} partidas`;

  // ── Historial reciente (20 partidas) con stats clave ─────────────────────
  const recentList = sorted.slice(0, 20).map((m, i) => {
    const p = m.participants?.[m.playerParticipantIndex];
    if (!p) return null;
    const dMin = Math.max(m.gameDuration / 60, 1);
    const cs = ((p.totalMinionsKilled + p.neutralMinionsKilled) / dMin).toFixed(1);
    const kda = p.deaths === 0 ? "∞" : ((p.kills + p.assists) / p.deaths).toFixed(1);
    const teamKills = m.participants.filter((x: MatchParticipant) => x.teamId === p.teamId).reduce((s: number, x: MatchParticipant) => s + x.kills, 0);
    const kp = teamKills > 0 ? Math.round(((p.kills + p.assists) / teamKills) * 100) : 0;
    const vpm = (p.visionScore / dMin).toFixed(1);
    const deaths = p.deathTimestamps?.length ?? p.deaths;
    return `  ${i + 1}. ${p.win ? "WIN" : "LOSS"} ${p.championName ?? "?"} [${p.teamPosition ?? "?"}]` +
      `  ${p.kills}/${deaths}/${p.assists}  KDA:${kda}  CS/m:${cs}  KP:${kp}%  V/m:${vpm}` +
      `${p.turretKills ? `  Torres:${p.turretKills}` : ""}`;
  }).filter(Boolean).join("\n");

  // ── Patrones de error recurrentes detectados en el historial ─────────────
  const allDeathsEarly = sorted.slice(0, 10).reduce((sum, m) => {
    const p = m.participants?.[m.playerParticipantIndex];
    return sum + (p?.deathTimestamps?.filter((t: number) => t <= 14).length ?? 0);
  }, 0);
  const allDeathsTotal = sorted.slice(0, 10).reduce((sum, m) => {
    const p = m.participants?.[m.playerParticipantIndex];
    return sum + (p?.deaths ?? 0);
  }, 0);
  const earlyDeathPct = allDeathsTotal > 0 ? Math.round((allDeathsEarly / allDeathsTotal) * 100) : 0;

  const avgWards = sorted.slice(0, 10).reduce((sum, m) => {
    const p = m.participants?.[m.playerParticipantIndex];
    return sum + (p?.wardsPlaced ?? 0);
  }, 0) / Math.min(sorted.length, 10);

  const avgCs = sorted.slice(0, 10).reduce((sum, m) => {
    const p = m.participants?.[m.playerParticipantIndex];
    if (!p) return sum;
    return sum + (p.totalMinionsKilled + p.neutralMinionsKilled) / Math.max(m.gameDuration / 60, 1);
  }, 0) / Math.min(sorted.length, 10);

  const patterns: string[] = [];
  if (earlyDeathPct >= 40 && allDeathsTotal >= 5)
    patterns.push(`  - ${earlyDeathPct}% de las muertes ocurren en early game (≤14min) — problema de posicionamiento en línea`);
  if (avgWards < 4)
    patterns.push(`  - Promedio de ${avgWards.toFixed(1)} wards/partida — visión muy baja, especialmente en objetivos`);
  if (avgCs < 6)
    patterns.push(`  - CS/min promedio ${avgCs.toFixed(1)} — por debajo del umbral competitivo (~7.0)`);

  // ── Insights del sistema (analytics) ─────────────────────────────────────
  const insights = data.insights
    .slice(0, 4)
    .map(ins => `  - [${ins.severity.toUpperCase()}] ${ins.title}: ${ins.description}`)
    .join("\n");

  const wins = sorted.filter(m => m.participants?.[m.playerParticipantIndex]?.win).length;
  const winrate = Math.round(wins / sorted.length * 100);

  return `
PERFIL:
- Nombre: ${name} | Rango: ${rank}
- Winrate: ${winrate}% (${sorted.length} partidas) | Forma: ${recentForm}
- CS/min promedio: ${data.csmAverage}

${lastGameStr}

POOL DE CAMPEONES (últimas ${sorted.length} partidas):
${topChamps}

HISTORIAL RECIENTE (${Math.min(sorted.length, 20)} partidas, más reciente primero):
${recentList}

PATRONES DE ERROR DETECTADOS:
${patterns.length > 0 ? patterns.join("\n") : "  Sin patrones críticos detectados con los datos disponibles"}

ANÁLISIS DEL SISTEMA:
${insights || "  Sin datos suficientes aún"}
`.trim();
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un coach experto de League of Legends integrado en Velaris. Tienes acceso al historial real de partidas del jugador incluyendo timestamps exactos de muertes, visión, CS, daño, oro y objetivos.

REGLAS ESTRICTAS:
- Cita SIEMPRE datos concretos: minutos exactos de muerte, CS/min real, KP%, wards colocados. Nunca des consejos genéricos.
- Cuando el jugador pregunte sobre una partida específica, usa los datos de "ÚLTIMA PARTIDA" para explicar exactamente qué pasó y cuándo.
- Si hay timestamps de muertes, úsalos para identificar el patrón: "moriste en el min 3 y 8 seguidos — probablemente dives o mal posicionamiento en early".
- Responde en español. Sin markdown, sin asteriscos, sin listas con guiones. Texto corrido natural.
- Sé directo: máximo 4-5 frases para preguntas simples, más detalle si piden análisis completo.
- Prioriza el 1-2 cambios de mayor impacto según sus datos reales.
- Si algo está bien, reconócelo con el número concreto antes de señalar problemas.
- Si no tienes datos suficientes para algo concreto, dilo honestamente.`;

// ─── Main Chat Function ───────────────────────────────────────────────────────

/**
 * Sends a message to Groq and streams the response.
 * @throws "GROQ_NO_KEY" if no API key is saved
 * @throws "GROQ_INVALID_KEY" if the API key is invalid (401)
 */
export async function sendCoachMessage(
  messages: ChatMessage[],
  matches: MatchData[],
  onStream: StreamCallback,
  onDone: DoneCallback,
  progressSummary?: string,
): Promise<string> {
  const status = checkGroq();

  if (!status.available || !status.apiKey) throw new Error("GROQ_NO_KEY");

  const playerContext = buildPlayerContext(matches);
  const progressBlock = progressSummary
    ? `\n\nSESIONES ANTERIORES DE COACHING:\n${progressSummary}`
    : "";

  // Context always in system prompt so every turn has fresh player data,
  // not just the first message of the session.
  const groqMessages = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n---\n${playerContext}${progressBlock}` },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const resp = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${status.apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: groqMessages,
      stream: true,
      temperature: 0.5,
      max_tokens: 800,
    }),
  });

  if (!resp.ok) {
    if (resp.status === 401) throw new Error("GROQ_INVALID_KEY");
    if (resp.status === 429) throw new Error("GROQ_RATE_LIMIT");
    const text = await resp.text();
    throw new Error(`Groq error ${resp.status}: ${text}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          fullText += delta;
          onStream(delta);
        }
      } catch { /* partial JSON line — skip */ }
    }
  }

  onDone();
  return fullText;
}

// ─── Suggested Questions ──────────────────────────────────────────────────────

// ─── Pre-game Coach Tip ───────────────────────────────────────────────────────

/**
 * Returns a short, actionable pre-game tip for the upcoming matchup.
 * Non-streaming — expects a response of ≤150 tokens.
 *
 * @throws "GROQ_NO_KEY"    if no API key is saved
 * @throws "GROQ_INVALID_KEY" if the key is invalid (401)
 * @throws "GROQ_RATE_LIMIT"  on 429
 */
export async function getPreGameCoachTip(
  myChamp: string,
  enemyChamp: string | undefined,
  matches: MatchData[],
  language: string = "en",
): Promise<string> {
  const status = checkGroq();
  if (!status.available || !status.apiKey) throw new Error("GROQ_NO_KEY");

  // Recent games with my champion (last 5)
  const myGames = matches
    .filter(m => m.participants[m.playerParticipantIndex]?.championName === myChamp)
    .slice(0, 5);

  // Recent games vs the enemy champ (last 5)
  const vsGames = enemyChamp
    ? matches.filter(m => {
        const me = m.participants[m.playerParticipantIndex];
        if (!me) return false;
        return m.participants.some(
          (p: MatchParticipant, i: number) => i !== m.playerParticipantIndex && p.teamId !== me.teamId && p.championName === enemyChamp
        );
      }).slice(0, 5)
    : [];

  const myGamesCtx = myGames.length > 0
    ? myGames.map(m => {
        const p = m.participants[m.playerParticipantIndex]!;
        const dMin = m.gameDuration / 60;
        const cs = ((p.totalMinionsKilled + p.neutralMinionsKilled) / dMin).toFixed(1);
        return `${p.win ? "W" : "L"} ${p.kills}/${p.deaths}/${p.assists} cs/min:${cs}`;
      }).join(", ")
    : `no recent games with ${myChamp}`;

  const vsWins = vsGames.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
  const vsCtx = vsGames.length >= 2
    ? `History vs ${enemyChamp}: ${vsWins}/${vsGames.length} wins`
    : "";

  const lang = language === "es" ? "Spanish" : language === "kr" ? "Korean" : "English";
  const matchupLine = enemyChamp ? `about to play ${myChamp} vs ${enemyChamp} in lane` : `about to play ${myChamp}`;

  const userPrompt = [
    `Pre-game briefing: player is ${matchupLine}.`,
    `Recent ${myChamp} games: ${myGamesCtx}.`,
    vsCtx,
    `Give exactly ONE pre-game tip (2 sentences max). Be specific about this matchup and actionable. No markdown, no lists. Respond in ${lang}.`,
  ].filter(Boolean).join(" ");

  const resp = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${status.apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a concise League of Legends pre-game coach. Give short, specific, actionable pre-game tips. Never use bullet points or markdown.",
        },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      temperature: 0.65,
      max_tokens: 120,
    }),
  });

  if (!resp.ok) {
    if (resp.status === 401) throw new Error("GROQ_INVALID_KEY");
    if (resp.status === 429) throw new Error("GROQ_RATE_LIMIT");
    throw new Error(`Groq error ${resp.status}`);
  }

  const data = await resp.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// ─── Post-Game Note Generator ─────────────────────────────────────────────────

/**
 * Generates a personalized post-game note using AI and streams it back.
 * The note includes: 1 thing done well, 1 concrete error, 1 focus for next game.
 *
 * @throws "GROQ_NO_KEY" / "GROQ_INVALID_KEY" / "GROQ_RATE_LIMIT"
 */
export async function generatePostGameNote(
  match: MatchData,
  onStream: StreamCallback,
  onDone: DoneCallback,
): Promise<string> {
  const status = checkGroq();
  if (!status.available || !status.apiKey) throw new Error("GROQ_NO_KEY");

  const lp = match.participants[match.playerParticipantIndex];
  if (!lp) throw new Error("No player data");

  const dMin = Math.max(match.gameDuration / 60, 1);
  const cs = ((lp.totalMinionsKilled + lp.neutralMinionsKilled) / dMin).toFixed(1);
  const kda = lp.deaths === 0 ? "Perfect" : ((lp.kills + lp.assists) / lp.deaths).toFixed(2);
  const vpm = (lp.visionScore / dMin).toFixed(2);
  const durationStr = `${Math.floor(match.gameDuration / 60)}m${match.gameDuration % 60}s`;
  const teamPlayers = match.participants.filter((p: MatchParticipant) => p.teamId === lp.teamId);
  const teamKills = teamPlayers.reduce((s: number, p: MatchParticipant) => s + p.kills, 0);
  const kp = teamKills > 0 ? Math.round(((lp.kills + lp.assists) / teamKills) * 100) : 0;

  let deathDetail = "";
  if (lp.deathTimestamps && lp.deathTimestamps.length > 0) {
    const ts = [...lp.deathTimestamps].sort((a, b) => a - b);
    deathDetail = `Muertes en los minutos: ${ts.map((t: number) => `${t}'`).join(", ")}. `;
  }

  const context = `Partida: ${lp.win ? "VICTORIA" : "DERROTA"} con ${lp.championName} [${lp.teamPosition ?? "?"}] en ${durationStr}.
KDA: ${lp.kills}/${lp.deaths}/${lp.assists} (ratio ${kda}) | KP: ${kp}% | CS/min: ${cs} | Visión: ${vpm}/min
Daño: ${(lp.totalDamageDealtToChampions / 1000).toFixed(1)}k | Oro: ${(lp.goldEarned / 1000).toFixed(1)}k | Wards: ${lp.wardsPlaced ?? 0} + ${lp.controlWardsPlaced ?? 0} control
${deathDetail}Daño recibido: ${(lp.totalDamageTaken / 1000).toFixed(1)}k | Torres: ${lp.turretKills ?? 0}`;

  const resp = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${status.apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: `Eres un coach de League of Legends. Escribe una nota post-partida personal y específica para el jugador.
Estructura exacta (4-6 frases en texto corrido, sin markdown, sin guiones, sin asteriscos):
- Comienza reconociendo 1 cosa concreta que salió bien (cita el dato).
- Luego identifica el error más importante de la partida (con dato concreto, si hay timestamps de muerte úsalos).
- Cierra con 1 foco de entrenamiento específico para la próxima partida.
Tono: directo, honesto, motivador. En español.`,
        },
        { role: "user", content: context },
      ],
      stream: true,
      temperature: 0.55,
      max_tokens: 350,
    }),
  });

  if (!resp.ok) {
    if (resp.status === 401) throw new Error("GROQ_INVALID_KEY");
    if (resp.status === 429) throw new Error("GROQ_RATE_LIMIT");
    throw new Error(`Groq error ${resp.status}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") break;
      try {
        const json = JSON.parse(raw);
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) { fullText += delta; onStream(delta); }
      } catch { /* partial chunk */ }
    }
  }

  onDone();
  return fullText;
}

export const SUGGESTED_QUESTIONS = [
  "¿Cuál es mi mayor debilidad según mis últimas partidas?",
  "¿Cómo puedo mejorar mi CS/min?",
  "¿Debería cambiar algo en mi pool de campeones?",
  "Analiza mis muertes y dime cómo mejorar mi supervivencia",
  "¿Qué trabajaría esta semana para subir de elo?",
  "¿Cuándo debería roamear y cuándo quedarme en mi línea?",
];
