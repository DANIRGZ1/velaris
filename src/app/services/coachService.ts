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

  const data = computeDashboardData(
    matches,
    identity?.rank ?? "EMERALD",
    identity?.name ?? "Invocador",
  );

  const recent = matches.slice(0, 15).map((m, i) => {
    const p = m.participants?.find(
      x => x.summonerName?.toLowerCase() === identity?.name?.toLowerCase()
    ) ?? m.participants?.[0];
    if (!p) return null;
    const durationMin = m.gameDuration / 60;
    const cs = ((p.totalMinionsKilled + p.neutralMinionsKilled) / durationMin).toFixed(1);
    const kda = p.deaths === 0
      ? "Perfect"
      : ((p.kills + p.assists) / p.deaths).toFixed(2);
    return `  ${i + 1}. ${p.win ? "WIN" : "LOSS"} ${p.championName ?? "?"} — ${p.kills}/${p.deaths}/${p.assists} KDA:${kda} CS/min:${cs} [${p.teamPosition ?? "?"}]`;
  }).filter(Boolean).join("\n");

  const insights = data.insights
    .slice(0, 4)
    .map(ins => `  - [${ins.severity.toUpperCase()}] ${ins.title}: ${ins.description}`)
    .join("\n");

  const wins = matches.filter(m =>
    m.participants?.find(p =>
      p.summonerName?.toLowerCase() === identity?.name?.toLowerCase()
    )?.win
  ).length;
  const winrate = Math.round(wins / matches.length * 100);

  return `
DATOS DEL JUGADOR:
- Nombre: ${name}
- Rango: ${rank}
- Winrate (${matches.length} partidas): ${winrate}%
- CS/min promedio: ${data.csmAverage}

ÚLTIMAS ${Math.min(matches.length, 15)} PARTIDAS:
${recent}

DEBILIDADES DETECTADAS:
${insights}
`.trim();
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un coach de League of Legends integrado en Velaris, una app de análisis de rendimiento para jugadores ranked.

Tu rol:
- Usar los datos REALES del jugador para dar consejos específicos, no genéricos
- Ser directo y conciso — máximo 3-4 frases por respuesta salvo que pidan más detalle
- Priorizar el 1-2 cambios que más impacto tendrán en su elo
- Usar terminología de LoL naturalmente (wave management, roam timing, vision control, etc.)
- Si algo está bien, reconócerlo antes de señalar problemas

Responde siempre en español. Sé conversacional pero preciso. No uses markdown ni asteriscos.`;

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

  const groqMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m, i) => ({
      role: m.role,
      content: i === 0 && m.role === "user"
        ? `[CONTEXTO]\n${playerContext}\n\n[PREGUNTA]\n${m.content}`
        : m.content,
    })),
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
      temperature: 0.7,
      max_tokens: 512,
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
