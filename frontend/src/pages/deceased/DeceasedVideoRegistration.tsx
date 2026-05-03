import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoRecorder } from '../../components/VideoRecorder'
import { FAMILLES, ETHNIES, ETHNIE_CODES, FAMILLE_CODES } from '../../utils/constants'

interface DeceasedVideoData {
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
  
  const navigate = useNavigate()

  const handleVideoRecorded = (videoBlob: Blob) => {
    setDeceasedData(prev => ({ ...prev, video: videoBlob }))
    setCurrentStep('complete')
  }

  const calculateDecet = (dateDeces: string): string => {
    if (!dateDeces) return ''
    
    const deathDate = new Date(dateDeces)
    const deathYear = deathDate.getFullYear()
    
    // Calcul basé sur 3870 av. J.-C. (mort d'Abel)
    const anneeDepart = -3869 // 3870 av. J.-C.
    const ecart = deathYear - anneeDepart
    const decetIndex = Math.floor(ecart / 63) + 1
    const decetNumber = Math.max(1, Math.min(200, decetIndex))
    
    return `D${decetNumber}`
  }

  const calculateGeneration = (dateNaissance: string): string => {
    if (!dateNaissance) return ''
    
    const birthDate = new Date(dateNaissance)
    const birthYear = birthDate.getFullYear()
    
    // Calcul basé sur 4004 av. J.-C. comme année 0
    const anneeDepart = -4003
    const ecart = birthYear - anneeDepart
    const generationIndex = Math.floor(ecart / 63) + 1
    const generationNumber = Math.max(1, Math.min(200, generationIndex))
    
    return `G${generationNumber}`
  }

  const calculateAge = (dateNaissance: string, dateDeces: string): number => {
    if (!dateNaissance || !dateDeces) return 0
    
    const birth = new Date(dateNaissance)
    const death = new Date(dateDeces)
    
    let age = death.getFullYear() - birth.getFullYear()
    const monthDiff = death.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const calculateYearsSinceDeath = (dateDeces: string): number => {
    if (!dateDeces) return 0
    
    const death = new Date(dateDeces)
    const now = new Date()
    
    let years = now.getFullYear() - death.getFullYear()
    const monthDiff = now.getMonth() - death.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < death.getDate())) {
      years--
    }
    
    return years
  }

  const generateNumeroHD = (data: DeceasedVideoData): string => {
    const decet = calculateDecet(data.dateDeces)
    const generation = calculateGeneration(data.dateNaissance)
    const continent = 'C1' // Afrique
    const pays = data.pays === 'Guinée' ? 'P2' : 'P1'
    
    // Codes pour les régions
    const regionCodes: { [key: string]: string } = {
      'Basse-Guinée': 'R1',
      'Fouta-Djallon': 'R2',
      'Haute-Guinée': 'R3',
      'Guinée forestière': 'R4'
    }
    
    // Utiliser les codes depuis constants.ts avec fallback automatique
    const ethnieEntry = ETHNIE_CODES.find(e => e.label === data.ethnie)
    const familleEntry = FAMILLE_CODES.find(f => f.label.toLowerCase() === (data.famille || '').toLowerCase())
    
    // Générer un code automatique si non trouvé (système séquentiel adaptatif)
    const generateAutoCode = (name: string, prefix: string, existingCodes: string[]): string => {
      if (!name) return prefix + '999'
      // Trouver le plus grand numéro existant pour ce préfixe
      const existingNums = existingCodes
        .filter(c => c.startsWith(prefix))
        .map(c => {
          const numStr = c.substring(prefix.length)
          const num = parseInt(numStr, 10)
          return isNaN(num) ? 0 : num
        })
        .filter(n => n > 0)
      
      // Commencer au numéro suivant le plus grand existant
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
      return prefix + nextNum.toString() // Pas de zéros devant : E1, E2, E10, E100, etc.
    }
    
    const regionCode = regionCodes[data.region] || 'R1'
    const ethnieCode = ethnieEntry?.code || generateAutoCode(data.ethnie || '', 'E', ETHNIE_CODES.map(e => e.code))
    const familleCode = familleEntry?.code || generateAutoCode(data.famille || '', 'F', FAMILLE_CODES.map(f => f.code))
    
    // Générer un numéro unique
    const counter = localStorage.getItem('numeroHD_counter') || '0'
    const nextNumber = parseInt(counter) + 1
    localStorage.setItem('numeroHD_counter', nextNumber.toString())
    
    return `${decet}${generation}${continent}${pays}${regionCode}${ethnieCode}${familleCode} ${nextNumber}`
  }

  const handleSubmit = () => {
    if (!deceasedData.relationDeclarant) {
      alert('Merci de choisir votre lien de parenté avec ce défunt (mère, père, fils, fille, etc.).')
      return
    }
    if (!deceasedData.video) {
      alert('Veuillez enregistrer votre vidéo.')
      return
    }

    const numeroHD = generateNumeroHD(deceasedData)
    const completeData = { 
      ...deceasedData, 
      numeroHD,
      decet: calculateDecet(deceasedData.dateDeces),
      generation: calculateGeneration(deceasedData.dateNaissance),
      age: calculateAge(deceasedData.dateNaissance, deceasedData.dateDeces),
      yearsSinceDeath: calculateYearsSinceDeath(deceasedData.dateDeces),
      relationDeclarant: deceasedData.relationDeclarant
    }
    
    // Sauvegarder les données
    localStorage.setItem('defunt_video', JSON.stringify(completeData))
    // Garder aussi la relation séparément pour compatibilité avec l'ancien flux
    localStorage.setItem('defunt_relation', deceasedData.relationDeclarant)
    
    setCurrentStep('complete')
  }

  if (currentStep === 'form') {
    return (
      <div className="stack">
        <h2>Informations du défunt</h2>
        <div className="card">
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
                <label>Date de naissance</label>
                <input 
                  type="date"
                  value={deceasedData.dateNaissance}
                  onChange={(e) => {
                    const generation = calculateGeneration(e.target.value)
                    setDeceasedData(prev => ({ ...prev, dateNaissance: e.target.value, generation }))
                  }}
                />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Votre lien avec ce défunt</label>
                <select
                  value={deceasedData.relationDeclarant}
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, relationDeclarant: e.target.value }))}
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
                <small className="text-sm text-gray-600">
                  Ce lien permet de placer correctement ce défunt dans l'arbre.
                </small>
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Pays</label>
                <select value={deceasedData.pays} onChange={(e) => setDeceasedData(prev => ({ ...prev, pays: e.target.value }))}>
                  <option value="">Sélectionner</option>
                  <option value="Égypte">Égypte</option>
                  <option value="Guinée">Guinée</option>
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Région</label>
                <select value={deceasedData.region} onChange={(e) => setDeceasedData(prev => ({ ...prev, region: e.target.value }))}>
                  <option value="">Sélectionner</option>
                  <option value="Basse-Guinée">Basse-Guinée</option>
                  <option value="Fouta-Djallon">Fouta-Djallon</option>
                  <option value="Haute-Guinée">Haute-Guinée</option>
                  <option value="Guinée forestière">Guinée forestière</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Ethnie</label>
                <select 
                  value={deceasedData.ethnie} 
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, ethnie: e.target.value }))}
                  required
                  className={deceasedData.ethnie ? 'border-green-500' : ''}
                >
                  <option value="">🌍 Sélectionner une ethnie</option>
                  {ETHNIES.map(ethnie => (
                    <option key={ethnie} value={ethnie}>{ethnie}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Famille</label>
                <select 
                  value={deceasedData.famille} 
                  onChange={(e) => setDeceasedData(prev => ({ ...prev, famille: e.target.value }))}
                  required
                  className={deceasedData.famille ? 'border-green-500' : ''}
                >
                  <option value="">👨‍👩‍👧‍👦 Sélectionner un nom de famille</option>
                  {FAMILLES.map(famille => (
                    <option key={famille} value={famille}>{famille}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Date de décès</label>
                <input 
                  type="date"
                  value={deceasedData.dateDeces}
                  onChange={(e) => {
                    const decet = calculateDecet(e.target.value)
                    setDeceasedData(prev => ({ ...prev, dateDeces: e.target.value, decet }))
                  }}
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
                <label>Photo de preuve</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="user"
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
              disabled={!deceasedData.dateNaissance || !deceasedData.dateDeces || !deceasedData.pays || !deceasedData.region || !deceasedData.ethnie || !deceasedData.famille}
            >
              Enregistrer la vidéo
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 'video') {
    return (
      <div className="stack">
        <h2>Enregistrement Vidéo</h2>
        <div className="card">
          <VideoRecorder 
            onVideoRecorded={handleVideoRecorded}
            maxDuration={10}
          />
          <div className="actions">
            <button className="btn" onClick={handleSubmit}>
              Terminer
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 'complete') {
    const numeroHD = generateNumeroHD(deceasedData)
    const age = calculateAge(deceasedData.dateNaissance, deceasedData.dateDeces)
    const yearsSinceDeath = calculateYearsSinceDeath(deceasedData.dateDeces)
    
    return (
      <div className="stack">
        <h2>Enregistrement Terminé</h2>
        <div className="card success-card">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <h3>Merci pour votre inscription</h3>
            <p>L'enregistrement du défunt a été effectué avec succès.</p>
            <div className="numero-h-display">
              <h4>NumeroHD :</h4>
              <div className="numero-h-value">{numeroHD}</div>
              <p><strong>⚠️ IMPORTANT :</strong> Les défunts n'ont pas de compte de connexion.</p>
              <p>Ils existent uniquement dans l'arbre généalogique familial pour consultation.</p>
              <p>Ce numéro permet de retrouver les informations du défunt dans l'arbre généalogique.</p>
            </div>
            <div className="deceased-info">
              <h4>Informations calculées :</h4>
              <p><strong>Âge au décès :</strong> {age} ans</p>
              <p><strong>Années écoulées depuis le décès :</strong> {yearsSinceDeath} ans</p>
              <p><strong>Décet :</strong> {deceasedData.decet}</p>
              <p><strong>Génération :</strong> {deceasedData.generation}</p>
            </div>
          </div>
          <div className="actions">
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
