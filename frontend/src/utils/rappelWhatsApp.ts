// Rappel par WhatsApp : ouvre la conversation avec un message déjà écrit
// (frais impayés, rendez-vous, loyer…). Numéros guinéens complétés en +224.
export function lienWhatsApp(telephone: string | null | undefined, message: string): string | null {
  let n = String(telephone || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.startsWith("00")) n = n.slice(2);
  if (n.length === 9 && n.startsWith("6")) n = `224${n}`;
  if (n.startsWith("0") && n.length === 10) n = `224${n.slice(1)}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

export function envoyerRappel(telephone: string | null | undefined, message: string) {
  const url = lienWhatsApp(telephone, message);
  if (!url) { alert("Aucun numéro de téléphone enregistré pour envoyer le rappel."); return; }
  window.open(url, "_blank");
}

export const gnfTexte = (n: unknown) => `${(Number(n) || 0).toLocaleString("fr-FR")} GNF`;
export const dateTexte = (d: unknown) => {
  const x = d ? new Date(d as string) : null;
  return x && !isNaN(x.getTime()) ? x.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "";
};
