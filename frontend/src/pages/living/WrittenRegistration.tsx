import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../utils/api'
import { getAllCountries, getRegionsByCountry, getContinentAndRegionByCountry, getPrefecturesByRegion, WORLD_GEOGRAPHY } from '../../utils/worldGeography'
import { ETHNIE_CODES, FAMILLE_CODES, ETHNIES, FAMILLES } from '../../utils/constants'
import { getCountryGeoLabels } from '../../utils/countryGeoStructure'

interface WrittenData {
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
  // Champs libres quand l'utilisateur choisit "Autre"
  activite1Autre?: string
  ethnieAutre?: string
  familleAutre?: string
  activiteDescription?: string
  activiteDoc?: File | null
  activitePreuve?: File | null
  specialite?: string              // Spécialité dans l'activité principale
  statutMatrimonial?: string       // Statut matrimonial
  prenom: string
  telephone: string
  email: string
  religion: string
  generation: string
  password: string
  confirmPassword: string
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

export function WrittenRegistration() {
  const [data, setData] = useState<WrittenData>({
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
    specialite: '',
    statutMatrimonial: '',
    prenom: '',
    telephone: '',
    email: '',
    religion: '',
    generation: '',
    password: '',
    confirmPassword: '',
    photo: null,
    photoPreview: null,
    genre: 'HOMME',
    handicap: '',
    activite1: '',
    activite2: '',
    activite3: '',
    lieu1: '',
    lieu2: '',
    lieu3: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasShownReminder, setHasShownReminder] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set())
  const [paysSectionExpanded, setPaysSectionExpanded] = useState(true)
  const [genreExpanded, setGenreExpanded] = useState(true)
  const navigate = useNavigate()

  const countries = useMemo(
    () =>
      getAllCountries()
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    []
  )
  const regions = useMemo(
    () => (data.paysCode ? getRegionsByCountry(data.paysCode) : []),
    [data.paysCode]
  )

  // Mémorisé pour éviter de recalculer à chaque rendu
  const prefectures = useMemo(
    () => data.regionCode ? getPrefecturesByRegion(data.regionCode, data.paysCode, data.continentCode) : [],
    [data.regionCode, data.paysCode, data.continentCode]
  )

  // Labels géographiques dynamiques selon le pays sélectionné
  const geoLabels = useMemo(() => {
    const countryName = countries.find(
      (c) => c.code === data.paysCode && c.continentCode === data.continentCode
    )?.name || ''
    return getCountryGeoLabels(countryName)
  }, [data.paysCode, data.continentCode, countries])

  const paysComplete = !!(data.paysCode && data.region?.trim() && data.prefecture?.trim() && data.sousPrefecture?.trim() && data.quartier?.trim())
  const paysSummary = paysComplete
    ? [countries.find((c) => c.code === data.paysCode && c.continentCode === data.continentCode)?.name || data.pays, data.region?.trim(), data.prefecture?.trim(), data.sousPrefecture?.trim(), data.quartier?.trim()].filter(Boolean).join(' › ')
    : ''

  // La section Pays se referme uniquement quand l'utilisateur quitte le bloc (onBlur)
  const handlePaysSectionBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Si le focus reste dans le bloc, ne pas fermer
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (paysComplete) setPaysSectionExpanded(false)
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

  const validateRequiredFields = (): boolean => {
    const errors = new Set<string>()

    const hasCustomActivite =
      data.activite1 === 'Autre' ? !!(data.activite1Autre && data.activite1Autre.trim()) : !!data.activite1
    const hasEthnie =
      data.ethnie === 'Autre' ? !!(data.ethnieAutre && data.ethnieAutre.trim()) : !!data.ethnie
    const hasFamille =
      data.famille === 'Autre' ? !!(data.familleAutre && data.familleAutre.trim()) : !!data.famille

    if (!data.paysCode) errors.add('paysCode')
    if (!(data.region && data.region.trim())) errors.add('region')
    if (!(data.prefecture && data.prefecture.trim())) errors.add('prefecture')
    if (!(data.sousPrefecture && data.sousPrefecture.trim())) errors.add('sousPrefecture')
    if (!(data.quartier && data.quartier.trim())) errors.add('quartier')
    if (!hasEthnie) errors.add('ethnie')
    if (!hasFamille) errors.add('famille')
    if (!data.prenom) errors.add('prenom')
    if (!data.dateNaissance) errors.add('dateNaissance')
    if (!hasCustomActivite) errors.add('activite1')
    if (data.activite1 && data.activite1 !== 'Autre' && !(data.specialite && data.specialite.trim())) errors.add('specialite')
    if (!data.email) errors.add('email')
    if (!data.telephone) errors.add('telephone')
    if (!data.password) errors.add('password')
    if (!data.confirmPassword) errors.add('confirmPassword')
    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
      errors.add('confirmPassword')
    }

    setValidationErrors(errors)
    return errors.size === 0
  }

  const getFieldClassName = (fieldName: string, hasValue: boolean): string => {
    const baseClass =
      'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
    if (validationErrors.has(fieldName)) {
      return `${baseClass} border-red-500 border-2`
    }
    if (hasValue) {
      return `${baseClass} border-green-500`
    }
    return `${baseClass} border-gray-300`
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image valide.')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('La photo doit faire moins de 10MB.')
        return
      }
      // Compresser la photo côté client avant l'envoi (max 350px, JPEG 70%)
      const objectUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const MAX = 350
        let w = img.width, h = img.height
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX } }
        else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX } }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        setData((prev) => ({ ...prev, photo: file, photoPreview: compressed }))
      }
      img.src = objectUrl
    }
  }

  const removePhoto = () => {
    setData((prev) => ({
      ...prev,
      photo: null,
      photoPreview: null
    }))
  }

  const generateNumeroH = async (form: WrittenData): Promise<string> => {
    const generation = calculateGeneration(form.dateNaissance)
    // Préfixe NumeroH : génération + continent + pays + région (choisie) + ethnie + famille
    const { continentCode: c } = form.paysCode ? getContinentAndRegionByCountry(form.paysCode) : { continentCode: 'C1', regionCode: 'R1' }
    const continentCode = form.continentCode || c
    const paysCode = form.paysCode || 'P1'
    const regionCode = form.regionCode || (form.paysCode ? getContinentAndRegionByCountry(form.paysCode).regionCode : 'R1')

    const ethnieEntry = ETHNIE_CODES.find((e) => e.label === form.ethnie)
    const familleEntry = FAMILLE_CODES.find((f) => f.label === form.famille)

    const generateAutoCode = (name: string, prefix: string, existingCodes: string[]): string => {
      if (!name) return prefix + '999'
      const existingNums = existingCodes
        .filter((c) => c.startsWith(prefix))
        .map((c) => {
          const numStr = c.substring(prefix.length)
          const num = parseInt(numStr, 10)
          return isNaN(num) ? 0 : num
        })
        .filter((n) => n > 0)
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
      return prefix + nextNum.toString()
    }

    const ethnieCode =
      ethnieEntry?.code || generateAutoCode(form.ethnie, 'E', ETHNIE_CODES.map((e) => e.code))
    const familleCode =
      familleEntry?.code ||
      generateAutoCode(form.famille, 'F', FAMILLE_CODES.map((f) => f.code))

    const prefix = `${generation}${continentCode}${paysCode}${regionCode}${ethnieCode}${familleCode}`
    const { generateUniqueNumeroH } = await import('../../utils/numeroHGenerator')
    return await generateUniqueNumeroH(prefix)
  }

  const showCredentialsReminder = (numeroH: string, password: string) => {
    if (!numeroH || !password || hasShownReminder) return
    setHasShownReminder(true)
    alert(
      "Retenez bien votre NumeroH et votre mot de passe afin d'avoir toujours accès à votre compte.\n\n" +
        `NumeroH : ${numeroH}\n` +
        `Mot de passe : ${password}`
    )
  }

  const handleSubmit = async () => {
    if (loading) return
    if (!validateRequiredFields()) {
      alert('Veuillez remplir tous les champs obligatoires (marqués en rouge).')
      const firstErrorField = document.querySelector('.border-red-500')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setLoading(true)

    // Normaliser les champs \"Autre\" pour l'activité, l'ethnie et la famille
    const effectiveActivite1 =
      data.activite1 === 'Autre' && data.activite1Autre?.trim()
        ? data.activite1Autre.trim()
        : data.activite1
    const effectiveEthnie =
      data.ethnie === 'Autre' && data.ethnieAutre?.trim()
        ? data.ethnieAutre.trim()
        : data.ethnie
    const effectiveFamille =
      data.famille === 'Autre' && data.familleAutre?.trim()
        ? data.familleAutre.trim()
        : data.famille

    const normalizedForm: WrittenData = {
      ...data,
      activite1: effectiveActivite1,
      ethnie: effectiveEthnie,
      famille: effectiveFamille
    }

    const numeroH = await generateNumeroH(normalizedForm)

    const { continentCode: infContinentCode } = normalizedForm.paysCode ? getContinentAndRegionByCountry(normalizedForm.paysCode) : { continentCode: 'C1' }
    const continentName = WORLD_GEOGRAPHY.find((c) => c.code === (normalizedForm.continentCode || infContinentCode))?.name || ''
    const inferred = {
      paysCode: normalizedForm.paysCode,
      pays: countries.find((c) => c.code === normalizedForm.paysCode && c.continentCode === normalizedForm.continentCode)?.name || normalizedForm.pays,
      continent: continentName,
      continentCode: normalizedForm.continentCode || infContinentCode,
      regionCode: normalizedForm.regionCode || (normalizedForm.paysCode ? getContinentAndRegionByCountry(normalizedForm.paysCode).regionCode : 'R1'),
      region: (normalizedForm.region && normalizedForm.region.trim()) || regions.find((r) => r.code === normalizedForm.regionCode)?.name || '',
      regionOrigine: (normalizedForm.region && normalizedForm.region.trim()) || regions.find((r) => r.code === normalizedForm.regionCode)?.name || '',
      prefecture: (normalizedForm.prefecture && normalizedForm.prefecture.trim()) || '',
      sousPrefecture: (normalizedForm.sousPrefecture && normalizedForm.sousPrefecture.trim()) || '',
      quartier: (normalizedForm.quartier && normalizedForm.quartier.trim()) || ''
    }

    setData((prev) => ({ ...prev, numeroH }))

    // Les fichiers activitePreuve/activiteDoc sont volumineux et facultatifs
    // → on ne les envoie pas lors de l'inscription pour ne pas alourdir le payload
    const activitePreuveBase64 = null
    const activiteDocBase64 = null

    const { activitePreuve: _p, activiteDoc: _d, photo, ...restForm } = normalizedForm
    const completeData = {
      ...restForm,
      ...inferred,
      numeroH,
      password: normalizedForm.password,
      confirmPassword: normalizedForm.confirmPassword,
      prenom: normalizedForm.prenom,
      nomFamille: effectiveFamille,
      email: (normalizedForm.email && normalizedForm.email.trim()) ? normalizedForm.email.trim() : `${numeroH}@example.com`,
      religion: normalizedForm.religion?.trim() || '',
      handicap: normalizedForm.handicap || '',
      genre: normalizedForm.genre,
      photo: normalizedForm.photoPreview,
      photoPreview: normalizedForm.photoPreview,
      activitePreuve: activitePreuveBase64,
      activiteDoc: activiteDocBase64,
      lieu1: (normalizedForm.quartier && normalizedForm.quartier.trim()) || normalizedForm.lieu1 || ''
    }

    try {
      const result = await api.registerLiving(completeData as any)

      if (result.success) {
        const userDataWithPassword = {
          ...result.user,
          password: data.password,
          confirmPassword: data.confirmPassword
        }

        localStorage.setItem('vivant_written', JSON.stringify(userDataWithPassword))
        localStorage.setItem('dernier_vivant', JSON.stringify(userDataWithPassword))

        localStorage.setItem(
          'session_user',
          JSON.stringify({
            numeroH: numeroH,
            userData: userDataWithPassword,
            token: result.token || null,
            type: 'vivant',
            source: 'registration_written'
          })
        )

        if (result.token) {
          localStorage.setItem('token', result.token)
        }

        showCredentialsReminder(numeroH, data.password)
        navigate('/compte')
      } else {
        alert(`❌ Erreur: ${result.message}`)
      }
    } catch (error) {
      console.error('Erreur enregistrement (écrit):', error)
      const dataWithClearPassword = {
        ...completeData,
        password: data.password,
        confirmPassword: data.confirmPassword
      }

      localStorage.setItem('vivant_written', JSON.stringify(dataWithClearPassword))
      localStorage.setItem('dernier_vivant', JSON.stringify(dataWithClearPassword))

      localStorage.setItem(
        'session_user',
        JSON.stringify({
          numeroH: numeroH,
          userData: dataWithClearPassword,
          type: 'vivant',
          source: 'registration_written_fallback'
        })
      )

      showCredentialsReminder(numeroH, data.password)
      navigate('/compte')
    } finally {
      setLoading(false)
    }
  }

  // ── Déclencheurs progressifs ──────────────────────────────────────────────
  const ethnieFilled = !!(data.ethnie && (data.ethnie !== 'Autre' || data.ethnieAutre?.trim()))
  const familleFilled = !!(data.famille && (data.famille !== 'Autre' || data.familleAutre?.trim()))
  const activiteFilled = !!(data.activite1 && (data.activite1 !== 'Autre' || data.activite1Autre?.trim()))
  const identiteOK = ethnieFilled && familleFilled && activiteFilled
  const coordonneesOK = !!(data.prenom && data.telephone)

  // Calcul indicateur d'étapes
  const totalSteps = 4
  const step1Done = !!data.dateNaissance
  const step2Done = step1Done && !!data.paysCode && !!(data.region?.trim()) && !!(data.prefecture?.trim()) && !!(data.sousPrefecture?.trim()) && !!(data.quartier?.trim())
  const step3Done = step2Done && identiteOK && coordonneesOK
  const step4Done = step3Done && !!data.email && !!data.password && data.password === data.confirmPassword && data.password.length >= 6
  const currentStep = step4Done ? 4 : step3Done ? 3 : step2Done ? 2 : 1

  const missingFields: string[] = []
  if (!data.dateNaissance) missingFields.push('Date de naissance')
  if (!data.paysCode) missingFields.push('Pays')
  if (!(data.region && data.region.trim())) missingFields.push(geoLabels.level1.label)
  if (!(data.prefecture && data.prefecture.trim())) missingFields.push(geoLabels.level2.label)
  if (!(data.sousPrefecture && data.sousPrefecture.trim())) missingFields.push(geoLabels.level3.label)
  if (!(data.quartier && data.quartier.trim())) missingFields.push(geoLabels.level4.label)
  if (!ethnieFilled) missingFields.push('Ethnie')
  if (!familleFilled) missingFields.push('Nom de famille')
  if (!activiteFilled) missingFields.push('Activité principale')
  if (!data.prenom) missingFields.push('Prénom')
  if (!data.telephone) missingFields.push('Téléphone')
  if (!data.email) missingFields.push('E-mail')
  if (!data.password) missingFields.push('Mot de passe')
  if (!data.confirmPassword) missingFields.push('Confirmation du mot de passe')
  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    missingFields.push('Les mots de passe ne correspondent pas')
  }
  if (data.password && data.password.length < 6) {
    missingFields.push('Le mot de passe doit contenir au moins 6 caractères')
  }
  const isDisabled = missingFields.length > 0

  // Labels des étapes
  const stepLabels = ['Identité', 'Localisation', 'Profil', 'Sécurité']

  return (
    <div className="stack">
      <h2>Inscription par écrit</h2>

      {/* ── Barre de progression ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
          <span>Étape {currentStep} sur {totalSteps}</span>
          <span className="text-blue-600 font-semibold">{stepLabels[currentStep - 1]}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-500 transition-all duration-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          {stepLabels.map((label, i) => (
            <span key={label} className={currentStep > i ? 'text-blue-600 font-semibold' : ''}>
              {currentStep > i ? '✓ ' : ''}{label}
            </span>
          ))}
        </div>
      </div>

      <div className="card" style={{ maxWidth: '32rem', width: '100%' }}>

        {/* ══ SECTION 1 – Toujours visible : Date de naissance + Genre ══ */}
        <div className="row">
          <div className="col-6">
            <div className="field">
              <label>Date de naissance *</label>
              <input
                type="date"
                value={data.dateNaissance}
                onChange={(e) => {
                  const generation = calculateGeneration(e.target.value)
                  setData((prev) => ({ ...prev, dateNaissance: e.target.value, generation }))
                  if (e.target.value) {
                    setValidationErrors((prev) => {
                      const next = new Set(prev)
                      next.delete('dateNaissance')
                      return next
                    })
                  }
                }}
                required
                className={getFieldClassName('dateNaissance', !!data.dateNaissance)}
              />
            </div>
          </div>
          <div className="col-6">
            <div className="field">
              <label>Genre & Statut</label>
              {/* Accordéon : fermé = résumé cliquable / ouvert = sélecteurs */}
              {data.genre && data.statutMatrimonial && !genreExpanded ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setGenreExpanded(true)}
                  onKeyDown={(e) => e.key === 'Enter' && setGenreExpanded(true)}
                  className="w-full px-4 py-3 border-2 border-green-400 rounded-lg bg-white cursor-pointer hover:border-blue-400 flex items-center justify-between transition-colors"
                >
                  <span className="text-gray-800 font-medium">
                    {data.genre === 'HOMME' ? '👨 Homme' : data.genre === 'FEMME' ? '👩 Femme' : data.genre}
                    {' · '}
                    {data.statutMatrimonial}
                  </span>
                  <span className="text-gray-400 text-sm">✏️</span>
                </div>
              ) : (
                <div
                  className="space-y-3 p-4 border-2 border-gray-300 rounded-lg bg-white"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node) && data.genre && data.statutMatrimonial) {
                      setGenreExpanded(false)
                    }
                  }}
                >
                  {/* Genre */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Genre *</label>
                    <div className="flex gap-3">
                      {[
                        { val: 'HOMME', label: '👨 Homme' },
                        { val: 'FEMME', label: '👩 Femme' },
                        { val: 'AUTRE', label: '🧑 Autre' },
                      ].map(({ val, label }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setData((prev) => ({ ...prev, genre: val }))}
                          className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            data.genre === val
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Statut matrimonial — apparaît quand le genre est choisi */}
                  {data.genre && (
                    <div style={{ animation: 'fadeInDown 0.25s ease' }}>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Statut matrimonial *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { val: 'Célibataire',   icon: '🔵' },
                          { val: 'Marié(e)',       icon: '💍' },
                          { val: 'Veuf/Veuve',    icon: '🕊️' },
                          { val: 'Divorcé(e)',    icon: '📝' },
                          { val: 'Séparé(e)',     icon: '↔️' },
                        ].map(({ val, icon }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setData((prev) => ({ ...prev, statutMatrimonial: val }))
                              // Ferme automatiquement quand les deux sont choisis
                              setTimeout(() => setGenreExpanded(false), 300)
                            }}
                            className={`py-2 px-3 rounded-full border-2 text-sm font-medium transition-all ${
                              data.statutMatrimonial === val
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            {icon} {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ SECTION 2 – Champ Pays (unifié) : contient Pays + Région + Préfecture + Sous-préfecture + Quartier ══ */}
        {data.dateNaissance && (
          <div className="field" style={{ animation: 'fadeInDown 0.3s ease' }} onBlur={handlePaysSectionBlur}>
            <label>Pays *</label>
            {paysComplete && !paysSectionExpanded ? (
              <div
                role="button"
                tabIndex={0}
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
                    value={data.continentCode && data.paysCode ? `${data.continentCode}_${data.paysCode}` : ''}
                    onChange={(e) => {
                      const [selectedContinentCode, selectedPaysCode] = e.target.value ? e.target.value.split('_') : ['', '']
                      const selectedCountry = countries.find((c) => c.code === selectedPaysCode && c.continentCode === selectedContinentCode)
                      const firstRegion = selectedCountry?.children?.[0]
                      setData((prev) => ({
                        ...prev,
                        pays: selectedCountry?.name || '',
                        paysCode: selectedPaysCode,
                        continentCode: selectedContinentCode,
                        continent: selectedCountry ? '' : prev.continent,
                        region: '',
                        regionCode: firstRegion?.code || '',
                        prefecture: '',
                        prefectureCode: '',
                        sousPrefecture: '',
                        quartier: ''
                      }))
                      if (e.target.value) setValidationErrors((prev) => { const n = new Set(prev); n.delete('paysCode'); return n })
                    }}
                    required
                    className={getFieldClassName('paysCode', !!data.paysCode)}
                  >
                    <option value="">— Choisir un pays —</option>
                    {countries.map((c) => (
                      <option key={`${c.continentCode}_${c.code}`} value={`${c.continentCode}_${c.code}`}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {data.paysCode && (
                  <>
                    {/* Niveau 1 : grande zone (label selon le pays) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{geoLabels.level1.label} *</label>
                      <input
                        type="text"
                        value={data.region}
                        onChange={(e) => {
                          const v = e.target.value
                          const matched = regions.find((r) => r.name.toLowerCase() === v.trim().toLowerCase())
                          setData((prev) => ({ ...prev, region: v, regionCode: matched?.code || '' }))
                          if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('region'); return n })
                        }}
                        list="region-list"
                        placeholder={geoLabels.level1.placeholder}
                        className={getFieldClassName('region', !!(data.region?.trim()))}
                      />
                      <datalist id="region-list">{regions.map((r) => <option key={r.code} value={r.name} />)}</datalist>
                    </div>
                    {/* Niveau 2 : zone intermédiaire (label selon le pays) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{geoLabels.level2.label} *</label>
                      <input
                        type="text"
                        value={data.prefecture}
                        onChange={(e) => {
                          const v = e.target.value
                          const matched = prefectures.find((p) => p.name.toLowerCase() === v.trim().toLowerCase())
                          setData((prev) => ({ ...prev, prefecture: v, prefectureCode: matched?.code || '' }))
                          if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('prefecture'); return n })
                        }}
                        list="prefecture-list"
                        placeholder={geoLabels.level2.placeholder}
                        className={getFieldClassName('prefecture', !!(data.prefecture?.trim()))}
                      />
                      <datalist id="prefecture-list">
                        {prefectures.map((p) => (
                          <option key={p.code} value={p.name} />
                        ))}
                      </datalist>
                    </div>
                    {/* Niveau 3 : commune / ville (label selon le pays) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{geoLabels.level3.label} *</label>
                      <input
                        type="text"
                        value={data.sousPrefecture}
                        onChange={(e) => {
                          const v = e.target.value
                          setData((prev) => ({ ...prev, sousPrefecture: v }))
                          if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('sousPrefecture'); return n })
                        }}
                        placeholder={geoLabels.level3.placeholder}
                        className={getFieldClassName('sousPrefecture', !!(data.sousPrefecture?.trim()))}
                      />
                    </div>
                    {/* Niveau 4 : quartier / village (label selon le pays) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{geoLabels.level4.label} *</label>
                      <input
                        type="text"
                        value={data.quartier}
                        onChange={(e) => {
                          const v = e.target.value
                          setData((prev) => ({ ...prev, quartier: v }))
                          if (v.trim()) setValidationErrors((prev) => { const n = new Set(prev); n.delete('quartier'); return n })
                        }}
                        placeholder={geoLabels.level4.placeholder}
                        className={getFieldClassName('quartier', !!(data.quartier?.trim()))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ SECTION 5 – Après le pays : Activité principale ══ */}
        {data.paysCode && (
          <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
            <div className="col-12">
              <div className="field">
                <label>Activité principale *</label>
                <select
                  value={data.activite1}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, activite1: e.target.value, activite1Autre: '', activiteDescription: '', activiteDoc: null }))
                    if (e.target.value) {
                      setValidationErrors((prev) => {
                        const next = new Set(prev)
                        next.delete('activite1')
                        return next
                      })
                    }
                  }}
                  required
                  className={getFieldClassName('activite1', !!data.activite1)}
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

                {/* ── Spécialité : apparaît dès qu'une activité est choisie ── */}
                {data.activite1 && data.activite1 !== 'Autre' && (
                  <div className="mt-3" style={{ animation: 'fadeInDown 0.25s ease', borderLeft: '3px solid #10b981', paddingLeft: '0.75rem' }}>
                    <label className="block text-xs font-semibold text-emerald-700 mb-1">
                      🎯 Votre spécialité dans « {data.activite1} » *
                    </label>
                    <input
                      type="text"
                      value={data.specialite || ''}
                      onChange={(e) => {
                        setData((prev) => ({ ...prev, specialite: e.target.value }))
                        if (e.target.value.trim()) {
                          setValidationErrors((prev) => {
                            const next = new Set(prev)
                            next.delete('specialite')
                            return next
                          })
                        }
                      }}
                      placeholder={`Ex : ${
                        data.activite1 === 'Santé' ? 'Cardiologie, Pédiatrie, Sage-femme…' :
                        data.activite1 === 'Enseignement' ? 'Mathématiques, Primaire, Lycée…' :
                        data.activite1 === 'Commerce' ? 'Textile, Alimentation, Électronique…' :
                        data.activite1 === 'Agriculture' ? 'Maraîchage, Riziculture, Élevage bovin…' :
                        data.activite1 === 'Transport' ? 'Taxi, Moto, Livraison, Bus…' :
                        data.activite1 === 'Informatique' ? 'Développement web, IA, Réseaux…' :
                        data.activite1 === 'Construction' ? 'Maçonnerie, Génie civil, Architecture…' :
                        'Précisez votre domaine exact…'
                      }`}
                      className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 bg-emerald-50/30 ${
                        validationErrors.has('specialite') ? 'border-red-500 focus:ring-red-400' : 'border-emerald-300 focus:ring-emerald-400'
                      }`}
                    />
                  </div>
                )}

                {/* Sous-champs quand "Autre" est sélectionné */}
                {data.activite1 === 'Autre' && (
                  <div className="mt-3 space-y-3" style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '0.75rem' }}>
                    {/* Nom de l'activité (obligatoire) */}
                    <div>
                      <input
                        type="text"
                        value={data.activite1Autre || ''}
                        onChange={(e) => {
                          setData((prev) => ({ ...prev, activite1Autre: e.target.value }))
                          if (e.target.value.trim()) {
                            setValidationErrors((prev) => {
                              const next = new Set(prev)
                              next.delete('activite1')
                              return next
                            })
                          }
                        }}
                        placeholder="Nom de votre activité (ex. Designer UX, Coach sportif…)"
                        className={getFieldClassName('activite1', !!(data.activite1Autre?.trim()))}
                      />
                    </div>

                    {/* Description facultative */}
                    <div>
                      <textarea
                        value={data.activiteDescription || ''}
                        onChange={(e) => setData((prev) => ({ ...prev, activiteDescription: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Description facultative : diplômes, certifications, expérience…"
                      />
                    </div>

                    {/* Upload document professionnel (facultatif) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document professionnel <span className="text-gray-400 font-normal">(facultatif)</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        id="activite-doc-upload"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setData((prev) => ({ ...prev, activiteDoc: file }))
                        }}
                      />
                      <label
                        htmlFor="activite-doc-upload"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.8rem',
                          border: '1px dashed #6b7280',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#374151',
                          background: '#f9fafb'
                        }}
                      >
                        📎 {data.activiteDoc ? data.activiteDoc.name : 'Joindre un document (diplôme, attestation, carte pro…)'}
                      </label>
                      {data.activiteDoc && (
                        <button
                          type="button"
                          onClick={() => setData((prev) => ({ ...prev, activiteDoc: null }))}
                          className="ml-2 text-xs text-red-500 underline"
                        >
                          Supprimer
                        </button>
                      )}
                      <small className="block text-gray-400 mt-1">
                        PDF, image ou Word acceptés. Ce document n&apos;est pas obligatoire.
                      </small>
                    </div>
                  </div>
                )}

                {data.activite1 && data.activite1 !== 'Autre' && (
                  <small className="text-green-600">✓ Activité : {data.activite1}</small>
                )}

                {/* Champ Preuve (photo, PDF, document) — pour toutes les activités */}
                {data.activite1 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preuve (photo, PDF, document)</label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      id="activite-preuve-capture"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setData((prev) => ({ ...prev, activitePreuve: file }))
                      }}
                    />
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      id="activite-preuve-choose"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setData((prev) => ({ ...prev, activitePreuve: file }))
                      }}
                    />
                    <div className="flex gap-3 flex-wrap">
                      <label
                        htmlFor="activite-preuve-capture"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <span>📷</span>
                        <span>Prendre une photo</span>
                      </label>
                      <label
                        htmlFor="activite-preuve-choose"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <span>🖼️</span>
                        <span>Choisir depuis galerie / fichier</span>
                      </label>
                    </div>
                    {data.activitePreuve && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-green-600">✓ {data.activitePreuve.name}</span>
                        <button
                          type="button"
                          onClick={() => setData((prev) => ({ ...prev, activitePreuve: null }))}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION 6 – Après le pays : Ethnie + Famille (saisie libre avec suggestions) ══ */}
        {data.paysCode && (
          <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
            <div className="col-6">
              <div className="field">
                <label>Ethnie *</label>
                <input
                  type="text"
                  value={data.ethnie === 'Autre' ? (data.ethnieAutre || '') : data.ethnie}
                  onChange={(e) => {
                    const v = e.target.value
                    const fromList = ETHNIES.includes(v)
                    setData((prev) => ({
                      ...prev,
                      ethnie: fromList ? v : 'Autre',
                      ethnieAutre: fromList ? '' : v
                    }))
                    if (v.trim()) {
                      setValidationErrors((prev) => {
                        const next = new Set(prev)
                        next.delete('ethnie')
                        return next
                      })
                    }
                  }}
                  list="ethnie-list"
                  placeholder="Ex. Soninké, Peuls, Malinkés..."
                  className={getFieldClassName('ethnie', ethnieFilled)}
                />
                <datalist id="ethnie-list">
                  {ETHNIES.map((e) => (
                    <option key={e} value={e} />
                  ))}
                </datalist>
                {ethnieFilled && (
                  <small className="text-green-600 block mt-1">✓ {data.ethnie === 'Autre' ? data.ethnieAutre : data.ethnie}</small>
                )}
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Famille (Nom) *</label>
                <input
                  type="text"
                  value={data.famille === 'Autre' ? (data.familleAutre || '') : data.famille}
                  onChange={(e) => {
                    const v = e.target.value
                    const fromList = FAMILLES.includes(v)
                    setData((prev) => ({
                      ...prev,
                      famille: fromList ? v : 'Autre',
                      familleAutre: fromList ? '' : v
                    }))
                    if (v.trim()) {
                      setValidationErrors((prev) => {
                        const next = new Set(prev)
                        next.delete('famille')
                        return next
                      })
                    }
                  }}
                  list="famille-list"
                  placeholder="Ex. Keita, Diallo, Barry..."
                  className={getFieldClassName('famille', familleFilled)}
                />
                <datalist id="famille-list">
                  {FAMILLES.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
                {familleFilled && (
                  <small className="text-green-600 block mt-1">✓ {data.famille === 'Autre' ? data.familleAutre : data.famille}</small>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION 7 – Après ethnie + famille : Prénom + Téléphone ══ */}
        {identiteOK && (
          <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
            <div className="col-6">
              <div className="field">
                <label>Prénom *</label>
                <input
                  value={data.prenom}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, prenom: e.target.value }))
                    if (e.target.value.trim()) {
                      setValidationErrors((prev) => {
                        const next = new Set(prev)
                        next.delete('prenom')
                        return next
                      })
                    }
                  }}
                  placeholder="Prénom"
                  required
                  className={getFieldClassName('prenom', !!data.prenom)}
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>Téléphone *</label>
                <input
                  value={data.telephone}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, telephone: e.target.value }))
                    if (e.target.value.trim()) {
                      setValidationErrors((prev) => {
                        const next = new Set(prev)
                        next.delete('telephone')
                        return next
                      })
                    }
                  }}
                  placeholder="Téléphone"
                  required
                  className={getFieldClassName('telephone', !!data.telephone)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION 8 – Après prénom : NuméroH Père + Mère (optionnel) ══ */}
        {data.prenom && (
          <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
            <div className="col-6">
              <div className="field">
                <label>NuméroH (Père)</label>
                <input
                  value={data.numeroHPere}
                  onChange={(e) => setData((prev) => ({ ...prev, numeroHPere: e.target.value }))}
                  placeholder="Ex: G1C1P1R1E1F1 1"
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label>NuméroH (Mère)</label>
                <input
                  value={data.numeroHMere}
                  onChange={(e) => setData((prev) => ({ ...prev, numeroHMere: e.target.value }))}
                  placeholder="Ex: G1C1P1R1E1F1 2"
                />
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION 9 – Après prénom + téléphone : Email + Religion + Handicap ══ */}
        {coordonneesOK && (
          <>
            <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
              <div className="col-6">
                <div className="field">
                  <label>E-mail *</label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => {
                      setData((prev) => ({ ...prev, email: e.target.value }))
                      if (e.target.value.trim()) {
                        setValidationErrors((prev) => {
                          const next = new Set(prev)
                          next.delete('email')
                          return next
                        })
                      }
                    }}
                    placeholder="Email"
                    required
                    className={getFieldClassName('email', !!data.email)}
                  />
                </div>
              </div>
              <div className="col-6">
                <div className="field">
                  <label>Religion</label>
                  <input
                    value={data.religion}
                    onChange={(e) => setData((prev) => ({ ...prev, religion: e.target.value }))}
                    placeholder="Religion"
                  />
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-6">
                <div className="field">
                  <label>Personne en situation de handicap ?</label>
                  <select
                    value={data.handicap}
                    onChange={(e) => setData((prev) => ({ ...prev, handicap: e.target.value }))}
                  >
                    <option value="">Sélectionner</option>
                    <option value="NON">Non</option>
                    <option value="OUI">Oui</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ SECTION 10 – Après email : Mot de passe + Photo ══ */}
        {data.email && (
          <>
            <div className="row" style={{ animation: 'fadeInDown 0.3s ease' }}>
              <div className="col-6">
                <div className="field">
                  <label>Mot de passe *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={data.password}
                      onChange={(e) => {
                        setData((prev) => ({ ...prev, password: e.target.value }))
                        if (e.target.value && e.target.value.length >= 6) {
                          setValidationErrors((prev) => {
                            const next = new Set(prev)
                            next.delete('password')
                            return next
                          })
                        }
                      }}
                      placeholder="Mot de passe"
                      minLength={6}
                      required
                      className={getFieldClassName('password', !!data.password && data.password.length >= 6)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                      style={{ border: '1px solid #d1d5db', borderRadius: '999px', padding: '0.4rem 0.7rem', background: 'white', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {data.password && data.password.length < 6 && (
                    <small className="error">Au moins 6 caractères requis</small>
                  )}
                </div>
              </div>
              {data.password && (
                <div className="col-6">
                  <div className="field">
                    <label>Confirmer le mot de passe *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={data.confirmPassword}
                        onChange={(e) => {
                          setData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                          if (e.target.value && data.password === e.target.value && e.target.value.length >= 6) {
                            setValidationErrors((prev) => {
                              const next = new Set(prev)
                              next.delete('confirmPassword')
                              return next
                            })
                          }
                        }}
                        placeholder="Confirmer"
                        minLength={6}
                        required
                        className={getFieldClassName('confirmPassword', !!data.confirmPassword && data.password === data.confirmPassword && data.password.length >= 6)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                        style={{ border: '1px solid #d1d5db', borderRadius: '999px', padding: '0.4rem 0.7rem', background: 'white', cursor: 'pointer', fontSize: '1.1rem' }}
                      >
                        {showConfirmPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {data.confirmPassword && data.password !== data.confirmPassword && (
                      <small className="error">Les mots de passe ne correspondent pas</small>
                    )}
                    {data.confirmPassword && data.password === data.confirmPassword && data.password.length >= 6 && (
                      <small className="success">✓ Les mots de passe correspondent</small>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="row">
              <div className="col-12">
                <div className="field">
                  <label>Photo de profil</label>
                  <div className="photo-upload-section">
                    {data.photoPreview ? (
                      <div className="photo-preview">
                        <img src={data.photoPreview} alt="Aperçu de la photo" className="preview-image" />
                        <div className="photo-actions">
                          <button type="button" className="btn-small secondary" onClick={removePhoto}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="photo-upload-area">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          id="photo-upload-written"
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="photo-upload-written" className="upload-button">
                          <span className="upload-icon" style={{ fontSize: '2.5rem', lineHeight: 1 }}>📷</span>
                          <span style={{ fontWeight: 600 }}>Photo de profil</span>
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
                onClick={handleSubmit}
                disabled={isDisabled || loading}
                style={{ opacity: isDisabled || loading ? 0.6 : 1, cursor: isDisabled || loading ? 'not-allowed' : 'pointer' }}
              >
                {isDisabled
                  ? 'Remplir les champs obligatoires'
                  : loading
                  ? 'Envoi en cours…'
                  : '✅ Envoyer'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

