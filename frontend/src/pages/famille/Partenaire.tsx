import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { isAdmin, getNumeroHForDisplay } from '../../utils/auth'
import { MediaUploader } from '../../components/MediaUploader'
import { CommunicationHub } from '../../components/CommunicationHub'
import { AddPersonModal } from '../../components/AddPersonModal'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

interface UserData {
  numeroH: string
  prenom: string
  nomFamille: string
  genre: 'HOMME' | 'FEMME' | 'AUTRE'
  dateNaissance?: string
  date_naissance?: string
  role?: string
  isAdmin?: boolean
}


interface PartnerInfo {
  numeroH: string
  prenom: string
  nomFamille: string
  photo?: string
  genre?: string
}

interface LinkInfo {
  id: string
  numeroMariageMairie: string
}

interface PendingInvitation {
  id: string
  numeroH1: string
  numeroH2: string
  numeroMariageMairie: string
  initiatedByNumeroH?: string
  initiator?: { numeroH: string; prenom: string; nomFamille: string }
}

interface Activity {
  id: string
  fromNumeroH: string
  toNumeroH: string
  type: string
  content?: string
  mediaUrl?: string
  fromName?: string
  created_at: string
}

function getToken() {
  return localStorage.getItem('token')
}


type SessionId = 'avant' | 'paradis' | 'objectif'

export default function Partenaire() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<UserData | null>(null)
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [pendingSent, setPendingSent] = useState<Array<{ id: string; status: string; partner?: PartnerInfo }>>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [showPersonModal, setShowPersonModal] = useState(false)
  // Polygamie (homme) — liste des épouses actives
  const [wives, setWives] = useState<Array<{ link: { id: string; status: string; numeroMariageMairie?: string; confirmedAt?: string }; wife: PartnerInfo | null }>>([])
  const [selectedWifeIndex, setSelectedWifeIndex] = useState(0)
  // Liens rompus (récupérables — se remettre ensemble possible)
  const [brokenLinks, setBrokenLinks] = useState<Array<{ link: any; partner: PartnerInfo | null }>>([])
  const [showBroken, setShowBroken] = useState(false)
  // Historique archivé (séparation définitive — contenu supprimé côté demandeur)
  const [archivedLinks, setArchivedLinks] = useState<Array<{ link: any; partner: PartnerInfo | null }>>([])
  const [linkForm, setLinkForm] = useState({
    partnerNumeroH: '',
    numeroMariageMairie: ''
  })
  const [newActivityContent, setNewActivityContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [noteAnnee, setNoteAnnee] = useState(() => new Date().getFullYear())
  const [noteRating, setNoteRating] = useState(0)
  const [activeTab, setActiveTab] = useState<'souvenir' | 'message'>('souvenir')
  const [openSection, setOpenSection] = useState<SessionId | 'notes'>('avant')
  const [mediaBySession, setMediaBySession] = useState<Record<SessionId, Array<{ id: string; type: 'photo' | 'video' | 'audio'; url: string; caption?: string; date: string }>>>({
    avant: [],
    paradis: [],
    objectif: []
  })
  const [uploaderSession, setUploaderSession] = useState<SessionId | null>(null)
  const [partnerRatings, setPartnerRatings] = useState<Array<{ id: string; annee: number; note: number }>>([])
  const [selectedHusbandIndex, setSelectedHusbandIndex] = useState(0)
  const [showVerifSection, setShowVerifSection] = useState(false)

  void activities; void newActivityContent; void setNewActivityContent

  const loadUser = () => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
      const u = sessionData.userData || sessionData
      if (u?.numeroH) setUser(u)
      return u
    } catch {
      return null
    }
  }

  const loadMyPartner = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/couple/my-partner`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPartner(data.partner || null)
        setLinkInfo(data.link || null)
      }
    } catch (e) {
      console.error('Erreur chargement partenaire:', e)
    }
  }

  // Charge toutes les épouses actives (pour un homme)
  const loadMyWives = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/couple/my-wives`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setWives(data.wives || [])
        // Synchro : afficher la 1ère épouse dans l'espace partenaire existant
        if ((data.wives || []).length > 0) {
          const first = data.wives[selectedWifeIndex] || data.wives[0]
          setPartner(first.wife)
          setLinkInfo(first.link)
        } else {
          setPartner(null)
          setLinkInfo(null)
        }
      }
    } catch (e) {
      console.error('Erreur chargement épouses:', e)
    }
  }

  // Charge les liens rompus (récupérables)
  const loadBrokenLinks = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/couple/broken`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setBrokenLinks(data.broken || []) }
    } catch (e) { console.error('Erreur chargement liens rompus:', e) }
  }

  // Charge les liens archivés (séparation définitive)
  const loadArchivedLinks = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/couple/archived`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setArchivedLinks(data.archived || []) }
    } catch (e) { console.error('Erreur chargement historique:', e) }
  }

  const reloadAll = () => {
    const isH = user?.genre === 'HOMME'
    if (isH) loadMyWives(); else { loadMyPartner(); loadArchivedLinks() }
    loadBrokenLinks()
    loadActivities()
    loadPendingInvitations()
    loadPendingSent()
  }

  const loadActivities = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/couple/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const list: Activity[] = data.activities || []
        setActivities(list)

        // Reconstruire les médias par session à partir des activités avec mediaUrl
        const sessions: Record<SessionId, Array<{ id: string; type: 'photo' | 'video' | 'audio'; url: string; caption?: string; date: string }>> = {
          avant: [],
          paradis: [],
          objectif: []
        }
        for (const act of list) {
          if (!act.mediaUrl || !act.type || !act.type.startsWith('souvenir_')) continue
          const key = act.type.replace('souvenir_', '') as SessionId
          if (!sessions[key]) continue
          // Déterminer le type de média et la légende
          let mediaType: 'photo' | 'video' | 'audio' = 'photo'
          let caption = act.content
          if (act.content) {
            try {
              const parsed = JSON.parse(act.content)
              mediaType = parsed.mediaType || 'photo'
              caption = parsed.caption || undefined
            } catch {
              // ancien format base64 : détecter depuis l'URL
              mediaType = act.mediaUrl.startsWith('data:video') ? 'video'
                : act.mediaUrl.startsWith('data:audio') ? 'audio'
                : 'photo'
            }
          }
          const displayUrl = act.mediaUrl.startsWith('data:') || act.mediaUrl.startsWith('http')
            ? act.mediaUrl
            : `${API_BASE}${act.mediaUrl}`
          sessions[key].push({
            id: act.id,
            type: mediaType,
            url: displayUrl,
            caption: caption || undefined,
            date: act.created_at
          })
        }
        setMediaBySession(sessions)
      }
    } catch (e) {
      console.error('Erreur chargement activités:', e)
    }
  }

  const loadPartnerRatings = async (genre?: string) => {
    const token = getToken()
    if (!token) return
    const g = genre ?? user?.genre
    try {
      const path = g === 'HOMME' ? '/api/couple/ratings/given' : '/api/couple/ratings/received'
      const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setPartnerRatings((data.ratings || []).map((r: { id: string; annee: number; note: number }) => ({ id: r.id, annee: r.annee, note: r.note })))
      }
    } catch (e) {
      console.error('Erreur chargement notes partenaire:', e)
    }
  }

  const loadPendingInvitations = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/couple/pending-invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPendingInvitations(data.invitations || [])
      }
    } catch (e) {
      console.error('Erreur invitations:', e)
    }
  }

  const handleConfirmLink = async (linkId: string) => {
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/couple/confirm/${linkId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        loadPendingInvitations()
        loadMyPartner()
        loadActivities()
        loadPendingSent()
      } else alert(data.message || 'Erreur')
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectLink = async (linkId: string) => {
    if (!confirm('Refuser cette demande ? L\'autre personne sera notifiée (Désolé).')) return
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/couple/reject/${linkId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Désolé, je ne souhaite pas créer ce lien.' })
      })
      const data = await res.json()
      if (data.success) {
        loadPendingInvitations()
        loadPendingSent()
      } else alert(data.message || 'Erreur')
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const loadPendingSent = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/couple/pending-sent`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPendingSent(data.invitations || [])
      }
    } catch (e) {
      console.error('Erreur demandes envoyées:', e)
    }
  }

  // Rompre le lien (définitif — conservé en historique jusqu'à suppression)
  const handleBreakLink = async (linkId?: string) => {
    const id = linkId || linkInfo?.id
    if (!id) return
    if (!confirm(
      'Rompre le lien ?\n\n' +
      '• Cette rupture est définitive\n' +
      '• Le lien passera en historique (lecture seule)\n' +
      '• Vous pourrez supprimer cet historique quand vous le souhaitez\n\n' +
      'Continuer ?'
    )) return
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/couple/break/${id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setPartner(null); setLinkInfo(null)
        reloadAll()
      } else alert(data.message || 'Erreur')
    } catch (e) { alert('Erreur réseau') }
    finally { setSubmitting(false) }
  }

  // Alias pour rétrocompatibilité
  const handleArchiveLink = () => handleBreakLink()
  const handleLeaveLink = (linkId?: string) => handleBreakLink(linkId)

  // ÉTAPE 2B : Séparation définitive (supprime côté demandeur uniquement)
  const handleSeparate = async (linkId: string) => {
    if (!confirm(
      'Séparation définitive ?\n\n' +
      '• Vos souvenirs communs seront supprimés DE VOTRE CÔTÉ uniquement\n' +
      "• L'autre personne garde ses souvenirs dans son historique\n" +
      '• Cette action est IRRÉVERSIBLE\n\n' +
      'Confirmer la séparation définitive ?'
    )) return
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/couple/separate/${linkId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) { reloadAll(); alert(data.message) }
      else alert(data.message || 'Erreur')
    } catch (e) { alert('Erreur réseau') }
    finally { setSubmitting(false) }
  }

  useEffect(() => {
    const u = loadUser()

    if (u?.numeroH) {
      const isUserAdmin = isAdmin(u)

      // ── Garde genre / route (sauf admin général qui peut tout voir) ──────────
      const path = location.pathname
      if (!isUserAdmin && u.genre === 'HOMME' && path.includes('/mari')) {
        navigate('/famille', { replace: true })
        return
      }
      if (!isUserAdmin && u.genre === 'FEMME' && path.includes('/femmes')) {
        navigate('/famille', { replace: true })
        return
      }

      setLoading(false)
      if (u.genre === 'HOMME') {
        loadMyWives()
      } else {
        loadMyPartner()
        loadArchivedLinks()
      }
      loadBrokenLinks()   // liens rompus pour tout le monde
      loadActivities()
      loadPartnerRatings(u.genre)
      loadPendingInvitations()
      loadPendingSent()
    } else {
      setLoading(false)
    }
  }, [navigate, location.pathname])

  // Auto-ouvrir la section liens rompus si l'autre personne est à l'origine
  useEffect(() => {
    if (brokenLinks.some(({ link }) => link.brokenByNumeroH && link.brokenByNumeroH !== user?.numeroH)) {
      setShowBroken(true)
    }
  }, [brokenLinks, user?.numeroH])

  const handleCreateLink = async () => {
    if (!linkForm.partnerNumeroH.trim()) {
      alert('Le NumeroH du partenaire est obligatoire.')
      return
    }
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/couple/link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partnerNumeroH: linkForm.partnerNumeroH.trim(),
          numeroMariageMairie: linkForm.numeroMariageMairie.trim() || undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        setLinkForm({ partnerNumeroH: '', numeroMariageMairie: '' })
        setShowLinkForm(false)
        loadMyPartner()
        loadActivities()
        loadPendingInvitations()
        loadPendingSent()
      } else {
        alert(data.message || 'Erreur lors de la liaison')
      }
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddActivity() {
    if (!newActivityContent.trim() || !user) return
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/couple/activity`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'message',
          content: newActivityContent.trim()
        })
      })
      const data = await res.json()
      if (data.success) {
        setNewActivityContent('')
        loadActivities()
      } else {
        alert(data.message || 'Erreur')
      }
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }
  void handleAddActivity

  const handleAddMedia = (mediaData: { type: 'photo' | 'video' | 'audio'; url: string; caption?: string }) => {
    if (!uploaderSession) return
    const session = uploaderSession
    const newItem = { id: Date.now().toString(), ...mediaData, date: new Date().toISOString() }
    setMediaBySession((prev) => ({
      ...prev,
      [session]: [...(prev[session] || []), newItem]
    }))

    const persist = async () => {
      try {
        const token = getToken()
        if (!token) return
        // Convertir l'URL (blob: ou data:) en File pour upload multipart
        const response = await fetch(mediaData.url)
        const blob = await response.blob()
        const ext = mediaData.type === 'photo' ? 'jpg' : mediaData.type === 'video' ? 'webm' : 'ogg'
        const file = new File([blob], `media.${ext}`, { type: blob.type })
        const formData = new FormData()
        const fieldName = mediaData.type === 'photo' ? 'image' : mediaData.type === 'video' ? 'video' : 'audio'
        formData.append(fieldName, file)
        formData.append('type', `souvenir_${session}`)
        formData.append('content', JSON.stringify({ caption: mediaData.caption || '', mediaType: mediaData.type }))
        const res = await fetch(`${API_BASE}/api/couple/activity/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        const data = await res.json()
        if (!data.success) {
          console.error('Erreur sauvegarde média couple:', data)
        } else {
          await loadActivities()
        }
      } catch (e) {
        console.error('Erreur réseau sauvegarde média couple:', e)
      }
    }

    void persist()
    setUploaderSession(null)
  }

  const handleAddNote = async () => {
    if (!user || user.genre !== 'HOMME') return
    if (noteRating < 1 || noteRating > 5) {
      alert('Veuillez choisir une note entre 1 et 5 étoiles.')
      return
    }
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/couple/ratings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ annee: noteAnnee, note: noteRating })
      })
      const data = await res.json()
      if (data.success) {
        setNoteRating(0)
        loadPartnerRatings()
      } else {
        alert(data.message || 'Erreur')
      }
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  const isHomme = user?.genre === 'HOMME'
  const title = isHomme ? 'Ma Femme' : 'Mon Homme'
  const titleIcon = isHomme ? '👰' : '🤵'
  const partnerLabel = isHomme ? 'votre femme' : 'votre homme'
  const userIsAdmin = isAdmin(user)

  // Pour les femmes : un seul mari possible — on dérive husbands depuis partner + linkInfo
  const husbands: Array<{ link: any; husband: PartnerInfo | null }> =
    !isHomme && partner && linkInfo
      ? [{ link: linkInfo, husband: partner }]
      : []

  // Liens rompus PAR L'AUTRE (l'utilisateur est la victime)
  const brokenByOther = brokenLinks.filter(({ link }) => link.brokenByNumeroH && link.brokenByNumeroH !== user?.numeroH)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link
        to="/famille"
        state={{ returnToHub: true }}
        className="mb-4 inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors border border-gray-200 dark:border-gray-600"
      >
        ← Retour à Famille
      </Link>

      {/* ── BANNIÈRE : L'AUTRE PERSONNE A ROMPU ─────────────────────── */}
      {brokenByOther.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">💔</span>
            <div className="flex-1">
              <p className="font-semibold text-rose-800 text-sm">
                {brokenByOther.length === 1
                  ? `${brokenByOther[0].partner ? `${brokenByOther[0].partner.prenom} ${brokenByOther[0].partner.nomFamille}` : 'Votre partenaire'} a rompu le lien.`
                  : `${brokenByOther.length} de vos partenaires ont rompu le lien.`}
              </p>
              <p className="text-xs text-rose-600 mt-1">Ce lien est définitivement rompu. Vous pouvez supprimer cet historique de votre côté.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {brokenByOther.map(({ link, partner: p }) => (
                  <div key={link.id} className="flex gap-2">
                    <button
                      onClick={() => handleSeparate(link.id)}
                      disabled={submitting}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg border border-red-200 transition-colors"
                    >
                      🗑 Supprimer mon historique
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BANNIÈRE COMPACTE avec bouton Vérifier ─────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">{titleIcon} {title}</h2>
          <Link to="/famille/inspir" className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-medium rounded-lg transition-colors border border-yellow-300">
            🤝 Inspir
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setShowVerifSection(!showVerifSection)}
          className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors"
        >
          {showVerifSection ? '✕ Fermer' : '🔍 Vérifier'}
        </button>
      </div>

      {/* ── SECTION VÉRIFIER (collapsible) ──────────────────────────── */}
      {showVerifSection && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <p className="text-slate-600 text-sm mb-4">
            Partagez vos moments et recevez les notes de {partnerLabel}.
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            {/* HOMME : peut ajouter jusqu'à 4 épouses */}
            {isHomme && wives.length < 4 && (
              <button
                onClick={() => setShowLinkForm(!showLinkForm)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                {showLinkForm ? '✕ Annuler' : `💍 Ajouter une épouse (${wives.length}/4)`}
              </button>
            )}
            {isHomme && wives.length >= 4 && (
              <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
                ✅ 4/4 épouses — maximum atteint
              </span>
            )}
            {/* FEMME : 1 seul époux autorisé */}
            {!isHomme && husbands.length < 1 && (
              <button
                onClick={() => setShowLinkForm(!showLinkForm)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                {showLinkForm ? '✕ Annuler' : `💍 Ajouter un époux (${husbands.length}/1)`}
              </button>
            )}
            {!isHomme && husbands.length >= 1 && (
              <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
                ✅ Époux lié — une femme ne peut avoir qu'un seul homme actif
              </span>
            )}
            {/* Historique (liens rompus + archivés) */}
            {(brokenLinks.length > 0 || archivedLinks.length > 0) && (
              <button
                onClick={() => setShowBroken(!showBroken)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg transition-colors text-sm border border-gray-200"
              >
                📖 Historique ({brokenLinks.length + archivedLinks.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── ONGLETS MARIS (FEMME seulement) ─────────────────────── */}
      {!isHomme && husbands.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {husbands.map((h, i) => (
            <div key={h.link.id} className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedHusbandIndex(i)
                  setPartner(h.husband)
                  setLinkInfo(h.link as LinkInfo)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  selectedHusbandIndex === i
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <span>🤵</span>
                <span>{h.husband ? `${h.husband.prenom} ${h.husband.nomFamille}` : `Époux ${i + 1}`}</span>
                {h.link.status === 'pending' && (
                  <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">En attente</span>
                )}
              </button>
              {h.link.status === 'active' && (
                <button
                  onClick={() => handleBreakLink(h.link.id)}
                  disabled={submitting}
                  title={`Rompre avec ${h.husband?.prenom || 'cet époux'}`}
                  className="px-2 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold rounded-xl border border-red-200 transition-colors"
                >
                  💔
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ONGLETS ÉPOUSES (HOMME seulement) ─────────────────────── */}
      {isHomme && wives.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {wives.map((w, i) => (
            <div key={w.link.id} className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedWifeIndex(i)
                  setPartner(w.wife)
                  setLinkInfo(w.link as LinkInfo)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  selectedWifeIndex === i
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <span>👰</span>
                <span>{w.wife ? `${w.wife.prenom} ${w.wife.nomFamille}` : `Épouse ${i + 1}`}</span>
                {w.link.status === 'pending' && (
                  <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">En attente</span>
                )}
              </button>
              {w.link.status === 'active' && (
                <button
                  onClick={() => handleBreakLink(w.link.id)}
                  disabled={submitting}
                  title={`Rompre avec ${w.wife?.prenom || 'cette épouse'}`}
                  className="px-2 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold rounded-xl border border-red-200 transition-colors"
                >
                  💔
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── HISTORIQUE PASSÉ (liens rompus + archivés) ───────────────── */}
      {showBroken && (brokenLinks.length > 0 || archivedLinks.length > 0) && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-base font-semibold text-gray-700">📖 Historique passé</h3>
          <p className="mb-3 text-xs text-gray-500">Ces liens sont définitivement rompus. Lecture seule — vous pouvez supprimer votre historique.</p>
          <div className="space-y-3">
            {[...brokenLinks, ...archivedLinks].map(({ link, partner: p }) => (
              <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {isHomme ? '👰' : '🤵'} {p ? `${p.prenom} ${p.nomFamille}` : 'Partenaire inconnu'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {link.brokenAt
                      ? `Rompu le ${new Date(link.brokenAt).toLocaleDateString('fr-FR')}`
                      : link.archivedAt
                      ? `Archivé le ${new Date(link.archivedAt).toLocaleDateString('fr-FR')}`
                      : '—'}
                    {link.brokenByNumeroH && link.brokenByNumeroH !== user?.numeroH && " — par l'autre"}
                  </p>
                </div>
                <button
                  onClick={() => handleSeparate(link.id)}
                  disabled={submitting}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors border border-red-200"
                >
                  🗑 Supprimer mon historique
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPersonModal && (
        <AddPersonModal
          title={`Trouver ${partnerLabel}`}
          myNumeroH={user?.numeroH}
          myPrenom={user?.prenom}
          myNom={user?.nomFamille}
          onSelect={(numeroH) => {
            setLinkForm(prev => ({ ...prev, partnerNumeroH: numeroH }))
            setShowPersonModal(false)
          }}
          onClose={() => setShowPersonModal(false)}
        />
      )}

      {showLinkForm && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Lier {title} (seul le NumeroH est obligatoire)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                NumeroH de {partnerLabel} <span className="text-slate-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkForm.partnerNumeroH}
                  onChange={(e) => setLinkForm({ ...linkForm, partnerNumeroH: e.target.value })}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: G0C0P0R0E0F0 1"
                />
                <button
                  type="button"
                  onClick={() => setShowPersonModal(true)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold whitespace-nowrap"
                >
                  ➕ Chercher
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro reçu lors du mariage à la mairie (optionnel)
              </label>
              <input
                type="text"
                value={linkForm.numeroMariageMairie}
                onChange={(e) => setLinkForm({ ...linkForm, numeroMariageMairie: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: MARIAGE-2024-001"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreateLink}
              disabled={submitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg"
            >
              {submitting ? 'Enregistrement...' : '✓ Lier'}
            </button>
            <button
              onClick={() => setShowLinkForm(false)}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {pendingSent.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📤 Demandes que j&apos;ai envoyées</h3>
          <div className="space-y-3">
            {pendingSent.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💑</span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {inv.partner ? `${inv.partner.prenom} ${inv.partner.nomFamille}` : 'Partenaire'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {inv.status === 'rejected' ? '❌ Refusé (Désolé)' : '⏳ En attente'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingInvitations.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-amber-800 mb-4">📩 Invitations reçues (à confirmer)</h3>
          <p className="text-slate-600 mb-4">Votre partenaire souhaite vous lier. Confirmez pour accepter ou supprimez pour refuser.</p>
          <div className="space-y-3">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💑</span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {inv.initiator ? `${inv.initiator.prenom} ${inv.initiator.nomFamille}` : inv.initiatedByNumeroH}
                    </p>
                    <p className="text-sm text-slate-500">Numéro mairie : {inv.numeroMariageMairie}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmLink(inv.id)}
                    disabled={submitting}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg"
                  >
                    ✓ Confirmer
                  </button>
                  <button
                    onClick={() => handleRejectLink(inv.id)}
                    disabled={submitting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <>
          {partner ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-xl font-bold text-slate-800 mb-4">💑 Mon partenaire</h3>
                <button
                  onClick={() => isHomme ? handleLeaveLink(linkInfo?.id) : handleArchiveLink()}
                  disabled={submitting}
                  className="text-sm text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  💔 Rompre le lien
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-3xl">
                  {partner.genre === 'FEMME' ? '👰' : '🤵'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-lg">
                    {partner.prenom} {partner.nomFamille}
                  </p>
                  <p className="text-slate-600">{getNumeroHForDisplay(partner.numeroH, false)}</p>
                  {linkInfo?.numeroMariageMairie && (
                    <p className="text-sm text-slate-500 mt-1">
                      Numéro mariage (mairie) : <span className="font-mono">{linkInfo.numeroMariageMairie}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : userIsAdmin ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <p className="text-amber-900 font-medium mb-2">👑 Mode administrateur</p>
              <p className="text-slate-700 text-sm mb-4">
                Aucun partenaire lié. En tant qu&apos;administrateur, toutes les sections ci-dessous sont visibles. Liez un partenaire pour utiliser les activités et notes partagées.
              </p>
              <button
                onClick={() => setShowLinkForm(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
              >
                💍 Lier mon partenaire
              </button>
            </div>
          ) : null}

          {/* Bannière */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 text-white mb-4">
            <h3 className="text-2xl font-semibold mb-1">❤️ Nos souvenirs d&apos;ensemble</h3>
            <p className="text-emerald-100 text-sm">Moments précieux partagés avec {partnerLabel}</p>
          </div>

          {/* Carte principale avec onglets */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            {/* Onglets Souvenir / Message */}
            <div className="flex border-b border-slate-200">
              {([
                { key: 'souvenir' as const, icon: '📸', label: 'Souvenir' },
                { key: 'message' as const, icon: '💬', label: 'Message' }
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
                    activeTab === tab.key
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu : Souvenir (4 tuiles) */}
            {activeTab === 'souvenir' && (() => {
              type TileKey = SessionId | 'notes'
              const tiles: Array<{
                key: TileKey
                icon: string
                label: string
                desc: string
                activeBg: string
                activeText: string
                dotColor: string
                badgeCount?: number
              }> = [
                { key: 'avant',    icon: '👤', label: 'Ma vie avant toi', desc: 'mon histoire',                                      activeBg: 'bg-green-700',   activeText: 'text-green-700',   dotColor: 'bg-green-700',   badgeCount: mediaBySession.avant.length },
                { key: 'paradis',  icon: '💕', label: isHomme ? 'Nos vies ensemble' : 'Mon paradis', desc: isHomme ? 'ensemble' : 'dans tes mains', activeBg: 'bg-teal-600',    activeText: 'text-teal-600',    dotColor: 'bg-teal-600',    badgeCount: mediaBySession.paradis.length },
                { key: 'objectif', icon: '🎯', label: 'Notre objectif',   desc: 'pour demain',                                      activeBg: 'bg-emerald-600', activeText: 'text-emerald-600', dotColor: 'bg-emerald-600', badgeCount: mediaBySession.objectif.length },
                { key: 'notes',    icon: '⭐', label: 'Notes',            desc: isHomme ? 'données à ma femme' : 'reçues de lui',    activeBg: 'bg-amber-500',   activeText: 'text-amber-600',   dotColor: 'bg-amber-500',   badgeCount: partnerRatings.length }
              ]
              const active = tiles.find(t => t.key === openSection)!
              return (
                <div>
                  {/* 4 tuiles navigation */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-slate-100">
                    {tiles.map((tile) => {
                      const isActive = openSection === tile.key
                      return (
                        <button
                          key={tile.key}
                          type="button"
                          onClick={() => setOpenSection(tile.key)}
                          className={`relative flex flex-col items-center gap-2 py-5 px-3 transition-all duration-200 border-r last:border-r-0 border-slate-100 ${isActive ? 'bg-white' : 'bg-slate-50 hover:bg-white'}`}
                        >
                          {isActive && (
                            <span className={`absolute top-0 left-0 right-0 h-0.5 ${tile.dotColor} rounded-b`} />
                          )}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 ${isActive ? `${tile.activeBg} shadow-lg` : 'bg-slate-100'}`}>
                            {tile.icon}
                          </div>
                          <div className="text-center">
                            <p className={`text-xs font-extrabold leading-tight transition-colors ${isActive ? tile.activeText : 'text-slate-700'}`}>{tile.label}</p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{tile.desc}</p>
                          </div>
                          {(tile.badgeCount ?? 0) > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? `${tile.activeBg} text-white` : 'bg-slate-200 text-slate-600'}`}>
                              {tile.badgeCount}
                            </span>
                          )}
                          {isActive && <span className={`w-1.5 h-1.5 rounded-full ${tile.dotColor}`} />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Zone de contenu */}
                  <div className="p-6">
                    {openSection !== 'notes' ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${active.activeBg} text-white`}>{active.icon}</span>
                            <div>
                              <h4 className="text-base font-bold text-slate-800">{active.label}</h4>
                              <p className="text-xs text-slate-500">{active.desc}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUploaderSession(openSection as SessionId)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm"
                          >
                            📷 Ajouter
                          </button>
                        </div>
                        {(mediaBySession[openSection as SessionId]?.length ?? 0) === 0 ? (
                          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                            <p className="text-slate-500 text-sm mb-3">Aucun média dans cette section</p>
                            <button
                              type="button"
                              onClick={() => setUploaderSession(openSection as SessionId)}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm"
                            >
                              🚀 Commencer à partager
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(mediaBySession[openSection as SessionId] || []).map((m) => (
                              <div key={m.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                {m.type === 'photo' && <img src={m.url} alt="" className="w-full h-40 object-cover" />}
                                {m.type === 'video' && <video src={m.url} controls className="w-full h-40 bg-black" />}
                                {m.type === 'audio' && <div className="w-full h-24 bg-slate-200 flex items-center justify-center"><span className="text-3xl">🎵</span></div>}
                                {m.caption && <p className="p-2 text-sm text-slate-600">{m.caption}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Section Notes */
                      <>
                        <div className="flex items-center gap-3 mb-5">
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-amber-500 text-white">⭐</span>
                          <div>
                            <h4 className="text-base font-bold text-slate-800">Notes</h4>
                            <p className="text-xs text-slate-500">{isHomme ? 'données à ma femme' : 'reçues de mon homme'}</p>
                          </div>
                        </div>

                        {/* Formulaire ajout note (HOMME seulement) */}
                        {isHomme && (
                          <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden mb-5">
                            <table className="min-w-full text-sm">
                              <thead className="bg-amber-100 text-amber-900">
                                <tr>
                                  <th className="px-4 py-3 text-left font-semibold">Année</th>
                                  <th className="px-4 py-3 text-left font-semibold">Note</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="bg-white">
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      value={noteAnnee}
                                      onChange={(e) => setNoteAnnee(parseInt(e.target.value, 10) || new Date().getFullYear())}
                                      min={2000}
                                      max={2030}
                                      className="min-w-[140px] w-36 px-3 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-0.5 items-center">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          className={`text-2xl transition-colors ${noteRating >= star ? 'text-amber-400' : 'text-slate-300 hover:text-slate-400'}`}
                                          onClick={() => setNoteRating(star)}
                                          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                                        >
                                          ★
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <div className="px-4 py-3 border-t border-amber-100 bg-amber-50/80">
                              <button
                                type="button"
                                onClick={handleAddNote}
                                disabled={submitting || noteRating < 1}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm"
                              >
                                {submitting ? 'Envoi…' : '✓ Ajouter la note'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tableau des notes */}
                        <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white shadow-sm">
                          <table className="min-w-full text-sm" aria-label="Notes">
                            <thead className="bg-slate-200 text-slate-800 border-b-2 border-slate-300">
                              <tr>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Année</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Note</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {partnerRatings.length === 0 ? (
                                <tr>
                                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500 bg-slate-50 text-sm">
                                    {isHomme
                                      ? 'Aucune note. Renseignez une année et une note ci-dessus puis cliquez sur « Ajouter la note ».'
                                      : "Aucune note pour l'instant. Votre mari peut vous noter depuis son espace « Ma Femme »."}
                                  </td>
                                </tr>
                              ) : (
                                partnerRatings.map((r) => (
                                  <tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-slate-700">{r.annee}</td>
                                    <td className="px-4 py-3">
                                      <span className="flex items-center gap-0.5" title={`${r.note}/5`}>
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <span key={s} className={r.note >= s ? 'text-amber-400' : 'text-slate-300'}>★</span>
                                        ))}
                                        <span className="ml-1 text-slate-600 text-xs">{r.note}/5</span>
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                          <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 text-xs font-medium text-slate-600 rounded-b-xl flex flex-wrap items-center justify-between gap-2">
                            <span>Tableau <strong>Notes</strong> — {partnerRatings.length} note{partnerRatings.length !== 1 ? 's' : ''}</span>
                            {partnerRatings.length > 0 && (
                              <span className="bg-purple-50 text-purple-800 px-3 py-1 rounded-lg font-semibold">
                                Note moyenne : {(partnerRatings.reduce((s, r) => s + r.note, 0) / partnerRatings.length).toFixed(1)}/5 ★
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Contenu : Message */}
            {activeTab === 'message' && (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Messagerie avec {partnerLabel}</h3>
                  <p className="text-slate-600 text-sm mt-1">Échangez avec votre partenaire.</p>
                </div>
                {user ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <CommunicationHub
                      userData={user}
                      showGroups={false}
                      showBroadcast={false}
                      showGallery={false}
                    />
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    Connectez-vous pour accéder à la messagerie de couple.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Modal MediaUploader */}
          {uploaderSession && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setUploaderSession(null)}>
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-xl font-semibold text-slate-800">📷 Ajouter un média</h3>
                  <button type="button" className="text-slate-500 hover:text-slate-700 text-2xl" onClick={() => setUploaderSession(null)}>✕</button>
                </div>
                <div className="p-4">
                  <MediaUploader onClose={() => setUploaderSession(null)} onUpload={handleAddMedia} />
                </div>
              </div>
            </div>
          )}
      </>
    </div>
  )
}
