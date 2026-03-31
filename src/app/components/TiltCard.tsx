/**
 * TiltCard — 3D perspective tilt on hover using mouse tracking.
 *
 * Wrap any card to give it a premium "depth" feel like Linear/Stripe dashboards.
 * Uses useMotionValue + useSpring so the tilt is physics-based and smooth.
 *
 * Usage:
 *   <TiltCard className="rounded-2xl border bg-card p-5">
 *     ...content...
 *   </TiltCard>
 */
import { useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "./ui/utils";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees. Default: 6 */
  intensity?: number;
}

export function TiltCard({ children, className, intensity = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { damping: 22, stiffness: 180, mass: 0.5 };
  const rotateX = useSpring(useTransform(rawY, [-1, 1], [intensity, -intensity]), springConfig);
  const rotateY = useSpring(useTransform(rawX, [-1, 1], [-intensity, intensity]), springConfig);
  const glare  = useSpring(useTransform(rawX, [-1, 1], [0, 0.07]), springConfig);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rawX.set(((e.clientX - r.left) / r.width  - 0.5) * 2);
    rawY.set(((e.clientY - r.top)  / r.height - 0.5) * 2);
  }, [rawX, rawY]);

  const onLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("relative", className)}
    >
      {children}
      {/* Subtle glare overlay */}
      <motion.div
        style={{ opacity: glare }}
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/20 to-transparent"
      />
    </motion.div>
  );
}
