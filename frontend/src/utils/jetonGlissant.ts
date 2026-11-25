// Jeton de connexion glissant : le serveur renvoie un jeton neuf (en-tête
// X-Nouveau-Jeton) une fois par jour d'utilisation. On le garde à la place de
// l'ancien, seulement s'il appartient bien à la personne connectée (si elle a
// changé de compte entre-temps, on ne touche à rien).

function numeroDuJeton(jeton: string | null): string | null {
  if (!jeton) return null
  try {
    const partie = jeton.split('.')[1] || ''
    const json = atob(partie.replace(/-/g, '+').replace(/_/g, '/'))
    const d = JSON.parse(json) as { numeroH?: string; userId?: string }
    return d.numeroH || d.userId || null
  } catch {
    return null
  }
}

/** Garde le jeton renouvelé contenu dans une réponse du serveur, s'il y en a un. */
export function garderJetonRenouvele(reponse: Response): void {
  const neuf = reponse.headers.get('X-Nouveau-Jeton')
  if (!neuf) return
  try {
    const actuel = localStorage.getItem('token')
    const qui = numeroDuJeton(actuel)
    if (actuel && qui && qui === numeroDuJeton(neuf)) localStorage.setItem('token', neuf)
  } catch { /* stockage indisponible : le jeton actuel reste valable */ }
}

let installe = false

/** Lit l'en-tête sur toutes les réponses, quel que soit l'endroit qui appelle le serveur. */
export function installerJetonGlissant(): void {
  if (installe || typeof window === 'undefined' || !window.fetch) return
  installe = true
  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const reponse = await original(input, init)
    garderJetonRenouvele(reponse)
    return reponse
  }
}
