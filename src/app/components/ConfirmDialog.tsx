/**
 * ConfirmDialog — Velaris
 * Reusable confirmation modal for destructive actions.
 * Renders as a centered modal with backdrop blur.
 */

import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button on open, trap Escape
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => confirmRef.current?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handler, true);
    };
  }, [open, onCancel]);

  const isDanger = variant === "danger";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            className="fixed z-[81] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] max-w-[90vw] bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="alertdialog"
            aria-labelledby="confirm-title"
            aria-describedby={description ? "confirm-desc" : undefined}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-2">
              <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDanger ? "bg-destructive/10" : "bg-amber-500/10"}`}>
                <AlertTriangle className={`w-4 h-4 ${isDanger ? "text-destructive" : "text-amber-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="confirm-title" className="text-[14px] font-semibold text-foreground">
                  {title}
                </h3>
                {description && (
                  <p id="confirm-desc" className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onCancel}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-secondary transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <button
                onClick={onCancel}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                {cancelLabel || t("common.cancel")}
              </button>
              <button
                ref={confirmRef}
                onClick={onConfirm}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium text-white transition-colors cursor-pointer ${
                  isDanger
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {confirmLabel || t("common.delete")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
