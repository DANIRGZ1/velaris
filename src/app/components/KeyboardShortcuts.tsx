import { motion, AnimatePresence } from "motion/react";
import { X, Keyboard } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const shortcutGroups = [
    {
      title: t("shortcuts.navigation"),
      shortcuts: [
        { keys: [mod, "K"], description: t("shortcuts.openCmd") },
        { keys: [mod, "1"], description: t("shortcuts.goToDashboard") },
        { keys: [mod, "2"], description: t("shortcuts.goToMatches") },
        { keys: [mod, "3"], description: t("shortcuts.goToNotes") },
        { keys: [mod, "4"], description: t("shortcuts.goToChampSelect") },
        { keys: [mod, "5"], description: t("shortcuts.goToProfile") },
      ],
    },
    {
      title: t("shortcuts.actions"),
      shortcuts: [
        { keys: [mod, "N"], description: t("shortcuts.newNote") },
        { keys: [mod, "B"], description: t("shortcuts.toggleSidebar") },
        { keys: [mod, "S"], description: t("shortcuts.saveRunePage") },
        { keys: [mod, "F"], description: t("shortcuts.search") },
        { keys: ["Esc"], description: t("shortcuts.closeModal") },
        { keys: ["?"], description: t("shortcuts.showShortcuts") },
      ],
    },
    {
      title: t("shortcuts.viewGroup"),
      shortcuts: [
        { keys: [mod, "\\"], description: t("shortcuts.toggleFocus") },
        { keys: [mod, "."], description: t("shortcuts.toggleTheme") },
      ],
    },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // "?" key (Shift + /) to open shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            className="fixed z-[71] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[90vw] max-h-[80vh] bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-primary" />
                <h2 className="text-[16px] font-semibold text-foreground">{t("shortcuts.title")}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {shortcutGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{group.title}</h3>
                  <div className="flex flex-col gap-2">
                    {group.shortcuts.map((shortcut) => (
                      <div key={shortcut.description} className="flex items-center justify-between py-1.5">
                        <span className="text-[13px] text-foreground/80">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center">
                              <kbd className="px-2 py-1 rounded-md bg-secondary border border-border/50 text-[11px] font-mono font-medium text-foreground min-w-[28px] text-center shadow-sm">
                                {key}
                              </kbd>
                              {i < shortcut.keys.length - 1 && (
                                <span className="text-[10px] text-muted-foreground mx-0.5">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border/40 bg-secondary/20">
              <p className="text-[10px] text-muted-foreground text-center">
                {t("shortcuts.footer", { key: "?" })}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}