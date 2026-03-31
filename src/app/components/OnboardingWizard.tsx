/**
 * OnboardingWizard — first-run setup
 *
 * Shown once after install. Guides the user through:
 *   Step 1 — Welcome + LoL detection check
 *   Step 2 — Region selection + finish
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
  Globe,
  Sparkles,
} from "lucide-react";
import { cn } from "./ui/utils";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";
import { loadSettings, saveSettings } from "../services/dataService";
import { useLanguage } from "../contexts/LanguageContext";

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

const TOTAL_STEPS = 2;

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

interface Props {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  // Step 0 state
  const [lcuStatus, setLcuStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");

  // Step 1 state
  const settings = loadSettings();
  const [region, setRegion] = useState(settings.region ?? "euw1");

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  // ── Step 0 helpers ──
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
            {t("onboarding.step").replace("{n}", String(step + 1)).replace("{total}", String(TOTAL_STEPS))}
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
              {step === 1 && <StepRegion region={region} setRegion={setRegion} />}
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
              {t("onboarding.back")}
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
              {t("onboarding.continue")}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 1 && (
            <button
              onClick={finish}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              {t("onboarding.start")}
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
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Cpu className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("onboarding.welcome.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding.welcome.subtitle")}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: t("onboarding.welcome.desc") }}
      />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("onboarding.welcome.detection")}
        </p>
        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
          <div className="flex items-center gap-2.5">
            {lcuStatus === "idle" && <div className="w-2 h-2 rounded-full bg-border" />}
            {lcuStatus === "checking" && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
            {lcuStatus === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {lcuStatus === "fail" && <XCircle className="w-4 h-4 text-rose-400" />}
            <span className="text-sm text-foreground">
              {lcuStatus === "idle" && t("onboarding.welcome.idle")}
              {lcuStatus === "checking" && t("onboarding.welcome.checking")}
              {lcuStatus === "ok" && t("onboarding.welcome.detected")}
              {lcuStatus === "fail" && t("onboarding.welcome.notFound")}
            </span>
          </div>
          {lcuStatus !== "ok" && (
            <button
              onClick={onCheck}
              disabled={lcuStatus === "checking"}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {lcuStatus === "fail" ? t("onboarding.welcome.retry") : t("onboarding.welcome.check")}
            </button>
          )}
        </div>
        {lcuStatus === "fail" && (
          <p className="text-xs text-muted-foreground px-1">
            {t("onboarding.welcome.failHint")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Region ───────────────────────────────────────────────────────────

function StepRegion({
  region,
  setRegion,
}: {
  region: string;
  setRegion: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("onboarding.region.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding.region.subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("onboarding.region.label")}
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
          {t("onboarding.region.done")}
        </p>
      </div>
    </div>
  );
}
