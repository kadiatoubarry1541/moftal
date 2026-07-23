import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useI18n } from "./i18n/useI18n";
import { LANG_LABELS } from "./i18n/strings";
import { getSessionUser, isAdmin, isMasterAdmin, getPhotoUrl, getNumeroHForDisplay } from "./utils/auth";
import { config } from "./config/api";
import DefaultAvatar from "./assets/default-avatar.svg";
import NotificationBell from "./components/NotificationBell";
import InstallAppButton from "./components/InstallAppButton";
import GestionPaymentGate from "./components/GestionPaymentGate";
import { FavorisDropdown, FavorisDropdownItem } from "./components/FavorisDropdown";
import { SalesIcon } from "./components/icons/SalesIcon";

// Page d'accueil — chargée immédiatement (première vue de l'utilisateur)
import { Home } from "./pages/Home";

// Toutes les autres pages — lazy (chargées à la demande)
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const LoginMembre = lazy(() => import("./pages/LoginMembre").then(m => ({ default: m.LoginMembre })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const Account = lazy(() => import("./pages/Account").then(m => ({ default: m.Account })));
const RegistrationChoice = lazy(() => import("./pages/RegistrationChoice").then(m => ({ default: m.RegistrationChoice })));
const FloatingGuideIA = lazy(() => import("./components/FloatingGuideIA").then(m => ({ default: m.FloatingGuideIA })));

// Pages secondaires — lazy loaded (chargées à la demande)
const LivingWizard = lazy(() => import("./pages/living/LivingWizard").then(m => ({ default: m.LivingWizard })));
const DeceasedWizard = lazy(() => import("./pages/deceased/DeceasedWizard").then(m => ({ default: m.DeceasedWizard })));
const Moi = lazy(() => import("./pages/Moi").then(m => ({ default: m.Moi })));
const MonProfil = lazy(() => import("./pages/MonProfil"));
const Famille = lazy(() => import("./pages/famille/Famille"));
const Parents = lazy(() => import("./pages/famille/Parents"));
const Partenaire = lazy(() => import("./pages/famille/Partenaire"));
const Arbre = lazy(() => import("./pages/famille/Arbre"));
const Membres = lazy(() => import("./pages/famille/Membres"));
const Enfants = lazy(() => import("./pages/famille/Enfants"));
const MesAmours = lazy(() => import("./pages/famille/MesAmours"));
const FamilleAdmin = lazy(() => import("./pages/famille/FamilleAdmin"));
const Inspir = lazy(() => import("./pages/famille/Inspir"));
const Noyau = lazy(() => import("./pages/famille/Noyau"));
const Foyer = lazy(() => import("./pages/famille/Foyer"));
const Probleme = lazy(() => import("./pages/Probleme"));
const Journalistes = lazy(() => import("./pages/Journalistes"));
const Transport = lazy(() => import("./pages/Transport"));
const Mosquee = lazy(() => import("./pages/Mosquee"));
const Madrasa = lazy(() => import("./pages/Madrasa"));
const Beaute = lazy(() => import("./pages/Beaute"));
const Artisans = lazy(() => import("./pages/Artisans"));
const Sante = lazy(() => import("./pages/Sante"));
const Securite = lazy(() => import("./pages/Securite"));
const Services = lazy(() => import("./pages/Services"));
const Solidarite = lazy(() => import("./pages/Solidarite"));
const Identite = lazy(() => import("./pages/Identite"));
const Activite = lazy(() => import("./pages/Activite"));
const Education = lazy(() => import("./pages/Education"));
const Ecoles = lazy(() => import("./pages/Ecoles"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminBadges = lazy(() => import("./pages/AdminBadges"));
const AdminModeration = lazy(() => import("./pages/AdminModeration"));
const AdminPoints = lazy(() => import("./pages/AdminPoints"));
const AdminRetraits = lazy(() => import("./pages/AdminRetraits"));
const AcheterPoints = lazy(() => import("./pages/AcheterPoints"));
const TerreAdam = lazy(() => import("./pages/TerreAdam"));
const ARetenir = lazy(() => import("./pages/ARetenir"));
const HistoireHumanite = lazy(() => import("./pages/HistoireHumanite"));
const EchangesProfessionnel = lazy(() => import("./components/EchangesProfessionnel").then(m => ({ default: m.EchangesProfessionnel })));
const EchangePrimaire = lazy(() => import("./pages/EchangePrimaire"));
const EchangeNourriture = lazy(() => import("./pages/EchangeNourriture"));
const EchangeMedicament = lazy(() => import("./pages/EchangeMedicament"));
const EchangeSecondaire = lazy(() => import("./pages/EchangeSecondaire"));
const EchangeTertiaire = lazy(() => import("./pages/EchangeTertiaire"));
const EchangeQuaternaire = lazy(() => import("./pages/EchangeQuaternaire"));
const EchangePublier = lazy(() => import("./pages/EchangePublier"));
const Science = lazy(() => import("./pages/Science"));
const Zaka = lazy(() => import("./pages/Zaka"));
const ProfesseurIA = lazy(() => import("./pages/ProfesseurIA"));
const InscriptionPro = lazy(() => import("./pages/InscriptionPro"));
const ListeProfessionnels = lazy(() => import("./pages/ListeProfessionnels"));
const MesComptesPro = lazy(() => import("./pages/MesComptesPro"));
const EspacePro = lazy(() => import("./pages/EspacePro"));
const MonEspacePro = lazy(() => import("./pages/MonEspacePro"));
const PrendreRendezVous = lazy(() => import("./pages/PrendreRendezVous"))
const InstallClientApp = lazy(() => import("./pages/InstallClientApp"))
const MesCours = lazy(() => import("./pages/MesCours"))
const GalerieFamily = lazy(() => import("./pages/GalerieFamily"));
const CompteFamille = lazy(() => import("./pages/CompteFamille"));
const MoftalPayPro = lazy(() => import("./pages/WalletPro"));
const PublierFormation = lazy(() => import("./pages/PublierFormation"));
const InfoWallou = lazy(() => import("./pages/InfoWallou"));
const ConditionsUtilisation = lazy(() => import("./pages/ConditionsUtilisation"));
const PolitiqueConfidentialite = lazy(() => import("./pages/PolitiqueConfidentialite"));
const PaiementResultat = lazy(() => import("./pages/PaiementResultat"));
const GestionInterne = lazy(() => import("./pages/GestionInterne"));
const GestionClinique = lazy(() => import("./pages/GestionClinique"));
const GestionMairie   = lazy(() => import("./pages/GestionMairie"));
const MaireVitrine    = lazy(() => import("./pages/MaireVitrine"));
const CliniqueVitrine = lazy(() => import("./pages/CliniqueVitrine"));
const CommerceVitrine = lazy(() => import("./pages/CommerceVitrine"));
const EspacePatientClinique = lazy(() => import("./pages/EspacePatientClinique"));
const GestionCommerce = lazy(() => import("./pages/GestionCommerce"));
const GestionVendeur  = lazy(() => import("./pages/GestionVendeur"));
const GestionBeauty   = lazy(() => import("./pages/GestionBeauty"));
const GestionArtisan  = lazy(() => import("./pages/GestionArtisan"));
const GestionProducer = lazy(() => import("./pages/GestionProducer"));
const GestionMosquee = lazy(() => import("./pages/GestionMosquee"));
const GestionReseau  = lazy(() => import("./pages/GestionReseau"));
const GestionEnseignement = lazy(() => import("./pages/GestionEnseignement"));
const GestionEntreprise   = lazy(() => import("./pages/GestionEntreprise"));
const GestionNgo          = lazy(() => import("./pages/GestionNgo"));
const GestionJournaliste  = lazy(() => import("./pages/GestionJournaliste"));
const GestionScientifique = lazy(() => import("./pages/GestionScientifique"));
const GestionFournisseur  = lazy(() => import("./pages/GestionFournisseur"));
const FournisseurVitrine  = lazy(() => import("./pages/FournisseurVitrine"));
const VendeurVitrine      = lazy(() => import("./pages/VendeurVitrine"));
const BeauteVitrine       = lazy(() => import("./pages/BeauteVitrine"));
const ArtisanVitrine      = lazy(() => import("./pages/ArtisanVitrine"));
const ProducteurVitrine   = lazy(() => import("./pages/ProducteurVitrine"));
const GestionSecurite     = lazy(() => import("./pages/GestionSecurite"));
const GestionImmobilier   = lazy(() => import("./pages/GestionImmobilier"));
const GestionRestaurant   = lazy(() => import("./pages/GestionRestaurant"));
const Immobilier          = lazy(() => import("./pages/Immobilier"));
const Restaurants         = lazy(() => import("./pages/Restaurants"));
const GestionTransport    = lazy(() => import("./pages/GestionTransport"));
const EcoleVitrine        = lazy(() => import("./pages/EcoleVitrine"));
const MadrasaVitrine      = lazy(() => import("./pages/MadrasaVitrine"));
const MosqueeVitrine      = lazy(() => import("./pages/MosqueeVitrine"));
const NgoVitrine          = lazy(() => import("./pages/NgoVitrine"));
const EntrepriseVitrine   = lazy(() => import("./pages/EntrepriseVitrine"));
const JournalisteVitrine  = lazy(() => import("./pages/JournalisteVitrine"));
const ScientifiqueVitrine = lazy(() => import("./pages/ScientifiqueVitrine"));
const SecuriteVitrine     = lazy(() => import("./pages/SecuriteVitrine"));
const ImmobilierVitrine   = lazy(() => import("./pages/ImmobilierVitrine"));
const RestaurantVitrine   = lazy(() => import("./pages/RestaurantVitrine"));
const TransportVitrine    = lazy(() => import("./pages/TransportVitrine"));
const ReseauVitrine       = lazy(() => import("./pages/ReseauVitrine"));
const ReseauImam = lazy(() => import("./pages/ReseauImam"));
const ReseauPro = lazy(() => import("./pages/ReseauPro"));
const MoftalPay = lazy(() => import("./pages/MoftalPay"));
const Quartier = lazy(() => import("./pages/Quartier"));
const Info = lazy(() => import("./pages/Info"));
const Developpement = lazy(() => import("./pages/Developpement"));
const Racines = lazy(() => import("./pages/Racines"));
const Antiquite = lazy(() => import("./pages/Antiquite"));
const Prehistoire = lazy(() => import("./pages/Prehistoire"));
const Guinee = lazy(() => import("./pages/Guinee"));
const BasseGuinee = lazy(() => import("./pages/BasseGuinee"));
const HauteGuinee = lazy(() => import("./pages/HauteGuinee"));
const FoutaDjallon = lazy(() => import("./pages/FoutaDjallon"));
const GuineeForestiere = lazy(() => import("./pages/GuineeForestiere"));
const Femmes = lazy(() => import("./pages/Femmes"));
const Hommes = lazy(() => import("./pages/Hommes"));
const Communaute = lazy(() => import("./pages/Communaute"));
const TrouverProfesseur = lazy(() => import("./pages/TrouverProfesseur"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const Activite1 = lazy(() => import("./pages/Activite1"));
const Activite2 = lazy(() => import("./pages/Activite2"));
const Activite3 = lazy(() => import("./pages/Activite3"));
const ZakaEtDons = lazy(() => import("./pages/ZakaEtDons"));
const GuideEntrepreneur = lazy(() => import("./pages/GuideEntrepreneur"));
const LivresDeDieu = lazy(() => import("./pages/LivresDeDieu"));
const Reflechissons = lazy(() => import("./pages/Reflechissons"));
const Donations = lazy(() => import("./pages/Donations").then(m => ({ default: m.Donations })));
const InscriptionFormation = lazy(() => import("./pages/InscriptionFormation"));
const Pays = lazy(() => import("./pages/Pays"));
const LieuResidence1 = lazy(() => import("./pages/LieuResidence1"));
const LieuResidence2 = lazy(() => import("./pages/LieuResidence2"));
const LieuResidence3 = lazy(() => import("./pages/LieuResidence3"));
const AdminGovernments = lazy(() => import("./pages/AdminGovernments"));
const GestionImam = lazy(() => import("./pages/GestionImam"));
const GestionMadrasa = lazy(() => import("./pages/GestionMadrasa"));
const GestionEcole = lazy(() => import("./pages/GestionEcole"));
const Commerce = lazy(() => import("./pages/Commerce"));
const Entreprise = lazy(() => import("./pages/Entreprise"));
const Fournisseurs = lazy(() => import("./pages/Fournisseurs"));
const Mairie = lazy(() => import("./pages/Mairie"));
const Reseau = lazy(() => import("./pages/Reseau"));
const Vendeurs = lazy(() => import("./pages/Vendeurs"));
const Producteurs = lazy(() => import("./pages/Producteurs"));

const LoadingBar = () => (
  <div className="fixed top-0 left-0 w-full h-1 z-[9999] bg-gray-200">
    <div className="h-full bg-blue-500" style={{ animation: 'loadingBar 1.2s ease-in-out infinite' }} />
  </div>
);

/** Page Zaka : réservée aux profils Islam (ou administrateurs), comme l'onglet Solidarité. */
function ZakaMuslimOnly() {
  const user = getSessionUser();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user) && user.religion !== "Islam") {
    return <Navigate to="/solidarite" replace />;
  }
  return <Zaka />;
}

const FAVORI_PAGES = [
  { id: "famille",    label: "Famille",    icon: "👨‍👩‍👧‍👦", path: "/famille" },
  { id: "terre-adam", label: "Terre Adam", icon: "🌍",       path: "/compte" },
  { id: "services",   label: "Services",   icon: "💼",       path: "/services" },
  { id: "echanges",   label: "Échanges",   icon: "🛒",       path: "/echange" },
];

function getFavoriKey(numeroH: string) { return `moftal_favori_${numeroH}`; }

function App() {
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const { pathname } = location;
  const [guideReady, setGuideReady] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const mastheadRef = useRef<HTMLDivElement>(null);
  const [showFavoriModal, setShowFavoriModal] = useState(false);

  useEffect(() => {
    if (!langOpen) return;
    const handle = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [langOpen]);

  // Différer le FloatingGuideIA après le premier rendu pour réduire le TBT initial
  useEffect(() => {
    const timer = setTimeout(() => setGuideReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Mesurer la hauteur du masthead dès qu'il est visible et à chaque redimensionnement
  useLayoutEffect(() => {
    const el = mastheadRef.current;
    if (!el) return;
    const update = () => {
      const h = el.offsetHeight;
      if (h > 0) document.documentElement.style.setProperty('--masthead-h', h + 'px');
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }); // pas de [] : re-mesure à chaque render (masthead peut apparaître/disparaître)

  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getSessionUser);
  const isLoggedIn = currentUser !== null;

  // Charger le profil depuis la base de données à chaque connexion
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${config.API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success && data.user) {
          const local = getSessionUser();
          const merged = { ...local, ...data.user };
          setCurrentUser(merged);
          // Sauvegarder le nouveau token renouvelé si le backend en fournit un
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
          try {
            const raw = localStorage.getItem("session_user");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.userData) parsed.userData = { ...parsed.userData, ...data.user };
              else Object.assign(parsed, data.user);
              if (data.token) parsed.token = data.token;
              localStorage.setItem("session_user", JSON.stringify(parsed));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Recharger le profil dès que la session change (ex: après modification dans EditProfileModal)
  useEffect(() => {
    const refresh = () => setCurrentUser(getSessionUser());
    window.addEventListener("session-updated", refresh);
    return () => window.removeEventListener("session-updated", refresh);
  }, []);

  // Recharger aussi à chaque changement de page (gère le logout, la première connexion…)
  useEffect(() => {
    setCurrentUser(getSessionUser());
  }, [pathname]);

  // Afficher le choix du favori à la première connexion
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.numeroH) return;
    const favori = localStorage.getItem(getFavoriKey(currentUser.numeroH));
    if (!favori) setShowFavoriModal(true);
  }, [isLoggedIn]);

  // Écouter l'événement "ouvrir la modal favori" depuis n'importe quelle page
  useEffect(() => {
    const handler = () => setShowFavoriModal(true);
    window.addEventListener('open-favori-modal', handler);
    return () => window.removeEventListener('open-favori-modal', handler);
  }, []);

  // Rediriger vers la page favorite après connexion
  useEffect(() => {
    if (!currentUser?.numeroH) return;
    const state = location.state as { fromLogin?: boolean } | null;
    if (pathname === '/compte' && state?.fromLogin) {
      const favori = localStorage.getItem(getFavoriKey(currentUser.numeroH));
      if (favori && favori !== '/compte') {
        navigate(favori, { replace: true });
      }
    }
  }, [pathname]);
  const isGestionMode = pathname.startsWith("/gestion");
  const isMoftalPayMode =
    pathname === "/compte-famille" ||
    pathname === "/moftal-pay-pro";
  const isVitrineMode =
    pathname.startsWith("/clinique/") ||
    pathname.startsWith("/commerce/") ||
    pathname.startsWith("/ecole/") ||
    pathname.startsWith("/madrasa/") ||
    pathname.startsWith("/mosquee/") ||
    pathname.startsWith("/imam/") ||
    pathname.startsWith("/ngo/") ||
    pathname.startsWith("/entreprise/") ||
    pathname.startsWith("/journaliste/") ||
    pathname.startsWith("/scientifique/") ||
    pathname.startsWith("/securite/") ||
    pathname.startsWith("/immobilier/") ||
    pathname.startsWith("/restaurant/") ||
    pathname.startsWith("/transport/") ||
    pathname.startsWith("/reseau-vitrine/") ||
    pathname.startsWith("/mairie/") ||
    pathname.startsWith("/fournisseur/") ||
    pathname.startsWith("/vendeur/") ||
    pathname.startsWith("/beaute-vitrine/") ||
    pathname.startsWith("/artisan/") ||
    pathname.startsWith("/producteur/");
  const isProfilPage = pathname === '/moi/profil';
  // Applis autonomes avec leur propre écran, logo et bouton d'installation —
  // le header/nav de l'app principale ne doit pas se superposer (pas de double
  // bouton "Installer", chacune reste une app à part comme Messenger/Facebook).
  const isStandaloneAppPage = pathname.startsWith('/professeur-ia') || pathname.startsWith('/info-wallou');
  const isFullscreenPage = isGestionMode || isVitrineMode || isProfilPage || isMoftalPayMode || isStandaloneAppPage;
  const isHome = pathname === "/";
  const isPublicPage = isHome ||
    pathname === "/login" ||
    pathname === "/login-membre" ||
    pathname.startsWith("/vivant") ||
    pathname === "/choix" ||
    pathname === "/inscription" ||
    pathname === "/mot-de-passe-oublie";
  const showFullHeader = !isLoggedIn || isHome;
  return (
    <div className={!isFullscreenPage ? "bg-gray-900 min-h-screen" : ""}>
    <GestionPaymentGate />
    <div className={`flex flex-col bg-stone-50 dark:bg-gray-900${!isFullscreenPage ? ' max-w-[500px] mx-auto shadow-2xl min-h-screen' : ''}${isHome ? ' h-screen overflow-hidden' : ''}`} style={{ overflowX: isHome ? undefined : 'clip' }}>
      {/* Header site principal — masqué en mode Espace Gestion ou Vitrine */}
      {/* ══ MASTHEAD STICKY — Logo + Carte Profil + Navigation (reste collé en haut comme Facebook) ══ */}
      {!isFullscreenPage && (
        <div ref={mastheadRef} className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-sm safe-area-inset-top">

          {/* Ligne 1 : Logo + Activité + Cloche */}
          <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-1">
            <div className="flex items-center justify-between gap-2">
              {/* Gauche : Logo */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isLoggedIn && !isPublicPage && (
                  <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity" aria-label="Accueil">
                    <div style={{ background: "white", borderRadius: 10, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src="/logo-moftal.svg" alt="Moftal" width="56" height="56" style={{ width: 56, height: 56, display: "block" }}/>
                    </div>
                  </Link>
                )}
              </div>

              {/* Droite : Activité + Cloche + Langue */}
              <div className="flex items-center gap-2 justify-end min-h-[44px]">
                {isLoggedIn && !isPublicPage && (
                  <button onClick={() => navigate('/gestion-interne?tab=activite')} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all border-none cursor-pointer shadow-sm">
                    <span className="text-base">🎯</span>
                    <span className="text-xs font-semibold text-gray-700">{t('header.manage_pro')}</span>
                  </button>
                )}
                {isLoggedIn && !isPublicPage && !pathname.startsWith("/espace-pro") && <InstallAppButton />}
                {isLoggedIn && !isPublicPage && <NotificationBell />}
                {(!isLoggedIn || isHome) && (
                  <div ref={langRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setLangOpen((o) => !o)}
                      className="min-h-[36px] flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                      aria-label={t('header.language')}
                      aria-haspopup="listbox"
                      aria-expanded={langOpen}
                    >
                      <span>{t('header.language')}</span>
                    </button>
                    {langOpen && (
                      <div
                        role="listbox"
                        className="absolute right-0 top-11 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700 z-50 overflow-hidden py-1"
                      >
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                          {t('header.language')}
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {Object.entries(LANG_LABELS).map(([code, label]) => (
                            <button
                              key={code}
                              type="button"
                              role="option"
                              aria-selected={lang === code}
                              onClick={() => { setLang(code as "fr" | "en" | "ar" | "man" | "pul"); setLangOpen(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                                lang === code
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              }`}
                            >
                              <span className="flex-1">{label}</span>
                              {lang === code && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ligne 2 : Carte Profil complète — visible uniquement sur /famille */}
          {isLoggedIn && !isPublicPage && currentUser && (pathname === '/famille' || pathname.startsWith('/famille/')) && (
            <div className="px-3 pt-1 pb-2 border-t border-gray-100 dark:border-gray-800">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3">
                <div className="flex items-start gap-3">
                  {/* Avatar cliquable → Mon Profil */}
                  {(() => {
                    const photoUrl = getPhotoUrl(
                      currentUser.photo || currentUser.manPhoto || currentUser.familyPhoto
                    );
                    return (
                      <button onClick={() => navigate("/moi/profil")} className="flex-shrink-0 focus:outline-none">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt="Photo de profil"
                            className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400"
                            onError={(e) => { (e.target as HTMLImageElement).src = DefaultAvatar; }}
                          />
                        ) : (
                          <img
                            src={DefaultAvatar}
                            alt="Avatar"
                            className="w-20 h-20 rounded-full"
                          />
                        )}
                      </button>
                    );
                  })()}

                  {/* Infos à droite de la photo */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {currentUser.prenom} {currentUser.nomFamille}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {isAdmin(currentUser) ? 'Administrateur' : 'Utilisateur'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        NuméroH : {getNumeroHForDisplay(currentUser.numeroH, true, false)}
                      </span>
                    </div>
                    {isMasterAdmin(currentUser) && (
                      <button
                        onClick={() => navigate("/admin")}
                        className="mt-2 w-9 h-9 flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white text-base transition-colors"
                        aria-label="Administration"
                      >
                        👑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 3 : Navigation (Famille / Terre ADAM / Échanges / Services) — toujours visible */}
          {isLoggedIn && !isPublicPage && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="grid grid-cols-4 px-1 py-1">
                {([
                  { id: "famille",    label: t('nav.famille')    || "Famille",    icon: "👨‍👩‍👧‍👦", path: "/famille" },
                  { id: "terre-adam", label: t('nav.terre_adam') || "Terre ADAM", icon: "🌍",  path: "/compte"  },
                  { id: "echanges",   label: t('nav.echanges')   || "Échanges",   icon: null,  path: "/echange" },
                  { id: "services",   label: t('nav.services')   || "Services",   icon: "💼",  path: "/services"},
                ] as { id: string; label: string; icon: string | null; path: string }[]).map((item) => {
                  const isActive =
                    item.id === "terre-adam"
                      ? pathname === "/compte" || pathname === "/terre-adam"
                      : pathname === item.path || pathname.startsWith(item.path + "/");
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all ${
                        isActive
                          ? "bg-blue-100 ring-1 ring-blue-300"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {item.id === "echanges"
                        ? <SalesIcon size={20} className={isActive ? "text-blue-600" : "text-gray-500"} />
                        : <span className="text-lg leading-none">{item.icon}</span>
                      }
                      <span className={`text-[9px] font-medium ${isActive ? "text-blue-700" : "text-gray-600"}`}>
                        {item.label}
                      </span>
                      {isActive && <span className="w-3 h-0.5 rounded-full bg-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Barre Espace Gestion (comme Messenger est séparé de Facebook) ── */}
      {isGestionMode && (
        <header style={{ background: "#0f172a", position: "sticky", top: 0, zIndex: 50, borderBottom: "2px solid #1e293b", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          <div style={{ width: "100%", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {/* Gauche : ← + logo + Professionnel */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => navigate(-1 as any)}
                style={{ background: "none", color: "white", border: "none", padding: "2px 2px", cursor: "pointer", fontSize: 26, fontWeight: 300, lineHeight: 1, flexShrink: 0, opacity: 0.9 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
              >
                ‹
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => navigate("/gestion-interne")}>
                <div style={{ background: "white", borderRadius: 8, padding: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <img src="/logo-moftal.svg" alt="Moftal" style={{ height: 24, width: 24, objectFit: "contain", display: "block" }} />
                </div>
                <span style={{ color: "white", fontWeight: 800, fontSize: 14, letterSpacing: "-0.2px" }}>{t('header.pro_mode')}</span>
              </div>
            </div>
            {/* Droite : profil + Espace Pro */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              {currentUser && (
                <Link
                  to="/moi/profil"
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "3px 7px 3px 3px", textDecoration: "none", minWidth: 0 }}
                >
                  {getPhotoUrl((currentUser as any).photo) ? (
                    <img src={getPhotoUrl((currentUser as any).photo)!} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "2px solid #34d399", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, border: "2px solid #34d399", flexShrink: 0 }}>
                      {((currentUser as any).prenom?.[0] || (currentUser as any).nom?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "rgba(255,255,255,0.95)", fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 70 }}>
                      {(currentUser as any).prenom || (currentUser as any).nom || "Profil"}
                    </div>
                    <div style={{ color: "#34d399", fontSize: 9, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 70 }}>
                      {((currentUser as any).numeroH || "").split(' ')[0]}
                    </div>
                  </div>
                </Link>
              )}
              <button
                onClick={() => navigate("/gestion-interne?tab=pro")}
                style={{ background: "#1a8f1a", color: "white", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Espace Pro
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main content - plein écran, chaque page gère son propre container */}
      <main className="w-full flex-1" style={{ overflowX: 'clip' }}>
        <Suspense fallback={<LoadingBar />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/inscription" element={<Navigate to="/vivant" replace />} />
          <Route path="/choix" element={<RegistrationChoice />} />
          <Route path="/vivant/*" element={<LivingWizard />} />
          <Route path="/defunt/*" element={<DeceasedWizard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login-membre" element={<LoginMembre />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/compte" element={<Account />} />
          <Route path="/moi" element={<Navigate to="/compte" replace />} />
          <Route path="/moi/profil" element={<MonProfil />} />
          <Route path="/moi/arbre" element={<Navigate to="/famille/moi/arbre" replace />} />
          <Route path="/moi/arbre/membres" element={<Navigate to="/famille/moi/arbre/membres" replace />} />
          <Route path="/probleme" element={<Probleme />} />
          <Route path="/services" element={<Services />} />
          <Route path="/journalistes" element={<Journalistes />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/immobilier" element={<Immobilier />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/mosquee" element={<Mosquee />} />
          <Route path="/madrasa" element={<Madrasa />} />
          <Route path="/beaute" element={<Beaute />} />
          <Route path="/artisans" element={<Artisans />} />
          <Route path="/sante" element={<Sante />} />
          <Route path="/securite" element={<Securite />} />
          <Route path="/mes-amours" element={<Navigate to="/famille/mes-amours" replace />} />
          <Route path="/mes-amis" element={<Navigate to="/famille/mes-amours?tab=requests" replace />} />
          <Route path="/identite" element={<Identite />} />
          <Route path="/activite" element={<Activite />} />
          <Route path="/education" element={<Education />} />
          <Route path="/ecoles" element={<Ecoles />} />
          <Route path="/dokal" element={<Navigate to="/" replace />} />
          <Route path="/foi" element={<Navigate to="/" replace />} />
          <Route path="/solidarite" element={<Solidarite />} />
          <Route path="/dons" element={<Navigate to="/" replace />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/zaka" element={<ZakaMuslimOnly />} />
          <Route path="/zaka-et-dons" element={<ZakaEtDons />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/badges" element={<AdminBadges />} />
          <Route path="/admin/moderation" element={<AdminModeration />} />
          <Route path="/admin/logos" element={<Navigate to="/admin/badges?tab=logos" replace />} />
          <Route path="/admin/governments" element={<AdminGovernments />} />
          <Route path="/admin/points" element={<AdminPoints />} />
          <Route path="/admin/retraits" element={<AdminRetraits />} />
          <Route path="/acheter-points" element={<AcheterPoints />} />
          <Route path="/famille" element={<Famille />} />
          <Route path="/famille/parents" element={<Parents />} />
          <Route path="/famille/femmes" element={<Partenaire />} />
          <Route path="/famille/mari" element={<Partenaire />} />
          <Route path="/famille/enfants" element={<Enfants />} />
          <Route path="/famille/moi" element={<Moi />}>
            <Route index element={<Navigate to="/famille/moi/arbre" replace />} />
            <Route path="arbre" element={<Arbre />} />
            <Route path="arbre/membres" element={<Membres />} />
          </Route>
          <Route path="/famille/arbre" element={<Navigate to="/famille/moi/arbre" replace />} />
          <Route path="/famille/arbre/membres" element={<Navigate to="/famille/moi/arbre/membres" replace />} />
          <Route path="/famille/mes-amours" element={<MesAmours />} />
          <Route path="/famille/admin" element={<FamilleAdmin />} />
          <Route path="/famille/inspir" element={<Inspir />} />
          <Route path="/famille/noyau" element={<Noyau />} />
          <Route path="/famille/foyer" element={<Foyer />} />
          <Route path="/lieux-residence" element={<Navigate to="/terre-adam" replace />} />
          <Route path="/pays" element={<Pays />} />
          <Route path="/terre-adam" element={<TerreAdam />} />
          <Route path="/organisation" element={<Navigate to="/activite" replace />} />
          <Route path="/histoire" element={<Navigate to="/famille/histoire" replace />} />
          <Route path="/histoire-humanite" element={<Navigate to="/famille/histoire" replace />} />
          <Route path="/famille/histoire" element={<HistoireHumanite />} />
          <Route path="/a-retenir" element={<ARetenir />} />
          <Route path="/science" element={<Science />} />
            <Route path="/echange" element={<EchangesProfessionnel />} />
          <Route path="/echange/primaire" element={<EchangePrimaire />} />
            <Route path="/echange/nourriture" element={<EchangeNourriture />} />
            <Route path="/echange/medicament" element={<EchangeMedicament />} />
          <Route path="/echange/secondaire" element={<EchangeSecondaire />} />
          <Route path="/echange/tertiaire" element={<EchangeTertiaire />} />
          <Route path="/echange/quaternaire" element={<EchangeQuaternaire />} />
          <Route path="/echange/publier" element={<EchangePublier />} />
          <Route path="/ia-sc" element={<ProfesseurIA />} />
          <Route path="/professeur-ia" element={<ProfesseurIA />} />
          <Route path="/inscription-pro" element={<InscriptionPro />} />
          <Route path="/professionnels" element={<ListeProfessionnels />} />
          <Route path="/liste-professionnels" element={<ListeProfessionnels />} />
          <Route path="/mes-comptes-pro" element={<MesComptesPro />} />
          <Route path="/espace-pro/:id" element={<EspacePro />} />
          <Route path="/mon-espace-pro" element={<MonEspacePro />} />
          <Route path="/rendez-vous/:id" element={<PrendreRendezVous />} />
          <Route path="/installer-app/:id" element={<InstallClientApp />} />
          <Route path="/mes-cours" element={<MesCours />} />
          <Route path="/galerie-famille" element={<GalerieFamily />} />
          <Route path="/moftal-pay" element={<MoftalPay />} />
          <Route path="/compte-famille" element={<CompteFamille />} />
          <Route path="/moftal-pay-pro" element={<MoftalPayPro />} />
          <Route path="/publier-formation" element={<PublierFormation />} />
          <Route path="/info-wallou" element={<InfoWallou />} />
          <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
          <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
          <Route path="/paiement/resultat" element={<PaiementResultat />} />
          <Route path="/gestion-interne" element={<GestionInterne />} />
          <Route path="/gestion-clinique/:tenantCode" element={<GestionClinique />} />
          <Route path="/gestion-mairie/:tenantCode"   element={<GestionMairie />} />
          <Route path="/clinique/:tenantCode" element={<CliniqueVitrine />} />
          <Route path="/clinique/:tenantCode/espace-patient" element={<EspacePatientClinique />} />
          <Route path="/gestion-ecole/:tenantCode" element={<GestionEnseignement mode="school" />} />
          <Route path="/gestion-commerce/:tenantCode" element={<GestionCommerce />} />
          <Route path="/commerce/:tenantCode" element={<CommerceVitrine />} />
          <Route path="/ecole/:tenantCode"         element={<EcoleVitrine />} />
          <Route path="/madrasa/:tenantCode"       element={<MadrasaVitrine />} />
          <Route path="/mosquee/:tenantCode"       element={<MosqueeVitrine />} />
          <Route path="/imam/:tenantCode"          element={<MosqueeVitrine />} />
          <Route path="/ngo/:tenantCode"           element={<NgoVitrine />} />
          <Route path="/entreprise/:tenantCode"    element={<EntrepriseVitrine />} />
          <Route path="/journaliste/:tenantCode"   element={<JournalisteVitrine />} />
          <Route path="/scientifique/:tenantCode"  element={<ScientifiqueVitrine />} />
          <Route path="/securite/:tenantCode"      element={<SecuriteVitrine />} />
          <Route path="/immobilier/:tenantCode"    element={<ImmobilierVitrine />} />
          <Route path="/restaurant/:tenantCode"    element={<RestaurantVitrine />} />
          <Route path="/transport/:tenantCode"     element={<TransportVitrine />} />
          <Route path="/mairie/:tenantCode"           element={<MaireVitrine />} />
          <Route path="/reseau-vitrine/:tenantCode" element={<ReseauVitrine />} />
          <Route path="/gestion-mosquee/:tenantCode" element={<GestionMosquee />} />
          <Route path="/gestion-madrasa/:tenantCode" element={<GestionEnseignement mode="madrasa" />} />
          <Route path="/gestion-imam/:tenantCode"    element={<GestionImam />} />
          <Route path="/gestion-reseau/:tenantCode"   element={<GestionReseau />} />
          <Route path="/gestion-ngo/:tenantCode"          element={<GestionNgo />} />
          <Route path="/gestion-entreprise/:tenantCode"    element={<GestionEntreprise />} />
          <Route path="/gestion-journaliste/:tenantCode"  element={<GestionJournaliste />} />
          <Route path="/gestion-scientifique/:tenantCode" element={<GestionScientifique />} />
          <Route path="/gestion-fournisseur/:tenantCode"  element={<GestionFournisseur />} />
          <Route path="/fournisseur/:tenantCode"         element={<FournisseurVitrine />} />
          <Route path="/vendeur/:tenantCode"            element={<VendeurVitrine />} />
          <Route path="/beaute-vitrine/:tenantCode"     element={<BeauteVitrine />} />
          <Route path="/artisan/:tenantCode"            element={<ArtisanVitrine />} />
          <Route path="/producteur/:tenantCode"         element={<ProducteurVitrine />} />
          <Route path="/gestion-securite/:tenantCode"     element={<GestionSecurite />} />
          <Route path="/gestion-immobilier/:tenantCode"  element={<GestionImmobilier />} />
          <Route path="/gestion-restaurant/:tenantCode"  element={<GestionRestaurant />} />
          <Route path="/gestion-transport/:tenantCode"   element={<GestionTransport />} />
          <Route path="/gestion-vendeur/:tenantCode"   element={<GestionVendeur />} />
          <Route path="/gestion-beauty/:tenantCode"    element={<GestionBeauty />} />
          <Route path="/gestion-artisan/:tenantCode"   element={<GestionArtisan />} />
          <Route path="/gestion-producer/:tenantCode"  element={<GestionProducer />} />
          <Route path="/commerce" element={<Commerce />} />
          <Route path="/entreprise" element={<Entreprise />} />
          <Route path="/fournisseurs" element={<Fournisseurs />} />
          <Route path="/mairie" element={<Mairie />} />
          <Route path="/reseau" element={<Reseau />} />
          <Route path="/vendeurs" element={<Vendeurs />} />
          <Route path="/producteurs" element={<Producteurs />} />
          <Route path="/reseau-imam" element={<ReseauImam />} />
          <Route path="/reseau/:type" element={<ReseauPro />} />
          <Route path="/quartier" element={<Quartier />} />
          <Route path="/info" element={<Info />} />
          <Route path="/developpement" element={<Developpement />} />
          <Route path="/solidarite/racines" element={<Racines />} />
          {/* Histoire & civilisations */}
          <Route path="/prehistoire"       element={<Prehistoire />} />
          <Route path="/antiquite"         element={<Antiquite />} />
          {/* Géographie Guinée */}
          <Route path="/guinee"            element={<Guinee />} />
          <Route path="/basse-guinee"      element={<BasseGuinee />} />
          <Route path="/haute-guinee"      element={<HauteGuinee />} />
          <Route path="/fouta-djallon"     element={<FoutaDjallon />} />
          <Route path="/guinee-forestiere" element={<GuineeForestiere />} />
          {/* Communauté */}
          <Route path="/communaute"        element={<Communaute />} />
          <Route path="/femmes"            element={<Femmes />} />
          <Route path="/hommes"            element={<Hommes />} />
          <Route path="/livres-de-dieu"    element={<LivresDeDieu />} />
          <Route path="/reflechissons"     element={<Reflechissons />} />
          {/* Services professionnels */}
          <Route path="/trouver-professeur"  element={<TrouverProfesseur />} />
          <Route path="/guide-entrepreneur"  element={<GuideEntrepreneur />} />
          <Route path="/tableau-de-bord"     element={<UserDashboard />} />
          {/* Activités (sous-pages) */}
          <Route path="/activite/primaire"   element={<Activite1 />} />
          <Route path="/activite/secondaire" element={<Activite2 />} />
          <Route path="/activite/tertiaire"  element={<Activite3 />} />
          {/* Inscription formation */}
          <Route path="/inscription-formation" element={<InscriptionFormation />} />
          {/* Lieux de résidence */}
          <Route path="/lieu-residence/1"  element={<LieuResidence1 />} />
          <Route path="/lieu-residence/2"  element={<LieuResidence2 />} />
          <Route path="/lieu-residence/3"  element={<LieuResidence3 />} />
          {/* Alias legacy conservés pour rétrocompatibilité */}
          <Route path="/gestion-imam-pro/:tenantCode"   element={<GestionImam />} />
          <Route path="/gestion-madrasa-v2/:tenantCode" element={<GestionEnseignement mode="madrasa" />} />
          <Route path="/gestion-ecole-v1/:tenantCode"   element={<GestionEnseignement mode="school" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      {/* Footer minimal Espace Gestion */}
      {isGestionMode && (
        <div style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, color: "#94a3b8", borderTop: "1px solid #f1f5f9", background: "white" }}>
          {t('footer.pro_space')}
        </div>
      )}

      {/* Footer site principal — masqué en mode Espace Gestion, sur les applis autonomes,
          et sur Terre ADAM qui a sa propre barre fixe en bas (les 5 niveaux) */}
      {!isGestionMode && !isStandaloneAppPage && pathname !== '/terre-adam' && <footer className="bg-gray-900 text-white py-4 safe-area-inset-bottom">
        <div className="mx-auto px-6 text-center">
          <p className="text-gray-300 text-sm mb-2">
            <span style={{ color: "#22a722" }} className="font-bold">{t('footer.copy')}</span>
            {" · "}{t('footer.tagline')}{" · "}{t('footer.system')}
          </p>
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <Link to="/conditions-utilisation" className="text-gray-400 hover:text-white text-sm underline transition-colors inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('footer.conditions')}
            </Link>
          </div>
        </div>
      </footer>}

      {/* Assistant IA Guide — masqué en mode gestion et sur les applis autonomes */}
      {!isGestionMode && !isStandaloneAppPage && guideReady && (
        <Suspense fallback={null}>
          <FloatingGuideIA />
        </Suspense>
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--toast-bg, #fff)",
            color: "var(--toast-color, #1f2937)",
            borderRadius: "0.75rem",
            padding: "1rem",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          },
          success: {
            iconTheme: {
              primary: "#22a722",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
          className: "dark:bg-gray-800 dark:text-gray-100",
        }}
      />

      {/* Modal choix page favorite — première connexion */}
      {showFavoriModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">⭐</div>
              <h2 className="text-xl font-bold text-gray-900">Votre page d'accueil</h2>
              <p className="text-sm text-gray-500 mt-1">Quelle page voulez-vous voir en premier quand vous vous connectez ?</p>
            </div>
            <div className="flex flex-col gap-3">
              {FAVORI_PAGES.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (currentUser?.numeroH) {
                      localStorage.setItem(getFavoriKey(currentUser.numeroH), item.path);
                    }
                    setShowFavoriModal(false);
                    navigate(item.path);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-gray-100 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-semibold text-gray-800">{item.label}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}

export default App;
