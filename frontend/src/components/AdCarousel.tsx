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

export function AdCarousel({ fill = false, compact = false }: { fill?: boolean; compact?: boolean }) {
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

  // Version compacte : pas de marge/padding externes — l'image occupe toute
  // la carte en un seul bloc (jamais partagée en deux zones de couleur), avec
  // les infos (titre, description, bouton) en légende superposée en bas, sur
  // un dégradé qui garde tout lisible. Pensée pour tenir sur la même ligne
  // qu'un autre bouton (ex : à côté de "Favoris" dans un header), avec le
  // même mécanisme de défilement automatique + flèches que sur l'accueil.
  if (compact) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-100">
        {pubs.map((pub, i) => (
          <div
            key={pub.id}
            onClick={() => goTo(pub.lien)}
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: i === active ? 1 : 0, cursor: pub.lien ? 'pointer' : 'default' }}
          >
            <img src={imgUrl(pub.image_url)} alt="" className="absolute inset-0 w-full h-full object-cover" />
            {(pub.titre || pub.description || pub.bouton_texte) && (
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/15 to-transparent px-2 py-1">
                {pub.titre && <p className="text-white font-bold text-[22px] truncate drop-shadow">{pub.titre}</p>}
                {pub.description && (
                  <p className="text-white/90 text-[20px] truncate drop-shadow">{pub.description}</p>
                )}
                {pub.bouton_texte && (
                  <span className="mt-0.5 inline-block self-start text-[20px] font-bold text-gray-900 bg-white/90 px-1.5 py-0.5 rounded-full">{pub.bouton_texte} ›</span>
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
              className="absolute left-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/35 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button
              type="button"
              aria-label="Publicité suivante"
              onClick={goNext}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/35 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={`max-w-2xl mx-auto px-4 pt-6 ${fill ? 'pb-0' : 'pb-4'} w-full${fill ? ' flex-1 flex flex-col' : ''}`}>
      <div
        className="relative rounded-2xl overflow-hidden bg-gray-100"
        style={fill ? { aspectRatio: '4 / 1', width: '100%', marginTop: 'auto', marginBottom: 12 } : { aspectRatio: '4 / 1' }}
      >
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
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
            {pub.titre && (
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-3">
                <p className="text-white font-bold text-[24px] leading-tight drop-shadow">{pub.titre}</p>
                {pub.description && (
                  <p className="text-white/90 text-[22px] leading-tight mt-0.5 line-clamp-2 drop-shadow">{pub.description}</p>
                )}
                {pub.bouton_texte && (
                  <span className="inline-flex items-center gap-1 mt-1.5 self-start px-2.5 py-1 rounded-full bg-white/90 text-gray-900 text-[21px] font-bold">
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
