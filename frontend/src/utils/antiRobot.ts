// Vérification anti-robot (Cloudflare Turnstile, gratuit) pour les actions que des
// robots répètent en masse : création de compte et demande de code « mot de passe
// oublié ». Invisible pour presque tout le monde ; une petite case n'apparaît que
// si Cloudflare a un doute.
// Désactivée tant que VITE_TURNSTILE_SITE_KEY n'est pas réglée : rien ne change.

type Turnstile = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string
  execute: (id: string) => void
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: Turnstile } }

const CLE_SITE = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''
let chargement: Promise<Turnstile | null> | null = null

function chargerScript(): Promise<Turnstile | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!chargement) {
    chargement = new Promise((resolve) => {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = () => resolve(window.turnstile || null)
      s.onerror = () => { chargement = null; resolve(null) }
      document.head.appendChild(s)
    })
  }
  return chargement
}

/**
 * En-têtes à ajouter à la requête : { 'X-Anti-Robot': jeton }, ou {} si la
 * vérification n'est pas activée ou n'a pas pu se charger (le serveur décide).
 */
export async function enTetesAntiRobot(): Promise<Record<string, string>> {
  if (!CLE_SITE || typeof document === 'undefined') return {}
  const ts = await chargerScript()
  if (!ts) return {}
  const boite = document.createElement('div')
  boite.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647'
  document.body.appendChild(boite)
  try {
    const jeton = await new Promise<string>((resolve, reject) => {
      const id = ts.render(boite, {
        sitekey: CLE_SITE,
        appearance: 'interaction-only',
        language: 'fr',
        callback: (t: string) => resolve(t),
        'error-callback': () => reject(new Error('anti-robot')),
        'timeout-callback': () => reject(new Error('anti-robot')),
      })
      setTimeout(() => { try { ts.remove(id) } catch { /* déjà retiré */ } reject(new Error('anti-robot')) }, 60000)
    })
    return { 'X-Anti-Robot': jeton }
  } catch {
    return {}
  } finally {
    boite.remove()
  }
}
