import { useState, useRef, useEffect } from 'react'

interface VideoRecorderProps {
  onVideoRecorded: (videoBlob: Blob) => void
  /** Durée max d'enregistrement en secondes (défaut 10) */
  maxDuration?: number
}

export function VideoRecorder({ onVideoRecorded, maxDuration = 10 }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [hasPermission, setHasPermission] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const safeMaxSeconds = Math.min(maxDuration, 240)
  const maxDurationMs = safeMaxSeconds * 1000 // secondes → millisecondes

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const applyStream = (stream: MediaStream) => {
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.style.display = 'block'
      videoRef.current.style.visibility = 'visible'
      videoRef.current.style.opacity = '1'
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {})
      }
      videoRef.current.onplay = () => { setCameraReady(true) }
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().then(() => setCameraReady(true)).catch(() => {})
        }
      }, 100)
    }
    setHasPermission(true)
  }

  const startCamera = async () => {
    setError(null)

    // --- Infos de diagnostic affichées à l'écran ---
    const protocol = location.protocol
    const hostname = location.hostname
    const hasMediaDevices = !!(navigator.mediaDevices)
    const hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia)
    const diagBase = `[DIAG] protocole=${protocol} host=${hostname} mediaDevices=${hasMediaDevices} getUserMedia=${hasGetUserMedia}`

    if (!hasMediaDevices || !hasGetUserMedia) {
      setError(`Caméra non disponible dans ce contexte.\n${diagBase}`)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      })
      applyStream(stream)
    } catch (err: any) {
      const name: string = err?.name ?? 'inconnu'
      const message: string = err?.message ?? ''
      // Afficher l'erreur brute + le diagnostic pour pouvoir identifier la vraie cause
      setError(`ERREUR: ${name}\nDétail: ${message}\n${diagBase}`)
    }
  }

  const startRecording = () => {
    if (!streamRef.current) {
      setError('Aucun flux vidéo disponible. Veuillez d\'abord démarrer la caméra.')
      return
    }

    try {
      // Essayer différents codecs selon la compatibilité du navigateur
      let mimeType = 'video/webm;codecs=vp9,opus'
      const codecs = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ]
      
      // Trouver le premier codec supporté
      for (const codec of codecs) {
        if (MediaRecorder.isTypeSupported(codec)) {
          mimeType = codec
          console.log('✅ Codec sélectionné:', mimeType)
          break
        }
      }
      
      console.log('🎬 Démarrage de l\'enregistrement avec:', mimeType)
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: mimeType
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' })
        onVideoRecorded(videoBlob)
        setIsRecording(false)
        setIsPaused(false)
        setDuration(0)
      }

      mediaRecorder.start(1000) // Collecter les données chaque seconde
      setIsRecording(true)
      
      // Timer pour la durée
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1000
          if (newDuration >= maxDurationMs) {
            stopRecording()
            return maxDurationMs
          }
          return newDuration
        })
      }, 1000)

    } catch (err) {
      setError('Erreur lors du démarrage de l\'enregistrement')
      console.error('Erreur enregistrement:', err)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        setIsPaused(false)
      } else {
        mediaRecorderRef.current.pause()
        setIsPaused(true)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = (duration / maxDurationMs) * 100

  if (!hasPermission) {
    return (
      <div className="video-recorder">
        <div className="camera-setup">
          <h3>Configuration de la caméra</h3>
          <p>Pour enregistrer votre vidéo, nous avons besoin d'accéder à votre caméra et microphone.</p>
          <button className="btn" onClick={startCamera}>
            Autoriser l'accès à la caméra
          </button>
          {error && (
            <div className="error" style={{ whiteSpace: 'pre-line', marginTop: '12px', padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem', lineHeight: '1.6' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="video-recorder">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-preview"
          style={{
            width: '100%',
            height: '400px',
            objectFit: 'cover',
            backgroundColor: '#000',
            transform: 'scaleX(-1)', // Miroir pour se voir comme dans un miroir
            visibility: 'visible',
            opacity: 1,
            display: 'block',
            position: 'relative',
            zIndex: 1
          }}
        />
        
        {isRecording && (
          <div className="recording-overlay">
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>ENREGISTREMENT</span>
            </div>
            <div className="recording-timer">
              {formatTime(duration)} / {maxDuration}s
            </div>
          </div>
        )}
      </div>

      <div className="recording-controls">
        {!isRecording ? (
          <div className="recording-buttons">
            <button className="btn" onClick={startRecording}>
              Commencer l'enregistrement
            </button>
            {!cameraReady && (
              <button className="btn secondary" onClick={startCamera}>
                🔄 Redémarrer la caméra
              </button>
            )}
          </div>
        ) : (
          <div className="recording-buttons">
            <button 
              className={`btn ${isPaused ? 'secondary' : ''}`}
              onClick={pauseRecording}
            >
              {isPaused ? 'Reprendre' : 'Pause'}
            </button>
            <button className="btn" onClick={stopRecording}>
              Arrêter
            </button>
          </div>
        )}
      </div>

      {isRecording && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            {formatTime(duration)} / {maxDuration}s
          </div>
        </div>
      )}
    </div>
  )
}
