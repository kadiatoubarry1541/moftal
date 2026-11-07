/**
 * Nombre affiché dans une pastille (messages, notifications, nouveautés) :
 * le nombre exact jusqu'à 10, puis « 10+ ». Même règle partout dans Moftal.
 */
export const MAX_PASTILLE = 10;

export function texteCompteur(n: number): string {
  return n > MAX_PASTILLE ? `${MAX_PASTILLE}+` : String(n);
}
