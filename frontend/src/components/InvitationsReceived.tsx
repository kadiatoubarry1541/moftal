import { useState, useEffect } from 'react'
import './InvitationsReceived.css'
import { InvitationManager } from '../utils/invitationManager'
import type { Invitation, InvitationNotification } from '../types/invitation.ts'
import { useTraduction } from '../i18n/traduction'

interface InvitationsReceivedProps {
  userData: {
    numeroH: string
    prenom: string
    nomFamille: string
  }
}

export function InvitationsReceived({ userData }: InvitationsReceivedProps) {
  const { tr, locale } = useTraduction()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [notifications, setNotifications] = useState<InvitationNotification[]>([])
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    loadInvitations()
    loadNotifications()
  }, [userData.numeroH])

  const loadInvitations = async () => {
    try {
      setInvitations(await InvitationManager.getReceivedInvitations())
    } catch (err) {
      console.error('Invitations:', err)
    }
  }

  const loadNotifications = async () => {
    try {
      setNotifications(await InvitationManager.getNotifications())
    } catch (err) {
      console.error('Notifications invitations:', err)
    }
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const invitation = await InvitationManager.acceptInvitation(invitationId)
      await Promise.all([loadInvitations(), loadNotifications()])
      alert(tr("Vous avez accepté l'invitation de {nom}", { nom: invitation.fromName }))
    } catch (err: any) {
      alert(tr(err?.message || "Erreur : la réponse n'a pas été enregistrée."))
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const invitation = await InvitationManager.declineInvitation(invitationId)
      await Promise.all([loadInvitations(), loadNotifications()])
      alert(tr("Vous avez refusé l'invitation de {nom}", { nom: invitation.fromName }))
    } catch (err: any) {
      alert(tr(err?.message || "Erreur : la réponse n'a pas été enregistrée."))
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await InvitationManager.markNotificationAsRead(notificationId)
    } catch (err) {
      console.error('Notification:', err)
    }
    loadNotifications()
  }

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')
  const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted')
  const declinedInvitations = invitations.filter(inv => inv.status === 'declined')
  const unreadNotifications = notifications.filter(notif => !notif.read)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelationIcon = (relation: string) => {
    switch (relation) {
      case 'parent': return '👨‍👩‍👧‍👦'
      case 'femme': return '👩'
      case 'mari': return '👨'
      case 'fiance': return '💍'
      case 'enfant': return '👶'
      case 'invite': return '👥'
      default: return '👤'
    }
  }

  return (
    <div className="invitations-received">
      <div className="invitations-header">
        <h3>{tr("Mes Invitations")}</h3>
        {unreadNotifications.length > 0 && (
          <div className="notification-badge">
            {unreadNotifications.length > 1 ? tr("{n} nouvelles", { n: unreadNotifications.length }) : tr("{n} nouvelle", { n: unreadNotifications.length })}
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-section">
          <h4>{tr("Notifications récentes")}</h4>
          <div className="notifications-list">
            {notifications.slice(0, 5).map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                onClick={() => markNotificationAsRead(notification.id)}
              >
                {/* Photo de la personne qui invite */}
                <div className="notification-avatar">
                  {notification.fromPhoto ? (
                    <img
                      src={notification.fromPhoto}
                      alt={notification.fromName}
                      className="notification-avatar-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display:flex');
                      }}
                    />
                  ) : null}
                  <div
                    className="notification-avatar-fallback"
                    style={{ display: notification.fromPhoto ? 'none' : 'flex' }}
                  >
                    {notification.fromName?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
                <div className="notification-content">
                  <div className="notification-message">{tr(notification.message)}</div>
                  <div className="notification-date">{formatDate(notification.date)}</div>
                </div>
                {!notification.read && <div className="unread-indicator"></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="invitations-tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span className="tab-icon">⏳</span>
          <span className="tab-label">{tr("En attente ({n})", { n: pendingInvitations.length })}</span>
        </button>
        <button
          className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          <span className="tab-icon">✅</span>
          <span className="tab-label">{tr("Acceptées ({n})", { n: acceptedInvitations.length })}</span>
        </button>
        <button
          className={`tab ${activeTab === 'declined' ? 'active' : ''}`}
          onClick={() => setActiveTab('declined')}
        >
          <span className="tab-icon">❌</span>
          <span className="tab-label">{tr("Refusées ({n})", { n: declinedInvitations.length })}</span>
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="invitations-content">
        {activeTab === 'pending' && (
          <div className="pending-invitations">
            {pendingInvitations.length === 0 ? (
              <div className="empty-state">
                <p>{tr("Aucune invitation en attente")}</p>
              </div>
            ) : (
              <div className="invitations-list">
                {pendingInvitations.map(invitation => (
                  <div key={invitation.id} className="invitation-card pending">
                    <div className="invitation-header">
                      <div className="invitation-avatar-wrap">
                        {invitation.fromPhoto ? (
                          <img
                            src={invitation.fromPhoto}
                            alt={invitation.fromName}
                            className="invitation-avatar-img"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display:flex');
                            }}
                          />
                        ) : null}
                        <div
                          className="invitation-avatar-fallback"
                          style={{ display: invitation.fromPhoto ? 'none' : 'flex' }}
                        >
                          {invitation.fromName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="invitation-relation-badge">{getRelationIcon(invitation.relation)}</span>
                      </div>
                      <div className="invitation-info">
                        <h4>{invitation.fromName}</h4>
                        <p className="invitation-relation">
                          {tr("Vous invite en tant que {relation}", { relation: tr(invitation.relation) })}
                        </p>
                        <p className="invitation-date">
                          {tr("Reçue le {date}", { date: formatDate(invitation.dateSent) })}
                        </p>
                      </div>
                    </div>
                    
                    {invitation.message && (
                      <div className="invitation-message">
                        <strong>{tr("Message :")}</strong> {invitation.message}
                      </div>
                    )}
                    
                    <div className="invitation-actions">
                      <button 
                        className="btn accept-btn"
                        onClick={() => handleAcceptInvitation(invitation.id)}
                      >
                        ✅ {tr("Accepter")}
                      </button>
                      <button 
                        className="btn decline-btn"
                        onClick={() => handleDeclineInvitation(invitation.id)}
                      >
                        ❌ {tr("Refuser")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'accepted' && (
          <div className="accepted-invitations">
            {acceptedInvitations.length === 0 ? (
              <div className="empty-state">
                <p>{tr("Aucune invitation acceptée")}</p>
              </div>
            ) : (
              <div className="invitations-list">
                {acceptedInvitations.map(invitation => (
                  <div key={invitation.id} className="invitation-card accepted">
                    <div className="invitation-header">
                      <div className="invitation-avatar-wrap">
                        {invitation.fromPhoto ? (
                          <img
                            src={invitation.fromPhoto}
                            alt={invitation.fromName}
                            className="invitation-avatar-img"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display:flex');
                            }}
                          />
                        ) : null}
                        <div
                          className="invitation-avatar-fallback"
                          style={{ display: invitation.fromPhoto ? 'none' : 'flex' }}
                        >
                          {invitation.fromName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="invitation-relation-badge">{getRelationIcon(invitation.relation)}</span>
                      </div>
                      <div className="invitation-info">
                        <h4>{invitation.fromName}</h4>
                        <p className="invitation-relation">
                          {tr("Vous avez accepté l'invitation en tant que {relation}", { relation: tr(invitation.relation) })}
                        </p>
                        <p className="invitation-date">
                          {tr("Acceptée le {date}", { date: formatDate(invitation.dateResponded || '') })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="invitation-status">
                      <span className="status-badge accepted">
                        ✅ {tr("Acceptée")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'declined' && (
          <div className="declined-invitations">
            {declinedInvitations.length === 0 ? (
              <div className="empty-state">
                <p>{tr("Aucune invitation refusée")}</p>
              </div>
            ) : (
              <div className="invitations-list">
                {declinedInvitations.map(invitation => (
                  <div key={invitation.id} className="invitation-card declined">
                    <div className="invitation-header">
                      <div className="invitation-avatar-wrap">
                        {invitation.fromPhoto ? (
                          <img
                            src={invitation.fromPhoto}
                            alt={invitation.fromName}
                            className="invitation-avatar-img"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display:flex');
                            }}
                          />
                        ) : null}
                        <div
                          className="invitation-avatar-fallback"
                          style={{ display: invitation.fromPhoto ? 'none' : 'flex' }}
                        >
                          {invitation.fromName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="invitation-relation-badge">{getRelationIcon(invitation.relation)}</span>
                      </div>
                      <div className="invitation-info">
                        <h4>{invitation.fromName}</h4>
                        <p className="invitation-relation">
                          {tr("Vous avez refusé l'invitation en tant que {relation}", { relation: tr(invitation.relation) })}
                        </p>
                        <p className="invitation-date">
                          {tr("Refusée le {date}", { date: formatDate(invitation.dateResponded || '') })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="invitation-status">
                      <span className="status-badge declined">
                        ❌ {tr("Refusée")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
