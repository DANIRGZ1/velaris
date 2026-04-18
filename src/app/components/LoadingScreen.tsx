import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { VelarisLogoAnim } from "./VelarisLogoAnim";
import { IS_TAURI, tauriInvoke, showWindow } from "../helpers/tauriWindow";

// ─── Wordmark ─────────────────────────────────────────────────────────────────

function Wordmark({ visible }: { visible: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-5 overflow-hidden">
      {"VELARIS".split("").map((letter, i) => (
        <motion.span
          key={i}
          className="text-[14px] font-semibold tracking-[0.3em] text-white/50 font-sans inline-block"
          initial={{ opacity: 0, y: 12 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] }}
        >
          {letter}
        </motion.span>
      ))}
    </div>
  );
}

// ─── LoadingScreen ────────────────────────────────────────────────────────────

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress,     setProgress]     = useState(0);
  const [showWordmark, setShowWordmark] = useState(false);
  const [logoVisible,  setLogoVisible]  = useState(false);
  const [exiting,      setExiting]      = useState(false);
  const [version,      setVersion]      = useState("0.1.0-alpha");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Show the Tauri window after the body background is guaranteed painted.
  // body { background: #111113 } is set synchronously by index.html CSS, so
  // a single rAF is sufficient — the dark frame is visible before showWindow fires.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      showWindow();
      // Stagger the logo in just after the window opens
      setTimeout(() => setLogoVisible(true), 80);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Fetch app version from Rust
  useEffect(() => {
    if (!IS_TAURI) return;
    tauriInvoke<string>("get_app_version")
      .then(v => { if (v) setVersion(v); })
      .catch(() => {});
  }, []);

  // Wordmark + progress animation
  useEffect(() => {
    const t1 = setTimeout(() => setShowWordmark(true), 700);

    const DURATION = 1800;
    const TICK     = 16;
    const steps    = DURATION / TICK;
    let   step     = 0;

    const timer = setInterval(() => {
      step++;
      // Cubic ease-out — fast at start, slows near end
      const ease = 1 - Math.pow(1 - step / steps, 3);
      setProgress(Math.min(ease * 100, 100));
      if (step >= steps) {
        clearInterval(timer);
        setExiting(true);
        setTimeout(() => onCompleteRef.current(), 450);
      }
    }, TICK);

    return () => { clearInterval(timer); clearTimeout(t1); };
  }, []);

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // Fully opaque — no backdropFilter, no transparency.
        // This is what prevents the white-frame flash on Windows.
        background: "#0e0e12",
        borderRadius: 8,
        overflow: "hidden",
      }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {/* Subtle radial glow behind the logo */}
      <div
        style={{
          position: "absolute",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(100, 60, 180, 0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Content stack */}
      <motion.div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
        }}
        animate={{
          opacity: exiting ? 0 : 1,
          scale:   exiting ? 0.95 : 1,
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={logoVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <VelarisLogoAnim animated light />
        </motion.div>

        {/* Wordmark */}
        <Wordmark visible={showWordmark} />

        {/* Progress bar */}
        <motion.div
          style={{
            width: 140,
            height: 2,
            borderRadius: 9999,
            overflow: "hidden",
            background: "rgba(255,255,255,0.06)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 9999,
              background: "linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.7), rgba(255,255,255,0.15))",
              backgroundSize: "200% 100%",
              animation: progress > 0 ? "velaris-shimmer 2s ease-in-out infinite" : "none",
              transition: "width 60ms linear",
            }}
          />
        </motion.div>

        {/* Version */}
        <motion.span
          style={{
            fontSize: 9,
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.2em",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          v{version}
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
