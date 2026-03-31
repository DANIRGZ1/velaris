/**
 * OnboardingWizard — first-run setup
 *
 * Shown once after install. Guides the user through:
 *   Step 1 — Welcome + LoL detection check
 *   Step 2 — Riot API key (optional but recommended)
 *   Step 3 — Region selection + finish
 *
 * Stores completion in localStorage under "velaris-onboarded".
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  Key,
  Globe,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { cn } from "./ui/utils";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";
import { loadSettings, saveSettings } from "../services/dataService";

const REGIONS = [
  { value: "euw1", label: "EUW — Europe West" },
  { value: "eun1", label: "EUNE — Europe Nordic & East" },
  { value: "na1",  label: "NA — North America" },
  { value: "la1",  label: "LAN — Latin America North" },
  { value: "la2",  label: "LAS — Latin America South" },
  { value: "br1",  label: "BR — Brazil" },
  { value: "kr",   label: "KR — Korea" },
  { value: "jp1",  label: "JP — Japan" },
  { value: "oc1",  label: "OCE — Oceania" },
  { value: "tr1",  label: "TR — Turkey" },
  { value: "ru",   label: "RU — Russia" },
];

const TOTAL_STEPS = 3;

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

interface Props {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  // Step 1 state
  const [lcuStatus, setLcuStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");

  // Step 2 state
  const [apiKey, setApiKey] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Step 3 state
  const settings = loadSettings();
  const [region, setRegion] = useState(settings.region ?? "euw1");

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  // ── Step 1 helpers ──
  const checkLoL = async () => {
    setLcuStatus("checking");
    if (!IS_TAURI) { setLcuStatus("ok"); return; }
    try {
      await tauriInvoke("get_lcu_phase");
      setLcuStatus("ok");
    } catch {
      // Phase error means client not open, but lockfile detection still works
      // Try a lighter check via get_current_summoner
      try {
        await tauriInvoke("get_current_summoner");
        setLcuStatus("ok");
      } catch {
        setLcuStatus("fail");
      }
    }
  };

  // ── Step 2 helpers ──
  const saveApiKey = async () => {
    if (!apiKey.trim()) { goTo(2); return; }
    setApiKeyStatus("saving");
    if (IS_TAURI) {
      try { await tauriInvoke("save_riot_api_key", { key: apiKey.trim() }); } catch { /* ignore */ }
    }
    setApiKeyStatus("saved");
    setTimeout(() => goTo(2), 600);
  };

  // ── Finish ──
  const finish = () => {
    const s = loadSettings();
    saveSettings({ ...s, region });
    localStorage.setItem("velaris-onboarded", "1");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg mx-4 rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-border/40 w-full">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Step counter */}
        <div className="px-6 pt-5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
            Paso {step + 1} de {TOTAL_STEPS}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                  i <= step ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative h-80 overflow-hidden">
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 px-6 py-5 flex flex-col"
            >
              {step === 0 && <StepWelcome lcuStatus={lcuStatus} onCheck={checkLoL} />}
              {step === 1 && <StepApiKey apiKey={apiKey} setApiKey={setApiKey} apiKeyStatus={apiKeyStatus} />}
              {step === 2 && <StepRegion region={region} setRegion={setRegion} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-border/40 pt-4">
          {step > 0 ? (
            <button
              onClick={() => goTo(step - 1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>
          ) : (
            <div />
          )}

          {step === 0 && (
            <button
              onClick={() => goTo(1)}
              disabled={lcuStatus === "checking"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 1 && (
            <button
              onClick={saveApiKey}
              disabled={apiKeyStatus === "saving"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {apiKeyStatus === "saving" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              ) : (
                <>{apiKey.trim() ? "Guardar y continuar" : "Omitir"}<ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={finish}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              Empezar
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Step 0: Welcome + LoL detection ─────────────────────────────────────────

function StepWelcome({
  lcuStatus,
  onCheck,
}: {
  lcuStatus: "idle" | "checking" | "ok" | "fail";
  onCheck: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Cpu className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Bienvenido a Velaris</h2>
          <p className="text-sm text-muted-foreground">Configuremos todo en 1 minuto</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Velaris se conecta al cliente de League of Legends a través de la API local para mostrarte
        estadísticas, runas recomendadas y datos en partida. <strong className="text-foreground">No lee memoria del juego</strong> ni
        accede a ningún archivo protegido.
      </p>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Detección del cliente
        </p>
        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
          <div className="flex items-center gap-2.5">
            {lcuStatus === "idle" && <div className="w-2 h-2 rounded-full bg-border" />}
            {lcuStatus === "checking" && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
            {lcuStatus === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {lcuStatus === "fail" && <XCircle className="w-4 h-4 text-rose-400" />}
            <span className="text-sm text-foreground">
              {lcuStatus === "idle" && "League of Legends"}
              {lcuStatus === "checking" && "Buscando el cliente…"}
              {lcuStatus === "ok" && "Cliente detectado ✓"}
              {lcuStatus === "fail" && "Cliente no encontrado"}
            </span>
          </div>
          {lcuStatus !== "ok" && (
            <button
              onClick={onCheck}
              disabled={lcuStatus === "checking"}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {lcuStatus === "fail" ? "Reintentar" : "Comprobar"}
            </button>
          )}
        </div>
        {lcuStatus === "fail" && (
          <p className="text-xs text-muted-foreground px-1">
            Abre el cliente de League of Legends y pulsa Reintentar. También puedes continuar ahora
            y Velaris se conectará automáticamente cuando lo abras.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Riot API Key ─────────────────────────────────────────────────────

function StepApiKey({
  apiKey,
  setApiKey,
  apiKeyStatus,
}: {
  apiKey: string;
  setApiKey: (v: string) => void;
  apiKeyStatus: "idle" | "saving" | "saved";
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Key className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Riot API Key</h2>
          <p className="text-sm text-muted-foreground">Opcional — para buscar jugadores</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Sin API key, el historial de partidas y los datos de perfil se cargan desde el cliente
        local. Con una API key puedes además buscar cualquier jugador por nombre.
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tu API Key (RGAPI-…)
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <a
          href="https://developer.riotgames.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline w-fit"
        >
          <ExternalLink className="w-3 h-3" />
          Obtener una API key gratuita en developer.riotgames.com
        </a>
      </div>

      {apiKeyStatus === "saved" && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          API key guardada
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Region ───────────────────────────────────────────────────────────

function StepRegion({
  region,
  setRegion,
}: {
  region: string;
  setRegion: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Tu región</h2>
          <p className="text-sm text-muted-foreground">Para buscar partidas y jugadores</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Servidor
        </label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-400/90 leading-relaxed">
          Todo listo. Puedes cambiar la región en cualquier momento desde <strong>Ajustes</strong>.
        </p>
      </div>
    </div>
  );
}
