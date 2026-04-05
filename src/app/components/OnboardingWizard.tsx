/**
 * OnboardingWizard — first-run setup (single unified flow)
 *
 * Replaces the old OnboardingWizard (2 steps) and SetupWizard (3 steps, Spanish-only).
 * Shown once after install. Steps:
 *   0 — Welcome + LoL client detection
 *   1 — Region selection
 *   2 — Main role + daily LP goal
 *
 * On completion:
 *   - Saves region, role, LP goal to localStorage
 *   - Marks both "velaris-onboarded" and "velaris-setup-done" to prevent any
 *     legacy duplicate wizards from showing
 *   - Dispatches "velaris:wizard-complete" so OnboardingTour can start
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
  Swords,
  Target,
  Sparkles,
  Check,
  BarChart2,
  Bot,
  TrendingUp,
  Monitor,
} from "lucide-react";
import { cn } from "./ui/utils";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";
import { loadSettings, saveSettings } from "../services/dataService";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONS = [
  { value: "euw1",  label: "EUW",  name: "Europe West" },
  { value: "eun1",  label: "EUNE", name: "Europe Nordic & East" },
  { value: "na1",   label: "NA",   name: "North America" },
  { value: "la1",   label: "LAN",  name: "Latin America North" },
  { value: "la2",   label: "LAS",  name: "Latin America South" },
  { value: "br1",   label: "BR",   name: "Brazil" },
  { value: "kr",    label: "KR",   name: "Korea" },
  { value: "jp1",   label: "JP",   name: "Japan" },
  { value: "oc1",   label: "OCE",  name: "Oceania" },
  { value: "tr1",   label: "TR",   name: "Turkey" },
  { value: "ru",    label: "RU",   name: "Russia" },
];

const ROLES = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;
type Role = typeof ROLES[number];

const ROLE_LABEL_KEYS: Record<Role, string> = {
  TOP: "onboarding.role.top",
  JGL: "onboarding.role.jgl",
  MID: "onboarding.role.mid",
  ADC: "onboarding.role.adc",
  SUP: "onboarding.role.sup",
};

const TOTAL_STEPS = 3;

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center:                  { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// ─── Persistence helpers ───────────────────────────────────────────────────────

const IDENTITY_KEY  = "velaris-identity";
const GOAL_KEY      = "velaris-daily-lp-goal";
const ROLE_KEY      = "velaris-main-role";

function persist(region: string, role: string, lpGoal: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? "{}");
    localStorage.setItem(IDENTITY_KEY, JSON.stringify({ ...existing, region }));
    localStorage.setItem(GOAL_KEY, lpGoal);
    localStorage.setItem(ROLE_KEY, role);
    // Mark both legacy keys so no duplicate wizard fires
    localStorage.setItem("velaris-onboarded", "1");
    localStorage.setItem("velaris-setup-done", "1");
  } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [dir,  setDir]  = useState(1);

  // Step 0
  const [lcuStatus, setLcuStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");

  // Step 1
  const [region, setRegion] = useState(loadSettings().region ?? "euw1");

  // Step 2
  const [role,   setRole]   = useState<Role>("MID");
  const [lpGoal, setLpGoal] = useState("50");

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  // ── Step 0: detect LoL client ──
  const checkLoL = async () => {
    setLcuStatus("checking");
    if (!IS_TAURI) { setLcuStatus("ok"); return; }
    try {
      await tauriInvoke("get_lcu_phase");
      setLcuStatus("ok");
    } catch {
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
    persist(region, role, lpGoal);
    // Also persist region into settings if field exists
    try {
      const s = loadSettings();
      saveSettings({ ...s, region } as typeof s);
    } catch {}
    onComplete();
    // Give the exit animation ~600 ms before starting the tour
    setTimeout(() => window.dispatchEvent(new CustomEvent("velaris:wizard-complete")), 600);
  };

  const selectedRegion = REGIONS.find(r => r.value === region);

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

        {/* Step counter + dots */}
        <div className="px-6 pt-5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
            {t("onboarding.step")
              .replace("{n}", String(step + 1))
              .replace("{total}", String(TOTAL_STEPS))}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i < step
                    ? "w-1.5 h-1.5 bg-primary/60"
                    : i === step
                    ? "w-4 h-1.5 bg-primary"
                    : "w-1.5 h-1.5 bg-border"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="px-6 py-5 flex flex-col"
            >
              {step === 0 && (
                <StepWelcome lcuStatus={lcuStatus} onCheck={checkLoL} />
              )}
              {step === 1 && (
                <StepRegion
                  region={region}
                  setRegion={setRegion}
                  selectedRegion={selectedRegion}
                />
              )}
              {step === 2 && (
                <StepProfile
                  role={role}
                  setRole={setRole}
                  lpGoal={lpGoal}
                  setLpGoal={setLpGoal}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-border/40 pt-4">
          {step > 0 ? (
            <button
              onClick={() => goTo(step - 1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("onboarding.back")}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => { persist(region, role, lpGoal); onComplete(); }}
              className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
            >
              {t("onboarding.skip")}
            </button>

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => goTo(step + 1)}
                disabled={lcuStatus === "checking"}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {t("onboarding.continue")}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {t("onboarding.start")}
              </button>
            )}
          </div>
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
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Cpu className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("onboarding.welcome.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding.welcome.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {([
          { icon: BarChart2, key: "onboarding.features.stats",    color: "text-sky-400",     bg: "bg-sky-500/10" },
          { icon: Bot,       key: "onboarding.features.coach",   color: "text-violet-400",  bg: "bg-violet-500/10" },
          { icon: TrendingUp,key: "onboarding.features.tracker", color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { icon: Monitor,   key: "onboarding.features.overlay", color: "text-amber-400",   bg: "bg-amber-500/10" },
        ] as const).map(({ icon: Icon, key, color, bg }) => (
          <div key={key} className={`flex items-start gap-2.5 rounded-xl border border-border/30 ${bg} px-3 py-2.5`}>
            <Icon className={`w-3.5 h-3.5 ${color} shrink-0 mt-0.5`} />
            <span className="text-[11px] text-muted-foreground leading-snug">{t(key)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("onboarding.welcome.detection")}
        </p>
        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
          <div className="flex items-center gap-2.5">
            {lcuStatus === "idle"     && <div className="w-2 h-2 rounded-full bg-border" />}
            {lcuStatus === "checking" && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
            {lcuStatus === "ok"       && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {lcuStatus === "fail"     && <XCircle className="w-4 h-4 text-rose-400" />}
            <span className="text-sm text-foreground">
              {lcuStatus === "idle"     && t("onboarding.welcome.idle")}
              {lcuStatus === "checking" && t("onboarding.welcome.checking")}
              {lcuStatus === "ok"       && t("onboarding.welcome.detected")}
              {lcuStatus === "fail"     && t("onboarding.welcome.notFound")}
            </span>
          </div>
          {lcuStatus !== "ok" && (
            <button
              onClick={onCheck}
              disabled={lcuStatus === "checking"}
              className="text-xs text-primary hover:underline disabled:opacity-50 cursor-pointer"
            >
              {lcuStatus === "fail" ? t("onboarding.welcome.retry") : t("onboarding.welcome.check")}
            </button>
          )}
        </div>
        {lcuStatus === "fail" && (
          <p className="text-xs text-muted-foreground px-1">{t("onboarding.welcome.failHint")}</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Region ───────────────────────────────────────────────────────────

function StepRegion({
  region,
  setRegion,
  selectedRegion,
}: {
  region: string;
  setRegion: (v: string) => void;
  selectedRegion: typeof REGIONS[number] | undefined;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("onboarding.region.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding.region.subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {REGIONS.map(r => (
          <button
            key={r.value}
            onClick={() => setRegion(r.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-[13px] font-semibold border transition-all cursor-pointer",
              region === r.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/60 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {selectedRegion && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400/90">
            <span className="font-semibold">{selectedRegion.label}</span> — {selectedRegion.name}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Role + LP goal ───────────────────────────────────────────────────

function StepProfile({
  role,
  setRole,
  lpGoal,
  setLpGoal,
}: {
  role: Role;
  setRole: (v: Role) => void;
  lpGoal: string;
  setLpGoal: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Swords className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("onboarding.profile.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding.profile.subtitle")}</p>
        </div>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("onboarding.profile.role")}
        </p>
        <div className="flex gap-2">
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                role === r
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-secondary/50 border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {role === r && <Check className="w-3 h-3 shrink-0" />}
              {t(ROLE_LABEL_KEYS[r])}
            </button>
          ))}
        </div>
      </div>

      {/* LP goal */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3 h-3" />
          {t("onboarding.profile.goal")}
        </p>
        <div className="flex items-center gap-2">
          {["25", "50", "75", "100"].map(v => (
            <button
              key={v}
              onClick={() => setLpGoal(v)}
              className={cn(
                "flex-1 h-11 rounded-xl text-[15px] font-mono font-bold border transition-all cursor-pointer",
                lpGoal === v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/60 border-border/50 text-foreground hover:border-primary/40"
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[12px] text-muted-foreground">{t("onboarding.profile.goalCustom")}</span>
          <input
            type="number"
            value={lpGoal}
            onChange={e => setLpGoal(e.target.value)}
            min="1"
            max="500"
            className="w-20 text-center text-[14px] font-mono font-bold bg-secondary/40 border border-border/60 rounded-xl px-2 py-1.5 focus:outline-none focus:border-primary text-foreground"
          />
          <span className="text-[12px] text-muted-foreground">LP</span>
        </div>
      </div>
    </div>
  );
}
