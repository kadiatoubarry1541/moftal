import { useCallback } from "react";
import { useI18n } from "./useI18n";
import AR_ECOLE from "./ar-ecole";

// Traduction des pages de l'école (gestion interne, espaces parent / enseignant,
// bibliothèque, site vitrine). La clé est le texte français lui-même : sans
// traduction connue, le français s'affiche tel quel (jamais une clé technique).
// Variables : tr("Supprimer {nom} ?", { nom }) — les {…} sont gardées dans la traduction.
export type Tr = (fr: string, vars?: Record<string, string | number | null | undefined>) => string;

function remplir(texte: string, vars?: Record<string, string | number | null | undefined>) {
  if (!vars) return texte;
  return texte.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k] ?? "") : m));
}

export function traduire(lang: string, fr: string, vars?: Record<string, string | number | null | undefined>) {
  const base = lang === "ar" ? (AR_ECOLE[fr] ?? AR_ECOLE[fr.trim()] ?? fr) : fr;
  return remplir(base, vars);
}

/** Langue choisie hors React (impression, messages…). */
export function langueCourante(): string {
  try { return localStorage.getItem("lang") || "fr"; } catch { return "fr"; }
}

/** tr() hors React : utilise la langue enregistrée. */
export const trHors: Tr = (fr, vars) => traduire(langueCourante(), fr, vars);

export function useTraduction() {
  const { lang, setLang } = useI18n();
  const tr: Tr = useCallback((fr, vars) => traduire(lang, fr, vars), [lang]);
  const isAr = lang === "ar";
  // Dates et nombres : chiffres latins (0-9) même en arabe, comme sur les documents guinéens
  const locale = isAr ? "ar-u-nu-latn" : "fr-FR";
  return { tr, lang, setLang, isAr, dir: (isAr ? "rtl" : "ltr") as "rtl" | "ltr", locale };
}
