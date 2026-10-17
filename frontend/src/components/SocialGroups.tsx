import { useState, useEffect } from 'react'
import { calculerAge } from '../utils/calculs'
import { useTraduction } from '../i18n/traduction'

interface SocialGroupMember {
  id: string
  prenom: string
  nomFamille: string
  numeroH: string
  genre: 'FEMME' | 'HOMME' | 'AUTRE'
  age: number
  activites: string[]
  photo?: string
  joinedDate: string
  lastSeen: string
  isOnline: boolean
}

interface SocialGroupPost {
  id: string
  author: SocialGroupMember
  content: string
  type: 'text' | 'image' | 'video' | 'poll'
  createdAt: string
  likes: number
  comments: number
  isLiked: boolean
  mediaUrl?: string
}

interface SocialGroupsProps {
  userData: any
}

export function SocialGroups({ userData }: SocialGroupsProps) {
  const { tr } = useTraduction()
  const [activeTab, setActiveTab] = useState('my-groups')
  const [members, setMembers] = useState<SocialGroupMember[]>([])
  const [posts, setPosts] = useState<SocialGroupPost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Calculer l'âge de l'utilisateur
  const userAge = userData.dateNaissance ? calculerAge(userData.dateNaissance) : 0
  
  // Déterminer les organisations accessibles à l'utilisateur
  const getUserAccessibleGroups = () => {
    const groups = []
    
    if (userData.genre === 'FEMME') {
      groups.push({
        id: 'femme',
        name: 'Organisation des Femmes',
        icon: '👩',
        color: '#E91E63',
        description: 'Espace dédié aux femmes de la communauté. Partagez vos expériences, défis et réussites.',
        members: 0,
        isJoined: false
      })
    }
    
    if (userData.genre === 'HOMME') {
      groups.push({
        id: 'homme',
        name: 'Organisation des Hommes',
        icon: '👨',
        color: '#2196F3',
        description: 'Communauté des hommes. Discussions, conseils et partage d\'expériences masculines.',
        members: 0,
        isJoined: false
      })
    }
    
    if (userAge !== null && userAge < 18) {
      groups.push({
        id: 'jeunes',
        name: 'Organisation des Jeunes',
        icon: '👦👧',
        color: '#4CAF50',
        description: 'Espace pour les jeunes de moins de 18 ans. Apprentissage, amitié et développement.',
        members: 0,
        isJoined: false
      })
    }
    
    return groups
  }

  const accessibleGroups = getUserAccessibleGroups()

  useEffect(() => {
    // Simuler le chargement des données des organisations sociaux
    const mockMembers: SocialGroupMember[] = [
      {
        id: '1',
        prenom: 'Fatoumata',
        nomFamille: 'Diallo',
        numeroH: 'G1C1P1R1E1F1 1',
        genre: 'FEMME',
        age: 25,
        activites: ['Enseignante'],
        joinedDate: '2024-01-15',
        lastSeen: '2024-01-20T14:30:00Z',
        isOnline: true
      },
      {
        id: '2',
        prenom: 'Mamadou',
        nomFamille: 'Barry',
        numeroH: 'G1C1P1R1E1F1 2',
        genre: 'HOMME',
        age: 30,
        activites: ['Agriculteur'],
        joinedDate: '2024-01-10',
        lastSeen: '2024-01-20T12:15:00Z',
        isOnline: false
      },
      {
        id: '3',
        prenom: 'Aminata',
        nomFamille: 'Sow',
        numeroH: 'G1C1P1R1E1F1 3',
        genre: 'FEMME',
        age: 16,
        activites: ['Étudiante'],
        joinedDate: '2024-01-08',
        lastSeen: '2024-01-19T16:45:00Z',
        isOnline: true
      },
      {
        id: '4',
        prenom: 'Ibrahima',
        nomFamille: 'Bah',
        numeroH: 'G1C1P1R1E1F1 4',
        genre: 'HOMME',
        age: 15,
        activites: ['Élève'],
        joinedDate: '2024-01-05',
        lastSeen: '2024-01-19T14:20:00Z',
        isOnline: true
      }
    ]

    const mockPosts: SocialGroupPost[] = [
      {
        id: '1',
        author: mockMembers[0],
        content: 'Bonjour mesdames ! Comment gérez-vous l\'équilibre entre travail et famille ?',
        type: 'text',
        createdAt: '2024-01-20T14:30:00Z',
        likes: 8,
        comments: 3,
        isLiked: false
      },
      {
        id: '2',
        author: mockMembers[1],
        content: 'Salut les gars ! Qui a des conseils pour améliorer la productivité agricole ?',
        type: 'text',
        createdAt: '2024-01-20T12:15:00Z',
        likes: 5,
        comments: 2,
        isLiked: true
      },
      {
        id: '3',
        author: mockMembers[2],
        content: 'Hey les jeunes ! Quels sont vos projets d\'avenir ?',
        type: 'text',
        createdAt: '2024-01-19T16:45:00Z',
        likes: 12,
        comments: 7,
        isLiked: false
      }
    ]

    setTimeout(() => {
      setMembers(mockMembers)
      setPosts(mockPosts)
      setIsLoading(false)
    }, 1000)
  }, [userData])

  // Filtrer les membres selon le organisation sélectionné
  const getGroupMembers = (groupId: string) => {
    switch (groupId) {
      case 'femme':
        return members.filter(member => member.genre === 'FEMME')
      case 'homme':
        return members.filter(member => member.genre === 'HOMME')
      case 'jeunes':
        return members.filter(member => member.age < 18)
      default:
        return []
    }
  }

  // Filtrer les posts selon le organisation sélectionné
  const getGroupPosts = (groupId: string) => {
    const groupMembers = getGroupMembers(groupId)
    const memberIds = groupMembers.map(member => member.id)
    return posts.filter(post => memberIds.includes(post.author.id))
  }

  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: !post.isLiked,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1
          }
        : post
    ))
  }

  const tabs = [
    { id: 'my-groups', label: 'Mes Groupes', icon: '👥' },
    { id: 'all-groups', label: 'Tous les Groupes', icon: '🌐' },
    { id: 'discussions', label: 'Discussions', icon: '💬' }
  ]

  if (isLoading) {
    return (
      <div className="social-groups-loading">
        <div className="loading-spinner"></div>
        <p>{tr('Chargement des organisations sociaux...')}</p>
      </div>
    )
  }

  return (
    <div className="social-groups-page">
      <div className="groups-header">
        <h3>{tr('👥 Groupes Sociaux')}</h3>
        <p className="user-info">
          {userData.prenom} {userData.nomFamille} - {userData.genre} - {tr('{n} ans', { n: userAge })}
        </p>
        <p className="access-info">
          {tr('Groupes accessibles : {liste}', { liste: accessibleGroups.map(g => tr(g.name)).join(', ') })}
        </p>
      </div>

      {/* Navigation par onglets */}
      <div className="groups-tabs">
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
      <div className="groups-content">
        {activeTab === 'my-groups' && (
          <div className="my-groups-tab">
            <h4>{tr('👥 Mes Groupes Sociaux')}</h4>
            {accessibleGroups.length > 0 ? (
              <div className="groups-grid">
                {accessibleGroups.map(group => {
                  const groupMembers = getGroupMembers(group.id)
                  const groupPosts = getGroupPosts(group.id)
                  
                  return (
                    <div key={group.id} className="group-card" style={{ borderLeftColor: group.color }}>
                      <div className="group-header">
                        <div className="group-icon" style={{ color: group.color }}>
                          {group.icon}
                        </div>
                        <div className="group-info">
                          <h5>{tr(group.name)}</h5>
                          <p className="group-description">{tr(group.description)}</p>
                        </div>
                        <button 
                          className="join-btn"
                          style={{ backgroundColor: group.color }}
                        >
                          {tr('Rejoindre')}
                        </button>
                      </div>
                      <div className="group-stats">
                        <span className="members-count">{tr('👥 {n} membres', { n: groupMembers.length })}</span>
                        <span className="posts-count">{tr('📝 {n} discussions', { n: groupPosts.length })}</span>
                        <span className="online-count">{tr('🟢 {n} en ligne', { n: groupMembers.filter(m => m.isOnline).length })}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="no-access">
                <p>{tr("Vous n'avez accès à aucun organisation social pour le moment.")}</p>
                <p>{tr('Vérifiez votre profil et votre âge.')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'all-groups' && (
          <div className="all-groups-tab">
            <h4>{tr('🌐 Tous les Groupes Sociaux')}</h4>
            <div className="groups-grid">
              {[
                {
                  id: 'femme',
                  name: 'Organisation des Femmes',
                  icon: '👩',
                  color: '#E91E63',
                  description: 'Espace dédié aux femmes de la communauté',
                  members: members.filter(m => m.genre === 'FEMME').length,
                  isAccessible: userData.genre === 'FEMME'
                },
                {
                  id: 'homme',
                  name: 'Organisation des Hommes',
                  icon: '👨',
                  color: '#2196F3',
                  description: 'Communauté des hommes',
                  members: members.filter(m => m.genre === 'HOMME').length,
                  isAccessible: userData.genre === 'HOMME'
                },
                {
                  id: 'jeunes',
                  name: 'Organisation des Jeunes',
                  icon: '👦👧',
                  color: '#4CAF50',
                  description: 'Espace pour les jeunes de moins de 18 ans',
                  members: members.filter(m => m.age < 18).length,
                  isAccessible: userAge !== null && userAge < 18
                }
              ].map(group => (
                <div key={group.id} className={`group-card ${group.isAccessible ? 'accessible' : 'restricted'}`}>
                  <div className="group-header">
                    <div className="group-icon" style={{ color: group.color }}>
                      {group.icon}
                    </div>
                    <div className="group-info">
                      <h5>{tr(group.name)}</h5>
                      <p className="group-description">{tr(group.description)}</p>
                      {!group.isAccessible && (
                        <span className="restricted-badge">{tr('Accès restreint')}</span>
                      )}
                    </div>
                    {group.isAccessible ? (
                      <button 
                        className="join-btn"
                        style={{ backgroundColor: group.color }}
                      >
                        {tr('Rejoindre')}
                      </button>
                    ) : (
                      <button className="restricted-btn" disabled>
                        {tr('Non accessible')}
                      </button>
                    )}
                  </div>
                  <div className="group-stats">
                    <span className="members-count">{tr('👥 {n} membres', { n: group.members })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="discussions-tab">
            <h4>{tr('💬 Discussions des Groupes')}</h4>
            <div className="posts-list">
              {posts.map(post => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="author-info">
                      <div className="author-avatar" style={{ backgroundColor: post.author.genre === 'FEMME' ? '#E91E63' : post.author.genre === 'HOMME' ? '#2196F3' : '#4CAF50' }}>
                        {post.author.prenom.charAt(0)}
                      </div>
                      <div className="author-details">
                        <h4>{post.author.prenom} {post.author.nomFamille}</h4>
                        <p className="author-info-text">
                          {post.author.genre} - {tr('{n} ans', { n: post.author.age })} - {tr('NumeroH : {numero}', { numero: post.author.numeroH })}
                        </p>
                        <p className="post-date">
                          {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="post-content">
                    <p>{post.content}</p>
                  </div>
                  
                  <div className="post-actions">
                    <button 
                      className={`like-btn ${post.isLiked ? 'liked' : ''}`}
                      onClick={() => handleLikePost(post.id)}
                    >
                      👍 {post.likes}
                    </button>
                    <button className="comment-btn">
                      💬 {post.comments}
                    </button>
                    <button className="share-btn">
                      {tr('🔗 Partager')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}















