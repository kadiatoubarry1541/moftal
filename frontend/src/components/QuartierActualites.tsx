import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'
const MAX_VIDEO_SECONDS = 5

// "Sécurité" en premier et mis en avant en rouge — une alerte doit se voir
// immédiatement, avant les autres catégories d'actualités.
const DOMAINES_MAP: Record<string, { emoji: string; color: string }> = {
  securite: { emoji: '🚨', color: '#dc2626' },
  sante:    { emoji: '🏥', color: '#1a8f1a' },
  autre:    { emoji: '📰', color: '#475569' },
}

const DOMAINES_OPTIONS = [
  { id: 'securite', label: 'Alerte sécurité', emoji: '🚨' },
  { id: 'sante',    label: 'Santé',           emoji: '🏥' },
  { id: 'autre',    label: 'Autre',           emoji: '📰' },
]

interface Actualite {
  id: string
  titre: string
  content: string
  domaine?: string
  numeroH: string
  authorName?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  createdAt?: string
  created_at?: string
}

interface Publisher {
  id: string
  numeroH: string
  name?: string
  role?: string
}

interface Props {
  scope: string
  location: string
  locationName: string
  isJournalist: boolean
  isAdmin: boolean
}

function getMyNumeroH(): string | null {
  try {
    const parsed = JSON.parse(localStorage.getItem('session_user') || '{}')
    return (parsed.userData || parsed)?.numeroH || null
  } catch { return null }
}

export function QuartierActualites({ scope, location, locationName, isJournalist, isAdmin }: Props) {
  const canPublish = isJournalist || isAdmin
  const myNumeroH = getMyNumeroH()
  const [canPublishActu, setCanPublishActu] = useState(canPublish)
  const [showPublishers, setShowPublishers] = useState(false)
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [newPublisher, setNewPublisher] = useState({ numeroH: '', name: '', role: 'chef' })

  const [actualites, setActualites] = useState<Actualite[]>([])
  const [loadingActu, setLoadingActu] = useState(true)
  const [showActuForm, setShowActuForm] = useState(false)
  const [actuForm, setActuForm] = useState({ titre: '', content: '', domaine: '' })
  const [actuLoading, setActuLoading] = useState(false)
  const [actuMediaFile, setActuMediaFile] = useState<File | null>(null)
  const [actuMediaPreview, setActuMediaPreview] = useState<string | null>(null)
  const [actuMediaType, setActuMediaType] = useState<'image' | 'video' | null>(null)
  const actuMediaInputRef = useRef<HTMLInputElement>(null)

  const token = () => localStorage.getItem('token')
  const api = (path: string) => `${API_BASE}/api/developpement${path}`
  const qs = `scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`

  const loadActualites = async () => {
    setLoadingActu(true)
    try {
      const res = await fetch(api(`/actualites?${qs}`), { headers: { Authorization: `Bearer ${token()}` } })
      if (res.ok) {
        const d = await res.json()
        const list: Actualite[] = d.actualites || []
        // Les alertes sécurité remontent toujours en premier, quelle que soit leur date.
        list.sort((a, b) => {
          const aSec = a.domaine === 'securite' ? 1 : 0
          const bSec = b.domaine === 'securite' ? 1 : 0
          if (aSec !== bSec) return bSec - aSec
          return 0
        })
        setActualites(list)
      }
    } catch {
      // non bloquant
    } finally {
      setLoadingActu(false)
    }
  }

  const checkCanPublishActu = async () => {
    if (canPublish) { setCanPublishActu(true); return }
    try {
      const res = await fetch(api(`/actualites/can-publish?${qs}`), { headers: { Authorization: `Bearer ${token()}` } })
      if (res.ok) { const d = await res.json(); setCanPublishActu(!!d.canPublish) }
    } catch {
      // non bloquant
    }
  }

  useEffect(() => {
    loadActualites()
    checkCanPublishActu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, location])

  const loadPublishers = async () => {
    try {
      const res = await fetch(api(`/publishers?${qs}`), { headers: { Authorization: `Bearer ${token()}` } })
      if (res.ok) { const d = await res.json(); setPublishers(d.publishers || []) }
    } catch {
      // non bloquant
    }
  }

  const addPublisher = async () => {
    if (!newPublisher.numeroH.trim()) return
    try {
      const res = await fetch(api('/publishers'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPublisher, scope, location }),
      })
      const d = await res.json()
      if (d.success) {
        setNewPublisher({ numeroH: '', name: '', role: 'chef' })
        loadPublishers()
      } else {
        alert(d.message || 'Erreur.')
      }
    } catch {
      alert('Erreur.')
    }
  }

  const removePublisher = async (id: string) => {
    try {
      await fetch(api(`/publishers/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
      loadPublishers()
    } catch {
      // non bloquant
    }
  }

  const removeActuMedia = () => {
    if (actuMediaPreview) URL.revokeObjectURL(actuMediaPreview)
    setActuMediaFile(null)
    setActuMediaPreview(null)
    setActuMediaType(null)
    if (actuMediaInputRef.current) actuMediaInputRef.current.value = ''
  }

  const handleActuMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Seules les images et vidéos sont autorisées.')
      e.target.value = ''
      return
    }
    const url = URL.createObjectURL(file)
    if (file.type.startsWith('video/')) {
      const videoEl = document.createElement('video')
      videoEl.preload = 'metadata'
      videoEl.onloadedmetadata = () => {
        if (videoEl.duration > MAX_VIDEO_SECONDS + 0.5) {
          alert(`Vidéo trop longue : ${Math.round(videoEl.duration)} secondes.\nMaximum autorisé : ${MAX_VIDEO_SECONDS} secondes.`)
          URL.revokeObjectURL(url)
          e.target.value = ''
          return
        }
        setActuMediaFile(file)
        setActuMediaPreview(url)
        setActuMediaType('video')
      }
      videoEl.onerror = () => {
        alert('Impossible de lire cette vidéo.')
        URL.revokeObjectURL(url)
      }
      videoEl.src = url
    } else {
      setActuMediaFile(file)
      setActuMediaPreview(url)
      setActuMediaType('image')
    }
  }

  const publierActualite = async () => {
    if (!actuForm.titre.trim() || !actuForm.content.trim()) return
    setActuLoading(true)
    try {
      const formData = new FormData()
      formData.append('titre', actuForm.titre)
      formData.append('content', actuForm.content)
      formData.append('domaine', actuForm.domaine)
      formData.append('scope', scope)
      formData.append('location', location)
      if (actuMediaFile) formData.append('media', actuMediaFile)
      const res = await fetch(api('/actualites'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      })
      if (res.ok) {
        setShowActuForm(false)
        setActuForm({ titre: '', content: '', domaine: '' })
        removeActuMedia()
        loadActualites()
      } else {
        const e = await res.json().catch(() => ({}))
        alert(e.message || 'Erreur lors de la publication')
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setActuLoading(false)
    }
  }

  const supprimerActualite = async (id: string) => {
    if (!confirm('Supprimer cette actualité ?')) return
    await fetch(api(`/actualites/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    loadActualites()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {canPublishActu && (
          <button
            onClick={() => setShowActuForm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition-colors"
          >
            ✚ Publier une actualité
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => { setShowPublishers(true); loadPublishers() }}
            className="flex-shrink-0 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition-colors"
          >
            👥 Autorisations
          </button>
        )}
      </div>

      {loadingActu ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" /></div>
      ) : actualites.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-2">📰</div>
          <p className="text-gray-500 text-sm font-medium">Aucune actualité publiée</p>
          {canPublishActu && <p className="text-gray-400 text-xs mt-1">Publiez la première actualité de {locationName}</p>}
          {!canPublishActu && <p className="text-gray-400 text-xs mt-1">Les responsables autorisés publient les informations du quartier ici</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {actualites.map(actu => {
            const dom = DOMAINES_MAP[actu.domaine || ''] || null
            const isSecurite = actu.domaine === 'securite'
            return (
              <div key={actu.id} className={`bg-white rounded-xl border overflow-hidden shadow-sm ${isSecurite ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`}>
                {actu.mediaUrl && (
                  actu.mediaType === 'video' ? (
                    <video src={actu.mediaUrl} controls className="w-full h-40 object-cover bg-black" />
                  ) : (
                    <img src={actu.mediaUrl} alt={actu.titre} className="w-full h-40 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  )
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {dom && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: dom.color + '20', color: dom.color }}>
                          {dom.emoji} {DOMAINES_OPTIONS.find(d => d.id === actu.domaine)?.label}
                        </span>
                      )}
                    </div>
                    {(canPublish || actu.numeroH === myNumeroH) && (
                      <button onClick={() => supprimerActualite(actu.id)} className="text-red-400 hover:text-red-600 text-xs flex-shrink-0">✕</button>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5">{actu.titre}</h3>
                  <p className="text-gray-600 text-xs leading-relaxed">{actu.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">✍️ {actu.authorName}</span>
                    <span className="text-xs text-gray-400">{new Date(actu.createdAt || actu.created_at || '').toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL : Gérer les autorisations (admin uniquement) ───────────── */}
      {showPublishers && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">👥 Autorisés à publier — {locationName}</h2>
              <button onClick={() => setShowPublishers(false)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-xs text-gray-500">Ajoute ici les chefs ou correspondants que tu autorises à publier des actualités et des alertes pour ce quartier.</p>
              <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                <input
                  type="text"
                  value={newPublisher.numeroH}
                  onChange={(e) => setNewPublisher({ ...newPublisher, numeroH: e.target.value })}
                  placeholder="NuméroH"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <input
                  type="text"
                  value={newPublisher.name}
                  onChange={(e) => setNewPublisher({ ...newPublisher, name: e.target.value })}
                  placeholder="Nom (optionnel)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <select
                  value={newPublisher.role}
                  onChange={(e) => setNewPublisher({ ...newPublisher, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <option value="chef">Chef de quartier</option>
                  <option value="correspondant">Correspondant</option>
                  <option value="autre">Autre</option>
                </select>
                <button onClick={addPublisher} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition-colors">
                  + Autoriser
                </button>
              </div>
              <div className="space-y-2">
                {publishers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Personne d'autre autorisé pour l'instant</p>
                ) : publishers.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{p.name || p.numeroH}</p>
                      <p className="text-xs text-gray-500">{p.numeroH} · {p.role || 'autorisé'}</p>
                    </div>
                    <button onClick={() => removePublisher(p.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Publier actualité ────────────────────────────────────── */}
      {showActuForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-5">
              <h2 className="text-lg font-bold text-white">📰 Publier une actualité</h2>
              <p className="text-blue-100 text-xs mt-1">{locationName}</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={actuForm.titre}
                  onChange={e => setActuForm({ ...actuForm, titre: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Titre de l'actualité..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contenu *</label>
                <textarea
                  value={actuForm.content}
                  onChange={e => setActuForm({ ...actuForm, content: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="Décrivez l'actualité..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catégorie</label>
                <select
                  value={actuForm.domaine}
                  onChange={e => setActuForm({ ...actuForm, domaine: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">— Choisir une catégorie —</option>
                  {DOMAINES_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Photo ou vidéo (optionnel)</label>
                {actuMediaPreview ? (
                  <div className="relative">
                    {actuMediaType === 'video' ? (
                      <video src={actuMediaPreview} controls className="w-full max-h-48 rounded-xl bg-black" />
                    ) : (
                      <img src={actuMediaPreview} alt="Aperçu" className="w-full max-h-48 object-contain rounded-xl" />
                    )}
                    <button
                      onClick={removeActuMedia}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => actuMediaInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    📷 Ajouter une photo ou une vidéo (5s max)
                  </button>
                )}
                <input
                  ref={actuMediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleActuMediaSelect}
                  className="hidden"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => { setShowActuForm(false); removeActuMedia() }} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors">Annuler</button>
              <button
                onClick={publierActualite}
                disabled={actuLoading || !actuForm.titre.trim() || !actuForm.content.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {actuLoading ? 'Publication...' : '📰 Publier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
