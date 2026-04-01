import { RouterProvider } from "react-router";
import { router } from "./router";
import { useState, useEffect, useCallback } from "react";
import { IS_TAURI, tauriInvoke, expandToFullWindow } from "./helpers/tauriWindow";
import { AnimatePresence } from "motion/react";
import { LoadingScreen } from "./components/LoadingScreen";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { ThemeProvider } from "next-themes";
import { Toaster } from "./components/ui/sonner";

const ACCENT_MAP: Record<string, string> = {
  violet: "hsl(262, 83%, 58%)", blue: "hsl(217, 91%, 60%)", emerald: "hsl(160, 84%, 39%)",
  rose: "hsl(350, 89%, 60%)", amber: "hsl(38, 92%, 50%)", cyan: "hsl(189, 94%, 43%)",
};

// Inject Google Fonts <link> into <head> to avoid Vite CSS module errors
if (!document.querySelector('link[data-velaris-fonts]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
  link.setAttribute('data-velaris-fonts', '');
  document.head.appendChild(link);
}

// Restore accent color synchronously before first paint
try {
  const saved = localStorage.getItem("velaris-accent");
  if (saved && ACCENT_MAP[saved]) {
    document.documentElement.style.setProperty("--primary", ACCENT_MAP[saved]);
    document.documentElement.style.setProperty("--primary-foreground", "#ffffff");
    document.documentElement.style.setProperty("--accent-foreground", ACCENT_MAP[saved]);
    document.documentElement.style.setProperty("--ring", ACCENT_MAP[saved].replace("hsl(", "hsla(").replace(")", ", 0.4)"));
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
  const handleLoadingComplete = useCallback(async () => {
    // Expand from splash window (320×370) to full app window (1280×800)
    await expandToFullWindow();
    setIsLoading(false);
    if (!IS_OVERLAY && needsOnboarding()) setShowOnboarding(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AnimatePresence>
        {isLoading && !IS_OVERLAY && (
          <LoadingScreen key="loading" onComplete={handleLoadingComplete} />
        )}
      </AnimatePresence>

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