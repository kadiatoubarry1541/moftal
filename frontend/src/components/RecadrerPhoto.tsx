import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Recadrage de la photo de profil dans le cercle.
 *
 *  - On fait glisser la photo avec le doigt (ou la souris) pour la placer.
 *  - On zoome avec deux doigts, la molette ou la barre « − / + ».
 *  - La photo couvre toujours tout le cercle : jamais de bord vide.
 *  - « Valider » renvoie une image carrée (JPEG) exactement comme le cercle la montre.
 */
interface Props {
  fichier: File
  onValider: (fichier: File, apercu: string) => void
  onAnnuler: () => void
  /** Côté de l'image produite, en pixels. */
  taille?: number
}

const ZOOM_MAX = 4

export default function RecadrerPhoto({ fichier, onValider, onAnnuler, taille = 640 }: Props) {
  const cadreRef = useRef<HTMLDivElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [erreur, setErreur] = useState(false)
  const [cote, setCote] = useState(300)
  // zoom 1 = la photo couvre juste le cercle ; x/y = décalage du centre de la photo, en px écran
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [envoi, setEnvoi] = useState(false)
  const pointeurs = useRef(new Map<number, { x: number; y: number }>())
  const geste = useRef<{ dist: number; zoom: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(fichier)
    const i = new Image()
    i.onload = () => setImg(i)
    i.onerror = () => setErreur(true)
    i.src = url
    return () => URL.revokeObjectURL(url)
  }, [fichier])

  // Taille du cercle selon l'écran
  useEffect(() => {
    const maj = () => setCote(Math.min(320, window.innerWidth - 48))
    maj()
    window.addEventListener('resize', maj)
    return () => window.removeEventListener('resize', maj)
  }, [])

  // Échelle de base : le petit côté de la photo = diamètre du cercle
  const base = img ? cote / Math.min(img.naturalWidth, img.naturalHeight) : 1
  const larg = img ? img.naturalWidth * base * zoom : cote
  const haut = img ? img.naturalHeight * base * zoom : cote

  /** Garde la photo sur tout le cercle. */
  const borner = useCallback((p: { x: number; y: number }, z: number) => {
    if (!img) return p
    const l = img.naturalWidth * base * z
    const h = img.naturalHeight * base * z
    const mx = Math.max(0, (l - cote) / 2)
    const my = Math.max(0, (h - cote) / 2)
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) }
  }, [img, base, cote])

  const changerZoom = (z: number) => {
    const nz = Math.min(ZOOM_MAX, Math.max(1, z))
    setZoom(nz)
    setPos((p) => borner({ x: p.x * (nz / zoom), y: p.y * (nz / zoom) }, nz))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointeurs.current.size === 2) {
      const [a, b] = [...pointeurs.current.values()]
      geste.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const avant = pointeurs.current.get(e.pointerId)
    if (!avant) return
    const maintenant = { x: e.clientX, y: e.clientY }
    pointeurs.current.set(e.pointerId, maintenant)
    if (pointeurs.current.size === 2 && geste.current) {
      const [a, b] = [...pointeurs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (geste.current.dist > 0) changerZoom(geste.current.zoom * (d / geste.current.dist))
      return
    }
    if (pointeurs.current.size === 1) {
      setPos((p) => borner({ x: p.x + maintenant.x - avant.x, y: p.y + maintenant.y - avant.y }, zoom))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointeurs.current.delete(e.pointerId)
    if (pointeurs.current.size < 2) geste.current = null
  }

  const valider = async () => {
    if (!img) return
    setEnvoi(true)
    const canvas = document.createElement('canvas')
    canvas.width = taille
    canvas.height = taille
    const ctx = canvas.getContext('2d')!
    // Partie de la photo visible dans le cercle, en pixels de la photo d'origine
    const echelle = base * zoom
    const coteSource = cote / echelle
    const sx = img.naturalWidth / 2 - (cote / 2 + pos.x) / echelle
    const sy = img.naturalHeight / 2 - (cote / 2 + pos.y) / echelle
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, taille, taille)
    ctx.drawImage(img, sx, sy, coteSource, coteSource, 0, 0, taille, taille)
    const apercu = canvas.toDataURL('image/jpeg', 0.88)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.88))
    setEnvoi(false)
    if (!blob) { setErreur(true); return }
    const nom = (fichier.name.replace(/\.[^.]+$/, '') || 'photo') + '.jpg'
    onValider(new File([blob], nom, { type: 'image/jpeg' }), apercu)
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4 select-none" role="dialog" aria-modal="true" aria-label="Recadrer la photo de profil">
      <p className="text-white text-base font-semibold mb-1 text-center">Placez votre photo dans le cercle</p>
      <p className="text-white/70 text-xs mb-4 text-center">Faites glisser la photo · deux doigts pour zoomer</p>

      <div
        ref={cadreRef}
        className="relative overflow-hidden rounded-xl touch-none cursor-grab active:cursor-grabbing bg-black"
        style={{ width: cote, height: cote }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => changerZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
      >
        {img && (
          <img
            src={img.src}
            alt=""
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{
              width: larg,
              height: haut,
              left: (cote - larg) / 2 + pos.x,
              top: (cote - haut) / 2 + pos.y,
            }}
          />
        )}
        {/* Cercle : tout ce qui est en dehors est assombri */}
        <div
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.9)' }}
        />
        {!img && !erreur && (
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

      <div className="flex items-center gap-3 mt-5" style={{ width: cote }}>
        <button type="button" onClick={() => changerZoom(zoom / 1.2)} aria-label="Dézoomer" className="w-9 h-9 shrink-0 rounded-full bg-white/15 text-white text-xl leading-none">−</button>
        <input
          type="range"
          min={1}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(e) => changerZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="flex-1 accent-white"
        />
        <button type="button" onClick={() => changerZoom(zoom * 1.2)} aria-label="Zoomer" className="w-9 h-9 shrink-0 rounded-full bg-white/15 text-white text-xl leading-none">+</button>
      </div>

      <div className="flex gap-3 mt-6" style={{ width: cote }}>
        <button type="button" onClick={onAnnuler} className="flex-1 py-3 rounded-xl bg-white/15 text-white font-semibold">
          Annuler
        </button>
        <button
          type="button"
          onClick={() => void valider()}
          disabled={!img || envoi}
          className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
        >
          {envoi ? '…' : '✓ Valider'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
