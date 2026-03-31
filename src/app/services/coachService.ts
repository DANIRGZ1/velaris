/**
 * AI Coach Service — Velaris
 *
 * Uses Ollama (https://ollama.com) for local, free, private AI coaching.
 * Ollama runs on localhost:11434 — no API key, no internet, no cost.
 *
 * Preferred models (in order): llama3.2, llama3.1, mistral, qwen2.5, gemma2
 * The service auto-detects which models are installed and picks the best one.
 */

import { type MatchData } from "./dataService";
import { computeDashboardData } from "../utils/analytics";
import { getStoredIdentity } from "./dataService";

// ─── Config ───────────────────────────────────────────────────────────────────

const OLLAMA_BASE = "http://localhost:11434";

const MODEL_PRIORITY = [
  "llama3.2", "llama3.1", "llama3",
  "mistral", "mixtral",
  "qwen2.5", "qwen2",
  "gemma2", "gemma",
  "phi3", "phi",
  "deepseek-r1",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type StreamCallback = (delta: string) => void;
export type DoneCallback = () => void;

export interface OllamaStatus {
  available: boolean;
  models: string[];
  bestModel: string | null;
}

// ─── Ollama Detection ─────────────────────────────────────────────────────────

let _cachedStatus: OllamaStatus | null = null;

export async function checkOllama(forceRefresh = false): Promise<OllamaStatus> {
  if (_cachedStatus && !forceRefresh) return _cachedStatus;

  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!resp.ok) {
      _cachedStatus = { available: false, models: [], bestModel: null };
      return _cachedStatus;
    }

    const data = await resp.json();
    const models: string[] = (data.models ?? []).map((m: any) =>
      // Strip tag suffix: "llama3.2:latest" → "llama3.2"
      (m.name as string).split(":")[0]
    );

    // Pick best available model
    let bestModel: string | null = null;
    for (const preferred of MODEL_PRIORITY) {
      const found = models.find(m => m.toLowerCase().startsWith(preferred.toLowerCase()));
      if (found) { bestModel = found; break; }
    }
    // Fallback to whatever is installed
    if (!bestModel && models.length > 0) bestModel = models[0];

    _cachedStatus = { available: true, models, bestModel };
    return _cachedStatus;
  } catch {
    _cachedStatus = { available: false, models: [], bestModel: null };
    return _cachedStatus;
  }
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
 * Sends a message to Ollama and streams the response.
 * @throws "OLLAMA_UNAVAILABLE" if Ollama is not running
 * @throws "NO_MODELS" if Ollama is running but no models are installed
 */
export async function sendCoachMessage(
  messages: ChatMessage[],
  matches: MatchData[],
  onStream: StreamCallback,
  onDone: DoneCallback,
): Promise<string> {
  const status = await checkOllama(false);

  if (!status.available) throw new Error("OLLAMA_UNAVAILABLE");
  if (!status.bestModel) throw new Error("NO_MODELS");

  const playerContext = buildPlayerContext(matches);

  // Inject player context into the first user message
  const ollamaMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m, i) => ({
      role: m.role,
      content: i === 0 && m.role === "user"
        ? `[CONTEXTO]\n${playerContext}\n\n[PREGUNTA]\n${m.content}`
        : m.content,
    })),
  ];

  const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: status.bestModel,
      messages: ollamaMessages,
      stream: true,
      options: {
        temperature: 0.7,
        num_predict: 512,
      },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Ollama error ${resp.status}: ${await resp.text()}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        const delta = json.message?.content ?? "";
        if (delta) {
          fullText += delta;
          onStream(delta);
        }
        if (json.done) break;
      } catch { /* partial JSON line — skip */ }
    }
  }

  onDone();
  return fullText;
}

// ─── Suggested Questions ──────────────────────────────────────────────────────

export const SUGGESTED_QUESTIONS = [
  "¿Cuál es mi mayor debilidad según mis últimas partidas?",
  "¿Cómo puedo mejorar mi CS/min?",
  "¿Debería cambiar algo en mi pool de campeones?",
  "Analiza mis muertes y dime cómo mejorar mi supervivencia",
  "¿Qué trabajaría esta semana para subir de elo?",
  "¿Cuándo debería roamear y cuándo quedarme en mi línea?",
];
