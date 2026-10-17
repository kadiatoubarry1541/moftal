import { useState } from 'react'
import { InvitationManager } from '../utils/invitationManager'
import { useTraduction } from '../i18n/traduction'

interface UserData {
  numeroH: string
  prenom: string
  nomFamille: string
  photo?: string
}

interface FamilyMember {
  id: string
  numeroH: string
  nomComplet: string
  relation: string
  status: 'pending' | 'accepted' | 'declined'
  dateInvited: string
  message?: string
}

export function InviterMembres({ userData: _userData }: { userData: UserData }) {
  const { tr } = useTraduction()
  const [, setShowInviteForm] = useState(false)
  const [inviteData, setInviteData] = useState({
    numeroH: '',
    nomComplet: '',
    relation: 'parent',
    message: ''
  })
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [activeTab, setActiveTab] = useState('inviter')

  const relationOptions = [
    { value: 'parent', label: 'Parent' },
    { value: 'femme', label: 'Femme' },
    { value: 'mari', label: 'Mari' },
    { value: 'fiance', label: 'Fiancé(e)' },
    { value: 'enfant', label: 'Enfant' },
    { value: 'invite', label: 'Invité' }
  ]

  const handleInvite = async () => {
    if (inviteData.numeroH.trim() && inviteData.nomComplet.trim()) {
      try {
        // Invitation enregistrée en base (/api/family-data)
        const invitation = await InvitationManager.sendInvitation({
          toNumeroH: inviteData.numeroH.trim(),
          toName: inviteData.nomComplet.trim(),
          relation: inviteData.relation,
          message: inviteData.message.trim() || undefined
        })

        const newMember: FamilyMember = {
          id: invitation.id,
          numeroH: invitation.toNumeroH,
          nomComplet: invitation.toName,
          relation: invitation.relation,
          status: invitation.status,
          dateInvited: invitation.dateSent,
          message: invitation.message
        }

        setFamilyMembers(prev => [...prev, newMember])
        setInviteData({ numeroH: '', nomComplet: '', relation: 'parent', message: '' })
        setShowInviteForm(false)

        alert(tr("Invitation envoyée à {nom} ({numeroH})", { nom: newMember.nomComplet, numeroH: newMember.numeroH }))
      } catch (err: any) {
        alert(tr(err?.message || "Erreur : l'invitation n'a pas été enregistrée. Réessayez."))
      }
    }
  }

  const handleRemoveMember = async (id: string) => {
    try {
      await InvitationManager.deleteInvitation(id)
      setFamilyMembers(prev => prev.filter(member => member.id !== id))
    } catch (err: any) {
      alert(tr(err?.message || "Erreur : la suppression n'a pas été enregistrée."))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'accepted': return '✅'
      case 'declined': return '❌'
      default: return '❓'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return tr('En attente')
      case 'accepted': return tr('Accepté')
      case 'declined': return tr('Refusé')
      default: return tr('Inconnu')
    }
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

  const tabs = [
    { id: 'inviter', label: 'Inviter des membres', icon: '➕' },
    { id: 'membres', label: 'Mes membres', icon: '👥' },
    { id: 'instructions', label: 'Instructions', icon: '📋' }
  ]

  return (
    <div className="inviter-membres">
      <div className="inviter-header">
        <h2>{tr("Inviter des membres de famille")}</h2>
        <p>{tr("Ajoutez des personnes à votre site pour qu'elles puissent voir votre contenu")}</p>
      </div>

      {/* Navigation par onglets */}
      <div className="inviter-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tr(tab.label)}</span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="inviter-content">
        {activeTab === 'inviter' && (
          <div className="invite-tab">
            <div className="invite-section">
              <h3>{tr("Inviter une nouvelle personne")}</h3>
              <p>{tr("Entrez le NumeroH et le nom complet de la personne que vous souhaitez inviter")}</p>
              
              <div className="invite-form">
                <div className="form-group">
                  <label>{tr("NumeroH de la personne:")}</label>
                  <input
                    type="text"
                    value={inviteData.numeroH}
                    onChange={(e) => setInviteData(prev => ({ ...prev, numeroH: e.target.value }))}
                    placeholder={tr("Ex: G96C1P2R3E2F1 4")}
                    className="numero-h-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>{tr("Nom complet:")}</label>
                  <input
                    type="text"
                    value={inviteData.nomComplet}
                    onChange={(e) => setInviteData(prev => ({ ...prev, nomComplet: e.target.value }))}
                    placeholder={tr("Ex: Fatoumata Barry")}
                    className="nom-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>{tr("Relation:")}</label>
                  <select
                    value={inviteData.relation}
                    onChange={(e) => setInviteData(prev => ({ ...prev, relation: e.target.value }))}
                    className="relation-select"
                  >
                    {relationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {tr(option.label)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>{tr("Message (optionnel):")}</label>
                  <textarea
                    value={inviteData.message}
                    onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder={tr("Ajoutez un message personnel...")}
                    className="message-textarea"
                    rows={3}
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    className="btn"
                    onClick={handleInvite}
                    disabled={!inviteData.numeroH.trim() || !inviteData.nomComplet.trim()}
                  >
                    {tr("Envoyer l'invitation")}
                  </button>
                </div>
              </div>
            </div>

            {/* Types de membres */}
            <div className="member-types">
              <h3>{tr("Types de membres que vous pouvez inviter")}</h3>
              <div className="types-grid">
                <div className="type-card">
                  <div className="type-icon">👨‍👩‍👧‍👦</div>
                  <h4>{tr("Parents")}</h4>
                  <p>{tr("Votre père et votre mère")}</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">👩</div>
                  <h4>{tr("Femme(s)")}</h4>
                  <p>{tr("Vos épouses (jusqu'à 5)")}</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">👨</div>
                  <h4>{tr("Mari")}</h4>
                  <p>{tr("Votre époux (unique)")}</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">💍</div>
                  <h4>{tr("Fiancé(e)")}</h4>
                  <p>{tr("Votre fiancé(e)")}</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">👶</div>
                  <h4>{tr("Enfants")}</h4>
                  <p>{tr("Vos fils et filles")}</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">👥</div>
                  <h4>{tr("Invités")}</h4>
                  <p>{tr("Autres personnes importantes")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'membres' && (
          <div className="membres-tab">
            <h3>{tr("Mes membres invités")}</h3>
            
            {familyMembers.length === 0 ? (
              <div className="empty-members">
                <p>{tr("Aucun membre invité pour le moment")}</p>
                <button 
                  className="btn"
                  onClick={() => setActiveTab('inviter')}
                >
                  {tr("Inviter votre premier membre")}
                </button>
              </div>
            ) : (
              <div className="members-list">
                {familyMembers.map(member => (
                  <div key={member.id} className="member-card">
                    <div className="member-info">
                      <div className="member-icon">
                        {getRelationIcon(member.relation)}
                      </div>
                      <div className="member-details">
                        <h4>{member.nomComplet}</h4>
                        <p className="member-numero-h">{member.numeroH}</p>
                        <p className="member-relation">
                          {tr(relationOptions.find(r => r.value === member.relation)?.label || '')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="member-status">
                      <div className={`status-badge ${member.status}`}>
                        <span className="status-icon">{getStatusIcon(member.status)}</span>
                        <span className="status-text">{getStatusText(member.status)}</span>
                      </div>
                      <p className="invite-date">
                        {tr("Invité le {date}", { date: new Date(member.dateInvited).toLocaleDateString() })}
                      </p>
                      {member.message && (
                        <p className="invite-message">
                          <strong>{tr("Message :")}</strong> {member.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="member-actions">
                      <button 
                        className="btn-danger"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        {tr("Supprimer")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="instructions-tab">
            <h3>{tr("Comment fonctionne le système d'invitation")}</h3>
            
            <div className="instructions-content">
              <div className="instruction-section">
                <h4>{tr("📝 Pour inviter quelqu'un :")}</h4>
                <ol>
                  <li>{tr("Entrez le NumeroH de la personne")}</li>
                  <li>{tr("Entrez son nom complet")}</li>
                  <li>{tr("Sélectionnez la relation")}</li>
                  <li>{tr("Cliquez sur \"Envoyer l'invitation\"")}</li>
                </ol>
              </div>

              <div className="instruction-section">
                <h4>{tr("🔐 Connexion des membres invités :")}</h4>
                <p>{tr("Une fois invité, la personne peut se connecter à votre site en utilisant :")}</p>
                <ul>
                  <li>{tr("Son NumeroH")}</li>
                  <li>{tr("Son nom complet")}</li>
                  <li>{tr("Son mot de passe")}</li>
                </ul>
              </div>

              <div className="instruction-section">
                <h4>{tr("👀 Accès au contenu :")}</h4>
                <p>{tr("Les membres invités peuvent :")}</p>
                <ul>
                  <li>{tr("Voir le contenu de votre site")}</li>
                  <li>{tr("Aimer vos publications")}</li>
                  <li>{tr("Pleurer (réagir émotionnellement)")}</li>
                  <li>{tr("Laisser des commentaires")}</li>
                </ul>
              </div>

              <div className="instruction-section">
                <h4>{tr("🚫 Restrictions :")}</h4>
                <p>{tr("Seules les personnes que vous invitez peuvent accéder à votre site. Les autres n'auront pas accès.")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
