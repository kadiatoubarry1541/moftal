/**
 * Durées maximum des vidéos et des audios — une seule règle pour tout Moftal.
 *
 *  - Vidéo : 1 minute au maximum, partout (galerie, Terre d'Adam…).
 *  - Audio : 30 secondes au maximum, partout.
 *  - Certains endroits sont plus stricts : santé (Solutions) 10 s,
 *    vente 5 s (audio de vente 10 s), vidéo d'un défunt 30 s.
 *
 * Pour un champ fichier plus strict, on ajoute simplement sur l'<input> :
 *   data-duree-max-video="30"   (et/ou)   data-duree-max-audio="10"
 *
 * `installerLimiteDureesMedias()` (appelé une fois au démarrage, dans main.tsx)
 * vérifie TOUS les champs fichier de l'application : un fichier trop long est
 * refusé avec un message, avant que la page ne le reçoive.
 */

export const DUREE_MAX_VIDEO = 60
export const DUREE_MAX_AUDIO = 30
export const DUREE_MAX_VIDEO_SANTE = 10
export const DUREE_MAX_VIDEO_VENTE = 5
export const DUREE_MAX_AUDIO_VENTE = 10
export const DUREE_MAX_VIDEO_DEFUNT = 30

/** Durée d'une vidéo ou d'un audio, en secondes (NaN si elle ne peut pas être lue). */
export function lireDureeMedia(fichier: Blob): Promise<number> {
  return new Promise((resolve) => {
    const estVideo = fichier.type.startsWith('video/')
    const el = document.createElement(estVideo ? 'video' : 'audio')
    const url = URL.createObjectURL(fichier)
    let fini = false
    const terminer = (d: number) => {
      if (fini) return
      fini = true
      URL.revokeObjectURL(url)
      resolve(d)
    }
    el.preload = 'metadata'
    el.onloadedmetadata = () => terminer(Number.isFinite(el.duration) ? el.duration : NaN)
    el.onerror = () => terminer(NaN)
    // Certains téléphones ne donnent jamais la durée : on n'attend pas indéfiniment.
    setTimeout(() => terminer(NaN), 8000)
    el.src = url
  })
}

/** « 3 minutes », « 30 secondes »… */
export function libelleDuree(secondes: number): string {
  if (secondes >= 60 && secondes % 60 === 0) {
    const m = secondes / 60
    return `${m} minute${m > 1 ? 's' : ''}`
  }
  return `${secondes} secondes`
}

function limitePour(input: HTMLInputElement, fichier: File): number | null {
  if (fichier.type.startsWith('video/')) {
    const local = Number(input.dataset.dureeMaxVideo)
    return Math.min(DUREE_MAX_VIDEO, local > 0 ? local : DUREE_MAX_VIDEO)
  }
  if (fichier.type.startsWith('audio/')) {
    const local = Number(input.dataset.dureeMaxAudio)
    return Math.min(DUREE_MAX_AUDIO, local > 0 ? local : DUREE_MAX_AUDIO)
  }
  return null
}

let installe = false

export function installerLimiteDureesMedias(): void {
  if (installe || typeof document === 'undefined') return
  installe = true

  document.addEventListener(
    'change',
    (e) => {
      const input = e.target
      if (!(input instanceof HTMLInputElement) || input.type !== 'file') return
      // Deuxième passage, après vérification : on laisse la page recevoir les fichiers.
      if (input.dataset.dureeVerifiee === '1') {
        delete input.dataset.dureeVerifiee
        return
      }
      const fichiers = Array.from(input.files || [])
      const aVerifier = fichiers.filter((f) => limitePour(input, f) !== null)
      if (aVerifier.length === 0) return

      // On retient l'événement le temps de lire les durées.
      e.stopImmediatePropagation()

      void (async () => {
        const refuses: string[] = []
        const gardes: File[] = []
        for (const f of fichiers) {
          const limite = limitePour(input, f)
          if (limite === null) { gardes.push(f); continue }
          const duree = await lireDureeMedia(f)
          // Durée illisible : on ne bloque pas.
          if (Number.isFinite(duree) && duree > limite + 1) {
            refuses.push(f.type.startsWith('video/')
              ? `La vidéo « ${f.name} » est trop longue : ${libelleDuree(limite)} au maximum.`
              : `L'audio « ${f.name} » est trop long : ${libelleDuree(limite)} au maximum.`)
          } else {
            gardes.push(f)
          }
        }

        if (refuses.length) alert(refuses.join('\n'))

        if (gardes.length === 0) {
          input.value = ''
          return
        }
        if (refuses.length) {
          const dt = new DataTransfer()
          gardes.forEach((f) => dt.items.add(f))
          input.files = dt.files
        }
        input.dataset.dureeVerifiee = '1'
        input.dispatchEvent(new Event('change', { bubbles: true }))
      })()
    },
    true,
  )
}
