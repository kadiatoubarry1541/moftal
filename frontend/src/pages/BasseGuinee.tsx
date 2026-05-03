import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioRecorder } from '../components/AudioRecorder';
import { hideIncrement } from '../utils/formatNumeroH';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  regionOrigine?: string;
  pays?: string;
  [key: string]: any;
}

interface RegionGroup {
  id: string;
  name: string;
  description: string;
  region: string;
  members: UserData[];
  posts: RegionPost[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  city?: string;
  district?: string;
}

interface RegionPost {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  likes: string[];
  comments: RegionComment[];
  createdAt: string;
  location?: string;
  tags?: string[];
}

interface RegionComment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function BasseGuinee() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [groups, setGroups] = useState<RegionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<RegionGroup | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [permissionNumeroH, setPermissionNumeroH] = useState('');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [showMembersList, setShowMembersList] = useState(false);
  const navigate = useNavigate();

  const [newMessage, setNewMessage] = useState({
    content: '',
    messageType: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as 'information' | 'rencontre' | 'deces' | 'reunion',
    mediaFile: null as File | null
  });

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxParticipants: 50,
    type: 'cultural'
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
      
      setUserData(user);
      loadGroups();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
      checkPermission();
      if (isAdmin || isCreator) {
        loadPermissions();
      }
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/regions/groups?region=Basse-Guinée', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      setGroups(getDefaultGroups());
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedGroup) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/regions/groups/${selectedGroup.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setMessages((data.messages || []).reverse());
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const checkPermission = async () => {
    if (!selectedGroup) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/regions/groups/${selectedGroup.id}/check-permission`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setHasPermission(data.hasPermission);
      setIsAdmin(data.isAdmin);
      setIsCreator(data.isCreator);
    } catch (error) {
      console.error('Erreur lors de la vérification de la permission:', error);
    }
  };

  const loadPermissions = async () => {
    if (!selectedGroup) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/regions/groups/${selectedGroup.id}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedGroup || !hasPermission) {
      alert('Vous n\'avez pas la permission d\'envoyer des messages dans ce groupe');
      return;
    }
    
    if (newMessage.messageType === 'text' && !newMessage.content.trim()) {
      alert('Veuillez entrer un message');
      return;
    }
    
    if (newMessage.messageType !== 'text' && !newMessage.mediaFile) {
      alert('Veuillez sélectionner un fichier média');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('content', newMessage.content);
      formData.append('messageType', newMessage.messageType);
      formData.append('category', newMessage.category);
      
      if (newMessage.mediaFile) {
        formData.append('media', newMessage.mediaFile);
      }
      
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/regions/groups/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setNewMessage({ content: '', messageType: 'text', category: 'information', mediaFile: null });
        loadMessages();
      } else {
        const error = await response.json().catch(() => ({ message: 'Erreur lors de l\'envoi du message' }));
        alert(error.message || 'Erreur lors de l\'envoi du message');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert(error.message || 'Erreur lors de l\'envoi du message');
    }
  };

  // Fonction helper pour obtenir le logo selon la catégorie
  const getCategoryLogo = (category: string) => {
    switch (category) {
      case 'information':
        return 'ℹ️';
      case 'rencontre':
        return '🤝';
      case 'deces':
        return '🕯️';
      case 'reunion':
        return '👥';
      default:
        return 'ℹ️';
    }
  };

  // Fonction helper pour obtenir le nom de la catégorie
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'information':
        return 'Information';
      case 'rencontre':
        return 'Rencontre';
      case 'deces':
        return 'Décès';
      case 'reunion':
        return 'Réunion';
      default:
        return 'Information';
    }
  };

  const grantPermission = async () => {
    if (!selectedGroup || !permissionNumeroH.trim()) {
      alert('Veuillez entrer un NumeroH');
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/regions/groups/${selectedGroup.id}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetNumeroH: permissionNumeroH })
      });
      if (!response.ok) throw new Error('Erreur');
      
      alert('Permission accordée avec succès');
      setPermissionNumeroH('');
      setShowPermissionForm(false);
      loadPermissions();
    } catch (error: any) {
      console.error('Erreur lors de l\'attribution de la permission:', error);
      alert(error.message || 'Erreur lors de l\'attribution de la permission');
    }
  };

  const revokePermission = async (numeroH: string) => {
    if (!selectedGroup) return;
    
    if (!confirm('Voulez-vous révoquer la permission de cet utilisateur ?')) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/regions/groups/${selectedGroup.id}/permissions/${numeroH}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Erreur');
      
      alert('Permission révoquée avec succès');
      loadPermissions();
    } catch (error: any) {
      console.error('Erreur lors de la révocation de la permission:', error);
      alert(error.message || 'Erreur lors de la révocation de la permission');
    }
  };

  const getDefaultGroups = (): RegionGroup[] => [
    {
      id: '1',
      name: 'Conakry Connect',
      description: 'Communauté des habitants de Conakry pour échanger et s\'entraider',
      region: 'Basse-Guinée',
      members: userData ? [userData] : [],
      posts: [],
      isActive: true,
      createdBy: userData?.numeroH || 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      city: 'Conakry',
      district: 'Kaloum'
    },
    {
      id: '2',
      name: 'Kindia United',
      description: 'Organisation de la région de Kindia pour partager nos traditions et cultures',
      region: 'Basse-Guinée',
      members: [],
      posts: [],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      city: 'Kindia',
      district: 'Kindia'
    },
    {
      id: '3',
      name: 'Boké Solidarité',
      description: 'Communauté de Boké pour le développement et l\'entraide',
      region: 'Basse-Guinée',
      members: [],
      posts: [],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      city: 'Boké',
      district: 'Boké'
    }
  ];




  const createEvent = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/regions/basse-guinee/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newEvent,
          region: 'Basse-Guinée',
          createdBy: userData?.numeroH
        })
      });
      
      alert('Événement créé avec succès !');
      setShowEventForm(false);
      setNewEvent({ title: '', description: '', date: '', time: '', location: '', maxParticipants: 50, type: 'cultural' });
      loadGroups();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors de la création de l\'événement');
    }
  };

  const createAnnouncement = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/regions/basse-guinee/announcements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newAnnouncement,
          region: 'Basse-Guinée',
          createdBy: userData?.numeroH
        })
      });
      
      alert('Annonce créée avec succès !');
      setShowAnnouncementForm(false);
      setNewAnnouncement({ title: '', content: '', priority: 'normal', category: 'general' });
      loadGroups();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors de la création de l\'annonce');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement de la Basse-Guinée...</div>
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
          <div className="text-4xl">🌊</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Basse-Guinée</h1>
            <p className="text-gray-600">Rencontrez les habitants de votre région pour échanger par écrit, vidéo et audio</p>
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
            <div className="text-2xl font-bold text-orange-600 mb-1">3</div>
            <div className="text-sm text-orange-800">Villes principales</div>
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

        {/* Informations sur la région */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">🌊 À propos de la Basse-Guinée</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Villes principales :</h4>
              <ul className="space-y-1">
                <li>• Conakry (capitale)</li>
                <li>• Kindia</li>
                <li>• Boké</li>
                <li>• Coyah</li>
                <li>• Dubréka</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Caractéristiques :</h4>
              <ul className="space-y-1">
                <li>• Région côtière</li>
                <li>• Climat tropical</li>
                <li>• Activités portuaires</li>
                <li>• Agriculture diversifiée</li>
                <li>• Centre économique</li>
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
                  placeholder="Ex: Festival culturel de Conakry"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type d'événement</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="cultural">Culturel</option>
                  <option value="sport">Sportif</option>
                  <option value="business">Business</option>
                  <option value="social">Social</option>
                  <option value="educational">Éducatif</option>
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
                  placeholder="Ex: Palais du Peuple, Conakry"
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
                  placeholder="Ex: Réunion communautaire"
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
                  <option value="cultural">Culturel</option>
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

        {/* Liste des groupes (style WhatsApp - simple avec icône cliquable) */}
        {!selectedGroup && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              💬 Système de Messagerie - Groupes disponibles
            </h2>
            <p className="text-gray-600 mb-4">Cliquez sur un groupe pour accéder à la messagerie et échanger avec les membres</p>
            <div className="space-y-2">
              {groups.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">Aucun groupe disponible pour le moment.</p>
                  <p className="text-sm text-gray-500">Créez un nouveau groupe pour commencer à échanger !</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200 border border-gray-200 cursor-pointer flex items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                        👥
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-gray-500 truncate mt-1">{group.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {group.members.length} membre{group.members.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
              
        {/* Interface WhatsApp style */}
        {selectedGroup && (
          <div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            {/* Header WhatsApp style */}
            <div className="bg-green-600 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="text-white hover:bg-green-700 rounded-full p-2 transition-colors"
                >
                  ←
                </button>
                <div>
                  <h3 className="font-semibold">{selectedGroup.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  <button
                  onClick={() => setShowMembersList(!showMembersList)}
                  className="text-white hover:bg-green-700 rounded-full p-2 transition-colors"
                  title="Voir les membres"
                  >
                  👥
                  </button>
                {(isAdmin || isCreator) && (
              <button
                    onClick={() => setShowPermissionForm(!showPermissionForm)}
                    className="text-white hover:bg-green-700 rounded-full p-2 transition-colors"
                    title="Gérer les permissions"
              >
                    ⚙️
              </button>
                )}
              </div>
            </div>
            
            {/* Liste des membres (cachée par défaut) */}
            {showMembersList && (
              <div className="bg-gray-100 border-b p-4 max-h-48 overflow-y-auto">
                <h4 className="font-semibold text-gray-900 mb-3">Membres du groupe ({selectedGroup.members.length})</h4>
                <div className="space-y-2">
                  {selectedGroup.members.map((member) => (
                    <div key={member.numeroH} className="flex items-center gap-2 bg-white p-2 rounded">
                      <span className="text-sm font-medium text-gray-900">
                        {member.prenom} {member.nomFamille}
                      </span>
                      <span className="text-xs text-gray-500">({hideIncrement(member.numeroH)})</span>
                </div>
                  ))}
                </div>
                </div>
            )}
            
            {/* Zone de permissions (admin/créateur) */}
            {(isAdmin || isCreator) && showPermissionForm && (
              <div className="bg-gray-100 border-b p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Gérer les permissions</h4>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={permissionNumeroH}
                    onChange={(e) => setPermissionNumeroH(e.target.value)}
                    placeholder="NumeroH de l'utilisateur"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                <button
                    onClick={grantPermission}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    Accorder
                </button>
              </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Utilisateurs autorisés:</p>
                  {permissions.map((perm) => (
                    <div key={perm.id} className="flex justify-between items-center bg-white p-2 rounded">
                      <span className="text-sm">{perm.userName} ({perm.numeroH})</span>
                      <button
                        onClick={() => revokePermission(perm.numeroH)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Révoquer
                      </button>
                    </div>
                  ))}
                  </div>
                    </div>
                  )}
                  
            {/* Zone de messages (WhatsApp style) */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e5e7eb\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Aucun message pour le moment.</p>
                  <p className="text-sm">Soyez le premier à envoyer un message !</p>
                      </div>
              ) : (
                messages.map((msg) => {
                  const isMyMessage = msg.numeroH === userData?.numeroH;
                  return (
                    <div
                      key={msg.id}
                      className={`mb-4 flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isMyMessage
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-900'
                        }`}
                      >
                        {!isMyMessage && (
                          <p className="text-xs font-semibold mb-1 opacity-75">{msg.authorName}</p>
                        )}
                        {/* Logo et nom de la catégorie */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{getCategoryLogo(msg.category || 'information')}</span>
                          <span className={`text-xs font-medium ${isMyMessage ? 'text-green-100' : 'text-gray-600'}`}>
                            {getCategoryName(msg.category || 'information')}
                          </span>
                      </div>
                        {msg.messageType === 'text' && msg.content && (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        {msg.messageType === 'image' && msg.mediaUrl && (
                          <img
                            src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `http://localhost:5002${msg.mediaUrl.startsWith('/') ? msg.mediaUrl : '/' + msg.mediaUrl}`}
                            alt="Image"
                            className="max-w-full h-auto rounded-lg mb-1"
                          />
                      )}
                        {msg.messageType === 'video' && msg.mediaUrl && (
                          <video
                            src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `http://localhost:5002${msg.mediaUrl.startsWith('/') ? msg.mediaUrl : '/' + msg.mediaUrl}`}
                            controls
                            className="max-w-full h-auto rounded-lg mb-1"
                          />
                      )}
                        {msg.messageType === 'audio' && msg.mediaUrl && (
                          <audio
                            src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `http://localhost:5002${msg.mediaUrl.startsWith('/') ? msg.mediaUrl : '/' + msg.mediaUrl}`}
                            controls
                            className="w-full mb-1"
                          />
                  )}
                        <p className={`text-xs mt-1 ${isMyMessage ? 'text-green-100' : 'text-gray-500'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                          </div>
                  );
                })
              )}
                        </div>

            {/* Zone de saisie (WhatsApp style) */}
            <div className="bg-gray-200 px-4 py-3 border-t">
              {!hasPermission && (
                <div className="mb-2 text-center text-sm text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ Vous n'avez pas la permission d'envoyer des messages dans ce groupe
                            </div>
              )}
              {hasPermission && (
                <div className="space-y-2">
                  {/* Sélecteur de catégorie */}
                  <div className="flex gap-2">
                    <select
                      value={newMessage.category}
                      onChange={(e) => setNewMessage({...newMessage, category: e.target.value as any})}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    >
                      <option value="information">ℹ️ Information</option>
                      <option value="rencontre">🤝 Rencontre</option>
                      <option value="deces">🕯️ Décès</option>
                      <option value="reunion">👥 Réunion</option>
                    </select>
                          </div>
                  {/* Zone de saisie */}
                  <div className="flex gap-2">
                    <div className="flex gap-2 flex-1">
                      <select
                        value={newMessage.messageType}
                        onChange={(e) => setNewMessage({...newMessage, messageType: e.target.value as any, mediaFile: null})}
                        className="px-2 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      >
                        <option value="text">📝</option>
                        <option value="image">🖼️</option>
                        <option value="video">🎥</option>
                        <option value="audio">🎵</option>
                      </select>
                      {newMessage.messageType === 'text' ? (
                        <input
                          type="text"
                          value={newMessage.content}
                          onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Tapez un message..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      ) : newMessage.messageType === 'audio' ? (
                        newMessage.mediaFile ? (
                          <div className="flex items-center gap-2 flex-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                            <span className="text-sm text-green-700 flex-1">🎙️ Audio prêt</span>
                            <button type="button" onClick={() => setNewMessage({...newMessage, mediaFile: null})} className="text-red-500 hover:text-red-700 text-xs font-medium">✕</button>
                          </div>
                        ) : (
                          <AudioRecorder compact maxDuration={10} onAudioRecorded={(blob) => {
                            const file = new File([blob], 'vocal.webm', { type: blob.type });
                            setNewMessage({...newMessage, mediaFile: file});
                          }} />
                        )
                      ) : (
                        <input
                          type="file"
                          accept={newMessage.messageType === 'image' ? 'image/*' : 'video/*'}
                          onChange={(e) => setNewMessage({...newMessage, mediaFile: e.target.files?.[0] || null})}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                  )}
                </div>
                    <button
                      onClick={sendMessage}
                      disabled={newMessage.messageType === 'text' ? !newMessage.content.trim() : !newMessage.mediaFile}
                      className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
