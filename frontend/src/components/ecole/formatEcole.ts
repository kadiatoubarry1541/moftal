import { trHors, langueCourante } from "../../i18n/traduction";

export const heure = (d?: string | null) =>
  d ? new Date(d).toLocaleTimeString(langueCourante() === "ar" ? "ar-u-nu-latn" : "fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Conakry" }) : "—";

export function duree(debut?: string | null, fin?: string | null) {
  if (!debut) return "—";
  const min = Math.max(0, Math.round(((fin ? new Date(fin) : new Date()).getTime() - new Date(debut).getTime()) / 60000));
  return min >= 60
    ? trHors("{h} h {m}", { h: Math.floor(min / 60), m: String(min % 60).padStart(2, "0") })
    : trHors("{n} min", { n: min });
}

export const tailleTexte = (n?: number | null) => !n ? "" : n >= 1048576
  ? trHors("{n} Mo", { n: (n / 1048576).toFixed(1) })
  : trHors("{n} Ko", { n: Math.max(1, Math.round(n / 1024)) });
