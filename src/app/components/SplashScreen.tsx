import { motion } from "motion/react";
import { useEffect } from "react";
import { VelarisLogoAnim } from "./VelarisLogoAnim";
import { tauriInvoke } from "../helpers/tauriWindow";

export function SplashScreen() {
  useEffect(() => {
    // Double rAF is the Tauri equivalent of Electron's `ready-to-show`:
    //   rAF 1 → browser paints the dark frame into the GPU back-buffer
    //   rAF 2 → GPU presents (swaps) that frame to the DWM compositor
    // Only AFTER the swap is the composited frame visible to DWM, so only
    // then is it safe to call show() without the window briefly flashing white.
    let inner: number;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        tauriInvoke("show_splash_window").catch(() => {});
      });
    });

    const timer = setTimeout(() => {
      tauriInvoke("close_splash").catch(() => {});
    }, 1800);

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
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
        initial={{ opacity: 0, scale: 0.75 * 1.3 }}
        animate={{ opacity: 1, scale: 1.3 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
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
