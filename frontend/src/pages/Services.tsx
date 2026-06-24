import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FavorisDropdown, FavorisDropdownItem } from '../components/FavorisDropdown'

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
    { to: '/liste-professionnels?type=commerce',       emoji: '🏪', label: 'Commerce',     bg: 'bg-yellow-100' },
    { to: '/liste-professionnels?type=enterprise',     emoji: '🏢', label: 'Entreprise',   bg: 'bg-violet-100' },
    { to: '/journalistes',                             emoji: '📰', label: 'Journalistes', bg: 'bg-orange-100' },
    { to: '/science',                                  emoji: '🔬', label: 'Science',      bg: 'bg-indigo-100' },
    { to: '/liste-professionnels?type=supplier',       emoji: '🚚', label: 'Fournisseurs', bg: 'bg-cyan-100'   },
    { to: '/restaurants',                              emoji: '🍽️', label: 'Restaurant',   bg: 'bg-orange-100' },
    { to: '/transport',                                emoji: '🚌', label: 'Transport',    bg: 'bg-blue-100'   },
    { to: '/beaute',                                   emoji: '💈', label: 'Beauté',       bg: 'bg-pink-100'   },
    { to: '/artisans',                                 emoji: '🔧', label: 'Artisanat',    bg: 'bg-stone-100'  },
    { to: '/reseau-imam',                              emoji: '🧕', label: 'Imam',         bg: 'bg-green-100'  },
    { to: '/liste-professionnels?type=mairie',         emoji: '🏛️', label: 'Mairie',       bg: 'bg-gray-100'   },
    { to: '/liste-professionnels',                      emoji: '🔗', label: 'Réseau',       bg: 'bg-purple-100' },
    { to: '/solidarite',                               emoji: '🤝', label: 'ONG',          bg: 'bg-rose-100'   },
    { to: '/liste-professionnels?type=vendor',         emoji: '🛍️', label: 'Vendeurs',     bg: 'bg-sky-100'    },
    { to: '/liste-professionnels?type=producer',       emoji: '🌾', label: 'Producteurs',  bg: 'bg-lime-100'   },
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
    <div className="max-w-md mx-auto px-4 pb-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pt-3">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
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

      {/* Bouton créer un compte pro */}
      <button
        type="button"
        onClick={() => navigate('/inscription-pro')}
        className="w-full mb-4 flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
      >
        ➕ Proposer votre service
      </button>

      {/* Grille icônes style compact */}
      <div className="grid grid-cols-4 gap-2">
        {orderedServices.map(s => (
          <ServiceIcon key={s.to} {...s} isFavorite={favoriteIds.includes(s.to)} />
        ))}
      </div>

    </div>
  )
}
