// Pages de Moftal vers lesquelles une publicité peut renvoyer.
// Chaque annonce est liée à sa page : choisie à la publication (ou modifiée
// ensuite dans « Mes publicités »), sinon devinée d'après son texte.

export interface DestinationPublicite {
  chemin: string
  label: string
  /** Mots qui, dans le titre / la description / le bouton, désignent cette page */
  motsCles: RegExp[]
}

// L'ordre compte : la première page dont un mot apparaît gagne.
export const DESTINATIONS_PUBLICITE: DestinationPublicite[] = [
  {
    chemin: '/echange?q=essence',
    label: "Ventes — Essence",
    motsCles: [/\bessence\b/, /carburant/, /gasoil|gazoil/, /\bstation\b/],
  },
  {
    chemin: '/famille?tab=heritage',
    label: 'Famille — Héritage (argent de la famille)',
    motsCles: [/heritage/, /\bfamill/, /\bargent\b/, /caisse/, /cotisation/],
  },
  {
    chemin: '/inscription-pro',
    label: 'Espace pro — Créer son compte pro',
    motsCles: [/espace pro/, /compte pro/, /\bpro\b/, /professionnel/, /gestion interne/, /visibilite/, /etablissement/],
  },
  {
    chemin: '/echange',
    label: 'Ventes — Échange (tous les produits)',
    motsCles: [/echange/, /\bvente/, /\bvendre/, /\bacheter/, /\bachat/, /marche/, /produit/],
  },
  { chemin: '/info', label: 'Info Moftal', motsCles: [/\binfo/, /actualite/] },
  { chemin: '/professeur-ia', label: 'Professeur IA', motsCles: [/professeur/, /\bia\b/, /\bcours\b/] },
  { chemin: '/moftal-pay', label: 'Moftal Pay', motsCles: [/moftal pay/, /paiement/, /\bpayer\b/] },
  { chemin: '/services', label: 'Services', motsCles: [/\bservice/] },
]

const normaliser = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface PubTexte {
  lien?: string | null
  titre?: string | null
  description?: string | null
  bouton_texte?: string | null
}

/** Page devinée d'après le texte de l'annonce (null si rien ne correspond). */
export function devinerDestination(pub: PubTexte): string | null {
  const texte = normaliser([pub.titre, pub.description, pub.bouton_texte].filter(Boolean).join(' '))
  if (!texte) return null
  const trouvee = DESTINATIONS_PUBLICITE.find(d => d.motsCles.some(m => m.test(texte)))
  return trouvee ? trouvee.chemin : null
}

/** Lien ouvert au clic : celui choisi pour l'annonce, sinon celui deviné. */
export function lienPublicite(pub: PubTexte): string | null {
  const lien = (pub.lien || '').trim()
  return lien || devinerDestination(pub)
}

export function labelDestination(chemin?: string | null): string | null {
  if (!chemin) return null
  return DESTINATIONS_PUBLICITE.find(d => d.chemin === chemin)?.label || chemin
}

// Autorisation unique : seules les annonces publiées avant cette date peuvent
// recevoir leurs textes après coup (même date que côté serveur).
export const ANNONCES_MODIFIABLES_AVANT = '2026-11-21T00:00:00Z'

export const annonceModifiable = (createdAt?: string | null) =>
  !!createdAt && new Date(createdAt) < new Date(ANNONCES_MODIFIABLES_AVANT)
