/**
 * PageHeader — Velaris
 * 
 * Reusable page header component with consistent visual style.
 * Supports title, subtitle, icon, badge, breadcrumb, and optional right-side actions.
 */

import { cn } from "./ui/utils";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import { motion } from "motion/react";

interface Breadcrumb {
  label: string;
  to?: string; // If undefined, renders as text (current page)
}

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Lucide icon rendered before the top label */
  icon?: LucideIcon;
  /** Small uppercase label above the title (e.g. category) */
  label?: string;
  /** Badge next to the title (e.g. "Season 15", "Beta") */
  badge?: string;
  /** Badge variant for color */
  badgeVariant?: "default" | "primary" | "success" | "warning";
  /** Breadcrumb trail */
  breadcrumbs?: Breadcrumb[];
  /** Right-side slot for action buttons */
  actions?: React.ReactNode;
  /** Additional className */
  className?: string;
}

const BADGE_STYLES: Record<string, string> = {
  default: "bg-secondary text-foreground border-border/60",
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  label,
  badge,
  badgeVariant = "default",
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      className={cn("mb-10", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-3 text-[11px] text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
              {crumb.to ? (
                <NavLink
                  to={crumb.to}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  {crumb.label}
                </NavLink>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Label row */}
      {(Icon || label) && (
        <motion.div
          className="flex items-center gap-2.5 mb-2"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_20%,transparent)]">
              <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
            </div>
          )}
          {label && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {label}
            </span>
          )}
        </motion.div>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <motion.div
          className="flex items-center gap-3 min-w-0"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {badge && (
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0",
              BADGE_STYLES[badgeVariant]
            )}>
              {badge}
            </span>
          )}
        </motion.div>

        {actions && (
          <motion.div
            className="flex items-center gap-2 shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            {actions}
          </motion.div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <motion.p
          className="text-[14px] text-muted-foreground mt-2 leading-relaxed max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.14 }}
        >
          {subtitle}
        </motion.p>
      )}

      {/* Gradient accent line under title */}
      <motion.div
        className="gradient-line mt-4"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "left" }}
      />
    </motion.div>
  );
}
