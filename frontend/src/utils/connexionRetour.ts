// Page de connexion qui ramène ensuite exactement ici (application de gestion
// ouverte par son lien, avec « ?installer=1 » s'il y est) : sans ça, la personne
// ajoutée par l'établissement se retrouvait sur Moftal après s'être connectée et
// ne pouvait jamais installer l'application. /login accepte le téléphone,
// l'e-mail ou le NuméroH, et la première connexion (choix du mot de passe).
export function cheminConnexion() {
  // Déjà sur la page de connexion (deux redirections à la suite) : on garde la
  // même adresse de retour au lieu de l'emballer une deuxième fois
  if (window.location.pathname.startsWith("/login")) return window.location.pathname + window.location.search;
  return `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

/** Adresse de retour valable, même si elle a été emballée plusieurs fois (« /login?redirect=/login?redirect=… »). */
export function retourApresConnexion(brut: string | null): string | null {
  let r = brut;
  for (let i = 0; i < 5 && r && r.startsWith("/login"); i++) {
    r = new URLSearchParams(r.split("?")[1] || "").get("redirect");
  }
  return r && r.startsWith("/") && !r.startsWith("//") ? r : null;
}
