import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { getSessionUser } from '../utils/auth'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '')

interface Pack {
  points: number
  prix: number
  popular?: boolean
}

interface PointsInfo {
  pointsDisponibles: number
  expiresAt: string | null
  estExpire: boolean
}

export default function AcheterPoints() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')

  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null)
  const [packs, setPacks] = useState<Pack[]>([])
  const [zone, setZone] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [payLoading, setPayLoading] = useState<number | null>(null)

  useEffect(() => {
    const user = getSessionUser()
    if (!user) { navigate('/login'); return }

    // Détecter retour FedaPay
    const params = new URLSearchParams(location.search)
    if (params.get('paiement') === 'succes') {
      alert('Paiement confirmé ! Vos points ont été ajoutés. Ils sont valables 1 mois.')
      navigate('/acheter-points', { replace: true })
    }

    charger()
  }, [navigate, token])

  async function charger() {
    setLoading(true)
    try {
      const [ptsRes, packsRes] = await Promise.all([
        fetch(`${API_BASE}/api/quotas/my-points`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/payment/prix-galerie-points`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const ptsData = await ptsRes.json()
      const packsData = await packsRes.json()

      if (ptsData.success) {
        setPointsInfo({
          pointsDisponibles: ptsData.pointsDisponibles,
          expiresAt: ptsData.expiresAt,
          estExpire: ptsData.estExpire,
        })
      }
      if (packsData.success) {
        setZone(packsData.zone)
        // Marquer le pack populaire (20 points)
        const packs: Pack[] = packsData.packs.map((p: Pack) => ({
          ...p,
          popular: p.points === 20,
        }))
        setPacks(packs)
      }
    } catch { /* non bloquant */ }
    finally { setLoading(false) }
  }

  async function acheterPack(pack: Pack) {
    setPayLoading(pack.points)
    try {
      const r = await fetch(`${API_BASE}/api/payment/initiate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: pack.prix,
          currency: 'GNF',
          purpose: 'galerie_points',
          relatedId: String(pack.points),
          description: `${pack.points} points galerie — valables 1 mois`,
        }),
      })
      const d = await r.json()
      if (d.paymentUrl) {
        window.location.href = d.paymentUrl
      } else {
        alert(d.message || 'Impossible de lancer le paiement. Réessayez.')
      }
    } catch {
      alert('Erreur de connexion.')
    } finally {
      setPayLoading(null)
    }
  }

  const fmt = (n: number) => n.toLocaleString('fr-GN') + ' GNF'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">←</button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-base font-bold text-gray-800">Points Galerie</h1>
          </div>
          {zone && (
            <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-1 rounded-full">
              {zone === 'afrique' ? '🌍 Tarif Afrique' : '🌐 Tarif international'}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Solde actuel */}
        {pointsInfo && (
          <div className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#1e3a5f)' }}>
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Mon solde de points</p>
            <p className="text-white font-black text-4xl mb-1">
              {pointsInfo.estExpire ? 0 : pointsInfo.pointsDisponibles}
              <span className="text-indigo-300 text-xl font-semibold"> pts</span>
            </p>

            {pointsInfo.estExpire && (
              <div className="mt-2 bg-red-500/20 rounded-xl px-3 py-2">
                <p className="text-red-200 text-xs font-bold">⚠️ Vos points ont expiré. Achetez un nouveau pack ci-dessous.</p>
              </div>
            )}

            {!pointsInfo.estExpire && pointsInfo.expiresAt && (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-indigo-300 text-xs">
                  Valides jusqu'au {new Date(pointsInfo.expiresAt).toLocaleDateString('fr-GN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}

            {!pointsInfo.estExpire && !pointsInfo.expiresAt && pointsInfo.pointsDisponibles > 0 && (
              <p className="text-indigo-300 text-xs mt-1">Points sans date d'expiration (attribués avant la mise à jour)</p>
            )}

            <div className="flex gap-4 mt-3 text-xs text-indigo-300">
              <span>📷 1 point = 1 photo</span>
              <span>🎥 3 points = 1 vidéo</span>
            </div>
          </div>
        )}

        {/* Explication */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <p className="font-bold text-amber-900 text-sm mb-1">Comment ça marche ?</p>
          <ul className="text-amber-800 text-sm space-y-1">
            <li>• Chaque famille a <strong>5 photos + 1 vidéo gratuites</strong></li>
            <li>• Au-delà, vous achetez des points pour publier plus</li>
            <li>• <strong>Les points sont valables 1 mois</strong> à partir de l'achat</li>
            <li>• Si vous les utilisez tous avant 1 mois, achetez un nouveau pack</li>
            <li>• Si vous achetez un nouveau pack, l'expiration repart de 1 mois</li>
          </ul>
        </div>

        {/* Packs de points */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Choisissez votre pack — valable 1 mois</h3>
            <p className="text-xs text-indigo-600 font-semibold mt-1">📷 1 point = 1 photo &nbsp;·&nbsp; 🎥 3 points = 1 vidéo</p>
            <p className="text-xs text-gray-400 mt-0.5">Paiement via Orange Money, Wave ou carte bancaire (FedaPay)</p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Chargement des prix...</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              {packs.map((pack) => (
                <button
                  key={pack.points}
                  onClick={() => acheterPack(pack)}
                  disabled={payLoading !== null}
                  className={`relative rounded-2xl p-4 text-center border-2 transition-all disabled:opacity-60 hover:scale-105 ${
                    pack.popular
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300'
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-black px-3 py-0.5 rounded-full">
                      Populaire
                    </span>
                  )}

                  <p className={`text-3xl font-black mb-0.5 ${pack.popular ? 'text-white' : 'text-indigo-700'}`}>
                    {pack.points}
                  </p>
                  <p className={`text-xs font-semibold mb-2 ${pack.popular ? 'text-indigo-200' : 'text-gray-500'}`}>
                    points
                  </p>
                  <p className={`text-base font-black ${pack.popular ? 'text-white' : 'text-gray-800'}`}>
                    {fmt(pack.prix)}
                  </p>
                  <p className={`text-xs mt-1 ${pack.popular ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {pack.points} photos · {Math.floor(pack.points / 3)} vidéos
                  </p>

                  {payLoading === pack.points && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quota des galeries */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🖼️', title: 'Galerie familiale', free: '5 photos + 1 vidéo' },
            { icon: '💑', title: 'Galerie couple', free: '2 photos + 1 vidéo' },
            { icon: '👨‍👩‍👧', title: 'Galerie parent-enfant', free: '2 photos + 1 vidéo' },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="font-bold text-gray-800 text-sm">{item.title}</div>
              <div className="text-indigo-600 font-semibold text-xs mt-0.5">{item.free} <span className="text-gray-400 font-normal">gratuits</span></div>
            </div>
          ))}
        </div>

        {/* Retour galerie */}
        <div className="text-center pb-4">
          <Link
            to="/galerie-famille"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
          >
            🖼️ Retour à la Galerie Familiale
          </Link>
        </div>
      </div>
    </div>
  )
}
