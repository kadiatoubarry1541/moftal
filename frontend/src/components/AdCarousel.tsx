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

  if (pubs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-6">
        <button
          type="button"
          onClick={() => navigate('/publicite')}
          className="w-full rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}
        >
          <div className="flex items-center gap-4 px-5 py-6">
            <div className="text-4xl flex-shrink-0">📣</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base">Annoncez votre activité ici</p>
              <p className="text-amber-50 text-xs mt-0.5">Touchez toute la communauté Moftal</p>
            </div>
            <div className="flex-shrink-0 bg-white/20 rounded-full px-3 py-1.5 text-white text-xs font-bold">
              Publier →
            </div>
          </div>
        </button>
      </div>
    )
  }

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
