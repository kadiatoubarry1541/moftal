import React, { useCallback, useMemo, useState, useEffect } from "react";
import { LANG_LABELS, type LangCode } from "./strings";
import frStrings from "./langs/fr";
import { I18nContext } from "./I18nContext";

async function loadStrings(lang: LangCode): Promise<Record<string, string>> {
  if (lang === 'fr') return frStrings;
  switch (lang) {
    case 'en': return (await import('./langs/en')).default;
    case 'ar': return (await import('./langs/ar')).default;
    case 'man': return (await import('./langs/man')).default;
    case 'pul': return (await import('./langs/pul')).default;
    default: return frStrings;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const stored = (localStorage.getItem("lang") as LangCode) || "fr";
  const [lang, setLangState] = useState<LangCode>(stored);
  const [dict, setDict] = useState<Record<string, string>>(frStrings);

  useEffect(() => {
    if (stored !== 'fr') {
      loadStrings(stored).then(setDict);
    }
    document.documentElement.dir = stored === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    loadStrings(l).then(setDict);
  }, []);

  const t = useCallback(
    (key: string) => dict[key] ?? frStrings[key] ?? key,
    [dict],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, labels: LANG_LABELS }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
