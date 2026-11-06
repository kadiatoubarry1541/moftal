/**
 * Enregistrement au micro — commun à toute l'application.
 *
 * Chaque téléphone ne sait pas enregistrer dans le même format :
 * Android (Chrome) → audio/webm, iPhone (Safari) → audio/mp4.
 * Imposer « audio/webm » fait échouer le micro sur iPhone : on prend donc
 * le premier format que le téléphone accepte, et on étiquette le fichier
 * avec le format réellement enregistré.
 */

const FORMATS_AUDIO = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/aac',
]

/** Crée un enregistreur dans un format que ce téléphone sait produire. */
export function creerEnregistreurAudio(stream: MediaStream): MediaRecorder {
  const peutTester = typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
  const format = peutTester ? FORMATS_AUDIO.find((f) => MediaRecorder.isTypeSupported(f)) : undefined
  try {
    return format ? new MediaRecorder(stream, { mimeType: format }) : new MediaRecorder(stream)
  } catch {
    // Dernier recours : le format par défaut du téléphone
    return new MediaRecorder(stream)
  }
}

/** Type et extension du fichier, d'après ce que l'enregistreur a vraiment produit. */
export function formatFichierAudio(recorder: MediaRecorder | null, morceaux?: Blob[]): { type: string; extension: string } {
  const brut = recorder?.mimeType || morceaux?.find((m) => m.type)?.type || 'audio/webm'
  const type = brut.split(';')[0] || 'audio/webm'
  const extension = type.includes('mp4') || type.includes('aac') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
  return { type, extension }
}

/** Fichier prêt à envoyer à partir des morceaux enregistrés. */
export function fichierAudio(recorder: MediaRecorder | null, morceaux: Blob[], prefixe = 'vocal'): File {
  const { type, extension } = formatFichierAudio(recorder, morceaux)
  return new File([new Blob(morceaux, { type })], `${prefixe}-${Date.now()}.${extension}`, { type })
}

/** Message clair selon la raison pour laquelle le micro n'a pas pu démarrer. */
export function messageErreurMicro(err: unknown): string {
  const name = (err as { name?: string })?.name
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return "Le micro ne peut fonctionner que sur une adresse sécurisée (https)."
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    return "Ce navigateur ne permet pas d'enregistrer la voix. Ouvrez Moftal dans le navigateur principal du téléphone."
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Aucun micro trouvé sur cet appareil.'
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'Le micro est déjà utilisé par une autre application. Fermez-la puis réessayez.'
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return "Micro refusé. Autorisez le micro pour Moftal (touchez le cadenas à côté de l'adresse du site, ou Paramètres du téléphone → Applications → autorisations), puis réessayez."
  }
  return "Le micro n'a pas pu démarrer. Réessayez ; si cela continue, redémarrez l'application."
}
