import { useState } from 'react'
import { InvitationManager } from '../utils/invitationManager'

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

export function InviterMembres({ userData }: { userData: UserData }) {
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

  const handleInvite = () => {
    if (inviteData.numeroH.trim() && inviteData.nomComplet.trim()) {
      // Utiliser le système d'invitations
      const invitation = InvitationManager.sendInvitation({
        fromNumeroH: userData.numeroH,
        fromName: `${userData.prenom} ${userData.nomFamille}`,
        fromPhoto: userData.photo || undefined,
        toNumeroH: inviteData.numeroH.trim(),
        toName: inviteData.nomComplet.trim(),
        relation: inviteData.relation,
        message: inviteData.message.trim() || undefined
      })
      
      // Ajouter à la liste locale pour affichage
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
      
      alert(`Invitation envoyée à ${newMember.nomComplet} (${newMember.numeroH})`)
    }
  }

  const handleRemoveMember = (id: string) => {
    const success = InvitationManager.deleteInvitation(id, userData.numeroH)
    if (success) {
      setFamilyMembers(prev => prev.filter(member => member.id !== id))
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
      case 'pending': return 'En attente'
      case 'accepted': return 'Accepté'
      case 'declined': return 'Refusé'
      default: return 'Inconnu'
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
        <h2>Inviter des membres de famille</h2>
        <p>Ajoutez des personnes à votre site pour qu'elles puissent voir votre contenu</p>
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
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="inviter-content">
        {activeTab === 'inviter' && (
          <div className="invite-tab">
            <div className="invite-section">
              <h3>Inviter une nouvelle personne</h3>
              <p>Entrez le NumeroH et le nom complet de la personne que vous souhaitez inviter</p>
              
              <div className="invite-form">
                <div className="form-group">
                  <label>NumeroH de la personne:</label>
                  <input
                    type="text"
                    value={inviteData.numeroH}
                    onChange={(e) => setInviteData(prev => ({ ...prev, numeroH: e.target.value }))}
                    placeholder="Ex: G96C1P2R3E2F1 4"
                    className="numero-h-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Nom complet:</label>
                  <input
                    type="text"
                    value={inviteData.nomComplet}
                    onChange={(e) => setInviteData(prev => ({ ...prev, nomComplet: e.target.value }))}
                    placeholder="Ex: Fatoumata Barry"
                    className="nom-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Relation:</label>
                  <select
                    value={inviteData.relation}
                    onChange={(e) => setInviteData(prev => ({ ...prev, relation: e.target.value }))}
                    className="relation-select"
                  >
                    {relationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Message (optionnel):</label>
                  <textarea
                    value={inviteData.message}
                    onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Ajoutez un message personnel..."
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
                    Envoyer l'invitation
                  </button>
                </div>
              </div>
            </div>

            {/* Types de membres */}
            <div className="member-types">
              <h3>Types de membres que vous pouvez inviter</h3>
              <div className="types-grid">
                <div className="type-card">
                  <div className="type-icon">👨‍👩‍👧‍👦</div>
                  <h4>Parents</h4>
                  <p>Votre père et votre mère</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">👩</div>
                  <h4>Femme(s)</h4>
                  <p>Vos épouses (jusqu'à 5)</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">👨</div>
                  <h4>Mari</h4>
                  <p>Votre époux (unique)</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">💍</div>
                  <h4>Fiancé(e)</h4>
                  <p>Votre fiancé(e)</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">👶</div>
                  <h4>Enfants</h4>
                  <p>Vos fils et filles</p>
                </div>
                <div className="type-card">
                  <div className="type-icon">👥</div>
                  <h4>Invités</h4>
                  <p>Autres personnes importantes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'membres' && (
          <div className="membres-tab">
            <h3>Mes membres invités</h3>
            
            {familyMembers.length === 0 ? (
              <div className="empty-members">
                <p>Aucun membre invité pour le moment</p>
                <button 
                  className="btn"
                  onClick={() => setActiveTab('inviter')}
                >
                  Inviter votre premier membre
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
                          {relationOptions.find(r => r.value === member.relation)?.label}
                        </p>
                      </div>
                    </div>
                    
                    <div className="member-status">
                      <div className={`status-badge ${member.status}`}>
                        <span className="status-icon">{getStatusIcon(member.status)}</span>
                        <span className="status-text">{getStatusText(member.status)}</span>
                      </div>
                      <p className="invite-date">
                        Invité le {new Date(member.dateInvited).toLocaleDateString()}
                      </p>
                      {member.message && (
                        <p className="invite-message">
                          <strong>Message :</strong> {member.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="member-actions">
                      <button 
                        className="btn-danger"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Supprimer
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
            <h3>Comment fonctionne le système d'invitation</h3>
            
            <div className="instructions-content">
              <div className="instruction-section">
                <h4>📝 Pour inviter quelqu'un :</h4>
                <ol>
                  <li>Entrez le NumeroH de la personne</li>
                  <li>Entrez son nom complet</li>
                  <li>Sélectionnez la relation</li>
                  <li>Cliquez sur "Envoyer l'invitation"</li>
                </ol>
              </div>

              <div className="instruction-section">
                <h4>🔐 Connexion des membres invités :</h4>
                <p>Une fois invité, la personne peut se connecter à votre site en utilisant :</p>
                <ul>
                  <li>Son NumeroH</li>
                  <li>Son nom complet</li>
                  <li>Son mot de passe</li>
                </ul>
              </div>

              <div className="instruction-section">
                <h4>👀 Accès au contenu :</h4>
                <p>Les membres invités peuvent :</p>
                <ul>
                  <li>Voir le contenu de votre site</li>
                  <li>Aimer vos publications</li>
                  <li>Pleurer (réagir émotionnellement)</li>
                  <li>Laisser des commentaires</li>
                </ul>
              </div>

              <div className="instruction-section">
                <h4>🚫 Restrictions :</h4>
                <p>Seules les personnes que vous invitez peuvent accéder à votre site. Les autres n'auront pas accès.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
