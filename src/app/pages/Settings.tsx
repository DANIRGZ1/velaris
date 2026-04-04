import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import { useLanguage } from "../contexts/LanguageContext";
import { playAlertSound } from "../utils/audio";
import { loadSettings, saveSettings, getDefaultSettings, type AppSettings, getStoredIdentity, setStoredIdentity, clearStoredIdentity, type StoredIdentity } from "../services/dataService";
import { checkGroq, saveGroqKey, clearGroqKey } from "../services/coachService";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";
import {
  Monitor,
  Moon,
  Sun,
  Globe,
  Power,
  Layers,
  Gamepad2,
  User,
  Bell,
  Shield,
  Trash2,
  Volume2,
  Cpu,
  RefreshCw,
  LogOut,
  Palette,
  Sparkles,
  Keyboard,
  Key,
  Bot,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import { WhatsNewTrigger } from "../components/WhatsNewModal";
import { useNavigate, useSearchParams } from "react-router";
import { useCelebration } from "../contexts/CelebrationContext";

// Premium Switch Component
function Switch({ checked, onChange, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border/20 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-secondary",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <motion.span
        initial={false}
        animate={{
          x: checked ? 16 : 2,
        }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none inline-block h-[14px] w-[14px] transform rounded-full bg-card shadow-[0_1px_2px_rgba(0,0,0,0.1)] ring-0"
      />
    </button>
  );
}

// Custom Select Component — matches app aesthetic, no native browser dropdown
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-secondary/60 hover:bg-secondary border border-border/50 text-foreground text-[13px] font-medium rounded-lg pl-3 pr-2.5 py-1.5 transition-colors cursor-pointer min-w-[140px] justify-between"
      >
        <span>{selected?.label ?? value}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        >
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-1 z-50 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-full"
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer",
                  opt.value === value
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                )}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Section Header with icon circle
function SectionHeader({ icon: Icon, label, color = "bg-primary/10 text-primary" }: { icon: React.ComponentType<{ className?: string }>; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-sm font-semibold tracking-wide text-foreground uppercase">{label}</span>
    </div>
  );
}

// Theme Toggle Button group
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-8 w-[120px] bg-secondary/50 rounded-lg animate-pulse" />;

  const options = [
    { value: "light", icon: Sun, label: t("settings.theme.light") },
    { value: "dark", icon: Moon, label: t("settings.theme.dark") },
    { value: "system", icon: Monitor, label: t("settings.theme.system") },
  ];

  return (
    <div className="flex bg-secondary/40 p-1 rounded-xl border border-border/30">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={cn(
            "relative flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200",
            theme === opt.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {theme === opt.value && (
            <motion.div
              layoutId="theme-active"
              className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/50"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          <opt.icon className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// Celebration Settings Sub-section (inside Notifications tab)
function CelebrationSettingsSection({ settings, updateSetting, t }: {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  let celebration: ReturnType<typeof useCelebration> | null = null;
  try { celebration = useCelebration(); } catch { /* provider not mounted yet */ }

  return (
    <section className="space-y-4">
      <SectionHeader icon={Sparkles} label={t("settings.celebrations.title")} color="bg-violet-500/10 text-violet-500" />
      <div className="bg-card border border-border rounded-xl p-1 shadow-sm divide-y divide-border/50">
        {/* Master toggle */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{t("settings.celebrationsEnabled")}</span>
            <span className="text-xs text-muted-foreground">{t("settings.celebrationsEnabled.desc")}</span>
          </div>
          <Switch
            checked={settings.celebrationsEnabled}
            onChange={(v) => updateSetting("celebrationsEnabled", v)}
          />
        </div>
        {/* Sound toggle */}
        <div className={cn("flex items-center justify-between px-4 py-3 transition-opacity", !settings.celebrationsEnabled && "opacity-50 pointer-events-none")}>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{t("settings.celebrationSound")}</span>
            <span className="text-xs text-muted-foreground">{t("settings.celebrationSound.desc")}</span>
          </div>
          <Switch
            checked={settings.celebrationSound}
            onChange={(v) => updateSetting("celebrationSound", v)}
          />
        </div>
        {/* Sensitivity */}
        <div className={cn("flex items-center justify-between px-4 py-3 transition-opacity", !settings.celebrationsEnabled && "opacity-50 pointer-events-none")}>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{t("settings.celebrationSensitivity")}</span>
            <span className="text-xs text-muted-foreground">{t("settings.celebrationSensitivity.desc")}</span>
          </div>
          <Select
            value={settings.celebrationSensitivity}
            onChange={(v) => updateSetting("celebrationSensitivity", v)}
            options={[
              { value: "rank_only", label: t("settings.celebrationSensitivity.rank_only") },
              { value: "great_games", label: t("settings.celebrationSensitivity.great_games") },
              { value: "everything", label: t("settings.celebrationSensitivity.everything") },
            ]}
          />
        </div>
        {/* Preview buttons */}
        <div className={cn("px-4 py-3 bg-secondary/10 flex items-center justify-end gap-2 transition-opacity", !settings.celebrationsEnabled && "opacity-50 pointer-events-none")}>
          <button
            onClick={() => celebration?.triggerAchievement({
              type: "achievement", tier: "warm", icon: "zap",
              title: "celebration.dominantKda",
              subtitle: "celebration.dominantKda.desc",
              vars: { kda: "8.5", line: "12/2/5" },
              color: "text-violet-400",
              glowColor: "rgba(167, 139, 250, 0.35)",
            })}
            className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors rounded-lg flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" />
            {t("settings.testCelebration")}
          </button>
          <button
            onClick={() => celebration?.triggerRankUp({
              type: "rankup", tier: "epic",
              previousRank: "GOLD", previousDivision: "I",
              newRank: "PLATINUM", newDivision: "IV",
              isTierPromotion: true,
            })}
            className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors rounded-lg flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" />
            {t("settings.testRankUp")}
          </button>
        </div>
      </div>
    </section>
  );
}

type CategoryId = "general" | "overlay" | "account" | "notifications" | "advanced";

// ─── Hotkey Recorder ──────────────────────────────────────────────────────────

const MODIFIER_KEYS = new Set(["Alt", "Control", "Shift", "Meta"]);

function formatHotkey(mods: string[], key: string): string {
  return [...mods, key].join("+");
}

function HotkeyRecorder({ value, onChange }: { value: string; onChange: (hotkey: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [preview, setPreview] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { t } = useLanguage();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") { setIsRecording(false); setPreview(value); return; }
    if (MODIFIER_KEYS.has(e.key)) { setPreview(e.key + "+…"); return; }

    const mods: string[] = [];
    if (e.ctrlKey) mods.push("Control");
    if (e.altKey) mods.push("Alt");
    if (e.shiftKey) mods.push("Shift");
    if (e.metaKey) mods.push("Meta");

    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const hotkey = formatHotkey(mods, key);

    if (mods.length === 0) { setError(t("settings.hotkey.needsModifier")); return; }
    setError(null);
    setPreview(hotkey);
    setIsRecording(false);
    onChange(hotkey);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onBlur={() => setIsRecording(false)}
        onClick={() => { setIsRecording(true); setError(null); setSaved(false); }}
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer select-none transition-all",
          isRecording
            ? "border-primary/60 bg-primary/5 text-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_15%,transparent)]"
            : saved
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-500"
            : "border-border/50 bg-card text-foreground hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-2">
          <Keyboard className={cn("w-4 h-4", isRecording ? "text-primary animate-pulse" : "text-muted-foreground")} />
          <span className="font-mono text-[13px]">
            {isRecording ? t("settings.hotkey.recording") : preview || t("settings.hotkey.notConfigured")}
          </span>
        </div>
        <span className={cn(
          "text-[10px] font-mono px-2 py-0.5 rounded",
          isRecording ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
        )}>
          {isRecording ? t("settings.hotkey.escCancel") : t("settings.hotkey.clickToChange")}
        </span>
      </div>
      {error && <p className="text-[11px] text-amber-500 px-1">{error}</p>}
      {!IS_TAURI && (
        <p className="text-[11px] text-muted-foreground/60 px-1">{t("settings.hotkey.desktopOnly")}</p>
      )}
    </div>
  );
}

export function Settings() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>(() => {
    try {
      const saved = localStorage.getItem("velaris-settings-tab");
      if (saved && ["general", "overlay", "account", "notifications", "advanced"].includes(saved))
        return saved as CategoryId;
    } catch {}
    return "general";
  });
  const [overlayHotkey, setOverlayHotkey] = useState("Alt+F9");
  const [storedIdentity, setStoredIdentityState] = useState<StoredIdentity | null>(() => getStoredIdentity());
  const [riotIdInput, setRiotIdInput] = useState("");
  const [regionInput, setRegionInput] = useState("EUW");
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isAccountLinked = storedIdentity !== null;
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [groqKeyInput, setGroqKeyInput] = useState("");
  const [groqKeyConfigured, setGroqKeyConfigured] = useState(() => checkGroq().available);
  const [groqKeySaving, setGroqKeySaving] = useState(false);
  const [groqKeyError, setGroqKeyError] = useState(false);
  const [showGroqClearConfirm, setShowGroqClearConfirm] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);

  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle ?tab=account from ProfileDropdown
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["general", "overlay", "account", "notifications", "advanced"].includes(tab)) {
      setActiveCategory(tab as CategoryId);
    }
  }, [searchParams]);

  // Load current overlay hotkey on mount
  useEffect(() => {
    if (!IS_TAURI) return;
    tauriInvoke<string>("get_overlay_hotkey")
      .then(h => setOverlayHotkey(h))
      .catch(() => {});
  }, []);

  const categories = [
    { id: "general", label: t("settings.general"), icon: Monitor },
    { id: "overlay", label: t("settings.overlay"), icon: Layers },
    { id: "account", label: t("settings.account"), icon: User },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    { id: "advanced", label: t("settings.advanced"), icon: Shield },
  ] as const;

  const handleSaveGroqKey = async () => {
    const trimmed = groqKeyInput.trim();
    if (!trimmed.startsWith("gsk_")) { setGroqKeyError(true); return; }
    setGroqKeySaving(true);
    await saveGroqKey(trimmed);
    setGroqKeyConfigured(true);
    setGroqKeyInput("");
    setGroqKeyError(false);
    setGroqKeySaving(false);
    toast.success(t("settings.aiCoach.saved"));
  };

  // Settings State - loaded from localStorage via dataService
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [accentColor, setAccentColor] = useState(() => {
    try { return localStorage.getItem("velaris-accent") || "violet"; } catch { return "violet"; }
  });

  const ACCENT_COLORS = [
    { id: "violet", label: "Violet", hsl: "hsl(262, 83%, 58%)", darkHsl: "hsl(262, 83%, 72%)", hex: "#7C3AED" },
    { id: "blue", label: "Blue", hsl: "hsl(217, 91%, 60%)", darkHsl: "hsl(217, 91%, 72%)", hex: "#3B82F6" },
    { id: "emerald", label: "Emerald", hsl: "hsl(160, 84%, 39%)", darkHsl: "hsl(160, 60%, 58%)", hex: "#10B981" },
    { id: "rose", label: "Rose", hsl: "hsl(350, 89%, 60%)", darkHsl: "hsl(350, 89%, 72%)", hex: "#F43F5E" },
    { id: "amber", label: "Amber", hsl: "hsl(38, 92%, 50%)", darkHsl: "hsl(38, 92%, 62%)", hex: "#F59E0B" },
    { id: "cyan", label: "Cyan", hsl: "hsl(189, 94%, 43%)", darkHsl: "hsl(189, 94%, 58%)", hex: "#06B6D4" },
  ];

  const applyAccent = (colorId: string) => {
    const color = ACCENT_COLORS.find(c => c.id === colorId);
    if (!color) return;
    setAccentColor(colorId);
    try { localStorage.setItem("velaris-accent", colorId); } catch {}
    // Use lighter variant in dark mode for better contrast
    const isDark = document.documentElement.classList.contains("dark");
    const hsl = isDark ? color.darkHsl : color.hsl;
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--primary-foreground", isDark ? "#111113" : "#ffffff");
    document.documentElement.style.setProperty("--accent-foreground", hsl);
    document.documentElement.style.setProperty("--ring", hsl.replace("hsl(", "hsla(").replace(")", ", 0.4)"));
    document.documentElement.style.setProperty("--sidebar-primary", hsl);
    document.documentElement.style.setProperty("--chart-1", hsl);
    toast.success(`Accent color changed to ${color.label}`);
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col -mx-12 -my-14 overflow-hidden">
      {/* Settings Header */}
      <div className="flex-shrink-0 px-12 pt-14 pb-6 border-b border-border/40 bg-background/80 backdrop-blur-xl z-10 sticky top-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("settings.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
          </div>
          <WhatsNewTrigger />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-[220px] flex-shrink-0 border-r border-border/40 bg-background/50 overflow-y-auto pl-12 py-6 pr-4">
          <nav className="flex flex-col gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); try { localStorage.setItem("velaris-settings-tab", cat.id); } catch {} }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                  activeCategory === cat.id
                    ? "bg-primary/8 text-foreground shadow-sm border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground border border-transparent"
                )}
              >
                <cat.icon className="w-4 h-4 opacity-80" />
                {cat.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Settings Content */}
        <main className="flex-1 overflow-y-auto px-10 py-8">
          <div className="max-w-2xl mx-auto space-y-8 pb-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-8"
              >
                {/* GENERAL */}
                {activeCategory === "general" && (
                  <>
                    <section className="space-y-4">
                      <SectionHeader icon={Palette} label={t("settings.appearance")} />
                      <div className="bg-card border border-border rounded-xl p-1 shadow-sm card-lift card-shine">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.theme")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.theme.desc")}</span>
                          </div>
                          <ThemeToggle />
                        </div>
                      </div>
                    </section>

                    {/* Accent Color */}
                    <section className="space-y-4">
                      <SectionHeader icon={Sparkles} label="Accent Color" color="bg-violet-500/10 text-violet-500" />
                      <div className="bg-card border border-border rounded-xl p-4 shadow-sm card-lift card-shine">
                        <p className="text-xs text-muted-foreground mb-3">Choose the primary accent color for the interface</p>
                        <div className="flex items-center gap-3">
                          {ACCENT_COLORS.map((color) => (
                            <button
                              key={color.id}
                              onClick={() => applyAccent(color.id)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 transition-all duration-200 cursor-pointer hover:scale-110",
                                accentColor === color.id
                                  ? "border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background"
                                  : "border-transparent"
                              )}
                              style={{ 
                                backgroundColor: color.hex,
                                ringColor: accentColor === color.id ? color.hex : undefined,
                              }}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <SectionHeader icon={Monitor} label={t("settings.system")} color="bg-sky-500/10 text-sky-500" />
                      <div className="bg-card border border-border rounded-xl p-1 shadow-sm divide-y divide-border/50 card-lift">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.language")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.language.desc")}</span>
                          </div>
                          <Select
                            value={language}
                            onChange={(v) => setLanguage(v as any)}
                            options={[
                              { value: "en", label: "English" },
                              { value: "es", label: "Español" },
                              { value: "kr", label: "한국어" },
                            ]}
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.launch")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.launch.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.launchOnStartup}
                            onChange={(v) => updateSetting("launchOnStartup", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.hardware")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.hardware.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.hardwareAccel}
                            onChange={(v) => updateSetting("hardwareAccel", v)}
                          />
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {/* OVERLAY */}
                {activeCategory === "overlay" && (
                  <>
                    {/* Borderless windowed notice */}
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 px-4 py-3 rounded-xl border border-amber-500/25 bg-amber-500/8 backdrop-blur-sm"
                    >
                      <span className="text-amber-400 text-base mt-0.5">⚠️</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-amber-300">Requiere Pantalla Completa sin bordes</span>
                        <span className="text-xs text-amber-300/70 leading-relaxed">
                          El overlay solo funciona en modo <strong className="text-amber-200">Pantalla Completa sin bordes</strong> (Borderless Windowed).
                          En fullscreen exclusivo, Windows no permite que otras ventanas aparezcan encima del juego.
                        </span>
                        <span className="text-[11px] text-amber-400/50 mt-1">
                          LoL → Configuración → Video → Modo de pantalla → Pantalla Completa sin bordes
                        </span>
                      </div>
                    </motion.div>

                    <section className="space-y-4">
                      <SectionHeader icon={Layers} label={t("settings.overlayStatus")} color="bg-indigo-500/10 text-indigo-500" />
                      <div className="bg-card border border-border rounded-xl p-1 shadow-sm card-lift card-shine divide-y divide-border/50">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.enableOverlay")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.enableOverlay.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.overlayEnabled}
                            onChange={(v) => updateSetting("overlayEnabled", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">Auto-importar runas</span>
                            <span className="text-xs text-muted-foreground">
                              Importa automáticamente la página de runas óptima al elegir campeón en champ select
                            </span>
                          </div>
                          <Switch
                            checked={settings.autoImportRunes ?? true}
                            onChange={(v) => updateSetting("autoImportRunes", v)}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <SectionHeader icon={Keyboard} label="Hotkey de Overlay" color="bg-violet-500/10 text-violet-500" />
                      <div className={cn(
                        "bg-card border border-border rounded-xl p-4 shadow-sm space-y-3",
                        !settings.overlayEnabled && "opacity-50 pointer-events-none"
                      )}>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-foreground">{t("settings.overlay.hotkeyLabel")}</span>
                          <span className="text-xs text-muted-foreground">{t("settings.overlay.hotkeyDesc")}</span>
                        </div>
                        <HotkeyRecorder
                          value={overlayHotkey}
                          onChange={async (hotkey) => {
                            setOverlayHotkey(hotkey);
                            if (!IS_TAURI) return;
                            try {
                              await tauriInvoke("set_overlay_hotkey", { hotkey });
                              toast.success(t("settings.overlay.hotkeyUpdated").replace("{hotkey}", hotkey));
                            } catch (e: any) {
                              toast.error(`Error al registrar hotkey: ${e}`);
                            }
                          }}
                        />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <SectionHeader icon={Gamepad2} label={t("settings.overlayFeatures")} color="bg-emerald-500/10 text-emerald-500" />
                      <div className={cn(
                        "bg-card border border-border rounded-xl p-1 shadow-sm divide-y divide-border/50 transition-opacity duration-300",
                        !settings.overlayEnabled && "opacity-50 pointer-events-none"
                      )}>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.enemySpells")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.enemySpells.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.showEnemySpells}
                            onChange={(v) => updateSetting("showEnemySpells", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.jungleTimers")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.jungleTimers.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.showJungleTimers}
                            onChange={(v) => updateSetting("showJungleTimers", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.opacity")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.opacity.desc")}</span>
                          </div>
                          <Select
                            value={settings.overlayOpacity}
                            onChange={(v) => updateSetting("overlayOpacity", v)}
                            options={[
                              { value: "100", label: "100%" },
                              { value: "90", label: "90%" },
                              { value: "75", label: "75%" },
                              { value: "50", label: "50%" },
                            ]}
                          />
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {/* ACCOUNT */}
                {activeCategory === "account" && (
                  <>
                    <section className="space-y-4">
                      <SectionHeader icon={Gamepad2} label={t("settings.riotAccount")} color="bg-primary/10 text-primary" />
                      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        {isAccountLinked && !isEditing ? (
                          <>
                            <div className="p-4 flex items-center justify-between border-b border-border/50">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
                                  <Gamepad2 className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-foreground flex items-center gap-2">
                                    {storedIdentity!.name} <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded-md font-mono">#{storedIdentity!.tag}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{t("settings.connectedRegion")}: {storedIdentity!.region}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => { setRiotIdInput(`${storedIdentity!.name}#${storedIdentity!.tag}`); setRegionInput(storedIdentity!.region); setIsEditing(true); }} className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border/50 transition-colors rounded-lg cursor-pointer">
                                  {t("settings.editAccount")}
                                </button>
                                {showUnlinkConfirm ? (
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => { clearStoredIdentity(); setStoredIdentityState(null); setShowUnlinkConfirm(false); toast.success(t("settings.accountUnlinked")); }} className="px-3 py-1.5 text-xs font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors rounded-lg cursor-pointer">{t("settings.confirm")}</button>
                                    <button onClick={() => setShowUnlinkConfirm(false)} className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border/50 transition-colors rounded-lg cursor-pointer">{t("settings.cancel")}</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setShowUnlinkConfirm(true)} className="px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors rounded-lg flex items-center gap-1.5 cursor-pointer">
                                    <LogOut className="w-3.5 h-3.5" />
                                    {t("settings.unlink")}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="px-4 py-3 bg-secondary/20 flex justify-between items-center">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-foreground">{t("settings.autoAccept")}</span>
                                <span className="text-xs text-muted-foreground">{t("settings.autoAccept.desc")}</span>
                              </div>
                              <Switch
                                checked={settings.autoAccept}
                                onChange={(v) => updateSetting("autoAccept", v)}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-muted-foreground border border-border/40">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{isEditing ? t("settings.editAccount") : t("settings.setRiotId")}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{t("settings.riotIdDesc")}</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">{t("settings.riotIdLabel")}</label>
                                <input
                                  type="text"
                                  value={riotIdInput}
                                  onChange={(e) => setRiotIdInput(e.target.value)}
                                  placeholder="Name#TAG"
                                  className="w-full h-9 px-3 bg-secondary/50 border border-border/50 rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">{t("settings.regionLabel")}</label>
                                <div className="flex gap-1.5 flex-wrap">
                                  {["EUW", "EUNE", "NA", "KR", "BR", "LAN", "LAS", "OCE", "TR", "RU", "JP", "PH", "SG", "TH", "TW", "VN"].map((r) => (
                                    <button
                                      key={r}
                                      onClick={() => setRegionInput(r)}
                                      className={cn(
                                        "px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer",
                                        regionInput === r
                                          ? "bg-primary/10 border-primary/30 text-primary"
                                          : "bg-secondary/40 border-border/20 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/40"
                                      )}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => {
                                  const parts = riotIdInput.trim().split("#");
                                  if (parts.length !== 2 || !parts[0] || !parts[1]) {
                                    toast.error(t("settings.invalidRiotId"));
                                    return;
                                  }
                                  const identity: StoredIdentity = { name: parts[0], tag: parts[1], profileIconId: storedIdentity?.profileIconId || 29, region: regionInput };
                                  setStoredIdentity(identity);
                                  setStoredIdentityState(identity);
                                  setIsEditing(false);
                                  toast.success(t("settings.accountLinkedSuccess"));
                                }}
                                disabled={!riotIdInput.includes("#")}
                                className={cn(
                                  "px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer",
                                  riotIdInput.includes("#")
                                    ? "text-primary-foreground bg-primary hover:bg-primary/90"
                                    : "text-muted-foreground bg-secondary/60 cursor-not-allowed"
                                )}
                              >
                                {isEditing ? t("settings.saveChanges") : t("settings.linkAccount")}
                              </button>
                              {isEditing && (
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border/50 transition-colors rounded-lg cursor-pointer">
                                  {t("settings.cancel")}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* AI Coach — enable/disable + Groq key */}
                    <section className="space-y-4">
                      <SectionHeader icon={Bot} label={t("settings.aiCoach")} color="bg-primary/10 text-primary" />
                      <div className="bg-card border border-border rounded-xl p-1 shadow-sm divide-y divide-border/50">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.coachEnabled")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.coachEnabled.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.coachEnabled ?? true}
                            onChange={(v) => updateSetting("coachEnabled", v)}
                          />
                        </div>
                        <div className={cn("flex items-center justify-between px-4 py-3 transition-opacity", !(settings.coachEnabled ?? true) && "opacity-50 pointer-events-none")}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.coachAutoAnalyze")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.coachAutoAnalyze.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.coachAutoAnalyze ?? false}
                            onChange={(v) => updateSetting("coachAutoAnalyze", v)}
                          />
                        </div>
                      </div>
                      <div className={cn("bg-card border border-border rounded-xl overflow-hidden shadow-sm p-4 space-y-3 transition-opacity", !(settings.coachEnabled ?? true) && "opacity-50 pointer-events-none")}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">{t("settings.aiCoach.desc")}</p>
                          <span className={cn(
                            "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            groqKeyConfigured
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-secondary text-muted-foreground border-border/30"
                          )}>
                            {groqKeyConfigured ? t("settings.aiCoach.active") : t("settings.aiCoach.notSet")}
                          </span>
                        </div>
                        {groqKeyConfigured ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-[12px] text-emerald-500">
                              <Key className="w-3.5 h-3.5" />
                              {t("settings.aiCoach.active")} — gsk_••••••••
                            </div>
                            {showGroqClearConfirm ? (
                              <div className="flex items-center gap-2">
                                <button onClick={async () => { await clearGroqKey(); setGroqKeyConfigured(false); setShowGroqClearConfirm(false); toast.success(t("settings.aiCoach.cleared")); }} className="px-3 py-1.5 text-xs font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors rounded-lg cursor-pointer">{t("settings.confirm")}</button>
                                <button onClick={() => setShowGroqClearConfirm(false)} className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border/50 transition-colors rounded-lg cursor-pointer">{t("settings.cancel")}</button>
                              </div>
                            ) : (
                              <button onClick={() => setShowGroqClearConfirm(true)} className="px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors rounded-lg cursor-pointer">
                                {t("settings.aiCoach.clear")}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <input
                                  type={showGroqKey ? "text" : "password"}
                                  value={groqKeyInput}
                                  onChange={(e) => { setGroqKeyInput(e.target.value); setGroqKeyError(false); }}
                                  onKeyDown={(e) => e.key === "Enter" && handleSaveGroqKey()}
                                  placeholder={t("settings.aiCoach.placeholder")}
                                  className={cn(
                                    "w-full h-9 pl-3 pr-9 bg-secondary/50 border rounded-lg text-[12px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 transition-all font-mono",
                                    groqKeyError ? "border-rose-500/60 focus:ring-rose-500/20" : "border-border/50 focus:border-primary/40 focus:ring-primary/10"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowGroqKey(v => !v)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showGroqKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <button
                                onClick={handleSaveGroqKey}
                                disabled={!groqKeyInput.trim() || groqKeySaving}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0",
                                  groqKeyInput.trim() && !groqKeySaving
                                    ? "text-primary-foreground bg-primary hover:bg-primary/90"
                                    : "text-muted-foreground bg-secondary/60 cursor-not-allowed"
                                )}
                              >
                                {t("settings.aiCoach.save")}
                              </button>
                            </div>
                            {groqKeyError && <p className="text-[11px] text-rose-400">{t("settings.aiCoach.keyError")}</p>}
                          </div>
                        )}
                      </div>
                    </section>

                  </>
                )}

                {/* NOTIFICATIONS */}
                {activeCategory === "notifications" && (
                  <>
                    <section className="space-y-4">
                      <SectionHeader icon={Bell} label={t("settings.alerts")} color="bg-rose-500/10 text-rose-500" />
                      <div className="bg-card border border-border rounded-xl p-1 shadow-sm divide-y divide-border/50">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.desktopAlerts")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.desktopAlerts.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.desktopAlerts}
                            onChange={(v) => updateSetting("desktopAlerts", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.volume")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.volume.desc")}</span>
                          </div>
                          <div className="flex items-center gap-3 w-[150px]">
                            <Volume2 className="w-4 h-4 text-muted-foreground" />
                            <input 
                              type="range" 
                              min="0" max="100" 
                              value={settings.soundVolume}
                              onChange={(e) => updateSetting("soundVolume", e.target.value)}
                              className="w-full h-1.5 bg-secondary rounded-full appearance-none outline-none accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer"
                            />
                          </div>
                        </div>
                        <div className="px-4 py-3 bg-secondary/10 flex items-center justify-end gap-2">
                           <button 
                             onClick={() => playAlertSound("match_found", parseInt(settings.soundVolume))}
                             className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors rounded-lg flex items-center gap-1.5"
                           >
                             <Volume2 className="w-3 h-3" />
                             {t("settings.testMatch")}
                           </button>
                           <button 
                             onClick={() => playAlertSound("your_turn", parseInt(settings.soundVolume))}
                             className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors rounded-lg flex items-center gap-1.5"
                           >
                             <Volume2 className="w-3 h-3" />
                             {t("settings.testTurn")}
                           </button>
                        </div>
                      </div>
                    </section>

                    {/* Celebrations */}
                    <CelebrationSettingsSection settings={settings} updateSetting={updateSetting} t={t} />
                  </>
                )}

                {/* ADVANCED */}
                {activeCategory === "advanced" && (
                  <>
                    <section className="space-y-4">
                      <SectionHeader icon={Shield} label={t("settings.privacy")} color="bg-emerald-500/10 text-emerald-500" />
                      <div className="bg-card border border-border rounded-xl p-1 shadow-sm divide-y divide-border/50 card-lift">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.telemetry")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.telemetry.desc")}</span>
                          </div>
                          <Switch
                            checked={settings.telemetry}
                            onChange={(v) => updateSetting("telemetry", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.privacyPolicy")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.privacyPolicyDesc")}</span>
                          </div>
                          <button
                            onClick={() => navigate("/privacy")}
                            className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border/50 transition-colors rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {t("settings.view")}
                          </button>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <SectionHeader icon={Cpu} label={t("settings.maintenance")} color="bg-rose-500/10 text-rose-500" />
                      <div className="bg-card border border-border rounded-xl p-1 shadow-sm divide-y divide-border/50 card-lift">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.cache")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.cache.desc")}</span>
                          </div>
                          <button onClick={() => {
                            const keys = Object.keys(localStorage).filter(k => k.startsWith("velaris"));
                            let totalSize = 0;
                            keys.forEach(k => { totalSize += (localStorage.getItem(k) || "").length; localStorage.removeItem(k); });
                            const kbFreed = (totalSize / 1024).toFixed(1);
                            setSettings(loadSettings());
                            toast.success(t("settings.cacheCleared", { kb: kbFreed, count: keys.length }));
                          }} className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border/50 transition-colors rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                            {t("settings.clearCache")}
                          </button>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{t("settings.restart")}</span>
                            <span className="text-xs text-muted-foreground">{t("settings.restart.desc")}</span>
                          </div>
                          {showResetConfirm ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => {
                                const defaults = getDefaultSettings();
                                setSettings(defaults);
                                saveSettings(defaults);
                                setShowResetConfirm(false);
                                toast.success(t("settings.settingsReset"));
                              }} className="px-3 py-1.5 text-xs font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors rounded-lg cursor-pointer">{t("settings.confirm")}</button>
                              <button onClick={() => setShowResetConfirm(false)} className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border/50 transition-colors rounded-lg cursor-pointer">{t("settings.cancel")}</button>
                            </div>
                          ) : (
                            <button onClick={() => setShowResetConfirm(true)} className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border/50 transition-colors rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer">
                              <RefreshCw className="w-3.5 h-3.5" />
                              {t("settings.restartBtn")}
                            </button>
                          )}
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}