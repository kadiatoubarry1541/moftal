import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { config } from '../config/api'

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || ''

interface Pub {
  id: string
  image_url: string
  lien?: string | null
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
    }, 4000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pubs.length])

  const imgUrl = (path: string) => (path.startsWith('http') ? path : `${API_ORIGIN}${path}`)

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
    <div className="max-w-2xl mx-auto px-4 pb-6">
      <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '16 / 7' }}>
        {pubs.map((pub, i) => (
          <img
            key={pub.id}
            src={imgUrl(pub.image_url)}
            alt=""
            onClick={() => goTo(pub.lien)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === active ? 1 : 0, cursor: pub.lien ? 'pointer' : 'default' }}
          />
        ))}
      </div>
      {pubs.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {pubs.map((pub, i) => (
            <button
              key={pub.id}
              type="button"
              aria-label={`Publicité ${i + 1}`}
              onClick={() => setActive(i)}
              className="rounded-full transition-all"
              style={{
                width: i === active ? 16 : 6,
                height: 6,
                background: i === active ? '#22a722' : '#d1d5db',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
