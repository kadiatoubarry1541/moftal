// Texte d'un médicament d'ordonnance, quel que soit son format enregistré :
// texte simple, { medicament } (saisie de la gestion) ou { nom, dosage,
// frequence, duree }. Un objet affiché tel quel ferait planter toute la page.
export function libelleMedicament(m: unknown): string {
  if (m == null) return "";
  if (typeof m !== "object") return String(m);
  const o = m as Record<string, unknown>;
  if (o.medicament) return String(o.medicament);
  return [o.nom, o.dosage, o.frequence, o.duree].filter(Boolean).map(String).join(" — ");
}
