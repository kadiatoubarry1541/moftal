import { useCallback } from "react";
import { useI18n } from "./useI18n";
import AR_ECOLE from "./ar-ecole";
import EN_TR from "./tr-en";
import MAN_TR from "./tr-man";
import PUL_TR from "./tr-pul";
import { LOTS } from "./lots";

// Traduction des textes tr("…") : pages de l'école, gestions, sites des pros,
// installation, hors connexion. La clé est le texte français lui-même : sans
// traduction connue, le français s'affiche tel quel (jamais une clé technique).
// Variables : tr("Supprimer {nom} ?", { nom }) — les {…} sont gardées dans la traduction.
export type Tr = (fr: string, vars?: Record<string, string | number | null | undefined>) => string;

function remplir(texte: string, vars?: Record<string, string | number | null | undefined>) {
  if (!vars) return texte;
  return texte.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k] ?? "") : m));
}

export function traduire(lang: string, fr: string, vars?: Record<string, string | number | null | undefined>) {
  // Anglais, arabe, mandingue et pular : traduction complète. Sans traduction connue, le français s'affiche.
  const dico = lang === "ar" ? AR_ECOLE : lang === "en" ? EN_TR : lang === "man" ? MAN_TR : lang === "pul" ? PUL_TR : null;
  const lot = LOTS[lang];
  const base = dico ? (dico[fr] ?? dico[fr.trim()] ?? lot?.[fr] ?? lot?.[fr.trim()] ?? fr) : fr;
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
  const locale = isAr ? "ar-u-nu-latn" : lang === "en" ? "en-GB" : "fr-FR";
  // Même disposition dans toutes les langues : la page n'est jamais retournée (voir I18nProvider)
  return { tr, lang, setLang, isAr, dir: "ltr" as "rtl" | "ltr", locale };
}
