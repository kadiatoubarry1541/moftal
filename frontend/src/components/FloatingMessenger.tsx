import { useState, useEffect } from 'react'
import { FriendChat } from './FriendChat'
import { CoupleChat } from './CoupleChat'
import { ParentChildChat } from './ParentChildChat'
import { FamilyGroupChat } from './FamilyGroupChat'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

const CONTACT_ENDPOINTS = ['family-contacts', 'quartier-contacts', 'activity-contacts']

interface Contact {
  numeroH: string
  prenom?: string
  nomFamille?: string
  photo?: string
}

type ChatType = 'friend' | 'couple' | 'parent' | 'child' | 'family'

// La messagerie "Famille principal" (family_tree_messages) n'a pas de linkId :
// elle est automatiquement liée à l'arbre de l'utilisateur connecté côté serveur.
const MESSAGES_PATH: Record<ChatType, string> = {
  friend: '/api/friends/messages',
  couple: '/api/couple/messages',
  parent: '/api/parent-child/messages',
  child: '/api/parent-child/messages',
  family: '/api/family-tree/messages',
}

const ICONS: Record<ChatType, string> = {
  friend: '👥',
  couple: '💑',
  parent: '🧓',
  child: '👶',
  family: '👨‍👩‍👧‍👦',
}

interface Conversation {
  key: string
  type: ChatType
  linkId: string
  numeroH: string
  label: string
  photo?: string | null
  icon: string
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

interface RawMessage {
  messageType?: 'text' | 'image' | 'video' | 'audio'
  content?: string
  numeroH: string
  created_at?: string
  createdAt?: string
}

function previewForMessage(m: RawMessage): string {
  if (m.messageType === 'image') return '📷 Photo'
  if (m.messageType === 'video') return '🎥 Vidéo'
  if (m.messageType === 'audio') return '🎤 Message vocal'
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
}

export function FloatingMessenger() {
  const [open, setOpen] = useState(false)
  const [userData, setUserData] = useState<SessionUser | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [chat, setChat] = useState<{ type: ChatType; linkId: string; label: string } | null>(null)

  useEffect(() => {
    const session = localStorage.getItem('session_user')
    if (session) {
      try {
        const parsed = JSON.parse(session)
        setUserData(parsed.userData || parsed)
      } catch {
        // ignore
      }
    }
  }, [])

  const fetchLastMessage = async (type: ChatType, linkId: string) => {
    try {
      const token = localStorage.getItem('token')
      const url = type === 'family'
        ? `${API_BASE}${MESSAGES_PATH[type]}`
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

  const loadConversations = async (myNumeroH?: string) => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [friendsRes, wivesRes, partnerRes, childrenRes, parentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/friends/list`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/couple/my-wives`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/couple/my-partner`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/parent-child/my-children`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/parent-child/my-parents`, { headers }).then(r => r.json()).catch(() => null),
      ])

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
          if (!c.child) return
          base.push({ key: `child-${c.id}`, type: 'child', linkId: c.id, numeroH: c.child.numeroH, label: `${c.child.prenom || ''} ${c.child.nomFamille || ''}`.trim(), photo: c.child.photo, icon: ICONS.child })
        })
      }

      if (parentsRes?.success) {
        (parentsRes.parents || []).forEach((p: RelativeItem) => {
          if (!p.parent) return
          base.push({ key: `parent-${p.id}`, type: 'parent', linkId: p.id, numeroH: p.parent.numeroH, label: `${p.parent.prenom || ''} ${p.parent.nomFamille || ''}`.trim(), photo: p.parent.photo, icon: ICONS.parent })
        })
      }

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
    await Promise.all([loadConversations(userData?.numeroH), loadContacts()])
    setLoading(false)
  }

  const openConversation = (conv: Conversation) => {
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
      </button>

      {/* Sélection du destinataire / conversations */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative bg-white rounded-none sm:rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-[min(96vw,460px)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <h3 className="text-base font-semibold">💬 Messages</h3>
              <button className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              {loading ? (
                <div className="text-center py-8 text-sm text-gray-500">Chargement...</div>
              ) : (
                <>
                  {conversations.map(conv => (
                    <button
                      key={conv.key}
                      onClick={() => openConversation(conv)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                    >
                      <div className="relative w-11 h-11 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center text-emerald-700 font-bold shrink-0">
                        {conv.photo ? <img src={conv.photo} alt="" className="w-full h-full object-cover" /> : (conv.label?.[0] || '?')}
                        <span className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none">{conv.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{conv.label}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {conv.lastMessage ? (conv.lastMessageMine ? `Vous : ${conv.lastMessage}` : conv.lastMessage) : 'Dites bonjour 👋'}
                        </p>
                      </div>
                      {conv.lastMessageAt && (
                        <span className="text-[11px] text-gray-400 shrink-0 self-start pt-0.5">{formatConvTime(conv.lastMessageAt)}</span>
                      )}
                    </button>
                  ))}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" onClick={() => setChat(null)}>
          <div className="bg-white rounded-none sm:rounded-lg w-full h-full sm:h-auto sm:max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-violet-600 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-bold text-base">💬 {chat.label}</h3>
              <button onClick={() => setChat(null)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-3">
              {chat.type === 'friend' && <FriendChat linkId={chat.linkId} myNumeroH={userData.numeroH} partnerLabel={chat.label} />}
              {chat.type === 'couple' && <CoupleChat linkId={chat.linkId} myNumeroH={userData.numeroH} partnerLabel={chat.label} />}
              {(chat.type === 'parent' || chat.type === 'child') && <ParentChildChat linkId={chat.linkId} myNumeroH={userData.numeroH} partnerLabel={chat.label} />}
              {chat.type === 'family' && <FamilyGroupChat myNumeroH={userData.numeroH} prenom={userData.prenom} nomFamille={userData.nomFamille} />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
