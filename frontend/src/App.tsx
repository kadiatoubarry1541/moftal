import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Banner } from "./components/Banner";
import { ThemeToggleCompact } from "./components/ThemeToggle";
import { useI18n } from "./i18n/useI18n";
import { LANG_LABELS } from "./i18n/strings";
const FloatingMessenger = lazy(() => import("./components/FloatingMessenger").then(m => ({ default: m.FloatingMessenger })));
import { getSessionUser, isAdmin } from "./utils/auth";

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
const Probleme = lazy(() => import("./pages/Probleme"));
const Sante = lazy(() => import("./pages/Sante"));
const Securite = lazy(() => import("./pages/Securite"));
const Solidarite = lazy(() => import("./pages/Solidarite"));
const Identite = lazy(() => import("./pages/Identite"));
const Activite = lazy(() => import("./pages/Activite"));
const Education = lazy(() => import("./pages/Education"));
const Ecoles = lazy(() => import("./pages/Ecoles"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminBadges = lazy(() => import("./pages/AdminBadges"));
const AdminModeration = lazy(() => import("./pages/AdminModeration"));
const AdminPoints = lazy(() => import("./pages/AdminPoints"));
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
const MesCours = lazy(() => import("./pages/MesCours"))
const GalerieFamily = lazy(() => import("./pages/GalerieFamily"));
const CompteFamille = lazy(() => import("./pages/CompteFamille"));
const WalletPro = lazy(() => import("./pages/WalletPro"));
const InfoWallou = lazy(() => import("./pages/InfoWallou"));
const ConditionsUtilisation = lazy(() => import("./pages/ConditionsUtilisation"));
const PaiementResultat = lazy(() => import("./pages/PaiementResultat"));
const GestionInterne = lazy(() => import("./pages/GestionInterne"));
const GestionClinique = lazy(() => import("./pages/GestionClinique"));
const GestionEcole = lazy(() => import("./pages/GestionEcole"));
const MoftalPay = lazy(() => import("./pages/MoftalPay"));

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

function App() {
  const { lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const [guideReady, setGuideReady] = useState(false);

  // Réveille le backend après le premier rendu (Render free tier dort si inactif)
  // Différé de 3s pour ne pas concurrencer le LCP / FCP initial
  useEffect(() => {
    const timer = setTimeout(() => {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5002';
      fetch(`${API}/api/health`).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Différer le FloatingGuideIA après le premier rendu pour réduire le TBT initial
  useEffect(() => {
    const t = setTimeout(() => setGuideReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const isLoggedIn = getSessionUser() !== null;
  
  const isHome = pathname === "/";
  const showFullHeader = !isLoggedIn || isHome;
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-gray-900 overflow-x-hidden">
      {showFullHeader && <Banner />}

      {/* Header responsive: PC, tablette, mobile */}
      <header className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
            {/* Logo */}
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0" aria-label="Accueil">
              <picture>
                <source srcSet="/logo.webp" type="image/webp" />
                <img
                  src="/logo.png"
                  alt="Logo"
                  width="48"
                  height="48"
                  decoding="async"
                  className="h-9 w-9 xs:h-10 xs:w-10 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </picture>
            </Link>
            
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end min-h-[44px]">
              <ThemeToggleCompact />
              <div className="flex items-center gap-1.5 sm:gap-2">
                <label className="text-xs xs:text-sm text-gray-600 dark:text-gray-300 hidden xs:inline">Lang</label>
                <select
                  className="min-h-[44px] px-2 py-2 sm:py-1 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
                  value={lang}
                  onChange={(e) =>
                    setLang(e.target.value as "fr" | "en" | "ar" | "man" | "pul")
                  }
                  aria-label="Choisir la langue"
                >
                  {Object.entries(LANG_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - plein écran, chaque page gère son propre container */}
      <main className="flex-1 w-full overflow-x-hidden">
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
          <Route path="/sante" element={<Sante />} />
          <Route path="/securite" element={<Securite />} />
          <Route path="/mes-amours" element={<Navigate to="/famille/mes-amours" replace />} />
          <Route path="/identite" element={<Identite />} />
          <Route path="/activite" element={<Activite />} />
          <Route path="/education" element={<Education />} />
          <Route path="/ecoles" element={<Ecoles />} />
          <Route path="/dokal" element={<Navigate to="/" replace />} />
          <Route path="/foi" element={<Navigate to="/" replace />} />
          <Route path="/solidarite" element={<Solidarite />} />
          <Route path="/dons" element={<Navigate to="/" replace />} />
          <Route path="/donations" element={<Navigate to="/" replace />} />
          <Route path="/zaka" element={<ZakaMuslimOnly />} />
          <Route path="/zaka-et-dons" element={<Navigate to="/zaka" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/badges" element={<AdminBadges />} />
          <Route path="/admin/moderation" element={<AdminModeration />} />
          <Route path="/admin/logos" element={<Navigate to="/admin/badges?tab=logos" replace />} />
          <Route path="/admin/governments" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/points" element={<AdminPoints />} />
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
          <Route path="/lieux-residence" element={<Navigate to="/terre-adam" replace />} />
          <Route path="/pays" element={<Navigate to="/terre-adam" replace />} />
          <Route path="/terre-adam" element={<TerreAdam />} />
          <Route path="/organisation" element={<Navigate to="/activite" replace />} />
          <Route path="/histoire" element={<Navigate to="/histoire-humanite" replace />} />
          <Route path="/a-retenir" element={<ARetenir />} />
          <Route path="/histoire-humanite" element={<HistoireHumanite />} />
          <Route path="/science" element={<Science />} />
            <Route path="/echange" element={<EchangesProfessionnel />} />
          <Route path="/echange/primaire" element={<EchangePrimaire />} />
            <Route path="/echange/nourriture" element={<EchangeNourriture />} />
            <Route path="/echange/medicament" element={<EchangeMedicament />} />
          <Route path="/echange/secondaire" element={<EchangeSecondaire />} />
          <Route path="/echange/tertiaire" element={<EchangeTertiaire />} />
          <Route path="/echange/publier" element={<EchangePublier />} />
          <Route path="/ia-sc" element={<ProfesseurIA />} />
          <Route path="/professeur-ia" element={<ProfesseurIA />} />
          <Route path="/inscription-pro" element={<InscriptionPro />} />
          <Route path="/professionnels" element={<ListeProfessionnels />} />
          <Route path="/mes-comptes-pro" element={<MesComptesPro />} />
          <Route path="/espace-pro/:id" element={<EspacePro />} />
          <Route path="/mon-espace-pro" element={<MonEspacePro />} />
          <Route path="/rendez-vous/:id" element={<PrendreRendezVous />} />
          <Route path="/mes-cours" element={<MesCours />} />
          <Route path="/galerie-famille" element={<GalerieFamily />} />
          <Route path="/moftal-pay" element={<MoftalPay />} />
          <Route path="/compte-famille" element={<CompteFamille />} />
          <Route path="/wallet-pro" element={<WalletPro />} />
          <Route path="/info-wallou" element={<InfoWallou />} />
          <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
          <Route path="/paiement/resultat" element={<PaiementResultat />} />
          <Route path="/gestion-interne" element={<GestionInterne />} />
          <Route path="/gestion-clinique/:tenantCode" element={<GestionClinique />} />
          <Route path="/gestion-ecole/:tenantCode" element={<GestionEcole />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      {/* Footer responsive */}
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black text-white py-4 sm:py-6 mt-auto safe-area-inset-bottom">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 text-center">
          <p className="text-gray-300 dark:text-gray-400 text-xs xs:text-sm sm:text-base">
            2025 Les Enfants d'Adam et Eve - Système d'enregistrement généalogique
          </p>
          <Link
            to="/conditions-utilisation"
            className="text-gray-400 hover:text-gray-200 text-xs mt-1 inline-block underline transition-colors"
          >
            Conditions Générales d'Utilisation
          </Link>
        </div>
      </footer>

      {/* Messenger uniquement sur la page Mes Amours — chargé en lazy */}
      {pathname === "/famille/mes-amours" && (
        <Suspense fallback={null}><FloatingMessenger /></Suspense>
      )}

      {/* Assistant IA Guide — chargé 1.5s après le rendu initial pour ne pas bloquer LCP/TBT */}
      {guideReady && (
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
              primary: "#10b981",
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
    </div>
  );
}

export default App;
