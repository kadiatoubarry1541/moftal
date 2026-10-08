import { useState, useEffect, useRef } from 'react'
import { FriendChat } from './FriendChat'
import { CoupleChat } from './CoupleChat'
import { ParentChildChat } from './ParentChildChat'
import { FamilyGroupChat } from './FamilyGroupChat'
import { ResidenceGroupChat, type ResidenceGroupInfo } from './ResidenceGroupChat'
import { ActivityGroupChat, type ActivityGroupInfo } from './ActivityGroupChat'
import { findLocationByCode, getLocationGroupTitle } from '../utils/worldGeography'
import { isActivityBlocked } from '../utils/activityIcons'
import { ActivityIcon } from './ActivityIconBadge'
import { chargerMessagesNonLus, marquerConversationLue, EVENEMENT_MESSAGES_LUS, type MessagesNonLus } from '../utils/messagesNonLus'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

const CONTACT_ENDPOINTS = ['family-contacts', 'quartier-contacts', 'activity-contacts']

// Normalise un nom de lieu comme dans Terre ADAM : "TÉLIKO" = "teliko" = "Téliko"
function normalizeLoc(str: string): string {
  return str.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

interface Contact {
  numeroH: string
  prenom?: string
  nomFamille?: string
  photo?: string
}

type ChatType = 'friend' | 'couple' | 'parent' | 'child' | 'family' | 'residence' | 'activity'

// La messagerie "Famille principal" (family_tree_messages) et les groupes de
// quartier/activité n'ont pas de `?linkId=` : le premier est lié à l'arbre côté
// serveur, les seconds ont leur propre id dans l'URL (/groups/:id/messages).
const MESSAGES_PATH: Record<ChatType, string> = {
  friend: '/api/friends/messages',
  couple: '/api/couple/messages',
  parent: '/api/parent-child/messages',
  child: '/api/parent-child/messages',
  family: '/api/family-tree/messages',
  residence: '/api/residences/groups',
  activity: '/api/activities/groups',
}

const ICONS: Record<ChatType, string> = {
  friend: '👥',
  couple: '💑',
  parent: '🧓',
  child: '👶',
  family: '👨‍👩‍👧‍👦',
  residence: '🏘️',
  activity: '💼',
}

interface Conversation {
  key: string
  type: ChatType
  linkId: string
  numeroH: string
  label: string
  photo?: string | null
  icon: string
  activityName?: string
  lastMessage: string
  lastMessageAt: string | null
  lastMessageMine: boolean
}

interface Person {
  numeroH: string
  prenom?: string
  nomFamille?: string
  photo?: string | null
}

interface FriendItem {
  id: string
  numeroH: string
  prenom?: string
  nomFamille?: string
  profilePicture?: string | null
}

interface WifeItem {
  link: { id: string }
  wife: Person | null
}

interface RelativeItem {
  id: string
  child?: Person | null
  parent?: Person | null
}

interface RawResidenceGroup {
  id: string
  location?: string
  title?: string
  name?: string
  logoUrl?: string | null
  members?: unknown[]
}

interface RawActivityGroup {
  id: string
  name?: string
  activity: string
  pays?: string
}

interface RawMessage {
  messageType?: 'text' | 'image' | 'video' | 'audio'
  type?: 'text' | 'image' | 'video' | 'audio'
  content?: string
  numeroH: string
  created_at?: string
  createdAt?: string
}

// Clé de la conversation côté serveur (/api/unread)
function cleNonLus(type: ChatType, linkId: string): string {
  if (type === 'family') return 'family:'
  if (type === 'parent' || type === 'child') return `pc:${linkId}`
  return `${type}:${linkId}`
}

function previewForMessage(m: RawMessage): string {
  const kind = m.messageType || m.type
  if (kind === 'image') return '📷 Photo'
  if (kind === 'video') return '🎥 Vidéo'
  if (kind === 'audio') return '🎤 Message vocal'
  return m.content || ''
}

function formatConvTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

interface SessionUser {
  numeroH: string
  prenom?: string
  nomFamille?: string
  quartierCode?: string
  lieu1?: string
  lieuResidence1?: string
  quartierCode2?: string
  lieu2?: string
  lieuResidence2?: string
  quartierCode3?: string
  lieu3?: string
  lieuResidence3?: string
  sousPrefectureCode?: string
  sousPrefecture?: string
  pays?: string
  activite1?: string
  activite2?: string
  activite3?: string
  role?: string
  isAdmin?: boolean
}

// Réplique minimale de utils/auth.ts isAdmin() — évitée ici pour ne pas
// forcer prenom/nomFamille en champs requis sur SessionUser.
function isAdminUser(u: SessionUser | null): boolean {
  if (!u) return false
  const role = u.role?.toLowerCase() || ''
  return (
    role === 'admin' || role === 'super-admin' || role === 'administrator' ||
    u.isAdmin === true || u.numeroH === 'G0C0P0R0E0F0 0' || u.numeroH === 'G7C7P7R7E7F7 7'
  )
}

export function FloatingMessenger() {
  const [open, setOpen] = useState(false)
  const [userData, setUserData] = useState<SessionUser | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [residenceGroups, setResidenceGroups] = useState<Record<string, ResidenceGroupInfo>>({})
  const [activityGroups, setActivityGroups] = useState<Record<string, ActivityGroupInfo>>({})
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [chat, setChat] = useState<{ type: ChatType; linkId: string; label: string } | null>(null)
  const [nonLus, setNonLus] = useState<MessagesNonLus>({ total: 0, conversations: {} })

  // Bouton « retour » du téléphone : la messagerie occupe une entrée de
  // l'historique. Retour depuis une discussion → la liste ; retour depuis la
  // liste (ou ✕) → la page où l'on était. Jamais l'application fermée.
  const entreeHistorique = useRef(false)
  const depuisListe = useRef(false)
  const toutFermer = useRef(false)
  const chatOuvert = useRef(false)
  chatOuvert.current = !!chat

  useEffect(() => {
    if ((open || chat) && !entreeHistorique.current) {
      window.history.pushState({ ...(window.history.state || {}), moftalMessenger: true }, '')
      entreeHistorique.current = true
    }
  }, [open, chat])

  useEffect(() => {
    const surRetour = () => {
      if (!entreeHistorique.current) return
      entreeHistorique.current = false
      if (!toutFermer.current && chatOuvert.current && depuisListe.current) {
        depuisListe.current = false
        setChat(null)
        setOpen(true)
        return
      }
      toutFermer.current = false
      depuisListe.current = false
      setChat(null)
      setOpen(false)
    }
    window.addEventListener('popstate', surRetour)
    return () => window.removeEventListener('popstate', surRetour)
  }, [])

  const fermerMessagerie = () => {
    if (entreeHistorique.current) {
      toutFermer.current = true
      window.history.back()
    } else {
      setChat(null)
      setOpen(false)
    }
  }

  // Compteur de messages non lus : au chargement, toutes les 30 s, au retour
  // sur l'application et dès qu'une conversation est lue.
  useEffect(() => {
    let actif = true
    const rafraichir = () => {
      if (document.visibilityState === 'hidden') return
      chargerMessagesNonLus().then(n => {
        if (!actif || !n) return
        setNonLus(n)
        // Même chiffre sur l'icône de l'application installée (comme WhatsApp)
        const nav = navigator as Navigator & { setAppBadge?: (c?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
        ;(n.total > 0 ? nav.setAppBadge?.(n.total) : nav.clearAppBadge?.())?.catch(() => {})
      })
    }
    // Nouveau message reçu pendant que l'application est ouverte (notification)
    const surMessageSW = (e: MessageEvent) => { if (e.data?.type === 'nouveau-message') rafraichir() }
    navigator.serviceWorker?.addEventListener('message', surMessageSW)
    rafraichir()
    const minuterie = window.setInterval(rafraichir, 30000)
    window.addEventListener(EVENEMENT_MESSAGES_LUS, rafraichir)
    window.addEventListener('focus', rafraichir)
    document.addEventListener('visibilitychange', rafraichir)
    return () => {
      actif = false
      window.clearInterval(minuterie)
      window.removeEventListener(EVENEMENT_MESSAGES_LUS, rafraichir)
      window.removeEventListener('focus', rafraichir)
      document.removeEventListener('visibilitychange', rafraichir)
      navigator.serviceWorker?.removeEventListener('message', surMessageSW)
    }
  }, [])

  useEffect(() => {
    const session = localStorage.getItem('session_user')
    if (!session) return
    let cached: SessionUser | null = null
    try {
      const parsed = JSON.parse(session)
      cached = parsed.userData || parsed
      setUserData(cached)
    } catch {
      return
    }

    // La session locale peut être incomplète (quartier/activité non
    // synchronisés) : on rafraîchit depuis le serveur, comme Terre ADAM
    // et Activité le font déjà, pour que le bouton flottant voie les
    // mêmes groupes que ces pages.
    const token = localStorage.getItem('token')
    if (!token || !cached) return
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.success || !d.user) return
        setUserData(prev => ({ ...(prev || {}), ...d.user }))
      })
      .catch(() => {
        // hors-ligne : on garde la session en cache
      })
  }, [])

  const fetchLastMessage = async (type: ChatType, linkId: string) => {
    try {
      const token = localStorage.getItem('token')
      const url = type === 'family'
        ? `${API_BASE}${MESSAGES_PATH[type]}`
        : type === 'residence' || type === 'activity'
        ? `${API_BASE}${MESSAGES_PATH[type]}/${encodeURIComponent(linkId)}/messages`
        : `${API_BASE}${MESSAGES_PATH[type]}?linkId=${encodeURIComponent(linkId)}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!data?.success || !data.messages?.length) return null
      const last: RawMessage = data.messages[data.messages.length - 1]
      return {
        content: previewForMessage(last),
        at: last.created_at || last.createdAt || null,
        numeroH: last.numeroH,
      }
    } catch {
      return null
    }
  }

  const loadConversations = async (me?: SessionUser | null) => {
    const myNumeroH = me?.numeroH
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // Mes quartiers (résidence 1, 2, 3) — jusqu'à 3 groupes possibles
      const quartierCodes = [
        me?.quartierCode || me?.lieu1 || me?.lieuResidence1 || null,
        me?.quartierCode2 || me?.lieu2 || me?.lieuResidence2 || null,
        me?.quartierCode3 || me?.lieu3 || me?.lieuResidence3 || null,
      ].filter((c): c is string => !!c)
      const admin = isAdminUser(me)

      // Mes activités professionnelles (Activité 1, 2, 3) — un groupe par
      // activité réelle, avec le logo Lucide propre à cette activité. Un
      // admin sans activité renseignée voit quand même ses 3 groupes
      // (mêmes noms par défaut que la page Activité : "Activité 1/2/3").
      const activityNames = admin
        ? [me?.activite1 || 'Activité 1', me?.activite2 || 'Activité 2', me?.activite3 || 'Activité 3']
          .filter(a => !isActivityBlocked(a))
        : [me?.activite1 || null, me?.activite2 || null, me?.activite3 || null]
          .filter((a): a is string => !!a && !isActivityBlocked(a))
      const userPays = me?.pays || me?.lieuResidence1 || ''

      // Un admin sans quartier renseigné voit quand même un groupe de
      // quartier (même repli que Terre ADAM : liste sans filtre de lieu).
      const residenceLocs = quartierCodes.length > 0 ? quartierCodes.map(normalizeLoc) : (admin ? [''] : [])

      const [friendsRes, wivesRes, partnerRes, childrenRes, parentsRes, ...residenceResList] = await Promise.all([
        fetch(`${API_BASE}/api/friends/list`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/couple/my-wives`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/couple/my-partner`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/parent-child/my-children`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/parent-child/my-parents`, { headers }).then(r => r.json()).catch(() => null),
        ...residenceLocs.map(loc =>
          fetch(`${API_BASE}/api/residences/groups?location=${encodeURIComponent(loc)}`, { headers }).then(r => r.json()).catch(() => null)
        ),
      ])

      // Groupes d'activité — récupérés séparément (et créés au besoin) car
      // ils dépendent du nom réel de l'activité + du pays de l'utilisateur.
      const activityResList = await Promise.all(activityNames.map(async (name) => {
        const paysParam = userPays ? `&pays=${encodeURIComponent(userPays)}` : ''
        const data = await fetch(`${API_BASE}/api/activities/groups?activity=${encodeURIComponent(name)}${paysParam}`, { headers })
          .then(r => r.json()).catch(() => null)
        let group: RawActivityGroup | null = data?.success ? ((data.groups || []).find((g: RawActivityGroup) => (g.pays || '') === userPays) || data.groups?.[0] || null) : null
        if (!group) {
          group = await fetch(`${API_BASE}/api/activities/groups`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `${name}${userPays ? ` — ${userPays}` : ''}`, activity: name, pays: userPays, createdBy: myNumeroH }),
          }).then(r => r.json()).then(d => d?.group || null).catch(() => null)
        }
        return group ? { name, group } : null
      }))

      const base: Omit<Conversation, 'lastMessage' | 'lastMessageAt' | 'lastMessageMine'>[] = []

      // Famille principal — le groupe familial entier (family_tree_messages),
      // triée comme les autres selon l'activité la plus récente.
      base.push({ key: 'family', type: 'family', linkId: '', numeroH: '', label: 'Famille principal', photo: null, icon: ICONS.family })

      if (friendsRes?.success) {
        (friendsRes.friends || []).forEach((f: FriendItem) => {
          base.push({ key: `friend-${f.id}`, type: 'friend', linkId: f.id, numeroH: f.numeroH, label: `${f.prenom || ''} ${f.nomFamille || ''}`.trim(), photo: f.profilePicture, icon: ICONS.friend })
        })
      }

      // Épouse(s) — si aucune trouvée via my-wives (cas femme, ou pas encore
      // synchronisé côté homme), on retombe sur my-partner.
      const wives: WifeItem[] = wivesRes?.success ? (wivesRes.wives || []) : []
      if (wives.length > 0) {
        wives.forEach((w) => {
          if (!w.wife) return
          base.push({ key: `couple-${w.link.id}`, type: 'couple', linkId: w.link.id, numeroH: w.wife.numeroH, label: `${w.wife.prenom || ''} ${w.wife.nomFamille || ''}`.trim(), photo: w.wife.photo, icon: ICONS.couple })
        })
      } else if (partnerRes?.success && partnerRes.partner && partnerRes.link) {
        base.push({ key: `couple-${partnerRes.link.id}`, type: 'couple', linkId: partnerRes.link.id, numeroH: partnerRes.partner.numeroH, label: `${partnerRes.partner.prenom || ''} ${partnerRes.partner.nomFamille || ''}`.trim(), photo: partnerRes.partner.photo, icon: ICONS.couple })
      }

      if (childrenRes?.success) {
        (childrenRes.children || []).forEach((c: RelativeItem) => {
          // Enfant sans compte (fiche ajoutée par un parent) : pas de messagerie
          if (!c.child || c.child.numeroH.startsWith('ENF-')) return
          base.push({ key: `child-${c.id}`, type: 'child', linkId: c.id, numeroH: c.child.numeroH, label: `${c.child.prenom || ''} ${c.child.nomFamille || ''}`.trim(), photo: c.child.photo, icon: ICONS.child })
        })
      }

      if (parentsRes?.success) {
        (parentsRes.parents || []).forEach((p: RelativeItem) => {
          if (!p.parent) return
          base.push({ key: `parent-${p.id}`, type: 'parent', linkId: p.id, numeroH: p.parent.numeroH, label: `${p.parent.prenom || ''} ${p.parent.nomFamille || ''}`.trim(), photo: p.parent.photo, icon: ICONS.parent })
        })
      }

      // Groupes de quartier (Résidence 1/2/3) — un groupe par quartier réel,
      // avec son propre logo, comme dans Terre ADAM.
      const seenGroupIds = new Set<string>()
      const groupsByKey: Record<string, ResidenceGroupInfo> = {}
      residenceResList.forEach((data: { success?: boolean; groups?: RawResidenceGroup[] } | null) => {
        const g = data?.success ? (data.groups || [])[0] : null
        if (!g || seenGroupIds.has(g.id)) return
        seenGroupIds.add(g.id)
        const displayName = findLocationByCode(g.location) ? getLocationGroupTitle(g.location) : (g.title || g.name)
        const logoSrc = g.logoUrl ? (String(g.logoUrl).startsWith('http') ? g.logoUrl : `${API_BASE}${g.logoUrl}`) : null
        const info: ResidenceGroupInfo = { id: g.id, name: displayName, title: displayName, logoUrl: g.logoUrl, location: g.location, members: g.members || [] }
        groupsByKey[g.id] = info
        base.push({ key: `residence-${g.id}`, type: 'residence', linkId: g.id, numeroH: '', label: displayName, photo: logoSrc, icon: ICONS.residence })
      })
      setResidenceGroups(groupsByKey)

      // Groupes d'activité — chacun garde le logo Lucide propre à son activité.
      const activityGroupsByKey: Record<string, ActivityGroupInfo> = {}
      const seenActivityIds = new Set<string>()
      activityResList.forEach(entry => {
        if (!entry || seenActivityIds.has(entry.group.id)) return
        seenActivityIds.add(entry.group.id)
        const info: ActivityGroupInfo = { id: entry.group.id, name: entry.group.name || entry.name, activity: entry.name }
        activityGroupsByKey[entry.group.id] = info
        base.push({ key: `activity-${entry.group.id}`, type: 'activity', linkId: entry.group.id, numeroH: '', label: entry.name, photo: null, icon: ICONS.activity, activityName: entry.name })
      })
      setActivityGroups(activityGroupsByKey)

      // Dernier message de chaque conversation — pour trier et afficher un
      // aperçu, exactement comme l'écran d'accueil de WhatsApp.
      const withLast: Conversation[] = await Promise.all(
        base.map(async conv => {
          const last = await fetchLastMessage(conv.type, conv.linkId)
          return {
            ...conv,
            lastMessage: last?.content || '',
            lastMessageAt: last?.at || null,
            lastMessageMine: !!(last && myNumeroH && last.numeroH === myNumeroH),
          }
        })
      )

      withLast.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return a.label.localeCompare(b.label)
        if (!a.lastMessageAt) return 1
        if (!b.lastMessageAt) return -1
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      })

      setConversations(withLast)
    } catch {
      // non bloquant
    }
  }

  const loadContacts = async () => {
    setContacts([])
    try {
      const token = localStorage.getItem('token')
      const results = await Promise.all(
        CONTACT_ENDPOINTS.map(endpoint =>
          fetch(`${API_BASE}/api/friends/${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.json()).catch(() => null)
        )
      )
      const byNumeroH = new Map<string, Contact>()
      results.forEach(data => {
        if (data?.success) {
          (data.contacts || []).forEach((c: Contact) => byNumeroH.set(c.numeroH, c))
        }
      })
      setContacts([...byNumeroH.values()])
    } catch {
      // non bloquant
    }
  }

  const openPicker = async () => {
    setOpen(true)
    setLoading(true)
    await Promise.all([loadConversations(userData), loadContacts()])
    setLoading(false)
  }

  // Ouverture depuis la cloche des notifications (« 💬 N nouveaux messages »)
  useEffect(() => {
    const ouvrir = () => { openPicker() }
    window.addEventListener('ouvrir-messagerie', ouvrir)
    return () => window.removeEventListener('ouvrir-messagerie', ouvrir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.numeroH])

  // Ouverture depuis une notification de message (/compte?messages=1)
  useEffect(() => {
    if (!userData) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('messages') !== '1') return
    params.delete('messages')
    const reste = params.toString()
    window.history.replaceState(window.history.state, '', window.location.pathname + (reste ? `?${reste}` : '') + window.location.hash)
    openPicker()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.numeroH])

  const openConversation = (conv: Conversation) => {
    marquerConversationLue(cleNonLus(conv.type, conv.linkId))
    depuisListe.current = true
    setOpen(false)
    setChat({ type: conv.type, linkId: conv.linkId, label: conv.label })
  }

  const startConversation = async (contact: Contact) => {
    setStarting(contact.numeroH)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/friends/start-conversation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUser: contact.numeroH }),
      })
      const data = await res.json()
      if (data.success) {
        depuisListe.current = true
        setOpen(false)
        setChat({ type: 'friend', linkId: data.linkId, label: `${contact.prenom || ''} ${contact.nomFamille || ''}`.trim() })
      } else {
        alert(data.message || "Impossible d'ouvrir cette conversation")
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setStarting(null)
    }
  }

  // Contacts "nouvelle conversation" qui n'ont pas déjà une conversation existante affichée au-dessus
  const conversationNumeroHs = new Set(conversations.map(c => c.numeroH))
  const newContacts = contacts.filter(c => !conversationNumeroHs.has(c.numeroH))

  return (
    <>
      {/* Bouton flottant — reste toujours sur le bord droit, mais monte et
          redescend entre le milieu de l'écran et un point bas qui s'arrête
          largement au-dessus du bouton de l'assistant IA (bas-droite) :
          les deux ne se superposent donc jamais, à aucun instant de l'animation. */}
      <style>{`
        @keyframes floatMessengerBtn {
          0%, 100% { bottom: 7rem; }
          50% { bottom: 46vh; }
        }
        .floating-messenger-btn { animation: floatMessengerBtn 7s ease-in-out infinite; }
      `}</style>
      <button
        aria-label="Ouvrir la messagerie"
        onClick={openPicker}
        className="floating-messenger-btn fixed z-50 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-lg hover:shadow-xl active:scale-95 transition-transform min-w-[56px] min-h-[56px] w-14 h-14 flex items-center justify-center text-2xl"
        style={{ right: 'max(1rem, env(safe-area-inset-right, 0px))' }}
      >
        💬
        {nonLus.total > 0 && (
          <span
            aria-label={`${nonLus.total} message${nonLus.total > 1 ? 's' : ''} non lu${nonLus.total > 1 ? 's' : ''}`}
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white"
          >
            {nonLus.total > 99 ? '99+' : nonLus.total}
          </span>
        )}
      </button>

      {/* Sélection du destinataire / conversations */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={fermerMessagerie} aria-hidden />
          <div className="relative bg-white rounded-none sm:rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-[min(96vw,460px)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <h3 className="text-base font-semibold">💬 Messages</h3>
              <button className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100" onClick={fermerMessagerie} aria-label="Fermer">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              {loading ? (
                <div className="text-center py-8 text-sm text-gray-500">Chargement...</div>
              ) : (
                <>
                  {conversations.map(conv => {
                    const nbNonLus = nonLus.conversations[cleNonLus(conv.type, conv.linkId)] || 0
                    return (
                    <button
                      key={conv.key}
                      onClick={() => openConversation(conv)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                    >
                      <div className="relative w-11 h-11 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center text-emerald-700 font-bold shrink-0">
                        {conv.type === 'activity' && conv.activityName
                          ? <ActivityIcon name={conv.activityName} size={22} />
                          : conv.photo ? <img src={conv.photo} alt="" className="w-full h-full object-cover" /> : (conv.label?.[0] || '?')}
                        <span className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none">{conv.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{conv.label}</p>
                        <p className={`text-xs truncate ${nbNonLus > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                          {conv.lastMessage ? (conv.lastMessageMine ? `Vous : ${conv.lastMessage}` : conv.lastMessage) : 'Dites bonjour 👋'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 self-start pt-0.5">
                        {conv.lastMessageAt && (
                          <span className={`text-[11px] ${nbNonLus > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>{formatConvTime(conv.lastMessageAt)}</span>
                        )}
                        {nbNonLus > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                            {nbNonLus > 99 ? '99+' : nbNonLus}
                          </span>
                        )}
                      </div>
                    </button>
                    )
                  })}

                  {newContacts.length > 0 && (
                    <div className="p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase px-0.5">Nouvelle conversation</p>
                      {newContacts.map(c => (
                        <div key={c.numeroH} className="flex items-center gap-3 border border-gray-200 rounded-xl p-2.5">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center text-emerald-700 font-bold shrink-0">
                            {c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover" /> : (c.prenom?.[0] || '?')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{c.prenom} {c.nomFamille}</p>
                          </div>
                          <button
                            onClick={() => startConversation(c)}
                            disabled={starting === c.numeroH}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0"
                          >
                            {starting === c.numeroH ? '...' : 'Écrire'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {conversations.length === 0 && newContacts.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-500">Personne à écrire pour le moment.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fenêtre de discussion */}
      {chat && userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" onClick={fermerMessagerie}>
          <div className="bg-white rounded-none sm:rounded-lg w-full h-full sm:h-auto sm:max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-violet-600 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-bold text-base">💬 {chat.label}</h3>
              <button onClick={fermerMessagerie} aria-label="Fermer la discussion" className="text-white/80 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-3">
              {chat.type === 'friend' && <FriendChat linkId={chat.linkId} myNumeroH={userData.numeroH} partnerLabel={chat.label} />}
              {chat.type === 'couple' && <CoupleChat linkId={chat.linkId} myNumeroH={userData.numeroH} partnerLabel={chat.label} />}
              {(chat.type === 'parent' || chat.type === 'child') && <ParentChildChat linkId={chat.linkId} myNumeroH={userData.numeroH} partnerLabel={chat.label} />}
              {chat.type === 'family' && <FamilyGroupChat myNumeroH={userData.numeroH} prenom={userData.prenom} nomFamille={userData.nomFamille} />}
              {chat.type === 'residence' && residenceGroups[chat.linkId] && (
                <ResidenceGroupChat group={residenceGroups[chat.linkId]} myNumeroH={userData.numeroH} userData={userData} />
              )}
              {chat.type === 'activity' && activityGroups[chat.linkId] && (
                <ActivityGroupChat group={activityGroups[chat.linkId]} myNumeroH={userData.numeroH} userData={userData} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
