// Recherche dans les listes de gestion interne (nom, téléphone, numéro…)

// Toutes les valeurs lisibles d'une fiche, y compris dans ses détails
// (articles d'une commande, médicaments d'une ordonnance…).
function valeursTexte(v: unknown, prof = 0): string[] {
  if (v == null || prof > 3) return [];
  if (typeof v === "string" && /^[[{]/.test(v.trim())) {
    try { return valeursTexte(JSON.parse(v), prof + 1); } catch { return [v]; }
  }
  if (typeof v !== "object") return [String(v)];
  return Object.values(v as Record<string, unknown>).flatMap(x => valeursTexte(x, prof + 1));
}
export function filtrer<T>(liste: T[] | null | undefined, recherche: string): T[] {
  const items = liste || [];
  const q = recherche.trim().toLowerCase();
  if (!q) return items;
  const mots = q.split(/\s+/);
  return items.filter(x => {
    const texte = valeursTexte(x).join(" ").toLowerCase();
    return mots.every(m => texte.includes(m));
  });
}
