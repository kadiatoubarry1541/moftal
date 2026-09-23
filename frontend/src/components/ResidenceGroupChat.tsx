import { useState, useEffect, useRef } from 'react'
import { findLocationByCode } from '../utils/worldGeography'
import { AudioRecorder } from './AudioRecorder'
import { useI18n } from '../i18n/useI18n'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'
const MAX_VIDEO_SECONDS = 5

export interface ResidenceMember {
  numeroH?: string
  prenom?: string
  nomFamille?: string
  photo?: string
}

export interface ResidenceGroupInfo {
  id: string
  name?: string
  title?: string
  logoUrl?: string | null
  location?: string
  members?: ResidenceMember[]
}

interface ResidenceMessage {
  id: string
  author: string
  authorName: string
  content: string
  type?: 'text' | 'image' | 'video' | 'audio'
  messageType?: 'text' | 'image' | 'video' | 'audio'
  mediaUrl?: string
  category?: string
  createdAt: string
  numeroH: string
}

interface ResidenceUserData {
  sousPrefectureCode?: string
  sousPrefecture?: string
}

interface Props {
  group: ResidenceGroupInfo
  myNumeroH: string
  userData: ResidenceUserData
}

const QUARTIER_CATEGORIES: { id: string; icon: string; color: string; tKey: string }[] = [
  { id: 'information', icon: '📰', color: 'blue',   tKey: 'terre_adam.qcat.information' },
  { id: 'rencontre',   icon: '🤝', color: 'teal',   tKey: 'terre_adam.qcat.rencontre' },
  { id: 'deces',       icon: '🕯️', color: 'stone',  tKey: 'terre_adam.qcat.deces' },
  { id: 'mariage',     icon: '💒', color: 'pink',   tKey: 'terre_adam.qcat.mariage' },
  { id: 'bapteme',     icon: '⛪', color: 'purple', tKey: 'terre_adam.qcat.bapteme' },
  { id: 'naissance',   icon: '👶', color: 'yellow', tKey: 'terre_adam.qcat.naissance' },
  { id: 'solidarite',  icon: '🤲', color: 'green',  tKey: 'terre_adam.canal.solidarite.label' },
  { id: 'fete',        icon: '🎉', color: 'amber',  tKey: 'terre_adam.qcat.fete' },
  { id: 'annonce',     icon: '📢', color: 'orange', tKey: 'terre_adam.qcat.annonce' },
  { id: 'opportunite', icon: '🌟', color: 'amber',  tKey: 'terre_adam.qcat.opportunite' },
  { id: 'securite',    icon: '🚨', color: 'red',    tKey: 'terre_adam.qcat.securite' },
  { id: 'reunion',     icon: '👥', color: 'indigo', tKey: 'terre_adam.qcat.reunion' },
]

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; header: string }> = {
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    header: 'bg-red-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', header: 'bg-orange-500' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   header: 'bg-blue-600' },
  stone:  { bg: 'bg-stone-50',  border: 'border-stone-300',  text: 'text-stone-700',  header: 'bg-stone-600' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   header: 'bg-pink-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', header: 'bg-purple-600' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', header: 'bg-yellow-500' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  header: 'bg-green-600' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  header: 'bg-amber-500' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', header: 'bg-indigo-600' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   header: 'bg-teal-600' },
}

export function ResidenceGroupChat({ group, myNumeroH, userData }: Props) {
  const { t } = useI18n()

  const selectedGroup = group
  const [messages, setMessages] = useState<ResidenceMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [feedFilter, setFeedFilter] = useState<string>('all')
  const [showCategoryGrid, setShowCategoryGrid] = useState(false)
  const [showMembersList, setShowMembersList] = useState(false)
  const [newMessage, setNewMessage] = useState({
    content: '',
    messageType: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as string,
    mediaFile: null as File | null,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Partage d'un message vers la sous-préfecture — un seul niveau au-dessus
  // du quartier, jamais plus loin (c'est depuis la sous-préfecture qu'on
  // continue à faire remonter plus haut).
  const [shareMsg, setShareMsg] = useState<ResidenceMessage | null>(null)
  const [shareChecking, setShareChecking] = useState(false)
  const [shareSending, setShareSending] = useState(false)
  const [canShareToSousPrefecture, setCanShareToSousPrefecture] = useState(false)

  const userSousPrefecture = userData?.sousPrefectureCode ? findLocationByCode(userData.sousPrefectureCode) : null
  const sousPrefectureLevel = (() => {
    const location = userData?.sousPrefectureCode || userData?.sousPrefecture || ''
    if (!location) return null
    const label = userSousPrefecture?.name || userData?.sousPrefecture || t('terre_adam.default_commune')
    return { scope: 'sous-prefecture', location, label }
  })()

  const getCategory = (id: string) => QUARTIER_CATEGORIES.find(c => c.id === id)
  const getColors = (color?: string) => CATEGORY_COLORS[color || 'blue']

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const loadMessages = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/residences/groups/${selectedGroup.id}/messages`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      setMessages((data.messages || []).reverse())
      scrollToBottom()
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup.id])

  const sendMessage = async () => {
    if (newMessage.messageType === 'text' && !newMessage.content.trim()) {
      alert('Veuillez entrer un message')
      return
    }
    if (newMessage.messageType !== 'text' && !newMessage.mediaFile) {
      alert('Veuillez sélectionner un fichier média')
      return
    }
    try {
      const formData = new FormData()
      formData.append('content', newMessage.content)
      formData.append('messageType', newMessage.messageType)
      formData.append('category', newMessage.category)
      if (newMessage.mediaFile) formData.append('media', newMessage.mediaFile)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/residences/groups/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (response.ok) {
        setNewMessage({ content: '', messageType: 'text', category: 'information', mediaFile: null })
        setShowCategoryGrid(false)
        await loadMessages()
      } else {
        const error = await response.json().catch(() => ({ message: "Erreur lors de l'envoi du message" }))
        alert(error.message || "Erreur lors de l'envoi du message")
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error)
      alert(error instanceof Error ? error.message : "Erreur lors de l'envoi du message")
    }
  }

  const openShare = async (msg: ResidenceMessage) => {
    setShareMsg(msg)
    if (!sousPrefectureLevel) return
    setShareChecking(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${API_BASE}/api/developpement/actualites/can-publish?scope=${encodeURIComponent(sousPrefectureLevel.scope)}&location=${encodeURIComponent(sousPrefectureLevel.location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const d = res.ok ? await res.json() : null
      setCanShareToSousPrefecture(!!d?.canPublish)
    } catch {
      setCanShareToSousPrefecture(false)
    } finally {
      setShareChecking(false)
    }
  }

  const confirmShare = async () => {
    if (!shareMsg || !sousPrefectureLevel) return
    setShareSending(true)
    try {
      const categoryLabel = t(getCategory(shareMsg.category || 'information')?.tKey || 'terre_adam.qcat.information')
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('titre', `${categoryLabel} — ${selectedGroup.title || selectedGroup.name || ''}`)
      formData.append('content', shareMsg.content || '')
      formData.append('scope', sousPrefectureLevel.scope)
      formData.append('location', sousPrefectureLevel.location)
      const res = await fetch(`${API_BASE}/api/developpement/actualites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const d = await res.json()
      if (d.success) {
        setShareMsg(null)
      } else {
        alert(d.message || 'Erreur lors du partage.')
      }
    } catch {
      alert('Impossible de contacter le serveur.')
    } finally {
      setShareSending(false)
    }
  }

  const toMediaUrl = (url: string) => (url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? url : '/' + url}`)
  const logoSrc = selectedGroup.logoUrl ? (selectedGroup.logoUrl.startsWith('http') ? selectedGroup.logoUrl : `${API_BASE}${selectedGroup.logoUrl}`) : null
  const filtered = feedFilter === 'all' ? messages : messages.filter(m => (m.category || 'information') === feedFilter)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: '70vh', maxHeight: '80vh' }}>
      {/* En-tête */}
      <div className="bg-gray-800 text-white flex-shrink-0">
        <div className="px-4 py-[4px] flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMembersList(true)}
            className="relative w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden cursor-pointer"
          >
            {logoSrc ? <img src={logoSrc} alt="" className="w-full h-full object-cover" /> : (selectedGroup.title || selectedGroup.name || '?').charAt(0).toUpperCase()}
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">{selectedGroup.title || selectedGroup.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedGroup.members?.length ?? 0} membre{(selectedGroup.members?.length ?? 0) > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="border-b border-gray-100 bg-white px-3 py-2 overflow-x-auto flex-shrink-0">
        <div className="flex gap-1.5 min-w-max">
          <button
            type="button"
            onClick={() => setFeedFilter('all')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${feedFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            💬 Tout ({messages.length})
          </button>
          {QUARTIER_CATEGORIES.map(cat => {
            const count = messages.filter(m => (m.category || 'information') === cat.id).length
            const colors = getColors(cat.color)
            const isActive = feedFilter === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFeedFilter(isActive ? 'all' : cat.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${isActive ? colors.header + ' text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat.icon} {t(cat.tKey)}
                {count > 0 && (
                  <span className={`flex items-center gap-0.5 ${isActive ? 'text-white' : 'text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-white' : 'bg-red-500'}`} />
                    <span className="text-[9px] font-bold">{count}</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50" style={{ minHeight: '220px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">{feedFilter === 'all' ? '💬' : getCategory(feedFilter)?.icon || '💬'}</span>
            <p className="text-sm font-medium text-gray-500">
              {feedFilter === 'all' ? 'Aucun message pour le moment.' : 'Aucun message dans cette catégorie.'}
            </p>
            <p className="text-xs text-gray-400 mt-1 italic">{t('terre_adam.be_first_to_post')}</p>
          </div>
        ) : (
          filtered.map(msg => {
            const isMyMessage = msg.numeroH === myNumeroH
            const cat = getCategory(msg.category || 'information')
            const colors = getColors(cat?.color)
            return (
              <div key={msg.id} className={`mb-4 flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl shadow-sm overflow-hidden border-2 bg-white ${isMyMessage ? 'border-emerald-300' : 'border-gray-100'}`}>
                  <div className={`${colors.header} px-4 py-2.5 flex items-center gap-3`}>
                    <span className="text-3xl leading-none">{cat?.icon || 'ℹ️'}</span>
                    <span className="text-white font-bold text-sm tracking-wide uppercase">{cat ? t(cat.tKey) : t('terre_adam.qcat.information')}</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className={`text-[11px] font-bold mb-1.5 ${isMyMessage ? 'text-right text-emerald-600' : 'text-emerald-600'}`}>
                      {isMyMessage ? 'Moi' : msg.authorName}
                    </p>
                    {(msg.type === 'text' || msg.messageType === 'text') && msg.content && (
                      <p className="text-sm leading-relaxed text-gray-800">{msg.content}</p>
                    )}
                    {(msg.type === 'image' || msg.messageType === 'image') && msg.mediaUrl && (
                      <img src={toMediaUrl(msg.mediaUrl)} alt="" className="max-w-full h-auto rounded-lg" />
                    )}
                    {(msg.type === 'video' || msg.messageType === 'video') && msg.mediaUrl && (
                      <video src={toMediaUrl(msg.mediaUrl)} controls className="max-w-full h-auto rounded-lg" />
                    )}
                    {(msg.type === 'audio' || msg.messageType === 'audio') && msg.mediaUrl && (
                      <audio src={toMediaUrl(msg.mediaUrl)} controls className="w-full" />
                    )}
                    <div className="flex items-center justify-end gap-2 mt-2">
                      {(msg.type === 'text' || msg.messageType === 'text') && msg.content && (
                        <button onClick={() => openShare(msg)} className="text-[10px] text-gray-400 hover:text-emerald-600 font-semibold" title={t('terre_adam.share_to_level')}>
                          ↗️ Partager
                        </button>
                      )}
                      <p className={`text-[10px] ${isMyMessage ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de publication */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0">
        {showCategoryGrid && (
          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              {QUARTIER_CATEGORIES.map(cat => {
                const cl = getColors(cat.color)
                const selected = newMessage.category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setNewMessage({ ...newMessage, category: cat.id }); setShowCategoryGrid(false) }}
                    className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 transition-all ${selected ? `${cl.bg} ${cl.border} ${cl.text}` : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                  >
                    <span className="text-2xl leading-none">{cat.icon}</span>
                    <span className="text-[10px] font-semibold text-center leading-tight">{t(cat.tKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="flex gap-2 items-center px-3 py-3">
          {newMessage.messageType === 'audio' && !newMessage.mediaFile ? (
            <div className="flex-1 min-w-0">
              <AudioRecorder compact maxDuration={10} onAudioRecorded={(blob: Blob) => {
                const file = new File([blob], 'vocal.webm', { type: blob.type })
                setNewMessage({ ...newMessage, messageType: 'audio', mediaFile: file })
              }} />
            </div>
          ) : newMessage.mediaFile ? (
            <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-full">
              <span className="text-sm text-green-700 flex-1 truncate">
                {newMessage.messageType === 'audio' ? '🎙️ Audio prêt' : newMessage.messageType === 'video' ? '🎥 Vidéo prête' : '📷 Photo prête'}
              </span>
              <button type="button" onClick={() => setNewMessage({ ...newMessage, messageType: 'text', mediaFile: null })} className="text-red-500 text-xs font-medium flex-shrink-0">✕</button>
              <button
                type="button"
                onClick={sendMessage}
                className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                title={t('btn.send')}
              >
                ✓
              </button>
            </div>
          ) : (
            <div className="flex-1 min-w-0 relative">
              <button
                type="button"
                onClick={() => setShowCategoryGrid(!showCategoryGrid)}
                title={t('terre_adam.choose_publish_type')}
                className={`absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-colors ${showCategoryGrid ? getColors(getCategory(newMessage.category)?.color).bg : 'hover:bg-gray-200'}`}
              >
                <span className="text-lg leading-none">{getCategory(newMessage.category)?.icon || '📰'}</span>
              </button>
              <input
                type="text"
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={`${t(getCategory(newMessage.category)?.tKey || 'terre_adam.qcat.information')}...`}
                className="w-full min-w-0 pl-12 pr-20 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm bg-gray-50"
              />
              <label className="absolute right-10 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-lg leading-none text-gray-500 hover:text-gray-700 cursor-pointer" title={t('heritage.send_photo_video')}>
                📷
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    e.target.value = ''
                    if (!file) return
                    if (file.type.startsWith('video/')) {
                      const url = URL.createObjectURL(file)
                      const videoEl = document.createElement('video')
                      videoEl.preload = 'metadata'
                      videoEl.onloadedmetadata = () => {
                        URL.revokeObjectURL(url)
                        if (videoEl.duration > MAX_VIDEO_SECONDS + 0.5) {
                          alert(`Vidéo trop longue : ${Math.round(videoEl.duration)} secondes.\nMaximum autorisé : ${MAX_VIDEO_SECONDS} secondes.`)
                          return
                        }
                        setNewMessage(prev => ({ ...prev, messageType: 'video', mediaFile: file }))
                      }
                      videoEl.onerror = () => { URL.revokeObjectURL(url); alert('Impossible de lire cette vidéo.') }
                      videoEl.src = url
                    } else {
                      setNewMessage(prev => ({ ...prev, messageType: 'image', mediaFile: file }))
                    }
                  }}
                />
              </label>
              <button
                type="button"
                onClick={sendMessage}
                disabled={!newMessage.content.trim()}
                title={t('btn.send')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✓
              </button>
            </div>
          )}
          {newMessage.messageType !== 'audio' && !newMessage.mediaFile && (
            <button
              type="button"
              onClick={() => setNewMessage({ ...newMessage, messageType: 'audio', mediaFile: null })}
              className="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gray-200 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 flex items-center justify-center text-xl leading-none transition-colors"
              title={t('terre_adam.send_voice')}
            >
              🎤
            </button>
          )}
        </div>
      </div>

      {/* Modal — Liste des membres */}
      {showMembersList && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowMembersList(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">{t('terre_adam.group_members')}</h2>
                <p className="text-emerald-200 text-xs mt-0.5">{selectedGroup.members?.length ?? 0} personne{(selectedGroup.members?.length ?? 0) > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowMembersList(false)} className="text-white text-2xl font-bold leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-3">
              {Array.isArray(selectedGroup.members) && selectedGroup.members.length > 0 ? (
                selectedGroup.members.map((member: ResidenceMember, index: number) => {
                  if (!member || typeof member !== 'object') return null
                  const { prenom, nomFamille, photo } = member
                  const initiale = (prenom || '?').charAt(0).toUpperCase()
                  return (
                    <div key={index} className="bg-emerald-600 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-200 overflow-hidden flex items-center justify-center text-xl font-bold text-emerald-800 border-2 border-white flex-shrink-0">
                        {photo ? <img src={photo} alt={initiale} className="w-full h-full object-cover" /> : initiale}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate">{prenom} {nomFamille}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">{t('terre_adam.no_member_found')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal — Partage vers la sous-préfecture */}
      {shareMsg && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShareMsg(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-3">{t('terre_adam.share_to_level')}</h3>
            {shareChecking ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sousPrefectureLevel && canShareToSousPrefecture ? (
              <>
                <p className="text-sm text-gray-600 mb-4">Envoyer ce message au niveau {sousPrefectureLevel.label} ?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShareMsg(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">Annuler</button>
                  <button onClick={confirmShare} disabled={shareSending} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-50">
                    {shareSending ? '...' : 'Partager'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">Vous n'avez pas les droits pour partager à un niveau supérieur.</p>
                <button onClick={() => setShareMsg(null)} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">Fermer</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
