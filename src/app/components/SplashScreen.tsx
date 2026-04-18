import { motion } from "motion/react";
import { useEffect } from "react";
import { VelarisLogoAnim } from "./VelarisLogoAnim";
import { tauriInvoke } from "../helpers/tauriWindow";

export function SplashScreen() {
  useEffect(() => {
    // Show this window only after the dark background has painted — prevents
    // the OS from briefly flashing a white window before WebView renders.
    const rafId = requestAnimationFrame(() => {
      tauriInvoke("show_splash_window").catch(() => {});
    });

    const timer = setTimeout(() => {
      tauriInvoke("close_splash").catch(() => {});
    }, 1800);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0e0e12",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
      }}
    >
      {/* Radial glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(100,60,180,0.14) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo — scaled up slightly within the 300×300 window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ transform: "scale(1.3)", transformOrigin: "center" }}
      >
        <VelarisLogoAnim animated light />
      </motion.div>

      {/* Pulsing dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        style={{ display: "flex", gap: 6 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.35)",
            }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
