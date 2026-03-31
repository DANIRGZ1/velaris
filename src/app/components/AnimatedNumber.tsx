/**
 * AnimatedNumber — Spring-animated numeric display.
 *
 * Counts from its previous value to the new one with a smooth spring
 * whenever `value` changes. Feels premium and alive (like Stripe/Linear dashboards).
 *
 * Usage:
 *   <AnimatedNumber value={67} suffix="%" className="text-xl font-bold text-emerald-500" />
 *   <AnimatedNumber value={3.8} decimals={1} className="text-gradient" />
 */
import { useEffect } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    damping: 28,
    stiffness: 90,
    mass: 0.7,
  });

  const display = useTransform(spring, (v) => {
    const safe = isNaN(v) || !isFinite(v) ? 0 : v;
    return `${prefix}${safe.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    const safe = isNaN(value) || !isFinite(value) ? 0 : value;
    motionValue.set(safe);
  }, [value, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
}
