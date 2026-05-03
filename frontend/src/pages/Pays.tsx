import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import { AudioRecorder } from '../components/AudioRecorder';

const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5002/api';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface RegionGroup {
  id: string;
  name: string;
  description: string;
  region: 'Communauté';
  members: string[];
  posts: RegionPost[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
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
}

interface RegionComment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface ResidenceGroup {
  id: string;
  name: string;
  description: string;
  location: string;
  type: 'lieu1' | 'lieu2';
  members: string[];
  posts: ResidencePost[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface ResidencePost {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  likes: string[];
  comments: ResidenceComment[];
  createdAt: string;
}

interface ResidenceComment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function Pays() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'residence' | 'Communauté'>('residence');
  const [residenceActiveTab, setResidenceActiveTab] = useState<'lieu1' | 'lieu2'>('lieu1');
  const [regionGroups, setRegionGroups] = useState<RegionGroup[]>([]);
  const [residenceGroups, setResidenceGroups] = useState<ResidenceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<RegionGroup | null>(null);
  const [selectedResidenceGroup, setSelectedResidenceGroup] = useState<ResidenceGroup | null>(null);
  const [residenceMessages, setResidenceMessages] = useState<any[]>([]);
  const [regionMessages, setRegionMessages] = useState<any[]>([]);
  const messagesEndRefResidence = useRef<HTMLDivElement>(null);
  const messagesEndRefRegion = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();


  const [newResidencePost, setNewResidencePost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as 'information' | 'rencontre' | 'deces' | 'reunion',
    mediaFile: null as File | null
  });

  const [newRegionPost, setNewRegionPost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as 'information' | 'rencontre' | 'deces' | 'reunion',
    mediaFile: null as File | null
  });

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
      loadData();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRegionGroups(),
        loadResidenceGroups()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegionGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/regions/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let groups: RegionGroup[] = [];
      if (response.ok) {
        try {
        const data = await response.json();
          groups = data.groups || [];
        } catch (jsonError) {
          groups = getDefaultRegionGroups();
        }
      } else {
        groups = getDefaultRegionGroups();
      }
      
      // Filtrer les groupes par région active
      const filtered = groups.filter(g => g.region === activeTab);
      
      // Si aucun groupe, utiliser les groupes par défaut
      if (filtered.length === 0) {
        const defaultGroups = getDefaultRegionGroups();
        const defaultFiltered = defaultGroups.filter(g => g.region === activeTab);
        setRegionGroups(defaultFiltered);
        
        // Auto-sélectionner le premier groupe par défaut
        if (defaultFiltered.length > 0 && (!selectedGroup || selectedGroup.region !== activeTab)) {
          setSelectedGroup(defaultFiltered[0]);
        }
        return;
      }
      
      setRegionGroups(filtered);
      
      // Auto-sélectionner le premier groupe pour permettre la publication directe
      const currentSelectedRegion = selectedGroup?.region;
      
      // Si pas de groupe sélectionné OU le groupe sélectionné ne correspond pas à la région actuelle
      if (filtered.length > 0 && (!selectedGroup || currentSelectedRegion !== activeTab)) {
        const firstGroup = filtered[0];
        // Rejoindre automatiquement le groupe si pas déjà membre
        if (!firstGroup.members.includes(userData?.numeroH || '')) {
          try {
            await handleJoinGroup(firstGroup.id);
            // Recharger les groupes après avoir rejoint
            const updatedResponse = await fetch(`${API_BASE_URL}/regions/groups`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            if (updatedResponse.ok) {
              const updatedData = await updatedResponse.json();
              const updatedGroups = updatedData.groups || groups;
              const updatedFiltered = updatedGroups.filter((g: RegionGroup) => g.region === activeTab);
              setRegionGroups(updatedFiltered);
              const updatedGroup = updatedFiltered.find((g: RegionGroup) => g.id === firstGroup.id) || firstGroup;
              setSelectedGroup(updatedGroup);
            } else {
              setSelectedGroup(firstGroup);
      }
    } catch (error) {
            // Si erreur, sélectionner quand même le groupe
            setSelectedGroup(firstGroup);
          }
        } else {
          setSelectedGroup(firstGroup);
        }
      } else if (filtered.length > 0 && selectedGroup && currentSelectedRegion === activeTab) {
        // Mettre à jour le groupe sélectionné si les données ont changé
        const updatedGroup = filtered.find((g: RegionGroup) => g.id === selectedGroup.id);
        if (updatedGroup) {
          setSelectedGroup(updatedGroup);
        }
      }
    } catch (error) {
      // Erreur silencieuse - utiliser les groupes par défaut
      const defaultGroups = getDefaultRegionGroups();
      const defaultFiltered = defaultGroups.filter(g => g.region === activeTab);
      setRegionGroups(defaultFiltered);
      // Auto-sélectionner le premier groupe par défaut pour permettre la publication
      if (defaultFiltered.length > 0) {
        // Toujours sélectionner le groupe par défaut pour permettre la publication immédiate
        if (!selectedGroup || selectedGroup.region !== activeTab) {
          setSelectedGroup(defaultFiltered[0]);
        }
      }
    }
  };

  const getDefaultRegionGroups = (): RegionGroup[] => [
    {
      id: '5',
      name: 'Communauté Unie',
      description: 'Communauté nationale de tous les membres',
      region: 'Communauté',
      members: [],
      posts: [
        {
          id: '5',
          author: '',
          authorName: 'Ousmane Barry',
          content: 'Fiers d\'être ensemble ! Notre communauté est magnifique',
          type: 'text',
          likes: [],
          comments: [],
          createdAt: '2024-01-16T09:45:00Z'
        }
      ],
      isActive: true,
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z'
    }
  ];


  const handleJoinGroup = async (groupId: string) => {
    const group = regionGroups.find(g => g.id === groupId);
    if (group) {
      // Rejoindre automatiquement le groupe si pas déjà membre
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/regions/join-group`, {
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
        loadRegionGroups();
      }
    } catch (error) {
      // Erreur silencieuse
    }
      setSelectedGroup(group);
    }
  };

  const loadRegionMessages = async () => {
    if (!selectedGroup) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/regions/groups/${selectedGroup.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRegionMessages((data.messages || []).reverse());
        // Scroller vers le bas après le chargement
        setTimeout(() => {
          messagesEndRefRegion.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const sendRegionMessage = async () => {
    if (!selectedGroup) {
      alert('Veuillez sélectionner un groupe');
      return;
    }
    
    if (newRegionPost.type === 'text' && !newRegionPost.content.trim()) {
      alert('Veuillez entrer un message');
      return;
    }
    
    if (newRegionPost.type !== 'text' && !newRegionPost.mediaFile) {
      alert('Veuillez sélectionner un fichier média');
      return;
    }
    
    console.log('Envoi du message:', {
      type: newRegionPost.type,
      hasFile: !!newRegionPost.mediaFile,
      fileName: newRegionPost.mediaFile?.name,
      category: newRegionPost.category
    });
    
    try {
      const formData = new FormData();
      formData.append('content', newRegionPost.content);
      formData.append('messageType', newRegionPost.type);
      formData.append('category', newRegionPost.category);
      
      if (newRegionPost.mediaFile) {
        formData.append('media', newRegionPost.mediaFile);
      }
      
      const token = localStorage.getItem("token");
      
      console.log('URL de l\'API:', `${API_BASE_URL}/regions/groups/${selectedGroup.id}/messages`);
      console.log('Type de message:', newRegionPost.type);
      console.log('Fichier média:', newRegionPost.mediaFile?.name || 'Aucun');
      
      const response = await fetch(`${API_BASE_URL}/regions/groups/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.message) {
          setNewRegionPost({ content: '', type: 'text', category: 'information', mediaFile: null });
          // Recharger tous les messages pour que tout le monde voie le nouveau message
          await loadRegionMessages();
          // Scroller vers le bas après l'envoi
          setTimeout(() => {
            messagesEndRefRegion.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          alert('Erreur lors de l\'envoi du message');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Erreur lors de l\'envoi du message' }));
        console.error('Erreur serveur:', errorData);
        alert(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      console.error('Type d\'erreur:', error.name);
      console.error('Message d\'erreur:', error.message);
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('fetch')) {
        alert(`❌ Erreur de connexion: Impossible de se connecter au serveur.\n\nVérifiez que:\n1. Le backend est démarré sur le port 5002\n2. L'URL ${API_BASE_URL} est correcte\n3. Votre connexion internet fonctionne\n\nPour démarrer le backend:\ncd backend\nnpm run dev`);
      } else {
        alert(`Erreur: ${error.message || 'Impossible d\'envoyer le message. Vérifiez votre connexion.'}`);
      }
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      loadRegionMessages();
      // Optimisation : Augmenter l'intervalle à 10 secondes et vérifier la visibilité
      const interval = setInterval(() => {
        // Ne recharger que si la page est visible et active
        if (document.visibilityState === 'visible' && !document.hidden) {
          loadRegionMessages();
        }
      }, 10000); // Augmenté de 5s à 10s pour réduire la charge
      return () => clearInterval(interval);
    }
  }, [selectedGroup]);

  const loadResidenceGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/residences/groups?type=${residenceActiveTab}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let groups: ResidenceGroup[] = [];
      if (response.ok) {
        try {
        const data = await response.json();
          groups = data.groups || [];
        } catch (jsonError) {
          groups = getDefaultResidenceGroups();
        }
      } else {
        groups = getDefaultResidenceGroups();
      }
      
      // Si aucun groupe, utiliser les groupes par défaut
      if (groups.length === 0) {
        groups = getDefaultResidenceGroups();
      }
      
      setResidenceGroups(groups);
      
      // Auto-sélectionner le premier groupe pour permettre la publication directe
      // Vérifier si le groupe sélectionné actuel correspond encore au type d'onglet
      const currentSelectedType = selectedResidenceGroup?.type;
      
      // Si pas de groupe sélectionné OU le groupe sélectionné ne correspond pas à l'onglet actuel
      if (groups.length > 0 && (!selectedResidenceGroup || currentSelectedType !== residenceActiveTab)) {
        const firstGroup = groups[0];
        // Rejoindre automatiquement le groupe si pas déjà membre
        if (!firstGroup.members.includes(userData?.numeroH || '')) {
          try {
            await joinResidenceGroup(firstGroup.id);
            // Recharger les groupes après avoir rejoint
            const updatedResponse = await fetch(`${API_BASE_URL}/residences/groups?type=${residenceActiveTab}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            if (updatedResponse.ok) {
              const updatedData = await updatedResponse.json();
              const updatedGroups = updatedData.groups || groups;
              setResidenceGroups(updatedGroups);
              const updatedGroup = updatedGroups.find((g: ResidenceGroup) => g.id === firstGroup.id) || firstGroup;
              setSelectedResidenceGroup(updatedGroup);
            } else {
              setSelectedResidenceGroup(firstGroup);
            }
          } catch (error) {
            // Si erreur, sélectionner quand même le groupe
            setSelectedResidenceGroup(firstGroup);
          }
        } else {
          setSelectedResidenceGroup(firstGroup);
        }
      } else if (groups.length > 0 && selectedResidenceGroup && currentSelectedType === residenceActiveTab) {
        // Mettre à jour le groupe sélectionné si les données ont changé
        const updatedGroup = groups.find((g: ResidenceGroup) => g.id === selectedResidenceGroup.id);
        if (updatedGroup) {
          setSelectedResidenceGroup(updatedGroup);
        }
      }
    } catch (error) {
      // Erreur silencieuse - utiliser les groupes par défaut
      const defaultGroups = getDefaultResidenceGroups();
      setResidenceGroups(defaultGroups);
      // Auto-sélectionner le premier groupe par défaut pour permettre la publication
      if (defaultGroups.length > 0) {
        // Toujours sélectionner le groupe par défaut pour permettre la publication immédiate
        if (!selectedResidenceGroup || selectedResidenceGroup.type !== residenceActiveTab) {
          setSelectedResidenceGroup(defaultGroups[0]);
        }
      }
    }
  };

  useEffect(() => {
    if (!userData) return; // Attendre que userData soit chargé
    
    if (activeTab === 'residence') {
      loadResidenceGroups();
    } else {
      // Recharger les groupes régionaux quand on change d'onglet régional
      loadRegionGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenceActiveTab, activeTab, userData]);

  const getCurrentLocation = useCallback(() => {
    switch (residenceActiveTab) {
      case 'lieu1': return userData?.lieu1 || 'Cercle 1';
      case 'lieu2': return userData?.lieu2 || 'Cercle 2';
      default: return 'Cercle 1';
    }
  }, [residenceActiveTab, userData]);

  const getDefaultResidenceGroups = useCallback((): ResidenceGroup[] => {
    const location = getCurrentLocation();
    return [
    {
      id: '1',
        name: `Organisation ${location}`,
        description: `Rencontres entre personnes résidant au même endroit : ${location}`,
        location: location,
      type: residenceActiveTab,
      members: [userData?.numeroH || ''],
      posts: [],
      isActive: true,
      createdBy: userData?.numeroH || 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString()
    }
  ];
  }, [getCurrentLocation, residenceActiveTab, userData]);


  const joinResidenceGroup = async (groupId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/residences/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        loadResidenceGroups();
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const loadResidenceMessages = async () => {
    if (!selectedResidenceGroup) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/residences/groups/${selectedResidenceGroup.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResidenceMessages((data.messages || []).reverse());
        // Scroller vers le bas après le chargement
        setTimeout(() => {
          messagesEndRefResidence.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const sendResidenceMessage = async () => {
    if (!selectedResidenceGroup) {
      alert('Veuillez sélectionner un groupe');
      return;
    }
    
    if (newResidencePost.type === 'text' && !newResidencePost.content.trim()) {
      alert('Veuillez entrer un message');
      return;
    }
    
    if (newResidencePost.type !== 'text' && !newResidencePost.mediaFile) {
      alert('Veuillez sélectionner un fichier média');
      return;
    }
    
    console.log('Envoi du message:', {
      type: newResidencePost.type,
      hasFile: !!newResidencePost.mediaFile,
      fileName: newResidencePost.mediaFile?.name,
      category: newResidencePost.category
    });
    
    try {
      const formData = new FormData();
      formData.append('content', newResidencePost.content);
      formData.append('messageType', newResidencePost.type);
      formData.append('category', newResidencePost.category);
      
      if (newResidencePost.mediaFile) {
        formData.append('media', newResidencePost.mediaFile);
      }
      
      const token = localStorage.getItem("token");
      
      console.log('URL de l\'API:', `${API_BASE_URL}/residences/groups/${selectedResidenceGroup.id}/messages`);
      console.log('Type de message:', newResidencePost.type);
      console.log('Fichier média:', newResidencePost.mediaFile?.name || 'Aucun');
      
      const response = await fetch(`${API_BASE_URL}/residences/groups/${selectedResidenceGroup.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.message) {
          setNewResidencePost({ content: '', type: 'text', category: 'information', mediaFile: null });
          // Recharger tous les messages pour que tout le monde voie le nouveau message
          await loadResidenceMessages();
          // Scroller vers le bas après l'envoi
          setTimeout(() => {
            messagesEndRefResidence.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          alert('Erreur lors de l\'envoi du message');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Erreur lors de l\'envoi du message' }));
        console.error('Erreur serveur:', errorData);
        alert(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      console.error('Type d\'erreur:', error.name);
      console.error('Message d\'erreur:', error.message);
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('fetch')) {
        alert(`❌ Erreur de connexion: Impossible de se connecter au serveur.\n\nVérifiez que:\n1. Le backend est démarré sur le port 5002\n2. L'URL ${API_BASE_URL} est correcte\n3. Votre connexion internet fonctionne\n\nPour démarrer le backend:\ncd backend\nnpm run dev`);
      } else {
        alert(`Erreur: ${error.message || 'Impossible d\'envoyer le message. Vérifiez votre connexion.'}`);
      }
    }
  };

  useEffect(() => {
    if (selectedResidenceGroup) {
      loadResidenceMessages();
      // Optimisation : Augmenter l'intervalle à 10 secondes et vérifier la visibilité
      const interval = setInterval(() => {
        // Ne recharger que si la page est visible et active
        if (document.visibilityState === 'visible' && !document.hidden) {
          loadResidenceMessages();
        }
      }, 10000); // Augmenté de 5s à 10s pour réduire la charge
      return () => clearInterval(interval);
    }
  }, [selectedResidenceGroup]);

  const filteredGroups = regionGroups.filter(group => group.region === activeTab);

  const getRegionIcon = (region: string) => {
    const icons: { [key: string]: string } = {
      'Communauté': '🌍'
    };
    return icons[region] || '🌍';
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des régions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-10 h-8 sm:w-14 sm:h-10 md:w-16 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                <div className="w-full h-full flex rounded">
                  <div className="w-1/3 bg-[#CE1126]"></div>
                  <div className="w-1/3 bg-[#FCD116]"></div>
                  <div className="w-1/3 bg-[#009460]"></div>
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Pays</h1>
              </div>
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'residence', label: 'Cercle', icon: '🏠' },
              { id: 'Communauté', label: 'Centre', icon: '🌍' }
            ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-6">
        {activeTab === 'residence' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-green-500 border border-slate-200 p-4 hover:shadow-md transition-shadow duration-200">
              {/* Onglets */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { id: 'lieu1', label: 'Cercle 1', icon: '🏠' },
                  { id: 'lieu2', label: 'Cercle 2', icon: '🏘️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setResidenceActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                      residenceActiveTab === tab.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>


              {/* Liste des organisations - Cachée si un groupe est sélectionné pour simplifier */}
              {!selectedResidenceGroup && (
                <div className="space-y-2 mb-6">
                  {residenceGroups.length > 0 ? (
                    residenceGroups.map((group) => (
                      <div
                        key={group.id}
                        onClick={async () => {
                          // Rejoindre automatiquement le groupe si pas déjà membre
                          if (!group.members.includes(userData?.numeroH || '')) {
                            await joinResidenceGroup(group.id);
                          }
                          setSelectedResidenceGroup(group);
                    }}
                        className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <h3 className="font-semibold text-gray-900">{group.name}</h3>
                </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🏠</div>
                      <p className="text-gray-500 mb-4">Aucun Organisation pour ce lieu de résidence</p>
                      <p className="text-sm text-gray-400">Les organisations sont créées automatiquement lors de l'enregistrement des utilisateurs</p>
              </div>
                  )}
                </div>
              )}

              {/* Interface de publication - Affichée directement sans header */}
              {selectedResidenceGroup && (
                <div className="mt-4 bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
                  {/* Zone de messages */}
                  <div className="flex-1 overflow-y-auto bg-gray-100 p-4" style={{ minHeight: '300px', maxHeight: 'calc(70vh - 200px)' }}>
                    {residenceMessages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <p>Aucun message pour le moment.</p>
                    </div>
                    ) : (
                      residenceMessages.map((msg) => {
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
                                <p className="text-xs font-semibold mb-1 opacity-75">{msg.authorName || msg.numeroH}</p>
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
                                  src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
                                  alt="Image"
                                  className="max-w-full h-auto rounded-lg mb-1"
                                />
                              )}
                              {msg.messageType === 'video' && msg.mediaUrl && (
                                <video
                                  src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
                                  controls
                                  className="max-w-full h-auto rounded-lg mb-1"
                                />
                              )}
                              {msg.messageType === 'audio' && msg.mediaUrl && (
                                <audio
                                  src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
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
                    <div ref={messagesEndRefResidence} />
                    </div>
                    
                  {/* Zone de saisie améliorée professionnelle */}
                  <div className="bg-gray-100 px-4 py-3 border-t">
                    <div className="space-y-2">
                      {/* Première ligne : Sélecteur de catégorie stylisé avec icône bleue */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select
                            value={newResidencePost.category}
                            onChange={(e) => setNewResidencePost({...newResidencePost, category: e.target.value as any})}
                            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 appearance-none cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                            <option value="information">Information</option>
                            <option value="rencontre">Rencontre</option>
                            <option value="deces">Décès</option>
                            <option value="reunion">Réunion</option>
                          </select>
                          {/* Icône bleue "i" à gauche */}
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">i</span>
                    </div>
                  </div>
                          {/* Flèche vers le bas à droite */}
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
              </div>
                        </div>
                  </div>
                  
                      {/* Deuxième ligne : Sélecteur de média, champ de saisie et bouton d'envoi */}
                      <div className="flex gap-2 items-center">
                        {/* Sélecteur de média stylisé avec icône document/crayon */}
                        <div className="relative">
                        <select
                          value={newResidencePost.type}
                            onChange={(e) => {
                              setNewResidencePost({...newResidencePost, type: e.target.value as any, mediaFile: null});
                            }}
                            className="pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 appearance-none cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px]"
                        >
                            <option value="text">📝</option>
                            <option value="image">🖼️</option>
                            <option value="video">🎥</option>
                            <option value="audio">🎵</option>
                        </select>
                          {/* Icône document/crayon à gauche */}
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                      </div>
                          {/* Flèche vers le bas à droite */}
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Zone de saisie ou sélection de fichier */}
                        <div className="flex-1">
                          {newResidencePost.type === 'text' ? (
                            <input
                              type="text"
                          value={newResidencePost.content}
                          onChange={(e) => setNewResidencePost({...newResidencePost, content: e.target.value})}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  sendResidenceMessage();
                                }
                              }}
                              placeholder="Tapez un message..."
                              className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
                        />
                          ) : newResidencePost.type === 'audio' ? (
                            <div className="flex gap-2 items-center flex-1">
                              {newResidencePost.mediaFile ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex-1">
                                  <span className="text-sm text-green-700 flex-1">🎙️ Audio prêt</span>
                                  <button type="button" onClick={() => setNewResidencePost({...newResidencePost, mediaFile: null})} className="text-red-500 hover:text-red-700 text-xs font-medium">✕ Annuler</button>
                                </div>
                              ) : (
                                <div className="flex-1">
                                  <AudioRecorder maxDuration={10} onAudioRecorded={(blob) => {
                                    const file = new File([blob], 'vocal.webm', { type: blob.type });
                                    setNewResidencePost({...newResidencePost, type: 'audio', mediaFile: file});
                                  }} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              type="file"
                              accept={newResidencePost.type === 'image' ? 'image/*' : 'video/*'}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  let detectedType = newResidencePost.type;
                                  if (file.type.startsWith('image/')) {
                                    detectedType = 'image';
                                  } else if (file.type.startsWith('video/')) {
                                    detectedType = 'video';
                                  } else if (file.type.startsWith('audio/')) {
                                    detectedType = 'audio';
                                  }
                                  setNewResidencePost({...newResidencePost, type: detectedType, mediaFile: file});
                                } else {
                                  setNewResidencePost({...newResidencePost, mediaFile: null});
                                }
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                            />
                          )}
                        </div>
                        
                        {/* Bouton d'envoi amélioré avec icône avion en papier */}
                        <button
                          onClick={sendResidenceMessage}
                          disabled={newResidencePost.type === 'text' ? !newResidencePost.content.trim() : !newResidencePost.mediaFile}
                          className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full transition-colors flex items-center justify-center min-w-[50px] shadow-md hover:shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                        </button>
                                  </div>
                                </div>
                              </div>
                          </div>
                        )}
                      </div>
                      </div>
                    )}

        {activeTab !== 'residence' && (
          <div className="space-y-4">
            {/* Groups - Cachés si un groupe est sélectionné pour simplifier */}
            {!selectedGroup && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            {filteredGroups.length > 0 ? (
                        <div className="space-y-2">
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                        onClick={() => handleJoinGroup(group.id)}
                      className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                      <h4 className="font-semibold text-gray-900">{group.name}</h4>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">{getRegionIcon(activeTab)}</div>
                <p className="text-gray-500 mb-4">Aucun Organisation dans cette région</p>
                  <p className="text-sm text-gray-400">Les organisations sont créées automatiquement lors de l'enregistrement des utilisateurs</p>
                </div>
              )}
          </div>
        )}

            {/* Interface de publication - Affichée directement sans header */}
            {selectedGroup && (
              <div className="mt-4 bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
                {/* Zone de messages */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-4" style={{ minHeight: '300px', maxHeight: 'calc(70vh - 200px)' }}>
                  {regionMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>Aucun message pour le moment.</p>
                </div>
              ) : (
                    regionMessages.map((msg) => {
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
                              <p className="text-xs font-semibold mb-1 opacity-75">{msg.authorName || msg.numeroH}</p>
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
                                src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
                                alt="Image"
                                className="max-w-full h-auto rounded-lg mb-1"
                              />
                            )}
                            {msg.messageType === 'video' && msg.mediaUrl && (
                              <video
                                src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
                                controls
                                className="max-w-full h-auto rounded-lg mb-1"
                              />
                            )}
                            {msg.messageType === 'audio' && msg.mediaUrl && (
                              <audio
                                src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
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
                  <div ref={messagesEndRefRegion} />
          </div>

                {/* Zone de saisie améliorée professionnelle */}
                <div className="bg-gray-100 px-4 py-3 border-t">
                        <div className="space-y-2">
                    {/* Première ligne : Sélecteur de catégorie stylisé avec icône bleue */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          value={newRegionPost.category}
                          onChange={(e) => setNewRegionPost({...newRegionPost, category: e.target.value as any})}
                          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 appearance-none cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="information">Information</option>
                          <option value="rencontre">Rencontre</option>
                          <option value="deces">Décès</option>
                          <option value="reunion">Réunion</option>
                        </select>
                        {/* Icône bleue "i" à gauche */}
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">i</span>
                              </div>
                              </div>
                        {/* Flèche vers le bas à droite */}
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                            </div>
                        </div>
                      </div>

                    {/* Deuxième ligne : Sélecteur de média, champ de saisie et bouton d'envoi */}
                    <div className="flex gap-2 items-center">
                      {/* Sélecteur de média stylisé avec icône document/crayon */}
                      <div className="relative">
                        <select
                          value={newRegionPost.type}
                          onChange={(e) => {
                            setNewRegionPost({...newRegionPost, type: e.target.value as any, mediaFile: null});
                          }}
                          className="pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 appearance-none cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px]"
                      >
                          <option value="text">📝</option>
                          <option value="image">🖼️</option>
                          <option value="video">🎥</option>
                          <option value="audio">🎵</option>
                        </select>
                        {/* Icône document/crayon à gauche */}
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                    </div>
                        {/* Flèche vers le bas à droite */}
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                  </div>
              </div>
                      
                      {/* Zone de saisie ou sélection de fichier */}
                      <div className="flex-1">
                        {newRegionPost.type === 'text' ? (
                          <input
                            type="text"
                            value={newRegionPost.content}
                            onChange={(e) => setNewRegionPost({...newRegionPost, content: e.target.value})}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendRegionMessage();
                              }
                            }}
                            placeholder="Tapez un message..."
                            className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
                          />
                        ) : newRegionPost.type === 'audio' ? (
                          <div className="flex gap-2 items-center flex-1">
                            {newRegionPost.mediaFile ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex-1">
                                <span className="text-sm text-green-700 flex-1">🎙️ Audio prêt</span>
                                <button type="button" onClick={() => setNewRegionPost({...newRegionPost, mediaFile: null})} className="text-red-500 hover:text-red-700 text-xs font-medium">✕ Annuler</button>
                              </div>
                            ) : (
                              <div className="flex-1">
                                <AudioRecorder maxDuration={10} onAudioRecorded={(blob) => {
                                  const file = new File([blob], 'vocal.webm', { type: blob.type });
                                  setNewRegionPost({...newRegionPost, type: 'audio', mediaFile: file});
                                }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept={newRegionPost.type === 'image' ? 'image/*' : 'video/*'}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                let detectedType = newRegionPost.type;
                                if (file.type.startsWith('image/')) {
                                  detectedType = 'image';
                                } else if (file.type.startsWith('video/')) {
                                  detectedType = 'video';
                                } else if (file.type.startsWith('audio/')) {
                                  detectedType = 'audio';
                                }
                                setNewRegionPost({...newRegionPost, type: detectedType, mediaFile: file});
                              } else {
                                setNewRegionPost({...newRegionPost, mediaFile: null});
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                />
                        )}
              </div>
                      
                      {/* Bouton d'envoi amélioré avec icône avion en papier */}
              <button
                        onClick={sendRegionMessage}
                        disabled={newRegionPost.type === 'text' ? !newRegionPost.content.trim() : !newRegionPost.mediaFile}
                        className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full transition-colors flex items-center justify-center min-w-[50px] shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </button>
                    </div>
                    </div>
            </div>
          </div>
        )}
          </div>
        )}
      </div>


      
      {/* Footer avec la carte de la Guinée */}
      <div className="bg-white mt-8 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="relative" style={{ width: '400px', height: '300px' }}>
            <svg viewBox="0 0 400 300" className="w-full h-full">
              <defs>
                <linearGradient id="guineaMapFlag" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#C41E3A', stopOpacity: 1 }} />
                  <stop offset="33.33%" style={{ stopColor: '#C41E3A', stopOpacity: 1 }} />
                  <stop offset="33.33%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                  <stop offset="66.66%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                  <stop offset="66.66%" style={{ stopColor: '#009639', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#009639', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              {/* Épinglette sur la carte */}
              <circle cx="200" cy="140" r="60" fill="url(#guineaMapFlag)" stroke="#000" strokeWidth="3"/>
              <circle cx="200" cy="140" r="30" fill="#fff"/>
              <text x="200" y="145" textAnchor="middle" fontSize="24" fill="#C41E3A" fontWeight="bold">📍</text>
              <text x="200" y="280" textAnchor="middle" fontSize="20" fill="#333" fontWeight="bold">
                Communauté Unie 🌍
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}