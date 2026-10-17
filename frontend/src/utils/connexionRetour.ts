// Page de connexion qui ramène ensuite exactement ici (application de gestion
// ouverte par son lien, avec « ?installer=1 » s'il y est) : sans ça, la personne
// ajoutée par l'établissement se retrouvait sur Moftal après s'être connectée et
// ne pouvait jamais installer l'application. /login accepte le téléphone,
// l'e-mail ou le NuméroH, et la première connexion (choix du mot de passe).
export function cheminConnexion() {
  return `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}
