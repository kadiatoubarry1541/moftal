import { useState, useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'

interface CallModalProps {
  socket: Socket
  currentUser: { numeroH: string; prenom: string; nomFamille: string }
  // Appel sortant
  outgoingCall?: { to: string; toName: string; callType: 'audio' | 'video' } | null
  // Appel entrant
  incomingCall?: { from: string; callerName: string; offer: RTCSessionDescriptionInit; callType: 'audio' | 'video' } | null
  onClose: () => void
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

type CallState = 'calling' | 'receiving' | 'connected' | 'ended'

export default function CallModal({ socket, currentUser, outgoingCall, incomingCall, onClose }: CallModalProps) {
  const [callState, setCallState] = useState<CallState>(outgoingCall ? 'calling' : 'receiving')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [duration, setDuration] = useState(0)
  const [callType, setCallType] = useState<'audio' | 'video'>(
    outgoingCall?.callType || incomingCall?.callType || 'audio'
  )

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const remoteNameRef = useRef(outgoingCall?.toName || incomingCall?.callerName || 'Correspondant')

  const endCall = useCallback((notify = true) => {
    if (durationRef.current) clearInterval(durationRef.current)

    if (notify) {
      const targetId = outgoingCall?.to || incomingCall?.from
      if (targetId) socket.emit('call-end', { to: targetId })
    }

    localStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current = null
    setCallState('ended')
    setTimeout(onClose, 1000)
  }, [socket, outgoingCall, incomingCall, onClose])

  // Crée RTCPeerConnection et récupère le stream local
  const setupPeerConnection = useCallback(async (isCallerSide: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    // Stream local
    const constraints = callType === 'video'
      ? { audio: true, video: { width: 640, height: 480 } }
      : { audio: true, video: false }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    // Stream distant
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
    }

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const to = isCallerSide ? outgoingCall!.to : incomingCall!.from
        socket.emit('ice-candidate', { to, candidate: e.candidate })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected')
        durationRef.current = setInterval(() => setDuration(d => d + 1), 1000)
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall(false)
      }
    }

    return pc
  }, [callType, socket, outgoingCall, incomingCall, endCall])

  // ── Appel sortant ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!outgoingCall) return
    let cancelled = false;

    (async () => {
      try {
        const pc = await setupPeerConnection(true)
        if (cancelled) return
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('call-offer', {
          to: outgoingCall.to,
          offer,
          callType,
          callerName: `${currentUser.prenom} ${currentUser.nomFamille}`
        })
      } catch {
        if (!cancelled) endCall(false)
      }
    })()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Appel entrant : répondre ───────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!incomingCall) return
    try {
      const pc = await setupPeerConnection(false)
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('call-answer', { to: incomingCall.from, answer })
    } catch {
      endCall(false)
    }
  }, [incomingCall, setupPeerConnection, socket, endCall])

  // ── Refuser l'appel entrant ────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (incomingCall) socket.emit('call-rejected', { to: incomingCall.from })
    onClose()
  }, [socket, incomingCall, onClose])

  // ── Écoute des événements socket ──────────────────────────────────────────
  useEffect(() => {
    const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
      }
    }

    const handleIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      }
    }

    const handleEnd = () => endCall(false)
    const handleRejected = () => endCall(false)

    socket.on('call-answered', handleAnswer)
    socket.on('ice-candidate', handleIce)
    socket.on('call-ended', handleEnd)
    socket.on('call-rejected', handleRejected)

    return () => {
      socket.off('call-answered', handleAnswer)
      socket.off('ice-candidate', handleIce)
      socket.off('call-ended', handleEnd)
      socket.off('call-rejected', handleRejected)
    }
  }, [socket, endCall])

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      durationRef.current && clearInterval(durationRef.current)
      localStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const toggleMute = () => {
    const audio = localStreamRef.current?.getAudioTracks()[0]
    if (audio) { audio.enabled = !audio.enabled; setIsMuted(!isMuted) }
  }

  const toggleVideo = () => {
    const video = localStreamRef.current?.getVideoTracks()[0]
    if (video) { video.enabled = !video.enabled; setIsVideoOff(!isVideoOff) }
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const remoteName = remoteNameRef.current

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 px-6 pt-8 pb-4 text-center">
          <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-4xl mx-auto mb-3">
            {callType === 'video' ? '📹' : '📞'}
          </div>
          <p className="text-white text-xl font-bold">{remoteName}</p>
          <p className="text-gray-400 text-sm mt-1">
            {callState === 'calling' && 'Appel en cours...'}
            {callState === 'receiving' && 'Appel entrant'}
            {callState === 'connected' && formatDuration(duration)}
            {callState === 'ended' && 'Appel terminé'}
          </p>
        </div>

        {/* Vidéo (si appel vidéo) */}
        {callType === 'video' && callState === 'connected' && (
          <div className="relative bg-black" style={{ height: '200px' }}>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video ref={localVideoRef} autoPlay playsInline muted
              className="absolute bottom-2 right-2 w-24 h-16 object-cover rounded-xl border-2 border-white/30" />
          </div>
        )}
        {callType === 'video' && callState !== 'connected' && (
          <div className="bg-black" style={{ height: '60px' }} />
        )}

        {/* Contrôles */}
        <div className="px-6 py-6">
          {callState === 'receiving' ? (
            // Boutons répondre / refuser
            <div className="flex justify-around">
              <button onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-2xl shadow-lg transition-transform active:scale-90">
                📵
              </button>
              <button onClick={answerCall}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-2xl shadow-lg transition-transform active:scale-90">
                📞
              </button>
            </div>
          ) : (
            // Contrôles pendant l'appel
            <div className="flex justify-around items-center">
              <button onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}>
                {isMuted ? '🔇' : '🎤'}
              </button>

              {callType === 'video' && (
                <button onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${isVideoOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  {isVideoOff ? '📷' : '📹'}
                </button>
              )}

              <button onClick={() => endCall(true)}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-2xl shadow-lg transition-transform active:scale-90">
                📵
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
