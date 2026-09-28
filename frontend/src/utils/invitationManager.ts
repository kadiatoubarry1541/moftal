import { Invitation, InvitationNotification } from '../types/invitation.ts'
import { config } from '../config/api'

// Invitations familiales : enregistrées dans la base (API /family-data),
// jamais seulement dans le téléphone.

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
})

async function call<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.API_BASE_URL}/family-data${path}`, { ...init, headers: authHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) throw new Error(data.message || "L'enregistrement a échoué. Réessayez.")
  return data
}

const LEGACY_KEY = 'invitations'

export const InvitationManager = {
  // Envoyer une invitation (le nom et la photo de l'expéditeur viennent du serveur)
  sendInvitation: async (invitation: Omit<Invitation, 'id' | 'dateSent' | 'status' | 'fromNumeroH' | 'fromName'> & Partial<Pick<Invitation, 'fromNumeroH' | 'fromName'>>): Promise<Invitation> => {
    const data = await call('/invitations', {
      method: 'POST',
      body: JSON.stringify({ toNumeroH: invitation.toNumeroH, toName: invitation.toName, relation: invitation.relation, message: invitation.message }),
    })
    return data.invitation
  },

  acceptInvitation: async (invitationId: string): Promise<Invitation> =>
    (await call(`/invitations/${invitationId}/respond`, { method: 'POST', body: JSON.stringify({ action: 'accept' }) })).invitation,

  declineInvitation: async (invitationId: string): Promise<Invitation> =>
    (await call(`/invitations/${invitationId}/respond`, { method: 'POST', body: JSON.stringify({ action: 'decline' }) })).invitation,

  getInvitations: async (): Promise<{ received: Invitation[]; sent: Invitation[] }> => {
    await InvitationManager.migrateLegacy()
    const data = await call('/invitations')
    return { received: data.received || [], sent: data.sent || [] }
  },

  getReceivedInvitations: async (): Promise<Invitation[]> => (await InvitationManager.getInvitations()).received,

  getSentInvitations: async (): Promise<Invitation[]> => (await InvitationManager.getInvitations()).sent,

  getNotifications: async (): Promise<InvitationNotification[]> => (await call('/notifications')).notifications || [],

  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    await call(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' })
  },

  deleteInvitation: async (invitationId: string): Promise<boolean> => {
    await call(`/invitations/${invitationId}`, { method: 'DELETE' })
    return true
  },

  // Anciennes invitations gardées dans ce téléphone : on envoie celles que
  // l'utilisateur connecté a écrites (en attente) vers la base, puis on nettoie.
  migrateLegacy: async (): Promise<void> => {
    let legacy: Invitation[] = []
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]') } catch { legacy = [] }
    if (!Array.isArray(legacy) || legacy.length === 0) return
    let me = ''
    try { me = JSON.parse(localStorage.getItem('session_user') || '{}')?.numeroH || '' } catch { /* ignore */ }
    if (!me) return
    const restantes: Invitation[] = []
    for (const inv of legacy) {
      if (inv.fromNumeroH !== me || inv.status !== 'pending') { restantes.push(inv); continue }
      try {
        await call('/invitations', {
          method: 'POST',
          body: JSON.stringify({ toNumeroH: inv.toNumeroH, toName: inv.toName, relation: inv.relation, message: inv.message }),
        })
      } catch {
        restantes.push(inv) // on réessaiera plus tard : rien n'est perdu
      }
    }
    if (restantes.length) localStorage.setItem(LEGACY_KEY, JSON.stringify(restantes))
    else localStorage.removeItem(LEGACY_KEY)
  },
}
