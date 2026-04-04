/**
 * LoadingScreen — V logo line-draw, minimal & floating
 *
 * Sequence: card appears → V draws itself → wordmark staggers in →
 * progress bar fills → shimmer border travels around card → exit fade.
 */

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { VelarisLogoAnim } from "./VelarisLogoAnim";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";

// ─── Wordmark with stagger ───
function VelarisWordmark({ show }: { show: boolean }) {
  const letters = "VELARIS".split("");
  return (
    <div className="flex items-center justify-center gap-[3px] h-5 overflow-hidden">
      {letters.map((letter, i) => (
        <motion.span
          key={`letter-${i}`}
          className="text-[15px] font-semibold tracking-[0.25em] text-white/80 font-sans inline-block"
          initial={{ opacity: 0, y: 14 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {letter}
        </motion.span>
      ))}
    </div>
  );
}

// ─── Main Loading Screen ───
export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress]       = useState(0);
  const [showWordmark, setShowWordmark] = useState(false);
  const [exiting, setExiting]          = useState(false);
  const [version, setVersion]          = useState("0.1.0-alpha");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!IS_TAURI) return;
    tauriInvoke<string>("get_app_version")
      .then((v) => { if (v) setVersion(v); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setShowWordmark(true), 1600);

    const duration = 3200;
    const interval = 20;
    const steps    = duration / interval;
    let step       = 0;

    const timer = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / steps, 3);
      setProgress(Math.min(ease * 100, 100));
      if (step >= steps) {
        clearInterval(timer);
        setExiting(true);
        setTimeout(() => onCompleteRef.current(), 350);
      }
    }, interval);

    return () => { clearInterval(timer); clearTimeout(t1); };
  }, []);

  const CARD_BG    = "rgb(18,18,22)";
  const CARD_RADIUS = 16; // rounded-2xl = 1rem = 16px

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999]">
      {/* Outer wrapper — positions the shimmer ring + card together */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 300,
          opacity:   exiting ? 0 : 1,
          transform: exiting ? "scale(0.95)" : "scale(1)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        {/* ── Shimmer border ring ──────────────────────────────────────────── */}
        {/* 1. Overflow-hidden shell exactly 1px outside the card */}
        <div
          style={{
            position:     "absolute",
            inset:        -1,
            borderRadius: CARD_RADIUS + 1,
            overflow:     "hidden",
            pointerEvents:"none",
            zIndex:       0,
          }}
        >
          {/* 2. Square spinning element, sized 200% so it always covers corners */}
          <div
            style={{
              position:   "absolute",
              width:      "200%",
              height:     "200%",
              top:        "-50%",
              left:       "-50%",
              background: `conic-gradient(
                rgba(255,255,255,0.05) 0deg,
                rgba(255,255,255,0.05) 155deg,
                rgba(212,100,126,0.35) 168deg,
                rgba(255,255,255,0.90) 180deg,
                rgba(212,100,126,0.35) 192deg,
                rgba(255,255,255,0.05) 205deg,
                rgba(255,255,255,0.05) 360deg
              )`,
              animation:  "shimmer-spin 4s linear infinite",
            }}
          />
          {/* 3. Inner fill that hides everything except the 1px border strip */}
          <div
            style={{
              position:     "absolute",
              inset:        1,
              borderRadius: CARD_RADIUS,
              background:   CARD_BG,
            }}
          />
        </div>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div
          className="relative flex flex-col items-center gap-4 px-12 py-10 rounded-2xl"
          style={{
            background: CARD_BG,
            boxShadow:  "0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(124,45,66,0.15)",
            zIndex:     1,
          }}
        >
          <VelarisLogoAnim animated light />

          <VelarisWordmark show={showWordmark} />

          {/* Progress bar */}
          <motion.div
            className="w-40 h-[2px] bg-white/8 rounded-full overflow-hidden relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.5 }}
          >
            <div
              className="h-full rounded-full transition-all duration-75 ease-linear"
              style={{
                width:           `${progress}%`,
                background:      "linear-gradient(90deg, #D4647E, #f0a0b4, #D4647E)",
                backgroundSize:  "200% 100%",
                animation:       progress > 0 ? "velaris-shimmer 1.8s ease-in-out infinite" : "none",
                boxShadow:       "0 0 8px rgba(212,100,126,0.6)",
              }}
            />
          </motion.div>

          {/* Version */}
          <motion.span
            className="text-[9px] font-mono text-white/25 tracking-[0.2em] uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0, duration: 0.6 }}
          >
            v{version}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
