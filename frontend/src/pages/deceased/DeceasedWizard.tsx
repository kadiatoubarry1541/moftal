import { useMemo, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { FAMILLES, ETHNIES, REGIONS, CONTINENT_CODE, PAYS, REGION_CODES, ETHNIE_CODES, FAMILLE_CODES } from '../../utils/constants'
import { Field, FilePicker, Select, SelectCode } from '../../components/inputs'
import { useI18n } from '../../i18n/useI18n'
import { anneesEcoulees } from '../../utils/calculs'
import { computeDecetCode, computeGenerationCode } from '../../utils/codes'
import { DeceasedChoice } from './DeceasedChoice'
import { DeceasedVideoRegistration } from './DeceasedVideoRegistration'
import { DeceasedWrittenForm } from './DeceasedWrittenForm'
import { api } from '../../utils/api'
import {
  getContinents,
  getCountriesByContinent,
  getRegionsByCountry,
  getPrefecturesByRegion,
  getSousPrefecturesByPrefecture,
  getQuartiersBySousPrefecture,
  type GeographicLocation
} from '../../utils/worldGeography'

type EtatDefunt = {
  // page 1
  famillePere?: string
  prenomPere?: string
  pereStatut?: 'Vivant' | 'Mort'
  numeroHPere?: string
  familleMere?: string
  prenomMere?: string
  mereStatut?: 'Vivant' | 'Mort'
  numeroHMere?: string
  nom?: string
  prenom?: string
  genre?: string
  dateNaissance?: string
  anneesAvantNaissance?: number | null
  lieuNaissance?: string
  rangNaissance?: string
  anneeDeces?: string
  ageObtenu?: number | null
  anneesDepuisDeces?: number | null
  lieuDeces?: string

  // page 2
  ethnie?: string
  lieu1?: string
  lieu2?: string
  lieu3?: string
  religion?: string
  statutSocial?: string
  origine?: string
  // Nouveaux champs géographiques mondiaux
  continent?: string
  continentCode?: string
  pays?: string
  paysCode?: string
  regionOrigine?: string
  regionCode?: string
  prefecture?: string
  prefectureCode?: string
  sousPrefecture?: string
  sousPrefectureCode?: string
  quartier?: string
  quartierCode?: string

  // page 3
  nbFreresMere?: number
  nbSoeursMere?: number
  nbFreresPere?: number
  nbSoeursPere?: number
  nbFilles?: number
  nbGarcons?: number
  preuve?: File
  video?: File
  generation?: string
  decet?: string
  numeroHD?: string
}

const initial: EtatDefunt = {}

export function DeceasedWizard() {
  const [state, setState] = useState<EtatDefunt>(initial)
  const navigate = useNavigate()
  const { t } = useI18n()

  const generation = useMemo(() => state.dateNaissance ? computeGenerationCode(state.dateNaissance) : '', [state.dateNaissance])
  const decet = useMemo(() => state.anneeDeces ? computeDecetCode(`${state.anneeDeces}-01-01`) : '', [state.anneeDeces])
  const ageObtenu = useMemo(() => (state.dateNaissance && state.anneeDeces) ? anneesEcoulees(state.dateNaissance, `${state.anneeDeces}-01-01`) : null, [state.dateNaissance, state.anneeDeces])
  const anneesAvantNaissance = useMemo(() => state.dateNaissance ? anneesEcoulees('-3869-01-01', state.dateNaissance) : null, [state.dateNaissance])
  const anneesDepuisDeces = useMemo(() => state.anneeDeces ? anneesEcoulees(`${state.anneeDeces}-01-01`) : null, [state.anneeDeces])

  const set = (patch: Partial<EtatDefunt>) => setState(s => ({ ...s, ...patch }))

  const submitFinal = async () => {
    // Vérifier les contraintes d'âge selon le lien de parenté indiqué
    const relationAvecDeclarant = localStorage.getItem('defunt_relation') || null
    try {
      if ((relationAvecDeclarant === 'fils' || relationAvecDeclarant === 'fille') && state.dateNaissance) {
        const rawSession = localStorage.getItem('session_user')
        if (rawSession) {
          const parsed = JSON.parse(rawSession)
          const u = parsed.userData || parsed
          if (u.dateNaissance) {
            const parentYear = new Date(u.dateNaissance).getFullYear()
            const childYear = new Date(state.dateNaissance).getFullYear()
            if (!isNaN(parentYear) && !isNaN(childYear) && childYear <= parentYear) {
              alert('Un fils ou une fille ne peut pas être plus âgé(e) que son père ou sa mère. Vérifiez les dates de naissance.')
              return
            }
          }
        }
      }
    } catch {
      // En cas de problème de lecture de la session, on ne bloque pas l\'inscription
    }
    // Utiliser les codes géographiques sélectionnés ou valeurs par défaut
    const continentCode = state.continentCode || 'C1'
    const paysCode = state.paysCode || 'P1'
    const regionCode = state.regionCode || 'R1'
    
    // Utiliser les codes depuis constants.ts avec fallback automatique
    const ethnieEntry = ETHNIE_CODES.find(e => e.label === state.ethnie)
    const familleEntry = FAMILLE_CODES.find(f => f.label.toLowerCase() === (state.nom || '').toLowerCase())
    
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
    
    const ethnieCode = ethnieEntry?.code || generateAutoCode(state.ethnie || '', 'E', ETHNIE_CODES.map(e => e.code))
    const familleCode = familleEntry?.code || generateAutoCode(state.nom || '', 'F', FAMILLE_CODES.map(f => f.code))
    
    // Générer un numéro unique basé sur le préfixe complet pour défunt
    const prefix = `${decet}${generation}${continentCode}${paysCode}${regionCode}${ethnieCode}${familleCode}`
    const counterKey = `numeroHD_counter_${prefix}`
    const counter = parseInt(localStorage.getItem(counterKey) || '0', 10) || 0
    const nextNumber = counter + 1
    localStorage.setItem(counterKey, String(nextNumber))
    
    const numero = `${prefix} ${nextNumber}`
    
    // ✅ Données complètes pour le défunt
    const complet = { 
      ...state, 
      generation, 
      decet, 
      ageObtenu, 
      anneesAvantNaissance, 
      anneesDepuisDeces, 
      numeroHD: numero,
      numeroH: numero, // Pour la compatibilité avec le système de connexion
      password: 'defunt123',  // ✅ MOT DE PASSE PAR DÉFAUT
      confirmPassword: 'defunt123',
      type: 'defunt' as const,
      isDeceased: true,
      prenom: state.prenom || 'Défunt',
      nomFamille: state.nom || 'Inconnu',
      email: `${numero}@defunt.genealogie`,
      additionalInfo: {
        relationAvecDeclarant: relationAvecDeclarant || 'inconnu'
      }
    }
    
    try {
      // Essayer d'enregistrer dans le backend
      const result = await api.registerDeceased(complet)
      
      if (result.success) {
        console.log('✅ Défunt enregistré dans le backend:', result.user)
      }
    } catch (error) {
      console.warn('⚠️ Erreur backend, sauvegarde locale uniquement:', error)
    }
    
    // ✅ IMPORTANT : Les défunts n'ont PAS de compte, ils existent uniquement dans l'arbre généalogique
    // Toujours sauvegarder en localStorage comme backup
    localStorage.setItem('dernier_defunt', JSON.stringify(complet))

    // Sauvegarder dans la liste des défunts pour l'arbre généalogique
    const sessionRaw = localStorage.getItem('session_user')
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw)
        const ownerNumeroH = (session.userData || session).numeroH
        if (ownerNumeroH) {
          const key = `deceased_members_${ownerNumeroH}`
          const existing = JSON.parse(localStorage.getItem(key) || '[]')
          existing.push({
            ...complet,
            relation: (localStorage.getItem('defunt_relation') || 'autre'),
            ownerNumeroH
          })
          localStorage.setItem(key, JSON.stringify(existing))
        }
      } catch { /* ignore */ }
    }
    
    // ❌ NE PAS créer de session - les défunts ne peuvent pas se connecter
    // Les défunts existent uniquement dans l'arbre généalogique pour consultation
    
    // Afficher le numeroHD généré
    alert(`✅ Défunt enregistré avec succès !\n\nNumeroHD : ${numero}\n\nIl apparaîtra dans votre arbre généalogique. Vous allez être redirigé vers votre arbre.`)
    
    // Rediriger vers l'arbre généalogique
    setTimeout(() => {
    navigate('/famille/moi/arbre')
    }, 2000)
  }

  return (
    <Routes>
      <Route path="/" element={<DeceasedChoice />} />
      <Route path="/choix" element={<DeceasedChoice />} />
      <Route path="/video" element={<DeceasedVideoRegistration />} />
      <Route path="/formulaire" element={<DeceasedWrittenForm />} />
      <Route path="/ancien" element={
        <div className="stack">
          <h2>{t('wiz.dec.title1')}</h2>
          <div className="card stack">
            <div className="row">
              <div className="col-6"><Field label={t('label.family_father')}><Select value={state.famillePere} onChange={(v)=>set({ famillePere: v })} options={FAMILLES} /></Field></div>
              <div className="col-6"><Field label={t('label.father_firstname')}><input value={state.prenomPere||''} onChange={e=>set({ prenomPere: e.target.value })} /></Field></div>
              <div className="col-6"><Field label={t('label.father_status')}><Select value={state.pereStatut} onChange={(v)=>set({ pereStatut: v as any })} options={[ { value: 'Vivant', label: t('option.status_alive') }, { value: 'Mort', label: t('option.status_dead') } ]} placeholder={t('option.select_placeholder')} /></Field></div>
              <div className="col-6"><Field label={t('label.father_numeroh')}><input value={state.numeroHPere||''} onChange={e=>set({ numeroHPere: e.target.value })} /></Field></div>
              <div className="col-6"><Field label={t('label.family_mother')}><Select value={state.familleMere} onChange={(v)=>set({ familleMere: v })} options={FAMILLES} /></Field></div>
              <div className="col-6"><Field label={t('label.mother_firstname')}><input value={state.prenomMere||''} onChange={e=>set({ prenomMere: e.target.value })} /></Field></div>
            </div>
            <div className="row">
              <div className="col-4"><Field label={t('label.name')}><input value={state.nom||''} onChange={e=>set({ nom: e.target.value })} /></Field></div>
              <div className="col-4"><Field label={t('label.firstname_any')}><input value={state.prenom||''} onChange={e=>set({ prenom: e.target.value })} /></Field></div>
              <div className="col-4"><Field label={t('label.gender')}><Select value={state.genre} onChange={(v)=>set({ genre: v })} options={[ { value: 'FEMME', label: t('option.gender_female') }, { value: 'HOMME', label: t('option.gender_male') } ]} placeholder={t('option.select_placeholder')} /></Field></div>
            </div>
            <div className="row">
              <div className="col-4"><Field label={t('label.birthdate')}><input type="date" value={state.dateNaissance||''} onChange={e=>set({ dateNaissance: e.target.value })} /></Field></div>
              <div className="col-4"><Field label={t('label.years_before_birth')}><input value={anneesAvantNaissance ?? ''} readOnly /></Field></div>
              <div className="col-4"><Field label={t('label.birthplace')}><input value={state.lieuNaissance||''} onChange={e=>set({ lieuNaissance: e.target.value })} /></Field></div>
            </div>
            <div className="row">
              <div className="col-4"><Field label={t('label.birth_rank')}><select value={state.rangNaissance||''} onChange={e=>set({ rangNaissance: e.target.value })}><option value="">{t('option.select_placeholder')}</option>{Array.from({length:20},(_,i)=>i+1).map(n=> <option key={n} value={String(n)}>{n}</option>)}</select></Field></div>
              <div className="col-4"><Field label={t('label.death_year')}><input type="number" value={state.anneeDeces||''} onChange={e=>set({ anneeDeces: e.target.value })} /></Field></div>
              <div className="col-4"><Field label={t('label.age_obtained')}><input value={ageObtenu ?? ''} readOnly /></Field></div>
            </div>
            <div className="row">
              <div className="col-6"><Field label={t('label.years_since_death')}><input value={anneesDepuisDeces ?? ''} readOnly /></Field></div>
              <div className="col-6"><Field label={t('label.death_place')}><input value={state.lieuDeces||''} onChange={e=>set({ lieuDeces: e.target.value })} /></Field></div>
            </div>
            <div className="actions">
              <button className="btn" onClick={()=>{ localStorage.setItem('defunt', JSON.stringify(state)); navigate('page-2') }}>{t('btn.next')}</button>
            </div>
          </div>
        </div>
      }/>
      <Route path="page-2" element={
        <div className="stack">
          <h2>{t('wiz.dec.title2')}</h2>
          <div className="card stack">
            <div className="row">
              <div className="col-4"><Field label={t('label.ethnie')}><Select value={state.ethnie} onChange={(v)=>set({ ethnie: v })} options={ETHNIES} /></Field></div>
              <div className="col-4"><Field label={t('label.res1')}><input value={state.lieu1||''} onChange={e=>set({ lieu1: e.target.value })} /></Field></div>
              <div className="col-4"><Field label={t('label.res2')}><input value={state.lieu2||''} onChange={e=>set({ lieu2: e.target.value })} /></Field></div>
            </div>
            <div className="row">
              <div className="col-4"><Field label={t('label.res3')}><input value={state.lieu3||''} onChange={e=>set({ lieu3: e.target.value })} /></Field></div>
              <div className="col-4"><Field label={t('label.religion')}><input value={state.religion||''} onChange={e=>set({ religion: e.target.value })} /></Field></div>
              <div className="col-4"><Field label={t('label.social_status')}><input value={state.statutSocial||''} onChange={e=>set({ statutSocial: e.target.value })} /></Field></div>
            </div>
            <div className="row">
              <div className="col-4"><Field label={t('label.origin')}><input value={state.origine||''} onChange={e=>set({ origine: e.target.value })} /></Field></div>
              <div className="col-4"><Field label={t('label.country')}><SelectCode value={state.pays} onChange={(v)=>set({ pays: v })} options={PAYS as any} /></Field></div>
              <div className="col-4"><Field label={t('label.region_origin_select')}><Select value={state.regionOrigine} onChange={(v)=>set({ regionOrigine: v })} options={REGIONS} /></Field></div>
            </div>
            <div className="actions">
              <button className="btn secondary" onClick={()=>navigate(-1)}>{t('btn.back')}</button>
              <button className="btn" onClick={()=>{ localStorage.setItem('defunt', JSON.stringify(state)); navigate('page-3') }}>{t('btn.next')}</button>
            </div>
          </div>
        </div>
      }/>
      <Route path="page-3" element={
        <div className="stack">
          <h2>{t('wiz.dec.title3')}</h2>
          <div className="card stack">
            <div className="row">
              <div className="col-3"><Field label={t('label.brothers_mother')}><input type="number" min={0} value={state.nbFreresMere||0} onChange={e=>set({ nbFreresMere: Number(e.target.value) })} /></Field></div>
              <div className="col-3"><Field label={t('label.sisters_mother')}><input type="number" min={0} value={state.nbSoeursMere||0} onChange={e=>set({ nbSoeursMere: Number(e.target.value) })} /></Field></div>
              <div className="col-3"><Field label={t('label.brothers_father')}><input type="number" min={0} value={state.nbFreresPere||0} onChange={e=>set({ nbFreresPere: Number(e.target.value) })} /></Field></div>
              <div className="col-3"><Field label={t('label.sisters_father')}><input type="number" min={0} value={state.nbSoeursPere||0} onChange={e=>set({ nbSoeursPere: Number(e.target.value) })} /></Field></div>
            </div>
            <div className="row">
              <div className="col-3"><Field label={t('label.daughters')}><input type="number" min={0} value={state.nbFilles||0} onChange={e=>set({ nbFilles: Number(e.target.value) })} /></Field></div>
              <div className="col-3"><Field label={t('label.sons')}><input type="number" min={0} value={state.nbGarcons||0} onChange={e=>set({ nbGarcons: Number(e.target.value) })} /></Field></div>
              <div className="col-3"><Field label={t('label.proof_photo')}><FilePicker accept="image/*" onFile={(f)=>set({ preuve: f })} /></Field></div>
              <div className="col-3"><Field label={t('label.video_1min')}><FilePicker accept="video/*" onFile={(f)=>set({ video: f })} /></Field></div>
            </div>
            <div className="row">
              <div className="col-6"><Field label={t('label.generation_auto')}><input value={generation} readOnly /></Field></div>
              <div className="col-6"><Field label={t('label.death_auto')}><input value={decet} readOnly /></Field></div>
            </div>
            <div className="actions">
              <button className="btn secondary" onClick={()=>navigate(-1)}>{t('btn.back')}</button>
              <button className="btn" onClick={submitFinal}>{t('btn.submit')}</button>
            </div>
          </div>
        </div>
      }/>
    </Routes>
  )
}


