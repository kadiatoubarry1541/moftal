import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WORLD_GEOGRAPHY,
  findLocationByCode,
  getLocationGroupTitle,
  getAllLocationsForGroups,
  type GeographicLocation
} from '../utils/worldGeography';
import { getCountryFlag, getContinentIcon, getRegionIcon } from '../utils/countryFlags';
import { getCountryGeoLabels } from '../utils/countryGeoStructure';
import { AudioRecorder } from '../components/AudioRecorder';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface ResidenceGroup {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  location: string;
  displayPath?: string;
  members: UserData[] | string[];
  posts?: any[];
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
}

interface ResidenceMessage {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio';
  messageType?: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  category?: string;
  likes: string[];
  comments: any[];
  createdAt: string;
  numeroH: string;
}

interface CanalItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const CANAL_SECTIONS: { id: string; label: string; icon: string; canaux: CanalItem[] }[] = [
  {
    id: 'alerte',
    label: 'ALERTES & INFOS',
    icon: '📌',
    canaux: [
      { id: 'securite',    label: 'Urgences',       icon: '🚨', color: 'red',    description: 'Alertes et urgences du quartier' },
      { id: 'annonce',     label: 'Annonces',        icon: '📢', color: 'orange', description: 'Annonces importantes à partager' },
      { id: 'information', label: 'Informations',    icon: 'ℹ️', color: 'blue',   description: 'Informations générales du quartier' },
    ]
  },
  {
    id: 'famille',
    label: 'VIE FAMILIALE',
    icon: '👨‍👩‍👧',
    canaux: [
      { id: 'deces',     label: 'Décès / Condoléances', icon: '🕯️', color: 'stone',  description: 'Annonces de décès et condoléances' },
      { id: 'mariage',   label: 'Mariages',              icon: '💒', color: 'pink',   description: 'Annonces et félicitations de mariage' },
      { id: 'bapteme',   label: 'Baptêmes',              icon: '⛪', color: 'purple', description: 'Annonces de baptême' },
      { id: 'naissance', label: 'Naissances',            icon: '👶', color: 'yellow', description: 'Annonces et vœux de naissance' },
    ]
  },
  {
    id: 'communaute',
    label: 'VIE COMMUNAUTAIRE',
    icon: '🤝',
    canaux: [
      { id: 'solidarite', label: 'Solidarité / Entraide', icon: '🤲', color: 'green',  description: 'Entraide et soutien communautaire' },
      { id: 'fete',       label: 'Fêtes & Événements',    icon: '🎉', color: 'amber',  description: 'Célébrations et événements du quartier' },
      { id: 'reunion',    label: 'Réunions',              icon: '👥', color: 'indigo', description: 'Réunions et assemblées de quartier' },
      { id: 'rencontre',  label: 'Rencontres',            icon: '🤝', color: 'teal',   description: 'Rencontres et activités sociales' },
    ]
  }
];

function getCanalColors(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; header: string; ring: string }> = {
    red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    header: 'bg-red-600',    ring: 'focus:ring-red-300' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', header: 'bg-orange-500', ring: 'focus:ring-orange-300' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   header: 'bg-blue-600',   ring: 'focus:ring-blue-300' },
    stone:  { bg: 'bg-stone-50',  border: 'border-stone-300',  text: 'text-stone-700',  header: 'bg-stone-600',  ring: 'focus:ring-stone-300' },
    pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   header: 'bg-pink-500',   ring: 'focus:ring-pink-300' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', header: 'bg-purple-600', ring: 'focus:ring-purple-300' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', header: 'bg-yellow-500', ring: 'focus:ring-yellow-300' },
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  header: 'bg-green-600',  ring: 'focus:ring-green-300' },
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  header: 'bg-amber-500',  ring: 'focus:ring-amber-300' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', header: 'bg-indigo-600', ring: 'focus:ring-indigo-300' },
    teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   header: 'bg-teal-600',   ring: 'focus:ring-teal-300' },
  };
  return map[color] || map.blue;
}


// Normalise un nom de lieu : minuscule + sans accents → "TÉLIKO" = "teliko" = "Téliko"
function normalizeLoc(str: string): string {
  return str.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Affiche seulement la partie "GxCxPxRxExF" du NumeroH (sans le suffixe après l'espace)
function formatShortNumeroH(numeroH?: string | null): string | null {
  if (!numeroH) return null;
  const trimmed = String(numeroH).trim();
  if (!trimmed) return null;
  const parts = trimmed.split(' ');
  return parts[0] || trimmed;
}

export default function TerreAdam() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'lieux' | 'region' | 'pays' | 'continent' | 'mondial'>('lieux');
  type LieuTabId = 'quartier-1' | 'quartier-2' | 'quartier-3' | 'sous-prefecture' | 'prefecture';
  const [activeLieuTab, setActiveLieuTab] = useState<LieuTabId>('quartier-1');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // ✅ Étiquettes dynamiques pour afficher les véritables noms des lieux
  const [tabLabels, setTabLabels] = useState<string>('Quartier');
  
  // États pour le système de messagerie
  const [groups, setGroups] = useState<ResidenceGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ResidenceGroup | null>(null);
  const [messages, setMessages] = useState<ResidenceMessage[]>([]);
  const [newMessage, setNewMessage] = useState({
    content: '',
    messageType: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as string,
    mediaFile: null as File | null
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // ✅ Vérifier si l'utilisateur est journaliste
  const [isJournalist, setIsJournalist] = useState(false);
  const [filterScope, setFilterScope] = useState<'all' | 'quartier'>('quartier');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [feedFilter, setFeedFilter] = useState<string>('all');
  const [activeCanal, setActiveCanal] = useState<CanalItem | null>(null);

  // Niveau actuel : quartier (Résidence 1/2/3) ou plus large (sous-préfecture, région, pays, continent)
  const isQuartierLevel =
    activeLieuTab === 'quartier-1' ||
    activeLieuTab === 'quartier-2' ||
    activeLieuTab === 'quartier-3';
  // Seuls les journalistes/admin peuvent publier au-delà du quartier
  const canPublishHere = isQuartierLevel || isJournalist || isAdmin;

  // Récupérer les informations géographiques de l'utilisateur depuis la session
  const userContinent = userData?.continentCode ? findLocationByCode(userData.continentCode) : null;
  const userCountry = userData?.paysCode ? findLocationByCode(userData.paysCode) : null;
  const userRegion = userData?.regionCode ? findLocationByCode(userData.regionCode) : null;
  const userPrefecture = userData?.prefectureCode ? findLocationByCode(userData.prefectureCode) : null;
  const userSousPrefecture = userData?.sousPrefectureCode ? findLocationByCode(userData.sousPrefectureCode) : null;
  const userQuartier = userData?.quartierCode ? findLocationByCode(userData.quartierCode) : null;

  // 🔎 Si les codes ne sont pas enregistrés (anciens comptes), essayer de déduire
  // le pays et le continent à partir du nom de pays (`userData.pays`)
  const inferredGeo = (() => {
    if (userContinent || userCountry || !userData?.pays) return null;
    const paysName = String(userData.pays).trim().toLowerCase();
    if (!paysName) return null;

    for (const continent of WORLD_GEOGRAPHY) {
      for (const country of continent.children || []) {
        if (country.name.trim().toLowerCase() === paysName) {
          return { continent, country };
        }
      }
    }
    return null;
  })();

  const effectiveContinent = userContinent || inferredGeo?.continent || null;
  const effectiveCountry = userCountry || inferredGeo?.country || null;
  
  /** Codes des 1 à 3 quartiers de l'utilisateur (peuvent être null si non renseignés) */
  const userQuartierCodes: (string | null)[] = [
    userData?.quartierCode || userData?.lieu1 || userData?.lieuResidence1 || null,
    userData?.quartierCode2 || userData?.lieu2 || userData?.lieuResidence2 || null,
    userData?.quartierCode3 || userData?.lieu3 || userData?.lieuResidence3 || null
  ];

  /** Une valeur de lieu est "réelle" si elle est renseignée et différente du placeholder par défaut */
  const isRealLieu = (val: string | null | undefined): boolean => {
    if (!val) return false;
    const trimmed = String(val).trim().toLowerCase();
    return trimmed !== '' && trimmed !== 'non spécifié' && trimmed !== 'non specifie';
  };

  // Applique les données utilisateur (session ou rafraîchies depuis le serveur) :
  // met à jour le rôle, le label du quartier et l'onglet Résidence par défaut.
  const applyUserData = (user: UserData) => {
    setUserData(user);
    const admin =
      user.role === 'admin' ||
      user.role === 'super-admin' ||
      user.isAdmin === true ||
      user.numeroH === 'G0C0P0R0E0F0 0' ||
      user.numeroH === 'G7C7P7R7E7F7 7';
    setIsAdmin(admin);
    // ✅ Vérifier si l'utilisateur est journaliste
    const journalist = user.role === 'journalist' || user.isJournalist || admin;
    setIsJournalist(journalist);
    if (admin) setFilterScope('all');

    // ✅ Dynamiquement renommer le label du quartier (code géo ou saisie libre)
    const quartierName = user.quartierCode
      ? (findLocationByCode(user.quartierCode)?.name || user.lieu1 || user.quartier)
      : (user.lieu1 || user.quartier || 'Quartier');
    setTabLabels(quartierName || 'Quartier');

    // ✅ Choisir automatiquement le bon onglet de résidence:
    // - si seul le 1er quartier est renseigné → Résidence 1
    // - sinon, utiliser le premier des quartiers renseignés (2 ou 3)
    const slot1Code = user.quartierCode || user.lieu1 || user.lieuResidence1;
    const slot2Code = user.quartierCode2 || user.lieu2 || user.lieuResidence2;
    const slot3Code = user.quartierCode3 || user.lieu3 || user.lieuResidence3;
    if (slot1Code) {
      setActiveLieuTab('quartier-1');
    } else if (slot2Code) {
      setActiveLieuTab('quartier-2');
    } else if (slot3Code) {
      setActiveLieuTab('quartier-3');
    } else {
      // Aucun quartier configuré → basculer directement sur la sous-préfecture
      setActiveLieuTab('sous-prefecture');
    }
  };

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) {
      navigate("/login");
      return;
    }

    let cachedUser: UserData | null = null;
    try {
      const parsed = JSON.parse(session);
      cachedUser = parsed.userData || parsed;
      if (!cachedUser || !cachedUser.numeroH) {
        navigate("/login");
        return;
      }

      // ❌ Les défunts n'ont pas de compte et ne peuvent pas accéder à cette page
      if (cachedUser.type === 'defunt' || cachedUser.isDeceased || cachedUser.numeroHD) {
        alert("⚠️ Les défunts n'ont pas de compte. Leurs informations sont dans l'arbre généalogique.");
        navigate("/");
        return;
      }

      applyUserData(cachedUser);

      if (activeTab === 'lieux' && (activeLieuTab === 'quartier-1' || activeLieuTab === 'quartier-2' || activeLieuTab === 'quartier-3')) {
        loadGroups();
      } else {
        setLoading(false);
      }
    } catch {
      navigate("/login");
      return;
    }

    // 🔄 Rafraîchir les infos géographiques (lieu1/2/3, sous-préfecture, préfecture…) depuis
    // le serveur : la session locale peut être incomplète si elle a été créée avant l'ajout
    // de ces champs (ex: connexions effectuées avant une mise à jour de l'app).
    const token = localStorage.getItem("token");
    if (token) {
      fetch('http://localhost:5002/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.success && data.user && cachedUser) {
            const merged = { ...cachedUser, ...data.user };
            applyUserData(merged);

            try {
              const rawSession = localStorage.getItem("session_user");
              if (rawSession) {
                const parsedSession = JSON.parse(rawSession);
                if (parsedSession.userData) {
                  parsedSession.userData = { ...parsedSession.userData, ...data.user };
                } else {
                  Object.assign(parsedSession, data.user);
                }
                localStorage.setItem("session_user", JSON.stringify(parsedSession));
              }
            } catch { /* ignore */ }
          }
        })
        .catch(() => { /* hors-ligne : on garde les données en cache */ });
    }
  }, [navigate]);

  useEffect(() => {
    if (!userData) return;
    if (activeTab === 'lieux' && (activeLieuTab === 'quartier-1' || activeLieuTab === 'quartier-2' || activeLieuTab === 'quartier-3')) {
      setSelectedGroup(null);
      loadGroups();
    } else {
      setLoading(false);
    }
  }, [activeTab, activeLieuTab, userData, filterScope]);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
      setActiveCanal(null);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    if (!userData) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      // Admin avec filtre "Tout voir" : tous les groupes
      if (isAdmin && filterScope === 'all') {
        const response = await fetch(`http://localhost:5002/api/residences/groups?location=`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        const mapped = (data.groups || []).map((g: any) => {
          const displayName = findLocationByCode(g.location) ? getLocationGroupTitle(g.location) : (g.title || g.name);
          return { ...g, name: displayName, title: displayName, members: g.members || [] };
        });
        setGroups(mapped);
        setLoading(false);
        return;
      }

      // Utilisateur : groupes du quartier de l'onglet actif uniquement (Résidence 1, 2 ou 3)
      const slotIndex = activeLieuTab === 'quartier-1' ? 0 : activeLieuTab === 'quartier-2' ? 1 : activeLieuTab === 'quartier-3' ? 2 : -1;
      const currentSlotCode = slotIndex >= 0 ? userQuartierCodes[slotIndex] : null;
      const quartiersToLoad = currentSlotCode ? [currentSlotCode] : [];
      if (quartiersToLoad.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const allGroups: any[] = [];
      const seenIds = new Set<string>();
      for (const loc of quartiersToLoad) {
        const normalizedLoc = normalizeLoc(loc);
        const response = await fetch(`http://localhost:5002/api/residences/groups?location=${encodeURIComponent(normalizedLoc)}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        for (const g of data.groups || []) {
          if (seenIds.has(g.id)) continue;
          seenIds.add(g.id);
          const displayName = findLocationByCode(g.location) ? getLocationGroupTitle(g.location) : (g.title || g.name);
          allGroups.push({ ...g, name: displayName, title: displayName, members: g.members || [] });
        }
      }

      setGroups(allGroups);
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };


  const loadMessages = async () => {
    if (!selectedGroup) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/residences/groups/${selectedGroup.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setMessages((data.messages || []).reverse());
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  // Catégories quartier : besoins du quartier (décès, mariage, baptême, etc.)
  const QUARTIER_CATEGORIES = [
    { id: 'information', label: 'Information', icon: 'ℹ️' },
    { id: 'rencontre', label: 'Rencontre', icon: '🤝' },
    { id: 'deces', label: 'Décès', icon: '🕯️' },
    { id: 'mariage', label: 'Mariage', icon: '💒' },
    { id: 'bapteme', label: 'Baptême', icon: '⛪' },
    { id: 'naissance', label: 'Naissance', icon: '👶' },
    { id: 'solidarite', label: 'Solidarité / Entraide', icon: '🤲' },
    { id: 'fete', label: 'Fête / Événement', icon: '🎉' },
    { id: 'annonce', label: 'Annonce', icon: '📢' },
    { id: 'securite', label: 'Sécurité / Urgence', icon: '🚨' },
    { id: 'reunion', label: 'Réunion', icon: '👥' }
  ] as const;

  const getCategoryLogo = (category: string) => {
    const c = QUARTIER_CATEGORIES.find((x) => x.id === category);
    return c ? c.icon : 'ℹ️';
  };

  const getCategoryName = (category: string) => {
    const c = QUARTIER_CATEGORIES.find((x) => x.id === category);
    return c ? c.label : 'Information';
  };

  const sendMessage = async () => {
    if (!selectedGroup) return;
    
    // ✅ PERMISSIONS JOURNALISTES - Vérifier les droits selon le niveau
    // - Niveau "Quartier" (Résidence 1, 2 ou 3) : Tous les utilisateurs peuvent publier dans leur quartier
    // - Niveau "Sous-préfecture/Préfecture/..." : Seuls les journalistes et admins
    const isQuartierTab = activeLieuTab === 'quartier-1' || activeLieuTab === 'quartier-2' || activeLieuTab === 'quartier-3';
    if (!isQuartierTab && !isJournalist) {
      alert('❌ Vous n\'avez pas les droits pour publier à ce niveau.\n\nSeuls les journalistes approuvés peuvent publier des informations au niveau Sous-préfecture, Préfecture, Région, Pays ou Continent.\n\nVous pouvez publier librement dans votre Quartier.');
      return;
    }

    // Vérifier si l'utilisateur est admin ou si le groupe correspond au quartier de l'onglet actif
    const normalizedGroupLocation = selectedGroup.location ? normalizeLoc(selectedGroup.location) : '';
    const normalizedUserCodes = userQuartierCodes.map(c => c ? normalizeLoc(c) : null);
    const canPublishInGroup = isAdmin || (isQuartierTab && normalizedUserCodes.length > 0 && normalizedUserCodes.includes(normalizedGroupLocation));
    if (!canPublishInGroup) {
      alert('Vous ne pouvez publier que dans l\'un de vos quartiers (résidence 1, 2 ou 3). Contactez un administrateur pour obtenir des droits dans d\'autres quartiers.');
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
      const response = await fetch(`http://localhost:5002/api/residences/groups/${selectedGroup.id}/messages`, {
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
        await loadMessages();
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const error = await response.json().catch(() => ({ message: 'Erreur lors de l\'envoi du message' }));
        alert(error.message || 'Erreur lors de l\'envoi du message');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert(error.message || 'Erreur lors de l\'envoi du message');
    }
  };

  const sendMessageInCanal = async () => {
    if (!selectedGroup || !activeCanal) return;

    const isQuartierTab = activeLieuTab === 'quartier-1' || activeLieuTab === 'quartier-2' || activeLieuTab === 'quartier-3';
    if (!isQuartierTab && !isJournalist) {
      alert('❌ Seuls les journalistes approuvés peuvent publier à ce niveau.');
      return;
    }

    const normalizedGroupLocation = selectedGroup.location ? normalizeLoc(selectedGroup.location) : '';
    const normalizedUserCodes = userQuartierCodes.map(c => c ? normalizeLoc(c) : null);
    const canPublishInGroup = isAdmin || (isQuartierTab && normalizedUserCodes.includes(normalizedGroupLocation));
    if (!canPublishInGroup) {
      alert('Vous ne pouvez publier que dans l\'un de vos quartiers.');
      return;
    }

    if (newMessage.messageType === 'text' && !newMessage.content.trim()) return;
    if (newMessage.messageType !== 'text' && !newMessage.mediaFile) return;

    try {
      const formData = new FormData();
      formData.append('content', newMessage.content);
      formData.append('messageType', newMessage.messageType);
      formData.append('category', activeCanal.id);
      if (newMessage.mediaFile) formData.append('media', newMessage.mediaFile);

      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/residences/groups/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        setNewMessage({ content: '', messageType: 'text', category: activeCanal.id, mediaFile: null });
        await loadMessages();
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
      } else {
        const error = await response.json().catch(() => ({ message: 'Erreur lors de l\'envoi' }));
        alert(error.message || 'Erreur lors de l\'envoi du message');
      }
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'envoi du message');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 shadow-md">
        <div className="px-3 sm:px-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl flex-shrink-0">
                {effectiveContinent
                  ? getContinentIcon(userData?.continentCode || effectiveContinent.code, effectiveContinent.name)
                  : '🌍'}
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white truncate">Terre ADAM</h1>
                {effectiveContinent?.name && (
                  <p className="text-xs text-emerald-200 truncate">{effectiveContinent.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/moi')}
              className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - une seule ligne sur tous les appareils */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <nav className="flex">
          {[
            { id: 'lieux', icon: '🏠', label: 'Résidence' },
            {
              id: 'region',
              icon: getRegionIcon(userData?.regionCode, userRegion?.name || userData?.region || userData?.regionOrigine),
              label: userRegion?.name || userData?.region || userData?.regionOrigine || 'Région'
            },
            {
              id: 'pays',
              icon: effectiveCountry ? getCountryFlag(userData?.paysCode || effectiveCountry.code, effectiveCountry.name) : '🏳️',
              label: effectiveCountry?.name || userData?.pays || 'Pays'
            },
            {
              id: 'continent',
              icon: effectiveContinent ? getContinentIcon(userData?.continentCode || effectiveContinent.code, effectiveContinent.name) : '🌐',
              label: effectiveContinent?.name || userData?.continent || 'Continent'
            },
            { id: 'mondial', icon: '🌎', label: 'Mondial' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[9px] font-medium leading-tight w-full truncate text-center px-0.5">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4 md:py-6 overflow-hidden">
        {/* 1. Résidence */}
        {activeTab === 'lieux' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 overflow-hidden">
              <h2 className="text-base font-bold text-emerald-800 mb-4 flex items-center gap-2">
                <span className="text-xl">🏠</span>
                <span>Résidence</span>
              </h2>
              {/* Sous-onglets : chaque quartier (Résidence 1, 2, 3) à part, puis Sous-préfecture et Préfecture */}
              <div className="border-b border-gray-200 mb-4">
                <nav className="flex">
                  {[
                    {
                      id: 'quartier-1' as LieuTabId,
                      label: (() => {
                        const c = userQuartierCodes[0];
                        const loc = c ? findLocationByCode(c) : null;
                        if (loc?.name) return loc.name;
                        return isRealLieu(c) ? String(c).trim() : 'Résidence 1';
                      })(),
                      icon: '🏘️'
                    },
                    {
                      id: 'quartier-2' as LieuTabId,
                      label: (() => {
                        const c = userQuartierCodes[1];
                        const loc = c ? findLocationByCode(c) : null;
                        if (loc?.name) return loc.name;
                        return isRealLieu(c) ? String(c).trim() : 'Résidence 2';
                      })(),
                      icon: '🏘️'
                    },
                    {
                      id: 'quartier-3' as LieuTabId,
                      label: (() => {
                        const c = userQuartierCodes[2];
                        const loc = c ? findLocationByCode(c) : null;
                        if (loc?.name) return loc.name;
                        return isRealLieu(c) ? String(c).trim() : 'Résidence 3';
                      })(),
                      icon: '🏘️'
                    },
                    { id: 'sous-prefecture' as LieuTabId, label: userSousPrefecture?.name || userData.sousPrefecture || getCountryGeoLabels(userData.pays || '').level3.label, icon: '🏛️' },
                    { id: 'prefecture' as LieuTabId, label: userPrefecture?.name || userData.prefecture || getCountryGeoLabels(userData.pays || '').level2.label, icon: '🏢' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveLieuTab(tab.id)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-b-2 transition-colors ${
                        activeLieuTab === tab.id
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm leading-none">{tab.icon}</span>
                      <span className="text-[9px] font-medium leading-tight w-full truncate text-center px-0.5">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {((userData?.quartierCode || userData?.lieu1 || userData?.lieuResidence1) || (userData?.continentCode && userData?.paysCode && userData?.regionCode && userData?.prefectureCode && userData?.sousPrefectureCode) || isAdmin) ? (
                <div className="space-y-4">
                  {/* Page Quartier : une page indépendante par résidence (1, 2 ou 3) */}
                  {(activeLieuTab === 'quartier-1' || activeLieuTab === 'quartier-2' || activeLieuTab === 'quartier-3') && (
                    <div className="space-y-3 sm:space-y-4">
                      {(() => {
                        const slotNum = activeLieuTab === 'quartier-1' ? 1 : activeLieuTab === 'quartier-2' ? 2 : 3;
                        const code = userQuartierCodes[slotNum - 1];
                        const loc = code ? findLocationByCode(code) : null;
                        const name = loc?.name || (isRealLieu(code) ? code : null);

                        return (
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-5 overflow-hidden">
                            <div className="text-center">
                              <div className="text-2xl sm:text-3xl mb-1">🏘️</div>
                              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                {name || `Résidence ${slotNum}`}
                              </h3>
                            </div>
                            {/* Aucun détail supplémentaire : le quartier choisi à l'inscription suffit */}
                          </div>
                        );
                      })()}

                      {/* Système de messagerie – après les 3 quartiers */}
                      <div className="mt-8 sm:mt-10 space-y-4">
                        {/* En-tête avec filtres */}
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            💬 Système de Messagerie – Groupes disponibles
                            {!isAdmin && (
                              <span className="block sm:inline mt-1 sm:mt-0 sm:ml-2 text-sm font-normal text-amber-700">
                                (Résidence {activeLieuTab === 'quartier-1' ? 1 : activeLieuTab === 'quartier-2' ? 2 : 3})
                              </span>
                            )}
                            {isAdmin && (
                              <span className="block sm:inline mt-1 sm:mt-0 sm:ml-2 text-sm font-normal text-emerald-700">
                                ({filterScope === 'all' ? 'Tous les quartiers' : `Résidence ${activeLieuTab === 'quartier-1' ? 1 : activeLieuTab === 'quartier-2' ? 2 : 3}`})
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-400 text-gray-700 text-sm font-medium transition-colors"
                              >
                                <span>🔽</span>
                                Filtres
                              </button>
                              {showFilterDropdown && (
                                <div className="absolute left-0 top-full mt-1 py-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                  {isAdmin ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => { setFilterScope('all'); setShowFilterDropdown(false); loadGroups(); }}
                                        className={`w-full text-left px-4 py-2 text-sm ${filterScope === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                      >
                                        🌍 Tout voir
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setFilterScope('quartier'); setShowFilterDropdown(false); loadGroups(); }}
                                        className={`w-full text-left px-4 py-2 text-sm ${filterScope === 'quartier' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                      >
                                        🏘️ Résidence {activeLieuTab === 'quartier-1' ? 1 : activeLieuTab === 'quartier-2' ? 2 : 3}
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setShowFilterDropdown(false)}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-600"
                                    >
                                      🏘️ Résidence {activeLieuTab === 'quartier-1' ? 1 : activeLieuTab === 'quartier-2' ? 2 : 3} (ce quartier)
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {!selectedGroup ? (
                          /* Liste des groupes */
                          <div className="space-y-2">
                            {groups.length === 0 ? (
                              <div className="bg-gray-50 rounded-lg p-6 text-center">
                                <p className="text-gray-600">Aucun groupe pour le moment.</p>
                                <p className="text-sm text-gray-500 mt-2">Les groupes sont créés automatiquement par le système.</p>
                              </div>
                            ) : (
                              groups.map((group) => (
                                <div
                                  key={group.id}
                                  onClick={() => setSelectedGroup(group)}
                                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border border-gray-200 cursor-pointer flex items-center gap-4"
                                >
                                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                                    👥
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{group.title || group.name}</h4>
                                    {group.description && (
                                      <p className="text-sm text-gray-500 truncate">{group.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {group.members?.length ?? 0} membre{(group.members?.length ?? 0) > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              ))
                            )}
                          </div>
                        ) : (
                        /* ── Style Discord / Slack : canaux thématiques ── */
                        <div className="mt-4">
                          {/* Membres (compact, uniquement sur la liste de canaux) */}
                          {!activeCanal && Array.isArray(selectedGroup.members) && selectedGroup.members.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-3 flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-semibold text-gray-500 flex-shrink-0">👥 Membres :</span>
                              <div className="flex -space-x-2">
                                {selectedGroup.members.slice(0, 10).map((member: any, index: number) => {
                                  const isObject = member && typeof member === 'object';
                                  const prenom = isObject ? (member.prenom as string | undefined) : undefined;
                                  const photo = isObject ? (member.photo as string | undefined) : undefined;
                                  const initiale = (prenom || '?').charAt(0).toUpperCase();
                                  return (
                                    <div key={index} title={prenom || `Membre ${index + 1}`} className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-white overflow-hidden flex items-center justify-center text-[10px] font-bold text-emerald-700 flex-shrink-0">
                                      {photo ? <img src={photo} alt={initiale} className="w-full h-full object-cover" /> : initiale}
                                    </div>
                                  );
                                })}
                                {selectedGroup.members.length > 10 && (
                                  <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                                    +{selectedGroup.members.length - 10}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">{selectedGroup.members.length} membre{selectedGroup.members.length > 1 ? 's' : ''}</span>
                            </div>
                          )}

                          {!activeCanal ? (
                            /* ── Liste des canaux ── */
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              {/* En-tête du groupe */}
                              <div className="px-4 py-3 bg-gray-800 text-white flex items-center justify-between">
                                <div className="min-w-0">
                                  <h3 className="font-bold text-sm truncate">📍 {selectedGroup.title || selectedGroup.name}</h3>
                                  <p className="text-xs text-gray-400 mt-0.5">Choisissez un canal pour publier ou consulter</p>
                                </div>
                                <button
                                  onClick={() => setSelectedGroup(null)}
                                  className="flex-shrink-0 ml-3 text-gray-400 hover:text-white text-xs px-2.5 py-1 rounded border border-gray-600 hover:border-gray-400 transition-colors"
                                >
                                  ← Retour
                                </button>
                              </div>

                              {/* Sections de canaux */}
                              {CANAL_SECTIONS.map((section, sectionIndex) => (
                                <div key={section.id} className={sectionIndex > 0 ? 'border-t border-gray-100' : ''}>
                                  <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                                    <span className="text-sm">{section.icon}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{section.label}</span>
                                  </div>
                                  {section.canaux.map((canal) => {
                                    const count = messages.filter((m: ResidenceMessage) => (m.category || 'information') === canal.id).length;
                                    const colors = getCanalColors(canal.color);
                                    return (
                                      <button
                                        key={canal.id}
                                        onClick={() => setActiveCanal(canal)}
                                        className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
                                      >
                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colors.bg} border ${colors.border}`}>
                                          {canal.icon}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 truncate"># {canal.label}</p>
                                          <p className="text-xs text-gray-400 truncate">{canal.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {count > 0 ? (
                                            <span className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${colors.header}`}>
                                              {count > 99 ? '99+' : count}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-gray-300">0</span>
                                          )}
                                          <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* ── Vue canal (chat) ── */
                            (() => {
                              const colors = getCanalColors(activeCanal.color);
                              const canalMessages = messages.filter((m: ResidenceMessage) => (m.category || 'information') === activeCanal.id);
                              return (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: '420px', maxHeight: '75vh' }}>
                                  {/* En-tête du canal */}
                                  <div className={`${colors.header} text-white px-4 py-3 flex items-center gap-3 flex-shrink-0`}>
                                    <button
                                      onClick={() => setActiveCanal(null)}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-lg leading-none flex-shrink-0"
                                    >
                                      ←
                                    </button>
                                    <span className="text-2xl flex-shrink-0">{activeCanal.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-bold text-sm truncate"># {activeCanal.label}</h3>
                                      <p className="text-[11px] text-white/80 truncate">{activeCanal.description}</p>
                                    </div>
                                    <span className="text-xs text-white/70 flex-shrink-0 bg-white/20 px-2 py-0.5 rounded-full">
                                      {canalMessages.length} msg
                                    </span>
                                  </div>

                                  {/* Zone des messages */}
                                  <div className="flex-1 overflow-y-auto p-3 bg-gray-50" style={{ minHeight: '220px' }}>
                                    {canalMessages.length === 0 ? (
                                      <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <span className="text-6xl mb-4">{activeCanal.icon}</span>
                                        <p className="font-bold text-gray-800 text-base"># {activeCanal.label}</p>
                                        <p className="text-gray-500 text-sm mt-1 max-w-xs">{activeCanal.description}</p>
                                        <p className="text-gray-400 text-xs mt-4 italic">Aucun message pour le moment.<br/>Soyez le premier à publier !</p>
                                      </div>
                                    ) : (
                                      canalMessages.map((msg: ResidenceMessage) => {
                                        const isMyMessage = msg.numeroH === userData?.numeroH;
                                        return (
                                          <div key={msg.id} className={`mb-3 flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl shadow-sm ${
                                              isMyMessage
                                                ? `${colors.header} text-white rounded-br-sm`
                                                : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                                            }`}>
                                              {!isMyMessage && (
                                                <p className={`text-[10px] font-bold mb-1 ${colors.text}`}>{msg.authorName}</p>
                                              )}
                                              {(msg.type === 'text' || msg.messageType === 'text') && msg.content && (
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                              )}
                                              {(msg.type === 'image' || msg.messageType === 'image') && msg.mediaUrl && (
                                                <img src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `http://localhost:5002${msg.mediaUrl.startsWith('/') ? msg.mediaUrl : '/' + msg.mediaUrl}`} alt="Image" className="max-w-full h-auto rounded-lg" />
                                              )}
                                              {(msg.type === 'video' || msg.messageType === 'video') && msg.mediaUrl && (
                                                <video src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `http://localhost:5002${msg.mediaUrl.startsWith('/') ? msg.mediaUrl : '/' + msg.mediaUrl}`} controls className="max-w-full h-auto rounded-lg" />
                                              )}
                                              {(msg.type === 'audio' || msg.messageType === 'audio') && msg.mediaUrl && (
                                                <audio src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `http://localhost:5002${msg.mediaUrl.startsWith('/') ? msg.mediaUrl : '/' + msg.mediaUrl}`} controls className="w-full" />
                                              )}
                                              <p className={`text-[10px] mt-1.5 ${isMyMessage ? 'text-white/70' : 'text-gray-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                    <div ref={messagesEndRef} />
                                  </div>

                                  {/* Zone de saisie — catégorie fixée automatiquement au canal */}
                                  {canPublishHere ? (
                                    <div className="border-t border-gray-200 px-3 py-3 bg-white flex-shrink-0">
                                      <div className="flex gap-2 items-center">
                                        <select
                                          value={newMessage.messageType}
                                          onChange={(e) => setNewMessage({...newMessage, messageType: e.target.value as any, mediaFile: null})}
                                          className="px-2 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm flex-shrink-0"
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
                                            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessageInCanal(); } }}
                                            placeholder={`Publier dans #${activeCanal.label}...`}
                                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-300 text-sm bg-gray-50"
                                          />
                                        ) : newMessage.messageType === 'audio' ? (
                                          <div className="flex-1">
                                            {newMessage.mediaFile ? (
                                              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-full">
                                                <span className="text-sm text-green-700 flex-1">🎙️ Audio prêt</span>
                                                <button type="button" onClick={() => setNewMessage({...newMessage, mediaFile: null})} className="text-red-500 text-xs font-medium">✕</button>
                                              </div>
                                            ) : (
                                              <AudioRecorder maxDuration={10} onAudioRecorded={(blob) => {
                                                const file = new File([blob], 'vocal.webm', { type: blob.type });
                                                setNewMessage({...newMessage, messageType: 'audio', mediaFile: file});
                                              }} />
                                            )}
                                          </div>
                                        ) : (
                                          <input
                                            type="file"
                                            accept={newMessage.messageType === 'image' ? 'image/*' : 'video/*'}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0] || null;
                                              if (file) {
                                                let detectedType = newMessage.messageType;
                                                if (file.type.startsWith('image/')) detectedType = 'image';
                                                else if (file.type.startsWith('video/')) detectedType = 'video';
                                                setNewMessage({...newMessage, messageType: detectedType, mediaFile: file});
                                              } else setNewMessage({...newMessage, mediaFile: null});
                                            }}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                                          />
                                        )}
                                        <button
                                          onClick={sendMessageInCanal}
                                          disabled={newMessage.messageType === 'text' ? !newMessage.content.trim() : !newMessage.mediaFile}
                                          className={`${colors.header} text-white px-5 py-2.5 rounded-full hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex-shrink-0 font-medium text-sm`}
                                        >
                                          ▶
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex-shrink-0 text-center">
                                      <p className="text-xs text-gray-500">
                                        Seuls les <strong>journalistes approuvés</strong> peuvent publier ici.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  )}

                  {/* Page niveau 3 (Sous-préfecture / Commune / Ward...) */}
                  {activeLieuTab === 'sous-prefecture' && (
                    <div className="text-[11px] sm:text-xs md:text-sm text-gray-600">
                      {userSousPrefecture?.name || userData.sousPrefecture || getCountryGeoLabels(userData.pays || '').level3.label}
                    </div>
                  )}

                  {/* Page niveau 2 (Préfecture / Département / County...) */}
                  {activeLieuTab === 'prefecture' && (
                    <div className="text-[11px] sm:text-xs md:text-sm text-gray-600">
                      {userPrefecture?.name || userData.prefecture || getCountryGeoLabels(userData.pays || '').level2.label}
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 md:p-4 rounded overflow-hidden">
                  <p className="text-[10px] sm:text-xs md:text-sm text-yellow-800 break-words">
                    <strong>⚠️ Aucun lieu de résidence enregistré</strong>
                    <br />
                    Vous n'avez pas encore enregistré vos lieux de résidence lors de l'inscription.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Région */}
        {activeTab === 'region' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 overflow-hidden">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
                <span className="text-base sm:text-lg md:text-xl">
                  {getRegionIcon(
                    userData?.regionCode,
                    userRegion?.name || userData?.region || userData?.regionOrigine
                  )}
                </span>
                <span className="text-[11px] sm:text-xs md:text-sm break-words">
                  {userRegion?.name || userData?.region || userData?.regionOrigine || 'Région'}
                </span>
              </h2>

              {(userData?.regionCode || isAdmin) ? (
                <div className="space-y-2 sm:space-y-3 md:space-y-4 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden">
                    <div className="text-center overflow-hidden">
                      <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-2 sm:mb-3">{getRegionIcon(userData?.regionCode, userRegion?.name || userData?.region || userData?.regionOrigine)}</div>
                      <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 break-words">
                        {userRegion?.name || userData?.region || userData?.regionOrigine || (isAdmin ? '(Toutes les régions)' : 'Non défini')}
                      </h3>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 md:p-4 rounded overflow-hidden">
                  <p className="text-[10px] sm:text-xs md:text-sm text-yellow-800 break-words">
                    <strong>⚠️ Aucune région enregistrée</strong>
                    <br />
                    Vous n'avez pas encore enregistré votre région lors de l'inscription.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Pays */}
        {activeTab === 'pays' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 overflow-hidden">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
                <span className="text-base sm:text-lg md:text-xl lg:text-2xl">
                  {effectiveCountry
                    ? getCountryFlag(userData?.paysCode || effectiveCountry.code, effectiveCountry.name)
                    : '🏳️'}
                </span>
                <span className="text-[11px] sm:text-xs md:text-sm break-words">
                  {effectiveCountry?.name || userData?.pays || 'Pays'}
                </span>
              </h2>

              {(effectiveCountry || isAdmin) ? (
                <div className="space-y-2 sm:space-y-3 md:space-y-4 overflow-hidden">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden">
                    <div className="text-center overflow-hidden">
                      <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-2 sm:mb-3">
                        {effectiveCountry
                          ? getCountryFlag(userData?.paysCode || effectiveCountry.code, effectiveCountry.name)
                          : '🌍'}
                      </div>
                      <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-purple-600 mb-2 sm:mb-3 break-words">
                        {effectiveCountry?.name || userData?.pays || (isAdmin ? '(Tous les pays)' : 'Non défini')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 md:p-4 rounded overflow-hidden">
                  <p className="text-[10px] sm:text-xs md:text-sm text-yellow-800 break-words">
                    <strong>⚠️ Aucun pays enregistré</strong>
                    <br />
                    Vous n'avez pas encore enregistré votre pays lors de l'inscription.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Continent */}
        {activeTab === 'continent' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 overflow-hidden">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
                <span className="text-base sm:text-lg md:text-xl">
                  {effectiveContinent
                    ? getContinentIcon(
                        userData?.continentCode || effectiveContinent.code,
                        effectiveContinent.name
                      )
                    : getContinentIcon(undefined, undefined)}
                </span>
                <span className="text-[11px] sm:text-xs md:text-sm break-words">
                  {effectiveContinent?.name || userData?.continent || 'Continent'}
                </span>
              </h2>

              {(effectiveContinent || isAdmin) ? (
                <div className="space-y-2 sm:space-y-3 md:space-y-4 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden">
                    <div className="text-center overflow-hidden">
                      <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-2 sm:mb-3">
                        {effectiveContinent
                          ? getContinentIcon(userData?.continentCode || effectiveContinent.code, effectiveContinent.name)
                          : '🌍'}
                      </div>
                      <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 break-words">
                        {effectiveContinent?.name || userData?.continent || (isAdmin ? '(Tous les continents)' : 'Non défini')}
                      </h3>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 md:p-4 rounded overflow-hidden">
                  <p className="text-[10px] sm:text-xs md:text-sm text-yellow-800 break-words">
                    <strong>⚠️ Aucun continent enregistré</strong>
                    <br />
                    Vous n'avez pas encore enregistré votre continent lors de l'inscription.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Mondial */}
        {activeTab === 'mondial' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 overflow-hidden">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <span className="text-base sm:text-lg md:text-xl">🌎</span>
                <span className="text-[11px] sm:text-xs md:text-sm">Mondial</span>
              </h2>

              <div className="text-center py-3 sm:py-4 md:py-6 lg:py-8 overflow-hidden">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-2 sm:mb-3">🌎</div>
                {/* Pas de bouton d'accès séparé : l'espace est déjà cette page */}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

