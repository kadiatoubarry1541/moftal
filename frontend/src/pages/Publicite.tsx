import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessionUser } from '../utils/auth'
import PaymentModal from '../components/PaymentModal'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '')

const STATUT_INFO: Record<string, { label: string; bg: string; text: string }> = {
  en_attente: { label: '⏳ En attente d\'approbation', bg: 'bg-amber-100', text: 'text-amber-700' },
  approuve:   { label: '✅ Approuvée', bg: 'bg-green-100', text: 'text-green-700' },
  refuse:     { label: '❌ Refusée', bg: 'bg-red-100', text: 'text-red-700' },
}

export default function Publicite() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const fileRef = useRef<HTMLInputElement>(null)

  const [prix, setPrix] = useState<number | null>(null)
  const [zone, setZone] = useState('')
  const [loading, setLoading] = useState(false)
  const [mesPublicites, setMesPublicites] = useState<any[]>([])
  const [onglet, setOnglet] = useState<'publier' | 'mes-publicites'>('publier')
  const [showPayment, setShowPayment] = useState(false)
  const [payingId, setPayingId] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    const user = getSessionUser()
    if (!user) { navigate('/login'); return }

    Promise.all([
      fetch(`${API}/api/publicites/prix`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.success) { setPrix(d.prix); setZone(d.zone); } }),
      chargerMesPublicites(),
    ])
  }, [])

  async function chargerMesPublicites() {
    try {
      const r = await fetch(`${API}/api/publicites/mes-publicites`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (d.success) setMesPublicites(d.publicites)
    } catch { /* non bloquant */ }
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')

    if (!image) return setErreur('Choisissez une image pour votre publicité.')

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', image)

      const r = await fetch(`${API}/api/publicites/soumettre`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const d = await r.json()
      if (!d.success) { setErreur(d.message || 'Erreur.'); return }

      setImage(null)
      if (fileRef.current) fileRef.current.value = ''
      alert('Publicité envoyée ! Un administrateur va l\'examiner avant que vous puissiez payer.')
      setOnglet('mes-publicites')
      chargerMesPublicites()
    } catch {
      setErreur('Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  async function retirerPublicite(id: string) {
    if (!confirm('Retirer cette publicité ?')) return
    await fetch(`${API}/api/publicites/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    chargerMesPublicites()
  }

  const fmt = (n: number) => n.toLocaleString('fr-GN') + ' GNF'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-GN', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">←</button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="font-bold text-gray-800">Publicité</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Onglets */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          {([
            { id: 'publier',        label: '➕ Proposer une publicité' },
            { id: 'mes-publicites', label: '📋 Mes publicités' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setOnglet(t.id)}
              className={`flex-1 py-3 text-sm font-bold transition-all ${onglet === t.id ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ONGLET PUBLIER ── */}
        {onglet === 'publier' && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-emerald-900">Prix de publication</p>
                {prix !== null && (
                  <span className="text-2xl font-black text-emerald-700">{fmt(prix)}<span className="text-sm font-semibold">/mois</span></span>
                )}
              </div>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Votre publicité défile sur la page Famille</li>
                <li>• Un administrateur examine d'abord votre image</li>
                <li>• Une fois approuvée, vous payez pour la mettre en ligne 30 jours</li>
                {zone === 'hors_afrique' && <li className="text-amber-700">• Tarif international appliqué</li>}
              </ul>
            </div>

            <form onSubmit={soumettre} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Image de la publicité *</label>
                <input ref={fileRef} type="file" accept="image/*"
                  onChange={e => setImage(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:text-white file:font-semibold file:text-sm" />
                {image && (
                  <img src={URL.createObjectURL(image)} alt="Aperçu" className="mt-3 w-full max-h-48 object-cover rounded-xl border border-gray-200" />
                )}
              </div>

              {erreur && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-semibold">
                  ⚠️ {erreur}
                </div>
              )}

              <button type="submit" disabled={loading || !image}
                className="w-full py-3.5 rounded-xl font-black text-white text-sm disabled:opacity-50 transition-all bg-emerald-600 hover:bg-emerald-700">
                {loading ? '⏳ Envoi en cours...' : '📤 Envoyer pour approbation'}
              </button>
            </form>
          </>
        )}

        {/* ── ONGLET MES PUBLICITÉS ── */}
        {onglet === 'mes-publicites' && (
          <div className="space-y-3">
            {mesPublicites.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                <p className="text-3xl mb-3">📭</p>
                <p className="font-semibold">Vous n'avez pas encore proposé de publicité.</p>
                <button onClick={() => setOnglet('publier')}
                  className="mt-4 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">
                  Proposer ma première publicité
                </button>
              </div>
            ) : mesPublicites.map(p => {
              const enLigne = p.en_ligne === true || p.en_ligne === 't'
              const statutInfo = STATUT_INFO[p.statut] || STATUT_INFO.en_attente
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <img src={`${API}${p.image_url}`} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${enLigne ? 'bg-green-100 text-green-700' : statutInfo.bg + ' ' + statutInfo.text}`}>
                        {enLigne ? '🟢 En ligne' : statutInfo.label}
                      </span>
                      {p.statut === 'refuse' && p.raison_refus && (
                        <p className="text-xs text-red-500 mt-1">Raison : {p.raison_refus}</p>
                      )}
                      {enLigne && p.expire_le && (
                        <p className="text-xs text-gray-400 mt-1">Expire le {fmtDate(p.expire_le)}</p>
                      )}
                      <div className="flex gap-3 mt-2">
                        {p.statut === 'approuve' && !enLigne && (
                          <button
                            onClick={() => { setPayingId(p.id); setShowPayment(true) }}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg"
                          >
                            💳 Payer et publier
                          </button>
                        )}
                        {enLigne && (
                          <button onClick={() => retirerPublicite(p.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold">
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showPayment && prix && payingId && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false)
            alert('Paiement confirmé ! Votre publicité est maintenant en ligne.')
            setOnglet('mes-publicites')
            chargerMesPublicites()
          }}
          amount={prix}
          currency="GNF"
          purpose="publication_pub"
          relatedId={payingId}
          description="Publication publicité — page Famille"
        />
      )}
    </div>
  )
}
