import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { config } from '../config/api'

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || ''

interface Pub {
  id: string
  image_url: string
  lien?: string | null
  titre?: string | null
  description?: string | null
  bouton_texte?: string | null
}

export function AdCarousel() {
  const navigate = useNavigate()
  const [pubs, setPubs] = useState<Pub[]>([])
  const [active, setActive] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/publicites/actives`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success) setPubs(d.publicites || []) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (pubs.length <= 1) return
    timerRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % pubs.length)
    }, 3000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pubs.length])

  const imgUrl = (path: string) => (path.startsWith('http') ? path : `${API_ORIGIN}${path}`)

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActive(prev => (prev - 1 + pubs.length) % pubs.length)
  }
  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActive(prev => (prev + 1) % pubs.length)
  }

  const goTo = (lien?: string | null) => {
    if (!lien) return
    if (lien.startsWith('http')) window.open(lien, '_blank', 'noopener,noreferrer')
    else navigate(lien)
  }

  // Pas de publicité active : on n'affiche rien ici — la page d'accueil reste
  // réservée aux annonces déjà publiées. Le CTA "Proposer votre service" vit
  // dans la page Services, sous le bouton de création.
  if (pubs.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4 w-full">
      <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4 / 1' }}>
        {pubs.map((pub, i) => (
          <div
            key={pub.id}
            onClick={() => goTo(pub.lien)}
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: i === active ? 1 : 0, cursor: pub.lien ? 'pointer' : 'default' }}
          >
            <img
              src={imgUrl(pub.image_url)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {pub.titre && (
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-3">
                <p className="text-white font-bold text-sm leading-tight drop-shadow">{pub.titre}</p>
                {pub.description && (
                  <p className="text-white/90 text-xs leading-tight mt-0.5 line-clamp-2 drop-shadow">{pub.description}</p>
                )}
                {pub.bouton_texte && (
                  <span className="inline-flex items-center gap-1 mt-1.5 self-start px-2.5 py-1 rounded-full bg-white/90 text-gray-900 text-[11px] font-bold">
                    {pub.bouton_texte} →
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {pubs.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Publicité précédente"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button
              type="button"
              aria-label="Publicité suivante"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
