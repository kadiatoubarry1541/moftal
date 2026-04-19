import { Invitation, InvitationNotification } from '../types/invitation.ts'

// Fonctions utilitaires pour gérer les invitations
export const InvitationManager = {
  // Envoyer une invitation
  sendInvitation: (invitation: Omit<Invitation, 'id' | 'dateSent' | 'status'>) => {
    const newInvitation: Invitation = {
      ...invitation,
      id: Date.now().toString(),
      dateSent: new Date().toISOString(),
      status: 'pending'
    }

    // Sauvegarder l'invitation dans localStorage
    const invitations = InvitationManager.getAllInvitations()
    invitations.push(newInvitation)
    localStorage.setItem('invitations', JSON.stringify(invitations))

    // Créer une notification pour l'invité
    InvitationManager.createNotification({
      invitationId: newInvitation.id,
      type: 'invitation_received',
      fromNumeroH: invitation.fromNumeroH,
      fromName: invitation.fromName,
      fromPhoto: invitation.fromPhoto,
      message: `${invitation.fromName} vous invite à rejoindre son site en tant que ${invitation.relation}`,
      date: new Date().toISOString(),
      read: false
    }, invitation.toNumeroH)

    return newInvitation
  },

  // Accepter une invitation
  acceptInvitation: (invitationId: string, responderNumeroH: string) => {
    const invitations = InvitationManager.getAllInvitations()
    const invitation = invitations.find(inv => inv.id === invitationId)
    
    if (invitation && invitation.toNumeroH === responderNumeroH) {
      invitation.status = 'accepted'
      invitation.dateResponded = new Date().toISOString()
      
      localStorage.setItem('invitations', JSON.stringify(invitations))

      // Créer une notification pour l'expéditeur
      InvitationManager.createNotification({
        invitationId: invitation.id,
        type: 'invitation_accepted',
        fromNumeroH: responderNumeroH,
        fromName: invitation.toName,
        message: `${invitation.toName} a accepté votre invitation`,
        date: new Date().toISOString(),
        read: false
      }, invitation.fromNumeroH)

      return invitation
    }
    return null
  },

  // Refuser une invitation
  declineInvitation: (invitationId: string, responderNumeroH: string) => {
    const invitations = InvitationManager.getAllInvitations()
    const invitation = invitations.find(inv => inv.id === invitationId)
    
    if (invitation && invitation.toNumeroH === responderNumeroH) {
      invitation.status = 'declined'
      invitation.dateResponded = new Date().toISOString()
      
      localStorage.setItem('invitations', JSON.stringify(invitations))

      // Créer une notification pour l'expéditeur
      InvitationManager.createNotification({
        invitationId: invitation.id,
        type: 'invitation_declined',
        fromNumeroH: responderNumeroH,
        fromName: invitation.toName,
        message: `${invitation.toName} a refusé votre invitation`,
        date: new Date().toISOString(),
        read: false
      }, invitation.fromNumeroH)

      return invitation
    }
    return null
  },

  // Récupérer toutes les invitations
  getAllInvitations: (): Invitation[] => {
    const invitations = localStorage.getItem('invitations')
    return invitations ? JSON.parse(invitations) : []
  },

  // Récupérer les invitations envoyées par un utilisateur
  getSentInvitations: (fromNumeroH: string): Invitation[] => {
    return InvitationManager.getAllInvitations().filter(inv => inv.fromNumeroH === fromNumeroH)
  },

  // Récupérer les invitations reçues par un utilisateur
  getReceivedInvitations: (toNumeroH: string): Invitation[] => {
    return InvitationManager.getAllInvitations().filter(inv => inv.toNumeroH === toNumeroH)
  },

  // Créer une notification
  createNotification: (notification: Omit<InvitationNotification, 'id'>, targetNumeroH: string) => {
    const newNotification: InvitationNotification = {
      ...notification,
      id: Date.now().toString()
    }

    const notifications = InvitationManager.getNotifications(targetNumeroH)
    notifications.push(newNotification)
    localStorage.setItem(`notifications_${targetNumeroH}`, JSON.stringify(notifications))
  },

  // Récupérer les notifications d'un utilisateur
  getNotifications: (numeroH: string): InvitationNotification[] => {
    const notifications = localStorage.getItem(`notifications_${numeroH}`)
    return notifications ? JSON.parse(notifications) : []
  },

  // Marquer une notification comme lue
  markNotificationAsRead: (notificationId: string, numeroH: string) => {
    const notifications = InvitationManager.getNotifications(numeroH)
    const notification = notifications.find(notif => notif.id === notificationId)
    if (notification) {
      notification.read = true
      localStorage.setItem(`notifications_${numeroH}`, JSON.stringify(notifications))
    }
  },

  // Supprimer une invitation
  deleteInvitation: (invitationId: string, ownerNumeroH: string) => {
    const invitations = InvitationManager.getAllInvitations()
    const invitation = invitations.find(inv => inv.id === invitationId)
    
    if (invitation && invitation.fromNumeroH === ownerNumeroH) {
      const filteredInvitations = invitations.filter(inv => inv.id !== invitationId)
      localStorage.setItem('invitations', JSON.stringify(filteredInvitations))
      return true
    }
    return false
  }
}