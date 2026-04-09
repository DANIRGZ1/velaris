/**
 * LoadingScreen — full-window overlay with blurred app behind the V card.
 * Shows ally / enemy champion badges from the last recorded match.
 */

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { VelarisLogoAnim } from "./VelarisLogoAnim";
import { IS_TAURI, tauriInvoke, showWindow } from "../helpers/tauriWindow";

// ─── Champion badge helpers ───────────────────────────────────────────────────

interface SimpleParticipant { championName: string; teamId: number; }

function getLastMatchTeams(): { blue: string[]; red: string[] } | null {
  try {
    const raw = localStorage.getItem("velaris-match-history-cache");
    if (!raw) return null;
    const { matches } = JSON.parse(raw);
    if (!Array.isArray(matches) || matches.length === 0) return null;
    const last = matches[0];
    const participants: SimpleParticipant[] = last.participants ?? [];
    const blue = participants.filter((p) => p.teamId === 100).map((p) => p.championName).filter(Boolean);
    const red  = participants.filter((p) => p.teamId === 200).map((p) => p.championName).filter(Boolean);
    if (blue.length === 0 && red.length === 0) return null;
    return { blue, red };
  } catch { return null; }
}

function ChampBadge({ name, delay, patchVersion }: { name: string; delay: number; patchVersion: string }) {
  const slug = name.replace(/[' ]/g, "").replace(/\./g, "");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 0.55, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: 36, height: 36, borderRadius: 10,
        overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}
    >
      <img
        src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${slug}.png`}
        alt={name}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
      />
    </motion.div>
  );
}

function TeamRow({ champs, side, patchVersion }: { champs: string[]; side: "blue" | "red"; patchVersion: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: side === "blue" ? "flex-end" : "flex-start" }}>
      {champs.slice(0, 5).map((name, i) => (
        <ChampBadge key={name} name={name} delay={0.6 + i * 0.08} patchVersion={patchVersion} />
      ))}
    </div>
  );
}

// ─── Wordmark ─────────────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress]        = useState(0);
  const [showWordmark, setShowWordmark] = useState(false);
  const [exiting, setExiting]          = useState(false);
  const [version, setVersion]          = useState("0.1.0-alpha");
  const [patchVersion, setPatchVersion] = useState("14.24.1");
  const [teams, setTeams]              = useState<{ blue: string[]; red: string[] } | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => { showWindow(); }, []);

  useEffect(() => {
    // Read patch version from cache
    try {
      const pv = localStorage.getItem("velaris-patch-version");
      if (pv) { const { version: v } = JSON.parse(pv); if (v) setPatchVersion(v); }
    } catch { /* ignore */ }
    // Read last match teams
    setTeams(getLastMatchTeams());
  }, []);

  useEffect(() => {
    if (!IS_TAURI) return;
    tauriInvoke<string>("get_app_version")
      .then((v) => { if (v) setVersion(v); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setShowWordmark(true), 1600);
    const duration = 3200;
    const steps = duration / 20;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / steps, 3);
      setProgress(Math.min(ease * 100, 100));
      if (step >= steps) {
        clearInterval(timer);
        setExiting(true);
        setTimeout(() => onCompleteRef.current(), 400);
      }
    }, 20);

    return () => { clearInterval(timer); clearTimeout(t1); };
  }, []);

  const CARD_BG     = "rgb(18,18,22)";
  const CARD_RADIUS = 16;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(12px) saturate(0.6)",
        WebkitBackdropFilter: "blur(12px) saturate(0.6)",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      {/* Champion teams flanking the card */}
      {teams && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            display: "flex", alignItems: "center", gap: 20,
            transform: exiting ? "scale(0.94)" : "scale(1)",
            transition: "transform 0.4s ease",
          }}
        >
          {/* Blue side */}
          <TeamRow champs={teams.blue} side="blue" patchVersion={patchVersion} />

          {/* Card wrapper */}
          <div style={{ position: "relative", width: 300 }}>
            {/* Shimmer ring */}
            <div style={{ position: "absolute", inset: -1, borderRadius: CARD_RADIUS + 1, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
              <div style={{
                position: "absolute", width: "200%", height: "200%", top: "-50%", left: "-50%",
                background: `conic-gradient(rgba(255,255,255,0.04) 0deg, rgba(255,255,255,0.04) 155deg, rgba(212,100,126,0.35) 168deg, rgba(255,255,255,0.90) 180deg, rgba(212,100,126,0.35) 192deg, rgba(255,255,255,0.04) 205deg, rgba(255,255,255,0.04) 360deg)`,
                animation: "shimmer-spin 4s linear infinite",
              }} />
              <div style={{ position: "absolute", inset: 1, borderRadius: CARD_RADIUS, background: CARD_BG }} />
            </div>

            {/* Card */}
            <div style={{
              position: "relative", zIndex: 1, background: CARD_BG, borderRadius: CARD_RADIUS,
              display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
              padding: "2.5rem 3rem",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,45,66,0.12)",
            }}>
              <VelarisLogoAnim animated light />
              <VelarisWordmark show={showWordmark} />
              <motion.div
                style={{ width: 160, height: 2, borderRadius: 9999, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.5 }}
              >
                <div style={{
                  height: "100%", width: `${progress}%`, borderRadius: 9999,
                  background: "linear-gradient(90deg, #ffffff, #e0e0e0, #ffffff)",
                  backgroundSize: "200% 100%",
                  animation: progress > 0 ? "velaris-shimmer 1.8s ease-in-out infinite" : "none",
                  boxShadow: "0 0 8px rgba(255,255,255,0.4)", transition: "width 75ms linear",
                }} />
              </motion.div>
              <motion.span
                style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0, duration: 0.6 }}
              >
                v{version}
              </motion.span>
            </div>
          </div>

          {/* Red side */}
          <TeamRow champs={teams.red} side="red" patchVersion={patchVersion} />
        </motion.div>
      )}

      {/* Fallback card (no match data yet) */}
      {!teams && (
        <div style={{
          position: "relative", width: 300,
          transform: exiting ? "scale(0.94)" : "scale(1)",
          transition: "transform 0.4s ease",
        }}>
          <div style={{ position: "absolute", inset: -1, borderRadius: CARD_RADIUS + 1, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
            <div style={{
              position: "absolute", width: "200%", height: "200%", top: "-50%", left: "-50%",
              background: `conic-gradient(rgba(255,255,255,0.04) 0deg, rgba(255,255,255,0.04) 155deg, rgba(212,100,126,0.35) 168deg, rgba(255,255,255,0.90) 180deg, rgba(212,100,126,0.35) 192deg, rgba(255,255,255,0.04) 205deg, rgba(255,255,255,0.04) 360deg)`,
              animation: "shimmer-spin 4s linear infinite",
            }} />
            <div style={{ position: "absolute", inset: 1, borderRadius: CARD_RADIUS, background: CARD_BG }} />
          </div>
          <div style={{
            position: "relative", zIndex: 1, background: CARD_BG, borderRadius: CARD_RADIUS,
            display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
            padding: "2.5rem 3rem",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,45,66,0.12)",
          }}>
            <VelarisLogoAnim animated light />
            <VelarisWordmark show={showWordmark} />
            <motion.div
              style={{ width: 160, height: 2, borderRadius: 9999, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.5 }}
            >
              <div style={{
                height: "100%", width: `${progress}%`, borderRadius: 9999,
                background: "linear-gradient(90deg, #ffffff, #e0e0e0, #ffffff)",
                backgroundSize: "200% 100%",
                animation: progress > 0 ? "velaris-shimmer 1.8s ease-in-out infinite" : "none",
                boxShadow: "0 0 8px rgba(255,255,255,0.4)", transition: "width 75ms linear",
              }} />
            </motion.div>
            <motion.span
              style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0, duration: 0.6 }}
            >
              v{version}
            </motion.span>
          </div>
        </div>
      )}
    </div>
  );
}

