/** Normalise un NuméroH saisi à la main : espaces, et lettre O confondue avec
 *  le chiffre 0 (erreur de frappe fréquente). Utilisé partout où un NuméroH
 *  entré par un utilisateur (le sien, ou celui d'un parent) doit être comparé
 *  de façon fiable à ce qui est stocké en base. */
export function normalizeNumeroH(numeroH) {
  if (!numeroH || typeof numeroH !== 'string') return '';
  return numeroH
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/O/g, '0')
    .replace(/o/g, '0');
}
