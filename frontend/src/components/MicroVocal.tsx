import { useEffect, useRef, useState } from 'react'
import { creerEnregistreurAudio, fichierAudio, messageErreurMicro } from '../utils/enregistrementAudio'
import { DUREE_MAX_VOCAL_MESSAGE } from '../utils/dureesMedias'

/**
 * Micro des messages : son seul rôle est d'envoyer un message vocal.
 *
 *  - On touche 🎤 → l'enregistrement commence tout de suite.
 *  - ➤ envoie le vocal, 🗑 l'annule.
 *  - À 30 secondes, le vocal s'envoie tout seul.
 *
 * Pendant l'enregistrement, la barre d'enregistrement recouvre la ligne de
 * saisie : le parent de ce bouton doit être en `position: relative`.
 */
interface Props {
  /** Envoie le fichier audio (même chemin qu'une pièce jointe audio). */
  onEnvoyer: (fichier: File) => unknown | Promise<unknown>
  desactive?: boolean
  /** Couleur du bouton d'envoi (couleur de la discussion). */
  couleur?: string
  /** Classes du bouton 🎤 au repos, pour garder le style de chaque discussion. */
  className?: string
}

const DUREE_MIN_MS = 800

export default function MicroVocal({ onEnvoyer, desactive, couleur = '#16a34a', className }: Props) {
  const [etat, setEtat] = useState<'repos' | 'demarrage' | 'enregistre' | 'envoi'>('repos')
  const [ms, setMs] = useState(0)
  const [erreur, setErreur] = useState<string | null>(null)

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const morceauxRef = useRef<Blob[]>([])
  const debutRef = useRef(0)
  const minuteurRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const actionRef = useRef<'envoyer' | 'annuler'>('annuler')

  const liberer = () => {
    if (minuteurRef.current) { clearInterval(minuteurRef.current); minuteurRef.current = null }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  // Si la discussion se ferme pendant un enregistrement : on coupe le micro, rien n'est envoyé.
  useEffect(() => () => {
    actionRef.current = 'annuler'
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    liberer()
  }, [])

  const terminer = (action: 'envoyer' | 'annuler') => {
    actionRef.current = action
    const rec = recRef.current
    if (rec) { if (rec.state !== 'inactive') rec.stop() }
    else { liberer(); setEtat('repos'); setMs(0) }
  }

  const demarrer = async () => {
    if (etat !== 'repos' || desactive) return
    setErreur(null)
    setEtat('demarrage')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const rec = creerEnregistreurAudio(stream)
      recRef.current = rec
      morceauxRef.current = []
      actionRef.current = 'annuler'

      rec.ondataavailable = (e) => { if (e.data.size > 0) morceauxRef.current.push(e.data) }
      rec.onstop = async () => {
        const duree = Date.now() - debutRef.current
        liberer()
        recRef.current = null
        setMs(0)
        // Annulé, ou trop court pour contenir une parole : rien n'est envoyé.
        if (actionRef.current !== 'envoyer' || duree < DUREE_MIN_MS || morceauxRef.current.length === 0) {
          setEtat('repos')
          return
        }
        setEtat('envoi')
        try {
          await onEnvoyer(fichierAudio(rec, morceauxRef.current))
        } finally {
          setEtat('repos')
        }
      }

      rec.start(250)
      debutRef.current = Date.now()
      setMs(0)
      setEtat('enregistre')
      minuteurRef.current = setInterval(() => {
        const ecoule = Date.now() - debutRef.current
        setMs(ecoule)
        // 30 secondes atteintes : le vocal part tout seul
        if (ecoule >= DUREE_MAX_VOCAL_MESSAGE * 1000) terminer('envoyer')
      }, 200)
    } catch (err) {
      liberer()
      recRef.current = null
      setEtat('repos')
      setErreur(messageErreurMicro(err))
    }
  }

  const secondes = Math.min(Math.floor(ms / 1000), DUREE_MAX_VOCAL_MESSAGE)
  const temps = `0:${String(secondes).padStart(2, '0')}`

  return (
    <>
      <button
        type="button"
        onClick={() => void demarrer()}
        disabled={desactive || etat !== 'repos'}
        title="Enregistrer un message vocal"
        aria-label="Enregistrer un message vocal"
        className={className || 'w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50'}
      >
        {etat === 'demarrage' || etat === 'envoi' ? '…' : '🎤'}
      </button>

      {/* Barre d'enregistrement : recouvre la ligne de saisie */}
      {etat === 'enregistre' && (
        <div className="absolute inset-0 z-30 flex items-center gap-2 bg-white rounded-full px-2" role="status">
          <button
            type="button"
            onClick={() => terminer('annuler')}
            aria-label="Annuler le vocal"
            className="no-touch-target w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-lg text-gray-500 hover:bg-gray-100"
          >
            🗑
          </button>
          <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-red-500 animate-pulse" />
          <span className="shrink-0 text-sm font-semibold text-red-600 tabular-nums">{temps}</span>
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${Math.min(100, (ms / (DUREE_MAX_VOCAL_MESSAGE * 1000)) * 100)}%` }} />
          </div>
          <span className="shrink-0 text-[11px] text-gray-400">0:{DUREE_MAX_VOCAL_MESSAGE}</span>
          <button
            type="button"
            onClick={() => terminer('envoyer')}
            aria-label="Envoyer le vocal"
            className="no-touch-target w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white text-lg"
            style={{ background: couleur }}
          >
            ➤
          </button>
        </div>
      )}

      {erreur && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-30 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 shadow">
          <span className="flex-1">{erreur}</span>
          <button type="button" onClick={() => setErreur(null)} aria-label="Fermer" className="no-touch-target shrink-0 font-bold">✕</button>
        </div>
      )}
    </>
  )
}
