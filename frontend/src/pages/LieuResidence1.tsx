import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioRecorder } from '../components/AudioRecorder';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  lieu1?: string;
  [key: string]: any;
}

interface Residence1Group {
  id: string;
  name: string;
  description: string;
  location: string;
  members: UserData[];
  posts: Residence1Post[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  neighborhood?: string;
  district?: string;
}

interface Residence1Post {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'event' | 'service';
  mediaUrl?: string;
  likes: string[];
  comments: Residence1Comment[];
  createdAt: string;
  eventDetails?: {
    title: string;
    date: string;
    time: string;
    location: string;
    maxParticipants: number;
    participants: string[];
    description: string;
  };
  serviceDetails?: {
    title: string;
    type: string;
    description: string;
    price?: string;
    contact: string;
    availability: string;
  };
}

interface Residence1Comment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function LieuResidence1() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [groups, setGroups] = useState<Residence1Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Residence1Group | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const navigate = useNavigate();

  const [newPost, setNewPost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio' | 'event' | 'service',
    mediaFile: null as File | null,
    eventDetails: {
      title: '',
      date: '',
      time: '',
      location: '',
      maxParticipants: 20,
      description: ''
    },
    serviceDetails: {
      title: '',
      type: '',
      description: '',
      price: '',
      contact: '',
      availability: ''
    }
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
      loadGroups();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/residences/lieu1/groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        // Fallback avec des groupes par défaut
        setGroups(getDefaultGroups());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      setGroups(getDefaultGroups());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultGroups = (): Residence1Group[] => [
    {
      id: '1',
      name: 'Résidents de Conakry Centre',
      description: 'Communauté des résidents du centre de Conakry pour échanger et s\'entraider',
      location: 'Conakry Centre',
      members: userData ? [userData] : [],
      posts: [],
      isActive: true,
      createdBy: userData?.numeroH || 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      neighborhood: 'Kaloum',
      district: 'Centre'
    },
    {
      id: '2',
      name: 'Voisins de Dixinn',
      description: 'Organisation de voisinage pour les habitants de Dixinn',
      location: 'Dixinn',
      members: [],
      posts: [],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      neighborhood: 'Dixinn',
      district: 'Est'
    }
  ];

  const joinGroup = async (groupId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/residences/lieu1/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint le Organisation !');
        loadGroups();
      } else {
        alert('Erreur lors de l\'adhésion au Organisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'adhésion au Organisation');
    }
  };

  const createPost = async () => {
    if (!selectedGroup || !newPost.content.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append('content', newPost.content);
      formData.append('type', newPost.type);
      formData.append('author', userData?.numeroH || '');
      formData.append('authorName', `${userData?.prenom} ${userData?.nomFamille}`);
      
      if (newPost.type === 'event') {
        formData.append('eventDetails', JSON.stringify(newPost.eventDetails));
      } else if (newPost.type === 'service') {
        formData.append('serviceDetails', JSON.stringify(newPost.serviceDetails));
      }
      
      if (newPost.mediaFile) {
        formData.append('media', newPost.mediaFile);
      }
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/residences/lieu1/groups/${selectedGroup.id}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        alert('Publication créée avec succès !');
        setNewPost({ 
          content: '', 
          type: 'text', 
          mediaFile: null,
          eventDetails: {
            title: '', date: '', time: '', location: '', maxParticipants: 20, description: ''
          },
          serviceDetails: {
            title: '', type: '', description: '', price: '', contact: '', availability: ''
          }
        });
        loadGroups();
      } else {
        alert('Erreur lors de la création de la publication');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la publication');
    }
  };

  const joinEvent = async (postId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/residences/lieu1/posts/${postId}/join-event`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint l\'événement !');
        loadGroups();
      } else {
        alert('Erreur lors de l\'inscription à l\'événement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'inscription à l\'événement');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des rencontres Lieu de résidence 1...</div>
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

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-4xl">🏠</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lieu de Résidence 1</h1>
            <p className="text-gray-600">Rencontrez vos voisins et habitants du même quartier</p>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{groups.length}</div>
            <div className="text-sm text-blue-800">Groupes actifs</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {groups.reduce((total, g) => total + g.members.length, 0)}
            </div>
            <div className="text-sm text-green-800">Résidents</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {groups.reduce((total, g) => total + g.posts.length, 0)}
            </div>
            <div className="text-sm text-purple-800">Publications</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {groups.reduce((total, g) => total + g.posts.filter(p => p.type === 'event' || p.type === 'service').length, 0)}
            </div>
            <div className="text-sm text-orange-800">Événements/Services</div>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowEventForm(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
          >
            📅 Organiser un Événement
          </button>
          <button
            onClick={() => setShowServiceForm(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2"
          >
            🛠️ Proposer un Service
          </button>
        </div>

        {/* Formulaire d'événement */}
        {showEventForm && (
          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Organiser un événement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'événement</label>
                <input
                  type="text"
                  value={newPost.eventDetails.title}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    eventDetails: {...newPost.eventDetails, title: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Fête de quartier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newPost.eventDetails.date}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    eventDetails: {...newPost.eventDetails, date: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                <input
                  type="time"
                  value={newPost.eventDetails.time}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    eventDetails: {...newPost.eventDetails, time: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lieu</label>
                <input
                  type="text"
                  value={newPost.eventDetails.location}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    eventDetails: {...newPost.eventDetails, location: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Place du marché"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre max de participants</label>
                <input
                  type="number"
                  value={newPost.eventDetails.maxParticipants}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    eventDetails: {...newPost.eventDetails, maxParticipants: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="2"
                  max="100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newPost.eventDetails.description}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    eventDetails: {...newPost.eventDetails, description: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Description de l'événement..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setNewPost({...newPost, content: newPost.eventDetails.title, type: 'event'});
                  createPost();
                  setShowEventForm(false);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                📅 Créer l'Événement
              </button>
              <button
                onClick={() => setShowEventForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        )}

        {/* Formulaire de service */}
        {showServiceForm && (
          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Proposer un service</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre du service</label>
                <input
                  type="text"
                  value={newPost.serviceDetails.title}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    serviceDetails: {...newPost.serviceDetails, title: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Cours de cuisine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de service</label>
                <select
                  value={newPost.serviceDetails.type}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    serviceDetails: {...newPost.serviceDetails, type: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="education">Éducation</option>
                  <option value="health">Santé</option>
                  <option value="transport">Transport</option>
                  <option value="repair">Réparation</option>
                  <option value="cleaning">Nettoyage</option>
                  <option value="gardening">Jardinage</option>
                  <option value="cooking">Cuisine</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prix (optionnel)</label>
                <input
                  type="text"
                  value={newPost.serviceDetails.price}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    serviceDetails: {...newPost.serviceDetails, price: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: 50,000 FG"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                <input
                  type="text"
                  value={newPost.serviceDetails.contact}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    serviceDetails: {...newPost.serviceDetails, contact: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: +224 123 456 789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilité</label>
                <input
                  type="text"
                  value={newPost.serviceDetails.availability}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    serviceDetails: {...newPost.serviceDetails, availability: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Week-ends"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newPost.serviceDetails.description}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    serviceDetails: {...newPost.serviceDetails, description: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Description du service..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setNewPost({...newPost, content: newPost.serviceDetails.title, type: 'service'});
                  createPost();
                  setShowServiceForm(false);
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                🛠️ Créer le Service
              </button>
              <button
                onClick={() => setShowServiceForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des groupes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-600">{group.location}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {group.members.length} membres
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{group.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                {group.neighborhood && (
                  <div className="flex items-center gap-1">
                    <span>🏘️</span>
                    <span>{group.neighborhood}</span>
                  </div>
                )}
                {group.district && (
                  <div className="flex items-center gap-1">
                    <span>🏛️</span>
                    <span>{group.district}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                >
                  💬 Discussions
                </button>
                {!group.members.find(m => m.numeroH === userData?.numeroH) && (
                  <button
                    onClick={() => joinGroup(group.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
                  >
                    ➕ Rejoindre
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Interface de discussion */}
        {selectedGroup && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                💬 Discussions - {selectedGroup.name}
              </h3>
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              >
                ✕ Fermer
              </button>
            </div>
            
            {/* Formulaire de publication */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Publier quelque chose</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de contenu</label>
                  <select
                    value={newPost.type}
                    onChange={(e) => setNewPost({...newPost, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="text">📝 Texte</option>
                    <option value="image">🖼️ Image</option>
                    <option value="video">🎥 Vidéo</option>
                    <option value="audio">🎵 Audio</option>
                    <option value="event">📅 Événement</option>
                    <option value="service">🛠️ Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Partagez vos idées..."
                  />
                </div>
                {newPost.type === 'audio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message vocal</label>
                    {newPost.mediaFile ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm text-green-700 flex-1">🎙️ Audio prêt</span>
                        <button type="button" onClick={() => setNewPost({...newPost, mediaFile: null})} className="text-red-500 hover:text-red-700 text-xs font-medium">✕ Annuler</button>
                      </div>
                    ) : (
                      <AudioRecorder maxDuration={10} onAudioRecorded={(blob) => {
                        const file = new File([blob], 'vocal.webm', { type: blob.type });
                        setNewPost({...newPost, mediaFile: file});
                      }} />
                    )}
                  </div>
                )}
                {newPost.type !== 'text' && newPost.type !== 'event' && newPost.type !== 'service' && newPost.type !== 'audio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fichier média</label>
                    <input
                      type="file"
                      accept={newPost.type === 'image' ? 'image/*' : 'video/*'}
                      onChange={(e) => setNewPost({...newPost, mediaFile: e.target.files?.[0] || null})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                <button
                  onClick={createPost}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  📤 Publier
                </button>
              </div>
            </div>
            
            {/* Liste des publications */}
            <div className="space-y-4">
              {selectedGroup.posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-medium text-gray-900">{post.authorName}</h5>
                      <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-red-500">
                        ❤️ {post.likes.length}
                      </button>
                      <button className="p-1 text-gray-400 hover:text-blue-500">
                        💬 {post.comments.length}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{post.content}</p>
                  
                  {/* Détails d'événement */}
                  {post.type === 'event' && post.eventDetails && (
                    <div className="bg-green-50 rounded-lg p-4 mb-3">
                      <h6 className="font-medium text-green-900 mb-2">📅 Détails de l'événement</h6>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Titre:</strong> {post.eventDetails.title}</div>
                        <div><strong>Date:</strong> {post.eventDetails.date}</div>
                        <div><strong>Heure:</strong> {post.eventDetails.time}</div>
                        <div><strong>Lieu:</strong> {post.eventDetails.location}</div>
                        <div><strong>Participants:</strong> {post.eventDetails.participants.length}/{post.eventDetails.maxParticipants}</div>
                      </div>
                      <p className="text-sm mt-2">{post.eventDetails.description}</p>
                      {!post.eventDetails.participants.includes(userData?.numeroH || '') && 
                       post.eventDetails.participants.length < post.eventDetails.maxParticipants && (
                        <button
                          onClick={() => joinEvent(post.id)}
                          className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          📅 Rejoindre l'événement
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Détails de service */}
                  {post.type === 'service' && post.serviceDetails && (
                    <div className="bg-purple-50 rounded-lg p-4 mb-3">
                      <h6 className="font-medium text-purple-900 mb-2">🛠️ Détails du service</h6>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Titre:</strong> {post.serviceDetails.title}</div>
                        <div><strong>Type:</strong> {post.serviceDetails.type}</div>
                        {post.serviceDetails.price && (
                          <div><strong>Prix:</strong> {post.serviceDetails.price}</div>
                        )}
                        <div><strong>Contact:</strong> {post.serviceDetails.contact}</div>
                        <div><strong>Disponibilité:</strong> {post.serviceDetails.availability}</div>
                      </div>
                      <p className="text-sm mt-2">{post.serviceDetails.description}</p>
                    </div>
                  )}
                  
                  {post.mediaUrl && (
                    <div className="mb-3">
                      {post.type === 'image' && (
                        <img src={post.mediaUrl} alt="Média" className="max-w-full h-auto rounded-lg" />
                      )}
                      {post.type === 'video' && (
                        <video src={post.mediaUrl} controls className="max-w-full h-auto rounded-lg" />
                      )}
                      {post.type === 'audio' && (
                        <audio src={post.mediaUrl} controls className="w-full" />
                      )}
                    </div>
                  )}
                  
                  {/* Commentaires */}
                  {post.comments.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <h6 className="font-medium text-gray-900 mb-2">Commentaires</h6>
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h6 className="font-medium text-gray-900 text-sm">{comment.authorName}</h6>
                              <p className="text-gray-700 text-sm">{comment.content}</p>
                            </div>
                            <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {selectedGroup.posts.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>Aucune publication pour le moment.</p>
                  <p>Soyez le premier à partager quelque chose !</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
