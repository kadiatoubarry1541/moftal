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
import DeveloppementSection, { type DeveloppementSectionHandle } from '../components/DeveloppementSection';
import LivreQuartier, { type LivreQuartierHandle } from '../components/LivreQuartier';
import ReglesLocalite, { type ReglesLocaliteHandle } from '../components/ReglesLocalite';
import ResidenceProofs, { type ResidenceProofsHandle } from '../components/ResidenceProofs';
import ProfileBadge from '../components/ProfileBadge';
import DeveloppementGouvernemental from '../components/DeveloppementGouvernemental';
import { useI18n } from '../i18n/useI18n';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

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

// Normalise un nom de lieu : minuscule + sans accents → "TÉLIKO" = "teliko" = "Téliko"
function normalizeLoc(str: string): string {
  return str.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function TerreAdam() {
  const { t } = useI18n();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'lieux' | 'sous-prefecture' | 'prefecture' | 'region' | 'pays' | 'continent' | 'mondial'>('lieux');
  type LieuTabId = 'quartier-1' | 'quartier-2' | 'quartier-3';
  const [activeLieuTab, setActiveLieuTab] = useState<LieuTabId>('quartier-1');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // ✅ Étiquettes dynamiques pour afficher les véritables noms des lieux
  const [tabLabels, setTabLabels] = useState<string>(t('terre_adam.default_quartier'));
  
  // États pour les groupes de quartier (infos + outils — la messagerie
  // elle-même vit désormais dans le bouton flottant).
  const [groups, setGroups] = useState<ResidenceGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ResidenceGroup | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // ✅ Vérifier si l'utilisateur est journaliste
  const [isJournalist, setIsJournalist] = useState(false);
  const [filterScope, setFilterScope] = useState<'all' | 'quartier'>('quartier');
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
  const reglesQuartierRef = useRef<ReglesLocaliteHandle>(null);
  const residenceProofsRef = useRef<ResidenceProofsHandle>(null);


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
      label: userSousPrefecture?.name || userData?.sousPrefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level3.label : t('terre_adam.default_commune'))
    },
    {
      scope: 'prefecture',
      location: userData?.prefectureCode || userData?.prefecture || '',
      label: userPrefecture?.name || userData?.prefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level2.label : t('terre_adam.default_prefecture'))
    },
    {
      scope: 'region',
      location: userData?.regionCode || userData?.region || userData?.regionOrigine || '',
      label: userRegion?.name || userData?.region || userData?.regionOrigine || t('terre_adam.default_region')
    },
    {
      scope: 'pays',
      location: userData?.paysCode || effectiveCountry?.code || userData?.pays || '',
      label: effectiveCountry?.name || userData?.pays || t('terre_adam.default_pays')
    },
    {
      scope: 'continent',
      location: userData?.continentCode || effectiveContinent?.code || userData?.continent || '',
      label: effectiveContinent?.name || userData?.continent || t('terre_adam.default_continent')
    },
    { scope: 'mondial', location: 'mondial', label: t('terre_adam.default_mondial') },
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
      : (user.lieu1 || user.quartier || t('terre_adam.default_quartier'));
    setTabLabels(quartierName || t('terre_adam.default_quartier'));

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
      setGroups([]);
      loadGroups();
    } else {
      setLoading(false);
    }
  }, [activeTab, activeLieuTab, userData, filterScope]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('terre_adam.loading')}</p>
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
            label: userSousPrefecture?.name || userData?.sousPrefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level3.label : t('terre_adam.default_commune'))
          },
          {
            id: 'prefecture',
            icon: '🏢',
            label: userPrefecture?.name || userData?.prefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level2.label : t('terre_adam.default_prefecture'))
          },
          {
            id: 'region',
            icon: getRegionIcon(userData?.regionCode, userRegion?.name || userData?.region || userData?.regionOrigine),
            label: userRegion?.name || userData?.region || userData?.regionOrigine || t('terre_adam.default_region')
          },
          {
            id: 'pays',
            icon: effectiveCountry ? getCountryFlag(userData?.paysCode || effectiveCountry.code, effectiveCountry.name) : '🏳️',
            label: effectiveCountry?.name || userData?.pays || t('terre_adam.default_pays')
          },
          {
            id: 'continent',
            icon: effectiveContinent ? getContinentIcon(userData?.continentCode || effectiveContinent.code, effectiveContinent.name) : '🌐',
            label: effectiveContinent?.name || userData?.continent || t('terre_adam.default_continent')
          },
          { id: 'mondial', icon: '🌎', label: t('terre_adam.default_mondial') }
        ];
        return (
          <header style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 40, borderBottom: '2px solid #1e293b', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            {/* Retour + titre + badge du niveau actif */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => navigate('/compte')}
                  aria-label={t('services.back_aria')}
                  style={{ background: 'none', color: 'white', border: 'none', padding: 0, cursor: 'pointer', fontSize: 34, fontWeight: 700, lineHeight: 1, opacity: 1 }}
                >
                  ‹
                </button>
                <h1 style={{ color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: '-0.2px', margin: 0, lineHeight: 1 }}>🌍 {t('terre_adam.title')}</h1>
              </div>
            </div>

            {/* Les 7 niveaux propres à Terre ADAM — tous sur une seule ligne fixe, largeur égale, jamais de défilement, remontée contre le titre */}
            <div className="flex gap-1" style={{ padding: '0 6px 1px', marginTop: -10 }}>
              {navTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0 px-0.5 py-0 text-[7px] font-bold transition leading-none"
                  style={{
                    borderRadius: 8,
                    background: activeTab === tab.id ? '#1a8f1a' : 'rgba(255,255,255,0.06)',
                    color: activeTab === tab.id ? 'white' : '#94a3b8',
                  }}
                >
                  <span className={`text-[10px] leading-none transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>{tab.icon}</span>
                  <span className="truncate max-w-full leading-none">{tab.label}</span>
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
                                <p className="text-sm text-gray-500">{t('terre_adam.no_group')}</p>
                              </>
                            ) : (
                              <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                            )}
                          </div>
                        ) : (
                        /* ── Infos du groupe + accès aux outils du quartier.
                             La messagerie elle-même vit dans le bouton flottant. ── */
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">

                          {/* En-tête : nom du quartier + membres + sélecteur admin */}
                          <div className="bg-gray-800 text-white flex-shrink-0">
                            <div className="px-4 py-[4px] flex items-center gap-3 relative">
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
                                      title={t('terre_adam.view_group_info')}
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
                                      onClick={() => setSelectedGroup(g)}
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

                          {/* Accès aux outils du quartier (Projets/Caisse, Livre, Règles,
                              Preuves de résidence, liste des membres) — la messagerie
                              elle-même se trouve désormais dans le bouton flottant. */}
                          <button
                            type="button"
                            onClick={() => setShowQuartierMenu(true)}
                            className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <span className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                              🧰 {t('terre_adam.view_group_info')}
                            </span>
                            <span className="text-gray-400">›</span>
                          </button>
                        </div>
                      )}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 md:p-4 rounded overflow-hidden">
                  <p className="text-[10px] sm:text-xs md:text-sm text-yellow-800 font-bold break-words">{t('terre_adam.no_lieu_residence')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Commune (sous-préfecture) */}
        {activeTab === 'sous-prefecture' && (() => {
          const name = userSousPrefecture?.name || userData?.sousPrefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level3.label : t('terre_adam.default_commune'));
          const loc = userData?.sousPrefectureCode || userData?.sousPrefecture || name;
          return (
            <div className="space-y-3">
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
                {(userData?.sousPrefectureCode || userData?.sousPrefecture || isAdmin) ? (
                  <DeveloppementGouvernemental scope="sous-prefecture" location={loc} locationName={name} isJournalist={isJournalist} isAdmin={isAdmin} higherLevels={higherLevelsFrom('sous-prefecture')} />
                ) : (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                    <p className="text-xs text-yellow-800 font-bold">{t('terre_adam.no_commune')}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 3. Préfecture */}
        {activeTab === 'prefecture' && (() => {
          const name = userPrefecture?.name || userData?.prefecture || (userData?.pays ? getCountryGeoLabels(userData.pays).level2.label : t('terre_adam.default_prefecture'));
          const loc = userData?.prefectureCode || userData?.prefecture || name;
          return (
            <div className="space-y-3">
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
                {(userData?.prefectureCode || userData?.prefecture || isAdmin) ? (
                  <DeveloppementGouvernemental scope="prefecture" location={loc} locationName={name} isJournalist={isJournalist} isAdmin={isAdmin} higherLevels={higherLevelsFrom('prefecture')} />
                ) : (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                    <p className="text-xs text-yellow-800 font-bold">{t('terre_adam.no_prefecture')}</p>
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
              {(userData?.regionCode || userData?.region || isAdmin) ? (
                <DeveloppementGouvernemental
                  scope="region"
                  location={userData?.regionCode || userData?.region || userData?.regionOrigine || 'region'}
                  locationName={userRegion?.name || userData?.region || userData?.regionOrigine || t('terre_adam.default_region')}
                  isJournalist={isJournalist}
                  isAdmin={isAdmin}
                  higherLevels={higherLevelsFrom('region')}
                />
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-xs text-yellow-800 font-bold">{t('terre_adam.no_region')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Pays */}
        {activeTab === 'pays' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              {(effectiveCountry || userData?.pays || isAdmin) ? (
                <DeveloppementGouvernemental
                  scope="pays"
                  location={userData?.paysCode || effectiveCountry?.code || userData?.pays || 'pays'}
                  locationName={effectiveCountry?.name || userData?.pays || t('terre_adam.default_pays')}
                  isJournalist={isJournalist}
                  isAdmin={isAdmin}
                  higherLevels={higherLevelsFrom('pays')}
                />
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-xs text-yellow-800 font-bold">{t('terre_adam.no_pays')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Continent */}
        {activeTab === 'continent' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              {(effectiveContinent || userData?.continent || isAdmin) ? (
                <DeveloppementGouvernemental
                  scope="continent"
                  location={userData?.continentCode || effectiveContinent?.code || userData?.continent || 'continent'}
                  locationName={effectiveContinent?.name || userData?.continent || t('terre_adam.default_continent')}
                  isJournalist={isJournalist}
                  isAdmin={isAdmin}
                  higherLevels={higherLevelsFrom('continent')}
                />
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-xs text-yellow-800 font-bold">{t('terre_adam.no_continent')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. Mondial */}
        {activeTab === 'mondial' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
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
              <button onClick={() => setShowQuartierMenu(false)} aria-label={t('btn.back')} className="text-3xl leading-none">‹</button>
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
                  <span className="flex items-center gap-3 font-bold text-gray-800 text-sm">{t('terre_adam.members_list')}</span>
                  <span className="text-gray-400">›</span>
                </button>
                {canEditLogo && (
                  <button
                    onClick={() => quartierLogoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl shadow border border-gray-200 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-3 font-bold text-gray-800 text-sm">{t('terre_adam.group_photo')}</span>
                    <span className="text-gray-400">›</span>
                  </button>
                )}
                <button
                  onClick={() => { setShowQuartierMenu(false); quartierDevRef.current?.openCaisse(); }}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl shadow"
                >
                  <span className="flex items-center gap-3 font-bold text-white text-sm">{t('terre_adam.caisse')}</span>
                  <span className="text-white/80">›</span>
                </button>
                <button
                  onClick={() => { setShowQuartierMenu(false); livreQuartierRef.current?.open(); }}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-700 to-amber-600 rounded-xl shadow"
                >
                  <span className="flex items-center gap-3 font-bold text-white text-sm">{t('terre_adam.livre')}</span>
                  <span className="text-white/80">›</span>
                </button>
                <button
                  onClick={() => { setShowQuartierMenu(false); residenceProofsRef.current?.openMine(); }}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl shadow border border-gray-200"
                >
                  <span className="flex items-center gap-3 font-bold text-gray-800 text-sm">📄 {t('terre_adam.my_residence_proof')}</span>
                  <span className="text-gray-400">›</span>
                </button>

                <button
                  onClick={() => { setShowQuartierMenu(false); reglesQuartierRef.current?.open(); }}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl shadow border border-gray-200"
                >
                  <span className="flex items-center gap-3 font-bold text-gray-800 text-sm">{t('terre_adam.rules')}</span>
                  <span className="text-gray-400">›</span>
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

      {selectedGroup && (
        <ResidenceProofs
          ref={residenceProofsRef}
          groupId={selectedGroup.id}
          myNumeroH={userData?.numeroH || ''}
        />
      )}

      <ReglesLocalite ref={reglesQuartierRef} title={t('terre_adam.rules_title')} />

      {/* Modal — Partager un message vers un niveau au-dessus */}
      {/* Modal — Liste des membres du quartier */}
      {showMembersList && selectedGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowMembersList(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">{t('terre_adam.group_members')}</h2>
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
                  const canViewMemberProofs = isAdmin || (selectedGroup.admin && selectedGroup.admin === userData?.numeroH);
                  return (
                    <div key={index} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-emerald-600 px-4 py-3 flex items-center gap-3">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <div className="w-16 h-16 rounded-full bg-emerald-200 overflow-hidden flex items-center justify-center text-2xl font-bold text-emerald-800 border-2 border-white">
                            {photo ? <img src={photo} alt={initiale} className="w-full h-full object-cover" /> : initiale}
                          </div>
                          {member.numeroH && (
                            <div className="absolute -bottom-1 -right-1">
                              <ProfileBadge
                                numeroH={member.numeroH}
                                prenom={prenom}
                                nomFamille={nomFamille}
                                activite1={member.activite1}
                                vitrinePhoto1={member.vitrinePhoto1}
                                vitrinePhoto2={member.vitrinePhoto2}
                                vitrineVideo={member.vitrineVideo}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-base truncate">{prenom} {nomFamille}</p>
                          {member.numeroH && (
                            <p className="text-emerald-200 text-xs font-mono mt-0.5">{t('terre_adam.numeroh_prefix')} {String(member.numeroH).split(' ')[0]}</p>
                          )}
                        </div>
                        {canViewMemberProofs && member.numeroH && (
                          <button
                            onClick={() => residenceProofsRef.current?.openMember({ numeroH: member.numeroH, prenom, nomFamille })}
                            className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          >
                            📄 {t('terre_adam.view_proofs_btn')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">{t('terre_adam.no_member_found')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

