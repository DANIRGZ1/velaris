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
import { computeDashboardData } from "../utils/analytics";
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

  // ── Última partida en detalle ──────────────────────────────────────────────
  const lastMatch = sorted[0];
  const lp = lastMatch?.participants?.[lastMatch.playerParticipantIndex];
  let lastGameStr = "";
  if (lp) {
    const dMin = Math.max(lastMatch.gameDuration / 60, 1);
    const cs = ((lp.totalMinionsKilled + lp.neutralMinionsKilled) / dMin).toFixed(1);
    const kdaRatio = lp.deaths === 0 ? "Perfect" : ((lp.kills + lp.assists) / lp.deaths).toFixed(2);
    const vpm = (lp.visionScore / dMin).toFixed(2);
    const dmgK = (lp.totalDamageDealtToChampions / 1000).toFixed(1);
    const teamKills = lastMatch.participants
      .filter(p => p.teamId === lp.teamId)
      .reduce((s, p) => s + p.kills, 0);
    const kp = teamKills > 0 ? Math.round(((lp.kills + lp.assists) / teamKills) * 100) : 0;
    lastGameStr = `ÚLTIMA PARTIDA:
  Resultado: ${lp.win ? "VICTORIA" : "DERROTA"} — ${lp.championName} [${lp.teamPosition ?? "?"}]
  KDA: ${lp.kills}/${lp.deaths}/${lp.assists} (ratio ${kdaRatio}) | KP: ${kp}%
  CS/min: ${cs} | Vision/min: ${vpm} | Daño: ${dmgK}k`;
  }

  // ── Top campeones jugados ─────────────────────────────────────────────────
  const champMap: Record<string, { games: number; wins: number }> = {};
  for (const m of sorted) {
    const p = m.participants?.[m.playerParticipantIndex];
    if (!p?.championName) continue;
    if (!champMap[p.championName]) champMap[p.championName] = { games: 0, wins: 0 };
    champMap[p.championName].games++;
    if (p.win) champMap[p.championName].wins++;
  }
  const topChamps = Object.entries(champMap)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 5)
    .map(([n, s]) => `  ${n}: ${s.games}P  ${Math.round(s.wins / s.games * 100)}% WR`)
    .join("\n");

  // ── Forma reciente (últimas 10) ───────────────────────────────────────────
  const last10 = sorted.slice(0, 10);
  const last10Wins = last10.filter(m => m.participants?.[m.playerParticipantIndex]?.win).length;
  const recentForm = `${last10Wins}V-${last10.length - last10Wins}D últimas ${last10.length}`;

  // ── Lista de últimas 15 partidas ──────────────────────────────────────────
  const recentList = sorted.slice(0, 15).map((m, i) => {
    const p = m.participants?.[m.playerParticipantIndex];
    if (!p) return null;
    const dMin = Math.max(m.gameDuration / 60, 1);
    const cs = ((p.totalMinionsKilled + p.neutralMinionsKilled) / dMin).toFixed(1);
    const kda = p.deaths === 0 ? "Perfect" : ((p.kills + p.assists) / p.deaths).toFixed(2);
    return `  ${i + 1}. ${p.win ? "WIN" : "LOSS"} ${p.championName ?? "?"} [${p.teamPosition ?? "?"}] ${p.kills}/${p.deaths}/${p.assists} KDA:${kda} CS/min:${cs}`;
  }).filter(Boolean).join("\n");

  // ── Insights / debilidades ────────────────────────────────────────────────
  const insights = data.insights
    .slice(0, 3)
    .map(ins => `  - [${ins.severity.toUpperCase()}] ${ins.title}: ${ins.description}`)
    .join("\n");

  const wins = sorted.filter(m => m.participants?.[m.playerParticipantIndex]?.win).length;
  const winrate = Math.round(wins / sorted.length * 100);

  return `
PERFIL DEL JUGADOR:
- Nombre: ${name}
- Rango: ${rank}
- Winrate global: ${winrate}% (${sorted.length} partidas analizadas)
- Forma reciente: ${recentForm}
- CS/min promedio: ${data.csmAverage}

${lastGameStr}

CAMPEONES MÁS JUGADOS:
${topChamps}

ÚLTIMAS ${Math.min(sorted.length, 15)} PARTIDAS (de más reciente a menos):
${recentList}

PROBLEMAS DETECTADOS POR EL SISTEMA:
${insights || "  Sin datos suficientes aún"}
`.trim();
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un coach experto de League of Legends integrado en Velaris. Tienes acceso al historial real de partidas del jugador, mostrado a continuación.

REGLAS ESTRICTAS:
- Cita SIEMPRE datos concretos del historial: campeones jugados, KDA, CS/min, winrate. Nunca des consejos genéricos que podrían aplicarse a cualquier jugador.
- Responde en español. Sin markdown, sin asteriscos, sin listas con guiones. Texto corrido natural.
- Sé directo: máximo 4-5 frases salvo que pidan análisis en profundidad.
- Prioriza el 1-2 cambios de mayor impacto para subir de elo según sus datos específicos.
- Si el jugador tiene buenos números en algo, reconócelo antes de señalar problemas.
- Si no tienes suficientes datos para responder algo concreto, dilo honestamente en lugar de inventar.`;

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
): Promise<string> {
  const status = checkGroq();

  if (!status.available || !status.apiKey) throw new Error("GROQ_NO_KEY");

  const playerContext = buildPlayerContext(matches);

  // Context always in system prompt so every turn has fresh player data,
  // not just the first message of the session.
  const groqMessages = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n---\n${playerContext}` },
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
          (p, i) => i !== m.playerParticipantIndex && p.teamId !== me.teamId && p.championName === enemyChamp
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

export const SUGGESTED_QUESTIONS = [
  "¿Cuál es mi mayor debilidad según mis últimas partidas?",
  "¿Cómo puedo mejorar mi CS/min?",
  "¿Debería cambiar algo en mi pool de campeones?",
  "Analiza mis muertes y dime cómo mejorar mi supervivencia",
  "¿Qué trabajaría esta semana para subir de elo?",
  "¿Cuándo debería roamear y cuándo quedarme en mi línea?",
];
