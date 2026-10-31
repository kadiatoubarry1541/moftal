// Génération Gx basé sur 4004 av. J.-C. comme année 0 humaine (année de départ)
// 1 génération = 63 ans. On liste G1..G200 et on calcule l’index depuis la date de naissance.

export function listerGenerations(max: number = 200): string[] {
  return Array.from({ length: max }, (_, i) => `G${i + 1}`)
}

export function generationDepuisNaissance(dateNaissance: string | Date): string {
  const d = new Date(dateNaissance)
  if (Number.isNaN(d.getTime())) return ''
  const annee = d.getUTCFullYear()
  // base: -4003 pour 4004 av. J.-C. (année astronomique -4003)
  const anneeDepart = -4003
  const ecart = annee - anneeDepart
  const index = Math.floor(ecart / 63) + 1
  const borne = Math.max(1, Math.min(200, index))
  return `G${borne}`
}

// Décet Dx depuis 3870 av. J.-C. (mort d’Abel) avec pas de 63 ans
export function listerDecets(max: number = 200): string[] {
  return Array.from({ length: max }, (_, i) => `D${i + 1}`)
}

export function decetDepuisDate(dateDeces: string | Date): string {
  const d = new Date(dateDeces)
  if (Number.isNaN(d.getTime())) return ''
  const annee = d.getUTCFullYear()
  const anneeDepart = -3869 // 3870 av. J.-C.
  const ecart = annee - anneeDepart
  const index = Math.floor(ecart / 63) + 1
  const borne = Math.max(1, Math.min(200, index))
  return `D${borne}`
}

// Age exact recalculé chaque année
export function calculerAge(dateNaissance: string | Date, ref: Date = new Date()): number | null {
  const d = new Date(dateNaissance)
  if (Number.isNaN(d.getTime())) return null
  let age = ref.getFullYear() - d.getFullYear()
  const m = ref.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--
  return age
}

// Années écoulées exactes (pour défunt)
export function anneesEcoulees(debut: string | Date, fin: string | Date = new Date()): number | null {
  const d1 = new Date(debut)
  const d2 = new Date(fin)
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null
  let diff = d2.getFullYear() - d1.getFullYear()
  const m = d2.getMonth() - d1.getMonth()
  if (m < 0 || (m === 0 && d2.getDate() < d1.getDate())) diff--
  return diff
}
