import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { useLanguage } from "../contexts/LanguageContext";

export type OnboardingStep = {
  id: string;
  targetId?: string;   // matches [data-tour="<id>"]
  titleKey: string;
  textKey: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

// ─── Tour steps ───────────────────────────────────────────────────────────────
// Spotlight steps must have a matching data-tour attribute in the Layout sidebar.
// data-tour ids used: step-2 (dashboard), step-3 (champ-select),
//                     step-4 (live-game),  step-5 (profile), step-6 (matches)
//                     step-7 (goals)

const STEPS: OnboardingStep[] = [
  {
    id: "step-welcome",
    titleKey: "tour.welcome",
    textKey: "tour.welcomeText",
    position: "center",
  },
  {
    id: "step-2",
    targetId: "step-2",
    titleKey: "tour.overview",
    textKey: "tour.overviewText",
    position: "right",
  },
  {
    id: "step-3",
    targetId: "step-3",
    titleKey: "tour.draft",
    textKey: "tour.draftText",
    position: "right",
  },
  {
    id: "step-4",
    targetId: "step-4",
    titleKey: "tour.realtime",
    textKey: "tour.realtimeText",
    position: "right",
  },
  {
    id: "step-5",
    targetId: "step-5",
    titleKey: "tour.progress",
    textKey: "tour.progressText",
    position: "right",
  },
  {
    id: "step-6",
    targetId: "step-6",
    titleKey: "tour.improve",
    textKey: "tour.improveText",
    position: "right",
  },
  {
    id: "step-7",
    targetId: "step-7",
    titleKey: "tour.goals",
    textKey: "tour.goalsText",
    position: "right",
  },
  {
    id: "step-final",
    titleKey: "tour.ready",
    textKey: "tour.readyText",
    position: "center",
  },
];

// Spotlight steps only (non-center), used for the step counter
const SPOTLIGHT_COUNT = STEPS.filter(s => s.position !== "center").length;

declare global {
  interface Window {
    __TAURI__?: { core?: { invoke?: (cmd: string) => Promise<void> } };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingTour() {
  const [isActive,     setIsActive]     = useState(false);
  const [currentStep,  setCurrentStep]  = useState(0);
  const [targetRect,   setTargetRect]   = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // ── Trigger: fires only after the setup wizard completes ──────────────────
  // Two cases:
  //   a) Fresh install — wizard fires "velaris:wizard-complete" event on finish.
  //      We listen for that event and start the tour.
  //   b) Edge case: wizard was already done in a previous session but tour was
  //      never seen (e.g. user cleared only one key). Start after 800 ms.
  useEffect(() => {
    if (localStorage.getItem("velaris-onboarding-done")) return;

    const start = async () => {
      try {
        await window.__TAURI__?.core?.invoke?.("focus_main_window");
      } catch {}
      setIsActive(true);
      navigate("/dashboard");
    };

    // Edge case: wizard already completed in a prior session
    if (localStorage.getItem("velaris-onboarded") === "1") {
      const timer = setTimeout(start, 800);
      return () => clearTimeout(timer);
    }

    // Normal case: wait for the wizard to fire the event
    window.addEventListener("velaris:wizard-complete", start, { once: true });
    return () => window.removeEventListener("velaris:wizard-complete", start);
  }, [navigate]);

  const step = STEPS[currentStep];

  // ── Spotlight: measure the target element ────────────────────────────────
  const measureTarget = useCallback(() => {
    if (!step?.targetId) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.targetId}"]`);
    if (!el) { setTargetRect(null); return; }
    const rect = el.getBoundingClientRect();
    setTargetRect(prev => {
      if (
        prev &&
        Math.abs(prev.top    - rect.top)    < 1 &&
        Math.abs(prev.left   - rect.left)   < 1 &&
        Math.abs(prev.width  - rect.width)  < 1 &&
        Math.abs(prev.height - rect.height) < 1
      ) return prev;
      return rect;
    });
  }, [step]);

  useEffect(() => {
    if (!isActive) return;
    measureTarget();
    window.addEventListener("resize", measureTarget);
    const interval = setInterval(measureTarget, 500);
    return () => {
      window.removeEventListener("resize", measureTarget);
      clearInterval(interval);
    };
  }, [isActive, measureTarget]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
    else handleComplete();
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };
  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem("velaris-onboarding-done", "true");
    navigate("/dashboard");
  };

  if (!isActive) return null;

  const isCenter    = step.position === "center";
  const showSpot    = !isCenter && targetRect !== null;

  // ── Tooltip positioning ───────────────────────────────────────────────────
  type ArrowSide = "left" | "right" | "top" | "bottom";
  let tooltipStyle: React.CSSProperties = {};
  let resolvedSide: ArrowSide = "left";

  if (showSpot && targetRect) {
    const GAP = 16, TW = 320, TH = 200;
    const cx = targetRect.left + targetRect.width  / 2;
    const cy = targetRect.top  + targetRect.height / 2;

    if (step.position === "right") {
      const left = targetRect.right + GAP;
      if (left + TW <= window.innerWidth - 12) {
        resolvedSide = "left";
        tooltipStyle = { top: cy, left, transform: "translateY(-50%)" };
      } else if (targetRect.bottom + GAP + TH <= window.innerHeight) {
        resolvedSide = "top";
        tooltipStyle = { top: targetRect.bottom + GAP, left: cx, transform: "translateX(-50%)" };
      } else {
        resolvedSide = "right";
        tooltipStyle = { top: cy, left: targetRect.left - GAP, transform: "translate(-100%, -50%)" };
      }
    } else if (step.position === "bottom") {
      resolvedSide = "top";
      tooltipStyle = { top: targetRect.bottom + GAP, left: cx, transform: "translateX(-50%)" };
      if (targetRect.bottom + GAP + TH > window.innerHeight) {
        resolvedSide = "bottom";
        tooltipStyle = { top: targetRect.top - GAP, left: cx, transform: "translate(-50%, -100%)" };
      }
    } else {
      resolvedSide = "bottom";
      tooltipStyle = { top: targetRect.top - GAP, left: cx, transform: "translate(-50%, -100%)" };
    }

    // Clamp horizontal
    const PAD = 12;
    if (
      tooltipStyle.transform === "translateX(-50%)" ||
      tooltipStyle.transform === "translate(-50%, -100%)"
    ) {
      const numLeft = tooltipStyle.left as number;
      const halfW   = TW / 2;
      if (numLeft - halfW < PAD)                      tooltipStyle.left = PAD + halfW;
      else if (numLeft + halfW > window.innerWidth - PAD) tooltipStyle.left = window.innerWidth - PAD - halfW;
    }
  }

  // ── Arrow CSS ─────────────────────────────────────────────────────────────
  const AS = 8;
  const arrowStyles: Record<ArrowSide, React.CSSProperties> = {
    left:   { position:"absolute", top:"50%",  left:-AS,  transform:"translateY(-50%)",  width:0, height:0, borderTop:`${AS}px solid transparent`, borderBottom:`${AS}px solid transparent`, borderRight:`${AS}px solid var(--color-card)` },
    right:  { position:"absolute", top:"50%",  right:-AS, transform:"translateY(-50%)",  width:0, height:0, borderTop:`${AS}px solid transparent`, borderBottom:`${AS}px solid transparent`, borderLeft:`${AS}px solid var(--color-card)` },
    top:    { position:"absolute", top:-AS,    left:"50%",transform:"translateX(-50%)", width:0, height:0, borderLeft:`${AS}px solid transparent`, borderRight:`${AS}px solid transparent`, borderBottom:`${AS}px solid var(--color-card)` },
    bottom: { position:"absolute", bottom:-AS, left:"50%",transform:"translateX(-50%)", width:0, height:0, borderLeft:`${AS}px solid transparent`, borderRight:`${AS}px solid transparent`, borderTop:`${AS}px solid var(--color-card)` },
  };

  // Spotlight step index for the counter (0-based among spotlight steps only)
  const spotIndex = STEPS
    .slice(0, currentStep)
    .filter(s => s.position !== "center").length;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto flex font-sans">
      {/* Dark overlay with spotlight hole */}
      {showSpot && targetRect ? (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none bg-black/60"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                ${targetRect.left - 8}px ${targetRect.top - 8}px,
                ${targetRect.left - 8}px ${targetRect.bottom + 8}px,
                ${targetRect.right + 8}px ${targetRect.bottom + 8}px,
                ${targetRect.right + 8}px ${targetRect.top - 8}px,
                ${targetRect.left - 8}px ${targetRect.top - 8}px,
                0% 0%
              )`,
            }}
            initial={false}
            animate={{
              clipPath: `polygon(
                0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                ${targetRect.left - 8}px ${targetRect.top - 8}px,
                ${targetRect.left - 8}px ${targetRect.bottom + 8}px,
                ${targetRect.right + 8}px ${targetRect.bottom + 8}px,
                ${targetRect.right + 8}px ${targetRect.top - 8}px,
                ${targetRect.left - 8}px ${targetRect.top - 8}px,
                0% 0%
              )`,
            }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="absolute pointer-events-none rounded-lg ring-2 ring-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.25)]"
            initial={false}
            animate={{
              top:    targetRect.top    - 8,
              left:   targetRect.left   - 8,
              width:  targetRect.width  + 16,
              height: targetRect.height + 16,
            }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-none bg-black/60" />
      )}

      {/* Step counter pill */}
      {!isCenter && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-5 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md rounded-full border border-border shadow-lg flex items-center gap-3 px-4 py-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[12px] font-medium text-foreground">
            {t("tour.step", {
              current: String(spotIndex + 1),
              total:   String(SPOTLIGHT_COUNT),
            })}
          </span>
          <div className="flex items-center gap-1 ml-1">
            {Array.from({ length: SPOTLIGHT_COUNT }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === spotIndex ? "bg-primary scale-125" :
                  i <  spotIndex ? "bg-primary/50"        : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Tooltip / modal */}
      <AnimatePresence mode="wait">
        <div
          key={step.id + "-wrapper"}
          className={
            isCenter
              ? "absolute inset-0 flex items-center justify-center pointer-events-none"
              : "absolute pointer-events-none z-50"
          }
          style={!isCenter ? tooltipStyle : {}}
        >
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`bg-card border border-border shadow-2xl pointer-events-auto relative flex flex-col ${
              isCenter
                ? "w-[400px] p-8 rounded-2xl text-center items-center"
                : "w-[320px] p-5 rounded-xl"
            }`}
          >
            {!isCenter && <div style={arrowStyles[resolvedSide]} />}

            {isCenter && currentStep === 0 && (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <div className="w-8 h-8 rounded-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
              </div>
            )}

            {!isCenter && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {t("tour.step", {
                    current: String(spotIndex + 1),
                    total:   String(SPOTLIGHT_COUNT),
                  })}
                </span>
              </div>
            )}

            <h2 className={`font-semibold text-foreground tracking-tight ${isCenter ? "text-2xl mb-3" : "text-base mb-1.5"}`}>
              {t(step.titleKey)}
            </h2>
            <p className={`text-muted-foreground leading-relaxed ${isCenter ? "text-[15px] mb-8" : "text-[13px] mb-5"}`}>
              {t(step.textKey)}
            </p>

            <div className={`flex w-full ${isCenter ? "flex-col gap-3" : "justify-between items-center"}`}>
              {!isCenter ? (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrev}
                      disabled={currentStep <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-4 h-8 flex items-center justify-center gap-1.5 rounded-lg bg-foreground text-background font-medium text-[13px] hover:bg-foreground/90 transition-colors cursor-pointer"
                    >
                      {currentStep === STEPS.length - 2 ? t("tour.finish") : t("tour.next")}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleComplete}
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-medium px-2 cursor-pointer"
                  >
                    {t("tour.skip")}
                  </button>
                </>
              ) : (
                <button
                  onClick={currentStep === 0 ? handleNext : handleComplete}
                  className="w-full h-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 cursor-pointer"
                >
                  {currentStep === 0 ? t("tour.start") : t("tour.goToDashboard")}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </div>
  );
}
