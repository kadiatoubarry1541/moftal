import { useState, useEffect } from 'react'
import { FriendChat } from './FriendChat'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

const CONTACT_ENDPOINTS = ['family-contacts', 'quartier-contacts', 'activity-contacts']

interface Contact {
  numeroH: string
  prenom?: string
  nomFamille?: string
  photo?: string
}

export function FloatingMessenger() {
  const [open, setOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [chat, setChat] = useState<{ linkId: string; label: string } | null>(null)

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

  const loadContacts = async () => {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const openPicker = () => {
    setOpen(true)
    loadContacts()
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
        setChat({ linkId: data.linkId, label: `${contact.prenom || ''} ${contact.nomFamille || ''}`.trim() })
      } else {
        alert(data.message || "Impossible d'ouvrir cette conversation")
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setStarting(null)
    }
  }

  return (
    <>
      {/* Bouton flottant - en bas à droite (comme WhatsApp), safe-area pour mobiles —
          ne chevauche jamais l'en-tête, les onglets ou la barre des stories */}
      <button
        aria-label="Ouvrir la messagerie"
        onClick={openPicker}
        className="fixed z-50 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-lg hover:shadow-xl active:scale-95 transition-transform min-w-[56px] min-h-[56px] w-14 h-14 flex items-center justify-center text-2xl"
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))', right: 'max(1rem, env(safe-area-inset-right, 0px))' }}
      >
        💬
      </button>

      {/* Sélection du destinataire */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative bg-white rounded-none sm:rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-[min(96vw,460px)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <h3 className="text-base font-semibold">💬 Écrire à quelqu'un</h3>
              <button className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 min-h-0 space-y-2">
              {loading ? (
                <div className="text-center py-8 text-sm text-gray-500">Chargement...</div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">Personne à écrire pour le moment.</div>
              ) : (
                contacts.map(c => (
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
                ))
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
              <FriendChat linkId={chat.linkId} myNumeroH={userData.numeroH} partnerLabel={chat.label} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
