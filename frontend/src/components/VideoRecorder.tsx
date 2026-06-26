import { useState, useRef, useEffect } from 'react'

interface VideoRecorderProps {
  onVideoRecorded: (videoBlob: Blob) => void
  maxDuration?: number
}

export function VideoRecorder({ onVideoRecorded, maxDuration = 30 }: VideoRecorderProps) {
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number>(0)

  const captureRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFile = async (file: File) => {
    setError(null)
    setValidating(true)

    // Certains Android renvoient file.type vide — on vérifie par extension si besoin
    const mimeOk = file.type.startsWith('video/')
    const extOk = /\.(mp4|mov|avi|mkv|webm|3gp|3gpp|m4v|wmv|flv|ts|mts)$/i.test(file.name)
    if (file.type && !mimeOk && !extOk) {
      setError('Le fichier sélectionné n\'est pas une vidéo reconnue.')
      setValidating(false)
      return
    }

    if (file.size > 200 * 1024 * 1024) {
      setError('La vidéo est trop volumineuse (maximum 200 MB).')
      setValidating(false)
      return
    }

    const url = URL.createObjectURL(file)

    const duration = await new Promise<number>((resolve) => {
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      vid.onloadedmetadata = () => resolve(vid.duration)
      vid.onerror = () => resolve(NaN)
      // Timeout de sécurité si onloadedmetadata ne se déclenche pas
      setTimeout(() => resolve(NaN), 5000)
      vid.src = url
    })

    URL.revokeObjectURL(url)

    // NaN ou Infinity = durée non lisible → on laisse passer (le serveur vérifiera)
    const durationReadable = Number.isFinite(duration) && !Number.isNaN(duration)
    if (durationReadable && duration > maxDuration) {
      setError(
        `Vidéo trop longue : ${Math.round(duration)} secondes.\nMaximum autorisé : ${maxDuration} secondes.\nEnregistrez une vidéo plus courte puis réessayez.`
      )
      setValidating(false)
      return
    }

    const newUrl = URL.createObjectURL(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(newUrl)
    setVideoFile(file)
    setVideoDuration(Math.round(duration))
    onVideoRecorded(file)
    setValidating(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const reset = () => {
    setVideoFile(null)
    setError(null)
    setVideoDuration(0)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  if (videoFile && previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <video
          src={previewUrl}
          controls
          playsInline
          style={{ width: '100%', maxHeight: '360px', borderRadius: '10px', background: '#000' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          <div>
            <div style={{ fontWeight: 600, color: '#15803d', fontSize: '0.9rem' }}>Vidéo prête</div>
            <div style={{ color: '#166534', fontSize: '0.8rem' }}>{videoFile.name} — {videoDuration}s</div>
          </div>
        </div>
        <button
          className="btn secondary"
          onClick={reset}
          style={{ width: '100%' }}
        >
          Changer la vidéo
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', fontSize: '0.9rem', color: '#1e40af', lineHeight: '1.5' }}>
        Enregistrez une courte vidéo de présentation.<br />
        <strong>Durée maximum : {maxDuration} secondes.</strong>
      </div>

      {/* Filmer directement */}
      <input
        ref={captureRef}
        type="file"
        accept="video/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <button
        className="btn"
        onClick={() => captureRef.current?.click()}
        disabled={validating}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
      >
        <span style={{ fontSize: '1.3rem' }}>📷</span>
        Filmer maintenant
      </button>

      {/* Choisir depuis galerie */}
      <input
        ref={galleryRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <button
        className="btn secondary"
        onClick={() => galleryRef.current?.click()}
        disabled={validating}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
      >
        <span style={{ fontSize: '1.3rem' }}>🎞️</span>
        Choisir depuis la galerie
      </button>

      {validating && (
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', padding: '10px' }}>
          Vérification de la vidéo…
        </div>
      )}

      {error && (
        <div style={{ whiteSpace: 'pre-line', padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem', lineHeight: '1.6' }}>
          {error}
        </div>
      )}
    </div>
  )
}
