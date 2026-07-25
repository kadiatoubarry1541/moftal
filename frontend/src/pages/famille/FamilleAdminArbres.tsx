import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAdmin, getNumeroHForDisplay } from '../../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

interface FamilyMemberRow {
  numeroH: string
  prenom: string
  nomFamille: string
  genre?: 'HOMME' | 'FEMME' | 'AUTRE'
  photo?: string
}

interface FamilyRow {
  nomFamille: string
  memberCount: number
  members: FamilyMemberRow[]
}

function getToken() {
  return localStorage.getItem('token')
}

export default function FamilleAdminArbres() {
  const navigate = useNavigate()
  const [families, setFamilies] = useState<FamilyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const user = (() => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
      return sessionData.userData || sessionData
    } catch {
      return null
    }
  })()

  useEffect(() => {
    if (!user?.numeroH || !isAdmin(user)) {
      navigate('/famille', { replace: true })
      return
    }
    const token = getToken()
    if (!token) {
      navigate('/famille', { replace: true })
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/admin/families`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.success) setFamilies(data.families || [])
        }
      } catch {
        // silencieux
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [navigate, user?.numeroH])

  const filteredFamilies = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return families
    return families.filter(f => f.nomFamille?.toLowerCase().includes(q))
  }, [families, search])

  const activeFamily = families.find(f => f.nomFamille === selected) || null

  const genreBadge = (genre?: string) => {
    if (genre === 'HOMME') return { emoji: '👨', label: 'Homme' }
    if (genre === 'FEMME') return { emoji: '👩', label: 'Femme' }
    return { emoji: '🧑', label: 'Genre non précisé' }
  }

  if (!user?.numeroH || !isAdmin(user)) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <Link
          to="/famille/admin"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors shadow-sm border border-gray-200"
        >
          <span aria-hidden>←</span>
          Retour à la vue Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="text-3xl">🌳</span>
          Toutes les familles
        </h1>
      </div>

      <p className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
        🔒 Réservé à l'administration. Chaque utilisateur continue de ne voir que sa propre famille dans son propre arbre — cette page ne change rien à ça.
      </p>

      {loading && <div className="text-center py-12 text-gray-500">Chargement...</div>}

      {!loading && !activeFamily && (
        <>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une famille par nom..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm mb-4 outline-none focus:border-emerald-400"
          />
          <p className="text-sm text-gray-500 mb-4">{filteredFamilies.length} famille{filteredFamilies.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredFamilies.map(f => (
              <button
                key={f.nomFamille}
                type="button"
                onClick={() => setSelected(f.nomFamille)}
                className="text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-emerald-400 hover:shadow transition-all"
              >
                <p className="font-bold text-gray-900">{f.nomFamille || '(sans nom)'}</p>
                <p className="text-xs text-gray-500 mt-1">{f.memberCount} membre{f.memberCount > 1 ? 's' : ''}</p>
              </button>
            ))}
            {filteredFamilies.length === 0 && (
              <p className="text-gray-400 text-sm col-span-full text-center py-8">Aucune famille ne correspond à cette recherche.</p>
            )}
          </div>
        </>
      )}

      {!loading && activeFamily && (
        <>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
          >
            ← Toutes les familles
          </button>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Famille {activeFamily.nomFamille} — {activeFamily.memberCount} membre{activeFamily.memberCount > 1 ? 's' : ''}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {activeFamily.members.map(m => {
              const badge = genreBadge(m.genre)
              return (
                <div key={m.numeroH} className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                  {m.photo
                    ? <img src={m.photo} alt={m.prenom} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-200" />
                    : <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-xl">{badge.emoji}</div>
                  }
                  <p className="text-xs font-bold text-gray-900 truncate w-full">{m.prenom} {m.nomFamille}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{getNumeroHForDisplay(m.numeroH, false)}</p>
                  <span className="text-[10px] text-gray-500">{badge.emoji} {badge.label}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
