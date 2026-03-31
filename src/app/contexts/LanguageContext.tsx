import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { en, es, kr } from "../i18n";

type Language = "en" | "es" | "kr";

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<string, string>> = { en, es, kr };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem("velaris-language");
      if (stored === "en" || stored === "es" || stored === "kr") return stored;
    } catch {}
    return "es";
  });

  const setLanguageAndPersist = useCallback((lang: Language) => {
    try { localStorage.setItem("velaris-language", lang); } catch {}
    setLanguage(lang);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const value = translations[language]?.[key] || key;
    if (!vars) return value;
    return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), value);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageAndPersist, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "es" as Language,
      setLanguage: () => {},
      t: (key: string, vars?: Record<string, string | number>) => {
        const value = translations["es"][key] || key;
        if (!vars) return value;
        return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), value);
      }
    };
  }
  return context;
}