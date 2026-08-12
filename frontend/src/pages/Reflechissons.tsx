import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  religion?: string;
  [key: string]: any;
}

interface ReflectionContent {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'audio' | 'message';
  content: any;
  religion: string;
  category: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  duration?: number;
  views?: number;
  likes?: number;
  tags?: string[];
}

interface ReflectionComment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
  likes: string[];
}

export default function Reflechissons() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [reflections, setReflections] = useState<ReflectionContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<ReflectionContent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterReligion, setFilterReligion] = useState('all');
  const navigate = useNavigate();

  const [newReflection, setNewReflection] = useState({
    title: '',
    description: '',
    type: 'message' as 'video' | 'audio' | 'message',
    content: '',
    category: 'reflexion',
    tags: ['']
  });

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user || !user.numeroH) {
        navigate("/login");
        return;
      }
      
      setUserData(user);
      loadReflections();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadReflections = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/faith/reflections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReflections(data.reflections || []);
      } else {
        setReflections(getDefaultReflections());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des réflexions:', error);
      setReflections(getDefaultReflections());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultReflections = (): ReflectionContent[] => [
    {
      id: '1',
      title: 'La Prière du Matin',
      description: 'Vidéo inspirante sur l\'importance de la prière matinale et ses bienfaits spirituels',
      type: 'video',
      content: { videoUrl: '/videos/priere-matin.mp4', transcript: 'Dans cette vidéo, nous explorons...' },
      religion: 'Islam',
      category: 'priere',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      duration: 15,
      views: 1250,
      likes: 89,
      tags: ['prière', 'matin', 'spiritualité', 'guidance']
    },
    {
      id: '2',
      title: 'Versets de Paix',
      description: 'Audio contenant des versets apaisants pour la méditation et la réflexion',
      type: 'audio',
      content: { audioUrl: '/audio/versets-paix.mp3', transcript: 'Écoutez ces versets sacrés...' },
      religion: 'Islam',
      category: 'verset',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      duration: 8,
      views: 890,
      likes: 67,
      tags: ['versets', 'paix', 'méditation', 'audio']
    },
    {
      id: '3',
      title: 'Réflexion Spirituelle du Jour',
      description: 'Message quotidien de guidance spirituelle pour nourrir votre foi',
      type: 'message',
      content: { text: 'La foi est un voyage intérieur qui nous guide vers la paix et la sagesse. Chaque jour, nous avons l\'opportunité de renforcer notre connexion avec le Divin à travers la prière, la méditation et les actes de bonté. Rappelons-nous que la patience et la gratitude sont les piliers d\'une vie spirituelle épanouie.' },
      religion: 'Islam',
      category: 'reflexion',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      views: 2100,
      likes: 156,
      tags: ['réflexion', 'guidance', 'spiritualité', 'quotidien']
    },
    {
      id: '4',
      title: 'Les Psaumes de David',
      description: 'Audio des plus beaux psaumes pour la méditation chrétienne',
      type: 'audio',
      content: { audioUrl: '/audio/psaumes-david.mp3', transcript: 'Les psaumes de David...' },
      religion: 'Christianisme',
      category: 'psaume',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      duration: 12,
      views: 750,
      likes: 45,
      tags: ['psaumes', 'David', 'méditation', 'chrétien']
    },
    {
      id: '5',
      title: 'Le Sermon de la Montagne',
      description: 'Vidéo expliquant les enseignements du Sermon de la Montagne',
      type: 'video',
      content: { videoUrl: '/videos/sermon-montagne.mp4', transcript: 'Dans ce sermon historique...' },
      religion: 'Christianisme',
      category: 'enseignement',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      duration: 25,
      views: 980,
      likes: 78,
      tags: ['sermon', 'enseignement', 'Jésus', 'montagne']
    },
    {
      id: '6',
      title: 'Méditation sur la Gratitude',
      description: 'Message inspirant sur l\'importance de la gratitude dans notre vie spirituelle',
      type: 'message',
      content: { text: 'La gratitude est une porte vers la paix intérieure. Quand nous reconnaissons les bénédictions dans notre vie, même les plus petites, nous ouvrons notre cœur à plus de joie et de sérénité. Chaque matin, prenons un moment pour remercier pour ce que nous avons, et chaque soir, réfléchissons sur les leçons apprises.' },
      religion: 'Islam',
      category: 'meditation',
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      views: 1650,
      likes: 134,
      tags: ['gratitude', 'méditation', 'paix', 'bénédictions']
    }
  ];

  const createReflection = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/faith/reflections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newReflection,
          religion: userData?.religion || 'Islam',
          createdBy: userData?.numeroH
        })
      });
      
      if (response.ok) {
        alert('Réflexion créée avec succès !');
        setShowCreateForm(false);
        setNewReflection({ title: '', description: '', type: 'message', content: '', category: 'reflexion', tags: [''] });
        loadReflections();
      } else {
        alert('Erreur lors de la création de la réflexion');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la réflexion');
    }
  };

  const filteredReflections = reflections.filter(reflection => {
    const matchesSearch = reflection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reflection.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reflection.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || reflection.type === filterType;
    const matchesCategory = filterCategory === 'all' || reflection.category === filterCategory;
    const matchesReligion = filterReligion === 'all' || reflection.religion === filterReligion;
    
    return matchesSearch && matchesType && matchesCategory && matchesReligion;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'message': return '📝';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'priere': return 'bg-blue-100 text-blue-800';
      case 'verset': return 'bg-green-100 text-green-800';
      case 'reflexion': return 'bg-purple-100 text-purple-800';
      case 'psaume': return 'bg-yellow-100 text-yellow-800';
      case 'enseignement': return 'bg-red-100 text-red-800';
      case 'meditation': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAllCategories = () => {
    const categories = new Set<string>();
    reflections.forEach(reflection => categories.add(reflection.category));
    return Array.from(categories);
  };

  const getAllReligions = () => {
    const religions = new Set<string>();
    reflections.forEach(reflection => religions.add(reflection.religion));
    return Array.from(religions);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des réflexions...</div>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => window.history.back()}
        className="mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        ← Retour
      </button>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-indigo-500 border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-4xl">🤔</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Réfléchissons</h1>
            <p className="text-gray-600">Vidéos, audio et messages spirituels pour nourrir votre foi</p>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">{reflections.length}</div>
            <div className="text-sm text-indigo-800">Réflexions disponibles</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {reflections.filter(r => r.type === 'video').length}
            </div>
            <div className="text-sm text-blue-800">Vidéos</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {reflections.filter(r => r.type === 'audio').length}
            </div>
            <div className="text-sm text-green-800">Audio</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {reflections.filter(r => r.type === 'message').length}
            </div>
            <div className="text-sm text-purple-800">Messages</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center gap-2"
          >
            ➕ Créer une Réflexion
          </button>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rechercher des réflexions</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Titre, description, tags..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="video">🎥 Vidéo</option>
                <option value="audio">🎵 Audio</option>
                <option value="message">📝 Message</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                {getAllCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
              <select
                value={filterReligion}
                onChange={(e) => setFilterReligion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Toutes les religions</option>
                {getAllReligions().map(religion => (
                  <option key={religion} value={religion}>{religion}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterCategory('all');
                  setFilterReligion('all');
                }}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                🔄 Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des réflexions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReflections.map((reflection) => (
            <div key={reflection.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{reflection.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg">{getTypeIcon(reflection.type)}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(reflection.category)}`}>
                      {reflection.category}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {reflection.religion}
                </div>
              </div>
              
              <p className="text-gray-700 mb-4 text-sm">{reflection.description}</p>
              
              {/* Tags */}
              {reflection.tags && reflection.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {reflection.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        #{tag}
                      </span>
                    ))}
                    {reflection.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        +{reflection.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Statistiques */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                {reflection.views && (
                  <div className="flex items-center gap-1">
                    <span>👁️</span>
                    <span>{reflection.views}</span>
                  </div>
                )}
                {reflection.likes && (
                  <div className="flex items-center gap-1">
                    <span>❤️</span>
                    <span>{reflection.likes}</span>
                  </div>
                )}
                {reflection.duration && (
                  <div className="flex items-center gap-1">
                    <span>⏱️</span>
                    <span>{reflection.duration}min</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedReflection(reflection)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm"
                >
                  {reflection.type === 'video' && '▶️ Regarder'}
                  {reflection.type === 'audio' && '🎵 Écouter'}
                  {reflection.type === 'message' && '📖 Lire'}
                </button>
                <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 text-sm">
                  ❤️
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredReflections.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Aucune réflexion trouvée</h3>
            <p>Essayez de modifier vos critères de recherche</p>
          </div>
        )}

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer une réflexion spirituelle</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
                  <input
                    type="text"
                    value={newReflection.title}
                    onChange={(e) => setNewReflection({...newReflection, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Titre de votre réflexion"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    value={newReflection.type}
                    onChange={(e) => setNewReflection({...newReflection, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="message">📝 Message</option>
                    <option value="video">🎥 Vidéo</option>
                    <option value="audio">🎵 Audio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <select
                    value={newReflection.category}
                    onChange={(e) => setNewReflection({...newReflection, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="reflexion">Réflexion</option>
                    <option value="priere">Prière</option>
                    <option value="verset">Verset</option>
                    <option value="meditation">Méditation</option>
                    <option value="enseignement">Enseignement</option>
                    <option value="psaume">Psaume</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={newReflection.description}
                    onChange={(e) => setNewReflection({...newReflection, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                    placeholder="Description de votre réflexion..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenu *</label>
                  <textarea
                    value={newReflection.content}
                    onChange={(e) => setNewReflection({...newReflection, content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={4}
                    placeholder="Votre message spirituel..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags (séparés par des virgules)</label>
                  <input
                    type="text"
                    value={newReflection.tags.join(', ')}
                    onChange={(e) => setNewReflection({...newReflection, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="spiritualité, paix, guidance"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={createReflection}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  ✅ Créer
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  ❌ Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lecteur de contenu */}
        {selectedReflection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{selectedReflection.title}</h3>
                <button
                  onClick={() => setSelectedReflection(null)}
                  className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                >
                  ✕ Fermer
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getTypeIcon(selectedReflection.type)}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(selectedReflection.category)}`}>
                    {selectedReflection.category}
                  </span>
                  <span className="text-sm text-gray-600">{selectedReflection.religion}</span>
                </div>
                <p className="text-gray-700">{selectedReflection.description}</p>
              </div>
              
              {/* Contenu selon le type */}
              {selectedReflection.type === 'video' && (
                <div className="mb-6">
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <div className="text-6xl mb-4">🎥</div>
                    <p className="text-gray-600">Lecteur vidéo</p>
                    <p className="text-sm text-gray-500 mt-2">URL: {selectedReflection.content.videoUrl}</p>
                  </div>
                </div>
              )}
              
              {selectedReflection.type === 'audio' && (
                <div className="mb-6">
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <div className="text-6xl mb-4">🎵</div>
                    <p className="text-gray-600">Lecteur audio</p>
                    <p className="text-sm text-gray-500 mt-2">URL: {selectedReflection.content.audioUrl}</p>
                  </div>
                </div>
              )}
              
              {selectedReflection.type === 'message' && (
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-3">Message spirituel</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedReflection.content.text}</p>
                  </div>
                </div>
              )}
              
              {/* Tags */}
              {selectedReflection.tags && selectedReflection.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReflection.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-4">
                <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200">
                  ❤️ J'aime
                </button>
                <button className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200">
                  📤 Partager
                </button>
                <button className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200">
                  💾 Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
