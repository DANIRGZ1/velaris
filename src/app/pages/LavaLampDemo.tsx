import { motion } from "motion/react";
import { VelarisLavaLamp } from "../components/VelarisLavaLamp";
import { useState, useCallback } from "react";
import { cn } from "../components/ui/utils";
import { RotateCcw } from "lucide-react";

type Variant = "violet" | "cyan" | "amber";
type Size = "sm" | "md" | "lg";

export function LavaLampDemo() {
  const [variant, setVariant] = useState<Variant>("violet");
  const [size, setSize] = useState<Size>("lg");
  const [showTube, setShowTube] = useState(true);
  const [animated, setAnimated] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  const replayAnimation = useCallback(() => {
    setAnimated(true);
    setAnimKey((k) => k + 1);
  }, []);

  const variants: { id: Variant; label: string; color: string }[] = [
    { id: "violet", label: "Velaris", color: "bg-violet-500" },
    { id: "cyan", label: "Cyan", color: "bg-cyan-500" },
    { id: "amber", label: "Amber", color: "bg-amber-500" },
  ];

  const sizes: { id: Size; label: string }[] = [
    { id: "sm", label: "S" },
    { id: "md", label: "M" },
    { id: "lg", label: "L" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full h-full flex flex-col items-center justify-center gap-10 pb-20 pt-8"
    >
      {/* Title */}
      <div className="text-center flex flex-col gap-2">
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
          Lava Lamp
        </h1>
        <p className="text-[13px] text-muted-foreground max-w-md">
          Tubo minimalista con silueta suave (single stroke). Efecto metaball SVG
          + animacion de entrada estilo Blitz.gg: draw → glow → alive.
        </p>
      </div>

      {/* Lamp Display */}
      <div className="relative flex items-center justify-center min-h-[420px]">
        {/* Background ambient glow */}
        <div
          className={cn(
            "absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 transition-colors duration-1000",
            variant === "violet" && "bg-violet-500",
            variant === "cyan" && "bg-cyan-500",
            variant === "amber" && "bg-amber-500"
          )}
          style={{ top: "30%" }}
        />

        <VelarisLavaLamp
          key={`${variant}-${size}-${animKey}`}
          variant={variant}
          size={size}
          showTube={showTube}
          animated={animated}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-5">
        {/* Variant selector */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold w-14">Color</span>
          <div className="flex gap-2 bg-secondary/40 p-1 rounded-xl border border-border/30">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariant(v.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer",
                  variant === v.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full", v.color)} />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size selector */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold w-14">Size</span>
          <div className="flex gap-2 bg-secondary/40 p-1 rounded-xl border border-border/30">
            {sizes.map((s) => (
              <button
                key={s.id}
                onClick={() => setSize(s.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer min-w-[44px]",
                  size === s.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tube toggle & Animation controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold w-14">Tubo</span>
            <button
              onClick={() => setShowTube(!showTube)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors cursor-pointer",
                showTube ? "bg-primary" : "bg-secondary border border-border/50"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                  showTube ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Anim</span>
            <button
              onClick={() => setAnimated(!animated)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors cursor-pointer",
                animated ? "bg-primary" : "bg-secondary border border-border/50"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                  animated ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Replay button */}
          <button
            onClick={replayAnimation}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer border border-border/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Replay
          </button>
        </div>
      </div>

      {/* Technical details */}
      <div className="flex gap-4 mt-2">
        {[
          { label: "Forma", value: "Minimal smooth silhouette" },
          { label: "Entrada", value: "Stroke-draw + glow reveal" },
          { label: "Lava", value: "SVG metaball (CSS animate)" },
        ].map((detail) => (
          <div
            key={detail.label}
            className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-secondary/30 border border-border/30"
          >
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {detail.label}
            </span>
            <span className="text-[12px] font-mono font-medium text-foreground">
              {detail.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}