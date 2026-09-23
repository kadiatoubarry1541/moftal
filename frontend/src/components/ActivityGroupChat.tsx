import { useState, useEffect, useRef } from 'react'
import { AudioRecorder } from './AudioRecorder'
import { hideIncrement } from '../utils/formatNumeroH'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '') + '/api'

export interface ActivityGroupInfo {
  id: string
  name: string
  activity: string
}

interface ActivityUserData {
  numeroH: string
  prenom?: string
  nomFamille?: string
}

interface ActivityMessage {
  id: string
  content?: string
  category?: 'information' | 'reunion' | 'rencontre' | 'opportunite' | 'sante' | 'deces' | 'outil'
  messageType?: 'text' | 'image' | 'video' | 'audio'
  mediaUrl?: string
  numeroH: string
  authorName?: string
  createdAt?: string
}

const ACTIVITE_CATEGORIES = [
  { id: 'information', label: 'Information', icon: 'ℹ️' },
  { id: 'reunion',      label: 'Réunion',      icon: '👥' },
  { id: 'rencontre',    label: 'Rencontre',    icon: '🤝' },
  { id: 'opportunite',  label: 'Opportunité',  icon: '🌟' },
  { id: 'sante',        label: 'Santé',        icon: '🏥' },
  { id: 'deces',        label: 'Décès',        icon: '🕯️' },
] as const

function getToken(): string | null {
  return localStorage.getItem('token')
}

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all opacity-90 hover:opacity-100">{part}</a>
      : <span key={i}>{part}</span>
  )
}

export function ActivityGroupChat({ group, myNumeroH, userData }: { group: ActivityGroupInfo; myNumeroH: string; userData: ActivityUserData }) {
  const [messages, setMessages] = useState<ActivityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [feedFilter, setFeedFilter] = useState<'all' | 'opportunite'>('all')
  const [showCategoryGrid, setShowCategoryGrid] = useState(false)
  const [newPost, setNewPost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as typeof ACTIVITE_CATEGORIES[number]['id'],
    mediaFile: null as File | null,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE_URL}/activities/groups/${group.id}/messages`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      if (response.ok) {
        const data = await response.json()
        setMessages((data.messages || []).reverse())
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch {
      // non bloquant
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setMessages([])
    loadMessages()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) loadMessages()
    }, 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id])

  const sendMessage = async () => {
    if (newPost.type === 'text' && !newPost.content.trim()) return
    if (newPost.type !== 'text' && !newPost.mediaFile) return

    try {
      const formData = new FormData()
      formData.append('content', newPost.content)
      formData.append('messageType', newPost.type)
      formData.append('category', newPost.category)
      if (newPost.mediaFile) formData.append('media', newPost.mediaFile)

      const token = getToken()
      const response = await fetch(`${API_BASE_URL}/activities/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (response.ok) {
        setNewPost({ content: '', type: 'text', category: 'information', mediaFile: null })
        await loadMessages()
      } else {
        alert("Erreur lors de l'envoi du message")
      }
    } catch {
      alert('Erreur de connexion au serveur')
    }
  }

  const renderMessage = (msg: ActivityMessage) => {
    const isMine = msg.numeroH === myNumeroH
    const displayName = isMine
      ? `${userData.prenom || ''} ${userData.nomFamille || ''}`.trim()
      : (msg.authorName || '')
    const displayNumero = isMine ? myNumeroH : (msg.numeroH || '')
    const initials = displayName ? displayName.substring(0, 2).toUpperCase() : '?'
    const bgColor = msg.category === 'opportunite' ? 'bg-amber-500' : 'bg-green-500'
    const avatarBg = msg.category === 'opportunite' ? 'bg-amber-500' : 'bg-indigo-600'

    return (
      <div key={msg.id} className={`mb-4 flex ${isMine ? 'justify-end' : 'justify-start'} items-end`}>
        {!isMine && (
          <div className={`w-9 h-9 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0`}>
            {initials}
          </div>
        )}
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isMine ? bgColor + ' text-white' : 'bg-white text-gray-900'} shadow-sm`}>
          <div className={`mb-1 ${isMine ? 'text-right' : 'text-left'}`}>
            <p className="text-xs font-semibold opacity-90">{displayName}</p>
            <p className="text-xs opacity-60">{hideIncrement(displayNumero)}</p>
          </div>
          {msg.messageType === 'text' && msg.content && (
            <p className="text-sm">
              {msg.category && msg.category !== 'information' && (
                <span className="mr-1">{ACTIVITE_CATEGORIES.find(c => c.id === msg.category)?.icon}</span>
              )}
              {renderTextWithLinks(msg.content)}
            </p>
          )}
          {msg.messageType === 'image' && msg.mediaUrl && (
            <img src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`} alt="Image" className="max-w-full h-auto rounded-lg mb-1" />
          )}
          {msg.messageType === 'video' && msg.mediaUrl && (
            <video src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`} controls className="max-w-full h-auto rounded-lg mb-1" />
          )}
          {msg.messageType === 'audio' && msg.mediaUrl && (
            <audio src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`} controls className="w-full mb-1" />
          )}
        </div>
        {isMine && (
          <div className={`w-9 h-9 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0`}>
            {initials}
          </div>
        )}
      </div>
    )
  }

  // 'outil' reste réservé à la page Activité (fonctionnalité payante distincte)
  const filtered = feedFilter === 'all'
    ? messages.filter(m => (m.category || 'information') !== 'opportunite' && (m.category || 'information') !== 'outil')
    : messages.filter(m => (m.category || 'information') === 'opportunite')

  return (
    <div className="bg-white rounded-lg overflow-hidden flex flex-col" style={{ minHeight: '480px', maxHeight: '75vh' }}>
      <div className="flex gap-2 p-2 border-b bg-gray-50">
        <button type="button" onClick={() => setFeedFilter('all')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium text-center ${feedFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          💬 Messages
        </button>
        <button type="button" onClick={() => setFeedFilter('opportunite')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium text-center ${feedFilter === 'opportunite' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}>
          🌟 Opportunités
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100 p-4" style={{ minHeight: '280px' }}>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-9 h-9 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Connexion au groupe…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>{feedFilter === 'opportunite' ? 'Aucune opportunité pour le moment.' : 'Aucun message pour le moment.'}</p>
            <p className="text-sm mt-1">Soyez le premier à écrire dans ce groupe !</p>
          </div>
        ) : (
          filtered.map(msg => renderMessage(msg))
        )}
        <div ref={messagesEndRef} />
      </div>

      {!loading && (
        <div className="bg-gray-200 px-3 py-2 border-t flex items-center gap-2">
          <label className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-lg text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors" title="Envoyer une photo ou une vidéo">
            📷
            <input type="file" accept="image/*,video/*" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                e.target.value = ''
                if (!file) return
                const detectedType = file.type.startsWith('video/') ? 'video' : 'image'
                setNewPost(prev => ({ ...prev, type: detectedType, mediaFile: file }))
              }} />
          </label>

          <div className="flex-1 min-w-0 relative">
            {newPost.type === 'audio' && !newPost.mediaFile ? (
              <AudioRecorder compact maxDuration={10} onAudioRecorded={(blob) => {
                const file = new File([blob], 'vocal.webm', { type: blob.type })
                setNewPost(prev => ({ ...prev, mediaFile: file }))
              }} />
            ) : newPost.mediaFile ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-full">
                <span className="text-sm text-green-700 flex-1 truncate">
                  {newPost.type === 'audio' ? '🎙️ Audio prêt' : newPost.type === 'video' ? '🎥 Vidéo prête' : '📷 Photo prête'}
                </span>
                <button type="button" onClick={() => setNewPost(prev => ({ ...prev, type: 'text', mediaFile: null }))} className="text-red-500 hover:text-red-700 text-xs font-medium flex-shrink-0">✕</button>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => setShowCategoryGrid(v => !v)} title="Choisir le type de publication"
                  className={`absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-colors ${showCategoryGrid ? 'bg-green-100' : 'hover:bg-gray-200'}`}>
                  <span className="text-base leading-none">{ACTIVITE_CATEGORIES.find(c => c.id === newPost.category)?.icon}</span>
                </button>
                <input type="text" value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); setShowCategoryGrid(false) } }}
                  placeholder={`${ACTIVITE_CATEGORIES.find(c => c.id === newPost.category)?.label || 'Information'}...`}
                  className="w-full min-w-0 pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm" />
                {showCategoryGrid && (
                  <div className="absolute bottom-11 left-0 z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-3 gap-1 w-48">
                    {ACTIVITE_CATEGORIES.map(cat => (
                      <button key={cat.id} type="button"
                        onClick={() => { setNewPost({ ...newPost, category: cat.id }); setShowCategoryGrid(false) }}
                        className={`flex flex-col items-center gap-0.5 py-2 rounded-lg ${newPost.category === cat.id ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                        title={cat.label}>
                        <span className="text-lg leading-none">{cat.icon}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {newPost.type !== 'audio' && !newPost.mediaFile && (
            <button type="button" onClick={() => setNewPost(prev => ({ ...prev, type: 'audio', mediaFile: null }))}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title="Message vocal">
              🎤
            </button>
          )}

          {(newPost.content.trim() || newPost.mediaFile) && (
            <button onClick={() => { sendMessage(); setShowCategoryGrid(false) }}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center text-sm font-bold transition-colors"
              title="Envoyer">
              ✓
            </button>
          )}
        </div>
      )}
    </div>
  )
}
