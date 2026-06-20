import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useI18n } from "./i18n/useI18n";
import { LANG_LABELS } from "./i18n/strings";
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

  // Différer le FloatingGuideIA après le premier rendu pour réduire le TBT initial
  useEffect(() => {
    const t = setTimeout(() => setGuideReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const navigate = useNavigate();
  const currentUser = getSessionUser();
  const isLoggedIn = currentUser !== null;
  const isGestionMode = pathname.startsWith("/gestion");
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
    pathname.startsWith("/mairie/");
  const isFullscreenPage = isGestionMode || isVitrineMode;
  const isHome = pathname === "/";
  const showFullHeader = !isLoggedIn || isHome;
  return (
    <div className={!isFullscreenPage ? "bg-gray-900 min-h-screen" : ""}>
    <div className={`flex flex-col bg-stone-50 dark:bg-gray-900 overflow-x-hidden${!isFullscreenPage ? ' max-w-[500px] mx-auto shadow-2xl' : ''}`}>
      {/* Header site principal — masqué en mode Espace Gestion ou Vitrine */}
      {!isFullscreenPage && <header className="bg-white dark:bg-gray-900 sticky top-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-1">
          <div className="flex items-center justify-between gap-2">
            {/* Logo visible partout une fois connecté */}
            {isLoggedIn && !isHome && (
              <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity" aria-label="Accueil">
                <img src="/logo-moftal.svg" alt="Moftal" width="96" height="96" style={{ width: 96, height: 96 }}/>
              </Link>
            )}
            <div className="flex items-center gap-2 flex-wrap justify-end min-h-[44px]">
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
      </header>}

      {/* ── Barre Espace Gestion (comme Messenger est séparé de Facebook) ── */}
      {isGestionMode && (
        <header style={{ background: "#0f172a", position: "sticky", top: 0, zIndex: 50, borderBottom: "2px solid #1e293b", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {/* Logo + nom de l'app */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => navigate("/gestion-interne")}>
              <img src="/logo-moftal.svg" alt="Moftal" style={{ height: 40, width: 40, objectFit: "contain" }} />
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: 15, letterSpacing: "-0.2px" }}>Professionnel</div>
                <div style={{ color: "#475569", fontSize: 11, fontWeight: 500 }}>Moftal</div>
              </div>
            </div>
            {/* Actions droite */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {currentUser && (
                <div style={{ textAlign: "right", marginRight: 4 }}>
                  <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(currentUser as any).prenom || (currentUser as any).nom || "Gérant"}
                  </div>
                  <div style={{ color: "#475569", fontSize: 11 }}>{(currentUser as any).numeroH || ""}</div>
                </div>
              )}
              <button onClick={() => navigate("/gestion-interne")}
                title="Mes espaces de gestion"
                style={{ background: "rgba(255,255,255,0.07)", color: "#94a3b8", border: "1px solid #1e293b", borderRadius: 8, padding: "7px 13px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}>
                🏠 <span style={{ display: "none" }}>Mes espaces</span>
              </button>
              <button onClick={() => { localStorage.removeItem("token"); navigate("/login"); }}
                title="Se déconnecter"
                style={{ background: "rgba(220,38,38,0.15)", color: "#f87171", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "background 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.25)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.15)"; }}>
                ⏻ Quitter
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main content - plein écran, chaque page gère son propre container */}
      <main className="w-full overflow-x-hidden">
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
          <Route path="/gestion-securite/:tenantCode"     element={<GestionSecurite />} />
          <Route path="/gestion-immobilier/:tenantCode"  element={<GestionImmobilier />} />
          <Route path="/gestion-restaurant/:tenantCode"  element={<GestionRestaurant />} />
          <Route path="/gestion-transport/:tenantCode"   element={<GestionTransport />} />
          <Route path="/gestion-vendeur/:tenantCode"   element={<GestionVendeur />} />
          <Route path="/gestion-beauty/:tenantCode"    element={<GestionBeauty />} />
          <Route path="/gestion-artisan/:tenantCode"   element={<GestionArtisan />} />
          <Route path="/gestion-producer/:tenantCode"  element={<GestionProducer />} />
          <Route path="/reseau-imam" element={<ReseauImam />} />
          <Route path="/reseau/:type" element={<ReseauPro />} />
          <Route path="/quartier" element={<Quartier />} />
          <Route path="/info" element={<Info />} />
          <Route path="/developpement" element={<Developpement />} />
          <Route path="/famille/racines" element={<Racines />} />
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
          Moftal · Espace Professionnel
        </div>
      )}

      {/* Footer site principal — masqué en mode Espace Gestion */}
      {!isGestionMode && <footer className="bg-gray-900 text-white py-10 safe-area-inset-bottom">
        <div className="mx-auto px-6 text-center">
          <p className="text-gray-300 text-sm mb-5">
            <span style={{ color: "#22a722" }} className="font-bold">© 2025 Moftal</span>
            {" · "}Ensemble pour les enfants d'Adam{" · "}Système d'enregistrement généalogique
          </p>
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <Link to="/conditions-utilisation" className="text-gray-400 hover:text-white text-sm underline transition-colors inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Conditions d'Utilisation
            </Link>
          </div>
        </div>
      </footer>}

      {/* Assistant IA Guide — masqué en mode gestion */}
      {!isGestionMode && guideReady && (
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
    </div>
  );
}

export default App;
