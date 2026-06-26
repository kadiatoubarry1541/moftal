import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoRecorder } from '../../components/VideoRecorder'
import { FAMILLES, ETHNIES, ETHNIE_CODES, FAMILLE_CODES } from '../../utils/constants'
import { api } from '../../utils/api'
import { uploadForRegistration } from '../../utils/uploadMedia'

interface DeceasedVideoData {
  prenom: string
  genre: string
  numeroHPere: string
  numeroHMere: string
  continent: string
  dateNaissance: string
  pays: string
  region: string
  ethnie: string
  famille: string
  dateDeces: string
  religion: string
  lieuDeces: string
  video: Blob | null
  photo: File | null
  decet: string
  generation: string
  relationDeclarant: string
}

export function DeceasedVideoRegistration() {
  const [deceasedData, setDeceasedData] = useState<DeceasedVideoData>({
    prenom: '',
    genre: 'HOMME',
    numeroHPere: '',
    numeroHMere: '',
    continent: 'Afrique',
    dateNaissance: '',
    pays: '',
    region: '',
    ethnie: '',
    famille: '',
    dateDeces: '',
    religion: '',
    lieuDeces: '',
    video: null,
    photo: null,
    decet: '',
    generation: '',
    relationDeclarant: ''
  })
  const [currentStep, setCurrentStep] = useState<'form' | 'video' | 'complete'>('form')
  const [loading, setLoading] = useState(false)
  const [savedNumeroHD, setSavedNumeroHD] = useState('')

  const navigate = useNavigate()

  const handleVideoRecorded = (videoBlob: Blob) => {
    setDeceasedData(prev => ({ ...prev, video: videoBlob }))
    // Ne pas avancer automatiquement — attendre que l'utilisateur clique "Terminer"
  }

  const calculateDecet = (dateDeces: string): string => {
    if (!dateDeces) return ''
    const deathYear = new Date(dateDeces).getFullYear()
    const anneeDepart = -3869
    const decetIndex = Math.floor((deathYear - anneeDepart) / 63) + 1
    return `D${Math.max(1, Math.min(200, decetIndex))}`
  }

  const calculateGeneration = (dateNaissance: string): string => {
    if (!dateNaissance) return ''
    const birthYear = new Date(dateNaissance).getFullYear()
    const anneeDepart = -4003
    const generationIndex = Math.floor((birthYear - anneeDepart) / 63) + 1
    return `G${Math.max(1, Math.min(200, generationIndex))}`
  }

  const calculateAge = (dateNaissance: string, dateDeces: string): number => {
    if (!dateNaissance || !dateDeces) return 0
    const birth = new Date(dateNaissance)
    const death = new Date(dateDeces)
    let age = death.getFullYear() - birth.getFullYear()
    const monthDiff = death.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())) age--
    return age
  }

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () =>
        typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Conversion impossible'))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  const handleSubmit = async () => {
    if (!deceasedData.video) {
      alert('Veuillez sélectionner ou enregistrer une vidéo.')
      return
    }
    if (!deceasedData.relationDeclarant) {
      alert('Merci de choisir votre lien de parenté avec ce défunt.')
      return
    }
    if (!deceasedData.prenom) {
      alert('Merci de saisir le prénom du défunt.')
      return
    }

    setLoading(true)

    try {
      // 1. Upload vidéo vers R2
      let videoUrl: string | null = null
      try {
        videoUrl = await uploadForRegistration(deceasedData.video, 'videos', 'video.mp4')
      } catch {
        // Fallback base64 si l'upload cloud échoue
        videoUrl = await blobToBase64(deceasedData.video)
      }

      // 2. Upload photo vers ImageKit (si fournie)
      let photoUrl: string | null = null
      if (deceasedData.photo) {
        try {
          photoUrl = await uploadForRegistration(deceasedData.photo, 'photos')
        } catch {
          // Photo non bloquante
        }
      }

      // 3. Construire les données complètes
      const decet = calculateDecet(deceasedData.dateDeces)
      const generation = calculateGeneration(deceasedData.dateNaissance)
      const age = calculateAge(deceasedData.dateNaissance, deceasedData.dateDeces)

      const completeData = {
        ...deceasedData,
        prenom: deceasedData.prenom,
        nomFamille: deceasedData.famille,
        genre: deceasedData.genre,
        regionOrigine: deceasedData.region,
        decet,
        generation,
        ageObtenu: age,
        video: videoUrl,
        photo: photoUrl,
        additionalInfo: {
          relationDeclarant: deceasedData.relationDeclarant,
          age,
        }
      }

      // 4. Appel backend → crée le DeceasedMember en base de données
      const result = await api.registerDeceased(completeData as any)

      if (result.success) {
        const numeroHD = result.deceased?.numeroHD || ''
        setSavedNumeroHD(numeroHD)

        // Sauvegarde localStorage pour compatibilité avec l'arbre
        localStorage.setItem('defunt_video', JSON.stringify({
          ...completeData,
          numeroHD,
        }))
        localStorage.setItem('defunt_relation', deceasedData.relationDeclarant)

        setCurrentStep('complete')
      } else {
        alert('Erreur : ' + (result.message || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Erreur enregistrement défunt:', error)
      alert('Erreur lors de l\'enregistrement. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 1 : FORMULAIRE
  // ══════════════════════════════════════════════════════════════════════════
  if (currentStep === 'form') {
    const formValid =
      !!deceasedData.prenom &&
      !!deceasedData.dateNaissance &&
      !!deceasedData.dateDeces &&
      !!deceasedData.pays &&
      !!deceasedData.region &&
      !!deceasedData.ethnie &&
      !!deceasedData.famille &&
      !!deceasedData.relationDeclarant

    return (
      <div className="stack">
        <h2>Informations du défunt</h2>
        <div className="card">

          {/* Prénom + Genre */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Prénom du défunt *</label>
                <input
                  value={deceasedData.prenom}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, prenom: e.target.value }))}
                  placeholder="Ex: Mamadou, Fatoumata..."
                  className={deceasedData.prenom ? 'border-green-500' : ''}
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Genre *</label>
                <select
                  value={deceasedData.genre}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, genre: e.target.value }))}
                >
                  <option value="HOMME">HOMME</option>
                  <option value="FEMME">FEMME</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lien de parenté */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Votre lien avec ce défunt *</label>
                <select
                  value={deceasedData.relationDeclarant}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, relationDeclarant: e.target.value }))}
                  className={deceasedData.relationDeclarant ? 'border-green-500' : ''}
                >
                  <option value="">Choisir un lien de parenté</option>
                  <option value="pere">Père</option>
                  <option value="mere">Mère</option>
                  <option value="fils">Fils</option>
                  <option value="fille">Fille</option>
                  <option value="grand-pere">Grand-père</option>
                  <option value="grand-mere">Grand-mère</option>
                  <option value="arriere-grand-pere">Arrière grand-père</option>
                  <option value="arriere-grand-mere">Arrière grand-mère</option>
                  <option value="autre">Autre membre de la famille</option>
                </select>
                <small className="text-sm text-gray-600">Ce lien permet de placer correctement ce défunt dans l'arbre.</small>
              </div>
            </div>
          </div>

          {/* NuméroH Père + Mère */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>NuméroH/HD (Père)</label>
                <input
                  value={deceasedData.numeroHPere}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, numeroHPere: e.target.value }))}
                  placeholder="Ex: G1C1P1R1E1F1 1"
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>NuméroH/HD (Mère)</label>
                <input
                  value={deceasedData.numeroHMere}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, numeroHMere: e.target.value }))}
                  placeholder="Ex: G1C1P1R1E1F1 2"
                />
              </div>
            </div>
          </div>

          {/* Continent + Date de naissance */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Continent</label>
                <select value={deceasedData.continent} onChange={(e) => setDeceasedData(prev => ({ ...prev, continent: e.target.value }))}>
                  <option value="Afrique">Afrique</option>
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Date de naissance *</label>
                <input
                  type="date"
                  value={deceasedData.dateNaissance}
                  onChange={(e) => {
                    const generation = calculateGeneration(e.target.value)
                    setDeceasedData(prev => ({ ...prev, dateNaissance: e.target.value, generation }))
                  }}
                  className={deceasedData.dateNaissance ? 'border-green-500' : ''}
                />
              </div>
            </div>
          </div>

          {/* Pays + Région */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Pays *</label>
                <select
                  value={deceasedData.pays}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, pays: e.target.value }))}
                  className={deceasedData.pays ? 'border-green-500' : ''}
                >
                  <option value="">Sélectionner</option>
                  <option value="Égypte">Égypte</option>
                  <option value="Guinée">Guinée</option>
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Région *</label>
                <select
                  value={deceasedData.region}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, region: e.target.value }))}
                  className={deceasedData.region ? 'border-green-500' : ''}
                >
                  <option value="">Sélectionner</option>
                  <option value="Basse-Guinée">Basse-Guinée</option>
                  <option value="Fouta-Djallon">Fouta-Djallon</option>
                  <option value="Haute-Guinée">Haute-Guinée</option>
                  <option value="Guinée forestière">Guinée forestière</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ethnie + Famille */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Ethnie *</label>
                <select
                  value={deceasedData.ethnie}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, ethnie: e.target.value }))}
                  className={deceasedData.ethnie ? 'border-green-500' : ''}
                >
                  <option value="">Sélectionner une ethnie</option>
                  {ETHNIES.map(ethnie => (
                    <option key={ethnie} value={ethnie}>{ethnie}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Famille (Nom) *</label>
                <select
                  value={deceasedData.famille}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, famille: e.target.value }))}
                  className={deceasedData.famille ? 'border-green-500' : ''}
                >
                  <option value="">Sélectionner un nom de famille</option>
                  {FAMILLES.map(famille => (
                    <option key={famille} value={famille}>{famille}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date décès + Lieu décès */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Date de décès *</label>
                <input
                  type="date"
                  value={deceasedData.dateDeces}
                  onChange={(e) => {
                    const decet = calculateDecet(e.target.value)
                    setDeceasedData(prev => ({ ...prev, dateDeces: e.target.value, decet }))
                  }}
                  className={deceasedData.dateDeces ? 'border-green-500' : ''}
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Lieu de décès</label>
                <input
                  value={deceasedData.lieuDeces}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, lieuDeces: e.target.value }))}
                  placeholder="Ville / village / hôpital..."
                />
              </div>
            </div>
          </div>

          {/* Religion + Photo */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Religion</label>
                <input
                  value={deceasedData.religion}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, religion: e.target.value }))}
                  placeholder="Ex: Islam, Christianisme..."
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Photo du défunt (optionnel)</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setDeceasedData(prev => ({ ...prev, photo: file }))
                  }}
                />
              </div>
            </div>
          </div>

          <div className="actions">
            <button
              className="btn"
              onClick={() => setCurrentStep('video')}
              disabled={!formValid}
              style={{ opacity: formValid ? 1 : 0.6, cursor: formValid ? 'pointer' : 'not-allowed' }}
            >
              {formValid ? '🎥 Enregistrer la vidéo →' : 'Remplir tous les champs obligatoires (*)'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 2 : VIDÉO
  // ══════════════════════════════════════════════════════════════════════════
  if (currentStep === 'video') {
    return (
      <div className="stack">
        <h2>Vidéo de témoignage</h2>
        <div className="card">
          <VideoRecorder
            onVideoRecorded={handleVideoRecorded}
            maxDuration={30}
          />

          {deceasedData.video && !loading && (
            <div className="actions" style={{ marginTop: '20px' }}>
              <button className="btn" onClick={handleSubmit}>
                ✅ Terminer l'enregistrement
              </button>
            </div>
          )}

          {loading && (
            <div style={{ marginTop: '20px', textAlign: 'center', padding: '16px', background: '#eff6ff', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
              <p style={{ color: '#1e40af', fontWeight: 600 }}>Envoi en cours…</p>
              <p style={{ color: '#3b82f6', fontSize: '0.85rem' }}>Upload de la vidéo et sauvegarde en base de données.</p>
            </div>
          )}

          {!deceasedData.video && (
            <div style={{ marginTop: '16px', padding: '14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '0.9rem', color: '#92400e' }}>
              Sélectionnez ou filmez votre vidéo ci-dessus, puis cliquez sur "Terminer l'enregistrement".
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <button className="btn secondary" onClick={() => setCurrentStep('form')}>
              ← Retour au formulaire
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 3 : CONFIRMATION
  // ══════════════════════════════════════════════════════════════════════════
  if (currentStep === 'complete') {
    const age = calculateAge(deceasedData.dateNaissance, deceasedData.dateDeces)

    return (
      <div className="stack">
        <h2>Enregistrement Terminé</h2>
        <div className="card success-card">
          <div className="success-content">
            <div className="success-icon" style={{ fontSize: '4rem', color: '#22c55e' }}>✓</div>
            <h3>Merci pour votre inscription</h3>
            <p>Le défunt a été enregistré avec succès dans la base de données.</p>

            {savedNumeroHD && (
              <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px' }}>
                <h4 style={{ color: '#15803d', marginBottom: '0.5rem' }}>NumeroHD :</h4>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534', fontFamily: 'monospace', textAlign: 'center', padding: '0.75rem', background: '#dcfce7', borderRadius: '8px' }}>
                  {savedNumeroHD}
                </div>
                <p style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '0.75rem' }}>
                  Ce numéro permet de retrouver le défunt dans l'arbre généalogique.
                </p>
              </div>
            )}

            <div className="deceased-info" style={{ textAlign: 'left', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <p><strong>Prénom :</strong> {deceasedData.prenom}</p>
              <p><strong>Famille :</strong> {deceasedData.famille}</p>
              {age > 0 && <p><strong>Âge au décès :</strong> {age} ans</p>}
              <p><strong>Décet :</strong> {deceasedData.decet}</p>
              <p><strong>Génération :</strong> {deceasedData.generation}</p>
            </div>
          </div>
          <div className="actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn" onClick={() => navigate('/')}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
