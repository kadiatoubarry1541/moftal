import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isMasterAdmin, getPhotoUrl, getNumeroHForDisplay } from "../utils/auth";
import { ActivityPageIcon } from "../components/icons/ActivityPageIcon";
import { SalesIcon } from "../components/icons/SalesIcon";
import NotificationBell from "../components/NotificationBell";
import DefaultAvatar from "../assets/default-avatar.svg";

// Onglets du dashboard — chargés uniquement quand l'onglet est actif
const Activite = lazy(() => import("./Activite"));
const Education = lazy(() => import("./Education"));
const TerreAdam = lazy(() => import("./TerreAdam"));
const HistoireHumanite = lazy(() => import("./HistoireHumanite"));
const Science = lazy(() => import("./Science"));
const EchangesProfessionnel = lazy(() => import("../components/EchangesProfessionnel").then(m => ({ default: m.EchangesProfessionnel })));

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
  type: "link" | "tab";
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
const TAB_IDS = ["terre-adam", "activite", "echanges", "histoire", "science", "education"];

function getInitialTab() {
  try {
    const s = localStorage.getItem("session_user");
    if (!s) return "histoire";
    const u = (JSON.parse(s).userData || JSON.parse(s)) as { numeroH?: string };
    if (!u?.numeroH) return "histoire";
    const fav = getFavoritePage(u.numeroH);
    // Si l'utilisateur a une page favorite, on l'utilise ; sinon "histoire" (léger, sans carte)
    return fav && TAB_IDS.includes(fav) ? fav : "histoire";
  } catch {
    return "histoire";
  }
}

export function UserDashboard() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userLogos, setUserLogos] = useState<UserLogo[]>([]);
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
  // Ordre : Famille → Terre Adam → Solidarité → Activité → Échanges → Temps → Santé → Sécurité → Science → Éducation
  const navItems: NavItem[] = [
    { id: "famille", label: "Famille", icon: "👨‍👩‍👧‍👦", type: "link", path: "/famille" },
    { id: "terre-adam", label: "Terre ADAM", icon: "🌍", type: "tab" },
    { id: "solidarite", label: "Solidarité", icon: "🤝", type: "link", path: "/solidarite" },
    { id: "activite", label: "Activité", icon: "📊", type: "tab", useSvg: true, SvgIcon: ActivityPageIcon },
    { id: "sante", label: "Santé", icon: "🏥", type: "link", path: "/sante" },
    { id: "securite", label: "Sécurité", icon: "🛡️", type: "link", path: "/securite" },
    { id: "echanges", label: "Échanges", icon: "⚖️", type: "tab", useSvg: true, SvgIcon: SalesIcon },
    { id: "histoire", label: "Temps", icon: "🧭", type: "tab" },
    { id: "science", label: "Science", icon: "⚛️", type: "tab" },
    { id: "education", label: "Éducation", icon: "🎓", type: "tab" },
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
      {/* Barre supérieure: Favoris, Notifications, Déconnexion */}
      <div className="flex items-center justify-end px-3 xs:px-4 sm:px-6 pt-3 sm:pt-4 mb-3 sm:mb-4 gap-2">
        {userData && (
          <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <span className="whitespace-nowrap">⭐ Favoris</span>
            <select
              value={getFavoritePage(userData.numeroH) || "terre-adam"}
              onChange={(e) => {
                const id = e.target.value;
                setFavoritePage(userData.numeroH, id);
                const item = navItems.find((i) => i.id === id);
                if (item?.type === "tab") {
                  setActiveTab(id);
                } else if (item?.type === "link" && item.path) {
                  navigate(item.path);
                }
              }}
              className="min-h-[36px] pl-2 pr-6 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              aria-label="Page d'accueil favorite"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.icon} {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <NotificationBell />
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-sm border-none cursor-pointer"
        >
          <span>↩</span>
          <span className="hidden xs:inline">Déconnexion</span>
          <span className="xs:hidden">Quitter</span>
        </button>
      </div>

      {/* En-tête profil – pleine largeur sur mobile, compact sur desktop */}
      <div className="dashboard-header px-3 xs:px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="profile-card w-full sm:w-fit max-w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-row items-center gap-4 flex-wrap">
            <div className="user-avatar relative flex-shrink-0">
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
                    width="64"
                    height="64"
                    loading="eager"
                    fetchPriority="high"
                    className="profile-photo profile-photo--compact"
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
                        placeholder.className = "avatar-placeholder";
                        placeholder.textContent =
                          userData.prenom?.charAt(0) || "👤";
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                );
              })()}
              {userData.logo && (
                <div className={`status-logo ${userData.logo}`}>
                  {getLogoIcon(userData.logo)}
                </div>
              )}
              {userLogos.slice(0, 2).map((userLogo, index) => {
                if (!userLogo?.logo) return null;
                const angle = (index * 90) - 45;
                const radius = 22;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                return (
                  <div
                    key={userLogo.id}
                    className="absolute w-5 h-5 rounded-full bg-white border border-white shadow flex items-center justify-center text-xs"
                    title={userLogo.logo.name}
                    style={{
                      borderColor: userLogo.logo.color || '#10B981',
                      bottom: `${8 + y}px`,
                      right: `${8 - x}px`,
                      zIndex: 10,
                      color: userLogo.logo.color || '#10B981'
                    }}
                  >
                    {userLogo.logo.icon}
                  </div>
                );
              })}
            </div>
            <div className="user-details flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {userData.prenom} {userData.nomFamille}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                    userData.role === "admin" || userData.isAdmin
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {userData.role === "admin" || userData.isAdmin ? "Administrateur" : "Utilisateur"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  NuméroH: {getNumeroHForDisplay(userData.numeroH, true, false)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5 items-center">
                <button
                  onClick={() => navigate("/moi/profil")}
                  className="min-h-[36px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                >
                  Mon profil
                </button>
                {isMasterAdmin(userData) && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="min-h-[36px] w-10 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
                    aria-label="Administration"
                  >
                    👑
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation principale ─────────────────────────────────────────
          10 boutons toujours visibles sur UNE seule ligne, sans scroll.
          grid-cols-10 sur tous les écrans → chaque bouton = 10% de la largeur
      ────────────────────────────────────────────────────────────────── */}
      <div className="dashboard-tabs px-1 xs:px-2 sm:px-4 lg:px-8 max-w-7xl mx-auto mt-3">
        <div className="grid grid-cols-10 gap-0.5 xs:gap-1 sm:gap-1.5 lg:gap-2">
          {navItems.map((item) => {
            const isActive = item.type === "tab" && activeTab === item.id;
            const isLink = item.type === "link";

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`
                  w-full border-none cursor-pointer transition-all duration-200 rounded-lg xs:rounded-xl
                  flex flex-col items-center justify-center
                  gap-0 xs:gap-0.5
                  p-1 xs:p-1.5 sm:p-2 lg:p-3
                  min-h-[44px] xs:min-h-[52px] sm:min-h-[64px] lg:min-h-[68px]
                  ${isActive
                    ? "bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-300 dark:ring-blue-700"
                    : isLink
                    ? "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 shadow-sm"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                  }
                `}
              >
                {/* Icône */}
                {item.useSvg && item.SvgIcon ? (
                  <item.SvgIcon
                    className={`flex-shrink-0 w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 ${
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-300"
                    }`}
                    size={16}
                  />
                ) : (
                  <span className="flex-shrink-0 text-base xs:text-lg sm:text-xl lg:text-2xl leading-none">
                    {item.icon}
                  </span>
                )}

                {/* Label */}
                <span className={`
                  font-medium leading-tight text-center w-full truncate
                  text-[7px] xs:text-[8px] sm:text-[10px] lg:text-xs
                  ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-200"}
                `}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu des onglets — lazy chargés à la demande */}
      <div className="dashboard-content px-3 xs:px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
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
    case "terre-adam":
      return <TerreAdam />;
    case "activite":
      return <Activite />;
    case "echanges":
      return <EchangesProfessionnel userData={userData as any} />;
    case "histoire":
      return <HistoireHumanite />;
    case "science":
      return <Science />;
    case "education":
      return <Education />;
    default:
      return <TerreAdam />;
  }
}

export default UserDashboard;
