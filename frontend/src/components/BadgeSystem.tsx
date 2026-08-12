import { useState, useEffect } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'achievement' | 'role' | 'special' | 'education' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  awardedBy: string;
  awardedAt: string;
  isActive: boolean;
  badge?: Badge;
}

interface Logo {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'organization' | 'event' | 'achievement' | 'custom';
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface UserLogo {
  id: string;
  userId: string;
  logoId: string;
  assignedBy: string;
  assignedAt: string;
  isActive: boolean;
  logo?: Logo;
}

interface BadgeSystemProps {
  userId?: string;
  isAdmin?: boolean;
}

export default function BadgeSystem({ userId, isAdmin = false }: BadgeSystemProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userLogos, setUserLogos] = useState<UserLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'badges' | 'logos' | 'award'>('badges');
  const [showCreateBadge, setShowCreateBadge] = useState(false);
  const [showCreateLogo, setShowCreateLogo] = useState(false);
  const [showAwardBadge, setShowAwardBadge] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedBadge, setSelectedBadge] = useState<string>('');

  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    icon: '🏆',
    color: '#3B82F6',
    category: 'achievement' as Badge['category'],
    rarity: 'common' as Badge['rarity'],
    requirements: ''
  });

  const [newLogo, setNewLogo] = useState({
    name: '',
    description: '',
    imageUrl: '',
    category: 'organization' as Logo['category']
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les badges
      const badgesResponse = await fetch(`${API_BASE}/api/admin/badges`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (badgesResponse.ok) {
        const badgesData = await badgesResponse.json();
        setBadges(badgesData.badges || []);
      } else {
        setBadges(getDefaultBadges());
      }

      // Charger les logos
      const logosResponse = await fetch(`${API_BASE}/api/admin/logos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (logosResponse.ok) {
        const logosData = await logosResponse.json();
        setLogos(logosData.logos || []);
      } else {
        setLogos(getDefaultLogos());
      }

      // Charger les badges utilisateur
      if (userId) {
        const userBadgesResponse = await fetch(`${API_BASE}/api/admin/user-badges/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (userBadgesResponse.ok) {
          const userBadgesData = await userBadgesResponse.json();
          setUserBadges(userBadgesData.badges || []);
        }
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setBadges(getDefaultBadges());
      setLogos(getDefaultLogos());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultBadges = (): Badge[] => [
    {
      id: '1',
      name: 'Premier Pas',
      description: 'Premier utilisateur inscrit',
      icon: '👶',
      color: '#10B981',
      category: 'achievement',
      rarity: 'common',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Contributeur',
      description: 'A contribué à la communauté',
      icon: '🤝',
      color: '#3B82F6',
      category: 'social',
      rarity: 'rare',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Érudit',
      description: 'A terminé plusieurs formations',
      icon: '🎓',
      color: '#8B5CF6',
      category: 'education',
      rarity: 'epic',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    },
    {
      id: '4',
      name: 'Légende',
      description: 'Utilisateur exceptionnel',
      icon: '👑',
      color: '#F59E0B',
      category: 'special',
      rarity: 'legendary',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    },
    {
      id: '5',
      name: 'Modérateur',
      description: 'Modérateur de la communauté',
      icon: '🛡️',
      color: '#EF4444',
      category: 'role',
      rarity: 'epic',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    }
  ];

  const getDefaultLogos = (): Logo[] => [
    {
      id: '1',
      name: 'Logo Guinée',
      description: 'Logo officiel de la Guinée',
      imageUrl: '/logos/guinea-flag.png',
      category: 'organization',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Logo Éducation',
      description: 'Logo pour les formations',
      imageUrl: '/logos/education.png',
      category: 'education',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Logo Communauté',
      description: 'Logo pour les organisations communautaires',
      imageUrl: '/logos/community.png',
      category: 'organization',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    }
  ];

  const createBadge = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/admin/badges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newBadge,
          requirements: newBadge.requirements ? newBadge.requirements.split(',').map(r => r.trim()) : []
        })
      });
      
      if (response.ok) {
        alert('Badge créé avec succès !');
        setShowCreateBadge(false);
        setNewBadge({
          name: '',
          description: '',
          icon: '🏆',
          color: '#3B82F6',
          category: 'achievement',
          rarity: 'common',
          requirements: ''
        });
        loadData();
      } else {
        alert('Erreur lors de la création du badge');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du badge');
    }
  };

  const createLogo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/admin/logos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newLogo)
      });
      
      if (response.ok) {
        alert('Logo créé avec succès !');
        setShowCreateLogo(false);
        setNewLogo({
          name: '',
          description: '',
          imageUrl: '',
          category: 'organization'
        });
        loadData();
      } else {
        alert('Erreur lors de la création du logo');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du logo');
    }
  };

  const awardBadge = async () => {
    if (!selectedUser || !selectedBadge) {
      alert('Veuillez sélectionner un utilisateur et un badge');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/admin/award-badge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser,
          badgeId: selectedBadge
        })
      });
      
      if (response.ok) {
        alert('Badge attribué avec succès !');
        setShowAwardBadge(false);
        setSelectedUser('');
        setSelectedBadge('');
        loadData();
      } else {
        alert('Erreur lors de l\'attribution du badge');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'attribution du badge');
    }
  };

  const getRarityColor = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: Badge['category']) => {
    switch (category) {
      case 'achievement': return '🏆';
      case 'role': return '👤';
      case 'special': return '⭐';
      case 'education': return '🎓';
      case 'social': return '🤝';
      default: return '🏆';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement du système de badges...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-yellow-500 border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🏆 Système de Badges et Logos</h1>
        
        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
              activeTab === 'badges'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>🏆</span>
            Badges
          </button>
          <button
            onClick={() => setActiveTab('logos')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
              activeTab === 'logos'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>🎨</span>
            Logos
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('award')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                activeTab === 'award'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>🎯</span>
              Attribuer
            </button>
          )}
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'badges' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">🏆 Badges Disponibles</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowCreateBadge(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 flex items-center gap-2"
                >
                  ➕ Créer un badge
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {badges.map((badge) => (
                <div key={badge.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div 
                      className="text-4xl p-3 rounded-full"
                      style={{ backgroundColor: badge.color + '20', color: badge.color }}
                    >
                      {badge.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{badge.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(badge.rarity)}`}>
                        {badge.rarity}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{badge.description}</p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-600">{getCategoryIcon(badge.category)}</span>
                    <span className="text-sm text-gray-600 capitalize">{badge.category}</span>
                  </div>
                  
                  {badge.requirements && badge.requirements.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">Conditions :</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {badge.requirements.map((req, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="text-yellow-500">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logos' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">🎨 Logos Disponibles</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowCreateLogo(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 flex items-center gap-2"
                >
                  ➕ Créer un logo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {logos.map((logo) => (
                <div key={logo.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      {logo.imageUrl ? (
                        <img src={logo.imageUrl} alt={logo.name} className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <span className="text-2xl">🎨</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{logo.name}</h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        {logo.category}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{logo.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'award' && isAdmin && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">🎯 Attribuer un Badge</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
                  <input
                    type="text"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="NumeroH de l'utilisateur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
                  <select
                    value={selectedBadge}
                    onChange={(e) => setSelectedBadge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un badge</option>
                    {badges.map((badge) => (
                      <option key={badge.id} value={badge.id}>
                        {badge.icon} {badge.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={awardBadge}
                className="mt-4 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
              >
                🎯 Attribuer le badge
              </button>
            </div>
          </div>
        )}

        {/* Formulaire de création de badge */}
        {showCreateBadge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer un nouveau badge</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du badge</label>
                  <input
                    type="text"
                    value={newBadge.name}
                    onChange={(e) => setNewBadge({...newBadge, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ex: Contributeur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newBadge.description}
                    onChange={(e) => setNewBadge({...newBadge, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    rows={3}
                    placeholder="Description du badge..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Icône</label>
                    <input
                      type="text"
                      value={newBadge.icon}
                      onChange={(e) => setNewBadge({...newBadge, icon: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="🏆"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                    <input
                      type="color"
                      value={newBadge.color}
                      onChange={(e) => setNewBadge({...newBadge, color: e.target.value})}
                      className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                    <select
                      value={newBadge.category}
                      onChange={(e) => setNewBadge({...newBadge, category: e.target.value as Badge['category']})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="achievement">🏆 Achievement</option>
                      <option value="role">👤 Rôle</option>
                      <option value="special">⭐ Spécial</option>
                      <option value="education">🎓 Éducation</option>
                      <option value="social">🤝 Social</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rareté</label>
                    <select
                      value={newBadge.rarity}
                      onChange={(e) => setNewBadge({...newBadge, rarity: e.target.value as Badge['rarity']})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="common">Commun</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Épique</option>
                      <option value="legendary">Légendaire</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Conditions (séparées par des virgules)</label>
                  <input
                    type="text"
                    value={newBadge.requirements}
                    onChange={(e) => setNewBadge({...newBadge, requirements: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ex: Terminer 5 cours, Avoir 100 amis"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={createBadge}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
                >
                  ✅ Créer le badge
                </button>
                <button
                  onClick={() => setShowCreateBadge(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  ❌ Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire de création de logo */}
        {showCreateLogo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer un nouveau logo</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du logo</label>
                  <input
                    type="text"
                    value={newLogo.name}
                    onChange={(e) => setNewLogo({...newLogo, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ex: Logo Guinée"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newLogo.description}
                    onChange={(e) => setNewLogo({...newLogo, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    rows={3}
                    placeholder="Description du logo..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL de l'image</label>
                  <input
                    type="url"
                    value={newLogo.imageUrl}
                    onChange={(e) => setNewLogo({...newLogo, imageUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <select
                    value={newLogo.category}
                    onChange={(e) => setNewLogo({...newLogo, category: e.target.value as Logo['category']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="organization">🏢 Organisation</option>
                    <option value="event">🎉 Événement</option>
                    <option value="achievement">🏆 Achievement</option>
                    <option value="custom">🎨 Personnalisé</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={createLogo}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
                >
                  ✅ Créer le logo
                </button>
                <button
                  onClick={() => setShowCreateLogo(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  ❌ Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


