import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useLanguage } from "../contexts/LanguageContext";

export type OnboardingStep = {
  id: string;
  targetId?: string; // e.g., "step-2" matches [data-tour="step-2"]
  titleKey: string;
  textKey: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

const STEPS: OnboardingStep[] = [
  {
    id: "step-1",
    titleKey: "tour.welcome",
    textKey: "tour.welcomeText",
    position: "center",
  },
  {
    id: "step-2",
    targetId: "step-2",
    titleKey: "tour.overview",
    textKey: "tour.overviewText",
    position: "bottom",
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
    id: "step-final",
    titleKey: "tour.ready",
    textKey: "tour.readyText",
    position: "center",
  },
];

declare global {
  interface Window {
    __TAURI__?: { core?: { invoke?: (cmd: string) => Promise<void> } };
  }
}

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    // Only show the onboarding once (persists across sessions via localStorage).
    // We also delay it so the app has time to finish its initial LCU connection
    // and render the dashboard before the overlay appears.
    const hasSeen = localStorage.getItem("velaris-onboarding-done");
    if (!hasSeen) {
      const timer = setTimeout(async () => {
        // Ensure the Tauri window is focused and interactive before showing the tour
        try {
          await window.__TAURI__?.core?.invoke?.("focus_main_window");
        } catch {
          // Not in Tauri or command not available — safe to ignore
        }
        setIsActive(true);
        navigate("/dashboard");
      }, 5000); // 5 s — allows Tauri window to fully initialize and become interactive
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  const step = STEPS[currentStep];

  const measureTarget = useCallback(() => {
    if (!step?.targetId) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.targetId}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect((prev) => {
        if (!prev) return rect;
        // Solo actualizar si hay cambios reales en tamaño o posición
        if (
          Math.abs(prev.top - rect.top) < 1 &&
          Math.abs(prev.left - rect.left) < 1 &&
          Math.abs(prev.width - rect.width) < 1 &&
          Math.abs(prev.height - rect.height) < 1
        ) {
          return prev;
        }
        return rect;
      });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (isActive) {
      measureTarget();
      window.addEventListener("resize", measureTarget);
      // Setup a small interval to catch animations or layout shifts
      const interval = setInterval(measureTarget, 500);
      return () => {
        window.removeEventListener("resize", measureTarget);
        clearInterval(interval);
      };
    }
  }, [isActive, measureTarget]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem("velaris-onboarding-done", "true");
    navigate("/dashboard");
  };

  if (!isActive) return null;

  const isCenter = step.position === "center";
  const showSpotlight = !isCenter && targetRect !== null;

  // ─── Tooltip positioning with arrow ───────────────────────────────────────
  type ArrowSide = "left" | "right" | "top" | "bottom";
  let tooltipStyle: React.CSSProperties = {};
  let resolvedSide: ArrowSide = "left"; // which side of the tooltip the arrow is on

  if (showSpotlight && targetRect) {
    const GAP = 16;
    const TOOLTIP_W = 340;
    const TOOLTIP_H = 200;

    // Center of target
    const cx = targetRect.left + targetRect.width / 2;
    const cy = targetRect.top + targetRect.height / 2;

    if (step.position === "right") {
      const left = targetRect.right + GAP;
      // Prefer right; fall back bottom → left
      if (left + TOOLTIP_W <= window.innerWidth - 12) {
        resolvedSide = "left";
        tooltipStyle = {
          top: cy,
          left,
          transform: "translateY(-50%)",
        };
      } else if (targetRect.bottom + GAP + TOOLTIP_H <= window.innerHeight) {
        resolvedSide = "top";
        tooltipStyle = {
          top: targetRect.bottom + GAP,
          left: cx,
          transform: "translateX(-50%)",
        };
      } else {
        resolvedSide = "right";
        tooltipStyle = {
          top: cy,
          left: targetRect.left - GAP,
          transform: "translate(-100%, -50%)",
        };
      }
    } else if (step.position === "bottom") {
      resolvedSide = "top";
      tooltipStyle = {
        top: targetRect.bottom + GAP,
        left: cx,
        transform: "translateX(-50%)",
      };
      if (targetRect.bottom + GAP + TOOLTIP_H > window.innerHeight) {
        resolvedSide = "bottom";
        tooltipStyle = {
          top: targetRect.top - GAP,
          left: cx,
          transform: "translate(-50%, -100%)",
        };
      }
    } else if (step.position === "left") {
      const leftEdge = targetRect.left - GAP;
      if (leftEdge - TOOLTIP_W >= 12) {
        resolvedSide = "right";
        tooltipStyle = {
          top: cy,
          left: leftEdge,
          transform: "translate(-100%, -50%)",
        };
      } else {
        resolvedSide = "left";
        tooltipStyle = {
          top: cy,
          left: targetRect.right + GAP,
          transform: "translateY(-50%)",
        };
      }
    } else {
      // top
      resolvedSide = "bottom";
      tooltipStyle = {
        top: targetRect.top - GAP,
        left: cx,
        transform: "translate(-50%, -100%)",
      };
      if (targetRect.top - GAP - TOOLTIP_H < 0) {
        resolvedSide = "top";
        tooltipStyle = {
          top: targetRect.bottom + GAP,
          left: cx,
          transform: "translateX(-50%)",
        };
      }
    }

    // ─── Clamp horizontal edges ────────────────────────────────────────────
    const PAD = 12;
    if (tooltipStyle.transform === "translateX(-50%)" || tooltipStyle.transform === "translate(-50%, -100%)") {
      const numLeft = tooltipStyle.left as number;
      const halfW = TOOLTIP_W / 2;
      if (numLeft - halfW < PAD) {
        tooltipStyle.left = PAD + halfW;
      } else if (numLeft + halfW > window.innerWidth - PAD) {
        tooltipStyle.left = window.innerWidth - PAD - halfW;
      }
    }
  }

  // ─── Arrow styles ──────────────────────────────────────────────────────────
  const arrowSize = 8;
  const arrowStyles: Record<ArrowSide, React.CSSProperties> = {
    left: {
      position: "absolute",
      top: "50%",
      left: -arrowSize,
      transform: "translateY(-50%)",
      width: 0, height: 0,
      borderTop: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid var(--color-card)`,
    },
    right: {
      position: "absolute",
      top: "50%",
      right: -arrowSize,
      transform: "translateY(-50%)",
      width: 0, height: 0,
      borderTop: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid transparent`,
      borderLeft: `${arrowSize}px solid var(--color-card)`,
    },
    top: {
      position: "absolute",
      top: -arrowSize,
      left: "50%",
      transform: "translateX(-50%)",
      width: 0, height: 0,
      borderLeft: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid var(--color-card)`,
    },
    bottom: {
      position: "absolute",
      bottom: -arrowSize,
      left: "50%",
      transform: "translateX(-50%)",
      width: 0, height: 0,
      borderLeft: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid transparent`,
      borderTop: `${arrowSize}px solid var(--color-card)`,
    },
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto flex font-sans">
      {/* ─── Overlay: dark + blur everywhere, spotlight hole over target ─── */}
      {showSpotlight && targetRect ? (
        <>
          {/* Dark + blurred overlay using clip-path to cut out the spotlight */}
          <motion.div
            className="absolute inset-0 pointer-events-none bg-black/60"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, 100% 100%, 100% 0%,
                0% 0%,
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
                0% 0%, 0% 100%, 100% 100%, 100% 0%,
                0% 0%,
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
          {/* Spotlight glow ring around target */}
          <motion.div
            className="absolute pointer-events-none rounded-lg ring-2 ring-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.25)]"
            initial={false}
            animate={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </>
      ) : (
        /* Center steps: full dark overlay, no hole */
        <div className="absolute inset-0 pointer-events-none bg-black/60" />
      )}

      {/* Step indicator pill (non-center steps only) */}
      {!isCenter && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-5 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md rounded-full border border-border shadow-lg flex items-center gap-3 px-4 py-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[12px] font-medium text-foreground">
            {t("tour.step", { current: String(currentStep), total: String(STEPS.length - 2) })}
          </span>
          {/* Step dots */}
          <div className="flex items-center gap-1 ml-1">
            {STEPS.filter(s => s.position !== "center").map((s, i) => (
              <div
                key={s.id}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep - 1
                    ? "bg-primary scale-125"
                    : i < currentStep - 1
                    ? "bg-primary/50"
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Tooltip or Modal Container */}
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
            className={`
              bg-card border border-border shadow-2xl pointer-events-auto relative
              flex flex-col
              ${isCenter
                ? "w-[400px] p-8 rounded-2xl text-center items-center"
                : "w-[340px] p-5 rounded-xl"
              }
            `}
          >
            {/* Arrow indicator (non-center only) */}
            {!isCenter && <div style={arrowStyles[resolvedSide]} />}

            {/* Decorative ring for center welcome */}
            {isCenter && currentStep === 0 && (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                 <div className="w-8 h-8 rounded-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
              </div>
            )}

            {/* Step badge (non-center) */}
            {!isCenter && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {t("tour.step", { current: String(currentStep), total: String(STEPS.length - 2) })}
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
                      disabled={currentStep === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleNext}
                      className="px-4 h-8 flex items-center justify-center gap-1.5 rounded-lg bg-foreground text-background font-medium text-[13px] hover:bg-foreground/90 transition-colors"
                    >
                      {currentStep === STEPS.length - 2 ? t("tour.finish") : t("tour.next")}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={handleComplete}
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-medium px-2"
                  >
                    {t("tour.skip")}
                  </button>
                </>
              ) : (
                <button 
                  onClick={currentStep === 0 ? handleNext : handleComplete}
                  className="w-full h-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
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