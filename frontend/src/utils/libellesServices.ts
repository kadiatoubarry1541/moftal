// Les « services » d'un compte pro sont des textes, sauf pour un restaurant :
// son menu y est enregistré en plats { name, price, … }. Pour l'affichage,
// chaque élément devient son texte (le nom du plat) — jamais un objet à l'écran.
export function libelleService(s: unknown): string {
  if (typeof s === "string") return s;
  if (s && typeof s === "object" && typeof (s as { name?: unknown }).name === "string") return (s as { name: string }).name;
  return "";
}

export function libellesServices(liste: unknown): string[] {
  return Array.isArray(liste) ? liste.map(libelleService).filter(Boolean) : [];
}

/** Compte pro prêt à afficher : services et spécialités en textes. */
export function avecLibellesServices<T extends { services?: unknown; specialties?: unknown }>(compte: T): T {
  return { ...compte, services: libellesServices(compte.services), specialties: libellesServices(compte.specialties) };
}
