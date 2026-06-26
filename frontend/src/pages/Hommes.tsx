import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../utils/auth';
import { QuickMediaCapture } from '../components/QuickMediaCapture';
import { AudioRecorder } from '../components/AudioRecorder';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  genre?: string;
  age?: number;
  [key: string]: any;
}

interface OrganizationGroup {
  id: string;
  name: string;
  description: string;
  type: 'hommes';
  members: UserData[];
  posts: OrganizationPost[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  category?: string;
  location?: string;
}

interface OrganizationPost {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  likes: string[];
  comments: OrganizationComment[];
  createdAt: string;
  tags?: string[];
  location?: string;
}

interface OrganizationComment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function Hommes() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [groups, setGroups] = useState<OrganizationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<OrganizationGroup | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showMediaCapture, setShowMediaCapture] = useState(false);
  const navigate = useNavigate();

  const [newPost, setNewPost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    mediaFile: null as File | null,
    tags: [''],
    location: ''
  });

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxParticipants: 50,
    type: 'social'
  });

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal',
    category: 'general'
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
      
      // Une femme ne peut pas accéder à la page Hommes (sauf admin)
      if (user.genre === 'FEMME' && !isAdmin(user)) {
        navigate('/communaute', { replace: true });
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
      const response = await fetch('/api/organizations/hommes/groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        setGroups(getDefaultGroups());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      setGroups(getDefaultGroups());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultGroups = (): OrganizationGroup[] => [
    {
      id: '1',
      name: 'Hommes de Conakry',
      description: 'Communauté des hommes de Conakry pour échanger et s\'entraider',
      type: 'hommes',
      members: userData ? [userData] : [],
      posts: [],
      isActive: true,
      createdBy: userData?.numeroH || 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      category: 'social',
      location: 'Conakry'
    },
    {
      id: '2',
      name: 'Hommes Entrepreneurs',
      description: 'Organisation d\'hommes entrepreneurs pour partager expériences et opportunités',
      type: 'hommes',
      members: [],
      posts: [],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      category: 'business',
      location: 'Guinée'
    },
    {
      id: '3',
      name: 'Hommes Sportifs',
      description: 'Communauté des hommes passionnés de sport et fitness',
      type: 'hommes',
      members: [],
      posts: [],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      category: 'sport',
      location: 'Guinée'
    },
    {
      id: '4',
      name: 'Hommes Professionnels',
      description: 'Réseau professionnel pour hommes dans différents secteurs',
      type: 'hommes',
      members: [],
      posts: [],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      category: 'professionnel',
      location: 'Guinée'
    }
  ];

  const joinGroup = async (groupId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/organizations/hommes/groups/${groupId}/join`, {
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

  const createPost = async (mediaFile?: File) => {
    const fileToUse = mediaFile || newPost.mediaFile;
    if (!selectedGroup || (!newPost.content.trim() && !fileToUse)) return;
    
    try {
      const formData = new FormData();
      formData.append('content', newPost.content || '');
      formData.append('type', newPost.type);
      formData.append('author', userData?.numeroH || '');
      formData.append('authorName', `${userData?.prenom} ${userData?.nomFamille}`);
      formData.append('location', newPost.location);
      formData.append('tags', JSON.stringify(newPost.tags.filter(tag => tag.trim())));
      
      if (fileToUse) {
        formData.append('media', fileToUse);
      }
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/organizations/hommes/groups/${selectedGroup.id}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        alert('Publication créée avec succès !');
        setNewPost({ content: '', type: 'text', mediaFile: null, tags: [''], location: '' });
        setShowMediaCapture(false);
        loadGroups();
      } else {
        alert('Erreur lors de la création de la publication');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la publication');
    }
  };

  const handleMediaCapture = (file: File, type: 'photo' | 'video' | 'audio') => {
    const postType = type === 'photo' ? 'image' : type;
    setNewPost({ ...newPost, type: postType as any, mediaFile: file });
    createPost(file);
  };

  const createEvent = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/organizations/hommes/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newEvent,
          type: 'hommes',
          createdBy: userData?.numeroH
        })
      });
      
      if (response.ok) {
        alert('Événement créé avec succès !');
        setShowEventForm(false);
        setNewEvent({ title: '', description: '', date: '', time: '', location: '', maxParticipants: 50, type: 'social' });
        loadGroups();
      } else {
        alert('Erreur lors de la création de l\'événement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de l\'événement');
    }
  };

  const createAnnouncement = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/organizations/hommes/announcements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newAnnouncement,
          type: 'hommes',
          createdBy: userData?.numeroH
        })
      });
      
      if (response.ok) {
        alert('Annonce créée avec succès !');
        setShowAnnouncementForm(false);
        setNewAnnouncement({ title: '', content: '', priority: 'normal', category: 'general' });
        loadGroups();
      } else {
        alert('Erreur lors de la création de l\'annonce');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de l\'annonce');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des groupes Hommes...</div>
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
          <div className="text-4xl">👨</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hommes</h1>
            <p className="text-gray-600">Communauté des hommes pour échanger par écrit, photos, vidéos et audio</p>
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
            <div className="text-sm text-green-800">Membres</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {groups.reduce((total, g) => total + g.posts.length, 0)}
            </div>
            <div className="text-sm text-purple-800">Publications</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">4</div>
            <div className="text-sm text-orange-800">Catégories</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <button
            onClick={() => setShowEventForm(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
          >
            📅 Organiser un Événement
          </button>
          <button
            onClick={() => setShowAnnouncementForm(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2"
          >
            📢 Publier une Annonce
          </button>
        </div>

        {/* Informations sur la communauté */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">👨 À propos de la communauté Hommes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Catégories disponibles :</h4>
              <ul className="space-y-1">
                <li>• Social et rencontres</li>
                <li>• Business et entrepreneuriat</li>
                <li>• Sport et fitness</li>
                <li>• Professionnel et carrière</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Types de contenu :</h4>
              <ul className="space-y-1">
                <li>• 📝 Messages textuels</li>
                <li>• 🖼️ Photos et images</li>
                <li>• 🎥 Vidéos</li>
                <li>• 🎵 Audio et podcasts</li>
              </ul>
            </div>
          </div>
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
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Rencontre entrepreneurs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type d'événement</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="social">Social</option>
                  <option value="business">Business</option>
                  <option value="sport">Sport</option>
                  <option value="professional">Professionnel</option>
                  <option value="cultural">Culturel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lieu</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Centre de conférence"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre max de participants</label>
                <input
                  type="number"
                  value={newEvent.maxParticipants}
                  onChange={(e) => setNewEvent({...newEvent, maxParticipants: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="2"
                  max="1000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Description de l'événement..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={createEvent}
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

        {/* Formulaire d'annonce */}
        {showAnnouncementForm && (
          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Publier une annonce</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'annonce</label>
                <input
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Réunion mensuelle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={newAnnouncement.category}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="general">Général</option>
                  <option value="urgent">Urgent</option>
                  <option value="business">Business</option>
                  <option value="social">Social</option>
                  <option value="sport">Sport</option>
                  <option value="professional">Professionnel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <select
                  value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">Faible</option>
                  <option value="normal">Normale</option>
                  <option value="high">Élevée</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
                <textarea
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={4}
                  placeholder="Contenu de l'annonce..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={createAnnouncement}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                📢 Publier l'Annonce
              </button>
              <button
                onClick={() => setShowAnnouncementForm(false)}
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
                  <p className="text-sm text-gray-600">{group.category}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {group.members.length} membres
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{group.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                {group.location && (
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{group.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>📊</span>
                  <span>{group.posts.length} posts</span>
                </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Localisation (optionnel)</label>
                  <input
                    type="text"
                    value={newPost.location}
                    onChange={(e) => setNewPost({...newPost, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Conakry, Guinée..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags (séparés par des virgules)</label>
                  <input
                    type="text"
                    value={newPost.tags.join(', ')}
                    onChange={(e) => setNewPost({...newPost, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="business, entrepreneur, sport..."
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
                {newPost.type !== 'text' && newPost.type !== 'audio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fichier média</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMediaCapture(true)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        📷 Capturer et publier
                      </button>
                      <input
                        type="file"
                        accept={newPost.type === 'image' ? 'image/*' : 'video/*'}
                        capture={newPost.type === 'image' || newPost.type === 'video' ? 'environment' : undefined}
                        onChange={(e) => setNewPost({...newPost, mediaFile: e.target.files?.[0] || null})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {newPost.mediaFile && (
                      <p className="mt-2 text-sm text-green-600">✓ Fichier sélectionné : {newPost.mediaFile.name}</p>
                    )}
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
                  
                  {post.location && (
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        📍 {post.location}
                      </span>
                    </div>
                  )}
                  
                  {post.tags && post.tags.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
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

      {showMediaCapture && (
        <QuickMediaCapture
          onCapture={handleMediaCapture}
          onClose={() => setShowMediaCapture(false)}
          allowedTypes={newPost.type === 'text' ? ['photo', 'video', 'audio'] : [newPost.type === 'image' ? 'photo' : newPost.type]}
          autoPublish={true}
        />
      )}
    </div>
  );
}
