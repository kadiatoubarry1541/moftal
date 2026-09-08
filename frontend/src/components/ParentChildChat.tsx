import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../services/socket'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

interface ParentChildMessageItem {
  id: string
  numeroH: string
  authorName?: string
  content: string
  messageType?: 'text' | 'image' | 'video' | 'audio'
  mediaUrl?: string | null
  category?: string
  created_at?: string
  createdAt?: string
}

const PARENT_CHILD_CATEGORIES = [
  { id: 'information', label: 'Information', icon: '📰' },
  { id: 'ecole',       label: 'École',       icon: '📚' },
  { id: 'sante',       label: 'Santé',       icon: '🏥' },
  { id: 'argent',      label: 'Argent',      icon: '💰' },
  { id: 'amour',       label: 'Amour',       icon: '❤️' },
  { id: 'opportunite', label: 'Opportunité', icon: '🌟' },
  { id: 'urgence',     label: 'Urgence',     icon: '🚨' },
] as const

interface Props {
  linkId: string
  myNumeroH: string
  partnerLabel: string
}

export function ParentChildChat({ linkId, myNumeroH, partnerLabel }: Props) {
  const [messages, setMessages] = useState<ParentChildMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [category, setCategory] = useState('information')
  const [showCategoryGrid, setShowCategoryGrid] = useState(false)
  const [feedFilter, setFeedFilter] = useState('all')
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const token = () => localStorage.getItem('token')
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const loadMessages = useCallback(async () => {
    if (!linkId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/parent-child/messages?linkId=${encodeURIComponent(linkId)}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessages(data.messages || [])
        setTimeout(scrollToBottom, 150)
      }
    } catch { /* non bloquant */ } finally {
      setLoading(false)
    }
  }, [linkId])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    if (!linkId) return
    const socket = getSocket()
    socket.emit('join-room', `parent-child-${linkId}`)
    const onMsg = (msg: ParentChildMessageItem) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(scrollToBottom, 100)
    }
    socket.on('parent-child-message', onMsg)
    return () => { socket.off('parent-child-message', onMsg) }
  }, [linkId])

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return
    setIsSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/parent-child/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, content: newMessage.trim(), category })
      })
      const data = await res.json()
      if (res.ok && data.success && data.message) {
        setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message])
        setNewMessage('')
        setTimeout(scrollToBottom, 100)
      } else {
        alert(data.message || 'Erreur lors de l\'envoi du message')
      }
    } catch {
      alert('Erreur de connexion au serveur')
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

  const sendMediaMessage = useCallback(async (file: File) => {
    const ok = await checkMediaDuration(file)
    if (!ok) return
    setIsSending(true)
    try {
      const formData = new FormData()
      formData.append('media', file)
      formData.append('linkId', linkId)
      formData.append('category', category)
      const res = await fetch(`${API_BASE}/api/parent-child/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.success && data.message) {
        setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message])
        setTimeout(scrollToBottom, 100)
      } else {
        alert(data.message || 'Erreur envoi média')
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setIsSending(false)
    }
  }, [linkId, category])

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
        await sendMediaMessage(file)
      }
      mediaRecorderRef.current = mr
      mr.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert("Impossible d'accéder au micro. Vérifiez les permissions.")
    }
  }, [isRecording, sendMediaMessage])

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    setIsRecording(false)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const toMediaUrl = (url: string) => url.startsWith('http') || url.startsWith('data:') ? url : `${API_BASE}${url}`

  return (
    <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden" style={{ minHeight: 480, maxHeight: '80vh' }}>
      {messages.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setFeedFilter('all')}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${feedFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            💬 Tout
          </button>
          {PARENT_CHILD_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFeedFilter(cat.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${feedFilter === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 bg-gray-100 px-3 py-3 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 text-sm space-y-2">
              <p>Aucun message pour le moment.</p>
              <p>Écrivez à {partnerLabel}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages
              .filter(m => feedFilter === 'all' || (m.category || 'information') === feedFilter)
              .map((msg) => {
                const isMe = msg.numeroH === myNumeroH
                const createdAt = msg.createdAt || msg.created_at || new Date().toISOString()
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs sm:max-w-md px-3 py-2 rounded-2xl shadow-sm ${isMe ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'}`}>
                      {(msg.messageType === 'text' || !msg.messageType) && (
                        <p className="text-sm whitespace-pre-line">
                          {msg.category && msg.category !== 'information' && (
                            <span className="mr-1">{PARENT_CHILD_CATEGORIES.find(c => c.id === msg.category)?.icon}</span>
                          )}
                          {msg.content}
                        </p>
                      )}
                      {msg.mediaUrl && msg.messageType === 'image' && (
                        <img src={toMediaUrl(msg.mediaUrl)} alt="Pièce jointe" className="mt-1 rounded-lg max-h-60 object-cover" />
                      )}
                      {msg.mediaUrl && msg.messageType === 'video' && (
                        <video src={toMediaUrl(msg.mediaUrl)} controls className="mt-1 rounded-lg max-h-60 w-full" />
                      )}
                      {msg.mediaUrl && msg.messageType === 'audio' && (
                        <audio src={toMediaUrl(msg.mediaUrl)} controls className="mt-1 w-full" />
                      )}
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 flex-shrink-0">
        {isRecording && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-red-50 rounded-full border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 font-medium">🎤 {recordingSeconds}s / 30s — relâchez pour envoyer</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label
            className={`w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xl text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors ${isSending ? 'opacity-50 pointer-events-none' : ''}`}
            title="Envoyer une photo ou vidéo"
          >
            📷
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) sendMediaMessage(file); e.target.value = '' }}
            />
          </label>

          <div className="flex-1 min-w-0 relative">
            <button
              type="button"
              onClick={() => setShowCategoryGrid(v => !v)}
              title="Choisir le type d'information"
              className={`absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-colors ${showCategoryGrid ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              <span className="text-base leading-none">{PARENT_CHILD_CATEGORIES.find(c => c.id === category)?.icon}</span>
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={`Écrivez à ${partnerLabel}...`}
              className="w-full min-w-0 pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            />
            {showCategoryGrid && (
              <div className="absolute bottom-11 left-0 z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-4 gap-1 w-56">
                {PARENT_CHILD_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setCategory(cat.id); setShowCategoryGrid(false) }}
                    className={`flex flex-col items-center gap-0.5 py-2 rounded-lg ${category === cat.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
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
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${isRecording ? 'bg-red-500 scale-110 shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'}`}
            title="Maintenir pour enregistrer un message vocal"
          >
            🎤
          </button>

          {newMessage.trim() && (
            <button
              type="button"
              onClick={sendMessage}
              disabled={isSending}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              ➤
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
