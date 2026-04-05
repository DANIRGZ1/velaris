import { RouterProvider } from "react-router";
import { router } from "./router";
import { useState, useEffect, useCallback } from "react";
import { IS_TAURI, tauriInvoke } from "./helpers/tauriWindow";
import { AnimatePresence } from "motion/react";
import { LoadingScreen } from "./components/LoadingScreen";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { ThemeProvider } from "next-themes";
import { Toaster } from "./components/ui/sonner";

const ACCENT_MAP: Record<string, { light: string; dark: string }> = {
  violet:  { light: "hsl(262, 83%, 58%)", dark: "hsl(262, 83%, 72%)" },
  blue:    { light: "hsl(217, 91%, 60%)", dark: "hsl(217, 91%, 72%)" },
  emerald: { light: "hsl(160, 84%, 39%)", dark: "hsl(160, 60%, 58%)" },
  rose:    { light: "hsl(350, 89%, 60%)", dark: "hsl(350, 89%, 72%)" },
  amber:   { light: "hsl(38,  92%, 50%)", dark: "hsl(38,  92%, 62%)" },
  cyan:    { light: "hsl(189, 94%, 43%)", dark: "hsl(189, 94%, 58%)" },
};

// Inject Google Fonts <link> into <head> to avoid Vite CSS module errors
if (!document.querySelector('link[data-velaris-fonts]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
  link.setAttribute('data-velaris-fonts', '');
  document.head.appendChild(link);
}

// Restore accent color synchronously before first paint (next-themes already applied .dark class by now)
try {
  const saved = localStorage.getItem("velaris-accent");
  if (saved && ACCENT_MAP[saved]) {
    const isDark = document.documentElement.classList.contains("dark");
    const hsl = isDark ? ACCENT_MAP[saved].dark : ACCENT_MAP[saved].light;
    const fg = isDark ? "#111113" : "#ffffff";
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--primary-foreground", fg);
    document.documentElement.style.setProperty("--accent-foreground", hsl);
    document.documentElement.style.setProperty("--ring", hsl.replace("hsl(", "hsla(").replace(")", ", 0.4)"));
    document.documentElement.style.setProperty("--sidebar-primary", hsl);
    document.documentElement.style.setProperty("--chart-1", hsl);
  }
} catch {}

const IS_OVERLAY = window.location.pathname === '/overlay';

function needsOnboarding() {
  try { return !localStorage.getItem("velaris-onboarded"); } catch { return false; }
}

export default function App() {
  const [isLoading, setIsLoading] = useState(!IS_OVERLAY);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Splash class: keeps body/root transparent during the small-window loading phase
  useEffect(() => {
    if (IS_TAURI && isLoading && !IS_OVERLAY) {
      document.documentElement.classList.add("splash");
    } else {
      document.documentElement.classList.remove("splash");
    }
  }, [isLoading]);

  // Pre-warm the champion ID cache so the first champ select action is instant
  useEffect(() => {
    if (IS_TAURI) {
      tauriInvoke("warmup_champion_cache").catch(() => {});
    }
  }, []);

  // Show onboarding after loading screen completes (not during it)
  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    if (!IS_OVERLAY && needsOnboarding()) setShowOnboarding(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {isLoading && !IS_OVERLAY && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard key="onboarding" onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      {/* Router always rendered so it loads beneath the overlays */}
      <RouterProvider router={router} />
      {!IS_OVERLAY && <Toaster position="bottom-right" richColors closeButton />}
    </ThemeProvider>
  );
}