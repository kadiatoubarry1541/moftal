import { useEffect } from 'react'

// Messages non lus du bouton 💬 — compteur calculé par le serveur
// (GET /api/unread) ; une conversation ouverte est marquée lue en base.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'
export const EVENEMENT_MESSAGES_LUS = 'messages-lus'

export interface MessagesNonLus {
  total: number
  conversations: Record<string, number>
}

export async function chargerMessagesNonLus(): Promise<MessagesNonLus | null> {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/api/unread`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return data?.success ? { total: data.total || 0, conversations: data.conversations || {} } : null
  } catch {
    return null
  }
}

export async function marquerConversationLue(key: string) {
  const token = localStorage.getItem('token')
  if (!token || !key) return
  try {
    await fetch(`${API_BASE}/api/unread/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    window.dispatchEvent(new Event(EVENEMENT_MESSAGES_LUS))
  } catch {
    // hors-ligne : le compteur se mettra à jour à la prochaine ouverture
  }
}

/** Dans une fenêtre de discussion : lue à l'ouverture, à chaque nouveau message et à la fermeture. */
export function useConversationLue(key: string | null, nbMessages: number) {
  useEffect(() => { if (key) marquerConversationLue(key) }, [key, nbMessages])
  useEffect(() => () => { if (key) marquerConversationLue(key) }, [key])
}
