// Traductions des pages, rangées par lots : chaque fichier lotN.ts exporte
// { "texte français": [anglais, arabe, mandingue, pular] }.
import type { Lot } from "./type";

const modules = import.meta.glob<{ default: Lot }>("./lot*.ts", { eager: true });

const LANGUES = ["en", "ar", "man", "pul"] as const;
export const LOTS: Record<string, Record<string, string>> = { en: {}, ar: {}, man: {}, pul: {} };
for (const m of Object.values(modules)) {
  for (const [fr, trad] of Object.entries(m.default)) {
    LANGUES.forEach((l, i) => { if (trad[i]) LOTS[l][fr] = trad[i]; });
  }
}
