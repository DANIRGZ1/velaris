import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, BookOpen } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "feature" | "improvement" | "fix" | "design";
    textKey: string;
  }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.1-alpha",
    date: "28 Mar 2026",
    changes: [
      { type: "fix",         textKey: "whatsnew.v011.1" },
      { type: "fix",         textKey: "whatsnew.v011.2" },
      { type: "feature",     textKey: "whatsnew.v011.3" },
      { type: "improvement", textKey: "whatsnew.v011.4" },
      { type: "improvement", textKey: "whatsnew.v011.5" },
      { type: "fix",         textKey: "whatsnew.v011.6" },
      { type: "fix",         textKey: "whatsnew.v011.7" },
      { type: "improvement", textKey: "whatsnew.v011.8" },
      { type: "improvement", textKey: "whatsnew.v011.9" },
      { type: "fix",         textKey: "whatsnew.v011.10" },
    ],
  },
  {
    version: "0.1.0-alpha",
    date: "11 Mar 2026",
    changes: [
      { type: "feature", textKey: "whatsnew.v010.1" },
      { type: "feature", textKey: "whatsnew.v010.2" },
      { type: "feature", textKey: "whatsnew.v010.3" },
      { type: "feature", textKey: "whatsnew.v010.4" },
      { type: "feature", textKey: "whatsnew.v010.5" },
      { type: "improvement", textKey: "whatsnew.v010.6" },
      { type: "design", textKey: "whatsnew.v010.7" },
      { type: "fix", textKey: "whatsnew.v010.8" },
      { type: "improvement", textKey: "whatsnew.v010.9" },
    ],
  },
  {
    version: "0.0.9-alpha",
    date: "8 Mar 2026",
    changes: [
      { type: "feature", textKey: "whatsnew.v009.1" },
      { type: "feature", textKey: "whatsnew.v009.2" },
      { type: "feature", textKey: "whatsnew.v009.3" },
      { type: "improvement", textKey: "whatsnew.v009.4" },
      { type: "design", textKey: "whatsnew.v009.5" },
      { type: "fix", textKey: "whatsnew.v009.6" },
    ],
  },
  {
    version: "0.0.8-alpha",
    date: "3 Mar 2026",
    changes: [
      { type: "feature", textKey: "whatsnew.v008.1" },
      { type: "feature", textKey: "whatsnew.v008.2" },
      { type: "feature", textKey: "whatsnew.v008.3" },
      { type: "improvement", textKey: "whatsnew.v008.4" },
      { type: "design", textKey: "whatsnew.v008.5" },
    ],
  },
];

const WHATS_NEW_KEY = "velaris-whats-new-seen";

// Module-level opener — set when WhatsNewModal mounts, cleared on unmount.
// WhatsNewTrigger calls this directly so there's no DOM event indirection.
let _openFn: (() => void) | null = null;
export function triggerWhatsNew() { _openFn?.(); }

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  // Register the module-level opener while this modal is mounted
  useEffect(() => {
    _openFn = () => setIsOpen(true);
    return () => { _openFn = null; };
  }, []);

  useEffect(() => {
    const lastSeen = localStorage.getItem(WHATS_NEW_KEY);
    const latestVersion = CHANGELOG[0]?.version;

    // First-time user: seed key silently so the modal doesn't appear on first launch
    if (!lastSeen) {
      localStorage.setItem(WHATS_NEW_KEY, latestVersion || "");
      return;
    }

    // New version → show after splash/onboarding
    if (lastSeen !== latestVersion) {
      const timer = setTimeout(() => setIsOpen(true), 5500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(WHATS_NEW_KEY, CHANGELOG[0]?.version || "");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[65] bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed z-[66] inset-0 flex items-center justify-center p-6 pointer-events-none"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="w-[520px] max-w-full max-h-[70vh] bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground">{t("whatsnew.changelog")}</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("whatsnew.changelogDesc")}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {CHANGELOG.map((entry, entryIdx) => (
                  <div key={entry.version} className={cn("px-6 py-5", entryIdx > 0 && "border-t border-border/30")}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[12px] font-bold font-mono text-foreground">v{entry.version}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{entry.date}</span>
                      {entryIdx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                    <div className="flex flex-col gap-2">
                      {entry.changes.map((change, i) => (
                        <motion.div
                          key={i}
                          className="flex items-start gap-3"
                          initial={entryIdx === 0 ? { opacity: 0, x: -6 } : {}}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: entryIdx === 0 ? i * 0.03 : 0 }}
                        >
                          <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider w-12 shrink-0 pt-px text-right">
                            {t(`whatsnew.type.${change.type}`) || change.type}
                          </span>
                          <span className="w-px h-3.5 bg-border shrink-0 mt-0.5" />
                          <p className="text-[12px] text-foreground/80 leading-relaxed flex-1">{t(change.textKey)}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{t("whatsnew.alphaFeedback")}</p>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-[12px] font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  {t("whatsnew.understood")}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Trigger button for the Settings page.
 * Calls the module-level opener registered by WhatsNewModal (which lives in Layout,
 * outside any motion/filter stacking context), so the portal always renders correctly.
 */
export function WhatsNewTrigger() {
  const { t } = useLanguage();
  return (
    <button
      onClick={triggerWhatsNew}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border/50 text-[12px] font-medium transition-colors cursor-pointer"
    >
      <BookOpen className="w-4 h-4 text-muted-foreground" />
      {t("whatsnew.viewNew")}
    </button>
  );
}
