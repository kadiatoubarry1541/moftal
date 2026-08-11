import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket, disconnectSocket } from '../services/socket'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

interface GalleryItem {
  id: string
  url: string
  type: 'image' | 'video'
  album: string
  uploaderName: string
  uploaderNumeroH: string
  created_at: string
}

const ALBUM_LABELS: Record<string, { label: string; emoji: string }> = {
  rencontre: { label: 'Rencontre', emoji: '💑' },
  bapteme: { label: 'Baptême', emoji: '👶' },
  mariage: { label: 'Mariage', emoji: '💍' },
  deces: { label: 'Deuil', emoji: '🕊️' },
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
}

interface CommunicationHubProps {
  userData: any
  showGroups?: boolean
  showBroadcast?: boolean
  showGallery?: boolean
}

export function CommunicationHub({ userData, showGroups = true, showBroadcast = true, showGallery = true }: CommunicationHubProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'groups' | 'broadcast' | 'galerie'>('messages')
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryFilter, setGalleryFilter] = useState<string>('all')
  const [galleryLightbox, setGalleryLightbox] = useState<GalleryItem | null>(null)
  const [messages, setMessages] = useState<FamilyMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`${API_BASE}/api/family-tree/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessages((data.messages || []).slice().reverse())
        setTimeout(scrollToBottom, 150)
      }
    } catch {
      // non bloquant
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'messages') loadMessages()
  }, [activeTab, loadMessages])

  // Socket.io : messages en temps réel de toute la famille
  useEffect(() => {
    const familyName = userData?.nomFamille
    if (!familyName || !userData?.numeroH || activeTab !== 'messages') return

    const socket = getSocket()
    socket.emit('join-family', familyName)

    const onFamilyMsg = (msg: FamilyMessage) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(scrollToBottom, 100)
    }

    socket.on('family-message', onFamilyMsg)
    return () => { socket.off('family-message', onFamilyMsg) }
  }, [userData?.nomFamille, userData?.numeroH, activeTab])

  useEffect(() => {
    return () => { disconnectSocket() }
  }, [])

  const loadGallery = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setGalleryLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/family/shared-gallery`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setGalleryItems(data.items || [])
      }
    } finally {
      setGalleryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'galerie') loadGallery()
  }, [activeTab, loadGallery])

  const sendGalleryPhotoToChat = async (item: GalleryItem) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/family-tree/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Photo de la galerie (${ALBUM_LABELS[item.album]?.label || item.album})`,
          messageType: item.type === 'video' ? 'video' : 'image',
          mediaUrl: item.url,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.message) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
        setActiveTab('messages')
        setTimeout(scrollToBottom, 100)
      }
    } catch {
      // non bloquant
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return
    const token = localStorage.getItem('token')
    if (!token) return
    setIsSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/family-tree/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim(), messageType: 'text' }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.message) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
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

  // Vérifie la durée d'un fichier vidéo ou audio avant envoi (max 30s)
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
    const token = localStorage.getItem('token')
    if (!token) return
    const ok = await checkMediaDuration(file)
    if (!ok) return
    setIsSending(true)
    try {
      const formData = new FormData()
      formData.append('media', file)
      const res = await fetch(`${API_BASE}/api/family-tree/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.success && data.message) {
        setMessages(prev => {
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
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    sendMediaMessage(file)
    event.target.value = ''
  }

  const startAudioRecording = useCallback(async () => {
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
        setRecordingSeconds(0)
      }
      mr.start(200)
      mediaRecorderRef.current = mr
      setIsRecording(true)
      let secs = 0
      recordingTimerRef.current = setInterval(() => {
        secs++
        setRecordingSeconds(secs)
        if (secs >= 30) stopAudioRecording()
      }, 1000)
    } catch {
      alert('Impossible d\'accéder au microphone')
    }
  }, [isRecording, sendMediaMessage])

  const stopAudioRecording = useCallback(() => {
    if (!isRecording) return
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [isRecording])

  const formatTime = (iso?: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="communication-hub">
      <div className="hub-header">
        <h3>Centre de Communication</h3>
        <div className="hub-tabs">
          <button 
            className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            Messages
          </button>
          {showGroups && (
            <button 
              className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              Groupes
            </button>
          )}
          {showBroadcast && (
            <button
              className={`tab ${activeTab === 'broadcast' ? 'active' : ''}`}
              onClick={() => setActiveTab('broadcast')}
            >
              Diffusion
            </button>
          )}
          {showGallery && (
            <button
              className={`tab ${activeTab === 'galerie' ? 'active' : ''}`}
              onClick={() => setActiveTab('galerie')}
              style={{ position: 'relative' }}
            >
              📸 Galerie
              {galleryItems.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: 'linear-gradient(135deg, #6366f1, #9333ea)',
                  color: 'white', borderRadius: '50%', width: '16px', height: '16px',
                  fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700'
                }}>
                  {galleryItems.length > 99 ? '99+' : galleryItems.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="hub-content">
        {activeTab === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '420px', background: '#f3f4f6' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {loadingMessages ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>
                  Chargement des messages...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px', gap: '4px', textAlign: 'center' }}>
                  <p>Aucun message pour le moment.</p>
                  <p>Soyez le premier à écrire à votre famille.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {messages.map(message => {
                    const isMe = message.numeroH === userData.numeroH
                    return (
                      <div key={message.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%',
                          padding: '8px 12px',
                          borderRadius: '16px',
                          background: isMe ? '#22a722' : 'white',
                          color: isMe ? 'white' : '#111827',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        }}>
                          {!isMe && (
                            <p style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '2px' }}>
                              {message.authorName || 'Membre de la famille'}
                            </p>
                          )}
                          {(message.messageType === 'text' || !message.messageType) && (
                            <p style={{ fontSize: '14px', whiteSpace: 'pre-line', margin: 0 }}>{message.content}</p>
                          )}
                          {message.mediaUrl && message.messageType === 'image' && (
                            <img src={message.mediaUrl} alt="" style={{ marginTop: '4px', borderRadius: '8px', maxHeight: '220px', objectFit: 'cover', width: '100%' }} />
                          )}
                          {message.mediaUrl && message.messageType === 'video' && (
                            <video src={message.mediaUrl} controls style={{ marginTop: '4px', borderRadius: '8px', maxHeight: '220px', width: '100%' }} />
                          )}
                          {message.mediaUrl && message.messageType === 'audio' && (
                            <audio src={message.mediaUrl} controls style={{ marginTop: '4px', width: '100%' }} />
                          )}
                          <p style={{ fontSize: '10px', marginTop: '4px', marginBottom: 0, opacity: 0.7 }}>
                            {formatTime(message.createdAt || message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', background: '#fafafa', padding: '10px' }}>
              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                  🎤 {recordingSeconds}s / 30s — relâchez pour envoyer
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }} title="Envoyer une photo ou vidéo">
                  📷
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
                  style={{ flex: 1, minWidth: 0, padding: '8px 14px', borderRadius: '999px', border: '1px solid #d1d5db', fontSize: '14px' }}
                />
                <button
                  type="button"
                  onMouseDown={startAudioRecording}
                  onMouseUp={stopAudioRecording}
                  onMouseLeave={stopAudioRecording}
                  onTouchStart={(e) => { e.preventDefault(); startAudioRecording() }}
                  onTouchEnd={(e) => { e.preventDefault(); stopAudioRecording() }}
                  disabled={isSending}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                    background: isRecording ? '#ef4444' : 'white',
                    border: isRecording ? 'none' : '1px solid #e5e7eb',
                    color: isRecording ? 'white' : '#6b7280',
                  }}
                  title="Maintenir pour enregistrer un message vocal"
                >
                  🎤
                </button>
                {newMessage.trim() && (
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={isSending}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#16a34a', color: 'white', border: 'none', fontSize: '16px' }}
                  >
                    ➤
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showGroups && activeTab === 'groups' && (
          <div className="groups-container">
            <h3 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>Groupes de Communication</h3>
            <div className="groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', padding: '20px' }}>
              
              {/* Organisation ENFANTS */}
              <div className="group-card" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                borderRadius: '20px', 
                padding: '30px', 
                color: 'white',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}>
                <div className="group-icon" style={{ fontSize: '4rem', textAlign: 'center', marginBottom: '15px' }}>👶</div>
                <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '10px', fontWeight: '700' }}>ENFANTS</h2>
                <p style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '20px', opacity: '0.9' }}>
                  Espace dédié aux enfants (moins de 18 ans)<br/>
                  Enseignement des bonnes manières et éducation
                </p>
                <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' }}>
                  <span className="group-members" style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '20px' }}>
                    👥 15 membres actifs
                  </span>
                </div>
                <button className="btn" style={{ width: '100%', background: 'white', color: '#667eea', fontWeight: '700', padding: '12px', fontSize: '1.1rem' }}>
                  Rejoindre le organisation
                </button>
              </div>

              {/* Organisation HOMMES */}
              <div className="group-card" style={{ 
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
                borderRadius: '20px', 
                padding: '30px', 
                color: 'white',
                boxShadow: '0 10px 30px rgba(79, 172, 254, 0.3)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}>
                <div className="group-icon" style={{ fontSize: '4rem', textAlign: 'center', marginBottom: '15px' }}>👨</div>
                <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '10px', fontWeight: '700' }}>HOMMES</h2>
                <p style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '20px', opacity: '0.9' }}>
                  Espace réservé aux hommes<br/>
                  Éducation, conseils et discussions
                </p>
                <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' }}>
                  <span className="group-members" style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '20px' }}>
                    👥 30 membres actifs
                  </span>
                </div>
                <button className="btn" style={{ width: '100%', background: 'white', color: '#4facfe', fontWeight: '700', padding: '12px', fontSize: '1.1rem' }}>
                  Rejoindre le organisation
                </button>
              </div>

              {/* Organisation FEMMES */}
              <div className="group-card" style={{ 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
                borderRadius: '20px', 
                padding: '30px', 
                color: 'white',
                boxShadow: '0 10px 30px rgba(240, 147, 251, 0.3)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}>
                <div className="group-icon" style={{ fontSize: '4rem', textAlign: 'center', marginBottom: '15px' }}>👩</div>
                <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '10px', fontWeight: '700' }}>FEMMES</h2>
                <p style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '20px', opacity: '0.9' }}>
                  Espace réservé aux femmes<br/>
                  Éducation, conseils et discussions
                </p>
                <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' }}>
                  <span className="group-members" style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '20px' }}>
                    👥 25 membres actifs
                  </span>
                </div>
                <button className="btn" style={{ width: '100%', background: 'white', color: '#f5576c', fontWeight: '700', padding: '12px', fontSize: '1.1rem' }}>
                  Rejoindre le organisation
                </button>
              </div>

            </div>
          </div>
        )}

        {showBroadcast && activeTab === 'broadcast' && (
          <div className="broadcast-container">
            <h4>Diffusion de Contenu</h4>
            <div className="broadcast-form">
              <textarea
                placeholder="Partagez quelque chose avec la communauté..."
                className="broadcast-textarea"
              ></textarea>
              <div className="broadcast-actions">
                <label className="file-upload-btn">
                  📷 Photos/Vidéos
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    style={{ display: 'none' }}
                  />
                </label>
                <button className="btn">Publier</button>
              </div>
            </div>
          </div>
        )}

        {showGallery && activeTab === 'galerie' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header galerie */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
              padding: '16px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ color: 'white', margin: 0, fontSize: '15px', fontWeight: '700' }}>
                  📸 Galerie Familiale
                </h4>
                <a
                  href="/galerie-famille"
                  style={{
                    fontSize: '11px', color: '#c7d2fe',
                    textDecoration: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '4px 10px', borderRadius: '12px',
                  }}
                >
                  Voir tout →
                </a>
              </div>
              {/* Filtres albums */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: 'Tous', emoji: '🖼️' },
                  { key: 'rencontre', label: 'Rencontre', emoji: '💑' },
                  { key: 'bapteme', label: 'Baptême', emoji: '👶' },
                  { key: 'mariage', label: 'Mariage', emoji: '💍' },
                  { key: 'deces', label: 'Deuil', emoji: '🕊️' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setGalleryFilter(f.key)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: galleryFilter === f.key
                        ? 'linear-gradient(135deg, #6366f1, #9333ea)'
                        : 'rgba(255,255,255,0.15)',
                      color: 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    {f.emoji} {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu galerie */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#f9fafb' }}>
              {galleryLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
                  <p style={{ fontSize: '13px' }}>Chargement...</p>
                </div>
              ) : galleryItems.filter(i => galleryFilter === 'all' || i.album === galleryFilter).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📷</div>
                  <p style={{ fontSize: '13px' }}>Aucune photo dans cet album</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                }}>
                  {galleryItems
                    .filter(i => galleryFilter === 'all' || i.album === galleryFilter)
                    .map(item => {
                      const alb = ALBUM_LABELS[item.album]
                      return (
                        <div
                          key={item.id}
                          style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            background: '#e5e7eb',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                          }}
                          onClick={() => setGalleryLightbox(item)}
                        >
                          {item.type === 'video' ? (
                            <video
                              src={item.url}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              muted
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt={alb?.label || ''}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                          )}
                          {/* Album emoji */}
                          <div style={{
                            position: 'absolute', top: '3px', left: '3px',
                            fontSize: '12px', lineHeight: 1,
                          }}>
                            {alb?.emoji}
                          </div>
                          {/* Send to chat overlay */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(99,102,241,0.0)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s',
                          }}
                            className="gallery-hover-overlay"
                          />
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Lightbox mini dans le chat */}
            {galleryLightbox && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '16px',
              }}
                onClick={() => setGalleryLightbox(null)}
              >
                <div
                  style={{ maxWidth: '100%', maxHeight: '70%', position: 'relative' }}
                  onClick={e => e.stopPropagation()}
                >
                  {galleryLightbox.type === 'video' ? (
                    <video
                      src={galleryLightbox.url}
                      controls autoPlay
                      style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: '12px' }}
                    />
                  ) : (
                    <img
                      src={galleryLightbox.url}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: '12px', objectFit: 'contain' }}
                    />
                  )}
                </div>
                {/* Info + bouton envoyer */}
                <div style={{
                  marginTop: '12px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '8px',
                }}
                  onClick={e => e.stopPropagation()}
                >
                  <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                    {ALBUM_LABELS[galleryLightbox.album]?.emoji} {ALBUM_LABELS[galleryLightbox.album]?.label} — {galleryLightbox.uploaderName}
                  </p>
                  <button
                    onClick={() => {
                      sendGalleryPhotoToChat(galleryLightbox)
                      setGalleryLightbox(null)
                    }}
                    style={{
                      padding: '8px 20px',
                      background: 'linear-gradient(135deg, #6366f1, #9333ea)',
                      color: 'white', border: 'none',
                      borderRadius: '20px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: '700',
                      boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                    }}
                  >
                    Envoyer à la famille
                  </button>
                  <button
                    onClick={() => setGalleryLightbox(null)}
                    style={{
                      color: 'rgba(255,255,255,0.6)', background: 'none',
                      border: 'none', cursor: 'pointer', fontSize: '12px',
                    }}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
