import { getContinentAndRegionByCountry } from './worldGeography'
import { ETHNIE_CODES, FAMILLE_CODES } from './constants'

// Calcul du NuméroH à partir de l'identité — partagé par l'inscription par écrit
// et la page « Mettre à jour mon profil » (compte provisoire TMP-…).

export function calculateGeneration(dateNaissance: string): string {
  if (!dateNaissance) return ''
  const birthYear = new Date(dateNaissance).getFullYear()
  const anneeDepart = -4003
  const generationIndex = Math.floor((birthYear - anneeDepart) / 63) + 1
  return `G${Math.max(1, Math.min(200, generationIndex))}`
}

function codeAuto(name: string, prefix: string, existingCodes: string[]): string {
  if (!name) return prefix + '999'
  const nums = existingCodes
    .filter((c) => c.startsWith(prefix))
    .map((c) => parseInt(c.substring(prefix.length), 10))
    .filter((n) => !isNaN(n) && n > 0)
  return prefix + (nums.length > 0 ? Math.max(...nums) + 1 : 1)
}

export async function genererNumeroH(form: {
  dateNaissance: string
  paysCode?: string
  continentCode?: string
  regionCode?: string
  ethnie: string
  famille: string
}): Promise<string> {
  const generation = calculateGeneration(form.dateNaissance)
  // Préfixe NumeroH : génération + continent + pays + région (choisie) + ethnie + famille
  const deduit = form.paysCode ? getContinentAndRegionByCountry(form.paysCode) : { continentCode: 'C1', regionCode: 'R1' }
  const continentCode = form.continentCode || deduit.continentCode
  const paysCode = form.paysCode || 'P1'
  const regionCode = form.regionCode || deduit.regionCode
  const ethnieCode = ETHNIE_CODES.find((e) => e.label === form.ethnie)?.code
    || codeAuto(form.ethnie, 'E', ETHNIE_CODES.map((e) => e.code))
  const familleCode = FAMILLE_CODES.find((f) => f.label === form.famille)?.code
    || codeAuto(form.famille, 'F', FAMILLE_CODES.map((f) => f.code))
  const prefix = `${generation}${continentCode}${paysCode}${regionCode}${ethnieCode}${familleCode}`
  const { generateUniqueNumeroH } = await import('./numeroHGenerator')
  return generateUniqueNumeroH(prefix)
}
