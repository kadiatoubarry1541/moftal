import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Lecteur des messages vocaux des discussions.
 *
 *  - ▶ / ⏸, barre en forme d'onde (on touche la barre pour avancer),
 *    durée du vocal puis temps écoulé pendant l'écoute, vitesse 1× · 1,5× · 2×.
 *  - Un seul vocal joue à la fois : en lancer un arrête celui qui jouait.
 *  - Les vocaux enregistrés sur Android (audio/webm) n'annoncent pas leur
 *    durée : on la retrouve en sautant à la fin du fichier, sans le jouer.
 */

const EVT_LECTURE = 'moftal:vocal-lecture'
const NB_BARRES = 32
const VITESSES = [1, 1.5, 2]

interface Props {
  src: string
  /** Couleur de la discussion (bouton ▶ et partie déjà écoutée). */
  couleur?: string
  /** Bulle de l'utilisateur lui-même (souvent colorée) : fond clair pour rester lisible. */
  moi?: boolean
}

function formatTemps(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/** Hauteurs des barres, toujours les mêmes pour un même vocal. */
function barresPour(src: string): number[] {
  let h = 2166136261
  for (let i = 0; i < src.length; i++) h = Math.imul(h ^ src.charCodeAt(i), 16777619)
  const out: number[] = []
  for (let i = 0; i < NB_BARRES; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ i
    out.push(0.25 + ((h >>> 0) % 1000) / 1000 * 0.75)
  }
  return out
}

export default function LecteurVocal({ src, couleur = '#16a34a', moi = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const idRef = useRef(Math.random().toString(36).slice(2))
  const [enLecture, setEnLecture] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [duree, setDuree] = useState(0)
  const [position, setPosition] = useState(0)
  const [vitesse, setVitesse] = useState(1)
  const [erreur, setErreur] = useState(false)
  const barres = useMemo(() => barresPour(src), [src])

  // Durée réelle, même pour un fichier qui ne l'annonce pas (webm)
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    setErreur(false)
    let recherche = false
    const majDuree = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuree(a.duration)
        if (recherche) { recherche = false; a.currentTime = 0 }
      } else if (!recherche) {
        recherche = true
        try { a.currentTime = 1e7 } catch { /* durée inconnue : on affiche le temps écoulé */ }
      }
    }
    a.addEventListener('loadedmetadata', majDuree)
    a.addEventListener('durationchange', majDuree)
    return () => {
      a.removeEventListener('loadedmetadata', majDuree)
      a.removeEventListener('durationchange', majDuree)
    }
  }, [src])

  // Un autre vocal démarre : celui-ci s'arrête
  useEffect(() => {
    const surAutre = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== idRef.current) audioRef.current?.pause()
    }
    window.addEventListener(EVT_LECTURE, surAutre)
    return () => window.removeEventListener(EVT_LECTURE, surAutre)
  }, [])

  const basculer = async () => {
    const a = audioRef.current
    if (!a) return
    if (!a.paused) { a.pause(); return }
    window.dispatchEvent(new CustomEvent(EVT_LECTURE, { detail: idRef.current }))
    if (duree && a.currentTime >= duree - 0.05) a.currentTime = 0
    a.playbackRate = vitesse
    setChargement(true)
    try {
      await a.play()
      setErreur(false)
    } catch {
      setErreur(true)
    } finally {
      setChargement(false)
    }
  }

  const avancer = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !duree) return
    const r = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    a.currentTime = ratio * duree
    setPosition(a.currentTime)
  }

  const changerVitesse = () => {
    const v = VITESSES[(VITESSES.indexOf(vitesse) + 1) % VITESSES.length]
    setVitesse(v)
    if (audioRef.current) audioRef.current.playbackRate = v
  }

  const progres = duree ? Math.min(1, position / duree) : 0
  const affiche = enLecture || position > 0 ? position : duree

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 w-full max-w-[280px] min-w-[200px] ${moi ? 'bg-white/95 shadow-sm' : 'bg-gray-50'}`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setEnLecture(true)}
        onPause={() => setEnLecture(false)}
        onEnded={() => { setEnLecture(false); setPosition(0) }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime
          // Pendant la recherche de la durée (saut à la fin), on n'affiche rien
          if (t < 1e6) setPosition(t)
        }}
        onError={() => { setErreur(true); setEnLecture(false) }}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => void basculer()}
        aria-label={enLecture ? 'Mettre le vocal en pause' : 'Écouter le vocal'}
        className="no-touch-target w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm"
        style={{ background: couleur }}
      >
        {chargement ? (
          <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
        ) : enLecture ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="relative h-8 flex items-center gap-[2px] cursor-pointer"
          onClick={avancer}
          role="slider"
          aria-label="Position dans le vocal"
          aria-valuemin={0}
          aria-valuemax={Math.round(duree)}
          aria-valuenow={Math.round(position)}
        >
          {barres.map((h, i) => {
            const joue = (i + 0.5) / NB_BARRES <= progres
            return (
              <span
                key={i}
                className="flex-1 rounded-full"
                style={{ height: `${Math.round(h * 100)}%`, background: joue ? couleur : '#cbd5e1' }}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 tabular-nums leading-none mt-0.5">
          <span>{erreur ? 'Vocal illisible' : `🎤 ${formatTemps(affiche)}`}</span>
          {(enLecture || vitesse !== 1) && (
            <button
              type="button"
              onClick={changerVitesse}
              className="no-touch-target px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 font-semibold"
              aria-label="Changer la vitesse d'écoute"
            >
              {String(vitesse).replace('.', ',')}×
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
