/**
 * SetupWizard — First-launch 3-step setup flow
 *
 * Appears once when the user opens Velaris for the very first time.
 * Collects: region, main role, daily LP goal.
 * Saves preferences to localStorage and marks wizard as completed.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, MapPin, Swords, Target, Check, Sparkles } from "lucide-react";
import { cn } from "./ui/utils";

const WIZARD_KEY = "velaris-setup-done";
const REGION_KEY = "velaris-identity";
const GOAL_KEY = "velaris-daily-lp-goal";
const ROLE_KEY = "velaris-main-role";

const REGIONS = ["EUW", "EUNE", "NA", "KR", "BR", "LAN", "LAS", "OCE", "TR", "RU", "JP"];
const ROLES = ["TOP", "JGL", "MID", "ADC", "SUP"];
const ROLE_LABELS: Record<string, string> = {
  TOP: "Top", JGL: "Jungle", MID: "Mid", ADC: "Bot/ADC", SUP: "Support",
};

function isSetupDone(): boolean {
  try { return localStorage.getItem(WIZARD_KEY) === "1"; } catch { return true; }
}

function markSetupDone() {
  try { localStorage.setItem(WIZARD_KEY, "1"); } catch {}
}

export function SetupWizard() {
  const [show, setShow] = useState(() => !isSetupDone());
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState("EUW");
  const [role, setRole] = useState("MID");
  const [lpGoal, setLpGoal] = useState("50");
  const [done, setDone] = useState(false);

  // Auto-dismiss after showing the "¡Todo listo!" confirmation
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setShow(false), 1800);
      return () => clearTimeout(t);
    }
  }, [done]);

  if (!show) return null;

  const handleFinish = () => {
    try {
      const existing = JSON.parse(localStorage.getItem(REGION_KEY) ?? "{}");
      localStorage.setItem(REGION_KEY, JSON.stringify({ ...existing, region }));
      localStorage.setItem(GOAL_KEY, lpGoal);
      localStorage.setItem(ROLE_KEY, role);
    } catch {}
    markSetupDone();
    setDone(true);
  };

  const steps = [
    {
      icon: MapPin,
      title: "¿En qué servidor juegas?",
      subtitle: "Usaremos esto para buscar tu cuenta automáticamente",
      content: (
        <div className="flex flex-wrap gap-2 justify-center">
          {REGIONS.map(r => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={cn(
                "px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all cursor-pointer",
                region === r
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: Swords,
      title: "¿Cuál es tu rol principal?",
      subtitle: "Personalizaremos el análisis y sugerencias para tu posición",
      content: (
        <div className="flex flex-col gap-2 w-full">
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "w-full py-3 px-5 rounded-xl text-[14px] font-semibold border transition-all cursor-pointer text-left flex items-center gap-3",
                role === r
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-secondary/50 border-border/40 text-foreground hover:bg-secondary"
              )}
            >
              {role === r && <Check className="w-4 h-4 shrink-0" />}
              {role !== r && <div className="w-4" />}
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: Target,
      title: "¿Cuánto LP quieres ganar hoy?",
      subtitle: "Te mostraremos tu progreso diario en la barra lateral",
      content: (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex items-center gap-3">
            {["25", "50", "75", "100"].map(v => (
              <button
                key={v}
                onClick={() => setLpGoal(v)}
                className={cn(
                  "w-16 h-16 rounded-2xl text-[18px] font-mono font-bold border transition-all cursor-pointer",
                  lpGoal === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary border-border/50 text-foreground hover:border-primary/40"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">O escribe tu meta:</span>
            <input
              type="number"
              value={lpGoal}
              onChange={e => setLpGoal(e.target.value)}
              min="1"
              max="500"
              className="w-20 text-center text-[16px] font-mono font-bold bg-background border border-border/60 rounded-xl px-2 py-1.5 focus:outline-none focus:border-primary"
            />
            <span className="text-[13px] text-muted-foreground">LP</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const Icon = current?.icon ?? Sparkles;

  return (
    <div className="fixed inset-0 z-[9998] bg-background/98 backdrop-blur-sm flex items-center justify-center">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-[24px] font-bold text-foreground">¡Todo listo!</h2>
            <p className="text-muted-foreground text-[14px]">Velaris está configurado. Buena suerte en ranked.</p>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md w-full mx-6 flex flex-col items-center gap-6"
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === step ? "w-6 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/50" : "w-2 h-2 bg-border"
                  )}
                />
              ))}
            </div>

            {/* Icon + Title */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-[22px] font-bold text-foreground mb-1">{current.title}</h2>
              <p className="text-[13px] text-muted-foreground">{current.subtitle}</p>
            </div>

            {/* Content */}
            <div className="w-full">{current.content}</div>

            {/* Navigation */}
            <div className="flex items-center gap-3 w-full">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-border/50 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer"
                >
                  Atrás
                </button>
              )}
              <button
                onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : handleFinish()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                {step < steps.length - 1 ? (
                  <>Siguiente <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>Empezar <Sparkles className="w-4 h-4" /></>
                )}
              </button>
            </div>

            {/* Skip */}
            <button
              onClick={() => { markSetupDone(); setDone(true); }}
              className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
            >
              Saltar configuración
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
