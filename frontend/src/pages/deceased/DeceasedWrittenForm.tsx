import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoRecorder } from '../../components/VideoRecorder'
import { FAMILLES, ETHNIES, ETHNIE_CODES, FAMILLE_CODES } from '../../utils/constants'

interface DeceasedWrittenData {
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

export function DeceasedWrittenForm() {
  const [data, setData] = useState<DeceasedWrittenData>({
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
  const [step, setStep] = useState<'form' | 'video'>('form')
  const navigate = useNavigate()

  const calculateDecet = (dateDeces: string): string => {
    if (!dateDeces) return ''
    const deathDate = new Date(dateDeces)
    const deathYear = deathDate.getFullYear()
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

  const generateNumeroHD = (d: DeceasedWrittenData): string => {
    const decet = calculateDecet(d.dateDeces)
    const generation = calculateGeneration(d.dateNaissance)
    const continent = 'C1'
    const pays = d.pays === 'Guinée' ? 'P2' : 'P1'
    
    const regionCodes: { [key: string]: string } = {
      'Basse-Guinée': 'R1',
      'Fouta-Djallon': 'R2',
      'Haute-Guinée': 'R3',
      'Guinée forestière': 'R4'
    }
    
    const ethnieEntry = ETHNIE_CODES.find(e => e.label === d.ethnie)
    const familleEntry = FAMILLE_CODES.find(f => f.label.toLowerCase() === (d.famille || '').toLowerCase())
    
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
    
    const regionCode = regionCodes[d.region] || 'R1'
    const ethnieCode = ethnieEntry?.code || generateAutoCode(d.ethnie || '', 'E', ETHNIE_CODES.map(e => e.code))
    const familleCode = familleEntry?.code || generateAutoCode(d.famille || '', 'F', FAMILLE_CODES.map(f => f.code))
    
    const counter = localStorage.getItem('numeroHD_counter') || '0'
    const nextNumber = parseInt(counter) + 1
    localStorage.setItem('numeroHD_counter', nextNumber.toString())
    
    return `${decet}${generation}${continent}${pays}${regionCode}${ethnieCode}${familleCode} ${nextNumber}`
  }

  const handleVideoRecorded = (videoBlob: Blob) => {
    setData(prev => ({ ...prev, video: videoBlob }))
  }

  const handleSubmit = () => {
    if (!data.relationDeclarant) {
      alert('Merci de choisir votre lien de parenté avec ce défunt (mère, père, fils, fille, etc.).')
      return
    }
    const numeroHD = generateNumeroHD(data)
    const completeData = { 
      ...data, 
      numeroHD,
      decet: calculateDecet(data.dateDeces),
      generation: calculateGeneration(data.dateNaissance),
      age: calculateAge(data.dateNaissance, data.dateDeces),
      yearsSinceDeath: calculateYearsSinceDeath(data.dateDeces),
      relationDeclarant: data.relationDeclarant
    }
    
    // ✅ IMPORTANT : Les défunts n'ont PAS de compte, ils existent uniquement dans l'arbre généalogique
    localStorage.setItem('defunt_ecrit', JSON.stringify(completeData))
    localStorage.setItem('dernier_defunt', JSON.stringify(completeData))
    // Garder aussi la relation séparément pour compatibilité avec l'ancien flux
    localStorage.setItem('defunt_relation', data.relationDeclarant)
    
    // ❌ NE PAS créer de session - les défunts ne peuvent pas se connecter
    // Les défunts existent uniquement dans l'arbre généalogique pour consultation

    // Sauvegarder dans la liste des défunts pour l'arbre généalogique
    const sessionRaw = localStorage.getItem('session_user')
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw)
        const ownerNumeroH = (session.userData || session).numeroH
        if (ownerNumeroH) {
          const key = `deceased_members_${ownerNumeroH}`
          const existing = JSON.parse(localStorage.getItem(key) || '[]')
          existing.push({ ...completeData, relation: data.relationDeclarant || 'autre', ownerNumeroH })
          localStorage.setItem(key, JSON.stringify(existing))
        }
      } catch { /* ignore */ }
    }

    // Afficher le succès avec le numeroHD généré automatiquement
    alert(`✅ Défunt enregistré avec succès dans l'arbre généalogique !\n\nNumeroHD généré automatiquement : ${numeroHD}\n\n⚠️ IMPORTANT : Les défunts n'ont pas de compte de connexion.\nIls existent uniquement dans l'arbre généalogique familial pour consultation.`)
    
    // Rediriger vers l'arbre généalogique après 2 secondes
    setTimeout(() => {
      navigate('/famille/moi/arbre')
    }, 2000)
  }

  if (step === 'form') {
    return (
      <div className="stack">
        <h2>Informations du défunt (enregistrement par écrit)</h2>
        <div className="card">
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>NuméroH/HD (Père)</label>
                <input
                  value={data.numeroHPere}
                  onChange={(e) => setData(prev => ({ ...prev, numeroHPere: e.target.value }))}
                  placeholder="Ex: G1C1P1R1E1F1 1"
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>NuméroH/HD (Mère)</label>
                <input
                  value={data.numeroHMere}
                  onChange={(e) => setData(prev => ({ ...prev, numeroHMere: e.target.value }))}
                  placeholder="Ex: G1C1P1R1E1F1 2"
                />
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Continent</label>
                <select
                  value={data.continent}
                  onChange={(e) => setData(prev => ({ ...prev, continent: e.target.value }))}
                >
                  <option value="Afrique">Afrique</option>
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Date de naissance</label>
                <input
                  type="date"
                  value={data.dateNaissance}
                  onChange={(e) => {
                    const generation = calculateGeneration(e.target.value)
                    setData(prev => ({ ...prev, dateNaissance: e.target.value, generation }))
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Pays</label>
                <select
                  value={data.pays}
                  onChange={(e) => setData(prev => ({ ...prev, pays: e.target.value }))}
                >
                  <option value="">Sélectionner</option>
                  <option value="Égypte">Égypte</option>
                  <option value="Guinée">Guinée</option>
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Région</label>
                <select
                  value={data.region}
                  onChange={(e) => setData(prev => ({ ...prev, region: e.target.value }))}
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
          
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Ethnie</label>
                <select
                  value={data.ethnie}
                  onChange={(e) => setData(prev => ({ ...prev, ethnie: e.target.value }))}
                  className={data.ethnie ? 'border-green-500' : ''}
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
                  value={data.famille}
                  onChange={(e) => setData(prev => ({ ...prev, famille: e.target.value }))}
                  className={data.famille ? 'border-green-500' : ''}
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
                  value={data.dateDeces}
                  onChange={(e) => {
                    const decet = calculateDecet(e.target.value)
                    setData(prev => ({ ...prev, dateDeces: e.target.value, decet }))
                  }}
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Lieu de décès</label>
                <input
                  value={data.lieuDeces}
                  onChange={(e) => setData(prev => ({ ...prev, lieuDeces: e.target.value }))}
                  placeholder="Ville / village / hôpital..."
                />
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Votre lien avec ce défunt</label>
                <select
                  value={data.relationDeclarant}
                  onChange={(e) => setData(prev => ({ ...prev, relationDeclarant: e.target.value }))}
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
            <div className="col-6">
              <div className="field">
                <label>Religion</label>
                <input
                  value={data.religion}
                  onChange={(e) => setData(prev => ({ ...prev, religion: e.target.value }))}
                  placeholder="Ex: Islam, Christianisme..."
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Photo de preuve d'existence</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setData(prev => ({ ...prev, photo: file }))
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Génération (auto)</label>
                <input
                  value={data.generation}
                  readOnly
                  className="readonly"
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Décet (auto)</label>
                <input
                  value={data.decet}
                  readOnly
                  className="readonly"
                />
              </div>
            </div>
          </div>
          
          <div className="actions">
            <button
              className="btn"
              onClick={() => setStep('video')}
              disabled={!data.dateNaissance || !data.dateDeces || !data.pays || !data.region || !data.ethnie || !data.famille}
            >
              Passer à la vidéo
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'video') {
    return (
      <div className="stack">
        <h2>Vidéo du défunt (optionnelle)</h2>
        <div className="card">
          <VideoRecorder
            onVideoRecorded={handleVideoRecorded}
            maxDuration={30}
          />
          <div className="actions">
            <button className="btn secondary" onClick={() => setStep('form')}>
              Retour au formulaire
            </button>
            <button className="btn" onClick={handleSubmit}>
              Terminer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
