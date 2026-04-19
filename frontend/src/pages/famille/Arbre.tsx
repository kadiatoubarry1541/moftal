import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArbreGenealogique } from '../../components/ArbreGenealogique'
import { buildFamilyTree, getCercleDesRacinesCounts } from '../../services/FamilyTreeBuilder'
import { useI18n } from '../../i18n/useI18n'

interface UserData {
  numeroH: string
  prenom: string
  nomFamille: string
  genre: 'HOMME' | 'FEMME' | 'AUTRE'
  [key: string]: any
}

interface PartnerInfo {
  numeroH: string
  prenom: string
  nomFamille: string
  genre?: 'HOMME' | 'FEMME' | 'AUTRE'
  photo?: string
}

interface ParentLinkInfo {
  id: string
  parentNumeroH: string
  childNumeroH: string
  parentType: 'pere' | 'mere'
  parent?: {
    numeroH: string
    prenom: string
    nomFamille: string
    photo?: string
    genre?: 'HOMME' | 'FEMME' | 'AUTRE'
  }
}

interface FamilyMessage {
  id: string
  numeroH: string
  authorName?: string
  content: string
  messageType?: 'text' | 'image' | 'video' | 'audio'
  mediaUrl?: string | null
  created_at?: string
  createdAt?: string
  familyName?: string
}

interface GalleryItem {
  id: string
  familyName: string
  uploaderNumeroH: string
  uploaderName: string
  album: string
  url: string
  type: 'image' | 'video'
  created_at: string
}

export default function Arbre() {
  const [user, setUser] = useState<UserData | null>(null)
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [parentsLinks, setParentsLinks] = useState<ParentLinkInfo[]>([])
  const [activeTab, setActiveTab] = useState<'arbre' | 'arbre-conjoint' | 'echanges'>('echanges')
  const { t } = useI18n()

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

  // Messagerie familiale (style WhatsApp)
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Galerie famille partagée
  const [showGallery, setShowGallery] = useState(false)
  const [sharedItems, setSharedItems] = useState<GalleryItem[]>([])
  const [sharedLoading, setSharedLoading] = useState(false)
  const [activeAlbum, setActiveAlbum] = useState('rencontre')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewerMedia, setViewerMedia] = useState<GalleryItem | null>(null)
  const [galleryView, setGalleryView] = useState<'list' | 'detail'>('list')

  // Personnes masquées dans mon arbre (je ne les vois plus)
  const [treeHidden, setTreeHidden] = useState<string[]>([])

useEffect(() => {
  const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
  const u = sessionData.userData || sessionData
  if (u?.numeroH) setUser(u)
}, [])

useEffect(() => {
  const loadTreeHidden = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/me/tree-hidden`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.treeHidden)) setTreeHidden(data.treeHidden)
      }
    } catch {
      // ignore
    }
  }
  loadTreeHidden()
}, [API_BASE])

useEffect(() => {
  const loadPartnerAndParents = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const [partnerRes, parentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/couple/my-partner`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE}/api/parent-child/my-parents`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ])

      if (partnerRes.ok) {
        const data = await partnerRes.json()
        if (data.success && data.partner) {
          setPartner({
            numeroH: data.partner.numeroH,
            prenom: data.partner.prenom,
            nomFamille: data.partner.nomFamille,
            genre: (data.partner.genre || 'AUTRE') as PartnerInfo['genre'],
            photo: data.partner.photo
          })
        } else {
          setPartner(null)
        }
      }

      if (parentsRes.ok) {
        const data = await parentsRes.json()
        if (data.success && Array.isArray(data.parents)) {
          setParentsLinks(
            data.parents.map((p: any) => ({
              id: p.id,
              parentNumeroH: p.parentNumeroH,
              childNumeroH: p.childNumeroH,
              parentType: p.parentType,
              parent: p.parent
                ? {
                    numeroH: p.parent.numeroH,
                    prenom: p.parent.prenom,
                    nomFamille: p.parent.nomFamille,
                    photo: p.parent.photo,
                    genre: p.parent.genre
                  }
                : undefined
            }))
          )
        } else {
          setParentsLinks([])
        }
      }
    } catch {
      // Erreur réseau : ne pas bloquer l'affichage de l'arbre
    }
  }

  loadPartnerAndParents()
}, [API_BASE])

  useEffect(() => {
    if (activeTab === 'echanges') {
      loadFamilyMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const effectiveUser: UserData = user || {
    numeroH: '',
    prenom: 'Invité',
    nomFamille: '',
    genre: 'HOMME'
  }

const enhancedUser: UserData = useMemo(() => {
  let base: UserData = { ...effectiveUser }

  // Conjoint(e) lié(e)
  if (partner) {
    base = {
      ...base,
      conjointPrenom: partner.prenom,
      conjointNumeroH: partner.numeroH,
      conjointNomFamille: partner.nomFamille,
      conjointGenre: partner.genre,
      conjointPhoto: partner.photo
    }
  }

  // Parents liés (via API parent-child/my-parents)
  const pereLink = parentsLinks.find((p) => p.parentType === 'pere' && p.parent)
  const mereLink = parentsLinks.find((p) => p.parentType === 'mere' && p.parent)

  if (pereLink?.parent) {
    base = {
      ...base,
      prenomPere: pereLink.parent.prenom,
      numeroHPere: pereLink.parent.numeroH,
      famillePere: pereLink.parent.nomFamille,
      perePhoto: pereLink.parent.photo
    }
  }

  if (mereLink?.parent) {
    base = {
      ...base,
      prenomMere: mereLink.parent.prenom,
      numeroHMere: mereLink.parent.numeroH,
      familleMere: mereLink.parent.nomFamille,
      merePhoto: mereLink.parent.photo
    }
  }

  return base
}, [effectiveUser, partner, parentsLinks])

  const familyMembers = useMemo(() => buildFamilyTree(enhancedUser), [enhancedUser])
  const cercleCounts = useMemo(
    () => getCercleDesRacinesCounts(enhancedUser, familyMembers),
    [enhancedUser, familyMembers]
  )

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const loadFamilyMessages = async () => {
    try {
      setLoadingMessages(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/family-tree/messages`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // On affiche du plus ancien au plus récent
        const messages: FamilyMessage[] = (data.messages || []).slice().reverse()
        setFamilyMessages(messages)
        setTimeout(scrollToBottom, 150)
      } else {
        console.error('Erreur chargement messages familiaux:', data.message || data.error)
      }
    } catch (error) {
      console.error('Erreur chargement messages familiaux:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendFamilyMessage = async () => {
    if (!newMessage.trim() || isSending) return

    try {
      setIsSending(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/family-tree/messages`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          messageType: 'text'
        })
      })

      const data = await response.json()

      if (response.ok && data.success && data.message) {
        setFamilyMessages((prev) => [...prev, data.message])
        setNewMessage('')
        setTimeout(scrollToBottom, 100)
      } else {
        alert(data.message || 'Erreur lors de l\'envoi du message')
      }
    } catch (error: any) {
      console.error('Erreur envoi message familial:', error)
      alert(error?.message || 'Erreur lors de l\'envoi du message')
    } finally {
      setIsSending(false)
    }
  }

  const loadSharedGallery = async () => {
    try {
      setSharedLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/family/shared-gallery`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSharedItems(data.items || [])
      }
    } catch (e) {
      console.error('Erreur chargement galerie partagée:', e)
    } finally {
      setSharedLoading(false)
    }
  }

  const openGallery = () => {
    setShowGallery(true)
    loadSharedGallery()
  }

  const uploadToSharedGallery = async (file: File) => {
    try {
      setUploading(true)
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('media', file)
      const res = await fetch(`${API_BASE}/api/family/shared-gallery/${activeAlbum}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.item) {
        setSharedItems(prev => [data.item, ...prev])
      } else {
        alert(data.message || 'Erreur lors de la publication')
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteMedia = async (item: GalleryItem) => {
    await deleteFromSharedGallery(item.id)
  }

  const deleteFromSharedGallery = async (id: string) => {
    if (!confirm('Supprimer ce média ? Cette action est irréversible.')) return
    try {
      setDeletingId(id)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/family/shared-gallery/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSharedItems(prev => prev.filter(item => item.id !== id))
      } else {
        const data = await res.json()
        alert(data.message || 'Erreur lors de la suppression')
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setDeletingId(null)
    }
  }

  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url)

  // Gérer les URLs base64 (data:...), absolues (http...) et relatives (/uploads/...)
  const buildMediaUrl = (url: string) => (url.startsWith('http') || url.startsWith('data:') ? url : `${API_BASE}${url}`)

  // Rencontre en PREMIER comme demandé
  const ALBUM_CONFIG = [
    { key: 'rencontre' as const, label: 'Rencontre', emoji: '🤝' },
    { key: 'bapteme'  as const,  label: 'Baptême',   emoji: '🕊️' },
    { key: 'mariage'  as const,  label: 'Mariage',   emoji: '💍' },
    { key: 'deces'    as const,  label: 'Décès',     emoji: '🕯️' },
  ]

  const albums = useMemo(() => {
    const keys = ['rencontre', 'bapteme', 'mariage', 'deces'] as const
    const a: Record<string, GalleryItem[]> = {}
    for (const k of keys) a[k] = []
    for (const item of sharedItems) {
      const k = (item.album || 'rencontre') as string
      if (!a[k]) a[k] = []
      a[k].push(item)
    }
    return a
  }, [sharedItems])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6" />
      <div className="card">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Choisissez une zone : trois grands boutons, touchez celui que vous voulez.
        </p>
        <div
          className={`grid gap-3 mb-6 ${partner ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}
          role="tablist"
          aria-label="Arbre, messages ou galerie"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'echanges'}
            onClick={() => setActiveTab('echanges')}
            className={`min-h-[120px] rounded-2xl border-2 flex flex-col items-center justify-center gap-2 px-3 py-4 text-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 ${
              activeTab === 'echanges'
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg scale-[1.02]'
                : 'border-stone-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-emerald-400 text-gray-800 dark:text-gray-100'
            }`}
          >
            <span className="text-5xl leading-none" aria-hidden>
              💬
            </span>
            <span className="text-base font-bold leading-tight">Messages famille</span>
            <span
              className={`text-xs font-medium ${activeTab === 'echanges' ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Parler à la famille
            </span>
          </button>

          <button
            type="button"
            onClick={openGallery}
            className={`min-h-[120px] rounded-2xl border-2 flex flex-col items-center justify-center gap-2 px-3 py-4 text-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 border-stone-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-emerald-400 text-gray-800 dark:text-gray-100`}
          >
            <span className="text-5xl leading-none" aria-hidden>
              📷
            </span>
            <span className="text-base font-bold leading-tight">Galerie famille</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Photos et vidéos</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'arbre'}
            onClick={() => setActiveTab('arbre')}
            className={`min-h-[120px] rounded-2xl border-2 flex flex-col items-center justify-center gap-2 px-3 py-4 text-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 ${
              activeTab === 'arbre'
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg scale-[1.02]'
                : 'border-stone-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-emerald-400 text-gray-800 dark:text-gray-100'
            }`}
          >
            <span className="text-5xl leading-none" aria-hidden>🌳</span>
            <span className="text-base font-bold leading-tight">Mon arbre</span>
            <span className={`text-xs font-medium ${activeTab === 'arbre' ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}>
              Voir mes liens
            </span>
          </button>

          {/* Bouton arbre du conjoint — visible seulement si conjoint lié */}
          {partner && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'arbre-conjoint'}
              onClick={() => setActiveTab('arbre-conjoint')}
              className={`min-h-[120px] rounded-2xl border-2 flex flex-col items-center justify-center gap-2 px-3 py-4 text-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-400 ${
                activeTab === 'arbre-conjoint'
                  ? 'border-pink-500 bg-pink-500 text-white shadow-lg scale-[1.02]'
                  : 'border-stone-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-pink-400 text-gray-800 dark:text-gray-100'
              }`}
            >
              {partner.photo ? (
                <img
                  src={partner.photo}
                  alt={partner.prenom}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                />
              ) : (
                <span className="text-5xl leading-none" aria-hidden>💑</span>
              )}
              <span className="text-base font-bold leading-tight">
                Arbre de {partner.prenom}
              </span>
              <span className={`text-xs font-medium ${activeTab === 'arbre-conjoint' ? 'text-pink-100' : 'text-gray-500 dark:text-gray-400'}`}>
                Voir ses liens
              </span>
            </button>
          )}
        </div>

        {activeTab === 'arbre-conjoint' && partner && (
          <>
            <div className="flex items-center gap-3 mb-4">
              {partner.photo && (
                <img src={partner.photo} alt={partner.prenom} className="w-10 h-10 rounded-full object-cover border-2 border-pink-400" />
              )}
              <h2 className="text-2xl font-bold">💑 Arbre de {partner.prenom} {partner.nomFamille}</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Vous consultez l'arbre généalogique de votre conjoint(e). Votre lien apparaît dans cet arbre.
            </p>
            <ArbreGenealogique
              userData={{
                ...partner,
                genre: partner.genre || 'AUTRE',
                conjointPrenom: user?.prenom,
                conjointNumeroH: user?.numeroH,
                conjointNomFamille: user?.nomFamille,
                conjointGenre: user?.genre,
                conjointPhoto: (user as any)?.photo
              }}
              cercleCounts={cercleCounts}
              onOpenGallery={openGallery}
              treeHidden={[]}
              onTreeHiddenChange={() => {}}
            />
          </>
        )}

        {activeTab === 'arbre' && (
          <>
            <h2 className="text-2xl font-bold mb-4">🌳 Mon arbre généalogique</h2>
            <ArbreGenealogique
              userData={enhancedUser}
              cercleCounts={cercleCounts}
              onOpenGallery={openGallery}
              treeHidden={treeHidden}
              onTreeHiddenChange={async (newList) => {
                setTreeHidden(newList)
                const token = localStorage.getItem('token')
                if (!token) return
                try {
                  const res = await fetch(`${API_BASE}/api/auth/me/tree-hidden`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ treeHidden: newList })
                  })
                  if (res.ok) {
                    const data = await res.json()
                    if (data.success && Array.isArray(data.treeHidden)) setTreeHidden(data.treeHidden)
                  }
                } catch {
                  const refetch = await fetch(`${API_BASE}/api/auth/me/tree-hidden`, { headers: { Authorization: `Bearer ${token}` } })
                  if (refetch.ok) {
                    const data = await refetch.json()
                    if (data.success && Array.isArray(data.treeHidden)) setTreeHidden(data.treeHidden)
                  }
                }
              }}
            />
          </>
        )}

        {activeTab === 'echanges' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Messagerie familiale</h2>
              <p className="text-sm text-gray-500">
                Espace privé réservé aux membres de la famille{' '}
                <span className="font-semibold text-gray-700">
                  {effectiveUser.nomFamille ? `${effectiveUser.nomFamille}` : ''}
                </span>
              </p>
              <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-lg flex-shrink-0">
                  👨‍👩‍👧‍👦
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Famille {effectiveUser.nomFamille || 'ADAM'}</p>
                  <p className="text-xs text-gray-400">Discussion de groupe</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[340px] sm:h-[480px] bg-white">
                {/* Header style WhatsApp */}
                <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl">
                      👨‍👩‍👧‍👦
                    </div>
                    <div>
                      <p className="font-semibold">
                        Famille {effectiveUser.nomFamille || 'ADAM'}
                      </p>
                      <p className="text-xs text-green-100">Espace privé entre membres de la famille</p>
                    </div>
                  </div>
                </div>

                {/* Zone de messages */}
                <div className="flex-1 bg-gray-100 px-3 py-3 overflow-y-auto">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <div className="h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Chargement des messages...</span>
                      </div>
                    </div>
                  ) : familyMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500 text-sm space-y-2">
                        <p>Aucun message pour le moment.</p>
                        <p>Soyez le premier à écrire à votre famille.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {familyMessages.map((msg) => {
                        const isMe = msg.numeroH === effectiveUser.numeroH
                        const createdAt =
                          msg.createdAt || msg.created_at || new Date().toISOString()

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs sm:max-w-md px-3 py-2 rounded-2xl shadow-sm ${
                                isMe
                                  ? 'bg-green-500 text-white rounded-br-sm'
                                  : 'bg-white text-gray-900 rounded-bl-sm'
                              }`}
                            >
                              {!isMe && (
                                <p className="text-xs font-semibold mb-0.5 opacity-80">
                                  {msg.authorName || 'Membre de la famille'}
                                </p>
                              )}
                              {(msg.messageType === 'text' || !msg.messageType) && (
                                <p className="text-sm whitespace-pre-line">{msg.content}</p>
                              )}
                              {msg.mediaUrl && msg.messageType === 'image' && (
                                <img
                                  src={msg.mediaUrl}
                                  alt="Pièce jointe"
                                  className="mt-1 rounded-lg max-h-60 object-cover"
                                />
                              )}
                              {msg.mediaUrl && msg.messageType === 'video' && (
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  className="mt-1 rounded-lg max-h-60 w-full"
                                />
                              )}
                              {msg.mediaUrl && msg.messageType === 'audio' && (
                                <audio
                                  src={msg.mediaUrl}
                                  controls
                                  className="mt-1 w-full"
                                />
                              )}
                              <p
                                className={`text-[10px] mt-1 ${
                                  isMe ? 'text-green-100' : 'text-gray-500'
                                }`}
                              >
                                {new Date(createdAt).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Zone de saisie */}
                <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xl text-gray-500 hover:bg-gray-100"
                      title="Pièce jointe (bientôt disponible)"
                    >
                      📎
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendFamilyMessage()
                        }
                      }}
                      placeholder="Écrivez un message familial..."
                      className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={sendFamilyMessage}
                      disabled={!newMessage.trim() || isSending}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg transition-colors ${
                        !newMessage.trim() || isSending
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── GALERIE FAMILLE PAR ALBUMS (vue en deux colonnes) ── */}
      {showGallery && (
        <div className="fixed inset-0 bg-white flex flex-col z-50">

          {/* Header (style clair type WhatsApp Web) */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-white text-gray-900 border-b border-gray-200"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
          >
            {galleryView === 'detail' ? (
              <button
                onClick={() => setGalleryView('list')}
                className="flex items-center gap-2 text-gray-900 active:opacity-70"
              >
                <span className="text-xl leading-none">←</span>
                <span className="font-semibold text-base">
                  {ALBUM_CONFIG.find(c => c.key === activeAlbum)?.emoji}{' '}
                  {ALBUM_CONFIG.find(c => c.key === activeAlbum)?.label}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowGallery(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-800"
                >
                  <span className="text-lg leading-none">←</span>
                  <span>Retour à l'arbre</span>
                </button>
                <h3 className="text-base font-bold">Galerie familiale</h3>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label
                  className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    uploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                  }`}
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>＋ Ajouter</>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={async e => {
                      const files = Array.from(e.target.files || [])
                      for (const file of files) {
                        await uploadToSharedGallery(file)
                      }
                      e.target.value = ''
                    }}
                  />
                </label>
              <button
                onClick={() => {
                  setShowGallery(false)
                  setGalleryView('list')
                  setViewerMedia(null)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Corps */}
          {sharedLoading ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="w-10 h-10 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 bg-[#f0f2f5]">
              {/* Colonne gauche : liste des albums */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto bg-white">
                <div className="divide-y divide-gray-200">
                  {ALBUM_CONFIG.map(cfg => {
                    const albumItems = albums[cfg.key] || []
                    const count = albumItems.length
                    const thumb = albumItems[0]
                    const isActive = activeAlbum === cfg.key
                    return (
                      <button
                        key={cfg.key}
                        onClick={() => {
                          setActiveAlbum(cfg.key)
                          setGalleryView('detail')
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                          isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                          {thumb ? (
                            thumb.type === 'video' || isVideo(thumb.url) ? (
                              <video
                                src={buildMediaUrl(thumb.url)}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={buildMediaUrl(thumb.url)}
                                alt={cfg.label}
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                              {cfg.emoji}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {cfg.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {count === 0 ? 'Vide' : `${count} élément${count > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Colonne droite : contenu de l'album sélectionné */}
              <div className="flex-1 overflow-y-auto bg-[#f0f2f5]">
                {(albums[activeAlbum]?.length || 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-gray-600">
                    <span className="text-7xl mb-4 opacity-20">
                      {ALBUM_CONFIG.find(c => c.key === activeAlbum)?.emoji}
                    </span>
                    <p className="text-sm font-medium text-gray-500">Aucune photo ni vidéo</p>
                    <p className="text-xs text-gray-600 mt-1">Appuyez sur "＋ Ajouter" pour commencer</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5 p-4">
                    {albums[activeAlbum].map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group overflow-hidden bg-white rounded-md shadow-sm"
                        style={{ aspectRatio: '1' }}
                      >
                        {item.type === 'video' || isVideo(item.url) ? (
                          <video
                            src={buildMediaUrl(item.url)}
                            className="w-full h-full object-cover cursor-pointer"
                            muted
                            onClick={() => setViewerMedia(item)}
                          />
                        ) : (
                          <img
                            src={buildMediaUrl(item.url)}
                            alt=""
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setViewerMedia(item)}
                          />
                        )}

                        {(item.type === 'video' || isVideo(item.url)) && (
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-full pointer-events-none">
                            ▶
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all opacity-0 group-hover:opacity-100 flex items-end justify-end p-1">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleDeleteMedia(item)
                            }}
                            disabled={deletingId === item.id}
                            className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center text-white text-xs active:scale-90"
                          >
                            {deletingId === item.id ? '…' : '🗑️'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VISIONNEUSE PLEIN ÉCRAN ── */}
      {viewerMedia && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setViewerMedia(null)}
        >
          <button className="absolute top-4 right-4 text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20" onClick={() => setViewerMedia(null)}>✕</button>
          {viewerMedia.type === 'video' || isVideo(viewerMedia.url) ? (
            <video
              src={buildMediaUrl(viewerMedia.url)}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={buildMediaUrl(viewerMedia.url)}
              alt=""
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  )
}
