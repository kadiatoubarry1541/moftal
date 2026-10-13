import { getTypeInfo } from "../components/EspaceProModals";

// Lien de l'application de gestion d'un établissement : quiconque l'ouvre peut
// l'installer ; une fois connecté, chacun n'a que les droits que le
// propriétaire lui a donnés (employés), sinon un écran l'explique.
// Aucun code de session dans ce lien : il peut être partagé sans risque.
export const DOMAINE_GESTION = "gestions.moftal.com";

export function lienAppGestion(type: string, tenantCode: string) {
  return `https://${DOMAINE_GESTION}/${getTypeInfo(type).path}/${tenantCode}?installer=1`;
}

/** Même lien, depuis une page de gestion ouverte (/gestion-…/:code). */
export function lienAppGestionIci() {
  const m = window.location.pathname.match(/^\/gestion-[^/]+\/[^/]+/);
  return m ? `https://${DOMAINE_GESTION}${m[0]}?installer=1` : null;
}

export async function copierTexte(texte: string) {
  try { await navigator.clipboard.writeText(texte); return; } catch { /* ancien navigateur */ }
  const z = document.createElement("textarea");
  z.value = texte; document.body.appendChild(z); z.select(); document.execCommand("copy"); z.remove();
}
