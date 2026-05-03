import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '')

interface GalleryItem {
  id: string
  url: string
  type: 'image' | 'video'
  album: AlbumKey
  uploaderName: string
  uploaderNumeroH: string
  created_at: string
}

type AlbumKey = 'rencontre' | 'bapteme' | 'mariage' | 'deces'

const ALBUMS = [
  {
    key: 'rencontre' as AlbumKey,
    label: 'Rencontre',
    emoji: '💑',
    gradient: 'from-indigo-600 to-purple-600',
    activeBg: 'bg-indigo-600',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  {
    key: 'bapteme' as AlbumKey,
    label: 'Baptême',
    emoji: '👶',
    gradient: 'from-sky-500 to-blue-600',
    activeBg: 'bg-sky-600',
    badge: 'bg-sky-100 text-sky-800',
  },
  {
    key: 'mariage' as AlbumKey,
    label: 'Mariage',
    emoji: '💍',
    gradient: 'from-amber-500 to-yellow-500',
    activeBg: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'deces' as AlbumKey,
    label: 'Deuil',
    emoji: '🕊️',
    gradient: 'from-slate-500 to-gray-600',
    activeBg: 'bg-slate-600',
    badge: 'bg-slate-100 text-slate-700',
  },
]

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function isVideo(item: GalleryItem) {
  return item.type === 'video' || item.url?.includes('video')
}

export default function GalerieFamily() {
  const navigate = useNavigate()
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAlbum, setActiveAlbum] = useState<AlbumKey | 'all'>('all')
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadAlbum, setUploadAlbum] = useState<AlbumKey>('rencontre')
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [quota, setQuota] = useState<{
    photosLibres: number; videosLibres: number
    photosUtilisees: number; videosUtilisees: number
    photosRestantes: number; videosRestantes: number
  } | null>(null)
  const [points, setPoints] = useState<number>(0)

  const token = localStorage.getItem('token')
  const sessionRaw = localStorage.getItem('session_user')
  const session = sessionRaw ? JSON.parse(sessionRaw) : {}
  const currentUser = session.userData || session
  const myNumeroH = currentUser?.numeroH

  const loadGallery = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [galRes, quotaRes] = await Promise.all([
        fetch(`${API_BASE}/api/family/shared-gallery`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/quotas/family`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (!galRes.ok) throw new Error('Erreur chargement galerie')
      const galData = await galRes.json()
      setItems(galData.items || [])
      if (quotaRes.ok) {
        const qData = await quotaRes.json()
        if (qData.success && qData.quota) setQuota(qData.quota)
        if (qData.success && qData.points) setPoints(qData.points.disponibles || 0)
      }
    } catch {
      setError('Impossible de charger la galerie. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    loadGallery()
  }, [token, loadGallery, navigate])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIdx === null) return
      if (e.key === 'Escape') { setLightboxIdx(null); setDeleteConfirmId(null) }
      if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null ? Math.min(i + 1, filtered.length - 1) : null)
      if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null ? Math.max(i - 1, 0) : null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const filtered = activeAlbum === 'all' ? items : items.filter(i => i.album === activeAlbum)

  const handleUpload = async (file: File) => {
    if (!token || !file) return
    setUploading(true)
    setError(null)
    try {
      let videoDuration = 0
      if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file)
        const v = document.createElement('video')
        v.preload = 'metadata'
        videoDuration = await new Promise<number>((resolve, reject) => {
          v.onloadedmetadata = () => resolve(v.duration || 0)
          v.onerror = () => reject(new Error('Impossible de lire la vidéo'))
          v.src = url
        }).finally(() => URL.revokeObjectURL(url))
        if (videoDuration > 30) {
          setError('La vidéo est trop longue. Maximum 30 secondes pour la galerie familiale.')
          setUploading(false)
          return
        }
      }
      const formData = new FormData()
      formData.append('media', file)
      if (videoDuration > 0) formData.append('videoDuration', String(videoDuration))
      const res = await fetch(`${API_BASE}/api/family/shared-gallery/${uploadAlbum}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (err.code === 'QUOTA_EXCEEDED') {
          throw new Error(err.message || 'Quota épuisé')
        }
        throw new Error(err.error || err.message || 'Erreur upload')
      }
      await loadGallery()
      setShowUploadPanel(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/family/shared-gallery/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(i => i.id !== id))
      setDeleteConfirmId(null)
      setLightboxIdx(null)
    } catch {
      setError('Impossible de supprimer cette photo.')
      setDeleteConfirmId(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const albumCounts = ALBUMS.map(a => ({
    ...a,
    count: items.filter(i => i.album === a.key).length,
    thumb: items.filter(i => i.album === a.key && !isVideo(i))[0]?.url || null,
  }))

  const lightboxItem = lightboxIdx !== null ? filtered[lightboxIdx] : null

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ══════════ TOPBAR ══════════ */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
              title="Retour"
            >
              ←
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-xl">🖼️</span>
              <h1 className="text-base font-bold text-gray-800">Galerie Familiale</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
              {items.length} souvenir{items.length !== 1 ? 's' : ''}
            </span>
            {quota && (
              <Link
                to="/acheter-points"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full font-medium hover:bg-amber-100 transition-colors"
                title="Quota galerie familiale"
              >
                🪙 {quota.photosRestantes > 0 || quota.videosRestantes > 0
                  ? `${quota.photosRestantes} photo${quota.photosRestantes !== 1 ? 's' : ''} + ${quota.videosRestantes} vidéo gratuite${quota.videosRestantes !== 1 ? 's' : ''}`
                  : points > 0 ? `${points} pts` : 'Quota épuisé'}
              </Link>
            )}
            <button
              onClick={() => setShowUploadPanel(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <span className="text-base leading-none font-bold">+</span>
              Ajouter
            </button>
          </div>
        </div>
      </header>

      {/* ══════════ UPLOAD PANEL ══════════ */}
      {showUploadPanel && (
        <div className="bg-white border-b border-gray-200 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Ajouter une photo ou vidéo</h2>
              <button
                onClick={() => setShowUploadPanel(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Barre de quota */}
            {quota && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-600">Quota famille :</span>
                    <span className={`flex items-center gap-1 ${quota.photosRestantes > 0 ? 'text-green-700' : 'text-red-500'}`}>
                      📷 {quota.photosUtilisees}/{quota.photosLibres} photos gratuites
                    </span>
                    <span className={`flex items-center gap-1 ${quota.videosRestantes > 0 ? 'text-green-700' : 'text-red-500'}`}>
                      🎥 {quota.videosUtilisees}/{quota.videosLibres} vidéo gratuite
                    </span>
                    <span className="text-indigo-600 font-semibold">🪙 {points} pts disponibles</span>
                  </div>
                  {quota.photosRestantes === 0 && quota.videosRestantes === 0 && points === 0 && (
                    <Link to="/acheter-points" className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors">
                      Acheter des points →
                    </Link>
                  )}
                </div>
                {quota.photosRestantes === 0 && points > 0 && (
                  <p className="mt-1.5 text-gray-500">Photos : <strong>1 pt</strong> · Vidéo ≤10s : <strong>2 pts</strong> · ≤20s : <strong>3 pts</strong> · ≤30s : <strong>5 pts</strong></p>
                )}
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Album de destination</p>
              <div className="flex flex-wrap gap-2">
                {ALBUMS.map(a => (
                  <button
                    key={a.key}
                    onClick={() => setUploadAlbum(a.key)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      uploadAlbum === a.key
                        ? `bg-gradient-to-r ${a.gradient} text-white border-transparent shadow-sm`
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {a.emoji} {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-2">{uploading ? '⏳' : '📸'}</div>
              <p className="text-sm font-medium text-gray-600">
                {uploading ? 'Upload en cours...' : 'Glissez un fichier ici ou cliquez pour choisir'}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, MP4 · max 10 Mo · vidéo max 3 min</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                disabled={uploading}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ERROR ══════════ */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-3 w-full">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
        </div>
      )}

      {/* ══════════ BODY: SIDEBAR + GRILLE ══════════ */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex gap-6">

        {/* ── SIDEBAR (desktop) ── */}
        <aside className="w-52 flex-shrink-0 hidden sm:flex flex-col gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Albums</p>
            </div>
            {/* Tous */}
            <button
              onClick={() => setActiveAlbum('all')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                activeAlbum === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">📁</span>
              <span className="flex-1 text-left font-medium">Tous</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${activeAlbum === 'all' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {items.length}
              </span>
            </button>
            {/* Par album */}
            {albumCounts.map(a => (
              <button
                key={a.key}
                onClick={() => setActiveAlbum(activeAlbum === a.key ? 'all' : a.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-t border-gray-50 ${
                  activeAlbum === a.key ? `${a.activeBg} text-white` : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {a.thumb ? (
                  <img src={a.thumb} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0 shadow-sm" />
                ) : (
                  <span className="text-xl w-8 text-center">{a.emoji}</span>
                )}
                <span className="flex-1 text-left font-medium truncate">{a.label}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${activeAlbum === a.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {a.count}
                </span>
              </button>
            ))}
          </div>

          <Link
            to="/famille"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
          >
            👨‍👩‍👧‍👦 <span>Retour Famille</span>
          </Link>
        </aside>

        {/* ── MAIN ── */}
        <main className="flex-1 min-w-0">
          {/* Filtres mobile */}
          <div className="sm:hidden flex gap-2 overflow-x-auto pb-2 mb-4">
            <button
              onClick={() => setActiveAlbum('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeAlbum === 'all' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              Tous ({items.length})
            </button>
            {ALBUMS.map(a => (
              <button
                key={a.key}
                onClick={() => setActiveAlbum(activeAlbum === a.key ? 'all' : a.key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeAlbum === a.key ? `bg-gradient-to-r ${a.gradient} text-white border-transparent` : 'bg-white text-gray-600 border-gray-200'}`}
              >
                {a.emoji} {a.label}
              </button>
            ))}
          </div>

          {/* Titre album actif */}
          {activeAlbum !== 'all' && (() => {
            const a = ALBUMS.find(x => x.key === activeAlbum)!
            return (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{a.emoji}</span>
                <h2 className="text-lg font-bold text-gray-800">{a.label}</h2>
                <span className="text-sm text-gray-400 font-medium">
                  {filtered.length} élément{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            )
          })()}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 bg-white rounded-xl border border-gray-200">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Chargement de la galerie...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="text-6xl">📷</div>
              <p className="text-gray-500 font-medium text-base">Aucune photo dans cet album</p>
              <p className="text-gray-400 text-sm">Commencez par ajouter votre premier souvenir</p>
              <button
                onClick={() => setShowUploadPanel(true)}
                className="mt-1 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
              >
                + Ajouter une photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((item, idx) => {
                const albumCfg = ALBUMS.find(a => a.key === item.album) || ALBUMS[0]
                return (
                  <div
                    key={item.id}
                    className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 hover:border-gray-400 aspect-square bg-gray-900"
                    onClick={() => setLightboxIdx(idx)}
                  >
                    {isVideo(item) ? (
                      <>
                        <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-70" muted playsInline />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-xl ml-0.5">▶</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={item.url}
                        alt={`Photo ${albumCfg.label}`}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}

                    {/* Badge album */}
                    <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${albumCfg.badge} shadow-sm`}>
                      {albumCfg.emoji} {albumCfg.label}
                    </div>

                    {/* Badge vidéo */}
                    {isVideo(item) && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs font-bold rounded-full">
                        VIDÉO
                      </div>
                    )}

                    {/* Overlay info — aucun bouton supprimer ici */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                      <p className="text-white text-xs font-semibold truncate">{item.uploaderName}</p>
                      <p className="text-white/60 text-xs">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* ══════════ LIGHTBOX ══════════ */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => { setLightboxIdx(null); setDeleteConfirmId(null) }}
        >
          {/* Bouton fermer */}
          <button
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white text-base transition-all z-20"
            onClick={() => { setLightboxIdx(null); setDeleteConfirmId(null) }}
            title="Fermer"
          >
            ✕
          </button>

          {/* Navigation gauche */}
          {lightboxIdx! > 0 && (
            <button
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white text-2xl transition-all z-10"
              onClick={e => { e.stopPropagation(); setDeleteConfirmId(null); setLightboxIdx(i => i! - 1) }}
            >
              ‹
            </button>
          )}

          {/* Contenu */}
          <div
            className="relative max-w-4xl w-full mx-4 sm:mx-16"
            onClick={e => e.stopPropagation()}
          >
            {isVideo(lightboxItem) ? (
              <video
                src={lightboxItem.url}
                controls
                autoPlay
                className="w-full max-h-[72vh] rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <img
                src={lightboxItem.url}
                alt=""
                className="w-full max-h-[72vh] rounded-xl object-contain shadow-2xl"
              />
            )}

            {/* Barre d'info */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-white font-semibold text-sm">{lightboxItem.uploaderName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {(() => {
                    const a = ALBUMS.find(x => x.key === lightboxItem.album) || ALBUMS[0]
                    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.badge}`}>{a.emoji} {a.label}</span>
                  })()}
                  <span className="text-white/50 text-xs">{formatDate(lightboxItem.created_at)}</span>
                </div>
              </div>
              <span className="text-white/40 text-xs font-medium self-start sm:self-center">{lightboxIdx! + 1} / {filtered.length}</span>
            </div>

            {/* ══ ZONE SUPPRESSION — entièrement séparée ══ */}
            {lightboxItem.uploaderNumeroH === myNumeroH && (
              <div className="mt-4 pt-4 border-t border-white/10">
                {deleteConfirmId === lightboxItem.id ? (
                  /* Étape 2 : confirmation explicite */
                  <div className="bg-red-950/90 border border-red-600 rounded-2xl p-4 flex flex-col items-center gap-3">
                    <p className="text-red-200 text-sm font-bold text-center">⚠️ Supprimer définitivement cette photo ?</p>
                    <p className="text-red-300/60 text-xs text-center">Cette action est irréversible. La photo sera perdue pour toute la famille.</p>
                    <div className="flex gap-3 mt-1">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleDelete(lightboxItem.id)}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg"
                      >
                        Oui, supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Étape 1 : bouton discret tout en bas */
                  <button
                    onClick={() => setDeleteConfirmId(lightboxItem.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-white/30 hover:text-red-400 text-xs font-medium rounded-xl border border-white/8 hover:border-red-500/40 hover:bg-red-600/10 transition-all"
                  >
                    🗑️ Supprimer cette photo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Navigation droite */}
          {lightboxIdx! < filtered.length - 1 && (
            <button
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white text-2xl transition-all z-10"
              onClick={e => { e.stopPropagation(); setDeleteConfirmId(null); setLightboxIdx(i => i! + 1) }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}
