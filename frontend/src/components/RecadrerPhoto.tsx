import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Recadrage de la photo de profil.
 *
 *  - Toute la photo est affichée ; un cadre carré (avec quadrillage) montre la partie gardée.
 *  - On tire le cadre par ses coins ou ses côtés pour l'agrandir ou le diminuer,
 *    on le fait glisser par le milieu pour le déplacer, ou on le pince à deux doigts.
 *  - Le bouton du milieu fait tourner la photo d'un quart de tour.
 *  - « Terminé » renvoie une image carrée (JPEG) exactement comme le cadre la montre.
 */
interface Props {
  fichier: File
  onValider: (fichier: File, apercu: string) => void
  onAnnuler: () => void
  /** Côté de l'image produite, en pixels. */
  taille?: number
}

/** Côté maximal de la photo de travail (suffisant pour une photo de profil, léger pour le téléphone). */
const COTE_TRAVAIL = 2048
/** Plus petit cadre possible, en pixels écran. */
const CADRE_MIN = 64

type Mode = 'deplacer' | 'n' | 's' | 'e' | 'o' | 'no' | 'ne' | 'so' | 'se'
interface Cadre { x: number; y: number; c: number }
interface Source { url: string; img: HTMLImageElement; w: number; h: number }

/** Photo réduite et tournée de `quarts` quarts de tour, prête à être affichée et découpée. */
function preparer(original: HTMLImageElement, quarts: number): Promise<Source> {
  const r = Math.min(1, COTE_TRAVAIL / Math.max(original.naturalWidth, original.naturalHeight))
  const ow = Math.round(original.naturalWidth * r)
  const oh = Math.round(original.naturalHeight * r)
  const couche = quarts % 2 === 1
  const canvas = document.createElement('canvas')
  canvas.width = couche ? oh : ow
  canvas.height = couche ? ow : oh
  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((quarts * Math.PI) / 2)
  ctx.drawImage(original, -ow / 2, -oh / 2, ow, oh)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('photo')); return }
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => resolve({ url, img, w: canvas.width, h: canvas.height })
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('photo')) }
      img.src = url
    }, 'image/jpeg', 0.92)
  })
}

const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export default function RecadrerPhoto({ fichier, onValider, onAnnuler, taille = 640 }: Props) {
  const [original, setOriginal] = useState<HTMLImageElement | null>(null)
  const [quarts, setQuarts] = useState(0)
  const [source, setSource] = useState<Source | null>(null)
  const [erreur, setErreur] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [zone, setZone] = useState({ w: 320, h: 480 })
  // Cadre en pixels de la photo de travail
  const [cadre, setCadre] = useState<Cadre>({ x: 0, y: 0, c: 0 })
  const geste = useRef<{ mode: Mode; px: number; py: number; depart: Cadre } | null>(null)
  const pointeurs = useRef(new Map<number, { x: number; y: number }>())
  const pince = useRef<{ dist: number; depart: Cadre } | null>(null)

  // Photo d'origine
  useEffect(() => {
    const url = URL.createObjectURL(fichier)
    const i = new Image()
    i.onload = () => setOriginal(i)
    i.onerror = () => setErreur(true)
    i.src = url
    return () => URL.revokeObjectURL(url)
  }, [fichier])

  // Photo de travail (après rotation) + cadre de départ centré
  useEffect(() => {
    if (!original) return
    let actif = true
    let url = ''
    preparer(original, quarts)
      .then((s) => {
        url = s.url
        if (!actif) { URL.revokeObjectURL(url); return }
        const c = Math.round(Math.min(s.w, s.h) * 0.8)
        setCadre({ x: (s.w - c) / 2, y: (s.h - c) / 2, c })
        setSource(s)
      })
      .catch(() => { if (actif) setErreur(true) })
    return () => { actif = false; if (url) URL.revokeObjectURL(url) }
  }, [original, quarts])

  // Place disponible pour la photo selon l'écran
  useEffect(() => {
    const maj = () => setZone({
      w: Math.min(640, window.innerWidth - 24),
      h: Math.max(200, window.innerHeight - 170),
    })
    maj()
    window.addEventListener('resize', maj)
    return () => window.removeEventListener('resize', maj)
  }, [])

  // Échelle d'affichage : la photo entière tient dans la zone
  const s = source ? Math.min(zone.w / source.w, zone.h / source.h) : 1
  const aw = source ? source.w * s : zone.w
  const ah = source ? source.h * s : zone.h

  /** Nouveau cadre pendant qu'on tire, toujours carré et dans la photo. */
  const calculer = (mode: Mode, d: Cadre, dx: number, dy: number): Cadre => {
    if (!source) return d
    const W = source.w
    const H = source.h
    const min = Math.min(CADRE_MIN / s, W, H)
    if (mode === 'deplacer') {
      return { c: d.c, x: borne(d.x + dx, 0, W - d.c), y: borne(d.y + dy, 0, H - d.c) }
    }
    const est = mode.includes('e')
    const ouest = mode.includes('o')
    const sud = mode.includes('s')
    const nord = mode.includes('n')
    const sx = est ? 1 : ouest ? -1 : 0
    const sy = sud ? 1 : nord ? -1 : 0
    if (sx !== 0 && sy !== 0) {
      // Coin : le coin opposé reste fixe
      const ax = sx > 0 ? d.x : d.x + d.c
      const ay = sy > 0 ? d.y : d.y + d.c
      const maxC = Math.min(sx > 0 ? W - ax : ax, sy > 0 ? H - ay : ay)
      const c = borne(d.c + (sx * dx + sy * dy) / 2, min, maxC)
      return { c, x: sx > 0 ? ax : ax - c, y: sy > 0 ? ay : ay - c }
    }
    if (sx !== 0) {
      // Côté gauche ou droit : le côté opposé reste fixe, le cadre grandit autour de son milieu
      const ax = sx > 0 ? d.x : d.x + d.c
      const cy = d.y + d.c / 2
      const maxC = Math.min(sx > 0 ? W - ax : ax, 2 * Math.min(cy, H - cy))
      const c = borne(d.c + sx * dx, min, maxC)
      return { c, x: sx > 0 ? ax : ax - c, y: cy - c / 2 }
    }
    // Côté haut ou bas
    const ay = sy > 0 ? d.y : d.y + d.c
    const cx = d.x + d.c / 2
    const maxC = Math.min(sy > 0 ? H - ay : ay, 2 * Math.min(cx, W - cx))
    const c = borne(d.c + sy * dy, min, maxC)
    return { c, y: sy > 0 ? ay : ay - c, x: cx - c / 2 }
  }

  const commencer = (mode: Mode) => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointeurs.current.size === 2) {
      // Deux doigts : on pince le cadre
      const [a, b] = [...pointeurs.current.values()]
      pince.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), depart: cadre }
      geste.current = null
      return
    }
    geste.current = { mode, px: e.clientX, py: e.clientY, depart: cadre }
  }

  const bouger = (e: React.PointerEvent) => {
    if (!pointeurs.current.has(e.pointerId)) return
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pince.current && pointeurs.current.size === 2 && source) {
      const [a, b] = [...pointeurs.current.values()]
      const d = pince.current.depart
      const ratio = pince.current.dist > 0 ? Math.hypot(a.x - b.x, a.y - b.y) / pince.current.dist : 1
      const cx = d.x + d.c / 2
      const cy = d.y + d.c / 2
      const c = borne(d.c * ratio, Math.min(CADRE_MIN / s, source.w, source.h), Math.min(source.w, source.h))
      setCadre({ c, x: borne(cx - c / 2, 0, source.w - c), y: borne(cy - c / 2, 0, source.h - c) })
      return
    }
    const g = geste.current
    if (!g) return
    setCadre(calculer(g.mode, g.depart, (e.clientX - g.px) / s, (e.clientY - g.py) / s))
  }

  const lacher = (e: React.PointerEvent) => {
    pointeurs.current.delete(e.pointerId)
    if (pointeurs.current.size < 2) pince.current = null
    if (pointeurs.current.size === 0) geste.current = null
    else if (!geste.current && pointeurs.current.size === 1) {
      // Il reste un doigt après le pincement : il déplace le cadre
      const [p] = [...pointeurs.current.values()]
      geste.current = { mode: 'deplacer', px: p.x, py: p.y, depart: cadre }
    }
  }

  const valider = async () => {
    if (!source || cadre.c <= 0) return
    setEnvoi(true)
    const canvas = document.createElement('canvas')
    canvas.width = taille
    canvas.height = taille
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, taille, taille)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source.img, cadre.x, cadre.y, cadre.c, cadre.c, 0, 0, taille, taille)
    const apercu = canvas.toDataURL('image/jpeg', 0.88)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.88))
    setEnvoi(false)
    if (!blob) { setErreur(true); return }
    const nom = (fichier.name.replace(/\.[^.]+$/, '') || 'photo') + '.jpg'
    onValider(new File([blob], nom, { type: 'image/jpeg' }), apercu)
  }

  // Cadre en pixels écran
  const fx = cadre.x * s
  const fy = cadre.y * s
  const fc = cadre.c * s

  const evenements = { onPointerMove: bouger, onPointerUp: lacher, onPointerCancel: lacher }
  const poignee = (mode: Mode, style: React.CSSProperties, curseur: string) => (
    <div
      key={mode}
      className="absolute touch-none"
      style={{ width: 44, height: 44, marginLeft: -22, marginTop: -22, cursor: curseur, ...style }}
      onPointerDown={commencer(mode)}
      {...evenements}
    />
  )
  const coin = 'absolute border-white pointer-events-none'
  const trait = 'absolute bg-white pointer-events-none rounded-full'

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-[#0b141a] flex flex-col select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Recadrer la photo de profil"
    >
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="relative touch-none" style={{ width: aw, height: ah }}>
          {source && (
            <>
              <img
                src={source.url}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full max-w-none pointer-events-none"
              />
              {/* Partie gardée : nette ; le reste est assombri */}
              <div
                className="absolute touch-none cursor-move"
                style={{
                  left: fx,
                  top: fy,
                  width: fc,
                  height: fc,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  outline: '1px solid rgba(255,255,255,0.85)',
                }}
                onPointerDown={commencer('deplacer')}
                {...evenements}
              >
                {/* Quadrillage */}
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/60 pointer-events-none" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/60 pointer-events-none" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/60 pointer-events-none" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/60 pointer-events-none" />
                {/* Coins */}
                <div className={coin} style={{ left: 3, top: 3, width: 28, height: 28, borderLeftWidth: 3, borderTopWidth: 3 }} />
                <div className={coin} style={{ right: 3, top: 3, width: 28, height: 28, borderRightWidth: 3, borderTopWidth: 3 }} />
                <div className={coin} style={{ left: 3, bottom: 3, width: 28, height: 28, borderLeftWidth: 3, borderBottomWidth: 3 }} />
                <div className={coin} style={{ right: 3, bottom: 3, width: 28, height: 28, borderRightWidth: 3, borderBottomWidth: 3 }} />
                {/* Milieux des côtés */}
                <div className={trait} style={{ left: '50%', top: 3, width: 28, height: 3, marginLeft: -14 }} />
                <div className={trait} style={{ left: '50%', bottom: 3, width: 28, height: 3, marginLeft: -14 }} />
                <div className={trait} style={{ top: '50%', left: 3, width: 3, height: 28, marginTop: -14 }} />
                <div className={trait} style={{ top: '50%', right: 3, width: 3, height: 28, marginTop: -14 }} />
              </div>
              {/* Zones à tirer (plus grandes que les traits, pour le doigt) */}
              {poignee('n', { left: fx + fc / 2, top: fy }, 'ns-resize')}
              {poignee('s', { left: fx + fc / 2, top: fy + fc }, 'ns-resize')}
              {poignee('o', { left: fx, top: fy + fc / 2 }, 'ew-resize')}
              {poignee('e', { left: fx + fc, top: fy + fc / 2 }, 'ew-resize')}
              {poignee('no', { left: fx, top: fy }, 'nwse-resize')}
              {poignee('se', { left: fx + fc, top: fy + fc }, 'nwse-resize')}
              {poignee('ne', { left: fx + fc, top: fy }, 'nesw-resize')}
              {poignee('so', { left: fx, top: fy + fc }, 'nesw-resize')}
            </>
          )}
          {!source && !erreur && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {erreur && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white text-sm">
              Cette photo ne peut pas être ouverte. Choisissez-en une autre.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onAnnuler} className="px-3 py-2 text-emerald-400 text-lg font-semibold">
          Annuler
        </button>
        <button
          type="button"
          onClick={() => setQuarts((q) => (q + 3) % 4)}
          disabled={!source}
          aria-label="Tourner la photo"
          className="w-12 h-12 flex items-center justify-center rounded-full text-white disabled:opacity-40 active:bg-white/10"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 3 3 9 9 9" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => void valider()}
          disabled={!source || envoi}
          className="px-3 py-2 text-emerald-400 text-lg font-semibold disabled:opacity-40"
        >
          {envoi ? '…' : 'Terminé'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
