/**
 * Masque l'incrément confidentiel du numeroH.
 * Format complet : "G96C1P1R1E15F13 1"  → affiché : "G96C1P1R1E15F13"
 * L'incrément (le chiffre après l'espace final) est réservé à l'usage interne.
 */
export function hideIncrement(numeroH?: string | null): string {
  if (!numeroH) return ''
  return numeroH.replace(/\s+\d+$/, '')
}

/**
 * Retourne le numéro de génération extrait du numeroH.
 * Ex: "G96C1P1R1E15F13 1" → "G96"
 */
export function extractGeneration(numeroH?: string | null): string {
  if (!numeroH) return ''
  const match = numeroH.match(/^(G\d+)/)
  return match ? match[1] : ''
}
