// Contact Picker API — disponible uniquement sur Chrome Android pour l'instant.
// On détecte le support avant d'afficher le bouton d'import ; sur les
// appareils non supportés (iPhone, ordinateur...), l'utilisateur tape
// simplement le numéro à la main.

export function isContactPickerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
}

/**
 * Ouvre le sélecteur de contacts natif du téléphone et retourne le premier
 * numéro de téléphone du contact choisi, ou null si annulé / non supporté /
 * aucun numéro trouvé.
 */
export async function pickContactPhone(): Promise<string | null> {
  if (!isContactPickerSupported()) return null;
  try {
    const contacts = await (navigator as any).contacts.select(['tel'], { multiple: false });
    const tel = contacts?.[0]?.tel?.[0];
    return typeof tel === 'string' && tel.trim() ? tel.trim() : null;
  } catch {
    // Annulé par l'utilisateur ou permission refusée
    return null;
  }
}
