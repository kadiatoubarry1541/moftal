import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isAdmin } from '../../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

interface UserData {
  numeroH: string
  prenom: string
  nomFamille: string
  genre: 'HOMME' | 'FEMME' | 'AUTRE'
  dateNaissance?: string
  date_naissance?: string
  role?: string
  isAdmin?: boolean
}

interface NavCard {
  to: string
  emoji: string
  label: string
}

// Carte compacte cliquable
function Card({ to, emoji, label }: NavCard) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-3 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30"
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-center leading-tight">{label}</span>
    </Link>
  )
}


export default function Famille() {
  const [user, setUser] = useState<UserData | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
    const u = sessionData.userData || sessionData
    if (u?.numeroH) setUser(u)
  }, [])

  // Redirection : parent → Mes Enfants, enfant → Mes Parents
  useEffect(() => {
    if (location.pathname !== '/famille' || !user?.numeroH) return
    if ((location.state as { returnToHub?: boolean })?.returnToHub) return
    if (isAdmin(user)) return
    const token = localStorage.getItem('token')
    if (!token) return
    let cancelled = false
    const run = async () => {
      try {
        const [resChildren, resParents] = await Promise.all([
          fetch(`${API_BASE}/api/parent-child/my-children`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/parent-child/my-parents`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        if (cancelled) return
        const dataChildren = resChildren.ok ? await resChildren.json() : { children: [] }
        const dataParents = resParents.ok ? await resParents.json() : { parents: [] }
        if ((dataChildren.children || []).length > 0) { navigate('/famille/enfants', { replace: true }); return }
        if ((dataParents.parents || []).length > 0) { navigate('/famille/parents', { replace: true }) }
      } catch { /* pas de redirection en cas d'erreur */ }
    }
    run()
    return () => { cancelled = true }
  }, [location.pathname, user?.numeroH, navigate])

  const effectiveUser: UserData = user || { numeroH: '', prenom: 'Invité', nomFamille: '', genre: 'HOMME' }
  const userIsAdmin = isAdmin(effectiveUser)
  const isOnSubPage = location.pathname !== '/famille'

  // --- Sous-page : afficher le contenu avec bouton retour ---
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

  // --- Hub principal ---
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

      {/* Header compact */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-md">
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

      {/* ── Toutes les pages famille — même taille ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card to="/famille/parents"    emoji="👨‍👩‍👦" label="Parents"    />
        <Card to="/famille/enfants"    emoji="👶"    label="Enfants"    />
        <Card to="/famille/femmes"     emoji="👰"    label="Ma femme"   />
        <Card to="/famille/mari"       emoji="🤵"    label="Mon homme"  />
        <Card to="/famille/mes-amours" emoji="💕"    label="Amitié"     />
        <Card to="/famille/moi/arbre"  emoji="🌳"    label="Mon arbre"  />
      </div>

    </div>
  )
}
