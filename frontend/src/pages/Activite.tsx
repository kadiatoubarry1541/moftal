import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { config } from '../config/api';
import ProSection from '../components/ProSection';
import PaymentModal from '../components/PaymentModal';
import { isAdmin } from '../utils/auth';
import { isActivityBlocked } from '../utils/activityIcons';
import { ActivityIcon } from '../components/ActivityIconBadge';
import { hideIncrement } from '../utils/formatNumeroH';

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
  // Nom réel de l'activité (ex: "Santé") — déterminé par le profil de chaque membre,
  // pas par le slot (Activité1/2/3) : tout le monde qui fait "Santé" est dans le même groupe
  activity: string;
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

export default function Activite({ embedded = false }: { embedded?: boolean } = {}) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'Activité1' | 'Activité2' | 'Activité3'>('Activité1');

  // Pays sélectionné — par défaut = pays de l'utilisateur connecté
  const [selectedPays, setSelectedPays] = useState<string>('');

  const [groups, setGroups] = useState<ActivityGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ActivityGroup | null>(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [blockedActivity, setBlockedActivity] = useState(false);
  const [activityMessages, setActivityMessages] = useState<any[]>([]);
  const messagesEndRefActivity = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Formulaire dédié aux outils
  const [toolForm, setToolForm] = useState({ nom: '', description: '' });

  // Carte outil cliquable — URL ouvre le lien, app name → recherche Google
  const renderToolCard = (msg: any) => {
    const content = msg.content || '';
    const dashIdx = content.indexOf(' — ');
    const nom = dashIdx > -1 ? content.substring(0, dashIdx) : content;
    const description = dashIdx > -1 ? content.substring(dashIdx + 3) : '';
    const isUrl = /^https?:\/\//i.test(nom.trim());
    const openUrl = isUrl ? nom.trim() : `https://www.google.com/search?q=${encodeURIComponent(nom.trim())}`;
    const publisherName = msg.authorName || '';
    const publisherNumero = hideIncrement(msg.numeroH || '');

    return (
      <div key={msg.id} className="mb-3 bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="p-4 flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">{isUrl ? '🌐' : '📱'}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm break-all">{nom}</h4>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Publié par <strong>{publisherName}</strong> · {publisherNumero}
            </p>
          </div>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            {isUrl ? '🔗 Ouvrir' : '🔍 Rechercher'}
          </a>
        </div>
      </div>
    );
  };

  // Garde paiement Info Moftal
  const [outilsAcces, setOutilsAcces] = useState<boolean | null>(null);
  const [outilsPayLoading, setOutilsPayLoading] = useState(false);
  const [showOutilsModal, setShowOutilsModal] = useState(false);
  const [prixInfoMoftal, setPrixInfoMoftal] = useState<{ mois: number; an: number } | null>(null);
  const [showPaymentOutils, setShowPaymentOutils] = useState(false);
  const [periodeOutils, setPeriodeOutils] = useState<'mois' | 'an'>('mois');

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

      // Vérifier accès Info Moftal + charger les prix selon le pays
      const token = parsed.token || localStorage.getItem('token');
      if (token) {
        const base = API_BASE_URL.replace('/api', '');
        fetch(`${base}/api/payment/acces-outils`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(d => setOutilsAcces(!!d.aAcces)).catch(() => setOutilsAcces(false));
        fetch(`${base}/api/payment/prix-outils`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(d => { if (d.success) setPrixInfoMoftal({ mois: d.mois, an: d.an }); }).catch(() => {});

        // 🔄 Rafraîchir activite1/2/3 + specialite depuis le serveur :
        // la session locale peut être incomplète si elle a été créée avant
        // que ces activités soient renseignées dans le profil.
        fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            if (!d?.success || !d.user) return;
            const merged = { ...user, ...d.user };
            setUserData(merged);
            if (merged.activite1) setActiveTab('Activité1');
            else if (merged.activite2) setActiveTab('Activité2');
            else if (merged.activite3) setActiveTab('Activité3');

            try {
              const rawSession = localStorage.getItem("session_user");
              if (rawSession) {
                const parsedSession = JSON.parse(rawSession);
                if (parsedSession.userData) {
                  parsedSession.userData = { ...parsedSession.userData, ...d.user };
                } else {
                  Object.assign(parsedSession, d.user);
                }
                localStorage.setItem("session_user", JSON.stringify(parsedSession));
              }
            } catch { /* ignore */ }
          })
          .catch(() => { /* hors-ligne : on garde les données en cache */ });
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

  // Le groupe est déterminé par le NOM réel de l'activité (ex: "Santé") + le pays —
  // pas par le slot (Activité1/2/3) : tout le monde qui exerce "Santé" dans un même
  // pays appartient au même groupe, que ce soit leur activité 1, 2 ou 3.
  const getActivityName = (tab: 'Activité1' | 'Activité2' | 'Activité3'): string => {
    if (tab === 'Activité1') return userData?.activite1 || '';
    if (tab === 'Activité2') return userData?.activite2 || '';
    return userData?.activite3 || '';
  };

  const loadActivityGroups = useCallback(async () => {
    setIsLoadingGroup(true);
    // Utilise le nom réel de l'activité, ou un nom générique par défaut (ex : admin sans activités renseignées)
    const activityName = getActivityName(activeTab)
      || (activeTab === 'Activité1' ? 'Activité 1' : activeTab === 'Activité2' ? 'Activité 2' : 'Activité 3');

    // Bloquer les activités interdites — aucun groupe ne sera créé ou affiché
    if (isActivityBlocked(activityName)) {
      setBlockedActivity(true);
      setGroups([]);
      setSelectedGroup(null);
      setIsLoadingGroup(false);
      return;
    }
    setBlockedActivity(false);

    try {
      const token = getToken();
      const paysParam = selectedPays ? `&pays=${encodeURIComponent(selectedPays)}` : '';
      const response = await fetch(`${API_BASE_URL}/activities/groups?activity=${encodeURIComponent(activityName)}${paysParam}`, {
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
                name: `${activityName}${selectedPays ? ` — ${selectedPays}` : ''}`,
                description: `Groupe d'activité ${activityName} pour les membres de ${selectedPays || 'la plateforme'}`,
                activity: activityName,
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
        if (groups.length > 0 && (!selectedGroup || selectedGroup.activity !== activityName)) {
          setSelectedGroup(groups[0]);
        } else if (groups.length > 0 && selectedGroup && selectedGroup.activity === activityName) {
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
          if (!selectedGroup || selectedGroup.activity !== activityName) {
            setSelectedGroup(defaultGroups[0]);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      const defaultGroups = getDefaultActivityGroups();
      setGroups(defaultGroups);
      if (defaultGroups.length > 0) {
        if (!selectedGroup || selectedGroup.activity !== activityName) {
          setSelectedGroup(defaultGroups[0]);
        }
      }
    } finally {
      setIsLoadingGroup(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedPays, userData?.activite1, userData?.activite2, userData?.activite3]);

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
      const response = await fetch(`${API_BASE_URL}/activities/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numeroH: userData?.numeroH
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

  const payerOutils = (periode: 'mois' | 'an') => {
    setPeriodeOutils(periode);
    setShowPaymentOutils(true);
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
    setSelectedGroup(null);
    loadActivityGroups();
  }, [activeTab, selectedPays, loadActivityGroups]);

  const activeActivityName = getActivityName(activeTab)
    || (activeTab === 'Activité1' ? 'Activité 1' : activeTab === 'Activité2' ? 'Activité 2' : 'Activité 3');
  const filteredGroups = groups.filter(group => group.activity === activeActivityName);

  return (
    <>
    <div className={embedded ? "bg-gray-50" : "min-h-screen bg-gray-50"}>
      {/* Header */}
      {!embedded && (
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🌐 Professionnel</h1>
            </div>
            <div className="flex space-x-4 items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Bandeau activité + pays (détection automatique selon le profil) */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Activité + spécialité */}
          {(() => {
            const currentActivityName = getActivityName(activeTab);
            if (!currentActivityName) return null;
            return (
              <span className="text-sm text-amber-700 flex items-center gap-1">
                🎯 <strong>{currentActivityName}</strong>
                {(userData as any)?.specialite && ` · ${(userData as any).specialite}`}
              </span>
            );
          })()}
          {isAdmin(userData) && (
            <span className="text-amber-500 text-xs ml-auto">
              {selectedPays
                ? `Vous voyez les groupes de ${selectedPays}`
                : 'Vous voyez tous les groupes de la plateforme'
              }
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="grid grid-cols-3 gap-2 py-1.5">
            {(() => {
              if (!userData) return null;

              // Un bouton n'apparaît que si l'utilisateur a renseigné cette
              // activité dans son profil ; son libellé est le nom réel
              // de l'activité (ex: "Santé"). L'admin voit toujours les 3
              // boutons (il a besoin de tout connaître), avec un libellé
              // par défaut sur les emplacements non renseignés.
              const allTabs = [
                { id: 'Activité1' as const, defaultLabel: 'Activité 1' },
                { id: 'Activité2' as const, defaultLabel: 'Activité 2' },
                { id: 'Activité3' as const, defaultLabel: 'Activité 3' }
              ];

              const filteredTabs = isAdmin(userData)
                ? allTabs
                : allTabs.filter((tab) => !!getActivityName(tab.id));

              if (filteredTabs.length === 0) {
                return (
                  <div className="col-span-3 py-3 text-center text-sm text-gray-500">
                    Aucune activité professionnelle. Ajoutez votre activité dans votre profil.
                  </div>
                );
              }

              return filteredTabs.map((tab) => {
                const activityName = getActivityName(tab.id) || tab.defaultLabel;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <ActivityIcon name={activityName} size={20} />
                    <span className="text-center leading-tight">{activityName}</span>
                  </button>
                );
              });
            })()}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Interface TOUJOURS visible — le contenu s'affiche dès l'ouverture.
                Les messages du groupe sont désormais dans la messagerie 💬
                flottante (visible automatiquement en l'ouvrant, pas besoin
                de bandeau explicatif ici). */}
            <div className="space-y-4">
              {/* Message de rejet activité interdite */}
              {blockedActivity && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">🚫</div>
                  <h3 className="font-black text-red-700 text-lg mb-2">Activité rejetée</h3>
                  <p className="text-red-600 text-sm mb-1">
                    Cette activité n'est pas autorisée sur la plateforme.
                  </p>
                  <p className="text-red-500 text-xs">
                    Les activités liées à la musique, chant, danse ou prostitution sont entièrement interdites.
                    Veuillez choisir une autre activité dans votre profil.
                  </p>
                </div>
              )}

              {!blockedActivity && <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
                {/* Zone des outils partagés — fonctionnalité payante (Pass Info Moftal), distincte de la messagerie */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-4" style={{ minHeight: '300px', maxHeight: 'calc(70vh - 200px)' }}>
                  {isLoadingGroup ? (
                    <div className="text-center py-12">
                      <div className="w-9 h-9 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Connexion au groupe…</p>
                    </div>
                  ) : (() => {
                    const filtered = activityMessages.filter((m: any) => (m.category || 'information') === 'outil');
                    return (
                      <>
                        <div className="mb-4 flex justify-center">
                          <Link to="/info-wallou" className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-700 to-slate-800 rounded-xl shadow-md border border-blue-500 max-w-xl w-full hover:brightness-110 transition-all group">
                            <span className="text-4xl group-hover:scale-110 transition-transform">📋</span>
                            <div className="flex-1">
                              <h3 className="font-bold text-white text-base">Info Moftal</h3>
                              <p className="text-sm text-blue-200">Créez des carreaux d'information avec photo, vidéo et audio</p>
                              <p className="text-xs text-blue-300 mt-1">Mariage · Baptême · Réunion · Santé · Décès</p>
                            </div>
                            <span className="text-white text-xl opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                          </Link>
                        </div>
                        <div className="mb-4 flex justify-center">
                          <Link to="/professeur-ia" className="flex items-center gap-4 p-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl shadow-md border border-cyan-400 max-w-xl w-full hover:brightness-110 transition-all group">
                            <span className="text-4xl group-hover:scale-110 transition-transform">🤖</span>
                            <div className="flex-1">
                              <h3 className="font-bold text-white text-base">IA Education Moftal</h3>
                              <p className="text-sm text-cyan-100">Posez vos questions en français, math et biologie, l'IA vous aide pas à pas.</p>
                            </div>
                            <span className="text-white text-xl opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                          </Link>
                        </div>
                        {filtered.length === 0
                          ? <div className="text-center text-gray-500 py-6"><p>Aucun outil partagé. Proposez une ressource !</p></div>
                          : filtered.map((msg: any) => renderToolCard(msg))}
                      </>
                    );
                  })()}
                  <div ref={messagesEndRefActivity} />
                </div>

                {/* Zone de saisie — disponible dès que le groupe est prêt */}
                {!isLoadingGroup && selectedGroup && (
                  <div className="bg-gray-200 px-4 py-2 border-t">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-blue-800">🛠️ Partager un outil</p>
                      <input type="text" value={toolForm.nom} onChange={(e) => setToolForm({ ...toolForm, nom: e.target.value })}
                        placeholder="Lien (https://...) ou nom d'application (ex: WhatsApp, Canva...)"
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <input type="text" value={toolForm.description} onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                        placeholder="Description (facultatif)"
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <button onClick={sendTool} disabled={!toolForm.nom.trim() || !selectedGroup}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        ✅ Partager l'outil
                      </button>
                    </div>
                  </div>
                )}
              </div>}
            </div>

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

  {/* ── Modal paiement pass Info Moftal ── */}
  {showOutilsModal && (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="font-black text-lg text-gray-900 mb-1">Pass Info Moftal</h3>
        <p className="text-sm text-gray-500 mb-4">
          Choisissez votre abonnement pour publier vos Info Moftal dans vos groupes d'Activité.
        </p>

        {/* Option mensuelle */}
        <button
          onClick={() => payerOutils('mois')}
          disabled={outilsPayLoading}
          className="w-full rounded-xl border-2 border-blue-300 px-4 py-3 mb-3 text-left hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-blue-900 text-base">
                {(prixInfoMoftal?.mois ?? 5000).toLocaleString('fr-GN')} GNF
              </p>
              <p className="text-xs text-blue-500">par mois · publications illimitées</p>
            </div>
            <span className="text-2xl">📅</span>
          </div>
        </button>

        {/* Option annuelle */}
        <button
          onClick={() => payerOutils('an')}
          disabled={outilsPayLoading}
          className="w-full rounded-xl border-2 border-green-300 px-4 py-3 mb-4 text-left hover:bg-green-50 transition-colors disabled:opacity-50 relative"
        >
          <div className="absolute -top-2 right-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Économique
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-green-900 text-base">
                {(prixInfoMoftal?.an ?? 50000).toLocaleString('fr-GN')} GNF
              </p>
              <p className="text-xs text-green-600">par an · économisez 2 mois</p>
            </div>
            <span className="text-2xl">📆</span>
          </div>
        </button>

        {outilsPayLoading && <p className="text-sm text-blue-500 mb-2">⏳ Redirection vers le paiement...</p>}
        <button onClick={() => setShowOutilsModal(false)} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Annuler</button>
        <p className="text-xs text-gray-300 mt-2">Paiement sécurisé · Orange Money · MTN MoMo · Carte</p>
      </div>
    </div>
  )}

  {showPaymentOutils && (
    <PaymentModal
      isOpen={showPaymentOutils}
      onClose={() => setShowPaymentOutils(false)}
      onSuccess={() => {
        setShowPaymentOutils(false);
        setShowOutilsModal(false);
        setOutilsAcces(true);
      }}
      amount={periodeOutils === 'mois' ? (prixInfoMoftal?.mois ?? 5000) : (prixInfoMoftal?.an ?? 50000)}
      currency="GNF"
      purpose={periodeOutils === 'mois' ? 'publication_outil_mois' : 'publication_outil_an'}
      description={`Pass Info Moftal — par ${periodeOutils === 'mois' ? 'mois' : 'an'}`}
    />
  )}
    </>
  );
}