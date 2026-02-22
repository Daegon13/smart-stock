"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Lang, translations } from "@/components/i18n/translations";

const KEY = "ss_lang_v1";

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved === "es" || saved === "en" || saved === "pt") setLang(saved);
  }, []);

  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang: (next) => {
      setLang(next);
      localStorage.setItem(KEY, next);
    },
    t: (key) => translations[lang][key] || translations.es[key] || key
  }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
