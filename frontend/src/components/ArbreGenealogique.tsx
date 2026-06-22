import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNumeroHForDisplay } from '../utils/auth'
import './ArbreGenealogique.css'
import { buildFamilyTree, getTreeCompletionRecommendations, FamilyMember as FamilyMemberType, CercleDesRacinesCounts } from '../services/FamilyTreeBuilder'
import { InvitationManager } from '../utils/invitationManager'
import { useI18n } from '../i18n/useI18n'
import { InvitationsReceived } from './InvitationsReceived'

interface FamilyMember {
  id: string
  numeroH: string
  prenom: string
  nomFamille: string
  genre: 'HOMME' | 'FEMME' | 'AUTRE'
  dateNaissance?: string
  dateDeces?: string
  photo?: string
  relation: 'pere' | 'mere' | 'enfant' | 'conjoint' | 'frere' | 'soeur' | 'oncle' | 'tante' | 'cousin' | 'cousine' | 'grand-pere' | 'grand-mere'
  generation: string
  isDeceased?: boolean
  parentId?: string
  children?: string[]
  isVisible?: boolean
}

interface ArbreGenealogiqueProps {
  userData: any
  cercleCounts?: CercleDesRacinesCounts
  treeHidden?: string[]
  onTreeHiddenChange?: (newList: string[]) => void
  onOpenGallery?: () => void
}

export function ArbreGenealogique({ userData, cercleCounts, treeHidden = [], onTreeHiddenChange }: ArbreGenealogiqueProps) {
  const { t } = useI18n()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [generationFilter, setGenerationFilter] = useState<string>('all')
  const [showStats, setShowStats] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)
  const [addMemberType, setAddMemberType] = useState<'vivant' | 'defunt' | null>(null)
  const [newMember, setNewMember] = useState({
    prenom: '',
    nomFamille: userData.nomFamille,
    numeroH: '',
    genre: 'HOMME' as 'HOMME' | 'FEMME' | 'AUTRE',
    relation: 'enfant' as 'pere' | 'mere' | 'enfant' | 'conjoint' | 'frere' | 'soeur',
    dateNaissance: '',
    dateDeces: '',
    isDeceased: false
  })

  const [recommendations, setRecommendations] = useState<string[]>([])
  const [pendingInvitationCount, setPendingInvitationCount] = useState(0)
  const [spouseTreeModal, setSpouseTreeModal] = useState<{ open: boolean; data: any | null; loading: boolean }>({ open: false, data: null, loading: false })
  const [familyDocs, setFamilyDocs] = useState<Record<string, Array<{type: string; description: string; annee?: string}>>>({})
  const [newDoc, setNewDoc] = useState({ type: 'naissance', description: '', annee: '' })
  const [showAddDoc, setShowAddDoc] = useState(false)
  const navigate = useNavigate()

  const handleViewSpouseTree = async (spouseNumeroH: string) => {
    if (!spouseNumeroH) return
    setSpouseTreeModal({ open: true, data: null, loading: true })
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/family-tree/spouse-tree/${spouseNumeroH}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSpouseTreeModal({ open: true, data: res.ok ? data : null, loading: false })
    } catch {
      setSpouseTreeModal({ open: true, data: null, loading: false })
    }
  }

  useEffect(() => {
    // Construire automatiquement l'arbre généalogique selon les conditions remplies
    const autoBuiltTree = buildFamilyTree(userData)
    setFamilyMembers(autoBuiltTree)
    
    // Obtenir les recommandations pour compléter l'arbre
    const recs = getTreeCompletionRecommendations(userData)
    setRecommendations(recs)

    // Compter les invitations de famille en attente pour cet utilisateur
    const receivedInvitations = InvitationManager.getReceivedInvitations(userData.numeroH)
    const pending = receivedInvitations.filter((inv) => inv.status === 'pending').length
    setPendingInvitationCount(pending)
  }, [userData])

  useEffect(() => {
    const key = `family_docs_${userData.numeroH}`
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}')
      setFamilyDocs(stored)
    } catch { /* ignore */ }
  }, [userData.numeroH])

  const addDocToMember = (memberNumeroH: string) => {
    if (!newDoc.description.trim()) return
    const existing = familyDocs[memberNumeroH] || []
    const updated = { ...familyDocs, [memberNumeroH]: [...existing, { type: newDoc.type, description: newDoc.description.trim(), annee: newDoc.annee.trim() || undefined }] }
    localStorage.setItem(`family_docs_${userData.numeroH}`, JSON.stringify(updated))
    setFamilyDocs(updated)
    setNewDoc({ type: 'naissance', description: '', annee: '' })
    setShowAddDoc(false)
  }

  const deleteDocFromMember = (memberNumeroH: string, index: number) => {
    const existing = [...(familyDocs[memberNumeroH] || [])]
    existing.splice(index, 1)
    const updated = { ...familyDocs, [memberNumeroH]: existing }
    localStorage.setItem(`family_docs_${userData.numeroH}`, JSON.stringify(updated))
    setFamilyDocs(updated)
  }

  const getGenerationMembers = (generation: string) => {
    if (generation === 'all') return familyMembers
    return familyMembers.filter(member => member.generation === generation)
  }

  const getRelationIcon = (relation: string) => {
    const icons: { [key: string]: string } = {
      pere: '👨',
      mere: '👩',
      enfant: '👶',
      conjoint: '💑',
      frere: '👦',
      soeur: '👧',
      oncle: '👨‍💼',
      tante: '👩‍💼',
      cousin: '👦‍🎓',
      cousine: '👧‍🎓',
      'grand-pere': '👴',
      'grand-mere': '👵'
    }
    return icons[relation] || '👤'
  }

  const handleAddMember = () => {
    if (!newMember.numeroH || !newMember.relation) {
      alert('Merci de renseigner le NuméroH et la relation.')
      return
    }

    // Si on ajoute un vivant, on envoie une invitation pour qu'il puisse accepter ou refuser
    if (addMemberType === 'vivant') {
      const fromName = `${userData.prenom ?? ''} ${userData.nomFamille ?? ''}`.trim() || userData.numeroH
      const toName = newMember.prenom || newMember.nomFamille || newMember.numeroH

      InvitationManager.sendInvitation({
        fromNumeroH: userData.numeroH,
        fromName,
        fromPhoto: userData.photo || undefined,
        toNumeroH: newMember.numeroH.trim(),
        toName,
        relation: newMember.relation,
        message: undefined
      })

      alert(`Invitation envoyée au membre ${toName} (${newMember.numeroH}).\nIl pourra accepter ou refuser depuis sa page "Mes invitations".`)
    }

    // Réinitialiser le formulaire (on ne modifie pas directement l'arbre ici)
    setShowAddMemberForm(false)
    setAddMemberType(null)
    setNewMember({
      prenom: '',
      nomFamille: userData.nomFamille,
      numeroH: '',
      genre: 'HOMME',
      relation: 'enfant',
      dateNaissance: '',
      dateDeces: '',
      isDeceased: false
    })
  }

  const calculateGeneration = (relation: string): string => {
    const generationMap: { [key: string]: string } = {
      'grand-pere': 'G-1',
      'grand-mere': 'G-1',
      'pere': 'G0',
      'mere': 'G0',
      'enfant': 'G2',
      'frere': 'G1',
      'soeur': 'G1',
      'conjoint': 'G1',
      'oncle': 'G0',
      'tante': 'G0',
      'cousin': 'G1',
      'cousine': 'G1'
    }
    return generationMap[relation] || 'G1'
  }

  // Helper : forme du carreau selon le genre (Femme = hexagone léger, Homme = rectangle)
  // Hexagone subtil : haut et bas horizontaux, côtés gauche/droit légèrement rentrés (comme sur la maquette)
  const isFemme = (genre?: string) => genre?.toUpperCase() === 'FEMME'
  const hexagonPoints = (x: number, y: number, w: number, h: number) => {
    const inset = w / 10 // léger rentré des côtés (au lieu de w/4)
    return `${x},${y + h / 2} ${x + inset},${y} ${x + w - inset},${y} ${x + w},${y + h / 2} ${x + w - inset},${y + h} ${x + inset},${y + h}`
  }

  const renderNodeShape = (
    genre: 'HOMME' | 'FEMME' | 'AUTRE',
    x: number,
    y: number,
    w: number,
    h: number,
    stroke: string,
    strokeWidth: number,
    fill: string,
    onClick?: () => void,
    extraProps?: Record<string, unknown>
  ) =>
    isFemme(genre) ? (
      <polygon
        points={hexagonPoints(x, y, w, h)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : undefined }}
        {...extraProps}
      />
    ) : (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : undefined }}
        {...extraProps}
      />
    )

  // Helper pour dessiner un nœud personne avec photo + nom complet + NumeroH
  const renderPersonNode = (
    person: Partial<FamilyMember> & { prenom?: string; nomFamille?: string; numeroH?: string; photo?: string; genre?: 'HOMME' | 'FEMME' | 'AUTRE' },
    x: number,
    y: number,
    w: number,
    h: number,
    opts?: { label?: string }
  ) => {
    const fullName = `${person.prenom ?? ''} ${person.nomFamille ?? ''}`.trim() || opts?.label || '—'
    const numero = person.numeroH || '—'
    const stroke = '#1a8f1a' // emerald-600
    const textDark = '#0f172a' // slate-900
    const textMuted = '#475569' // slate-600

    const photoX = x + 10
    const photoY = y + h / 2
    const textX = x + 60
    const titleY = y + 28
    const nameY = y + 50
    const numY = y + 66

    return (
      <g>
        {renderNodeShape(person.genre || 'HOMME', x, y, w, h, stroke, 3, 'white')}

        {/* Photo circulaire */}
        {person.photo ? (
          <>
            <defs>
              <clipPath id={`clip-${x}-${y}`}>
                <circle cx={photoX + 16} cy={photoY} r={16} />
              </clipPath>
            </defs>
            <image href={person.photo} x={photoX} y={photoY - 16} width={32} height={32} clipPath={`url(#clip-${x}-${y})`} preserveAspectRatio="xMidYMid slice" />
          </>
        ) : (
          <circle cx={photoX + 16} cy={photoY} r={16} fill="#22a722" opacity={0.2} />
        )}

        {/* Textes */}
        <text x={textX} y={titleY} fontSize={12} fontWeight="bold" fill={textDark}>{opts?.label || (person.genre === 'FEMME' ? 'Femme' : 'Homme')}</text>
        <text x={textX} y={nameY} fontSize={12} fill={textMuted}>{fullName}</text>
        <text x={textX} y={numY} fontSize={11} fill={stroke} fontWeight="bold">{numero}</text>
      </g>
    )
  }

  // Couleur par genre — bleu pour homme, rose pour femme (style MyHeritage)
  const getGenreColor = (genre?: string) =>
    genre?.toUpperCase() === 'FEMME' ? '#be185d' : genre?.toUpperCase() === 'HOMME' ? '#1d4ed8' : '#374151'

  // Ouvre le formulaire d'ajout avec la relation pré-remplie
  const openAddForm = (relation: string) => {
    setShowAddMemberForm(true)
    setAddMemberType('vivant')
    setNewMember(prev => ({ ...prev, relation: relation as any }))
  }

  // Petit badge "+" dans le coin inférieur droit des cartes vides — n'efface pas la carte existante
  const renderPlusButton = (cx: number, cy: number, label: string, relation: string) => (
    <g style={{ cursor: 'pointer' }} onClick={() => openAddForm(relation)}>
      <title>{label}</title>
      <circle cx={cx + 55} cy={cy + 20} r={13} fill="#22a722" stroke="white" strokeWidth="2"/>
      <text x={cx + 55} y={cy + 25} textAnchor="middle" fontSize="16" fill="white" fontWeight="bold">+</text>
    </g>
  )

  // Nœud complet avec photo + nom + numéroH + dates + couleur genre
  const renderSVGNode = (
    genre: 'HOMME' | 'FEMME' | 'AUTRE',
    x: number, y: number,
    prenom: string,
    numeroH: string,
    label: string,
    photo: string | undefined,
    dateNaissance: string | undefined,
    dateDeces: string | undefined,
    clipId: string,
    onClick?: () => void
  ) => {
    const color = getGenreColor(genre)
    const w = 160, h = 70
    const cx = x + 26, cy = y + h / 2
    const displayName = (prenom || '—').length > 13 ? (prenom || '—').substring(0, 12) + '…' : (prenom || '—')
    const displayNum = (numeroH || '').length > 13 ? (numeroH || '').substring(0, 12) : (numeroH || '')
    return (
      <g style={{ cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
        {renderNodeShape(genre, x, y, w, h, color, 3, 'white')}
        <defs><clipPath id={clipId}><circle cx={cx} cy={cy} r={16}/></clipPath></defs>
        {photo
          ? <image href={photo} x={cx - 16} y={cy - 16} width={32} height={32} clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice"/>
          : <circle cx={cx} cy={cy} r={16} fill={color} opacity={0.2}/>
        }
        <text x={x + 58} y={y + 17} fontSize={10} fontWeight="bold" fill={color}>{label}</text>
        <text x={x + 58} y={y + 30} fontSize={11} fill="#374151" fontWeight="500">{displayName}</text>
        <text x={x + 58} y={y + 44} fontSize={10} fill={color} fontWeight="bold">{displayNum}</text>
        {(dateNaissance || dateDeces) && (
          <text x={x + 58} y={y + 59} fontSize={9} fill="#9ca3af">
            {dateDeces
              ? `† ${dateDeces.substring(0, 4)}`
              : dateNaissance ? `né·e ${dateNaissance.substring(0, 4)}` : ''}
          </text>
        )}
      </g>
    )
  }

  // Personnes masquées de ma visibilité (je ne les vois plus dans l'arbre)
  const hiddenSet = new Set((treeHidden || []).map(s => String(s).trim()))
  const isHidden = (numeroH: string) => hiddenSet.has(String(numeroH || '').trim())

  // Filtrer les membres visibles : conditions remplies ET non masqués
  const visibleMembers = familyMembers.filter(m => (m as any).isVisible !== false && !isHidden(m.numeroH))
  const filteredMembers = getGenerationMembers(generationFilter).filter(m => (m as any).isVisible !== false && !isHidden(m.numeroH))
  const generations = [...new Set(visibleMembers.map(m => m.generation))].sort()

  // Invitations en attente (chargées en direct)
  const pendingInvitations = InvitationManager.getReceivedInvitations(userData.numeroH).filter(inv => inv.status === 'pending')

  // Variables pour le rendu SVG (MyHeritage-style)
  const pereMember = familyMembers.find(m => m.relation === 'pere')
  const mereMember = familyMembers.find(m => m.relation === 'mere')
  const hasPere = !!(pereMember?.isVisible)
  const hasMere = !!(mereMember?.isVisible)
  const hasConjoint = !!(userData.conjointNumeroH && userData.conjointPrenom)
  const frereLinked = familyMembers.find(m => m.relation === 'frere' && m.isVisible)
  const soeurLinked = familyMembers.find(m => m.relation === 'soeur' && m.isVisible)
  const g1Mbrs = familyMembers.filter(m => m.generation === 'G-1')
  const gpp = g1Mbrs.filter(m => m.relation === 'grand-pere')[0]
  const gmp = g1Mbrs.filter(m => m.relation === 'grand-mere')[0]
  const gpm = g1Mbrs.filter(m => m.relation === 'grand-pere')[1]
  const gmm = g1Mbrs.filter(m => m.relation === 'grand-mere')[1]
  const hasRealGPP = !!(gpp?.isVisible && gpp?.numeroH !== 'N/A')
  const hasRealGMP = !!(gmp?.isVisible && gmp?.numeroH !== 'N/A')
  const hasRealGPM = !!(gpm?.isVisible && gpm?.numeroH !== 'N/A')
  const hasRealGMM = !!(gmm?.isVisible && gmm?.numeroH !== 'N/A')

  return (
    <div className="arbre-genealogique">

      {/* ══ BANNIÈRE INVITATIONS EN ATTENTE ══ */}
      {pendingInvitations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            <strong style={{ color: '#92400e', fontSize: 16 }}>
              {pendingInvitations.length} invitation{pendingInvitations.length > 1 ? 's' : ''} en attente
            </strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingInvitations.map(inv => (
              <div key={inv.id} style={{
                background: 'white',
                borderRadius: '10px',
                border: '1px solid #fcd34d',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap'
              }}>
                {/* Avatar de l'invitant */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22a722, #1a8f1a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 'bold', fontSize: 18, flexShrink: 0
                }}>
                  {(inv.fromName || '?')[0].toUpperCase()}
                </div>
                {/* Infos */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, color: '#1f2937', fontSize: 15 }}>
                    {inv.fromName}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    NuméroH : <span style={{ fontWeight: 600, color: '#1a8f1a' }}>{inv.fromNumeroH}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>
                    Vous invite en tant que <span style={{ fontWeight: 700, color: '#d97706' }}>{inv.relation}</span>
                  </div>
                  {inv.message && (
                    <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 2 }}>
                      « {inv.message} »
                    </div>
                  )}
                </div>
                {/* Boutons */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      InvitationManager.acceptInvitation(inv.id, userData.numeroH)
                      setPendingInvitationCount(c => Math.max(0, c - 1))
                      window.location.reload()
                    }}
                    style={{
                      background: '#22a722', color: 'white', border: 'none',
                      borderRadius: 8, padding: '7px 14px', fontWeight: 700,
                      cursor: 'pointer', fontSize: 13
                    }}
                  >
                    ✅ Accepter
                  </button>
                  <button
                    onClick={() => {
                      InvitationManager.declineInvitation(inv.id, userData.numeroH)
                      setPendingInvitationCount(c => Math.max(0, c - 1))
                      window.location.reload()
                    }}
                    style={{
                      background: '#ef4444', color: 'white', border: 'none',
                      borderRadius: 8, padding: '7px 14px', fontWeight: 700,
                      cursor: 'pointer', fontSize: 13
                    }}
                  >
                    ❌ Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="arbre-header">
        <h3>🌳 Arbre Généalogique de {userData.prenom} {userData.nomFamille}</h3>

        {/* Indicateur de progression */}
        <div className="tree-progress" style={{
          marginBottom: '15px',
          padding: '12px',
          backgroundColor: '#E0F2FE',
          border: '1px solid #0284C7',
          borderRadius: '6px'
        }}>
          <strong style={{ color: '#0C4A6E' }}>
            📊 Progression de l'arbre : {visibleMembers.length} membre{visibleMembers.length > 1 ? 's' : ''} visible{visibleMembers.length > 1 ? 's' : ''}
            {pendingInvitationCount > 0 &&
              ` | ${pendingInvitationCount} invitation${pendingInvitationCount > 1 ? 's' : ''} en attente`}
          </strong>
        </div>
        
        <div className="arbre-controls">
          <div className="view-controls">
            <button 
              className="view-btn add-member-btn"
              onClick={() => {
                setShowAddMemberForm(!showAddMemberForm)
                setAddMemberType(null)
              }}
            >
              ➕ Ajouter
            </button>
            <button
              className={`view-btn ${showStats ? 'active' : ''}`}
              onClick={() => setShowStats(!showStats)}
            >
              📊 Stats
            </button>
            <button
              className={`view-btn ${showLegend ? 'active' : ''}`}
              onClick={() => setShowLegend(!showLegend)}
            >
              📘 Légende
            </button>
            <button
              className="view-btn"
              onClick={() => navigate('/famille/noyau')}
            >
              🧬 Mon Noyau
            </button>
          </div>

          <div className="filter-controls">
            <label>Génération:</label>
            <select 
              value={generationFilter} 
              onChange={(e) => setGenerationFilter(e.target.value)}
            >
              <option value="all">Toutes</option>
              {generations.map(gen => (
                <option key={gen} value={gen}>{gen}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Formulaire d'ajout de membre */}
      {showAddMemberForm && (
        <div className="add-member-form">
          <h4>Ajouter un nouveau membre de la famille</h4>

          {/* Choix du type de membre à ajouter */}
          <div className="form-grid">
            <div className="form-group">
              <label>Que souhaitez-vous ajouter ?</label>
              <div className="add-member-type-buttons">
                <button
                  type="button"
                  className={`view-btn ${addMemberType === 'vivant' ? 'active' : ''}`}
                  onClick={() => setAddMemberType('vivant')}
                >
                  👤 Ajouter un vivant
                </button>
                <button
                  type="button"
                  className={`view-btn ${addMemberType === 'defunt' ? 'active' : ''}`}
                  onClick={() => {
                    setShowAddMemberForm(false)
                    setAddMemberType(null)
                    navigate('/defunt')
                  }}
                >
                  🕊️ Ajouter un défunt
                </button>
              </div>
            </div>
          </div>

          {/* Formulaire pour inviter un vivant */}
          {addMemberType === 'vivant' && (
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label>NuméroH du vivant à inviter *</label>
                  <input
                    type="text"
                    value={newMember.numeroH}
                    onChange={(e) => setNewMember({...newMember, numeroH: e.target.value})}
                    placeholder="NuméroH"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Relation souhaitée *</label>
                  <select
                    value={newMember.relation}
                    onChange={(e) => setNewMember({...newMember, relation: e.target.value as any})}
                  >
                    <option value="">Sélectionner une relation</option>
                    <option value="pere">Père</option>
                    <option value="mere">Mère</option>
                    <option value="grand-pere">Grand-père</option>
                    <option value="grand-mere">Grand-mère</option>
                    <option value="arriere-grand-pere">Arrière grand-père</option>
                    <option value="arriere-grand-mere">Arrière grand-mère</option>
                    <option value="frere">Frère</option>
                    <option value="soeur">Sœur</option>
                    <option value="enfant">Enfant</option>
                    <option value="conjoint">Conjoint(e)</option>
                    <option value="oncle">Oncle</option>
                    <option value="tante">Tante</option>
                    <option value="cousin">Cousin</option>
                    <option value="cousine">Cousine</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="btn-submit"
                  onClick={handleAddMember}
                  disabled={!newMember.numeroH || !newMember.relation}
                >
                  Envoyer l'invitation
                </button>
                <button 
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddMemberForm(false)
                    setAddMemberType(null)
                  }}
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Vue arbre généalogique — style MyHeritage : couleurs par genre, dates, boutons "+" */}
      <div className="tree-view-horizontal">
        <svg className="tree-svg" width="100%" height="750" viewBox="0 0 1350 750">
          {/* ── G-1 : Grands-parents (affiché seulement si présents) ── */}
          {familyMembers.filter(m => m.generation === 'G-1').length > 0 && (() => {
            const gpp = familyMembers.filter(m => m.relation === 'grand-pere' && m.generation === 'G-1')[0]
            const gmp = familyMembers.filter(m => m.relation === 'grand-mere' && m.generation === 'G-1')[0]
            const gpm = familyMembers.filter(m => m.relation === 'grand-pere' && m.generation === 'G-1')[1]
            const gmm = familyMembers.filter(m => m.relation === 'grand-mere' && m.generation === 'G-1')[1]
            return (
            <g className="generation-g-1">

              {/* Grand-père paternel  [x=190..350, y=40..110] — HOMME = rectangle */}
              {renderNodeShape('HOMME', 190, 40, 160, 70, '#A0522D', 3, 'white',
                () => setSelectedMember(gpp || null))}
              <circle cx="218" cy="75" r="20" fill="#A0522D" opacity="0.25" />
              {gpp?.photo && (
                <image href={gpp.photo}
                  x="198" y="55" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                  clipPath="url(#c-gpp)" />
              )}
              <defs><clipPath id="c-gpp"><circle cx="218" cy="75" r="20"/></clipPath></defs>
              <text x="246" y="66" fontSize="11" fontWeight="bold" fill="#2c5530">Père</text>
              <text x="246" y="80" fontSize="11" fill="#555">{gpp?.prenom || 'Grand-père'}</text>
              <text x="246" y="94" fontSize="10" fill="#A0522D" fontWeight="bold">{gpp?.numeroH || ''}</text>

              {/* Connecteur horizontal couple paternel — dans le gap x=350..390 */}
              <line x1="350" y1="75" x2="390" y2="75" stroke="#A0522D" strokeWidth="2"/>

              {/* Grand-mère paternelle  [x=390..550] — FEMME = hexagone */}
              {renderNodeShape('FEMME', 390, 40, 160, 70, '#A0522D', 3, 'white',
                () => setSelectedMember(gmp || null))}
              <circle cx="418" cy="75" r="20" fill="#A0522D" opacity="0.25" />
              {gmp?.photo && (
                <image href={gmp.photo}
                  x="398" y="55" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                  clipPath="url(#c-gmp)" />
              )}
              <defs><clipPath id="c-gmp"><circle cx="418" cy="75" r="20"/></clipPath></defs>
              <text x="446" y="66" fontSize="11" fontWeight="bold" fill="#2c5530">Mère</text>
              <text x="446" y="80" fontSize="11" fill="#555">{gmp?.prenom || 'Grand-mère'}</text>
              <text x="446" y="94" fontSize="10" fill="#A0522D" fontWeight="bold">{gmp?.numeroH || ''}</text>

              {/* Vertical couple paternel → Père G0
                  x=370 est dans le gap 350..390, y=75..190 ne croise aucune boîte */}
              <line x1="370" y1="75" x2="370" y2="190" stroke="#A0522D" strokeWidth="2"/>

              {/* Grand-père maternel  [x=630..790] — HOMME = rectangle */}
              {renderNodeShape('HOMME', 630, 40, 160, 70, '#A0522D', 3, 'white',
                () => setSelectedMember(gpm || null))}
              <circle cx="658" cy="75" r="20" fill="#A0522D" opacity="0.25" />
              {gpm?.photo && (
                <image href={gpm.photo}
                  x="638" y="55" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                  clipPath="url(#c-gpm)" />
              )}
              <defs><clipPath id="c-gpm"><circle cx="658" cy="75" r="20"/></clipPath></defs>
              <text x="686" y="66" fontSize="11" fontWeight="bold" fill="#2c5530">Père</text>
              <text x="686" y="80" fontSize="11" fill="#555">{gpm?.prenom || 'Grand-père'}</text>
              <text x="686" y="94" fontSize="10" fill="#A0522D" fontWeight="bold">{gpm?.numeroH || ''}</text>

              {/* Connecteur horizontal couple maternel — dans le gap x=790..830 */}
              <line x1="790" y1="75" x2="830" y2="75" stroke="#A0522D" strokeWidth="2"/>

              {/* Grand-mère maternelle  [x=830..990] — FEMME = hexagone */}
              {renderNodeShape('FEMME', 830, 40, 160, 70, '#A0522D', 3, 'white',
                () => setSelectedMember(gmm || null))}
              <circle cx="858" cy="75" r="20" fill="#A0522D" opacity="0.25" />
              {gmm?.photo && (
                <image href={gmm.photo}
                  x="838" y="55" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                  clipPath="url(#c-gmm)" />
              )}
              <defs><clipPath id="c-gmm"><circle cx="858" cy="75" r="20"/></clipPath></defs>
              <text x="886" y="66" fontSize="11" fontWeight="bold" fill="#2c5530">Mère</text>
              <text x="886" y="80" fontSize="11" fill="#555">{gmm?.prenom || 'Grand-mère'}</text>
              <text x="886" y="94" fontSize="10" fill="#A0522D" fontWeight="bold">{gmm?.numeroH || ''}</text>

              {/* Vertical couple maternel → Mère G0
                  x=810 dans le gap 790..830 */}
              <line x1="810" y1="75" x2="810" y2="190" stroke="#A0522D" strokeWidth="2"/>
            </g>
            )
          })()}

          {/* ── G0 : Parents ── */}
          <g className="generation-g0">

            {/* Père  [x=290..450, cy=225] — HOMME = rectangle */}
            {renderNodeShape('HOMME', 290, 190, 160, 70, '#CD853F', 3, 'white',
              () => setSelectedMember(familyMembers.find(m => m.relation === 'pere') || null))}
            <circle cx="318" cy="225" r="20" fill="#CD853F" opacity="0.25" />
            {familyMembers.find(m => m.relation === 'pere')?.photo && (
                <image href={familyMembers.find(m => m.relation === 'pere')?.photo}
                x="298" y="205" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                clipPath="url(#c-pere)" />
            )}
            <defs><clipPath id="c-pere"><circle cx="318" cy="225" r="20"/></clipPath></defs>
            <text x="346" y="216" fontSize="11" fontWeight="bold" fill="#2c5530">Mari / Père</text>
            <text x="346" y="230" fontSize="11" fill="#555">{familyMembers.find(m => m.relation === 'pere')?.prenom || userData.prenomPere || 'Père'}</text>
            <text x="346" y="244" fontSize="10" fill="#CD853F" fontWeight="bold">{familyMembers.find(m => m.relation === 'pere')?.numeroH || userData.numeroHPere || ''}</text>

            {/* Connecteur horizontal Père ↔ Mère — dans le gap x=450..730
                Vertical de descente part du milieu (x=590) — x=590 hors de toute boîte G0 */}
            <line x1="450" y1="225" x2="730" y2="225" stroke="#CD853F" strokeWidth="2"/>
            <text x="590" y="217" textAnchor="middle" fontSize="11" fill="#FF9800" fontWeight="bold">Conjoints</text>

            {/* Mère  [x=730..890, cy=225] — FEMME = hexagone */}
            {renderNodeShape('FEMME', 730, 190, 160, 70, '#CD853F', 3, 'white',
              () => setSelectedMember(familyMembers.find(m => m.relation === 'mere') || null))}
            <circle cx="758" cy="225" r="20" fill="#CD853F" opacity="0.25" />
            {familyMembers.find(m => m.relation === 'mere')?.photo && (
                <image href={familyMembers.find(m => m.relation === 'mere')?.photo}
                x="738" y="205" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                clipPath="url(#c-mere)" />
            )}
            <defs><clipPath id="c-mere"><circle cx="758" cy="225" r="20"/></clipPath></defs>
            <text x="786" y="216" fontSize="11" fontWeight="bold" fill="#2c5530">Femme / Mère</text>
            <text x="786" y="230" fontSize="11" fill="#555">{familyMembers.find(m => m.relation === 'mere')?.prenom || userData.prenomMere || 'Mère'}</text>
            <text x="786" y="244" fontSize="10" fill="#CD853F" fontWeight="bold">{familyMembers.find(m => m.relation === 'mere')?.numeroH || userData.numeroHMere || ''}</text>

            {/* Vertical G0 → barre G1  (x=590 dans le gap père..mère, y=225→310) */}
            <line x1="590" y1="225" x2="590" y2="310" stroke="#CD853F" strokeWidth="2"/>
          </g>

          {/* ── Barre horizontale G1 (y=310) + branches vers chaque enfant ──
               Barre de x=390 à x=790 ; branches descendent vers les boîtes y=350
               Aucune boîte n'est à y=310 (G0 finit à y=260, G1 commence à y=350) */}
          <line x1="390" y1="310" x2="790" y2="310" stroke="#4CAF50" strokeWidth="2"/>
          <line x1="390" y1="310" x2="390" y2="350" stroke="#4CAF50" strokeWidth="2"/>
          <line x1="590" y1="310" x2="590" y2="350" stroke="#4CAF50" strokeWidth="2"/>
          <line x1="790" y1="310" x2="790" y2="350" stroke="#4CAF50" strokeWidth="2"/>

          {/* ── G1 : Fratrie + VOUS + Conjoint(e) ── */}
          <g className="generation-g1">

            {/* Frère  [x=310..470, cx=390] — HOMME = rectangle */}
            {renderNodeShape('HOMME', 310, 350, 160, 70, '#667eea', 3, 'white',
              () => setSelectedMember(familyMembers.find(m => m.relation === 'frere') || null))}
            <circle cx="338" cy="385" r="20" fill="#667eea" opacity="0.25" />
            {familyMembers.find(m => m.id === '6')?.photo && (
              <image href={familyMembers.find(m => m.id === '6')?.photo}
                x="318" y="365" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                clipPath="url(#c-frere)" />
            )}
            <defs><clipPath id="c-frere"><circle cx="338" cy="385" r="20"/></clipPath></defs>
            <text x="366" y="377" fontSize="11" fontWeight="bold" fill="#2c5530">Frère</text>
            <text x="366" y="391" fontSize="11" fill="#555">{familyMembers.find(m => m.relation === 'frere')?.prenom || 'Frère'}</text>
            <text x="366" y="405" fontSize="10" fill="#667eea" fontWeight="bold">{familyMembers.find(m => m.relation === 'frere')?.numeroH || ''}</text>

            {/* Sœur  [x=510..670, cx=590] — FEMME = hexagone */}
            {renderNodeShape('FEMME', 510, 350, 160, 70, '#667eea', 3, 'white',
              () => setSelectedMember(familyMembers.find(m => m.relation === 'soeur') || null))}
            <circle cx="538" cy="385" r="20" fill="#667eea" opacity="0.25" />
            {familyMembers.find(m => m.relation === 'soeur')?.photo && (
                <image href={familyMembers.find(m => m.relation === 'soeur')?.photo}
                x="518" y="365" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                clipPath="url(#c-soeur)" />
            )}
            <defs><clipPath id="c-soeur"><circle cx="538" cy="385" r="20"/></clipPath></defs>
            <text x="566" y="377" fontSize="11" fontWeight="bold" fill="#2c5530">Sœur</text>
            <text x="566" y="391" fontSize="11" fill="#555">{familyMembers.find(m => m.relation === 'soeur')?.prenom || 'Sœur'}</text>
            <text x="566" y="405" fontSize="10" fill="#667eea" fontWeight="bold">{familyMembers.find(m => m.relation === 'soeur')?.numeroH || ''}</text>

            {/* VOUS  [x=710..870, cx=790] — forme selon userData.genre */}
            {renderNodeShape((userData.genre?.toUpperCase() || 'HOMME') as 'HOMME' | 'FEMME' | 'AUTRE', 710, 350, 160, 70, '#667eea', 4, 'white',
              () => setSelectedMember(familyMembers.find(m => m.numeroH === userData.numeroH) || null),
              { className: 'current-user' })}
            <circle cx="738" cy="385" r="20" fill="#667eea" opacity="0.4" />
            {userData.photo && (
              <image href={userData.photo}
                x="718" y="365" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                clipPath="url(#c-vous)" />
            )}
            <defs><clipPath id="c-vous"><circle cx="738" cy="385" r="20"/></clipPath></defs>
            <text x="766" y="377" fontSize="11" fontWeight="bold" fill="#667eea">VOUS</text>
            <text x="766" y="391" fontSize="11" fill="#555">{userData.prenom}</text>
            <text x="766" y="405" fontSize="10" fill="#667eea" fontWeight="bold">{userData.numeroH}</text>
            {/* Indicateur orange */}
            <circle cx="862" cy="360" r="5" fill="#FF9800"/>

            {/* Conjoint(e) et descente vers G2 */}
            {Boolean(userData.conjointNumeroH && userData.conjointPrenom) ? (
              <>
                {/* Connecteur VOUS ↔ Conjoint — dans le gap x=870..910 */}
                <line x1="870" y1="385" x2="910" y2="385" stroke="#4CAF50" strokeWidth="2"/>
                <text x="890" y="377" textAnchor="middle" fontSize="10" fill="#FF9800" fontWeight="bold">♥</text>

                {/* Conjoint(e)  [x=910..1070, cx=990] — forme selon conjointGenre */}
                {renderNodeShape((userData.conjointGenre?.toUpperCase() === 'FEMME' ? 'FEMME' : 'HOMME') as 'HOMME' | 'FEMME' | 'AUTRE', 910, 350, 160, 70, '#667eea', 3, 'white',
                  () => setSelectedMember(familyMembers.find(m => m.relation === 'conjoint') || null))}
                <circle cx="938" cy="385" r="20" fill="#667eea" opacity="0.25" />
                {userData.conjointPhoto && (
                  <image href={userData.conjointPhoto}
                    x="918" y="365" width="40" height="40" preserveAspectRatio="xMidYMid slice"
                    clipPath="url(#c-conj)" />
                )}
                <defs><clipPath id="c-conj"><circle cx="938" cy="385" r="20"/></clipPath></defs>
                <text x="966" y="377" fontSize="11" fontWeight="bold" fill="#2c5530">
                  {userData.conjointGenre?.toUpperCase() === 'HOMME' ? 'Époux' : 'Épouse'}
                </text>
                <text x="966" y="391" fontSize="11" fill="#555">{userData.conjointPrenom}</text>
                <text x="966" y="405" fontSize="10" fill="#667eea" fontWeight="bold">{userData.conjointNumeroH}</text>
                {/* Bouton "Voir plus" pour accéder à l'arbre du conjoint */}
                <g style={{ cursor: 'pointer' }} onClick={() => handleViewSpouseTree(userData.conjointNumeroH)}>
                  <rect x="912" y="413" width="72" height="16" rx="6" fill="#667eea" opacity="0.85"/>
                  <text x="948" y="424" fontSize="9" textAnchor="middle" fill="white" fontWeight="bold">Voir arbre</text>
                </g>

                {/* Vertical du milieu du connecteur (x=890, dans le gap 870..910) vers barre G2
                    y=385→420 : x=890 dans le gap — aucune boîte traversée
                    y=420→460 : espace libre entre G1 et G2 */}
                <line x1="890" y1="385" x2="890" y2="460" stroke="#1a8f1a" strokeWidth="2"/>
              </>
            ) : (
              /* Sans conjoint : vertical depuis le bas de la boîte VOUS (y=420)
                 y=420 = bord inférieur de VOUS — aucune boîte traversée */
              <line x1="790" y1="420" x2="790" y2="460" stroke="#1a8f1a" strokeWidth="2"/>
            )}
          </g>

          {/* ── Barre horizontale G2 (y=460) + branches ──
               Barre de x=790 à x=990 ; branches à x=790 et x=990
               y=460 est entre G1 (finit y=420) et G2 (commence y=490) */}
          <line x1="790" y1="460" x2="990" y2="460" stroke="#1a8f1a" strokeWidth="2"/>
          <line x1="790" y1="460" x2="790" y2="490" stroke="#1a8f1a" strokeWidth="2"/>
          <line x1="990" y1="460" x2="990" y2="490" stroke="#1a8f1a" strokeWidth="2"/>

          {/* ── G2 : Enfants + leurs conjoints ── */}
          <g className="generation-g2">

            {/* Mari de la Fille  [x=510..670] */}
            {renderPersonNode({ genre: 'HOMME', prenom: '', nomFamille: '', numeroH: '' }, 510, 490, 160, 70, { label: 'Mari' })}

            {/* Connecteur Mari ↔ Fille — dans le gap x=670..710 */}
            <line x1="670" y1="525" x2="710" y2="525" stroke="#1a8f1a" strokeWidth="2"/>

            {/* Fille  [x=710..870, cx=790] */}
            {renderPersonNode({ genre: 'FEMME', prenom: '', nomFamille: userData.nomFamille, numeroH: '' }, 710, 490, 160, 70, { label: 'Fille' })}

            {/* Vertical couple Mari-Fille → Petite-fille
                x=690 dans le gap 670..710 ; y=525→560 dans la zone G2 (gap) ; y=560→630 espace libre */}
            <line x1="690" y1="525" x2="690" y2="630" stroke="#1a8f1a" strokeWidth="2"/>

            {/* Garçon  [x=910..1070, cx=990] */}
            {renderPersonNode({ genre: 'HOMME', prenom: '', nomFamille: userData.nomFamille, numeroH: '' }, 910, 490, 160, 70, { label: 'Garçon' })}

            {/* Connecteur Garçon ↔ Femme — dans le gap x=1070..1110 */}
            <line x1="1070" y1="525" x2="1110" y2="525" stroke="#1a8f1a" strokeWidth="2"/>

            {/* Femme du Garçon  [x=1110..1270] */}
            {renderPersonNode({ genre: 'FEMME', prenom: '', nomFamille: '', numeroH: '' }, 1110, 490, 160, 70, { label: 'Femme' })}

            {/* Vertical couple Garçon-Femme → Petit-garçon
                x=1090 dans le gap 1070..1110 */}
            <line x1="1090" y1="525" x2="1090" y2="630" stroke="#1a8f1a" strokeWidth="2"/>
          </g>

          {/* ── G3 : Petits-enfants ── */}
          <g className="generation-g3">
            {/* Petite-fille  [x=610..770, cx=690] */}
            {renderPersonNode({ genre: 'FEMME', prenom: '', nomFamille: userData.nomFamille, numeroH: '' }, 610, 630, 160, 70, { label: 'Petite-fille' })}
            {/* Petit-garçon  [x=1010..1170, cx=1090] */}
            {renderPersonNode({ genre: 'HOMME', prenom: '', nomFamille: userData.nomFamille, numeroH: '' }, 1010, 630, 160, 70, { label: 'Petit-garçon' })}
          </g>

          {/* ── Badges "+" sur TOUS les nœuds (ajout MyHeritage-style) ── */}
          {/* G-1 : sur chaque carte grand-parent quand la section est visible */}
          {familyMembers.some(m => m.generation === 'G-1') && (<>
            {renderPlusButton(270, 75, 'G-père paternel', 'grand-pere')}
            {renderPlusButton(470, 75, 'G-mère paternelle', 'grand-mere')}
            {renderPlusButton(710, 75, 'G-père maternel', 'grand-pere')}
            {renderPlusButton(910, 75, 'G-mère maternelle', 'grand-mere')}
          </>)}
          {/* G0 : Père et Mère */}
          {renderPlusButton(370, 225, 'Lier père', 'pere')}
          {renderPlusButton(810, 225, 'Lier mère', 'mere')}
          {/* G1 : Frère, Sœur, VOUS, Conjoint */}
          {renderPlusButton(390, 385, 'Ajouter frère', 'frere')}
          {renderPlusButton(590, 385, 'Ajouter sœur', 'soeur')}
          {renderPlusButton(790, 385, 'Ajouter un enfant', 'enfant')}
          {hasConjoint && renderPlusButton(990, 385, 'Lier conjoint(e)', 'conjoint')}
          {/* G2 : enfants et leurs conjoints */}
          {renderPlusButton(590, 525, 'Mari de la fille', 'conjoint')}
          {renderPlusButton(790, 525, 'Ajouter fille', 'enfant')}
          {renderPlusButton(990, 525, 'Ajouter garçon', 'enfant')}
          {renderPlusButton(1190, 525, 'Femme du garçon', 'conjoint')}
          {/* G3 : petits-enfants */}
          {renderPlusButton(690, 665, 'Petite-fille', 'enfant')}
          {renderPlusButton(1090, 665, 'Petit-garçon', 'enfant')}

        </svg>
      </div>

      {/* Personnes masquées : liste avec bouton Réafficher */}
      {treeHidden.length > 0 && onTreeHiddenChange && (
        <div className="arbre-controls mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">👁️ Personnes masquées dans mon arbre</h4>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">Vous ne les voyez plus dans l&apos;arbre. Cliquez sur « Réafficher » pour les faire réapparaître.</p>
          <ul className="space-y-1">
            {treeHidden.map((numeroH) => (
              <li key={numeroH} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono text-gray-700 dark:text-gray-300">{numeroH}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newList = treeHidden.filter((n) => n !== numeroH);
                    onTreeHiddenChange(newList);
                  }}
                  className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
                >
                  Réafficher
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Détails du membre sélectionné — autres membres : nom, NumeroH et photo uniquement */}
      {selectedMember && (() => {
        const isCurrentUser = userData?.numeroH && String(selectedMember.numeroH).trim() === String(userData.numeroH).trim();
        const canHide = !isCurrentUser && onTreeHiddenChange && selectedMember.numeroH && selectedMember.numeroH !== 'N/A';
        return (
          <div className="member-details-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Détails de {selectedMember.prenom} {selectedMember.nomFamille}</h3>
                <button onClick={() => setSelectedMember(null)}>✕</button>
              </div>
              
              <div className="modal-body">
                <div className="detail-photo">
                  {selectedMember.photo ? (
                    <img src={selectedMember.photo} alt={selectedMember.prenom} />
                  ) : (
                    <div className="avatar-large">
                      {selectedMember.prenom.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="detail-info">
                  {canHide && (
                    <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          const num = String(selectedMember.numeroH).trim();
                          if (!treeHidden.includes(num)) {
                            onTreeHiddenChange([...treeHidden, num]);
                            setSelectedMember(null);
                          }
                        }}
                        className="px-3 py-2 rounded-lg font-medium text-sm bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        🙈 Masquer cette personne de mon arbre
                      </button>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Elle ne sera plus visible dans votre arbre. Vous pourrez la réafficher plus tard via la liste « Personnes masquées ».
                      </p>
                    </div>
                  )}
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">NumeroH:</span>
                      <span className="value">{getNumeroHForDisplay(selectedMember.numeroH, isCurrentUser)}</span>
                    </div>
                    {!isCurrentUser && (
                      <p className="text-sm text-gray-500 mt-2">Pour l'identification : nom, NumeroH et photo. Les autres informations sont privées.</p>
                    )}
                    {isCurrentUser && (
                      <>
                        <div className="info-item">
                          <span className="label">Genre:</span>
                          <span className="value">{selectedMember.genre}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Relation:</span>
                          <span className="value">{getRelationIcon(selectedMember.relation)} {selectedMember.relation}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Génération:</span>
                          <span className="value">{selectedMember.generation}</span>
                        </div>
                        {selectedMember.dateNaissance && (
                          <div className="info-item">
                            <span className="label">Date de naissance:</span>
                            <span className="value">{new Date(selectedMember.dateNaissance).toLocaleDateString()}</span>
                          </div>
                        )}
                        {selectedMember.dateDeces && (
                          <div className="info-item">
                            <span className="label">Date de décès:</span>
                            <span className="value">{new Date(selectedMember.dateDeces).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="info-item">
                          <span className="label">Statut:</span>
                          <span className="value">
                            {selectedMember.isDeceased ? '🕊️ Décédé' : '❤️ Vivant'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Documents historiques (équivalent Record Matches MyHeritage) ── */}
                  {selectedMember.numeroH && selectedMember.numeroH !== 'N/A' && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-800">📄 Documents historiques</h4>
                        <button
                          type="button"
                          onClick={() => setShowAddDoc(v => !v)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg font-medium"
                        >
                          {showAddDoc ? 'Annuler' : '+ Ajouter'}
                        </button>
                      </div>

                      {/* Liste des documents */}
                      {(familyDocs[selectedMember.numeroH] || []).length === 0 && !showAddDoc && (
                        <p className="text-xs text-gray-400 italic">Aucun document. Actes de naissance, de mariage, photos anciennes…</p>
                      )}
                      {(familyDocs[selectedMember.numeroH] || []).map((doc, i) => (
                        <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-1 border border-gray-100">
                          <span className="text-base flex-shrink-0">
                            {doc.type === 'naissance' ? '🟢' : doc.type === 'mariage' ? '💍' : doc.type === 'deces' ? '🕯️' : doc.type === 'militaire' ? '🎖️' : doc.type === 'recensement' ? '📋' : doc.type === 'photo' ? '📷' : '📄'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{doc.description}</p>
                            {doc.annee && <p className="text-[10px] text-gray-400">{doc.annee}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteDocFromMember(selectedMember.numeroH, i)}
                            className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0"
                          >✕</button>
                        </div>
                      ))}

                      {/* Formulaire d'ajout */}
                      {showAddDoc && (
                        <div className="space-y-2 mt-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <select
                            value={newDoc.type}
                            onChange={e => setNewDoc(v => ({ ...v, type: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                          >
                            <option value="naissance">🟢 Acte de naissance</option>
                            <option value="mariage">💍 Acte de mariage</option>
                            <option value="deces">🕯️ Acte de décès</option>
                            <option value="militaire">🎖️ Dossier militaire</option>
                            <option value="recensement">📋 Recensement</option>
                            <option value="photo">📷 Photo ancienne</option>
                            <option value="autre">📄 Autre document</option>
                          </select>
                          <input
                            type="text"
                            value={newDoc.description}
                            onChange={e => setNewDoc(v => ({ ...v, description: e.target.value }))}
                            placeholder="Description (ex: Archives de Conakry, 1952)"
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                          />
                          <input
                            type="text"
                            value={newDoc.annee}
                            onChange={e => setNewDoc(v => ({ ...v, annee: e.target.value }))}
                            placeholder="Année (optionnel)"
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => addDocToMember(selectedMember.numeroH)}
                            disabled={!newDoc.description.trim()}
                            className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                          >
                            Enregistrer le document
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Statistiques dans une fenêtre modale indépendante */}
      {showStats && (
        <div className="member-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📊 Statistiques de l'arbre</h3>
              <button onClick={() => setShowStats(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="arbre-stats">
                <div className="stat-card">
                  <p><strong>Total membres:</strong> {familyMembers.length}</p>
                  <p><strong>Vivants:</strong> {familyMembers.filter(m => !m.isDeceased).length}</p>
                  <p><strong>Décédés:</strong> {familyMembers.filter(m => m.isDeceased).length}</p>
                  <p><strong>Générations:</strong> {generations.length}</p>

                  {cercleCounts && (
                    <div className="mt-4 text-left">
                      <h5 className="text-sm sm:text-base font-semibold mb-2">
                        {t('wiz.live.title4')}
                      </h5>
                      <p className="text-xs sm:text-sm text-white/80 mb-3">
                        Effectifs calculés automatiquement à partir de votre arbre familial.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.brothers_mother')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbFreresMere}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.sisters_mother')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbSoeursMere}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.brothers_father')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbFreresPere}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.sisters_father')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbSoeursPere}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.aunts_maternal')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbTantesMaternelles}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.aunts_paternal')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbTantesPaternelles}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.uncles_maternal')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbOnclesMaternels}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.uncles_paternal')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbOnclesPaternels}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.cousins_male')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbCousins}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.cousins_female')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbCousines}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.daughters')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbFilles}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-medium text-white mb-1">
                            {t('label.sons')}
                          </div>
                          <div className="px-3 py-1.5 bg-white/10 rounded-lg text-center font-semibold">
                            {cercleCounts.nbGarcons}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ancienne vue liste intégrée dans la modale Statistiques */}
                <div className="list-view">
                  <h4 className="mt-4 mb-2">📋 Détails des membres</h4>
                  <div className="members-list">
                    {filteredMembers.map(member => {
                      const isCurrentUser = userData?.numeroH && String(member.numeroH).trim() === String(userData.numeroH).trim();
                      return (
                        <div 
                          key={member.id}
                          className={`list-member ${member.isDeceased ? 'deceased' : ''}`}
                          onClick={() => setSelectedMember(member)}
                        >
                          <div className="member-avatar">
                            {member.photo ? (
                              <img src={member.photo} alt={member.prenom} />
                            ) : (
                              <div className="avatar-placeholder">
                                {member.prenom.charAt(0)}
                              </div>
                            )}
                          </div>
                          
                          <div className="member-details">
                            <h4>{member.prenom} {member.nomFamille}</h4>
                            <p><strong>NumeroH:</strong> {getNumeroHForDisplay(member.numeroH, isCurrentUser)}</p>
                            {isCurrentUser && (
                              <>
                                <p><strong>Relation:</strong> {getRelationIcon(member.relation)} {member.relation}</p>
                                <p><strong>Génération:</strong> {member.generation}</p>
                                <p><strong>Genre:</strong> {member.genre}</p>
                                {member.dateNaissance && (
                                  <p><strong>Né:</strong> {new Date(member.dateNaissance).toLocaleDateString()}</p>
                                )}
                                {member.dateDeces && (
                                  <p><strong>Décédé:</strong> {new Date(member.dateDeces).toLocaleDateString()}</p>
                                )}
                              </>
                            )}
                          </div>
                          
                          {isCurrentUser && (
                            <div className="member-status">
                              {member.isDeceased ? (
                                <span className="status deceased">🕊️ Décédé</span>
                              ) : (
                                <span className="status alive">❤️ Vivant</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mes invitations de famille (statistiques d'invitations) */}
                <div className="mt-6">
                  <h4 className="mb-2 text-base font-semibold text-white">
                    📩 Mes invitations de famille
                  </h4>
                  <div className="bg-white rounded-xl p-3 sm:p-4">
                    <InvitationsReceived userData={userData} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Légende dans une fenêtre modale indépendante */}
      {showLegend && (
        <div className="member-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📘 Légende de l'arbre</h3>
              <button onClick={() => setShowLegend(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Recommandations pour compléter l'arbre (déplacées ici) */}
              {recommendations.length > 0 && (
                <div
                  className="tree-recommendations"
                  style={{
                    marginBottom: '16px',
                    padding: '15px',
                    backgroundColor: '#FEF3C7',
                    border: '2px solid #F59E0B',
                    borderRadius: '8px',
                    textAlign: 'left',
                  }}
                >
                  <h4 style={{ marginTop: 0, color: '#92400E', fontSize: '14px' }}>
                    💡 Recommandations pour compléter votre arbre généalogique :
                  </h4>
                  <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                    {recommendations.map((rec, index) => (
                      <li
                        key={index}
                        style={{ color: '#78350F', marginBottom: '6px', fontSize: '13px' }}
                      >
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="tree-legend-card">
                <div className="legend-section">
                  <div className="legend-section-title">Générations :</div>
                  <div className="legend-row">
                    <span className="legend-color" style={{ backgroundColor: '#A0522D' }} />
                    <span>G-1 : Grands-parents</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-color" style={{ backgroundColor: '#CD853F' }} />
                    <span>G0 : Parents</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-color" style={{ backgroundColor: '#667eea' }} />
                    <span>G1 : Vous / Fratrie</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-color" style={{ backgroundColor: '#4CAF50' }} />
                    <span>G2 : Enfants</span>
                  </div>
                </div>
                <div className="legend-section">
                  <div className="legend-section-title">Genres :</div>
                  <div className="legend-row">
                    <span className="legend-shape legend-male" /> <span>= Homme</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-shape legend-female" /> <span>= Femme</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-dot" /> <span>= Vous</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ARBRE DU CONJOINT ══ */}
      {spouseTreeModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 520, width: '95%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#2c5530', fontSize: 18 }}>Arbre familial de {userData.conjointPrenom}</h3>
              <button onClick={() => setSpouseTreeModal({ open: false, data: null, loading: false })}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            {spouseTreeModal.loading && <p style={{ textAlign: 'center', color: '#888' }}>Chargement...</p>}

            {!spouseTreeModal.loading && spouseTreeModal.data && (
              <>
                {spouseTreeModal.data.accessLevel === 'limited' && (
                  <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13, color: '#92400e' }}>
                    Accès limité — union de {spouseTreeModal.data.unionDays} jour(s). Accès complet dans <strong>{spouseTreeModal.data.daysUntilFullAccess}</strong> jour(s) (après 1 an).
                  </div>
                )}
                {spouseTreeModal.data.accessLevel === 'full' && (
                  <div style={{ background: '#dcfcdc', border: '1px solid #22a722', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 13, color: '#0f4b0f' }}>
                    Accès complet — union de {spouseTreeModal.data.unionDays} jour(s).
                    {spouseTreeModal.data.tree?.familyCode && <> Code : <strong>{spouseTreeModal.data.tree.familyCode}</strong></>}
                  </div>
                )}
                <div>
                  <strong style={{ fontSize: 14, color: '#444' }}>Membres ({spouseTreeModal.data.tree?.memberCount || spouseTreeModal.data.tree?.members?.length || 0})</strong>
                  <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13 }}>
                    {(spouseTreeModal.data.tree?.members || []).map((m: any) => (
                      <li key={m.numeroH} style={{ marginBottom: 4 }}>
                        {m.prenom} {m.nomFamille}
                        {spouseTreeModal.data.accessLevel === 'full' && <span style={{ color: '#888', marginLeft: 8, fontSize: 11 }}>({m.genre?.toLowerCase()})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {!spouseTreeModal.loading && !spouseTreeModal.data && (
              <p style={{ color: '#e53e3e', textAlign: 'center' }}>Impossible de charger l'arbre. Vérifiez votre lien de couple.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

