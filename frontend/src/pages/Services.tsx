import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FavorisDropdown, FavorisDropdownItem } from '../components/FavorisDropdown'
import { AdCarousel } from '../components/AdCarousel'
import { useI18n } from '../i18n/useI18n'

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
    <Link to={to} className="relative w-full flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl bg-white border border-gray-100 shadow-sm transition hover:bg-gray-50 hover:border-gray-200 active:scale-95">
      {isFavorite && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
          ✓
        </span>
      )}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${bg}`}>
        {emoji}
      </div>
      <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{label}</span>
    </Link>
  )
}

export default function Services({ onClose }: ServicesProps = {}) {
  const { t } = useI18n()
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
    { to: '/sante',                                    emoji: '🏥', label: t('services.cat_sante'),        bg: 'bg-red-100'    },
    { to: '/securite',                                 emoji: '🛡️', label: t('services.cat_securite'),     bg: 'bg-slate-100'  },
    { to: '/immobilier',                               emoji: '🏠', label: t('services.cat_immobilier'),   bg: 'bg-amber-100'  },
    { to: '/education',                                emoji: '🎓', label: t('services.cat_education'),    bg: 'bg-amber-100'  },
    { to: '/madrasa',                                  emoji: '📖', label: t('services.cat_madrasa'),      bg: 'bg-teal-100'   },
    { to: '/commerce',                                  emoji: '🏪', label: t('services.cat_commerce'),     bg: 'bg-yellow-100' },
    { to: '/entreprise',                               emoji: '🏢', label: t('services.cat_entreprise'),   bg: 'bg-violet-100' },
    { to: '/journalistes',                             emoji: '📰', label: t('services.cat_journalistes'), bg: 'bg-orange-100' },
    { to: '/science',                                  emoji: '🔬', label: t('services.cat_science'),      bg: 'bg-indigo-100' },
    { to: '/fournisseurs',                             emoji: '🚚', label: t('services.cat_fournisseurs'), bg: 'bg-cyan-100'   },
    { to: '/restaurants',                              emoji: '🍽️', label: t('services.cat_restaurant'),   bg: 'bg-orange-100' },
    { to: '/transport',                                emoji: '🚌', label: t('services.cat_transport'),   bg: 'bg-blue-100'   },
    { to: '/beaute',                                   emoji: '💈', label: t('services.cat_beaute'),       bg: 'bg-pink-100'   },
    { to: '/artisans',                                 emoji: '🔧', label: t('services.cat_artisanat'),    bg: 'bg-stone-100'  },
    { to: '/reseau',                                   emoji: '🔗', label: t('services.cat_reseau'),       bg: 'bg-purple-100' },
    { to: '/vendeurs',                                 emoji: '🛍️', label: t('services.cat_vendeurs'),     bg: 'bg-sky-100'    },
    { to: '/producteurs',                              emoji: '🌾', label: t('services.cat_producteurs'),  bg: 'bg-lime-100'   },
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
      {/* Retour + titre + Pub + Favoris — tous sur la même ligne */}
      <div className="max-w-lg mx-auto flex items-center gap-2" style={{ padding: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => navigate('/compte')}
            aria-label={t('services.back_aria')}
            style={{ background: 'none', color: 'white', border: 'none', padding: 0, cursor: 'pointer', fontSize: 34, fontWeight: 700, lineHeight: 1, opacity: 1 }}
          >
            ‹
          </button>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: '-0.2px', margin: 0 }}>💼 {t('services.title')}</h1>
        </div>
        {/* Pub — même ligne que le bouton Favoris, juste avant lui ; Favoris ne bouge pas */}
        <div className="flex-1 min-w-0 h-[74px]">
          <AdCarousel compact />
        </div>
        {numeroH && (
          <FavorisDropdown
            headerLabel={`${t('services.favorites_label')} (${favoriteIds.length}/${MAX_FAVORITES})`}
            ariaLabel={t('services.favorites_aria')}
            title={t('services.favorites_label')}
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

    <div className="max-w-lg mx-auto px-2 pb-4 pt-3">
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
        className="w-full flex items-center justify-center gap-1.5 px-3 py-3 mt-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
      >
        {t('services.propose_btn')}
      </button>
    </div>
    </>
  )
}
