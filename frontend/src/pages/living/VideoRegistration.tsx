import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoRecorder } from '../../components/VideoRecorder'
import { api } from '../../utils/api'
import { uploadForRegistration } from '../../utils/uploadMedia'
import { LangButton } from '../../components/LangButton'
import {
  getAllCountries,
  getRegionsByCountry,
  getContinentAndRegionByCountry,
  getPrefecturesByRegion,
  WORLD_GEOGRAPHY,
} from '../../utils/worldGeography'
import { getCountryGeoLabels } from '../../utils/countryGeoStructure'
import { ETHNIE_CODES, FAMILLE_CODES, ETHNIES, FAMILLES } from '../../utils/constants'

interface VideoData {
  numeroHPere: string
  numeroHMere: string
  continent: string
  continentCode: string
  dateNaissance: string
  pays: string
  paysCode: string
  region: string
  regionCode: string
  prefecture: string
  prefectureCode: string
  sousPrefecture: string
  sousPrefectureCode: string
  quartier: string
  quartierCode: string
  ethnie: string
  famille: string
  activite1Autre?: string
  ethnieAutre?: string
  familleAutre?: string
  activiteDescription?: string
  activiteDoc?: File | null
  activitePreuve?: File | null
  prenom: string
  telephone: string
  email: string
  religion: string
  generation: string
  password: string
  confirmPassword: string
  video: Blob | null
  photo: File | null
  photoPreview: string | null
  genre: string
  handicap: string
  activite1: string
  activite2: string
  activite3: string
  lieu1: string
  lieu2: string
  lieu3: string
  numeroH?: string
}

export function VideoRegistration() {
  const [videoData, setVideoData] = useState<VideoData>({
    numeroHPere: '',
    numeroHMere: '',
    continent: '',
    continentCode: '',
    dateNaissance: '',
    pays: '',
    paysCode: '',
    region: '',
    regionCode: '',
    prefecture: '',
    prefectureCode: '',
    sousPrefecture: '',
    sousPrefectureCode: '',
    quartier: '',
    quartierCode: '',
    ethnie: '',
    famille: '',
    activite1Autre: '',
    ethnieAutre: '',
    familleAutre: '',
    activiteDescription: '',
    activiteDoc: null,
    activitePreuve: null,
    prenom: '',
    telephone: '',
    email: '',
    religion: '',
    generation: '',
    password: '',
    confirmPassword: '',
    video: null,
    photo: null,
    photoPreview: null,
    genre: 'HOMME',
    handicap: '',
    activite1: '',
    activite2: '',
    activite3: '',
    lieu1: '',
    lieu2: '',
    lieu3: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasShownReminder, setHasShownReminder] = useState(false)
  const [currentStep, setCurrentStep] = useState<'form' | 'video' | 'complete'>('form')
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set())
  const [paysSectionExpanded, setPaysSectionExpanded] = useState(true)

  const navigate = useNavigate()

  // ── Données géographiques ──────────────────────────────────────────────────
  const countries = useMemo(
    () =>
      getAllCountries()
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    []
  )
  const regions = useMemo(
    () => (videoData.paysCode ? getRegionsByCountry(videoData.paysCode) : []),
    [videoData.paysCode]
  )
  const geoLabels = useMemo(() => {
    const countryName = countries.find(
      (c) => c.code === videoData.paysCode && c.continentCode === videoData.continentCode
    )?.name || ''
    return getCountryGeoLabels(countryName)
  }, [videoData.paysCode, videoData.continentCode, countries])

  // ── Bloc Pays : résumé et fermeture au blur ────────────────────────────────
  const paysComplete = !!(
    videoData.paysCode &&
    videoData.region?.trim() &&
    videoData.prefecture?.trim() &&
    videoData.sousPrefecture?.trim() &&
    videoData.quartier?.trim()
  )
  const paysSummary = paysComplete
    ? [
        countries.find(
          (c) => c.code === videoData.paysCode && c.continentCode === videoData.continentCode
        )?.name || videoData.pays,
        videoData.region?.trim(),
        videoData.prefecture?.trim(),
        videoData.sousPrefecture?.trim(),
        videoData.quartier?.trim(),
      ]
        .filter(Boolean)
        .join(' › ')
    : ''

  const handlePaysSectionBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (paysComplete) setPaysSectionExpanded(false)
  }

  // ── États dérivés pour la progression ─────────────────────────────────────
  const ethnieFilled =
    videoData.ethnie === 'Autre'
      ? !!(videoData.ethnieAutre && videoData.ethnieAutre.trim())
      : !!videoData.ethnie
  const familleFilled =
    videoData.famille === 'Autre'
      ? !!(videoData.familleAutre && videoData.familleAutre.trim())
      : !!videoData.famille
  const activiteFilled =
    videoData.activite1 === 'Autre'
      ? !!(videoData.activite1Autre && videoData.activite1Autre.trim())
      : !!videoData.activite1
  const identiteOK = ethnieFilled && familleFilled && activiteFilled
  const coordonneesOK = identiteOK && !!videoData.prenom && !!videoData.telephone

  // ── CSS champs ─────────────────────────────────────────────────────────────
  const getFieldClassName = (fieldName: string, hasValue: boolean): string => {
    const base = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
    if (validationErrors.has(fieldName)) return `${base} border-red-500 border-2`
    if (hasValue) return `${base} border-green-500`
    return `${base} border-gray-300`
  }

  // ── Calcul génération ──────────────────────────────────────────────────────
  const calculateGeneration = (dateNaissance: string): string => {
    if (!dateNaissance) return ''
    const birthYear = new Date(dateNaissance).getFullYear()
    const generationNumber = Math.max(1, Math.min(200, Math.floor((birthYear - (-4003)) / 63) + 1))
    return `G${generationNumber}`
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateRequiredFields = (): boolean => {
    const errors = new Set<string>()
    if (!videoData.paysCode) errors.add('paysCode')
    if (!(videoData.region && videoData.region.trim())) errors.add('region')
    if (!(videoData.prefecture && videoData.prefecture.trim())) errors.add('prefecture')
    if (!(videoData.sousPrefecture && videoData.sousPrefecture.trim())) errors.add('sousPrefecture')
    if (!(videoData.quartier && videoData.quartier.trim())) errors.add('quartier')
    if (!ethnieFilled) errors.add('ethnie')
    if (!familleFilled) errors.add('famille')
    if (!activiteFilled) errors.add('activite1')
    if (!videoData.prenom) errors.add('prenom')
    if (!videoData.telephone) errors.add('telephone')
    if (!videoData.email) errors.add('email')
    if (!videoData.dateNaissance) errors.add('dateNaissance')
    if (!videoData.password) errors.add('password')
    if (!videoData.confirmPassword) errors.add('confirmPassword')
    if (videoData.password && videoData.confirmPassword && videoData.password !== videoData.confirmPassword)
      errors.add('confirmPassword')
    setValidationErrors(errors)
    return errors.size === 0
  }

  // ── Handlers photo ─────────────────────────────────────────────────────────
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Veuillez sélectionner un fichier image valide.'); return }
    if (file.size > 5 * 1024 * 1024) { alert('La photo doit faire moins de 5MB.'); return }
    const reader = new FileReader()
    reader.onload = (e) =>
      setVideoData((prev) => ({ ...prev, photo: file, photoPreview: e.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const removePhoto = () =>
    setVideoData((prev) => ({ ...prev, photo: null, photoPreview: null }))

  // ── Génération NumeroH ─────────────────────────────────────────────────────
  const generateNumeroH = async (data: VideoData): Promise<string> => {
    const generation = calculateGeneration(data.dateNaissance)
    const { continentCode: c } = data.paysCode
      ? getContinentAndRegionByCountry(data.paysCode)
      : { continentCode: 'C1' }
    const continentCode = data.continentCode || c
    const paysCode = data.paysCode || 'P1'
    const regionCode =
      data.regionCode ||
      (data.paysCode ? getContinentAndRegionByCountry(data.paysCode).regionCode : 'R1')

    const effectiveEthnie =
      data.ethnie === 'Autre' && data.ethnieAutre?.trim() ? data.ethnieAutre.trim() : data.ethnie
    const effectiveFamille =
      data.famille === 'Autre' && data.familleAutre?.trim() ? data.familleAutre.trim() : data.famille

    const ethnieEntry = ETHNIE_CODES.find((e) => e.label === effectiveEthnie)
    const familleEntry = FAMILLE_CODES.find((f) => f.label === effectiveFamille)

    const generateAutoCode = (name: string, prefix: string, existingCodes: string[]): string => {
      if (!name) return prefix + '999'
      const nums = existingCodes
        .filter((c) => c.startsWith(prefix))
        .map((c) => parseInt(c.substring(prefix.length), 10))
        .filter((n) => !isNaN(n) && n > 0)
      return prefix + (nums.length > 0 ? Math.max(...nums) + 1 : 1).toString()
    }

    const ethnieCode = ethnieEntry?.code || generateAutoCode(effectiveEthnie, 'E', ETHNIE_CODES.map((e) => e.code))
    const familleCode = familleEntry?.code || generateAutoCode(effectiveFamille, 'F', FAMILLE_CODES.map((f) => f.code))
    const prefix = `${generation}${continentCode}${paysCode}${regionCode}${ethnieCode}${familleCode}`
    const { generateUniqueNumeroH } = await import('../../utils/numeroHGenerator')
    return await generateUniqueNumeroH(prefix)
  }

  // ── Rappel credentials ─────────────────────────────────────────────────────
  const showCredentialsReminder = (numeroH: string, password: string) => {
    if (!numeroH || !password || hasShownReminder) return
    setHasShownReminder(true)
    alert(
      'Retenez bien votre NumeroH et votre mot de passe afin d\'avoir toujours accès à votre compte.\n\n' +
        `NumeroH : ${numeroH}\n` +
        `Mot de passe : ${password}`
    )
  }

  // ── Vidéo enregistrée ──────────────────────────────────────────────────────
  const handleVideoRecorded = (videoBlob: Blob) => {
    setVideoData((prev) => ({ ...prev, video: videoBlob }))
  }

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () =>
        typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Conversion impossible'))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  // ── Submit final ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (loading) return
    if (!videoData.video) { alert('Veuillez enregistrer votre vidéo.'); return }
    if (!validateRequiredFields()) {
      alert('Veuillez remplir tous les champs obligatoires (marqués en rouge).')
      document.querySelector('.border-red-500')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setLoading(true)

    const effectiveActivite1 =
      videoData.activite1 === 'Autre' && videoData.activite1Autre?.trim()
        ? videoData.activite1Autre.trim()
        : videoData.activite1
    const effectiveEthnie =
      videoData.ethnie === 'Autre' && videoData.ethnieAutre?.trim()
        ? videoData.ethnieAutre.trim()
        : videoData.ethnie
    const effectiveFamille =
      videoData.famille === 'Autre' && videoData.familleAutre?.trim()
        ? videoData.familleAutre.trim()
        : videoData.famille

    const normalizedData: VideoData = {
      ...videoData,
      activite1: effectiveActivite1,
      ethnie: effectiveEthnie,
      famille: effectiveFamille,
    }

    const numeroH = await generateNumeroH(normalizedData)

    const { continentCode: infCC } = normalizedData.paysCode
      ? getContinentAndRegionByCountry(normalizedData.paysCode)
      : { continentCode: 'C1' }
    const continentName =
      WORLD_GEOGRAPHY.find((c) => c.code === (normalizedData.continentCode || infCC))?.name || ''

    const inferred = {
      paysCode: normalizedData.paysCode,
      pays: countries.find((c) => c.code === normalizedData.paysCode && c.continentCode === normalizedData.continentCode)?.name || normalizedData.pays,
      continent: continentName,
      continentCode: normalizedData.continentCode || infCC,
      regionCode: normalizedData.regionCode || (normalizedData.paysCode ? getContinentAndRegionByCountry(normalizedData.paysCode).regionCode : 'R1'),
      region: normalizedData.region?.trim() || regions.find((r) => r.code === normalizedData.regionCode)?.name || '',
      prefecture: normalizedData.prefecture?.trim() || '',
      sousPrefecture: normalizedData.sousPrefecture?.trim() || '',
      quartier: normalizedData.quartier?.trim() || '',
    }

    setVideoData((prev) => ({ ...prev, numeroH }))

    const fileToBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

    // Upload vers le cloud (ImageKit pour photos, R2 pour vidéos)
    let photoUrl = normalizedData.photoPreview || null
    let videoUrl = null
    let activitePreuveUrl = null
    let activiteDocUrl = null

    try {
      if (normalizedData.photo) {
        photoUrl = await uploadForRegistration(normalizedData.photo, 'photos')
      }
      if (normalizedData.video) {
        videoUrl = await uploadForRegistration(normalizedData.video, 'videos', 'video.mp4')
      }
      if (normalizedData.activitePreuve) {
        activitePreuveUrl = await uploadForRegistration(normalizedData.activitePreuve, 'documents')
      }
      if (normalizedData.activiteDoc) {
        activiteDocUrl = await uploadForRegistration(normalizedData.activiteDoc, 'documents')
      }
    } catch (uploadErr) {
      console.warn('Upload cloud échoué, fallback base64:', uploadErr)
      // Fallback base64 si upload échoue
      if (normalizedData.video && !videoUrl) {
        videoUrl = await blobToBase64(normalizedData.video)
      }
      if (normalizedData.photo && !photoUrl) {
        const reader = new FileReader()
        photoUrl = await new Promise(r => { reader.onload = () => r(reader.result as string); reader.readAsDataURL(normalizedData.photo!) })
      }
    }

    const { activitePreuve: _p, activiteDoc: _d, ...restData } = normalizedData
    const completeData = {
      ...restData,
      ...inferred,
      numeroH,
      password: normalizedData.password,
      confirmPassword: normalizedData.confirmPassword,
      prenom: normalizedData.prenom,
      nomFamille: effectiveFamille,
      email: normalizedData.email?.trim() || `${numeroH}@example.com`,
      religion: normalizedData.religion?.trim() || '',
      handicap: normalizedData.handicap || '',
      genre: normalizedData.genre,
      photo: photoUrl,
      photoPreview: photoUrl,
      activitePreuve: activitePreuveUrl,
      activiteDoc: activiteDocUrl,
      lieu1: normalizedData.quartier?.trim() || normalizedData.lieu1 || '',
      video: videoUrl,
    }

    try {
      const result = await api.registerLiving(completeData as any)
      if (result.success) {
        const userDataWithPassword = { ...result.user, password: normalizedData.password, confirmPassword: normalizedData.confirmPassword }
        localStorage.setItem('vivant_video', JSON.stringify(userDataWithPassword))
        localStorage.setItem('dernier_vivant', JSON.stringify(userDataWithPassword))
        localStorage.setItem('session_user', JSON.stringify({
          numeroH,
          userData: userDataWithPassword,
          token: result.token || null,
          type: 'vivant',
          source: 'registration_video',
        }))
        if (result.token) localStorage.setItem('token', result.token)
        showCredentialsReminder(numeroH, normalizedData.password)
        navigate('/compte')
      } else {
        const details = (result as any).errors?.map((e: any) => `${e.path}: ${e.msg}`).join('\n')
        alert(`❌ Erreur: ${result.message}${details ? '\n\n' + details : ''}`)
      }
    } catch (error) {
      console.error('Erreur enregistrement:', error)
      alert('Erreur lors de l\'enregistrement. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 1 : FORMULAIRE (identique à WrittenRegistration)
  // ══════════════════════════════════════════════════════════════════════════
  if (currentStep === 'form') {
    const missingFields: string[] = []
    if (!videoData.dateNaissance) missingFields.push('Date de naissance')
    if (!videoData.paysCode) missingFields.push('Pays')
    if (!(videoData.region?.trim())) missingFields.push(geoLabels.level1.label)
    if (!(videoData.prefecture?.trim())) missingFields.push(geoLabels.level2.label)
    if (!(videoData.sousPrefecture?.trim())) missingFields.push(geoLabels.level3.label)
    if (!(videoData.quartier?.trim())) missingFields.push(geoLabels.level4.label)
    if (!ethnieFilled) missingFields.push('Ethnie')
    if (!familleFilled) missingFields.push('Nom de famille')
    if (!activiteFilled) missingFields.push('Activité principale')
    if (!videoData.prenom) missingFields.push('Prénom')
    if (!videoData.telephone) missingFields.push('Téléphone')
    if (!videoData.email) missingFields.push('E-mail')
    if (!videoData.password) missingFields.push('Mot de passe')
    if (!videoData.confirmPassword) missingFields.push('Confirmation du mot de passe')
    if (videoData.password && videoData.confirmPassword && videoData.password !== videoData.confirmPassword)
      missingFields.push('Les mots de passe ne correspondent pas')
    if (videoData.password && videoData.password.length < 6)
      missingFields.push('Le mot de passe doit contenir au moins 6 caractères')
    const isDisabled = missingFields.length > 0

    return (
      <div className="stack">
        <LangButton />
        <button onClick={() => navigate('/vivant')} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium w-fit bg-transparent border-none cursor-pointer p-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour
        </button>
        <h2>Inscription par vidéo — Informations</h2>
        <div className="card" style={{ maxWidth: '32rem', width: '100%' }}>

          {/* ── Date de naissance + Genre ── */}
          <div className="row">
            <div className="col-6">
              <div className="field">
                <label>Date de naissance *</label>
                <input
                  type="date"
                  value={videoData.dateNaissance}
                  onChange={(e) => {
                    const generation = calculateGeneration(e.target.value)
                    setVideoData((prev) => ({ ...prev, dateNaissance: e.target.value, generation }))
                    if (e.target.value) setValidationErrors((prev) => { const n = new Set(prev); n.delete('dateNaissance'); return n })
                  }}
                  required
                  className={getFieldClassName('dateNaissance', !!videoData.dateNaissance)}
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Genre</label>
                <select value={videoData.genre} onChange={(e) => setVideoData((prev) => ({ ...prev, genre: e.target.value }))}>
                  <option value="HOMME">HOMME</option>
                  <option value="FEMME">FEMME</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Bloc Pays collapsible (même logique que l'écrit) ── */}
          {videoData.dateNaissance && (
            <div className="field" style={{ animation: 'fadeInDown 0.3s ease' }} onBlur={handlePaysSectionBlur}>
              <label>Pays *</label>
              {paysComplete && !paysSectionExpanded ? (
                <div
                  role="button" tabIndex={0}
                  onClick={() => setPaysSectionExpanded(true)}
                  onKeyDown={(e) => e.key === 'Enter' && setPaysSectionExpanded(true)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 flex items-center justify-between transition-colors"
                >
                  <span className="text-gray-800">{paysSummary}</span>
                  <span className="text-gray-400 text-sm">▼</span>
                </div>
              ) : (
                <div className="space-y-3 p-4 border-2 border-gray-300 rounded-lg bg-white">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pays</label>
                    <select
                      value={videoData.continentCode && videoData.paysCode ? `${videoData.continentCode}_${videoData.paysCode}` : ''}
                      onChange={(e) => {
                        const [cc, pc] = e.target.value ? e.target.value.split('_') : ['', '']
                        const country = countries.find((c) => c.code === pc && c.continentCode === cc)
                        const firstRegion = country?.children?.[0]
                        setVideoData((prev) => ({
                          ...prev,
                          pays: country?.name || '',
                          paysCode: pc,
                          continentCode: cc,
                          continent: country ? '' : prev.continent,
                          region: '',
                          regionCode: firstRegion?.code || '',
                          prefecture: '',
                          prefectureCode: '',
                          sousPrefecture: '',
                          quartier: '',
                        }))
                        if (e.target.value) setValidationErrors((prev) => { const n = new Set(prev); n.delete('paysCode'); return n })
                      }}
                      required
                      className={getFieldClassName('paysCode', !!videoData.paysCode)}
                    >
                      <option value="">— Choisir un pays —</option>
                      {countries.map((c) => (
                        <option key={`${c.continentCode}_${c.code}`} value={`${c.continentCode}_${c.code}`}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {videoData.paysCode && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{geoLabels.level1.label} *</label>
                        <input
                          type="text"
                          value={videoData.region}
                          onChange={(e) => {
                            const v = e.target.value
                            const matched = regions.find((r) => r.name.toLowerCase() === v.trim().toLowerCase())
                            setVideoData((prev) => ({ ...prev, region: v, regionCode: matched?.code || '' }))
                            if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('region'); return n })
                          }}
                          list="region-list-video"
                          placeholder={geoLabels.level1.placeholder}
                          className={getFieldClassName('region', !!(videoData.region?.trim()))}
                        />
                        <datalist id="region-list-video">{regions.map((r) => <option key={r.code} value={r.name} />)}</datalist>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{geoLabels.level2.label} *</label>
                          <input
                            type="text"
                            value={videoData.prefecture}
                            onChange={(e) => {
                              const v = e.target.value
                              const prefectures = videoData.regionCode
                                ? getPrefecturesByRegion(videoData.regionCode, videoData.paysCode, videoData.continentCode)
                                : []
                              const matched = prefectures.find((p) => p.name.toLowerCase() === v.trim().toLowerCase())
                              setVideoData((prev) => ({ ...prev, prefecture: v, prefectureCode: matched?.code || '' }))
                              if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('prefecture'); return n })
                            }}
                            list="prefecture-list-video"
                            placeholder={geoLabels.level2.placeholder}
                            className={getFieldClassName('prefecture', !!(videoData.prefecture?.trim()))}
                          />
                          <datalist id="prefecture-list-video">
                            {(videoData.regionCode
                              ? getPrefecturesByRegion(videoData.regionCode, videoData.paysCode, videoData.continentCode)
                              : []
                            ).map((p) => <option key={p.code} value={p.name} />)}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{geoLabels.level3.label} *</label>
                          <input
                            type="text"
                            value={videoData.sousPrefecture}
                            onChange={(e) => {
                              const v = e.target.value
                              setVideoData((prev) => ({ ...prev, sousPrefecture: v }))
                              if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('sousPrefecture'); return n })
                            }}
                            placeholder={geoLabels.level3.placeholder}
                            className={getFieldClassName('sousPrefecture', !!(videoData.sousPrefecture?.trim()))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{geoLabels.level4.label} *</label>
                        <input
                          type="text"
                          value={videoData.quartier}
                          onChange={(e) => {
                            const v = e.target.value
                            setVideoData((prev) => ({ ...prev, quartier: v }))
                            if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('quartier'); return n })
                          }}
                          placeholder={geoLabels.level4.placeholder}
                          className={getFieldClassName('quartier', !!(videoData.quartier?.trim()))}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Activité principale ── */}
          {videoData.paysCode && (
            <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
              <div className="col-12">
                <div className="field">
                  <label>Activité principale *</label>
                  <select
                    value={videoData.activite1}
                    onChange={(e) => {
                      setVideoData((prev) => ({ ...prev, activite1: e.target.value, activite1Autre: '', activiteDescription: '', activiteDoc: null }))
                      if (e.target.value) setValidationErrors((prev) => { const n = new Set(prev); n.delete('activite1'); return n })
                    }}
                    required
                    className={getFieldClassName('activite1', !!videoData.activite1)}
                  >
                    <option value="">— Choisir une activité —</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Élevage">Élevage</option>
                    <option value="Pêche">Pêche</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Artisanat">Artisanat</option>
                    <option value="Transport">Transport</option>
                    <option value="Enseignement">Enseignement</option>
                    <option value="Santé">Santé</option>
                    <option value="Administration">Administration</option>
                    <option value="Informatique">Informatique</option>
                    <option value="Construction">Construction</option>
                    <option value="Mécanique">Mécanique</option>
                    <option value="Restauration">Restauration</option>
                    <option value="Coiffure">Coiffure</option>
                    <option value="Couture">Couture</option>
                    <option value="Menuiserie">Menuiserie</option>
                    <option value="Électricité">Électricité</option>
                    <option value="Plomberie">Plomberie</option>
                    <option value="Sécurité">Sécurité</option>
                    <option value="Banque/Finance">Banque/Finance</option>
                    <option value="Télécommunications">Télécommunications</option>
                    <option value="Journalisme">Journalisme</option>
                    <option value="Étudiant">Étudiant</option>
                    <option value="Sans emploi">Sans emploi</option>
                    <option value="Retraité">Retraité</option>
                    <option value="Autre">✏️ Autre (je saisis mon activité)</option>
                  </select>

                  {videoData.activite1 === 'Autre' && (
                    <div className="mt-3 space-y-3" style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '0.75rem' }}>
                      <input
                        type="text"
                        value={videoData.activite1Autre || ''}
                        onChange={(e) => {
                          setVideoData((prev) => ({ ...prev, activite1Autre: e.target.value }))
                          if (e.target.value.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('activite1'); return n })
                        }}
                        placeholder="Nom de votre activité"
                        className={getFieldClassName('activite1', !!(videoData.activite1Autre?.trim()))}
                      />
                      <textarea
                        value={videoData.activiteDescription || ''}
                        onChange={(e) => setVideoData((prev) => ({ ...prev, activiteDescription: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Description facultative : diplômes, certifications…"
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Document professionnel <span className="text-gray-400 font-normal">(facultatif)</span></label>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" id="video-activite-doc" style={{ display: 'none' }}
                          onChange={(e) => setVideoData((prev) => ({ ...prev, activiteDoc: e.target.files?.[0] || null }))} />
                        <label htmlFor="video-activite-doc" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', border: '1px dashed #6b7280', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#374151', background: '#f9fafb' }}>
                          📎 {videoData.activiteDoc ? videoData.activiteDoc.name : 'Joindre un document'}
                        </label>
                        {videoData.activiteDoc && (
                          <button type="button" onClick={() => setVideoData((prev) => ({ ...prev, activiteDoc: null }))} className="ml-2 text-xs text-red-500 underline">Supprimer</button>
                        )}
                      </div>
                    </div>
                  )}

                  {videoData.activite1 && videoData.activite1 !== 'Autre' && (
                    <small className="text-green-600">✓ Activité : {videoData.activite1}</small>
                  )}

                  {videoData.activite1 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preuve (photo, PDF, document)</label>
                      <input type="file" accept="image/*" capture="environment" id="video-preuve-capture" style={{ display: 'none' }}
                        onChange={(e) => setVideoData((prev) => ({ ...prev, activitePreuve: e.target.files?.[0] || null }))} />
                      <input type="file" accept="image/*,.pdf,.doc,.docx" id="video-preuve-choose" style={{ display: 'none' }}
                        onChange={(e) => setVideoData((prev) => ({ ...prev, activitePreuve: e.target.files?.[0] || null }))} />
                      <div className="flex gap-3 flex-wrap">
                        <label htmlFor="video-preuve-capture" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 text-sm font-medium">📷 Prendre une photo</label>
                        <label htmlFor="video-preuve-choose" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm font-medium">🖼️ Choisir depuis galerie</label>
                      </div>
                      {videoData.activitePreuve && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-green-600">✓ {videoData.activitePreuve.name}</span>
                          <button type="button" onClick={() => setVideoData((prev) => ({ ...prev, activitePreuve: null }))} className="text-xs text-red-500 hover:underline">Supprimer</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Ethnie + Famille ── */}
          {videoData.paysCode && (
            <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
              <div className="col-6">
                <div className="field">
                  <label>Ethnie *</label>
                  <input
                    type="text"
                    value={videoData.ethnie === 'Autre' ? (videoData.ethnieAutre || '') : videoData.ethnie}
                    onChange={(e) => {
                      const v = e.target.value
                      const fromList = ETHNIES.includes(v)
                      setVideoData((prev) => ({ ...prev, ethnie: fromList ? v : 'Autre', ethnieAutre: fromList ? '' : v }))
                      if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('ethnie'); return n })
                    }}
                    list="video-ethnie-list"
                    placeholder="Ex. Soninké, Peuls, Malinkés..."
                    className={getFieldClassName('ethnie', ethnieFilled)}
                  />
                  <datalist id="video-ethnie-list">{ETHNIES.map((e) => <option key={e} value={e} />)}</datalist>
                  {ethnieFilled && <small className="text-green-600 block mt-1">✓ {videoData.ethnie === 'Autre' ? videoData.ethnieAutre : videoData.ethnie}</small>}
                </div>
              </div>
              <div className="col-6">
                <div className="field">
                  <label>Famille (Nom) *</label>
                  <input
                    type="text"
                    value={videoData.famille === 'Autre' ? (videoData.familleAutre || '') : videoData.famille}
                    onChange={(e) => {
                      const v = e.target.value
                      const fromList = FAMILLES.includes(v)
                      setVideoData((prev) => ({ ...prev, famille: fromList ? v : 'Autre', familleAutre: fromList ? '' : v }))
                      if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('famille'); return n })
                    }}
                    list="video-famille-list"
                    placeholder="Ex. Keita, Diallo, Barry..."
                    className={getFieldClassName('famille', familleFilled)}
                  />
                  <datalist id="video-famille-list">{FAMILLES.map((f) => <option key={f} value={f} />)}</datalist>
                  {familleFilled && <small className="text-green-600 block mt-1">✓ {videoData.famille === 'Autre' ? videoData.familleAutre : videoData.famille}</small>}
                </div>
              </div>
            </div>
          )}

          {/* ── Prénom + Téléphone ── */}
          {identiteOK && (
            <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
              <div className="col-6">
                <div className="field">
                  <label>Prénom *</label>
                  <input
                    value={videoData.prenom}
                    onChange={(e) => {
                      setVideoData((prev) => ({ ...prev, prenom: e.target.value }))
                      if (e.target.value.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('prenom'); return n })
                    }}
                    placeholder="Prénom" required
                    className={getFieldClassName('prenom', !!videoData.prenom)}
                  />
                </div>
              </div>
              <div className="col-6">
                <div className="field">
                  <label>Téléphone *</label>
                  <input
                    value={videoData.telephone}
                    onChange={(e) => {
                      setVideoData((prev) => ({ ...prev, telephone: e.target.value }))
                      if (e.target.value.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('telephone'); return n })
                    }}
                    placeholder="Téléphone" required
                    className={getFieldClassName('telephone', !!videoData.telephone)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── NuméroH Père + Mère ── */}
          {videoData.prenom && (
            <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
              <div className="col-6">
                <div className="field">
                  <label>NuméroH (Père)</label>
                  <input value={videoData.numeroHPere} onChange={(e) => setVideoData((prev) => ({ ...prev, numeroHPere: e.target.value }))} placeholder="Ex: G1C1P1R1E1F1 1" />
                </div>
              </div>
              <div className="col-6">
                <div className="field">
                  <label>NuméroH (Mère)</label>
                  <input value={videoData.numeroHMere} onChange={(e) => setVideoData((prev) => ({ ...prev, numeroHMere: e.target.value }))} placeholder="Ex: G1C1P1R1E1F1 2" />
                </div>
              </div>
            </div>
          )}

          {/* ── Email + Religion + Handicap ── */}
          {coordonneesOK && (
            <>
              <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
                <div className="col-6">
                  <div className="field">
                    <label>E-mail *</label>
                    <input
                      type="email" value={videoData.email}
                      onChange={(e) => {
                        setVideoData((prev) => ({ ...prev, email: e.target.value }))
                        if (e.target.value.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('email'); return n })
                      }}
                      placeholder="Email" required
                      className={getFieldClassName('email', !!videoData.email)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="field">
                    <label>Religion</label>
                    <input
                      value={videoData.religion}
                      onChange={(e) => setVideoData((prev) => ({ ...prev, religion: e.target.value }))}
                      placeholder="Religion"
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-6">
                  <div className="field">
                    <label>Personne en situation de handicap ?</label>
                    <select value={videoData.handicap} onChange={(e) => setVideoData((prev) => ({ ...prev, handicap: e.target.value }))}>
                      <option value="">Sélectionner</option>
                      <option value="NON">Non</option>
                      <option value="OUI">Oui</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Mot de passe + Photo ── */}
          {videoData.email && (
            <>
              <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
                <div className="col-6">
                  <div className="field">
                    <label>Mot de passe *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type={showPassword ? 'text' : 'password'} value={videoData.password}
                        onChange={(e) => {
                          setVideoData((prev) => ({ ...prev, password: e.target.value }))
                          if (e.target.value && e.target.value.length >= 6) setValidationErrors((prev) => { const n = new Set(prev); n.delete('password'); return n })
                        }}
                        placeholder="Mot de passe" minLength={6} required
                        className={getFieldClassName('password', !!videoData.password && videoData.password.length >= 6)}
                      />
                      <button type="button" onClick={() => setShowPassword((p) => !p)}
                        style={{ border: '1px solid #d1d5db', borderRadius: '999px', padding: '0.4rem 0.7rem', background: 'white', cursor: 'pointer', fontSize: '1.1rem' }}>
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {videoData.password && videoData.password.length < 6 && <small className="error">Au moins 6 caractères requis</small>}
                  </div>
                </div>
                {videoData.password && (
                  <div className="col-6">
                    <div className="field">
                      <label>Confirmer le mot de passe *</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'} value={videoData.confirmPassword}
                          onChange={(e) => {
                            setVideoData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                            if (e.target.value && videoData.password === e.target.value && e.target.value.length >= 6)
                              setValidationErrors((prev) => { const n = new Set(prev); n.delete('confirmPassword'); return n })
                          }}
                          placeholder="Confirmer" minLength={6} required
                          className={getFieldClassName('confirmPassword', !!videoData.confirmPassword && videoData.password === videoData.confirmPassword && videoData.password.length >= 6)}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword((p) => !p)}
                          style={{ border: '1px solid #d1d5db', borderRadius: '999px', padding: '0.4rem 0.7rem', background: 'white', cursor: 'pointer', fontSize: '1.1rem' }}>
                          {showConfirmPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {videoData.confirmPassword && videoData.password !== videoData.confirmPassword && <small className="error">Les mots de passe ne correspondent pas</small>}
                      {videoData.confirmPassword && videoData.password === videoData.confirmPassword && videoData.password.length >= 6 && <small className="success">✓ Les mots de passe correspondent</small>}
                    </div>
                  </div>
                )}
              </div>

              <div className="row">
                <div className="col-12">
                  <div className="field">
                    <label>Photo de profil (optionnel)</label>
                    <div className="photo-upload-section">
                      {videoData.photoPreview ? (
                        <div className="photo-preview">
                          <img src={videoData.photoPreview} alt="Aperçu" className="preview-image" />
                          <div className="photo-actions">
                            <button type="button" className="btn-small secondary" onClick={removePhoto}>Supprimer</button>
                          </div>
                        </div>
                      ) : (
                        <div className="photo-upload-area">
                          <input type="file" accept="image/*" onChange={handlePhotoChange} id="video-photo-upload" style={{ display: 'none' }} />
                          <label htmlFor="video-photo-upload" className="upload-button">
                            <span className="upload-icon">📷</span>
                            <span>Cliquer pour ajouter une photo</span>
                            <small>Formats acceptés : JPG, PNG (max 5MB)</small>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="actions">
                <button
                  className={`btn ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!validateRequiredFields()) {
                      alert('Veuillez remplir tous les champs obligatoires (marqués en rouge).')
                      document.querySelector('.border-red-500')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      return
                    }
                    setCurrentStep('video')
                  }}
                  disabled={isDisabled}
                  style={{ opacity: isDisabled ? 0.6 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                >
                  {isDisabled ? 'Remplir les champs obligatoires' : '🎥 Enregistrer la vidéo →'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 2 : ENREGISTREMENT VIDÉO
  // ══════════════════════════════════════════════════════════════════════════
  if (currentStep === 'video') {
    return (
      <div className="stack">
        <h2>Enregistrement Vidéo</h2>
        <div className="card">
          <VideoRecorder onVideoRecorded={handleVideoRecorded} maxDuration={10} />
          {videoData.video && (
            <div className="actions" style={{ marginTop: '20px' }}>
              <button className="btn" onClick={handleSubmit} disabled={loading}>
                {loading ? '⏳ Envoi en cours…' : '✅ Envoyer'}
              </button>
              <button className="btn secondary" onClick={() => { setVideoData((prev) => ({ ...prev, video: null })); setCurrentStep('video') }} style={{ marginLeft: '10px' }}>
                Réenregistrer la vidéo
              </button>
            </div>
          )}
          {!videoData.video && (
            <div style={{ padding: '15px', backgroundColor: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: '5px', marginTop: '20px' }}>
              <p>📹 Veuillez enregistrer votre vidéo ci-dessus. Une fois terminée, cliquez sur Envoyer.</p>
            </div>
          )}
          <div style={{ marginTop: '12px' }}>
            <button className="btn secondary" onClick={() => setCurrentStep('form')}>← Retour au formulaire</button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 3 : CONFIRMATION
  // ══════════════════════════════════════════════════════════════════════════
  if (currentStep === 'complete') {
    const numeroH = videoData.numeroH || 'Génération en cours...'
    return (
      <div className="stack">
        <h2>✅ Enregistrement Terminé</h2>
        <div className="card success-card">
          <div className="success-content">
            <div style={{ fontSize: '4rem', color: '#22c55e' }}>✓</div>
            <h3>Félicitations ! Votre inscription est terminée</h3>
            <div style={{ margin: '2rem 0', padding: '1.5rem', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '2px solid #3b82f6' }}>
              <h4 style={{ marginBottom: '1rem', color: '#1e40af' }}>🎯 Votre NumeroH :</h4>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2563eb', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '8px', textAlign: 'center', border: '2px solid #3b82f6', fontFamily: 'monospace' }}>
                {numeroH}
              </div>
            </div>
          </div>
          <div className="actions" style={{ marginTop: '2rem' }}>
            <button className="btn" onClick={() => navigate('/compte')} style={{ padding: '0.75rem 2rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginRight: '1rem' }}>
              Accéder à mon compte →
            </button>
            <button className="btn" onClick={() => navigate('/')} style={{ padding: '0.75rem 2rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
