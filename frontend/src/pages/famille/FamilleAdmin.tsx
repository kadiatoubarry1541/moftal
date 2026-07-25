import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAdmin, getNumeroHForDisplay } from '../../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

interface ParentChildLinkRow {
  id: string
  parentNumeroH: string
  childNumeroH: string
  status: string
  parentType?: string
  parent?: { numeroH: string; prenom: string; nomFamille: string } | null
  child?: { numeroH: string; prenom: string; nomFamille: string } | null
}

interface CoupleLinkRow {
  id: string
  numeroH1: string
  numeroH2: string
  status: string
  initiatedByNumeroH?: string
  user1?: { numeroH: string; prenom: string; nomFamille: string } | null
  user2?: { numeroH: string; prenom: string; nomFamille: string } | null
}

function getToken() {
  return localStorage.getItem('token')
}

export default function FamilleAdmin() {
  const navigate = useNavigate()
  const [parentChildLinks, setParentChildLinks] = useState<ParentChildLinkRow[]>([])
  const [coupleLinks, setCoupleLinks] = useState<CoupleLinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const user = (() => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
      return sessionData.userData || sessionData
    } catch {
      return null
    }
  })()

  useEffect(() => {
    if (!user?.numeroH) {
      navigate('/famille', { replace: true })
      return
    }
    if (!isAdmin(user)) {
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
        const [resPC, resCouple] = await Promise.allSettled([
          fetch(`${API_BASE}/api/parent-child/admin/all-links`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/couple/admin/all-links`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        if (cancelled) return
        if (resPC.status === 'fulfilled' && resPC.value.ok) {
          const dataPC = await resPC.value.json()
          setParentChildLinks(dataPC.links || [])
        }
        if (resCouple.status === 'fulfilled' && resCouple.value.ok) {
          const dataCouple = await resCouple.value.json()
          setCoupleLinks(dataCouple.links || [])
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

  const handleConfirmParentChild = async (linkId: string) => {
    const token = getToken()
    if (!token) return
    setActionLoading(linkId)
    try {
      const res = await fetch(`${API_BASE}/api/parent-child/confirm/${linkId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setParentChildLinks(prev => prev.map(l => l.id === linkId ? { ...l, status: 'active' } : l))
      }
    } catch {
      // silencieux
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteParentChild = async (linkId: string) => {
    if (!confirm('Supprimer cette liaison parent-enfant ?')) return
    const token = getToken()
    if (!token) return
    setActionLoading(linkId)
    try {
      const res = await fetch(`${API_BASE}/api/parent-child/link/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setParentChildLinks(prev => prev.filter(l => l.id !== linkId))
      }
    } catch {
      // silencieux
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmCouple = async (linkId: string) => {
    const token = getToken()
    if (!token) return
    setActionLoading(linkId)
    try {
      const res = await fetch(`${API_BASE}/api/couple/confirm/${linkId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setCoupleLinks(prev => prev.map(l => l.id === linkId ? { ...l, status: 'active' } : l))
      }
    } catch {
      // silencieux
    } finally {
      setActionLoading(null)
    }
  }

  const handleLeaveCouple = async (linkId: string) => {
    if (!confirm('Supprimer cette liaison couple ?')) return
    const token = getToken()
    if (!token) return
    setActionLoading(linkId)
    try {
      const res = await fetch(`${API_BASE}/api/couple/leave`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId })
      })
      if (res.ok) {
        setCoupleLinks(prev => prev.filter(l => l.id !== linkId))
      }
    } catch {
      // silencieux
    } finally {
      setActionLoading(null)
    }
  }

  if (!user?.numeroH || !isAdmin(user)) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <Link
          to="/famille"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
        >
          <span aria-hidden>←</span>
          Retour à Famille
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="text-3xl">👑</span>
          Vue Admin – Toutes les liaisons
        </h1>
        <Link
          to="/famille/admin/arbres"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          🌳 Toutes les familles
        </Link>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      )}

      {!loading && (
        <>
          {/* Liaisons parent-enfant */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              👨‍👩‍👦 Liaisons parent-enfant ({parentChildLinks.length})
            </h2>
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              {parentChildLinks.length === 0 ? (
                <p className="p-6 text-gray-500">Aucune liaison parent-enfant.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {parentChildLinks.map((link) => (
                    <li key={link.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-medium">
                          {link.parent?.prenom} {link.parent?.nomFamille}
                        </span>
                        <span className="text-gray-500"> ({getNumeroHForDisplay(link.parentNumeroH, false)})</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium">
                          {link.child?.prenom} {link.child?.nomFamille}
                        </span>
                        <span className="text-gray-500"> ({getNumeroHForDisplay(link.childNumeroH, false)})</span>
                        <span className="ml-2 px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-700">
                          {link.status}
                        </span>
                        {link.parentType && (
                          <span className="ml-2 text-sm text-gray-500">({link.parentType})</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {link.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmParentChild(link.id)}
                            disabled={actionLoading === link.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Confirmer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteParentChild(link.id)}
                          disabled={actionLoading === link.id}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Liaisons couple */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🤵👰 Liaisons couple ({coupleLinks.length})
            </h2>
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              {coupleLinks.length === 0 ? (
                <p className="p-6 text-gray-500">Aucune liaison couple.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {coupleLinks.map((link) => (
                    <li key={link.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-medium">
                          {link.user1?.prenom} {link.user1?.nomFamille}
                        </span>
                        <span className="text-gray-500"> ({getNumeroHForDisplay(link.numeroH1, false)})</span>
                        <span className="mx-2 text-gray-400">↔</span>
                        <span className="font-medium">
                          {link.user2?.prenom} {link.user2?.nomFamille}
                        </span>
                        <span className="text-gray-500"> ({getNumeroHForDisplay(link.numeroH2, false)})</span>
                        <span className="ml-2 px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-700">
                          {link.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {link.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmCouple(link.id)}
                            disabled={actionLoading === link.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Confirmer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleLeaveCouple(link.id)}
                          disabled={actionLoading === link.id}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
