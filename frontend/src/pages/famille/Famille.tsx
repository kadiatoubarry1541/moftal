import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isAdmin } from '../../utils/auth'
import { FavorisDropdown, FavorisDropdownItem } from '../../components/FavorisDropdown'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'
const FAV_KEY = 'famille_favorite'

interface UserData {
  numeroH: string
  prenom: string
  nomFamille: string
  genre: 'HOMME' | 'FEMME' | 'AUTRE'
  dateNaissance?: string
  date_naissance?: string
  role?: string
  isAdmin?: boolean
  lieuResidence2?: string
  lieuResidence3?: string
  ville?: string
}

interface NavCard {
  to: string
  emoji: string
  label: string
  state?: Record<string, unknown>
}

function Card({ to, emoji, label, state }: NavCard) {
  return (
    <Link
      to={to}
      state={state}
      className="w-full flex flex-col items-center justify-center gap-0.5 py-2 px-0.5 rounded-xl bg-white border border-gray-100 shadow-sm transition hover:bg-emerald-50 hover:border-emerald-200 active:scale-95"
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">{label}</span>
    </Link>
  )
}

const FAMILLE_PAGES = [
  { id: 'arbre',      emoji: '🌳', label: 'Mon Arbre',  to: '/famille/moi/arbre'  },
  { id: 'foyer',      emoji: '🏠', label: 'Foyer',      to: '/famille/foyer'      },
  { id: 'amitie',     emoji: '💕', label: 'Amitié',     to: '/famille/mes-amours' },
  { id: 'histoire',   emoji: '📜', label: 'Récit',      to: '/famille/histoire'   },
  { id: 'solidarite', emoji: '🤝', label: 'Solidarité', to: '/solidarite'         },
]

function getFav(numeroH: string) {
  return localStorage.getItem(`${FAV_KEY}_${numeroH}`) || ''
}
function saveFav(numeroH: string, id: string) {
  localStorage.setItem(`${FAV_KEY}_${numeroH}`, id)
}

export default function Famille() {
  const [user, setUser]         = useState<UserData | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
    const u = sessionData.userData || sessionData
    if (u?.numeroH) setUser(u)
  }, [])

  useEffect(() => {
    if (location.pathname !== '/famille' || !user?.numeroH) return
    if ((location.state as { returnToHub?: boolean })?.returnToHub) return
    if (isAdmin(user)) return

    const applyFavorite = () => {
      const fav = getFav(user.numeroH)
      if (fav) {
        const page = FAMILLE_PAGES.find(p => p.id === fav)
        if (page?.to) { navigate(page.to, { replace: true }); return }
      }
    }

    const token = localStorage.getItem('token')
    if (!token) { applyFavorite(); return }

    let cancelled = false
    const run = async () => {
      try {
        const [resChildren, resParents] = await Promise.all([
          fetch(`${API_BASE}/api/parent-child/my-children`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/parent-child/my-parents`,  { headers: { Authorization: `Bearer ${token}` } })
        ])
        if (cancelled) return
        const dataChildren = resChildren.ok ? await resChildren.json() : { children: [] }
        const dataParents  = resParents.ok  ? await resParents.json()  : { parents:  [] }
        if ((dataChildren.children || []).length > 0) { navigate('/famille/enfants', { replace: true }); return }
        if ((dataParents.parents   || []).length > 0) { navigate('/famille/parents', { replace: true }); return }
        if (!cancelled) applyFavorite()
      } catch { if (!cancelled) applyFavorite() }
    }
    run()
    return () => { cancelled = true }
  }, [location.pathname, user?.numeroH, navigate])

  const effectiveUser: UserData = user || { numeroH: '', prenom: 'Invité', nomFamille: '', genre: 'HOMME' }
  const userIsAdmin  = isAdmin(effectiveUser)
  const isOnSubPage  = location.pathname !== '/famille'

  // ── Sous-page : layout avec bouton retour ──
  if (isOnSubPage) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            to="/famille"
            state={{ returnToHub: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors text-sm border border-gray-200 dark:border-gray-600"
          >
            ← Famille
          </Link>
        </div>
        <Outlet />
      </div>
    )
  }

  // ── Hub principal ──
  return (
    <div className="max-w-md mx-auto px-4 py-4">

      {/* Bouton retour */}
      <button
        type="button"
        onClick={() => navigate('/compte')}
        className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors text-sm border border-gray-200 dark:border-gray-600"
      >
        ← Retour
      </button>

      {/* Header */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">👨‍👩‍👧</span>
        <div>
          <h1 className="text-base font-bold leading-tight">Ma Famille</h1>
          <p className="text-xs text-emerald-100 mt-0.5">Votre espace famille complet</p>
        </div>
        {userIsAdmin && (
          <Link
            to="/famille/admin"
            className="ml-auto flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-white transition"
          >
            👑 Admin
          </Link>
        )}
      </div>

      {/* Sélecteur page favorite */}
      {user?.numeroH && (
        <div className="mb-4 flex items-center justify-end">
          <FavorisDropdown
            headerLabel="Page d'accueil favorite"
            ariaLabel="Page famille favorite : choisissez la page affichée en premier à votre arrivée"
            title="Page famille favorite"
          >
            {(close) => FAMILLE_PAGES.map(p => {
              const isSelected = getFav(user.numeroH) === p.id
              return (
                <FavorisDropdownItem
                  key={p.id}
                  icon={<span className="text-base leading-none">{p.emoji}</span>}
                  label={p.label}
                  selected={isSelected}
                  onClick={() => {
                    saveFav(user.numeroH, p.id)
                    close()
                    if (p.to) navigate(p.to)
                  }}
                />
              )
            })}
          </FavorisDropdown>
        </div>
      )}

      {/* ── 7 boutons sur une seule ligne ── */}
      <div className="grid grid-cols-7 gap-1">
        <Card to="/famille/moi/arbre" emoji="🌳" label="Mon Arbre" />
        <Card to="/famille/foyer"     emoji="🏠" label="Foyer" />
        <Card to="/famille/moi/arbre" emoji="💬" label="Messages"  state={{ tab: 'echanges' }} />
        <Card to="/famille/moi/arbre" emoji="📷" label="Galerie"   state={{ openGallery: true }} />
        <Card to="/famille/mes-amours" emoji="💕" label="Amitié" />
        <Card to="/famille/histoire"   emoji="📜" label="Récit" />
        <Card to="/solidarite"         emoji="🤝" label="Solidarité" />
      </div>

    </div>
  )
}
