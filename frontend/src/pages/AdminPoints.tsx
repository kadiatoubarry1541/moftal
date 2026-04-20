import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessionUser, isAdmin } from '../utils/auth'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '')

interface Transaction {
  id: string
  numero_h: string
  points_ajoutes: number
  montant_gnf: number
  note: string
  admin_numero_h: string
  created_at: string
}

interface UserPoints {
  numeroH: string
  prenom: string
  nomFamille: string
  pointsDisponibles: number
  totalAchete: number
  updatedAt: string
}

const TARIFS = [
  { label: '10 000 GNF', montant: 10000, points: 20 },
  { label: '20 000 GNF', montant: 20000, points: 40 },
  { label: '50 000 GNF', montant: 50000, points: 100 },
  { label: '100 000 GNF', montant: 100000, points: 210 },
]

export default function AdminPoints() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'assign' | 'history' | 'users'>('assign')
  const [numeroH, setNumeroH] = useState('')
  const [points, setPoints] = useState('')
  const [montantGNF, setMontantGNF] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [usersList, setUsersList] = useState<UserPoints[]>([])
  const [searchUser, setSearchUser] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserPoints | null>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    const user = getSessionUser()
    if (!user || !isAdmin(user)) {
      navigate('/login')
    }
  }, [navigate])

  const loadTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quotas/admin/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setTransactions(data.transactions || [])
    } catch {}
  }

  const loadUsers = async () => {
    try {
      const url = searchUser
        ? `${API_BASE}/api/quotas/admin/points?search=${encodeURIComponent(searchUser)}`
        : `${API_BASE}/api/quotas/admin/points`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setUsersList(data.data || [])
    } catch {}
  }

  useEffect(() => {
    if (tab === 'history') loadTransactions()
    if (tab === 'users') loadUsers()
  }, [tab])

  const loadUserDetail = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/quotas/admin/user/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setSelectedUser({ ...data.user, pointsDisponibles: data.pointsDisponibles, totalAchete: data.totalAchete, updatedAt: '' })
        setNumeroH(data.user.numeroH)
        setTab('assign')
      }
    } catch {}
  }

  const applyTarif = (t: typeof TARIFS[0]) => {
    setPoints(String(t.points))
    setMontantGNF(String(t.montant))
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!numeroH.trim() || !points.trim()) {
      setMessage({ type: 'error', text: 'NumeroH et points sont obligatoires' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/api/quotas/admin/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroH: numeroH.trim(),
          points: parseInt(points),
          montantGNF: parseInt(montantGNF) || 0,
          note
        })
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `✅ ${data.message} — Nouveau solde : ${data.nouveauSolde} pts` })
        setNumeroH('')
        setPoints('')
        setMontantGNF('')
        setNote('')
        setSelectedUser(null)
      } else {
        setMessage({ type: 'error', text: data.message || 'Erreur' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Points Galerie</h1>
            <p className="text-sm opacity-80 mt-1">Attribuez des points après réception du paiement</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            ← Retour Admin
          </button>
        </div>
      </header>

      {/* Tarifs */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Grille tarifaire officielle</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TARIFS.map((t) => (
              <div key={t.montant} className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-indigo-700">{t.points} pts</div>
                <div className="text-xs text-gray-600 font-medium">{t.label}</div>
                <div className="text-xs text-gray-400 mt-1">1 photo = 1 pt · 1 vidéo = 2 pts</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'assign', label: 'Attribuer des points', icon: '➕' },
              { id: 'users', label: 'Soldes utilisateurs', icon: '👥' },
              { id: 'history', label: 'Historique', icon: '📋' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ═══ ATTRIBUER DES POINTS ═══ */}
            {tab === 'assign' && (
              <div className="max-w-lg">
                <h2 className="text-lg font-bold text-gray-800 mb-1">Attribuer des points à un utilisateur</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Entrez le NumeroH familial, choisissez le montant payé et attribuez les points correspondants.
                </p>

                {selectedUser && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                      {selectedUser.prenom?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-indigo-900">{selectedUser.prenom} {selectedUser.nomFamille}</div>
                      <div className="text-xs text-indigo-600">{selectedUser.numeroH} · Solde actuel : {selectedUser.pointsDisponibles} pts</div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                )}

                {message && (
                  <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleAssign} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">NumeroH familial *</label>
                    <input
                      type="text"
                      value={numeroH}
                      onChange={e => setNumeroH(e.target.value)}
                      placeholder="Ex: G1C1P1R1E1F1 1"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Montant payé (sélectionner le tarif) *</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {TARIFS.map((t) => (
                        <button
                          key={t.montant}
                          type="button"
                          onClick={() => applyTarif(t)}
                          className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                            montantGNF === String(t.montant) && points === String(t.points)
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-gray-200 hover:border-indigo-400 text-gray-700'
                          }`}
                        >
                          {t.label} → {t.points} pts
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Points à attribuer *</label>
                        <input
                          type="number"
                          value={points}
                          onChange={e => setPoints(e.target.value)}
                          min={1}
                          placeholder="20"
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Montant GNF reçu</label>
                        <input
                          type="number"
                          value={montantGNF}
                          onChange={e => setMontantGNF(e.target.value)}
                          min={0}
                          placeholder="10000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Note (optionnel)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Ex: Paiement Orange Money reçu le 20/04"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                      maxLength={200}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl transition-colors shadow-sm"
                  >
                    {loading ? 'Attribution en cours...' : 'Attribuer les points'}
                  </button>
                </form>
              </div>
            )}

            {/* ═══ SOLDES UTILISATEURS ═══ */}
            {tab === 'users' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="text"
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    placeholder="Rechercher par NumeroH..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm"
                  />
                  <button
                    onClick={loadUsers}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                  >
                    Rechercher
                  </button>
                </div>
                {usersList.length === 0 ? (
                  <p className="text-center text-gray-400 py-10">Aucun utilisateur avec des points pour l'instant</p>
                ) : (
                  <div className="space-y-2">
                    {usersList.map((u) => (
                      <div key={u.numeroH} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                          {u.prenom?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">{u.prenom} {u.nomFamille}</div>
                          <div className="text-xs text-gray-500">{u.numeroH}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-indigo-700">{u.pointsDisponibles} pts</div>
                          <div className="text-xs text-gray-400">Total acheté: {u.totalAchete}</div>
                        </div>
                        <button
                          onClick={() => loadUserDetail(u.numeroH)}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Attribuer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ HISTORIQUE ═══ */}
            {tab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Historique des attributions</h2>
                  <button onClick={loadTransactions} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">Actualiser</button>
                </div>
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-400 py-10">Aucune transaction enregistrée</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t) => (
                      <div key={t.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{t.numero_h}</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                +{t.points_ajoutes} pts
                              </span>
                              {t.montant_gnf > 0 && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {t.montant_gnf.toLocaleString()} GNF
                                </span>
                              )}
                            </div>
                            {t.note && <p className="text-xs text-gray-500 mt-1">{t.note}</p>}
                            <p className="text-xs text-gray-400 mt-1">Admin: {t.admin_numero_h}</p>
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
