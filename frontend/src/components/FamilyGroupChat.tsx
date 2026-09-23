import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket, disconnectSocket } from '../services/socket'
import { useI18n } from '../i18n/useI18n'
import CallModal from './CallModal'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

interface FamilyMessage {
  id: string
  numeroH: string
  authorName?: string
  content?: string
  messageType?: 'text' | 'image' | 'video' | 'audio'
  mediaUrl?: string
  category?: string
  created_at?: string
  createdAt?: string
}

interface Partner {
  numeroH: string
  prenom: string
  nomFamille: string
}

interface Props {
  myNumeroH: string
  prenom: string
  nomFamille: string
}

const FAMILLE_CATEGORIES = [
  { id: 'information', label: 'Information', icon: '📰', color: 'blue' },
  { id: 'rencontre',   label: 'Rencontre',   icon: '🤝', color: 'teal' },
  { id: 'deces',       label: 'Décès',       icon: '🕯️', color: 'stone' },
  { id: 'mariage',     label: 'Mariage',     icon: '💒', color: 'pink' },
  { id: 'bapteme',     label: 'Baptême',     icon: '⛪', color: 'purple' },
  { id: 'naissance',   label: 'Naissance',   icon: '👶', color: 'yellow' },
  { id: 'solidarite',  label: 'Solidarité / Entraide', icon: '🤲', color: 'green' },
  { id: 'fete',        label: 'Fête / Événement', icon: '🎉', color: 'amber' },
  { id: 'annonce',     label: 'Annonce',     icon: '📢', color: 'orange' },
  { id: 'opportunite', label: 'Opportunité', icon: '🌟', color: 'amber' },
  { id: 'urgence',     label: 'Urgence',     icon: '🚨', color: 'red' },
  { id: 'reunion',     label: 'Réunion',     icon: '👥', color: 'indigo' },
] as const

const FAMILLE_COLORS: Record<string, { header: string }> = {
  red:    { header: 'bg-red-600' },
  orange: { header: 'bg-orange-500' },
  blue:   { header: 'bg-blue-600' },
  stone:  { header: 'bg-stone-600' },
  pink:   { header: 'bg-pink-500' },
  purple: { header: 'bg-purple-600' },
  yellow: { header: 'bg-yellow-500' },
  green:  { header: 'bg-green-600' },
  amber:  { header: 'bg-amber-500' },
  teal:   { header: 'bg-teal-600' },
  indigo: { header: 'bg-indigo-600' },
}

export function FamilyGroupChat({ myNumeroH, prenom, nomFamille }: Props) {
  const { t } = useI18n()

  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newMessageCategory, setNewMessageCategory] = useState('information')
  const [showCategoryGrid, setShowCategoryGrid] = useState(false)
  const [feedFilter, setFeedFilter] = useState<string>('all')
  const [isSending, setIsSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [partner, setPartner] = useState<Partner | null>(null)
  const [outgoingCall, setOutgoingCall] = useState<{ to: string; toName: string; callType: 'audio' | 'video' } | null>(null)
  const [incomingCall, setIncomingCall] = useState<{ from: string; callerName: string; offer: RTCSessionDescriptionInit; callType: 'audio' | 'video' } | null>(null)
  const [showCall, setShowCall] = useState(false)

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
        headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (response.ok && data.success) {
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

  const loadPartner = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/couple/my-partner`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data?.success && data.partner) setPartner(data.partner)
    } catch {
      // non bloquant
    }
  }

  useEffect(() => {
    loadFamilyMessages()
    loadPartner()
    return () => { disconnectSocket() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendFamilyMessage = async () => {
    if (!newMessage.trim() || isSending) return
    try {
      setIsSending(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/family-tree/messages`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim(), messageType: 'text', category: newMessageCategory })
      })
      const data = await response.json()
      if (response.ok && data.success && data.message) {
        setFamilyMessages((prev) => {
          if (prev.find(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
        setNewMessage('')
        setTimeout(scrollToBottom, 100)
      } else {
        alert(data.message || "Erreur lors de l'envoi du message")
      }
    } catch (error) {
      console.error('Erreur envoi message familial:', error)
      alert(error instanceof Error ? error.message : "Erreur lors de l'envoi du message")
    } finally {
      setIsSending(false)
    }
  }

  const checkMediaDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      if (!isVideo && !isAudio) { resolve(true); return }
      const el = isVideo ? document.createElement('video') : document.createElement('audio')
      const url = URL.createObjectURL(file)
      el.src = url
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        if (el.duration > 30) {
          alert(`⏱️ Durée maximale : 30 secondes.\nVotre fichier dure ${Math.round(el.duration)}s.`)
          resolve(false)
        } else {
          resolve(true)
        }
      }
      el.onerror = () => { URL.revokeObjectURL(url); resolve(true) }
    })
  }

  const sendFamilyMediaMessage = useCallback(async (file: File) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const ok = await checkMediaDuration(file)
    if (!ok) return
    setIsSending(true)
    try {
      const formData = new FormData()
      formData.append('media', file)
      formData.append('category', newMessageCategory)
      const res = await fetch(`${API_BASE}/api/family-tree/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.success && data.message) {
        setFamilyMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
        setTimeout(scrollToBottom, 100)
      } else {
        alert(data.message || 'Erreur envoi média')
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setIsSending(false)
    }
  }, [newMessageCategory])

  const startRecording = useCallback(async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `vocal-${Date.now()}.webm`, { type: 'audio/webm' })
        await sendFamilyMediaMessage(file)
        setRecordingSeconds(0)
      }
      mr.start(200)
      mediaRecorderRef.current = mr
      setIsRecording(true)
      let secs = 0
      recordingTimerRef.current = setInterval(() => {
        secs++
        setRecordingSeconds(secs)
        if (secs >= 30) stopRecording()
      }, 1000)
    } catch {
      alert("Impossible d'accéder au microphone")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, sendFamilyMediaMessage])

  const stopRecording = useCallback(() => {
    if (!isRecording) return
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [isRecording])

  const startCall = useCallback((to: string, toName: string, callType: 'audio' | 'video') => {
    setOutgoingCall({ to, toName, callType })
    setShowCall(true)
  }, [])

  useEffect(() => {
    if (!nomFamille || !myNumeroH) return
    const socket = getSocket()
    socket.emit('join-family', nomFamille)

    const onFamilyMsg = (msg: FamilyMessage) => {
      setFamilyMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(scrollToBottom, 100)
    }

    const onIncomingCall = (data: { from: string; callerName: string; offer: RTCSessionDescriptionInit; callType: 'audio' | 'video' }) => {
      setIncomingCall(data)
      setShowCall(true)
    }

    socket.on('family-message', onFamilyMsg)
    socket.on('incoming-call', onIncomingCall)

    return () => {
      socket.off('family-message', onFamilyMsg)
      socket.off('incoming-call', onIncomingCall)
    }
  }, [nomFamille, myNumeroH])

  return (
    <>
      <div className="rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[75vh] bg-white">
        <div className="bg-gray-800 text-white px-4 py-[4px] flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate">Famille {nomFamille || 'ADAM'}</h3>
          </div>
          {partner && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => startCall(partner.numeroH, `${partner.prenom} ${partner.nomFamille}`, 'audio')}
                className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-lg transition-colors"
                title={t('heritage.call_audio')}
              >
                📞
              </button>
              <button
                onClick={() => startCall(partner.numeroH, `${partner.prenom} ${partner.nomFamille}`, 'video')}
                className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-lg transition-colors"
                title={t('heritage.call_video')}
              >
                📹
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-white border-b border-gray-100">
          <button
            onClick={() => setFeedFilter('all')}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${feedFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            💬 Tout ({familyMessages.length})
          </button>
          {FAMILLE_CATEGORIES.map(cat => {
            const count = familyMessages.filter(m => (m.category || 'information') === cat.id).length
            const colors = FAMILLE_COLORS[cat.color]
            return (
              <button
                key={cat.id}
                onClick={() => setFeedFilter(feedFilter === cat.id ? 'all' : cat.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${feedFilter === cat.id ? colors.header + ' text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {cat.icon} {cat.label}
                {count > 0 && (
                  <span className={`flex items-center gap-0.5 ${feedFilter === cat.id ? 'text-white' : 'text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${feedFilter === cat.id ? 'bg-white' : 'bg-red-500'}`} />
                    <span className="text-[9px] font-bold">{count}</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>

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
              {familyMessages
                .filter(msg => feedFilter === 'all' || (msg.category || 'information') === feedFilter)
                .map((msg) => {
                const isMe = msg.numeroH === myNumeroH
                const createdAt = msg.createdAt || msg.created_at || new Date().toISOString()
                const cat = FAMILLE_CATEGORIES.find(c => c.id === (msg.category || 'information'))
                const colors = FAMILLE_COLORS[cat?.color || 'blue']

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl shadow-sm overflow-hidden border-2 bg-white ${isMe ? 'border-green-300' : 'border-gray-100'}`}>
                      <div className={`${colors.header} px-4 py-2.5 flex items-center gap-3`}>
                        <span className="text-3xl leading-none">{cat?.icon || '📰'}</span>
                        <span className="text-white font-bold text-sm tracking-wide uppercase">{cat?.label || 'Information'}</span>
                      </div>
                      <div className="px-4 py-3">
                        <p className={`text-[11px] font-bold mb-1.5 ${isMe ? 'text-right text-green-600' : 'text-green-600'}`}>
                          {isMe ? 'Moi' : (msg.authorName || 'Membre de la famille')}
                        </p>
                        {(msg.messageType === 'text' || !msg.messageType) && msg.content && (
                          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">{msg.content}</p>
                        )}
                        {msg.mediaUrl && msg.messageType === 'image' && (
                          <img src={msg.mediaUrl} alt="Pièce jointe" className="rounded-lg max-h-60 object-cover w-full" />
                        )}
                        {msg.mediaUrl && msg.messageType === 'video' && (
                          <video src={msg.mediaUrl} controls className="rounded-lg max-h-60 w-full" />
                        )}
                        {msg.mediaUrl && msg.messageType === 'audio' && (
                          <audio src={msg.mediaUrl} controls className="w-full" />
                        )}
                        <p className="text-[10px] text-gray-400 mt-2 text-right">
                          {new Date(createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
          {isRecording && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-red-50 rounded-full border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-600 font-medium">🎤 {recordingSeconds}s / 30s — relâchez pour envoyer</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 relative">
              <button
                type="button"
                onClick={() => setShowCategoryGrid(v => !v)}
                title={t('heritage.choose_info_type')}
                className={`absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-colors ${showCategoryGrid ? 'bg-green-100' : 'hover:bg-gray-200'}`}
              >
                <span className="text-lg leading-none">{FAMILLE_CATEGORIES.find(c => c.id === newMessageCategory)?.icon}</span>
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
                placeholder={`${FAMILLE_CATEGORIES.find(c => c.id === newMessageCategory)?.label || 'Information'}...`}
                className="w-full min-w-0 pl-12 pr-20 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 text-sm"
              />
              <label
                className={`absolute right-10 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-lg leading-none text-gray-500 hover:text-gray-700 cursor-pointer ${isSending ? 'opacity-50 pointer-events-none' : ''}`}
                title={t('heritage.send_photo_video')}
              >
                📷
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) sendFamilyMediaMessage(file)
                    e.target.value = ''
                  }}
                />
              </label>
              <button
                type="button"
                onClick={sendFamilyMessage}
                disabled={isSending || !newMessage.trim()}
                title={t('btn.send')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✓
              </button>
              {showCategoryGrid && (
                <div className="absolute bottom-11 left-0 z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-4 gap-1 w-64">
                  {FAMILLE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setNewMessageCategory(cat.id); setShowCategoryGrid(false) }}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded-lg ${newMessageCategory === cat.id ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                      title={cat.label}
                    >
                      <span className="text-lg leading-none">{cat.icon}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording() }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
              disabled={isSending}
              className={`flex-shrink-0 w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-xl leading-none transition-all ${
                isRecording ? 'bg-red-500 scale-110 shadow-lg text-white' : 'bg-gray-200 hover:bg-green-100 text-gray-600 hover:text-green-700'
              }`}
              title={t('heritage.hold_voice_message')}
            >
              🎤
            </button>
          </div>
        </div>
      </div>

      {showCall && myNumeroH && (
        <CallModal
          socket={getSocket()}
          currentUser={{ numeroH: myNumeroH, prenom, nomFamille }}
          outgoingCall={outgoingCall ?? undefined}
          incomingCall={incomingCall ?? undefined}
          onClose={() => {
            setShowCall(false)
            setOutgoingCall(null)
            setIncomingCall(null)
          }}
        />
      )}
    </>
  )
}
