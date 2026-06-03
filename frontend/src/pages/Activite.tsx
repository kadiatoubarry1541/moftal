import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { config } from '../config/api';
import ProSection from '../components/ProSection';
import { AudioRecorder } from '../components/AudioRecorder';
import { hideIncrement } from '../utils/formatNumeroH';
import { getUserGeoContext } from '../utils/proximity';

const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5002/api';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  genre?: string;
  dateNaissance?: string;
  date_naissance?: string;
  role?: string;
  // Activités professionnelles choisies dans le profil
  activite1?: string;
  activite2?: string;
  activite3?: string;
  [key: string]: any;
}

interface ActivityGroup {
  id: string;
  name: string;
  description: string;
  activity: 'Activité1' | 'Activité2' | 'Activité3';
  members: string[];
  posts: ActivityPost[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  pays?: string;
  region?: string;
}

interface ActivityPost {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  category?: 'information' | 'rencontre' | 'opportunite' | 'outil' | 'reunion';
  likes: string[];
  comments: ActivityComment[];
  createdAt: string;
  numeroH?: string;
  messageType?: string;
}

interface ActivityComment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}


// Liste de pays pour le sélecteur — les plus utilisés d'abord
const PAYS_LISTE = [
  'Guinée', 'Sénégal', 'Mali', 'Côte d\'Ivoire', 'Burkina Faso',
  'Niger', 'Mauritanie', 'Guinée-Bissau', 'Sierra Leone', 'Liberia',
  'Ghana', 'Bénin', 'Togo', 'Cameroun', 'Congo', 'Gabon',
  'France', 'Belgique', 'Canada', 'États-Unis', 'Maroc', 'Algérie',
  'Tunisie', 'Égypte', 'Afrique du Sud', 'Autre'
];

export default function Activite() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'Activité1' | 'Activité2' | 'Activité3'>('Activité1');

  // Pays sélectionné — par défaut = pays de l'utilisateur connecté
  const [selectedPays, setSelectedPays] = useState<string>('');

  const [groups, setGroups] = useState<ActivityGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ActivityGroup | null>(null);
  const [activityMessages, setActivityMessages] = useState<any[]>([]);
  const messagesEndRefActivity = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [newActivityPost, setNewActivityPost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as 'information' | 'rencontre' | 'opportunite' | 'outil' | 'reunion',
    mediaFile: null as File | null
  });

  // Filtre du fil : tout, opportunités ou outils de travail
  const [feedFilter, setFeedFilter] = useState<'all' | 'opportunite' | 'outil'>('all');

  // Transforme un texte en JSX avec les URLs rendues cliquables
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all opacity-90 hover:opacity-100">{part}</a>
        : <span key={i}>{part}</span>
    );
  };

  // Bulle de message avec profil (style WhatsApp)
  const renderMessage = (msg: any, bgColor: string, avatarBg: string) => {
    const isMyMessage = msg.numeroH === userData?.numeroH;
    const displayName = isMyMessage
      ? `${userData?.prenom || ''} ${userData?.nomFamille || ''}`.trim()
      : (msg.authorName || '');
    const displayNumero = isMyMessage ? (userData?.numeroH || '') : (msg.numeroH || '');
    const initials = displayName ? displayName.substring(0, 2).toUpperCase() : '?';

    return (
      <div key={msg.id} className={`mb-4 flex ${isMyMessage ? 'justify-end' : 'justify-start'} items-end`}>
        {!isMyMessage && (
          <div className={`w-9 h-9 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0`}>
            {initials}
          </div>
        )}
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isMyMessage ? bgColor + ' text-white' : 'bg-white text-gray-900'} shadow-sm`}>
          {/* Profil en haut du message */}
          <div className={`mb-1 ${isMyMessage ? 'text-right' : 'text-left'}`}>
            <p className="text-xs font-semibold opacity-90">{displayName}</p>
            <p className="text-xs opacity-60">{hideIncrement(displayNumero)}</p>
          </div>
          {msg.messageType === 'text' && msg.content && (
            <p className="text-sm">{renderTextWithLinks(msg.content)}</p>
          )}
          {msg.messageType === 'image' && msg.mediaUrl && (
            <img src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`} alt="Image" className="max-w-full h-auto rounded-lg mb-1" />
          )}
          {msg.messageType === 'video' && msg.mediaUrl && (
            <video src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`} controls className="max-w-full h-auto rounded-lg mb-1" />
          )}
          {msg.messageType === 'audio' && msg.mediaUrl && (
            <audio src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`} controls className="w-full mb-1" />
          )}
        </div>
        {isMyMessage && (
          <div className={`w-9 h-9 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0`}>
            {initials}
          </div>
        )}
      </div>
    );
  };

  // Formulaire dédié aux outils
  const [toolForm, setToolForm] = useState({ nom: '', description: '' });

  // Garde paiement outils
  const [outilsAcces, setOutilsAcces] = useState<boolean | null>(null);
  const [outilsPayLoading, setOutilsPayLoading] = useState(false);
  const [showOutilsModal, setShowOutilsModal] = useState(false);

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

      // Vérifier accès outils
      const token = parsed.token || localStorage.getItem('token');
      if (token) {
        fetch(`${API_BASE_URL.replace('/api', '')}/api/payment/acces-outils`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => setOutilsAcces(!!d.aAcces)).catch(() => setOutilsAcces(false));
      }

      // Pays de l'utilisateur : pays > lieuResidence1 > ''
      const userPays = user.pays || user.lieuResidence1 || '';
      setSelectedPays(userPays);

      // Choisir l'onglet initial en fonction des activités réellement renseignées
      if (user.activite1) {
        setActiveTab('Activité1');
      } else if (user.activite2) {
        setActiveTab('Activité2');
      } else if (user.activite3) {
        setActiveTab('Activité3');
      } else {
        setActiveTab('Activité1');
      }

      loadData();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const getToken = () => {
    try {
      const s = localStorage.getItem("session_user");
      return s ? JSON.parse(s).token : null;
    } catch { return null; }
  };

  const loadData = async () => {
    // Charger les groupes en arrière-plan sans bloquer l'affichage
    try {
      await loadActivityGroups();
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  // Fonction helper pour obtenir le logo selon la catégorie
  const getCategoryLogo = (category: string) => {
    switch (category) {
      case 'information':
        return 'ℹ️';
      case 'rencontre':
        return '🤝';
      case 'opportunite':
        return '🌟';
      case 'outil':
        return '🛠️';
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
      case 'opportunite':
        return 'Opportunité';
      case 'outil':
        return 'Outil de travail';
      case 'reunion':
        return 'Réunion';
      default:
        return 'Information';
    }
  };

  const loadActivityGroups = useCallback(async () => {
    try {
      const token = getToken();
      const paysParam = selectedPays ? `&pays=${encodeURIComponent(selectedPays)}` : '';
      const response = await fetch(`${API_BASE_URL}/activities/groups?activity=${activeTab}${paysParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let groups = data.groups || [];

        // Si aucun groupe n'existe pour ce pays + activité, en créer un automatiquement
        if (groups.length === 0 || !groups.some((g: ActivityGroup & {pays?: string}) => g.pays === selectedPays)) {
          try {
            const createRes = await fetch(`${API_BASE_URL}/activities/groups`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `${activeTab}${selectedPays ? ` — ${selectedPays}` : ''}`,
                description: `Groupe d'activité pour les membres de ${selectedPays || 'la plateforme'}`,
                activity: activeTab,
                pays: selectedPays,
                createdBy: userData?.numeroH || ''
              })
            });
            if (createRes.ok) {
              const createData = await createRes.json();
              if (createData.group) groups = [createData.group];
            }
          } catch { /* ignore, on utilise les groupes par défaut */ }
        }

        setGroups(groups);

        // Auto-sélectionner le premier groupe pour permettre la publication directe
        if (groups.length > 0 && (!selectedGroup || selectedGroup.activity !== activeTab)) {
          setSelectedGroup(groups[0]);
        } else if (groups.length > 0 && selectedGroup && selectedGroup.activity === activeTab) {
          // Mettre à jour le groupe sélectionné si les données ont changé
          const updatedGroup = groups.find((g: ActivityGroup) => g.id === selectedGroup.id);
          if (updatedGroup) {
            setSelectedGroup(updatedGroup);
          }
        }
      } else {
        const defaultGroups = getDefaultActivityGroups();
        setGroups(defaultGroups);
        // Auto-sélectionner le premier groupe par défaut pour permettre la publication
        if (defaultGroups.length > 0) {
          if (!selectedGroup || selectedGroup.activity !== activeTab) {
            setSelectedGroup(defaultGroups[0]);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      const defaultGroups = getDefaultActivityGroups();
      setGroups(defaultGroups);
      if (defaultGroups.length > 0) {
        if (!selectedGroup || selectedGroup.activity !== activeTab) {
          setSelectedGroup(defaultGroups[0]);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedPays]);

  const getDefaultActivityGroups = (): ActivityGroup[] => [
    {
      id: '1',
      name: 'Sport Conakry',
      description: 'Rencontres sportives et activités physiques à Conakry',
      activity: 'Activité1',
      members: ['USER001', 'USER002', 'USER003'],
      posts: [
        {
          id: '1',
          author: 'USER001',
          authorName: 'Alpha Diallo',
          content: 'Match de football demain à 16h au stade du 28 septembre',
          type: 'text',
          likes: ['USER002', 'USER003'],
          comments: [],
          createdAt: '2024-01-20T10:00:00Z'
        }
      ],
      isActive: true,
      createdBy: 'admin',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      name: 'Artistes Guinéens',
      description: 'Communauté d\'artistes et créateurs guinéens',
      activity: 'Activité2',
      members: ['USER004', 'USER005', 'USER006'],
      posts: [
        {
          id: '2',
          author: 'USER004',
          authorName: 'Fatou Camara',
          content: 'Exposition d\'art prévue pour le mois prochain',
          type: 'text',
          likes: ['USER005'],
          comments: [],
          createdAt: '2024-01-19T14:30:00Z'
        }
      ],
      isActive: true,
      createdBy: 'admin',
      createdAt: '2024-01-10T09:00:00Z'
    },
    {
      id: '3',
      name: 'Entrepreneurs Guinée',
      description: 'Réseau d\'entrepreneurs et de business guinéens',
      activity: 'Activité3',
      members: ['USER007', 'USER008', 'USER009'],
      posts: [
        {
          id: '3',
          author: 'USER007',
          authorName: 'Mamadou Bah',
          content: 'Nouvelle opportunité d\'investissement disponible',
          type: 'text',
          likes: ['USER008', 'USER009'],
          comments: [],
          createdAt: '2024-01-18T16:45:00Z'
        }
      ],
      isActive: true,
      createdBy: 'admin',
      createdAt: '2024-01-05T11:20:00Z'
    }
  ];

  const joinActivityGroup = async (groupId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/activities/join-group`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupId,
          userId: userData?.numeroH
        })
      });

      if (response.ok) {
        loadActivityGroups();
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const loadActivityMessages = async () => {
    if (!selectedGroup) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/activities/groups/${selectedGroup.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivityMessages((data.messages || []).reverse());
        // Scroller vers le bas après le chargement
        setTimeout(() => {
          messagesEndRefActivity.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const sendActivityMessage = async () => {
    if (!selectedGroup) {
      alert('Veuillez sélectionner un groupe');
      return;
    }
    
    if (newActivityPost.type === 'text' && !newActivityPost.content.trim()) {
      alert('Veuillez entrer un message ou un lien');
      return;
    }

    if (newActivityPost.type !== 'text' && !newActivityPost.mediaFile) {
      alert('Veuillez sélectionner un fichier (image, vidéo ou audio)');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('content', newActivityPost.content);
      formData.append('messageType', newActivityPost.type);
      formData.append('category', newActivityPost.category);
      
      if (newActivityPost.mediaFile) {
        formData.append('media', newActivityPost.mediaFile);
      }
      
      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/activities/groups/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.message) {
          setNewActivityPost({ content: '', type: 'text', category: 'information', mediaFile: null });
          await loadActivityMessages();
          setTimeout(() => {
            messagesEndRefActivity.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
      } else {
          alert('Erreur lors de l\'envoi du message');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Erreur lors de l\'envoi du message' }));
        alert(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('fetch')) {
        alert(`❌ Erreur de connexion: Impossible de se connecter au serveur.\n\nVérifiez que:\n1. Le backend est démarré sur le port 5002\n2. L'URL ${API_BASE_URL} est correcte\n3. Votre connexion internet fonctionne\n\nPour démarrer le backend:\ncd backend\nnpm run dev`);
      } else {
        alert(`Erreur: ${error.message || 'Impossible d\'envoyer le message. Vérifiez votre connexion.'}`);
      }
    }
  };

  const payerOutils = async () => {
    setOutilsPayLoading(true);
    try {
      const session = localStorage.getItem("session_user");
      const token = session ? (JSON.parse(session).token || localStorage.getItem('token')) : localStorage.getItem('token');
      const r = await fetch(`${API_BASE_URL.replace('/api', '')}/api/payment/initiate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 20000, currency: 'GNF', purpose: 'publication_outil_pass', description: 'Pass publication outils Activité — 20 000 GNF/an' }),
      });
      const d = await r.json();
      if (d.success && d.paymentUrl) { window.location.href = d.paymentUrl; }
      else alert(d.message || 'Erreur. Réessayez.');
    } catch { alert('Erreur de connexion.'); }
    finally { setOutilsPayLoading(false); }
  };

  const sendTool = async () => {
    if (!selectedGroup) { alert('Veuillez sélectionner un groupe'); return; }
    if (!toolForm.nom.trim()) { alert('Veuillez entrer le nom ou le lien de l\'outil'); return; }
    // Vérifier le paiement
    if (outilsAcces === false) { setShowOutilsModal(true); return; }

    try {
      const formData = new FormData();
      const content = toolForm.description.trim()
        ? `${toolForm.nom.trim()} — ${toolForm.description.trim()}`
        : toolForm.nom.trim();
      formData.append('content', content);
      formData.append('messageType', 'text');
      formData.append('category', 'outil');

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/activities/groups/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Affichage immédiat (optimiste) du message publié
          const newMsg = {
            id: data.message?.id || `local-${Date.now()}`,
            content,
            category: 'outil',
            messageType: 'text',
            numeroH: userData?.numeroH || '',
            authorName: `${userData?.prenom || ''} ${userData?.nomFamille || ''}`.trim(),
            createdAt: new Date().toISOString()
          };
          setActivityMessages(prev => [...prev, newMsg]);
          setToolForm({ nom: '', description: '' });
          setTimeout(() => messagesEndRefActivity.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          // Synchronisation serveur en arrière-plan
          loadActivityMessages().catch(() => {});
        } else {
          alert('Erreur lors de la publication');
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.message || 'Erreur lors de la publication');
      }
    } catch {
      alert('Erreur de connexion au serveur');
    }
  };


  useEffect(() => {
    if (selectedGroup) {
      setActivityMessages([]);
      loadActivityMessages();
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible' && !document.hidden) {
          loadActivityMessages();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup?.id]);

  useEffect(() => {
    setFeedFilter('all');
    setSelectedGroup(null);
    loadActivityGroups();
  }, [activeTab, selectedPays, loadActivityGroups]);

  const filteredGroups = groups.filter(group => group.activity === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎯 Activités</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/moi')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bandeau pays + sélecteur */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Sélecteur de pays */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-700 font-medium">🌍 Pays :</span>
            <select
              value={selectedPays}
              onChange={(e) => {
                setSelectedPays(e.target.value);
                setSelectedGroup(null);
              }}
              className="text-sm border border-amber-300 rounded-lg px-2 py-1 bg-white text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">— Tous les pays —</option>
              {PAYS_LISTE.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {/* Activité + spécialité */}
          {userData?.activite1 && (
            <span className="text-sm text-amber-700 flex items-center gap-1">
              🎯 <strong>
                {activeTab === 'Activité1' ? userData.activite1 :
                 activeTab === 'Activité2' ? userData.activite2 :
                 userData.activite3}
              </strong>
              {(userData as any).specialite && ` · ${(userData as any).specialite}`}
            </span>
          )}
          <span className="text-amber-500 text-xs ml-auto">
            {selectedPays
              ? `Vous voyez les groupes de ${selectedPays}`
              : 'Vous voyez tous les groupes de la plateforme'
            }
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {(() => {
              if (!userData) return null;

              // Ne montrer que les onglets correspondant aux activités présentes dans le profil
              const tabs = [
                { id: 'Activité1' as const, defaultLabel: 'Activité 1', icon: '🏃‍♂️', field: 'activite1' },
                { id: 'Activité2' as const, defaultLabel: 'Activité 2', icon: '👷‍♂️👷‍♀️', field: 'activite2' },
                { id: 'Activité3' as const, defaultLabel: 'Activité 3', icon: '💼', field: 'activite3' }
              ].filter(tab => !!userData[tab.field]);

              // Si aucune activité n'est définie, on n'affiche pas de tabs et on laisse un message plus bas
              if (tabs.length === 0) return null;

              return tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {/* Nom de la page = nom de l'activité dans le profil */}
                  {userData[tab.field] || tab.defaultLabel}
                </button>
              ));
            })()}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Liste des groupes - Affichée seulement si aucun groupe n'est sélectionné */}
            {!selectedGroup && (
              <div className="space-y-2 mb-6">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      onClick={async () => {
                        if (!group.members.includes(userData?.numeroH || '')) {
                          await joinActivityGroup(group.id);
                        }
                        setSelectedGroup(group);
                      }}
                      className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
              </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">
                      {activeTab === 'Activité1' && '🏃‍♂️'}
                      {activeTab === 'Activité2' && '👷‍♂️👷‍♀️'}
                      {activeTab === 'Activité3' && '💼'}
            </div>
                    <p className="text-gray-500 mb-4">Aucun groupe pour cette activité</p>
                    <p className="text-sm text-gray-400">Les organisations sont créées automatiquement lors de l'enregistrement des utilisateurs. Les personnes ayant la même activité se retrouvent dans le même groupe.</p>
              </div>
                )}
            </div>
            )}

            {/* Interface de publication - Affichée directement sans header */}
            {selectedGroup && (
              <div className="mt-4 space-y-4">
                {/* Filtre du fil — Messagerie : Information, Réunion, Rencontre */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFeedFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      feedFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💬 Messages
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedFilter('opportunite')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      feedFilter === 'opportunite' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    🌟 Opportunités
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedFilter('outil')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      feedFilter === 'outil' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    🛠️ Outils de travail
                  </button>
                </div>

              <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
                {/* Zone de messages */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-4" style={{ minHeight: '300px', maxHeight: 'calc(70vh - 200px)' }}>
                  {(() => {
                    const filtered = feedFilter === 'all'
                      ? activityMessages.filter((m: any) => !['opportunite', 'outil'].includes(m.category || 'information'))
                      : activityMessages.filter((m: any) => (m.category || 'information') === feedFilter);

                    // Cas spécial : onglet Moftal Info → afficher Moftal Info + Assistant IA en haut
                    if (feedFilter === 'outil') {
                      return (
                        <>
                          <div className="mb-4 flex justify-center">
                            <Link
                              to="/info-wallou"
                              className="flex items-center gap-4 bg-gradient-to-r from-blue-700 to-slate-800 rounded-xl p-4 shadow-md border border-blue-500 hover:brightness-110 transition-all group max-w-xl w-full"
                            >
                              <span className="text-4xl group-hover:scale-110 transition-transform">📋</span>
                              <div className="flex-1">
                                <h3 className="font-bold text-white text-base">Moftal Info</h3>
                                <p className="text-sm text-blue-200">
                                  Créez des carreaux d'information avec photo, vidéo et audio
                                </p>
                                <p className="text-xs text-blue-300 mt-1">
                                  Mariage · Baptême · Réunion · Santé · Décès
                                </p>
                              </div>
                              <span className="text-white text-xl opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                            </Link>
                          </div>

                          <div className="mb-4 flex justify-center">
                            <Link
                              to="/professeur-ia"
                              className="flex items-center gap-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-4 shadow-md border border-cyan-400 hover:brightness-110 transition-all group max-w-xl w-full"
                            >
                              <span className="text-4xl group-hover:scale-110 transition-transform">🤖</span>
                              <div className="flex-1">
                                <h3 className="font-bold text-white text-base">Assistant IA Français & Mathématiques</h3>
                                <p className="text-sm text-cyan-100">
                                  Posez vos questions en français et en math, l'IA vous aide pas à pas.
                                </p>
                              </div>
                              <span className="text-white text-xl opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                            </Link>
                          </div>

                          {filtered.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                              <p>Aucun outil partagé. Proposez une ressource !</p>
                            </div>
                          ) : (
                            filtered.map((msg: any) => renderMessage(msg, 'bg-blue-600', 'bg-blue-600'))
                          )}
                        </>
                      );
                    }

                    // Cas "Opportunités" : bannière dédiée + messages
                    if (feedFilter === 'opportunite') {
                      return (
                        <>
                          <div className="mb-4 flex justify-center">
                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 max-w-xl w-full">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">🌟</span>
                                <div>
                                  <h3 className="font-bold text-amber-800 text-base mb-1">Opportunités professionnelles</h3>
                                  <p className="text-sm text-amber-700">
                                    Partagez des offres d'emploi, collaborations, projets ou appels d'offres avec votre réseau.
                                  </p>
                                  <p className="text-xs text-amber-600 mt-1">Publiez en sélectionnant la catégorie <strong>🌟 Opportunité</strong> ci-dessous.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          {filtered.length === 0 ? (
                            <div className="text-center text-gray-500 py-6">
                              <p className="text-lg mb-1">Aucune opportunité partagée pour le moment.</p>
                              <p className="text-sm">Soyez le premier à partager une opportunité dans ce groupe !</p>
                            </div>
                          ) : (
                            filtered.map((msg: any) => renderMessage(msg, 'bg-amber-500', 'bg-amber-500'))
                          )}
                        </>
                      );
                    }

                    // Cas normal : Messages (all)
                    if (filtered.length === 0) {
                      return (
                        <div className="text-center text-gray-500 py-8">
                          <p>Aucun message pour le moment.</p>
                          <p className="text-sm mt-1">Soyez le premier à écrire dans ce groupe !</p>
                        </div>
                      );
                    }

                    return filtered.map((msg: any) => renderMessage(msg, 'bg-green-500', 'bg-indigo-600'));
                  })()}
                  <div ref={messagesEndRefActivity} />
                      </div>

                {/* Zone de saisie */}
                <div className="bg-gray-200 px-4 py-2 border-t">
                  {/* Formulaire dédié pour publier un outil (visible seulement dans l'onglet Outils) */}
                  {feedFilter === 'outil' && (
                    <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-blue-800">🛠️ Proposer un outil de travail</p>
                      <input
                        type="text"
                        value={toolForm.nom}
                        onChange={(e) => setToolForm({ ...toolForm, nom: e.target.value })}
                        placeholder="Nom ou lien de l'outil (ex: Google Docs, ChatGPT...)"
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <input
                        type="text"
                        value={toolForm.description}
                        onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                        placeholder="Description (facultatif)"
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={sendTool}
                        disabled={!toolForm.nom.trim()}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ✅ Publier cet outil
                      </button>
                    </div>
                  )}
                  {/* Formulaire message normal — masqué dans l'onglet Outils */}
                  {feedFilter !== 'outil' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={newActivityPost.category}
                        onChange={(e) => setNewActivityPost({...newActivityPost, category: e.target.value as any})}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      >
                        <option value="information">ℹ️ Information</option>
                        <option value="reunion">👥 Réunion</option>
                        <option value="rencontre">🤝 Rencontre</option>
                        <option value="opportunite">🌟 Opportunité</option>
                      </select>
                    </div>
                    {/* Zone de saisie */}
                    <div className="flex gap-2">
                      <div className="flex gap-2 flex-1">
                        <select
                          value={newActivityPost.type}
                          onChange={(e) => {
                            setNewActivityPost({...newActivityPost, type: e.target.value as any, mediaFile: null});
                          }}
                          className="px-2 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        >
                          <option value="text">📝</option>
                          <option value="image">🖼️</option>
                          <option value="video">🎥</option>
                          <option value="audio">🎵</option>
                        </select>
                        {newActivityPost.type === 'text' ? (
                          <input
                            type="text"
                            value={newActivityPost.content}
                            onChange={(e) => setNewActivityPost({...newActivityPost, content: e.target.value})}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendActivityMessage();
                              }
                            }}
                            placeholder="Tapez un message..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : newActivityPost.type === 'audio' ? (
                          <div className="flex gap-2 flex-1 items-center">
                            {newActivityPost.mediaFile ? (
                              <div className="flex items-center gap-2 flex-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                                <span className="text-sm text-green-700 flex-1">🎙️ Audio prêt</span>
                                <button type="button" onClick={() => setNewActivityPost({...newActivityPost, mediaFile: null})} className="text-red-500 hover:text-red-700 text-xs font-medium">✕</button>
                              </div>
                            ) : (
                              <AudioRecorder compact maxDuration={10} onAudioRecorded={(blob) => {
                                const file = new File([blob], 'vocal.webm', { type: blob.type });
                                setNewActivityPost({...newActivityPost, mediaFile: file});
                              }} />
                            )}
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept={newActivityPost.type === 'image' ? 'image/*' : 'video/*'}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                let detectedType = newActivityPost.type;
                                if (file.type.startsWith('image/')) {
                                  detectedType = 'image';
                                } else if (file.type.startsWith('video/')) {
                                  detectedType = 'video';
                                } else if (file.type.startsWith('audio/')) {
                                  detectedType = 'audio';
                                }
                                setNewActivityPost({...newActivityPost, type: detectedType, mediaFile: file});
                              } else {
                                setNewActivityPost({...newActivityPost, mediaFile: null});
                              }
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                          />
                        )}
                      </div>
                      <button
                        onClick={sendActivityMessage}
                        disabled={newActivityPost.type === 'text' ? !newActivityPost.content.trim() : !newActivityPost.mediaFile}
                        className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        ▶
                      </button>
                      </div>
                  </div>
                  )}
                </div>
              </div>
            </div>
            )}

        {/* Section publiants validés */}
        <ProSection
          type="enterprise"
          title="Membres publiants validés"
          icon="✅"
          description="Vous souhaitez partager des opportunités ou des outils de travail dans ce groupe ? Inscrivez-vous pour obtenir les droits de publication. L'administrateur valide les inscriptions afin de garantir la qualité des contenus partagés."
        />

      </div>
    </div>
  </div>

  {/* ── Modal paiement pass outils ── */}
  {showOutilsModal && (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
        <div className="text-4xl mb-3">🛠️</div>
        <h3 className="font-black text-lg text-gray-900 mb-1">Publication d'outil</h3>
        <p className="text-sm text-gray-500 mb-4">
          Pour publier un outil dans Activité, un abonnement annuel est requis.
        </p>
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 mb-4">
          <p className="font-black text-2xl text-blue-900">20 000 GNF</p>
          <p className="text-xs text-blue-500">par an · publications illimitées</p>
        </div>
        <button onClick={payerOutils} disabled={outilsPayLoading}
          className="w-full py-3 rounded-xl font-black text-white text-sm mb-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#2563eb,#1e3a5f)' }}>
          {outilsPayLoading ? '⏳ Redirection...' : '💳 Payer 20 000 GNF → Publier'}
        </button>
        <button onClick={() => setShowOutilsModal(false)} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Annuler</button>
        <p className="text-xs text-gray-300 mt-2">Paiement sécurisé via FedaPay</p>
      </div>
    </div>
  )}
  );
}