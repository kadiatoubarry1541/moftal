// Utils de calcul: Génération, Décet, NumeroH, NumeroHD
// Hypothèses:
// - Début de l'humanité: 4004 av. J.-C. (base pour Génération)
// - Premier décès (Abel): 3870 av. J.-C. (base pour Décet)
// - Une tranche = 63 ans
// - G1..G200 et D1..D200

export type Code = `G${number}` | `D${number}`

const GENERATION_BASE_BC = 4004 // années avant JC
const DECET_BASE_BC = 3870 // années avant JC
const TRANCHE = 63
const MAX_INDEX = 200

// Mapping de référence (adaptable plus tard via backend)
export const CONTINENTS = { Afrique: 'C1' } as const
export const PAYS = { EGYPTE: 'P1', GUINEE: 'P2' } as const
export const REGIONS = { Conakry: 'R1', Mamou: 'R2', Labe: 'R3', Faranah: 'R4', 'N’ZEREKORE': 'R5' } as const
export const ETHNIES = { PEULS: 'E1', MALINKES: 'E2', SOUSSOU: 'E3', KISSI: 'E4', TOMA: 'E5' } as const
export const FAMILLES = { BARRY: 'F1', DIALLO: 'F2', SOW: 'F3', BAH: 'F4', BALDE: 'F5' } as const

function clampIndex(i: number): number { return Math.max(1, Math.min(MAX_INDEX, i)) }

// Calcule l’index de génération à partir d’une année de naissance (AD, ex: 1990)
export function computeGenerationIndexFromYear(yearAD: number): number {
  const totalYears = GENERATION_BASE_BC + Math.max(0, yearAD) // ex: 4004 + 1990
  const idx = Math.ceil(totalYears / TRANCHE)
  return clampIndex(idx)
}

// Retourne le code Gx depuis une date de naissance
export function computeGenerationCode(dobIso: string | Date): `G${number}` {
  const d = new Date(dobIso)
  const y = d.getFullYear()
  const idx = computeGenerationIndexFromYear(y)
  return `G${idx}`
}

export function listGenerationCodes(max: number = MAX_INDEX): `G${number}`[] {
  const m = Math.min(max, MAX_INDEX)
  return Array.from({ length: m }, (_, i) => `G${i + 1}` as const)
}

// Calcule l’index de décet à partir d’une année de décès (AD)
export function computeDecetIndexFromYear(yearAD: number): number {
  const totalYears = DECET_BASE_BC + Math.max(0, yearAD)
  const idx = Math.ceil(totalYears / TRANCHE)
  return clampIndex(idx)
}

export function computeDecetCode(dodIso: string | Date): `D${number}` {
  const d = new Date(dodIso)
  const y = d.getFullYear()
  const idx = computeDecetIndexFromYear(y)
  return `D${idx}`
}

export function listDecetCodes(max: number = MAX_INDEX): `D${number}`[] {
  const m = Math.min(max, MAX_INDEX)
  return Array.from({ length: m }, (_, i) => `D${i + 1}` as const)
}
