import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSessionUser } from '../utils/auth'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '')

const TARIFS = [
  { label: '10 000 GNF', montant: 10000, points: 20, popular: false },
  { label: '20 000 GNF', montant: 20000, points: 40, popular: true },
  { label: '50 000 GNF', montant: 50000, points: 100, popular: false },
  { label: '100 000 GNF', montant: 100000, points: 210, popular: false },
]

export default function AcheterPoints() {
  const navigate = useNavigate()
  const [solde, setSolde] = useState<number | null>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    const user = getSessionUser()
    if (!user) { navigate('/login'); return }
    fetch(`${API_BASE}/api/quotas/my-points`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setSolde(d.pointsDisponibles) })
      .catch(() => {})
  }, [navigate, token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">←</button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-base font-bold text-gray-800">Points Galerie</h1>
          </div>
          {solde !== null && (
            <div className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-semibold">
              <span>Solde :</span>
              <span>{solde} pts</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Intro */}
        <div className="text-center">
          <div className="text-5xl mb-3">🪙</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Publiez plus dans votre galerie</h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Chaque famille bénéficie de <strong>5 photos + 1 vidéo gratuites</strong> dans la galerie familiale.
            Au-delà, achetez des points et publiez autant que vous voulez.
          </p>
        </div>

        {/* Quota explication */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🖼️', title: 'Galerie familiale', free: '5 photos + 1 vidéo', link: 'Partagé avec toute la famille' },
            { icon: '💑', title: 'Galerie couple', free: '2 photos + 1 vidéo', link: 'Entre vous et votre partenaire' },
            { icon: '👨‍👩‍👧', title: 'Galerie parent-enfant', free: '2 photos + 1 vidéo', link: 'Entre vous et votre enfant' },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-bold text-gray-800 text-sm mb-1">{item.title}</div>
              <div className="text-indigo-600 font-semibold text-sm mb-1">{item.free} <span className="text-gray-400 font-normal">gratuits</span></div>
              <div className="text-xs text-gray-400">{item.link}</div>
            </div>
          ))}
        </div>

        {/* Prix des points */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">1 point = 1 photo · 2 points = 1 vidéo</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
            {TARIFS.map((t) => (
              <div key={t.montant} className={`relative p-5 text-center ${t.popular ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                    Populaire
                  </div>
                )}
                <div className={`text-3xl font-bold mb-1 ${t.popular ? 'text-white' : 'text-indigo-700'}`}>{t.points}</div>
                <div className={`text-sm font-semibold mb-2 ${t.popular ? 'text-indigo-200' : 'text-gray-500'}`}>points</div>
                <div className={`text-base font-bold ${t.popular ? 'text-white' : 'text-gray-800'}`}>{t.label}</div>
                <div className={`text-xs mt-1 ${t.popular ? 'text-indigo-200' : 'text-gray-400'}`}>
                  soit {t.points} photos ou {Math.floor(t.points / 2)} vidéos
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment acheter */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-900 mb-3">Comment acheter des points ?</h3>
          <ol className="space-y-3 text-sm text-amber-800">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 flex-shrink-0 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center font-bold text-xs">1</span>
              <span>Choisissez le nombre de points souhaité dans le tableau ci-dessus.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 flex-shrink-0 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center font-bold text-xs">2</span>
              <span>Effectuez votre paiement (Orange Money, carte bancaire, espèces) selon les instructions de l'administrateur.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 flex-shrink-0 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center font-bold text-xs">3</span>
              <span>Communiquez votre <strong>NuméroH familial</strong> et la preuve de paiement à l'administrateur.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 flex-shrink-0 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center font-bold text-xs">4</span>
              <span>L'administrateur attribue vos points — ils sont immédiatement disponibles dans votre compte.</span>
            </li>
          </ol>
        </div>

        {/* FAQ rapide */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-gray-800">Questions fréquentes</h3>
          {[
            {
              q: 'Les points expirent-ils ?',
              a: 'Non, vos points sont permanents. Ils restent disponibles jusqu\'à ce que vous les utilisiez.'
            },
            {
              q: 'Pourquoi un système payant ?',
              a: 'L\'hébergement des photos/vidéos a un coût. Les points permettent de financer les serveurs et la sécurité des données de votre famille.'
            },
            {
              q: 'Puis-je utiliser mes points pour la galerie couple ET familiale ?',
              a: 'Oui ! Vos points personnels s\'appliquent à toutes vos galeries : familiale, couple, et parent-enfant.'
            },
          ].map((faq) => (
            <div key={faq.q} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <div className="font-semibold text-gray-700 text-sm mb-1">{faq.q}</div>
              <div className="text-gray-500 text-sm">{faq.a}</div>
            </div>
          ))}
        </div>

        {/* Lien retour galerie */}
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
