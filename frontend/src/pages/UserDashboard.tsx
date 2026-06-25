import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isMasterAdmin, getPhotoUrl, getNumeroHForDisplay } from "../utils/auth";
import { useI18n } from "../i18n/useI18n";
import { SalesIcon } from "../components/icons/SalesIcon";
import NotificationBell from "../components/NotificationBell";
import { FavorisDropdown, FavorisDropdownItem } from "../components/FavorisDropdown";
import DefaultAvatar from "../assets/default-avatar.svg";

// Onglets du dashboard — chargés uniquement quand l'onglet est actif
const TerreAdam = lazy(() => import("./TerreAdam"));
const FamilleTab = lazy(() => import("./famille/Famille"));
const EchangesProfessionnel = lazy(() => import("../components/EchangesProfessionnel").then(m => ({ default: m.EchangesProfessionnel })));
const Services = lazy(() => import("./Services"));

const TabLoader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  generation: string;
  ethnie: string;
  region: string;
  photo?: string;
  manPhoto?: string;
  familyPhoto?: string;
  photoPreview?: string;
  logo?: string;
  role?: string;
  isAdmin?: boolean;
  email?: string;
  pays?: string;
  nationalite?: string;
  prenomPere?: string;
  prenomMere?: string;
  numeroHPere?: string;
  numeroHMere?: string;
  genre?: string;
  dateNaissance?: string;
  age?: number;
  telephone?: string;
  tel1?: string;
  [key: string]: string | number | boolean | undefined;
}

interface UserLogo {
  id: string;
  logoId: string;
  numeroH: string;
  note?: string;
  assignedAt: string;
  logo: {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    category: string;
  };
}

interface TabIcon {
  className?: string;
  size?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  type: "link" | "tab" | "drawer";
  path?: string;
  useSvg?: boolean;
  SvgIcon?: React.ComponentType<TabIcon>;
}

const FAVORITE_STORAGE_KEY = "dashboard_favorite";

function getFavoritePage(numeroH: string): string | null {
  try {
    const raw = localStorage.getItem(`${FAVORITE_STORAGE_KEY}_${numeroH}`);
    return raw || null;
  } catch {
    return null;
  }
}

function setFavoritePage(numeroH: string, pageId: string) {
  try {
    localStorage.setItem(`${FAVORITE_STORAGE_KEY}_${numeroH}`, pageId);
  } catch (e) {
    console.warn("Impossible de sauvegarder la page d'accueil", e);
  }
}

// Liste des ids pour initialiser l'onglet par défaut depuis la page favorite
const TAB_IDS = ["famille", "terre-adam", "echanges"];

function getInitialTab() {
  try {
    const s = localStorage.getItem("session_user");
    if (!s) return "terre-adam";
    const u = (JSON.parse(s).userData || JSON.parse(s)) as { numeroH?: string };
    if (!u?.numeroH) return "terre-adam";
    const fav = getFavoritePage(u.numeroH);
    return fav && TAB_IDS.includes(fav) ? fav : "terre-adam";
  } catch {
    return "terre-adam";
  }
}

export function UserDashboard() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userLogos, setUserLogos] = useState<UserLogo[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<UserLogo | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fonction pour charger les données utilisateur depuis localStorage
  const loadUserData = () => {
    const sessionData = JSON.parse(
      localStorage.getItem("session_user") || "{}",
    );
    const user = sessionData.userData || sessionData;
    if (!user.numeroH) {
      navigate("/login");
      return;
    }
    setUserData(user as UserData);
  };

  useEffect(() => {
    loadUserData();
    loadUserLogos();

    // Écouter les mises à jour de session (ex: après modification de profil/photo)
    const handleSessionUpdate = () => loadUserData();
    window.addEventListener("session-updated", handleSessionUpdate);
    return () => window.removeEventListener("session-updated", handleSessionUpdate);
  }, [navigate]);

  // Appliquer la page d'accueil favorite (après connexion ou à l'ouverture de /compte)
  useEffect(() => {
    if (!userData?.numeroH) return;
    const favoriteId = getFavoritePage(userData.numeroH);
    if (!favoriteId) return;

    const item = navItems.find((i) => i.id === favoriteId);
    if (!item) return;

    const fromLogin = (location.state as { fromLogin?: boolean })?.fromLogin === true;

    if (item.type === "link" && item.path && fromLogin) {
      navigate(item.path, { replace: true, state: {} });
      return;
    }
    if (item.type === "tab") {
      setActiveTab(item.id);
    }
    if (fromLogin) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [userData?.numeroH]);

  const loadUserLogos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/logos/my-logos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserLogos(data.logos || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des logos:', error);
    }
  };

  // Navigation unifiée : liens + onglets dans une seule barre
  // Ordre : Famille → Terre Adam → Échanges → Services
  const navItems: NavItem[] = [
    { id: "famille",    label: t('nav.famille'),    icon: "👨‍👩‍👧‍👦", type: "tab" },
    { id: "terre-adam", label: t('nav.terre_adam'), icon: "🌍",       type: "tab" },
    { id: "echanges",   label: t('nav.echanges'),   icon: "⚖️",       type: "tab", useSvg: true, SvgIcon: SalesIcon },
    { id: "services",   label: t('nav.services'),   icon: "💼",       type: "tab" },
  ];

  if (!userData) {
    return (
      <div className="user-dashboard bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-10 gap-0.5 xs:gap-1 sm:gap-1.5 lg:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg xs:rounded-xl shadow-sm min-h-[44px] xs:min-h-[52px] sm:min-h-[64px] animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleNavClick = (item: NavItem) => {
    if (item.type === "link" && item.path) {
      navigate(item.path);
    } else if (item.type === "tab") {
      setActiveTab(item.id);
    }
  };

  return (
    <div className="user-dashboard bg-gray-50 dark:bg-gray-900 min-h-screen overflow-x-hidden">

      {/* ── Header sticky : carte profil compacte + navigation ── */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">

        {/* Ligne profil compacte — toujours visible */}
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3">

          {/* Avatar cliquable */}
          <button
            className="relative flex-shrink-0 cursor-pointer group"
            onClick={() => navigate("/moi/profil")}
            title="Voir mon profil"
          >
            {(() => {
              const rawPhoto =
                userData.photo ||
                (userData as any).manPhoto ||
                (userData as any).familyPhoto;
              const photoUrl = getPhotoUrl(rawPhoto);
              return (
                <img
                  src={photoUrl || DefaultAvatar}
                  alt="Photo de profil"
                  width="44"
                  height="44"
                  loading="eager"
                  fetchPriority="high"
                  className="w-11 h-11 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 group-hover:opacity-90 transition-opacity"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes("default-avatar")) {
                      target.src = DefaultAvatar;
                      return;
                    }
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector(".avatar-placeholder")) {
                      const placeholder = document.createElement("div");
                      placeholder.className =
                        "avatar-placeholder w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg";
                      placeholder.textContent = userData.prenom?.charAt(0) || "👤";
                      parent.appendChild(placeholder);
                    }
                  }}
                />
              );
            })()}
            {userData.logo && (
              <div className="absolute -bottom-1 -right-1 text-xs leading-none">
                {getLogoIcon(userData.logo)}
              </div>
            )}
          </button>

          {/* Nom + NuméroH */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {userData.prenom} {userData.nomFamille}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
              {getNumeroHForDisplay(userData.numeroH, true, false)}
            </p>
          </div>

          {/* Badges + admin */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {userLogos.slice(0, 3).map((userLogo) => {
              if (!userLogo?.logo) return null;
              return (
                <button
                  key={userLogo.id}
                  onClick={() => setSelectedLogo(userLogo)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
                  style={{
                    backgroundColor: `${userLogo.logo.color}20`,
                    borderColor: userLogo.logo.color || '#10B981',
                    color: userLogo.logo.color || '#10B981',
                    fontSize: '16px'
                  }}
                  title={userLogo.logo.name}
                >
                  {userLogo.logo.icon}
                </button>
              );
            })}
            {isMasterAdmin(userData) && (
              <button
                onClick={() => navigate("/admin")}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-base"
                aria-label="Administration"
              >
                👑
              </button>
            )}
          </div>
        </div>

        {/* Onglets de navigation */}
        <div className="max-w-7xl mx-auto flex border-t border-gray-100 dark:border-gray-800">
          {navItems.map((item) => {
            const isActive = item.type === "tab" && activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-0.5
                  py-2 px-1 relative cursor-pointer border-b-[3px] transition-colors duration-150
                  min-h-[52px]
                  ${isActive
                    ? "border-blue-600 dark:border-blue-400"
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
                  }
                `}
              >
                {item.useSvg && item.SvgIcon ? (
                  <item.SvgIcon
                    className={`w-6 h-6 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
                    size={24}
                  />
                ) : (
                  <span className={`text-2xl leading-none ${isActive ? "" : "grayscale-[30%]"}`}>
                    {item.icon}
                  </span>
                )}
                <span className={`text-[9px] xs:text-[10px] font-semibold leading-tight truncate max-w-full
                  ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}
                `}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal badge de valeur */}
      {selectedLogo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedLogo(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border-4"
              style={{
                backgroundColor: `${selectedLogo.logo.color}20`,
                borderColor: selectedLogo.logo.color || '#10B981'
              }}
            >
              {selectedLogo.logo.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {selectedLogo.logo.name}
            </h3>
            {selectedLogo.note ? (
              <p className="text-gray-800 font-medium text-sm leading-relaxed">
                {selectedLogo.note}
              </p>
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed">
                {selectedLogo.logo.description}
              </p>
            )}
            <button
              onClick={() => setSelectedLogo(null)}
              className="mt-5 px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: selectedLogo.logo.color || '#10B981' }}
            >
              {t('btn.close')}
            </button>
          </div>
        </div>
      )}

      {/* Contenu des onglets — lazy chargés à la demande */}
      <div className="dashboard-content max-w-7xl mx-auto">
        <Suspense fallback={<TabLoader />}>
          {renderTabContent(activeTab, userData)}
        </Suspense>
      </div>

    </div>
  );
}

function getLogoIcon(logo: string) {
  const logos: Record<string, string> = {
    "roi-grand": "👑",
    "roi-moyen": "👑",
    "roi-petit": "👑",
    savant: "📖",
    prophete: "🌙",
    riche: "🥇",
  };
  return logos[logo] || "⭐";
}


function renderTabContent(tab: string, userData: UserData) {
  switch (tab) {
    case "famille":
      return <FamilleTab />;
    case "terre-adam":
      return <TerreAdam />;
    case "services":
      return <Services />;
    case "echanges":
      return <EchangesProfessionnel userData={userData as any} />;
    default:
      return <TerreAdam />;
  }
}

export default UserDashboard;
