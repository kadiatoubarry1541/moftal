import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessionUser } from '../utils/auth'
import PaymentModal from '../components/PaymentModal'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '')

const NIVEAUX = [
  { value: 'tous',          label: 'Tous niveaux' },
  { value: 'debutant',      label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance',        label: 'Avancé' },
]

const DUREES = [
  { jours: 7,  label: '1 semaine' },
  { jours: 14, label: '2 semaines' },
  { jours: 21, label: '3 semaines' },
  { jours: 30, label: '1 mois (maximum)' },
]

export default function PublierFormation() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [prix, setPrix] = useState<number | null>(null)
  const [zone, setZone] = useState('')
  const [loading, setLoading] = useState(false)
  const [mesAnnonces, setMesAnnonces] = useState<any[]>([])
  const [onglet, setOnglet] = useState<'publier' | 'mes-annonces'>('publier')
  const [showPayment, setShowPayment] = useState(false)
  const [annonceId, setAnnonceId] = useState('')

  const [form, setForm] = useState({
    titre:       '',
    description: '',
    matiere:     '',
    niveau:      'tous',
    lieu:        '',
    dateDebut:   '',
    nbPlaces:    '',
    prixInfo:    '',
    contact:     '',
    dureejours:  7,
  })

  const [erreur, setErreur] = useState('')

  useEffect(() => {
    const user = getSessionUser()
    if (!user) { navigate('/login'); return }

    // Charger les prix et mes annonces
    Promise.all([
      fetch(`${API}/api/formations/prix`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.success) { setPrix(d.prix); setZone(d.zone); } }),
      chargerMesAnnonces(),
    ])
  }, [])

  async function chargerMesAnnonces() {
    try {
      const r = await fetch(`${API}/api/formations/mes-annonces`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (d.success) setMesAnnonces(d.annonces)
    } catch { /* non bloquant */ }
  }

  async function publier(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')

    if (!form.titre.trim()) return setErreur('Le titre est requis.')
    if (!form.contact.trim()) return setErreur('Votre contact (téléphone ou email) est requis pour que les apprenants vous trouvent.')

    setLoading(true)
    try {
      // Étape 1 : préparer l'annonce (en attente de paiement)
      const r1 = await fetch(`${API}/api/formations/preparer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      })
      const d1 = await r1.json()
      if (!d1.success) { setErreur(d1.message || 'Erreur.'); return; }

      // Étape 2 : paiement — l'annonce reste en attente jusqu'à confirmation
      setAnnonceId(d1.annonceId)
      setShowPayment(true)
    } catch {
      setErreur('Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  async function supprimerAnnonce(id: string) {
    if (!confirm('Supprimer cette annonce ?')) return
    await fetch(`${API}/api/formations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    chargerMesAnnonces()
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
          <h1 className="font-bold text-gray-800">Publications Formation</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Onglets */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          {([
            { id: 'publier',      label: '➕ Publier une formation' },
            { id: 'mes-annonces', label: '📋 Mes annonces' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setOnglet(t.id)}
              className={`flex-1 py-3 text-sm font-bold transition-all ${onglet === t.id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ONGLET PUBLIER ── */}
        {onglet === 'publier' && (
          <>
            {/* Prix et règle */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-indigo-900">Prix de publication</p>
                {prix !== null && (
                  <span className="text-2xl font-black text-indigo-700">{fmt(prix)}</span>
                )}
              </div>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• Votre annonce est visible sur la page Éducation</li>
                <li>• Les apprenants vous contactent <strong>directement</strong></li>
                <li>• Les paiements se font <strong>entre vous et l'apprenant</strong></li>
                <li>• Durée : <strong>1 semaine à 1 mois</strong> selon votre choix</li>
                {zone === 'hors_afrique' && <li className="text-amber-700">• Tarif international appliqué</li>}
              </ul>
            </div>

            {/* Formulaire */}
            <form onSubmit={publier} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Titre de la formation *</label>
                <input type="text" required value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })}
                  placeholder="Ex: Cours de comptabilité pour entrepreneurs"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Matière / Domaine</label>
                  <input type="text" value={form.matiere}
                    onChange={e => setForm({ ...form, matiere: e.target.value })}
                    placeholder="Ex: Maths, Français, Informatique..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Niveau</label>
                  <select value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Décrivez la formation, le programme, ce que les apprenants vont apprendre..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lieu</label>
                  <input type="text" value={form.lieu}
                    onChange={e => setForm({ ...form, lieu: e.target.value })}
                    placeholder="Ex: En ligne, Conakry, Kindia..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date de début</label>
                  <input type="date" value={form.dateDebut}
                    onChange={e => setForm({ ...form, dateDebut: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de places</label>
                  <input type="number" min="0" value={form.nbPlaces}
                    onChange={e => setForm({ ...form, nbPlaces: e.target.value })}
                    placeholder="0 = illimité"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Votre tarif (info)</label>
                  <input type="text" value={form.prixInfo}
                    onChange={e => setForm({ ...form, prixInfo: e.target.value })}
                    placeholder="Ex: 150 000 GNF / mois"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Votre contact pour les apprenants *
                </label>
                <input type="text" required value={form.contact}
                  onChange={e => setForm({ ...form, contact: e.target.value })}
                  placeholder="Téléphone, WhatsApp, email... — les apprenants vous contacteront directement"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <p className="text-xs text-gray-400 mt-1">Les apprenants vous paient directement — la plateforme n'intervient pas</p>
              </div>

              {/* Durée de publication */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Durée de publication
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DUREES.map(d => (
                    <button key={d.jours} type="button"
                      onClick={() => setForm({ ...form, dureejours: d.jours })}
                      className={`py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        form.dureejours === d.jours
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Votre annonce disparaîtra automatiquement le{' '}
                  <strong>{new Date(Date.now() + form.dureejours * 86400000).toLocaleDateString('fr-GN', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                </p>
              </div>

              {erreur && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-semibold">
                  ⚠️ {erreur}
                </div>
              )}

              <button type="submit" disabled={loading || !prix}
                className="w-full py-3.5 rounded-xl font-black text-white text-sm disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#1e3a5f)' }}>
                {loading
                  ? '⏳ Redirection vers le paiement...'
                  : `💳 Publier ma formation — ${prix ? fmt(prix) : '...'}`}
              </button>
            </form>
          </>
        )}

        {/* ── ONGLET MES ANNONCES ── */}
        {onglet === 'mes-annonces' && (
          <div className="space-y-3">
            {mesAnnonces.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                <p className="text-3xl mb-3">📭</p>
                <p className="font-semibold">Vous n'avez pas encore publié de formation.</p>
                <button onClick={() => setOnglet('publier')}
                  className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">
                  Publier ma première formation
                </button>
              </div>
            ) : mesAnnonces.map(a => {
              const enLigne = a.en_ligne === true || a.en_ligne === 't'
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${enLigne ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {enLigne ? '🟢 En ligne' : '⚪ Expirée'}
                        </span>
                        {a.niveau && a.niveau !== 'tous' && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{a.niveau}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm">{a.titre}</h3>
                      {a.matiere && <p className="text-xs text-gray-500 mt-0.5">{a.matiere}</p>}
                      {a.lieu && <p className="text-xs text-gray-400">📍 {a.lieu}</p>}
                      {a.prix_info && <p className="text-xs text-indigo-600 font-semibold mt-1">💰 {a.prix_info}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        Expire le {fmtDate(a.expire_le)}
                      </p>
                    </div>
                    {enLigne && (
                      <button onClick={() => supprimerAnnonce(a.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex-shrink-0">
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showPayment && prix && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false)
            alert('Paiement confirmé ! Votre formation est maintenant publiée.')
            setOnglet('mes-annonces')
            chargerMesAnnonces()
          }}
          amount={prix}
          currency="GNF"
          purpose="publication_formation"
          relatedId={annonceId}
          description={`Publication formation : ${form.titre}`}
        />
      )}
    </div>
  )
}
