import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WORLD_GEOGRAPHY,
  findLocationByCode,
  getLocationGroupTitle,
  type GeographicLocation
} from '../utils/worldGeography';
import { getCountryFlag, getContinentIcon, getRegionIcon } from '../utils/countryFlags';
import { getCountryGeoLabels } from '../utils/countryGeoStructure';
import { AudioRecorder } from '../components/AudioRecorder';
import DeveloppementSection, { type DeveloppementSectionHandle } from '../components/DeveloppementSection';
import LivreQuartier, { type LivreQuartierHandle } from '../components/LivreQuartier';
import DeveloppementGouvernemental from '../components/DeveloppementGouvernemental';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';
const MAX_VIDEO_SECONDS = 5;

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
  admin?: string;
  logoUrl?: string | null;
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
  const [activeTab, setActiveTab] = useState<'lieux' | 'sous-prefecture' | 'prefecture' | 'region' | 'pays' | 'continent' | 'mondial'>('lieux');
  type LieuTabId = 'quartier-1' | 'quartier-2' | 'quartier-3';
  const [activeLieuTab, setActiveLieuTab] = useState<LieuTabId>('quartier-1');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // ✅ Étiquettes dynamiques pour afficher les véritables noms des lieux
  const [tabLabels, setTabLabels] = useState<string>('Quartier');
  
  // États pour le système de messagerie
  const [groups, setGroups] = useState<ResidenceGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ResidenceGroup | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  // Clic sur la photo du quartier (comme la photo de profil) : ouvre le
  // menu Liste/Caisse au lieu d'avoir des boutons séparés en permanence.
  const [showQuartierMenu, setShowQuartierMenu] = useState(false);
  const quartierLogoInputRef = useRef<HTMLInputElement>(null);
  // Logo de chaque résidence (1, 2, 3) pour l'afficher directement dans
  // l'onglet — même les personnes qui ne savent pas lire reconnaissent
  // leur quartier par sa photo, pas seulement par son nom.
  const [quartierTabLogos, setQuartierTabLogos] = useState<Record<string, string | null>>({});
  // Permet d'ouvrir la modale "Projets" du quartier depuis le bouton placé
  // à côté de "Liste" dans l'en-tête du chat, plutôt que depuis son propre
  // bouton (masqué sur la page Quartier via hideProjetsButton).
  const quartierDevRef = useRef<DeveloppementSectionHandle>(null);
  const livreQuartierRef = useRef<LivreQuartierHandle>(null);

  // Partage d'un message du chat vers un niveau supérieur (sous-préfecture,
  // préfecture...), comme sur WhatsApp — sans avoir à retaper l'information.
  const [shareMsg, setShareMsg] = useState<ResidenceMessage | null>(null);
  const [shareLevels, setShareLevels] = useState<{ scope: string; location: string; label: string }[]>([]);
  const [shareSelected, setShareSelected] = useState<Set<string>>(new Set());
  const [shareChecking, setShareChecking] = useState(false);
  const [shareSending, setShareSending] = useState(false);

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

  // Chaîne des niveaux au-dessus du quartier, du plus local au plus large —
  // sert à proposer « faire remonter » une actualité vers les niveaux
  // supérieurs (partage, jamais une copie).
  const geoLevels = [
    {
      scope: 'sous-prefecture',
      location: userData?.sousPrefectureCode || userData?.sousPrefecture || '',
      label: userSousPrefecture?.name || userData?.sousPrefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level3.label : 'Sous-préfecture')
    },
    {
      scope: 'prefecture',
      location: userData?.prefectureCode || userData?.prefecture || '',
      label: userPrefecture?.name || userData?.prefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level2.label : 'Préfecture')
    },
    {
      scope: 'region',
      location: userData?.regionCode || userData?.region || userData?.regionOrigine || '',
      label: userRegion?.name || userData?.region || userData?.regionOrigine || 'Région'
    },
    {
      scope: 'pays',
      location: userData?.paysCode || effectiveCountry?.code || userData?.pays || '',
      label: effectiveCountry?.name || userData?.pays || 'Pays'
    },
    {
      scope: 'continent',
      location: userData?.continentCode || effectiveContinent?.code || userData?.continent || '',
      label: effectiveContinent?.name || userData?.continent || 'Continent'
    },
    { scope: 'mondial', location: 'mondial', label: 'Mondial' },
  ].filter(l => l.location);

  /** Niveaux strictement au-dessus de `scope` dans la chaîne géographique. */
  const higherLevelsFrom = (scope: string) => {
    const idx = geoLevels.findIndex(l => l.scope === scope);
    return idx === -1 ? geoLevels : geoLevels.slice(idx + 1);
  };

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
      // Aucun quartier configuré → basculer directement sur l'onglet Sous-préfecture
      setActiveTab('sous-prefecture');
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
      fetch(`${API_BASE}/api/auth/me`, {
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
                window.dispatchEvent(new Event("session-updated"));
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
      // Réinitialisation complète à chaque changement de résidence — elles sont indépendantes
      setSelectedGroup(null);
      setActiveCanal(null);
      setMessages([]);
      setGroups([]);
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

  // Charge le logo du groupe principal de chaque résidence réelle de
  // l'utilisateur, pour l'afficher directement dans l'onglet Résidence 1/2/3.
  useEffect(() => {
    if (!userData) return;
    const token = localStorage.getItem('token');
    const codes = userQuartierCodes.filter(isRealLieu) as string[];
    codes.forEach(async (code) => {
      if (code in quartierTabLogos) return;
      try {
        const res = await fetch(`${API_BASE}/api/residences/groups?location=${encodeURIComponent(normalizeLoc(code))}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const logoUrl = data.groups?.[0]?.logoUrl || null;
        setQuartierTabLogos(prev => ({ ...prev, [code]: logoUrl }));
      } catch {
        setQuartierTabLogos(prev => ({ ...prev, [code]: null }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const loadGroups = async () => {
    if (!userData) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      // Admin avec filtre "Tout voir" : tous les groupes
      if (isAdmin && filterScope === 'all') {
        const response = await fetch(`${API_BASE}/api/residences/groups?location=`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        const mapped = (data.groups || []).map((g: any) => {
          const displayName = findLocationByCode(g.location) ? getLocationGroupTitle(g.location) : (g.title || g.name);
          return { ...g, name: displayName, title: displayName, members: g.members || [] };
        });
        setGroups(mapped);
        if (mapped.length > 0) setSelectedGroup(mapped[0]);
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
        const response = await fetch(`${API_BASE}/api/residences/groups?location=${encodeURIComponent(normalizedLoc)}`, {
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
      if (allGroups.length > 0) setSelectedGroup(allGroups[0]);
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };


  const handleLogoUpload = async (file: File) => {
    if (!selectedGroup) return;
    setUploadingLogo(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch(`${API_BASE}/api/residences/groups/${selectedGroup.id}/logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setSelectedGroup(prev => prev ? { ...prev, logoUrl: data.logoUrl } : prev);
        setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, logoUrl: data.logoUrl } : g));
      } else {
        alert(data.message || "Impossible de changer le logo");
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload du logo:', error);
      alert("Erreur réseau lors de l'envoi du logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedGroup) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/residences/groups/${selectedGroup.id}/messages`, {
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
    { id: 'information', label: 'Information', icon: '📰' },
    { id: 'rencontre', label: 'Rencontre', icon: '🤝' },
    { id: 'deces', label: 'Décès', icon: '🕯️' },
    { id: 'mariage', label: 'Mariage', icon: '💒' },
    { id: 'bapteme', label: 'Baptême', icon: '⛪' },
    { id: 'naissance', label: 'Naissance', icon: '👶' },
    { id: 'solidarite', label: 'Solidarité / Entraide', icon: '🤲' },
    { id: 'fete', label: 'Fête / Événement', icon: '🎉' },
    { id: 'annonce', label: 'Annonce', icon: '📢' },
    { id: 'opportunite', label: 'Opportunité', icon: '🌟' },
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
      const response = await fetch(`${API_BASE}/api/residences/groups/${selectedGroup.id}/messages`, {
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

  // Partager un message du quartier vers un ou plusieurs niveaux au-dessus
  // (sous-préfecture, préfecture...) — comme "transférer" sur WhatsApp.
  const openShare = async (msg: ResidenceMessage) => {
    setShareMsg(msg);
    setShareSelected(new Set());
    setShareLevels([]);
    setShareChecking(true);
    // Un quartier ne peut partager que vers la sous-préfecture juste
    // au-dessus — jamais sauter directement à un niveau plus loin. C'est
    // depuis la sous-préfecture (une fois l'info arrivée là) qu'on peut
    // continuer à la faire remonter plus haut.
    const candidats = higherLevelsFrom('quartier').slice(0, 1);
    const token = localStorage.getItem('token');
    try {
      const resultats = await Promise.all(candidats.map(async (lvl) => {
        try {
          const res = await fetch(
            `${API_BASE}/api/developpement/actualites/can-publish?scope=${encodeURIComponent(lvl.scope)}&location=${encodeURIComponent(lvl.location)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return null;
          const d = await res.json();
          return d.canPublish ? lvl : null;
        } catch { return null; }
      }));
      setShareLevels(resultats.filter((l): l is { scope: string; location: string; label: string } => !!l));
    } finally {
      setShareChecking(false);
    }
  };

  const toggleShareLevel = (key: string) => {
    setShareSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const confirmShare = async () => {
    if (!shareMsg || shareSelected.size === 0) return;
    setShareSending(true);
    try {
      const cibles = shareLevels.filter(l => shareSelected.has(`${l.scope}:${l.location}`));
      const [premiere, ...reste] = cibles;
      const categoryLabel = QUARTIER_CATEGORIES.find(c => c.id === (shareMsg.category || 'information'))?.label || 'Information';
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('titre', `${categoryLabel} — ${selectedGroup?.title || selectedGroup?.name || ''}`);
      formData.append('content', shareMsg.content || '');
      formData.append('scope', premiere.scope);
      formData.append('location', premiere.location);
      if (reste.length) formData.append('partages', JSON.stringify(reste.map(l => ({ scope: l.scope, location: l.location }))));
      const res = await fetch(`${API_BASE}/api/developpement/actualites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const d = await res.json();
      if (d.success) {
        setShareMsg(null);
      } else {
        alert(d.message || 'Erreur lors du partage.');
      }
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setShareSending(false);
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
      const response = await fetch(`${API_BASE}/api/residences/groups/${selectedGroup.id}/messages`, {
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
      {/* Header + Menu 3 points */}
      {(() => {
        const navTabs = [
          { id: 'lieux', icon: '🏠', label: 'Résidence' },
          {
            id: 'sous-prefecture',
            icon: '🏛️',
            label: userSousPrefecture?.name || userData?.sousPrefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level3.label : 'Sous-préfecture')
          },
          {
            id: 'prefecture',
            icon: '🏢',
            label: userPrefecture?.name || userData?.prefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level2.label : 'Préfecture')
          },
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
        ];
        return (
          <header style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 40, borderBottom: '2px solid #1e293b', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            {/* Retour + titre + badge du niveau actif */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => navigate('/compte')}
                  aria-label="Retour à l'accueil"
                  style={{ background: 'none', color: 'white', border: 'none', padding: 2, cursor: 'pointer', fontSize: 34, fontWeight: 700, lineHeight: 1, opacity: 1 }}
                >
                  ‹
                </button>
                <h1 style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px', margin: 0 }}>🌍 Terre ADAM</h1>
              </div>
            </div>

            {/* Les 7 niveaux propres à Terre ADAM — barre défilante pour rester lisible même avec beaucoup d'onglets */}
            <div className="flex gap-1.5 overflow-x-auto" style={{ padding: '0 6px 6px', WebkitOverflowScrolling: 'touch' }}>
              {navTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex-shrink-0 flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-bold transition"
                  style={{
                    borderRadius: 10,
                    minWidth: 60,
                    background: activeTab === tab.id ? '#1a8f1a' : 'rgba(255,255,255,0.06)',
                    color: activeTab === tab.id ? 'white' : '#94a3b8',
                  }}
                >
                  <span className={`text-lg transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>{tab.icon}</span>
                  <span className="truncate max-w-[70px]">{tab.label}</span>
                </button>
              ))}
            </div>
          </header>
        );
      })()}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        {/* 1. Résidence */}
        {activeTab === 'lieux' && (
          <div className="space-y-2.5">
            <div className="bg-white p-2.5 sm:p-3.5">
              {/* Sous-onglets : un par quartier (Résidence 1, 2, 3) — affichés
                  seulement s'il y en a plus d'un à choisir. */}
              {(() => {
                const tabs = [
                  {
                    id: 'quartier-1' as LieuTabId,
                    code: userQuartierCodes[0],
                    label: (() => {
                      const c = userQuartierCodes[0];
                      const loc = c ? findLocationByCode(c) : null;
                      if (loc?.name) return loc.name;
                      return isRealLieu(c) ? String(c).trim() : 'Résidence 1';
                    })(),
                    visible: isAdmin || isRealLieu(userQuartierCodes[0])
                  },
                  {
                    id: 'quartier-2' as LieuTabId,
                    code: userQuartierCodes[1],
                    label: (() => {
                      const c = userQuartierCodes[1];
                      const loc = c ? findLocationByCode(c) : null;
                      if (loc?.name) return loc.name;
                      return isRealLieu(c) ? String(c).trim() : 'Résidence 2';
                    })(),
                    visible: isAdmin || isRealLieu(userQuartierCodes[1])
                  },
                  {
                    id: 'quartier-3' as LieuTabId,
                    code: userQuartierCodes[2],
                    label: (() => {
                      const c = userQuartierCodes[2];
                      const loc = c ? findLocationByCode(c) : null;
                      if (loc?.name) return loc.name;
                      return isRealLieu(c) ? String(c).trim() : 'Résidence 3';
                    })(),
                    visible: isAdmin || isRealLieu(userQuartierCodes[2])
                  }
                ].filter(tab => tab.visible);
                if (tabs.length <= 1) return null;
                return (
                  <div className="border-b border-gray-200 mb-4">
                    <nav className="flex">
                      {tabs.map((tab) => {
                        const rawLogo = tab.code ? quartierTabLogos[tab.code] : null;
                        const logoSrc = rawLogo ? (rawLogo.startsWith('http') ? rawLogo : `${API_BASE}${rawLogo}`) : null;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveLieuTab(tab.id)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 border-b-2 transition-colors ${
                              activeLieuTab === tab.id
                                ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="w-8 h-8 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center text-sm font-bold text-emerald-700 flex-shrink-0">
                              {logoSrc ? (
                                <img src={logoSrc} alt={tab.label} className="w-full h-full object-cover" />
                              ) : (
                                tab.label.charAt(0).toUpperCase()
                              )}
                            </span>
                            <span className="text-[9px] font-medium leading-tight w-full truncate text-center px-0.5">{tab.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                );
              })()}

              {((userData?.quartierCode || userData?.lieu1 || userData?.lieuResidence1) || (userData?.continentCode && userData?.paysCode && userData?.regionCode && userData?.prefectureCode && userData?.sousPrefectureCode) || isAdmin) ? (
                <div className="space-y-2.5">
                  {/* Page Quartier : une page indépendante par résidence (1, 2 ou 3) */}
                  {(activeLieuTab === 'quartier-1' || activeLieuTab === 'quartier-2' || activeLieuTab === 'quartier-3') && (
                    <div className="space-y-2.5">
                      {(() => {
                        const slotNum = activeLieuTab === 'quartier-1' ? 1 : activeLieuTab === 'quartier-2' ? 2 : 3;
                        const code = userQuartierCodes[slotNum - 1];
                        const loc = code ? findLocationByCode(code) : null;
                        const name = loc?.name || (isRealLieu(code) ? code : null);

                        if (!code && !isAdmin) return null;
                        return (
                          <DeveloppementSection
                            ref={quartierDevRef}
                            scope="quartier"
                            location={code || `quartier-${slotNum}`}
                            locationName={name || `Résidence ${slotNum}`}
                            isJournalist={isJournalist}
                            isAdmin={isAdmin}
                            higherLevels={higherLevelsFrom('quartier')}
                            hideProjetsButton
                          />
                        );
                      })()}

                      {/* Messagerie */}
                      <div className="space-y-3">
                        {/* Filtre admin en chips */}
                        {isAdmin && (
                          <div className="flex items-center justify-end px-0.5">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => { setFilterScope('all'); loadGroups(); }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterScope === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                              >
                                🌍 Tout
                              </button>
                              <button
                                type="button"
                                onClick={() => { setFilterScope('quartier'); loadGroups(); }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterScope === 'quartier' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                              >
                                🏘️ Ce quartier
                              </button>
                            </div>
                          </div>
                        )}

                        {!selectedGroup ? (
                          /* État vide ou chargement — le groupe est normalement auto-sélectionné */
                          <div className="bg-white rounded-2xl p-10 flex flex-col items-center text-center">
                            {groups.length === 0 ? (
                              <>
                                <span className="text-4xl mb-2">💬</span>
                                <p className="text-sm text-gray-500">Aucun groupe</p>
                              </>
                            ) : (
                              <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                            )}
                          </div>
                        ) : (
                        /* ── Feed unique avec filtres (une seule page, tout visible) ── */
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: '600px', maxHeight: '92vh' }}>

                          {/* En-tête : nom du quartier + membres + sélecteur admin */}
                          <div className="bg-gray-800 text-white flex-shrink-0">
                            <div className="px-4 py-3 flex items-center gap-3 relative">
                              {(() => {
                                const canEditLogo = isAdmin || (selectedGroup.admin && selectedGroup.admin === userData?.numeroH);
                                const logoSrc = selectedGroup.logoUrl
                                  ? (selectedGroup.logoUrl.startsWith('http') ? selectedGroup.logoUrl : `${API_BASE}${selectedGroup.logoUrl}`)
                                  : null;
                                return (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setShowQuartierMenu(true)}
                                      className="relative w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden cursor-pointer"
                                      title="Voir les infos du quartier"
                                    >
                                      {logoSrc ? (
                                        <img src={logoSrc} alt="Logo du quartier" className="w-full h-full object-cover" />
                                      ) : (
                                        (selectedGroup.title || selectedGroup.name || '?').charAt(0).toUpperCase()
                                      )}
                                      {uploadingLogo && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] leading-none">…</div>
                                      )}
                                    </button>
                                    {canEditLogo && (
                                      <input
                                        ref={quartierLogoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingLogo}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleLogoUpload(file);
                                          e.target.value = '';
                                        }}
                                      />
                                    )}
                                  </>
                                );
                              })()}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm truncate">{selectedGroup.title || selectedGroup.name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {selectedGroup.members?.length ?? 0} membre{(selectedGroup.members?.length ?? 0) > 1 ? 's' : ''}
                                </p>
                              </div>
                              {Array.isArray(selectedGroup.members) && selectedGroup.members.length > 0 && (
                                <div className="flex -space-x-2 flex-shrink-0">
                                  {selectedGroup.members.slice(0, 4).map((member: any, index: number) => {
                                    const isObject = member && typeof member === 'object';
                                    const prenom = isObject ? (member.prenom as string | undefined) : undefined;
                                    const photo = isObject ? (member.photo as string | undefined) : undefined;
                                    const initiale = (prenom || '?').charAt(0).toUpperCase();
                                    return (
                                      <div key={index} title={prenom || `Membre ${index + 1}`} className="w-8 h-8 rounded-full bg-emerald-200 border-2 border-gray-700 overflow-hidden flex items-center justify-center text-xs font-bold text-emerald-800 flex-shrink-0">
                                        {photo ? <img src={photo} alt={initiale} className="w-full h-full object-cover" /> : initiale}
                                      </div>
                                    );
                                  })}
                                  {selectedGroup.members.length > 4 && (
                                    <div className="w-8 h-8 rounded-full bg-gray-600 border-2 border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300 flex-shrink-0">
                                      +{selectedGroup.members.length - 4}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {isAdmin && groups.length > 1 && (
                              <div className="flex gap-2 overflow-x-auto px-3 pb-2">
                                {groups.map((g, idx) => {
                                  const avatarColors = ['bg-emerald-500','bg-blue-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-teal-500'];
                                  const bg = avatarColors[idx % avatarColors.length];
                                  return (
                                    <button
                                      key={g.id}
                                      onClick={() => { setSelectedGroup(g); setActiveCanal(null); setMessages([]); }}
                                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                                        selectedGroup?.id === g.id ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                      }`}
                                    >
                                      <span className={`w-4 h-4 rounded-full ${bg} flex items-center justify-center text-[9px] font-bold text-white`}>
                                        {(g.title || g.name || '?').charAt(0).toUpperCase()}
                                      </span>
                                      {g.title || g.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Filtres par catégorie — barre scrollable horizontale */}
                          <div className="border-b border-gray-100 bg-white px-3 py-2 overflow-x-auto flex-shrink-0">
                            <div className="flex gap-1.5 min-w-max">
                              <button
                                type="button"
                                onClick={() => setFeedFilter('all')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${feedFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                              >
                                💬 Tout ({messages.length})
                              </button>
                              {CANAL_SECTIONS.map(section =>
                                section.canaux.map(canal => {
                                  const count = messages.filter((m: ResidenceMessage) => (m.category || 'information') === canal.id).length;
                                  const isActive = feedFilter === canal.id;
                                  const colors = getCanalColors(canal.color);
                                  return (
                                    <button
                                      key={canal.id}
                                      type="button"
                                      onClick={() => setFeedFilter(isActive ? 'all' : canal.id)}
                                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${isActive ? colors.header + ' text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                      {canal.icon} {canal.label}
                                      {count > 0 && (
                                        <span className={`flex items-center gap-0.5 ${isActive ? 'text-white' : 'text-red-600'}`}>
                                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-white' : 'bg-red-500'}`} />
                                          <span className="text-[9px] font-bold">{count}</span>
                                        </span>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Zone des messages */}
                          <div className="flex-1 overflow-y-auto p-3 bg-gray-50" style={{ minHeight: '220px' }}>
                            {(() => {
                              const filtered = feedFilter === 'all'
                                ? messages
                                : messages.filter((m: ResidenceMessage) => (m.category || 'information') === feedFilter);
                              if (filtered.length === 0) {
                                return (
                                  <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="text-5xl mb-3">
                                      {feedFilter === 'all' ? '💬' : (CANAL_SECTIONS.flatMap(s => s.canaux).find(c => c.id === feedFilter)?.icon || '💬')}
                                    </span>
                                    <p className="text-sm font-medium text-gray-500">
                                      {feedFilter === 'all' ? 'Aucun message pour le moment.' : 'Aucun message dans cette catégorie.'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 italic">Soyez le premier à publier !</p>
                                  </div>
                                );
                              }
                              return filtered.map((msg: ResidenceMessage) => {
                                const isMyMessage = msg.numeroH === userData?.numeroH;
                                const canalData = CANAL_SECTIONS.flatMap(s => s.canaux).find(c => c.id === (msg.category || 'information'));
                                const categoryData = QUARTIER_CATEGORIES.find(c => c.id === (msg.category || 'information'));
                                const colors = getCanalColors(canalData?.color || 'blue');
                                const toMediaUrl = (url: string) => url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? url : '/' + url}`;
                                return (
                                  <div key={msg.id} className={`mb-4 flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[82%] rounded-2xl shadow-sm overflow-hidden border-2 bg-white ${
                                      isMyMessage ? 'border-emerald-300' : 'border-gray-100'
                                    }`}>
                                      {/* Bannière colorée — grande icône + nom de catégorie visible sans lire */}
                                      <div className={`${colors.header} px-4 py-2.5 flex items-center gap-3`}>
                                        <span className="text-3xl leading-none">{canalData?.icon || categoryData?.icon || 'ℹ️'}</span>
                                        <span className="text-white font-bold text-sm tracking-wide uppercase">
                                          {canalData?.label || categoryData?.label || 'Information'}
                                        </span>
                                      </div>
                                      {/* Contenu */}
                                      <div className="px-4 py-3">
                                        <p className={`text-[11px] font-bold mb-1.5 ${isMyMessage ? 'text-right text-emerald-600' : 'text-emerald-600'}`}>
                                          {isMyMessage ? 'Moi' : msg.authorName}
                                        </p>
                                        {(msg.type === 'text' || msg.messageType === 'text') && msg.content && (
                                          <p className="text-sm leading-relaxed text-gray-800">{msg.content}</p>
                                        )}
                                        {(msg.type === 'image' || msg.messageType === 'image') && msg.mediaUrl && (
                                          <img src={toMediaUrl(msg.mediaUrl)} alt="Image" className="max-w-full h-auto rounded-lg" />
                                        )}
                                        {(msg.type === 'video' || msg.messageType === 'video') && msg.mediaUrl && (
                                          <video src={toMediaUrl(msg.mediaUrl)} controls className="max-w-full h-auto rounded-lg" />
                                        )}
                                        {(msg.type === 'audio' || msg.messageType === 'audio') && msg.mediaUrl && (
                                          <audio src={toMediaUrl(msg.mediaUrl)} controls className="w-full" />
                                        )}
                                        <div className="flex items-center justify-end gap-2 mt-2">
                                          {(msg.type === 'text' || msg.messageType === 'text') && msg.content && (
                                            <button
                                              onClick={() => openShare(msg)}
                                              className="text-[10px] text-gray-400 hover:text-emerald-600 font-semibold"
                                              title="Partager vers un niveau au-dessus"
                                            >
                                              ↗️ Partager
                                            </button>
                                          )}
                                          <p className={`text-[10px] ${isMyMessage ? 'text-emerald-500' : 'text-gray-400'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                            <div ref={messagesEndRef} />
                          </div>

                          {/* Zone de publication */}
                          {canPublishHere ? (
                            <div className="border-t border-gray-200 bg-white flex-shrink-0">
                              {/* Grille de catégories — s'ouvre uniquement quand on appuie sur l'icône */}
                              {showCategoryGrid && (
                                <div className="px-3 pt-3 pb-2 border-b border-gray-100">
                                  <div className="grid grid-cols-3 gap-2">
                                    {QUARTIER_CATEGORIES.map(cat => {
                                      const cd = CANAL_SECTIONS.flatMap(s => s.canaux).find(c => c.id === cat.id);
                                      const cl = getCanalColors(cd?.color || 'blue');
                                      const selected = newMessage.category === cat.id;
                                      return (
                                        <button
                                          key={cat.id}
                                          type="button"
                                          onClick={() => {
                                            setNewMessage({...newMessage, category: cat.id});
                                            setShowCategoryGrid(false);
                                          }}
                                          className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 transition-all ${
                                            selected ? `${cl.bg} ${cl.border} ${cl.text}` : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                          }`}
                                        >
                                          <span className="text-2xl leading-none">{cat.icon}</span>
                                          <span className="text-[10px] font-semibold text-center leading-tight">{cat.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {/* Barre de saisie compacte */}
                              <div className="flex gap-2 items-center px-3 py-3">
                                {/* Zone centrale : texte (avec la catégorie et la pièce jointe intégrées
                                    dedans, à gauche et à droite), média prêt à envoyer, ou enregistrement
                                    vocal en cours */}
                                {newMessage.messageType === 'audio' && !newMessage.mediaFile ? (
                                  <div className="flex-1 min-w-0">
                                    <AudioRecorder compact maxDuration={10} onAudioRecorded={(blob) => {
                                      const file = new File([blob], 'vocal.webm', { type: blob.type });
                                      setNewMessage({...newMessage, messageType: 'audio', mediaFile: file});
                                    }} />
                                  </div>
                                ) : newMessage.mediaFile ? (
                                  <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-full">
                                    <span className="text-sm text-green-700 flex-1 truncate">
                                      {newMessage.messageType === 'audio' ? '🎙️ Audio prêt' : newMessage.messageType === 'video' ? '🎥 Vidéo prête' : '📷 Photo prête'}
                                    </span>
                                    <button type="button" onClick={() => setNewMessage({...newMessage, messageType: 'text', mediaFile: null})} className="text-red-500 text-xs font-medium flex-shrink-0">✕</button>
                                    <button
                                      type="button"
                                      onClick={() => { sendMessage(); setShowCategoryGrid(false); }}
                                      className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                                      title="Envoyer"
                                    >
                                      ✓
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex-1 min-w-0 relative">
                                    {/* Catégorie — affiche l'icône choisie, ouvre/ferme la grille, intégrée dans le champ */}
                                    {(() => {
                                      const cd = CANAL_SECTIONS.flatMap(s => s.canaux).find(c => c.id === newMessage.category);
                                      const cl = getCanalColors(cd?.color || 'blue');
                                      const cat = QUARTIER_CATEGORIES.find(c => c.id === newMessage.category);
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => setShowCategoryGrid(!showCategoryGrid)}
                                          title="Choisir le type de publication"
                                          className={`absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-colors ${
                                            showCategoryGrid ? `${cl.bg}` : 'hover:bg-gray-200'
                                          }`}
                                        >
                                          <span className="text-lg leading-none">{cat?.icon || '📰'}</span>
                                        </button>
                                      );
                                    })()}
                                    <input
                                      type="text"
                                      value={newMessage.content}
                                      onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                                      onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); setShowCategoryGrid(false); } }}
                                      placeholder={`${QUARTIER_CATEGORIES.find(c => c.id === newMessage.category)?.label || 'Information'}...`}
                                      className="w-full min-w-0 pl-12 pr-20 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm bg-gray-50"
                                    />
                                    {/* Pièce jointe (photo ou vidéo) — intégrée dans le champ, type détecté automatiquement */}
                                    <label
                                      className="absolute right-10 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-lg leading-none text-gray-500 hover:text-gray-700 cursor-pointer"
                                      title="Envoyer une photo ou une vidéo"
                                    >
                                      📷
                                      <input
                                        type="file"
                                        accept="image/*,video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0] || null;
                                          e.target.value = '';
                                          if (!file) return;
                                          if (file.type.startsWith('video/')) {
                                            const url = URL.createObjectURL(file);
                                            const videoEl = document.createElement('video');
                                            videoEl.preload = 'metadata';
                                            videoEl.onloadedmetadata = () => {
                                              URL.revokeObjectURL(url);
                                              if (videoEl.duration > MAX_VIDEO_SECONDS + 0.5) {
                                                alert(`Vidéo trop longue : ${Math.round(videoEl.duration)} secondes.\nMaximum autorisé : ${MAX_VIDEO_SECONDS} secondes.`);
                                                return;
                                              }
                                              setNewMessage(prev => ({...prev, messageType: 'video', mediaFile: file}));
                                            };
                                            videoEl.onerror = () => { URL.revokeObjectURL(url); alert('Impossible de lire cette vidéo.'); };
                                            videoEl.src = url;
                                          } else {
                                            setNewMessage(prev => ({...prev, messageType: 'image', mediaFile: file}));
                                          }
                                        }}
                                      />
                                    </label>
                                    {/* Envoyer — intégré dans le champ */}
                                    <button
                                      type="button"
                                      onClick={() => { sendMessage(); setShowCategoryGrid(false); }}
                                      disabled={!newMessage.content.trim()}
                                      title="Envoyer"
                                      className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white flex items-center justify-center text-sm font-bold transition-colors"
                                    >
                                      ✓
                                    </button>
                                  </div>
                                )}

                                {/* Message vocal */}
                                {newMessage.messageType !== 'audio' && !newMessage.mediaFile && (
                                  <button
                                    type="button"
                                    onClick={() => setNewMessage({...newMessage, messageType: 'audio', mediaFile: null})}
                                    className="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gray-200 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 flex items-center justify-center text-xl leading-none transition-colors"
                                    title="Envoyer un message vocal"
                                  >
                                    🎤
                                  </button>
                                )}
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
                      )}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 md:p-4 rounded overflow-hidden">
                  <p className="text-[10px] sm:text-xs md:text-sm text-yellow-800 font-bold break-words">⚠️ Aucun lieu de résidence enregistré</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Sous-préfecture */}
        {activeTab === 'sous-prefecture' && (() => {
          const name = userSousPrefecture?.name || userData?.sousPrefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level3.label : 'Sous-préfecture');
          const loc = userData?.sousPrefectureCode || userData?.sousPrefecture || name;
          return (
            <div className="space-y-3">
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">🏛️</span>
                  <span>{name}</span>
                </h2>
                {(userData?.sousPrefectureCode || userData?.sousPrefecture || isAdmin) ? (
                  <DeveloppementSection scope="sous-prefecture" location={loc} locationName={name} isJournalist={isJournalist} isAdmin={isAdmin} higherLevels={higherLevelsFrom('sous-prefecture')} />
                ) : (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                    <p className="text-xs text-yellow-800 font-bold">⚠️ Aucune sous-préfecture enregistrée</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 3. Préfecture */}
        {activeTab === 'prefecture' && (() => {
          const name = userPrefecture?.name || userData?.prefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level2.label : 'Préfecture');
          const loc = userData?.prefectureCode || userData?.prefecture || name;
          return (
            <div className="space-y-3">
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">🏢</span>
                  <span>{name}</span>
                </h2>
                {(userData?.prefectureCode || userData?.prefecture || isAdmin) ? (
                  <DeveloppementGouvernemental scope="prefecture" location={loc} locationName={name} isJournalist={isJournalist} isAdmin={isAdmin} higherLevels={higherLevelsFrom('prefecture')} />
                ) : (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                    <p className="text-xs text-yellow-800 font-bold">⚠️ Aucune préfecture enregistrée</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 4. Région */}
        {activeTab === 'region' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">{getRegionIcon(userData?.regionCode, userRegion?.name || userData?.region || userData?.regionOrigine)}</span>
                <span>{userRegion?.name || userData?.region || userData?.regionOrigine || 'Région'}</span>
              </h2>
              {(userData?.regionCode || userData?.region || isAdmin) ? (
                <DeveloppementGouvernemental
                  scope="region"
                  location={userData?.regionCode || userData?.region || userData?.regionOrigine || 'region'}
                  locationName={userRegion?.name || userData?.region || userData?.regionOrigine || 'Région'}
                  isJournalist={isJournalist}
                  isAdmin={isAdmin}
                  higherLevels={higherLevelsFrom('region')}
                />
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-xs text-yellow-800 font-bold">⚠️ Aucune région enregistrée</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Pays */}
        {activeTab === 'pays' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">{effectiveCountry ? getCountryFlag(userData?.paysCode || effectiveCountry.code, effectiveCountry.name) : '🏳️'}</span>
                <span>{effectiveCountry?.name || userData?.pays || 'Pays'}</span>
              </h2>
              {(effectiveCountry || userData?.pays || isAdmin) ? (
                <DeveloppementGouvernemental
                  scope="pays"
                  location={userData?.paysCode || effectiveCountry?.code || userData?.pays || 'pays'}
                  locationName={effectiveCountry?.name || userData?.pays || 'Pays'}
                  isJournalist={isJournalist}
                  isAdmin={isAdmin}
                  higherLevels={higherLevelsFrom('pays')}
                />
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-xs text-yellow-800 font-bold">⚠️ Aucun pays enregistré</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Continent */}
        {activeTab === 'continent' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">{effectiveContinent ? getContinentIcon(userData?.continentCode || effectiveContinent.code, effectiveContinent.name) : getContinentIcon(undefined, undefined)}</span>
                <span>{effectiveContinent?.name || userData?.continent || 'Continent'}</span>
              </h2>
              {(effectiveContinent || userData?.continent || isAdmin) ? (
                <DeveloppementGouvernemental
                  scope="continent"
                  location={userData?.continentCode || effectiveContinent?.code || userData?.continent || 'continent'}
                  locationName={effectiveContinent?.name || userData?.continent || 'Continent'}
                  isJournalist={isJournalist}
                  isAdmin={isAdmin}
                  higherLevels={higherLevelsFrom('continent')}
                />
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-xs text-yellow-800 font-bold">⚠️ Aucun continent enregistré</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. Mondial */}
        {activeTab === 'mondial' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🌎</span>
                <span>Mondial</span>
              </h2>
              <DeveloppementGouvernemental scope="mondial" location="mondial" locationName="Monde" isJournalist={isJournalist} isAdmin={isAdmin} />
            </div>
          </div>
        )}

      </div>

      {/* Page entière — Infos du quartier (ouverte en cliquant sur sa photo,
          comme la photo de profil, pour ne pas mélanger ça avec le chat) */}
      {showQuartierMenu && selectedGroup && (() => {
        const canEditLogo = isAdmin || (selectedGroup.admin && selectedGroup.admin === userData?.numeroH);
        const logoSrc = selectedGroup.logoUrl
          ? (selectedGroup.logoUrl.startsWith('http') ? selectedGroup.logoUrl : `${API_BASE}${selectedGroup.logoUrl}`)
          : null;
        return (
          <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
            <div className="bg-gray-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setShowQuartierMenu(false)} aria-label="Retour" className="text-3xl leading-none">‹</button>
              <h2 className="font-bold text-base truncate">{selectedGroup.title || selectedGroup.name}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center gap-5">
              <label className={`relative w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-3xl overflow-hidden ${canEditLogo ? 'cursor-pointer' : ''}`}>
                {logoSrc ? (
                  <img src={logoSrc} alt="Logo du quartier" className="w-full h-full object-cover" />
                ) : (
                  (selectedGroup.title || selectedGroup.name || '?').charAt(0).toUpperCase()
                )}
                {canEditLogo && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs leading-none opacity-0 hover:opacity-100 transition-opacity">
                    {uploadingLogo ? '…' : '📷'}
                  </div>
                )}
              </label>
              {canEditLogo && (
                <button
                  onClick={() => quartierLogoInputRef.current?.click()}
                  className="text-emerald-700 text-sm font-semibold -mt-3"
                >
                  📷 Changer la photo
                </button>
              )}
              <p className="text-gray-500 text-sm -mt-2">
                {selectedGroup.members?.length ?? 0} membre{(selectedGroup.members?.length ?? 0) > 1 ? 's' : ''}
              </p>
              <div className="w-full max-w-sm space-y-3">
                <button
                  onClick={() => { setShowQuartierMenu(false); setShowMembersList(true); }}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl shadow border border-gray-200"
                >
                  <span className="flex items-center gap-3 font-bold text-gray-800 text-sm">👥 Liste des membres</span>
                  <span className="text-gray-400">›</span>
                </button>
                <button
                  onClick={() => { setShowQuartierMenu(false); quartierDevRef.current?.openCaisse(); }}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl shadow"
                >
                  <span className="flex items-center gap-3 font-bold text-white text-sm">💰 Caisse</span>
                  <span className="text-white/80">›</span>
                </button>
                <button
                  onClick={() => { setShowQuartierMenu(false); livreQuartierRef.current?.open(); }}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-700 to-amber-600 rounded-xl shadow"
                >
                  <span className="flex items-center gap-3 font-bold text-white text-sm">📚 Livre</span>
                  <span className="text-white/80">›</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {selectedGroup && (
        <LivreQuartier
          ref={livreQuartierRef}
          scope="quartier"
          location={selectedGroup.location || ''}
          locationName={selectedGroup.title || selectedGroup.name || ''}
          canPublish={isJournalist || isAdmin}
        />
      )}

      {/* Modal — Partager un message vers un niveau au-dessus */}
      {shareMsg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShareMsg(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">↗️ Partager</h2>
              <button onClick={() => setShareMsg(null)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5 line-clamp-3">{shareMsg.content}</p>
              {shareChecking ? (
                <div className="text-center text-sm text-gray-400 py-4">Vérification des droits...</div>
              ) : shareLevels.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Tu n'as le droit de publier à aucun niveau au-dessus pour l'instant.</p>
              ) : (
                <div className="space-y-1.5">
                  {shareLevels.map(lvl => {
                    const key = `${lvl.scope}:${lvl.location}`;
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 py-1">
                        <input
                          type="checkbox"
                          checked={shareSelected.has(key)}
                          onChange={() => toggleShareLevel(key)}
                          className="w-4 h-4 accent-emerald-600"
                        />
                        {lvl.label}
                      </label>
                    );
                  })}
                </div>
              )}
              <button
                onClick={confirmShare}
                disabled={shareSending || shareSelected.size === 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {shareSending ? 'Partage...' : 'Partager'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Liste des membres du quartier */}
      {showMembersList && selectedGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowMembersList(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">👥 Membres du quartier</h2>
                <p className="text-emerald-200 text-xs mt-0.5">{selectedGroup.members?.length ?? 0} personne{(selectedGroup.members?.length ?? 0) > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowMembersList(false)} className="text-white text-2xl font-bold leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-3">
              {Array.isArray(selectedGroup.members) && selectedGroup.members.length > 0 ? (
                selectedGroup.members.map((member: any, index: number) => {
                  const isObject = member && typeof member === 'object';
                  if (!isObject) return null;
                  const prenom = member.prenom as string | undefined;
                  const nomFamille = member.nomFamille as string | undefined;
                  const photo = member.photo as string | undefined;
                  const initiale = (prenom || '?').charAt(0).toUpperCase();
                  return (
                    <div key={index} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-emerald-600 px-4 py-3 flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-emerald-200 overflow-hidden flex items-center justify-center text-2xl font-bold text-emerald-800 flex-shrink-0 border-2 border-white">
                          {photo ? <img src={photo} alt={initiale} className="w-full h-full object-cover" /> : initiale}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-base truncate">{prenom} {nomFamille}</p>
                          {member.numeroH && (
                            <p className="text-emerald-200 text-xs font-mono mt-0.5">NuméroH : {String(member.numeroH).split(' ')[0]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">Aucun membre trouvé</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

