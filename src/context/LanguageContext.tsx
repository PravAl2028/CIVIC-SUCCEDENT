import React, { createContext, useContext, useState, ReactNode } from "react";
import en from "../i18n/en";
import hi from "../i18n/hi";
import te from "../i18n/te";

type Language = "en" | "hi" | "te";

const translations: Record<Language, typeof en> = { en, hi, te };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof en;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("nagarika_language");
      if (saved && (saved === "en" || saved === "hi" || saved === "te")) return saved;
    } catch {}
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem("nagarika_language", lang); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const LANGUAGES = [
  { code: "en" as Language, label: "English", native: "English" },
  { code: "hi" as Language, label: "Hindi", native: "हिंदी" },
  { code: "te" as Language, label: "Telugu", native: "తెలుగు" }
];
