import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAdmin, getNumeroHForDisplay } from '../../utils/auth'
import { MediaUploader } from '../../components/MediaUploader'
import { CommunicationHub } from '../../components/CommunicationHub'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

interface UserData {
  numeroH: string
  prenom: string
  nomFamille: string
}

interface ParentLink {
  id: string
  parentNumeroH: string
  childNumeroH: string
  codeLiaison: string
  numeroMaternite?: string
  parentType: 'pere' | 'mere'
  parent?: {
    numeroH: string
    prenom: string
    nomFamille: string
    photo?: string
    genre?: string
  }
  activitiesCount?: number
}

interface Activity {
  id: string
  parentNumeroH: string
  childNumeroH: string
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

async function toDataUrl(url: string): Promise<string> {
  if (!url) return ''
  if (url.startsWith('data:')) return url
  const response = await fetch(url)
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Erreur conversion média'))
    reader.readAsDataURL(blob)
  })
}

interface PendingInvitation {
  id: string
  parentNumeroH: string
  childNumeroH: string
  parentType: string
  codeLiaison?: string
  parent?: { numeroH: string; prenom: string; nomFamille: string }
}

export default function Parents({ inline }: { inline?: boolean } = {}) {
  const [user, setUser] = useState<UserData | null>(null)
  const [parents, setParents] = useState<ParentLink[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedParent, setSelectedParent] = useState<ParentLink | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  void activities
  const [newActivityContent, setNewActivityContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  type ChapterKey = 'enfance' | 'paradis' | 'objectif'
  type MediaItem = { id: string; type: 'photo' | 'video' | 'audio'; url: string; caption?: string; date: string }
  const [activeTab, setActiveTab] = useState<'souvenir' | 'message'>('message')
  const [openSection, setOpenSection] = useState<ChapterKey | 'notes'>('enfance')
  const [mediaByChapter, setMediaByChapter] = useState<Record<ChapterKey, MediaItem[]>>({ enfance: [], paradis: [], objectif: [] })
  const [uploaderChapter, setUploaderChapter] = useState<ChapterKey | null>(null)
  const [notesFromParents, setNotesFromParents] = useState<Array<{ id: string; annee: number; note: number; parentName?: string }>>([])
  const [formAnnee, setFormAnnee] = useState(() => new Date().getFullYear())
  const [formNote, setFormNote] = useState(0)
  const [parentRatings, setParentRatings] = useState<Array<{ id: string; annee: number; note: number }>>([])
  void formAnnee; void setFormAnnee; void formNote; void setFormNote; void parentRatings; void setParentRatings;

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

  const loadMyParents = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/parent-child/my-parents`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setParents(data.parents || [])
      }
    } catch (e) {
      console.error('Erreur chargement mes parents:', e)
    }
  }

  const loadPendingInvitations = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/parent-child/pending-invitations`, {
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
      const res = await fetch(`${API_BASE}/api/parent-child/confirm/${linkId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        loadPendingInvitations()
        loadMyParents()
      } else alert(data.message || 'Erreur')
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectLink = async (linkId: string) => {
    if (!confirm('Refuser cette demande ? Le parent sera notifié (Désolé).')) return
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/parent-child/reject/${linkId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Désolé, je ne souhaite pas créer ce lien.' })
      })
      const data = await res.json()
      if (data.success) {
        loadPendingInvitations()
      } else alert(data.message || 'Erreur')
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeaveLink = async (linkId: string) => {
    if (!confirm('Quitter cette liaison ? Vous pourrez vous relier plus tard.')) return
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/parent-child/link/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setSelectedParent(null)
        loadMyParents()
      } else alert(data.message || 'Erreur')
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const loadActivitiesForParent = async (link: ParentLink) => {
    const token = getToken()
    if (!token || !user) return
    try {
      const res = await fetch(
        `${API_BASE}/api/parent-child/activities?parentNumeroH=${encodeURIComponent(link.parentNumeroH)}&childNumeroH=${encodeURIComponent(link.childNumeroH)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const list: Activity[] = data.activities || []
        setActivities(list)

        // Reconstruire les médias par chapitre à partir des activités avec mediaUrl
        const chapters: Record<ChapterKey, MediaItem[]> = {
          enfance: [],
          paradis: [],
          objectif: []
        }
        for (const act of list) {
          if (!act.mediaUrl || !act.type || !act.type.startsWith('souvenir_')) continue
          const key = act.type.replace('souvenir_', '') as ChapterKey
          if (!chapters[key]) continue
          const mediaType: MediaItem['type'] =
            act.mediaUrl.startsWith('data:video') ? 'video'
            : act.mediaUrl.startsWith('data:audio') ? 'audio'
            : 'photo'
          chapters[key].push({
            id: act.id,
            type: mediaType,
            url: act.mediaUrl,
            caption: act.content,
            date: act.created_at
          })
        }
        setMediaByChapter(chapters)
      }
    } catch (e) {
      console.error('Erreur chargement activités:', e)
    }
  }

  const loadNotesFromParents = async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/parent-child/ratings/for-child`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotesFromParents((data.ratings || []).map((r: { id: string; annee: number; note: number; parentName?: string }) => ({
          id: r.id,
          annee: r.annee,
          note: r.note,
          parentName: r.parentName
        })))
      }
    } catch (e) {
      console.error('Erreur chargement notes des parents:', e)
    }
  }

  useEffect(() => {
    const u = loadUser()
    if (u?.numeroH) {
      setLoading(false)
      loadMyParents()
      loadPendingInvitations()
      loadNotesFromParents()
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedParent && parents.length > 0) {
      setSelectedParent(parents[0])
    }
  }, [parents, selectedParent])

  useEffect(() => {
    if (selectedParent) {
      loadActivitiesForParent(selectedParent)
    } else {
      setActivities([])
    }
  }, [selectedParent?.id])

  const handleAddMedia = (mediaData: { type: 'photo' | 'video' | 'audio'; url: string; caption?: string }) => {
    if (!uploaderChapter || !selectedParent || !user) return
    const chapter = uploaderChapter
    const optimistic: MediaItem = {
      id: Date.now().toString(),
      type: mediaData.type,
      url: mediaData.url,
      caption: mediaData.caption,
      date: new Date().toISOString()
    }

    // Mise à jour optimiste de l'UI
    setMediaByChapter((prev) => ({
      ...prev,
      [chapter]: [...prev[chapter], optimistic]
    }))

    const persist = async () => {
      try {
        const token = getToken()
        if (!token) return
        const dataUrl = await toDataUrl(mediaData.url)
        const toNumeroH =
          user.numeroH === selectedParent.parentNumeroH ? selectedParent.childNumeroH : selectedParent.parentNumeroH

        const res = await fetch(`${API_BASE}/api/parent-child/activity`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentNumeroH: selectedParent.parentNumeroH,
            childNumeroH: selectedParent.childNumeroH,
            toNumeroH,
            type: `souvenir_${chapter}`,
            content: mediaData.caption,
            mediaUrl: dataUrl
          })
        })
        const data = await res.json()
        if (!data.success) {
          console.error('Erreur sauvegarde média parent:', data)
        } else {
          // Recharger depuis le serveur pour récupérer les IDs réels
          await loadActivitiesForParent(selectedParent)
        }
      } catch (e) {
        console.error('Erreur réseau sauvegarde média parent:', e)
      }
    }

    void persist()
    setUploaderChapter(null)
  }

  void handleAddActivity
  async function handleAddActivity() {
    if (!selectedParent || !newActivityContent.trim() || !user) return
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/parent-child/activity`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentNumeroH: selectedParent.parentNumeroH,
          childNumeroH: selectedParent.childNumeroH,
          toNumeroH: selectedParent.parentNumeroH,
          type: 'message',
          content: newActivityContent.trim()
        })
      })
      const data = await res.json()
      if (data.success) { setNewActivityContent(''); loadActivitiesForParent(selectedParent) }
      else alert(data.message || 'Erreur')
    } catch { alert('Erreur réseau') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  const userIsAdmin = isAdmin(user)
  const adminDemoParent: ParentLink | null = (userIsAdmin && parents.length === 0 && pendingInvitations.length === 0)
    ? {
        id: 'admin-demo',
        parentNumeroH: 'DEMO',
        childNumeroH: user?.numeroH || '',
        codeLiaison: '',
        parentType: 'pere',
        parent: { numeroH: 'DEMO', prenom: 'Aperçu', nomFamille: 'Démo Admin' }
      }
    : null
  const activeParent = selectedParent || adminDemoParent

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-3 mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">👨‍👩‍👦 Mes Parents</h2>
        <Link to="/famille/inspir" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-medium rounded-lg transition-colors border border-yellow-300">
          🤝 Inspir
        </Link>
      </div>

      {pendingInvitations.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-4">
          <h3 className="text-sm font-bold text-amber-800 mb-3">📩 Invitations reçues</h3>
          <div className="space-y-3">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{inv.parentType === 'mere' ? '👩' : '👨'}</span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {inv.parent ? `${inv.parent.prenom} ${inv.parent.nomFamille}` : inv.parentNumeroH}
                    </p>
                    <p className="text-sm text-slate-500">{getNumeroHForDisplay(inv.parentNumeroH, false)}</p>
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

      {parents.length === 0 && pendingInvitations.length === 0 && !userIsAdmin ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-4">
            Aucun parent lié pour le moment. Vos parents doivent vous ajouter depuis leur page « Mes Enfants » avec leur code de liaison, votre NumeroH et votre numéro maternité.
          </p>
          <Link
            to="/famille"
            state={{ returnToHub: true }}
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
          >
            Retour à Famille
          </Link>
        </div>
      ) : (
        <>
        {adminDemoParent && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
            <span className="text-2xl leading-none">👑</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Mode administrateur — aperçu de la page</p>
              <p className="text-xs text-amber-700 mt-1">Aucun parent lié. Vous voyez l'interface telle que vos clients la verront une fois liés à leurs parents.</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {parents.map((link) => (
              <div
                key={link.id}
                className={`rounded-xl border-2 p-4 transition-all ${
                  selectedParent?.id === link.id
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <button
                  onClick={() => setSelectedParent(link)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-2xl flex-shrink-0 border-2 border-white shadow">
                      {link.parent?.photo ? (
                        <img src={link.parent.photo.startsWith('http') ? link.parent.photo : (link.parent.photo.startsWith('/') ? link.parent.photo : '/' + link.parent.photo)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        link.parentType === 'mere' ? '👩' : '👨'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">
                        {link.parent ? `${link.parent.prenom} ${link.parent.nomFamille}` : link.parentNumeroH}
                      </p>
                      <p className="text-sm text-slate-500">
                        {link.parentType === 'mere' ? 'Maman' : 'Papa'}
                      </p>
                      <p className="text-xs text-slate-400">{getNumeroHForDisplay(link.parentNumeroH, false)}</p>
                    </div>
                  </div>
                </button>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleLeaveLink(link.id)}
                    disabled={submitting}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Quitter la liaison
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {(selectedParent || adminDemoParent) ? (
              <div className="space-y-5">

                {/* ═══ HERO BANNER ═══ */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl px-5 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                    {activeParent!.parent?.photo ? (
                      <img src={activeParent!.parent.photo.startsWith('http') ? activeParent!.parent.photo : '/' + activeParent!.parent.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      activeParent!.parentType === 'mere' ? '👩' : '👨'
                    )}
                  </div>
                  <span className="text-white font-bold text-base">
                    {activeParent!.parent ? `${activeParent!.parent.prenom} ${activeParent!.parent.nomFamille}` : activeParent!.parentNumeroH}
                  </span>
                </div>

                {/* ═══ CARTE PRINCIPALE ═══ */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">

                  {/* Deux onglets principaux */}
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('message')}
                      className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
                        activeTab === 'message'
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-green-200'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      💬 Message
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('souvenir')}
                      className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
                        activeTab === 'souvenir'
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-green-200'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      📸 Souvenir
                    </button>
                  </div>

                  {/* ═══ PANNEAU SOUVENIR ═══ */}
                  {activeTab === 'souvenir' && (() => {
                    const tiles: Array<{
                      key: ChapterKey | 'notes'
                      icon: string
                      label: string
                      desc: string
                      activeBg: string
                      activeText: string
                      dotColor: string
                      badgeCount?: number
                    }> = [
                      { key: 'enfance',  icon: '👶', label: 'Mon enfance',       desc: 'dans vos mains',          activeBg: 'bg-emerald-600', activeText: 'text-emerald-600', dotColor: 'bg-emerald-600', badgeCount: mediaByChapter.enfance.length },
                      { key: 'paradis',  icon: '🌟', label: 'Mon paradis',       desc: 'dans vos mains',          activeBg: 'bg-teal-500',   activeText: 'text-teal-500',   dotColor: 'bg-teal-500',   badgeCount: mediaByChapter.paradis.length },
                      { key: 'objectif', icon: '🎯', label: 'Notre objectif',    desc: 'pour demain',             activeBg: 'bg-emerald-600',activeText: 'text-emerald-600',dotColor: 'bg-emerald-600',badgeCount: mediaByChapter.objectif.length },
                      { key: 'notes',    icon: '⭐', label: 'Notes reçues',      desc: 'de mes parents',          activeBg: 'bg-yellow-500', activeText: 'text-yellow-600', dotColor: 'bg-yellow-500', badgeCount: notesFromParents.length },
                    ]
                    const active = tiles.find(t => t.key === openSection)!

                    return (
                      <div>
                        {/* ── 4 tuiles de navigation ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-slate-100">
                          {tiles.map((tile) => {
                            const isActive = openSection === tile.key
                            return (
                              <button
                                key={tile.key}
                                type="button"
                                onClick={() => setOpenSection(tile.key)}
                                className={`relative flex flex-col items-center gap-2 py-5 px-3 transition-all duration-200 border-r last:border-r-0 border-slate-100 ${
                                  isActive ? 'bg-white' : 'bg-slate-50 hover:bg-white'
                                }`}
                              >
                                {/* Barre colorée en haut quand actif */}
                                {isActive && (
                                  <span className={`absolute top-0 left-0 right-0 h-0.5 ${tile.dotColor} rounded-b`} />
                                )}
                                {/* Icône */}
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 ${
                                  isActive ? `${tile.activeBg} shadow-lg` : 'bg-slate-100'
                                }`}>
                                  {tile.icon}
                                </div>
                                {/* Texte */}
                                <div className="text-center">
                                  <p className={`text-xs font-extrabold leading-tight transition-colors ${isActive ? tile.activeText : 'text-slate-700'}`}>
                                    {tile.label}
                                  </p>
                                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{tile.desc}</p>
                                </div>
                                {/* Badge nombre */}
                                {(tile.badgeCount ?? 0) > 0 && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isActive ? `${tile.activeBg} text-white` : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {tile.badgeCount}
                                  </span>
                                )}
                                {/* Point actif */}
                                {isActive && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${tile.dotColor}`} />
                                )}
                              </button>
                            )
                          })}
                        </div>

                        {/* ── Zone de contenu ── */}
                        <div className="p-6">

                          {/* En-tête de la section active */}
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${active.activeBg} shadow-md`}>
                                {active.icon}
                              </div>
                              <div>
                                <h4 className={`font-extrabold text-base ${active.activeText}`}>
                                  {active.label} <span className="text-slate-400 font-normal">{active.desc}</span>
                                </h4>
                                {openSection !== 'notes' && (
                                  <p className="text-xs text-slate-400">
                                    {(mediaByChapter[openSection as ChapterKey] ?? []).length === 0
                                      ? 'Aucun média partagé pour le moment'
                                      : `${mediaByChapter[openSection as ChapterKey].length} média${mediaByChapter[openSection as ChapterKey].length > 1 ? 's' : ''} partagé${mediaByChapter[openSection as ChapterKey].length > 1 ? 's' : ''}`}
                                  </p>
                                )}
                                {openSection === 'notes' && (
                                  <p className="text-xs text-slate-400">
                                    {notesFromParents.length === 0 ? 'Aucune note reçue' : `${notesFromParents.length} note${notesFromParents.length > 1 ? 's' : ''} reçue${notesFromParents.length > 1 ? 's' : ''}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            {openSection !== 'notes' && (
                              <button
                                type="button"
                                onClick={() => setUploaderChapter(openSection as ChapterKey)}
                                className={`flex items-center gap-2 px-4 py-2 ${active.activeBg} hover:opacity-90 text-white font-semibold rounded-xl shadow-sm text-sm transition-all hover:scale-105 active:scale-95`}
                              >
                                📷 Ajouter un média
                              </button>
                            )}
                          </div>

                          {/* ── Contenu : chapitres médias ── */}
                          {openSection !== 'notes' && (() => {
                            const items = mediaByChapter[openSection as ChapterKey] ?? []
                            return items.length === 0 ? (
                              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 ${active.activeBg} shadow-lg`}>
                                  📸
                                </div>
                                <p className="text-slate-700 font-bold mb-1">Aucun souvenir partagé</p>
                                <p className="text-slate-400 text-sm mb-6">
                                  Partagez ici vos photos, vidéos et moments précieux avec vos parents
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setUploaderChapter(openSection as ChapterKey)}
                                  className={`inline-flex items-center gap-2 px-6 py-3 ${active.activeBg} hover:opacity-90 text-white font-bold rounded-xl shadow-md text-sm transition-all hover:scale-105`}
                                >
                                  🚀 Commencer à partager
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {items.map((m) => (
                                  <div key={m.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    {m.type === 'photo' && <img src={m.url} alt="" className="w-full h-36 object-cover" />}
                                    {m.type === 'video' && <video src={m.url} controls className="w-full h-36 bg-black" />}
                                    {m.type === 'audio' && <div className="w-full h-24 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center"><span className="text-3xl">🎵</span></div>}
                                    {m.caption && <p className="p-2 text-xs text-slate-600 font-medium">{m.caption}</p>}
                                  </div>
                                ))}
                              </div>
                            )
                          })()}

                          {/* ── Contenu : Notes ── */}
                          {openSection === 'notes' && (() => {
                            const avg = notesFromParents.length > 0
                              ? (notesFromParents.reduce((s, r) => s + r.note, 0) / notesFromParents.length).toFixed(1)
                              : null
                            return (
                              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Année</th>
                                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Note</th>
                                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Donné par</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {notesFromParents.length === 0 ? (
                                      <tr>
                                        <td colSpan={3} className="px-5 py-12 text-center text-slate-400 text-sm">
                                          <div className="flex flex-col items-center gap-3">
                                            <span className="text-4xl">⭐</span>
                                            <span>Aucune note pour l&apos;instant.</span>
                                            <span className="text-xs">Vos parents peuvent vous noter depuis leur espace « Mes Enfants ».</span>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : (
                                      notesFromParents.map((r) => (
                                        <tr key={r.id} className="hover:bg-yellow-50/40 transition-colors">
                                          <td className="px-5 py-3.5 font-semibold text-slate-700">{r.annee}</td>
                                          <td className="px-5 py-3.5">
                                            <span className="flex items-center gap-0.5">
                                              {[1, 2, 3, 4, 5].map((s) => (
                                                <span key={s} className={`text-lg ${r.note >= s ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
                                              ))}
                                              <span className="ml-2 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{r.note}/5</span>
                                            </span>
                                          </td>
                                          <td className="px-5 py-3.5 text-slate-600 font-medium">{r.parentName ?? '—'}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                                {avg && (
                                  <div className="px-5 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-t border-amber-100 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-600">Note moyenne globale</span>
                                    <span className="text-lg font-extrabold text-yellow-600 bg-white px-4 py-1 rounded-xl shadow-sm border border-yellow-200">{avg} / 5 ★</span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                        </div>
                      </div>
                    )
                  })()}

                  {/* ═══ PANNEAU MESSAGE ═══ */}
                  {activeTab === 'message' && (
                    <div className="p-5">
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
                        <p className="text-slate-500 text-sm text-center py-8">
                          Connectez-vous pour accéder à la messagerie familiale.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                <div className="w-16 h-16 mx-auto bg-slate-200 rounded-2xl flex items-center justify-center text-3xl mb-4">👨‍👩‍👦</div>
                <p className="text-slate-500 font-medium">Sélectionnez un parent pour voir les activités partagées.</p>
              </div>
            )}

            {uploaderChapter && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setUploaderChapter(null)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">📷 Ajouter un média</h3>
                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xl" onClick={() => setUploaderChapter(null)}>✕</button>
                  </div>
                  <div className="p-5"><MediaUploader onClose={() => setUploaderChapter(null)} onUpload={handleAddMedia} /></div>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}
