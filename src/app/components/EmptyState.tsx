import { motion } from "motion/react";
import { Wifi, WifiOff, Gamepad2, Search, StickyNote, BarChart3, Swords, type LucideIcon } from "lucide-react";
import { cn } from "./ui/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  variant?: "default" | "disconnected" | "no-data" | "search" | "first-time";
}

const VARIANT_ICONS: Record<string, LucideIcon> = {
  default: BarChart3,
  disconnected: WifiOff,
  "no-data": Search,
  search: Search,
  "first-time": Gamepad2,
};

const VARIANT_COLORS: Record<string, string> = {
  default: "text-muted-foreground/20",
  disconnected: "text-red-400/30",
  "no-data": "text-muted-foreground/20",
  search: "text-muted-foreground/20",
  "first-time": "text-primary/20",
};

export function EmptyState({ icon, title, description, action, variant = "default" }: EmptyStateProps) {
  const Icon = icon || VARIANT_ICONS[variant] || BarChart3;
  const iconColor = VARIANT_COLORS[variant] || VARIANT_COLORS.default;

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 select-none">
      {/* Animated icon with floating effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={cn("relative", iconColor)}>
            <Icon className="w-16 h-16" strokeWidth={1} />
            {/* Subtle pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "1px solid currentColor", opacity: 0.3 }}
              animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        className="flex flex-col items-center gap-2 text-center max-w-[320px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
      >
        <h3 className="text-[15px] font-semibold text-foreground/70">{title}</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed">{description}</p>
      </motion.div>

      {/* Action */}
      {action && (
        <motion.button
          className="px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-[12px] font-medium hover:bg-primary/15 transition-colors cursor-pointer border border-primary/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          onClick={action.onClick}
        >
          {action.label}
        </motion.button>
      )}

      {/* Decorative dots */}
      <motion.div
        className="flex gap-1.5 mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full bg-muted-foreground/15"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
          />
        ))}
      </motion.div>
    </div>
  );
}