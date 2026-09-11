import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FavorisDropdown, FavorisDropdownItem } from '../components/FavorisDropdown'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '')

interface Pub {
  id: string
  image_url: string
  lien?: string
  titre?: string
  description?: string
  bouton_texte?: string
}

// Bandeau "Pub" compact — tient sur la même ligne que le bouton Favoris dans
// le header, sans faire bouger ce dernier. Montre une pub à la fois, qui
// change automatiquement toutes les 3 secondes (comme une liste qui tourne).
function PubCarrousel() {
  const navigate = useNavigate()
  const [pubs, setPubs] = useState<Pub[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    fetch(`${API}/api/publicites/actives`)
      .then(r => r.json())
      .then(d => { if (d.success) setPubs(d.publicites) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (pubs.length <= 1) return
    const timer = setInterval(() => setIndex(i => (i + 1) % pubs.length), 3000)
    return () => clearInterval(timer)
  }, [pubs.length])

  if (pubs.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate('/publicite')}
        className="min-h-[36px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}
      >
        📣 Pub
      </button>
    )
  }

  const pub = pubs[index % pubs.length]
  const imgSrc = pub.image_url.startsWith('http') ? pub.image_url : `${API}${pub.image_url}`

  return (
    <button
      type="button"
      onClick={() => navigate(pub.lien || '/publicite')}
      className="relative h-9 rounded-lg overflow-hidden border border-amber-300 flex-1 min-w-0"
    >
      {/* L'image occupe tout le bouton pour qu'on puisse voir et comprendre la pub */}
      <img src={imgSrc} alt={pub.titre || 'Pub'} className="absolute inset-0 w-full h-full object-cover" />
      {pub.titre && (
        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] font-semibold truncate px-1.5 py-0.5 text-left">
          {pub.titre}
        </span>
      )}
    </button>
  )
}

interface ServicesProps {
  onClose?: () => void
}

interface ServiceItem {
  to: string
  emoji: string
  label: string
  bg: string
}

const SERVICES_FAV_KEY = 'services_favorites'
const MAX_FAVORITES = 4

function getFavoriteServices(numeroH: string): string[] {
  try {
    const raw = localStorage.getItem(`${SERVICES_FAV_KEY}_${numeroH}`)
    const ids = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

function saveFavoriteServices(numeroH: string, ids: string[]) {
  localStorage.setItem(`${SERVICES_FAV_KEY}_${numeroH}`, JSON.stringify(ids))
}

function ServiceIcon({ to, emoji, label, bg, isFavorite }: ServiceItem & { isFavorite: boolean }) {
  return (
    <Link to={to} className="relative w-full flex flex-col items-center gap-0.5 py-2 px-0.5 rounded-xl bg-white border border-gray-100 shadow-sm transition hover:bg-gray-50 hover:border-gray-200 active:scale-95">
      {isFavorite && (
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
          ✓
        </span>
      )}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${bg}`}>
        {emoji}
      </div>
      <span className="text-[8px] font-medium text-gray-600 text-center leading-tight">{label}</span>
    </Link>
  )
}

export default function Services({ onClose }: ServicesProps = {}) {
  const navigate = useNavigate()
  const [numeroH, setNumeroH] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
    const user = sessionData.userData || sessionData
    if (user?.numeroH) {
      setNumeroH(user.numeroH)
      setFavoriteIds(getFavoriteServices(user.numeroH))
    }
  }, [])

  useEffect(() => {
    if (numeroH) saveFavoriteServices(numeroH, favoriteIds)
  }, [numeroH, favoriteIds])

  const services: ServiceItem[] = [
    { to: '/sante',                                    emoji: '🏥', label: 'Santé',        bg: 'bg-red-100'    },
    { to: '/securite',                                 emoji: '🛡️', label: 'Sécurité',     bg: 'bg-slate-100'  },
    { to: '/immobilier',                               emoji: '🏠', label: 'Immobilier',   bg: 'bg-amber-100'  },
    { to: '/education',                                emoji: '🎓', label: 'Éducation',    bg: 'bg-amber-100'  },
    { to: '/madrasa',                                  emoji: '📖', label: 'Madrasa',      bg: 'bg-teal-100'   },
    { to: '/commerce',                                  emoji: '🏪', label: 'Commerce',     bg: 'bg-yellow-100' },
    { to: '/entreprise',                               emoji: '🏢', label: 'Entreprise',   bg: 'bg-violet-100' },
    { to: '/journalistes',                             emoji: '📰', label: 'Journalistes', bg: 'bg-orange-100' },
    { to: '/science',                                  emoji: '🔬', label: 'Science',      bg: 'bg-indigo-100' },
    { to: '/fournisseurs',                             emoji: '🚚', label: 'Fournisseurs', bg: 'bg-cyan-100'   },
    { to: '/restaurants',                              emoji: '🍽️', label: 'Restaurant',   bg: 'bg-orange-100' },
    { to: '/transport',                                emoji: '🚌', label: 'Transport',    bg: 'bg-blue-100'   },
    { to: '/beaute',                                   emoji: '💈', label: 'Beauté',       bg: 'bg-pink-100'   },
    { to: '/artisans',                                 emoji: '🔧', label: 'Artisanat',    bg: 'bg-stone-100'  },
    { to: '/reseau',                                   emoji: '🔗', label: 'Réseau',       bg: 'bg-purple-100' },
    { to: '/vendeurs',                                 emoji: '🛍️', label: 'Vendeurs',     bg: 'bg-sky-100'    },
    { to: '/producteurs',                              emoji: '🌾', label: 'Producteurs',  bg: 'bg-lime-100'   },
  ]

  const toggleFavorite = (to: string) => {
    setFavoriteIds(prev => {
      if (prev.includes(to)) return prev.filter(id => id !== to)
      if (prev.length >= MAX_FAVORITES) return prev
      return [...prev, to]
    })
  }

  // Favoris en premier (dans leur ordre d'origine), puis le reste
  const orderedServices = [
    ...services.filter(s => favoriteIds.includes(s.to)),
    ...services.filter(s => !favoriteIds.includes(s.to)),
  ]

  return (
    <>
      {/* Header (style Espace Gestion) */}
      <header style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 40, borderBottom: '2px solid #1e293b', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
      <div className="max-w-md mx-auto flex items-center gap-2" style={{ padding: '6px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => navigate('/compte')}
            aria-label="Retour à l'accueil"
            style={{ background: 'none', color: 'white', border: 'none', padding: 2, cursor: 'pointer', fontSize: 34, fontWeight: 700, lineHeight: 1, opacity: 1 }}
          >
            ‹
          </button>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px', margin: 0 }}>💼 Services</h1>
        </div>
        {/* Pub — même ligne que le bouton Favoris, juste avant lui ; Favoris ne bouge pas */}
        <div className="flex-1 min-w-0 flex justify-end">
          <PubCarrousel />
        </div>
        {numeroH && (
          <FavorisDropdown
            headerLabel={`Services favoris (${favoriteIds.length}/${MAX_FAVORITES})`}
            ariaLabel="Choisissez jusqu'à 4 services favoris : ils s'affichent en premier"
            title="Services favoris"
            widthClassName="w-56"
          >
            {() => services.map(s => {
              const isSelected = favoriteIds.includes(s.to)
              const disabled = !isSelected && favoriteIds.length >= MAX_FAVORITES
              return (
                <FavorisDropdownItem
                  key={s.to}
                  icon={<span className="text-base leading-none">{s.emoji}</span>}
                  label={s.label}
                  selected={isSelected}
                  disabled={disabled}
                  multi
                  onClick={() => toggleFavorite(s.to)}
                />
              )
            })}
          </FavorisDropdown>
        )}
      </div>
      </header>

    <div className="max-w-md mx-auto px-4 pb-4 pt-3">
      {/* Grille icônes style compact */}
      <div className="grid grid-cols-4 gap-2">
        {orderedServices.map(s => (
          <ServiceIcon key={s.to} {...s} isFavorite={favoriteIds.includes(s.to)} />
        ))}
      </div>

      {/* Proposer votre service — en bas */}
      <button
        type="button"
        onClick={() => navigate('/inscription-pro')}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 mt-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
      >
        ➕ Proposer votre service
      </button>
    </div>
    </>
  )
}
