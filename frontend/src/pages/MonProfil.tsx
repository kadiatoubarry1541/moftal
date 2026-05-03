import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import IdentiteModal from "../components/IdentiteModal";
import EditProfileModal from "../components/EditProfileModal";
import { AdminPanel } from "../components/AdminPanel";
import { config } from "../config/api";
import { getPhotoUrl, isMasterAdmin, getNumeroHForDisplay } from "../utils/auth";

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

export default function MonProfil() {
  const [userData, setUserData] = useState<{
    prenom?: string;
    nomFamille?: string;
    numeroH?: string;
    role?: string;
    isAdmin?: boolean;
    photo?: string;
    email?: string;
    genre?: string;
    dateNaissance?: string;
    age?: number;
    generation?: string;
    [key: string]: string | number | boolean | undefined;
  } | null>(null);
  const [userLogos, setUserLogos] = useState<UserLogo[]>([]);
  const [open, setOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const navigate = useNavigate();

  const loadUserData = () => {
    const raw = localStorage.getItem("session_user");
    if (!raw) {
      navigate("/login");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const u = parsed.userData || parsed;
      setUserData(u);
      loadUserLogos(u.numeroH);
    } catch {
      navigate("/login");
    }
  };

  useEffect(() => {
    loadUserData();

    // Écouter les mises à jour de session (ex: après modification du profil)
    const handleSessionUpdate = () => loadUserData();
    window.addEventListener("session-updated", handleSessionUpdate);
    return () => window.removeEventListener("session-updated", handleSessionUpdate);
  }, [navigate]);

  const loadUserLogos = async (numeroH?: string) => {
    if (!numeroH) return;
    try {
      const token = localStorage.getItem("token");
      const API_BASE = config.API_BASE_URL || 'http://localhost:5002/api';
      const response = await fetch(`${API_BASE}/logos/my-logos`, {
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

  if (!userData) return null;

  const canSeeAdminPanel = isMasterAdmin(userData);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Bouton retour */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        ← Retour
      </button>

      {/* Header Principal */}
      <div
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200 mb-8"
        style={{ borderLeftWidth: "4px", borderLeftColor: "#3b82f6" }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar avec gradient professionnel */}
            <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-white relative overflow-hidden">
              {(() => {
                const photoUrl = getPhotoUrl(userData.photo);
                if (photoUrl) {
                  return (
                    <img
                      key={photoUrl}
                      src={photoUrl}
                      alt="Photo de profil"
                      className="w-full h-full object-cover absolute inset-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  );
                }
                return userData.prenom?.charAt(0) || "👤";
              })()}
              </div>
              {/* Logos professionnels en bas de la photo (jusqu'à 3) */}
              {userLogos.slice(0, 3).map((userLogo, index) => {
                if (!userLogo?.logo) return null;
                // Positionnement en cercle autour du bas de l'avatar
                const angle = (index * 120) - 60; // Répartition sur 120 degrés
                const radius = 38;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                const size = index === 0 ? 'w-8 h-8 text-lg' : index === 1 ? 'w-7 h-7 text-base' : 'w-6 h-6 text-sm';
                return (
                  <div 
                    key={userLogo.id}
                    className={`absolute ${size} rounded-full bg-white border-2 border-white shadow-lg flex items-center justify-center`}
                    title={userLogo.logo.name}
                    style={{ 
                      borderColor: userLogo.logo.color || '#3B82F6',
                      bottom: `${20 + y}px`,
                      right: `${20 - x}px`,
                      zIndex: 10 + index
                    }}
                  >
                    <span style={{ color: userLogo.logo.color || '#3B82F6' }}>
                      {userLogo.logo.icon}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Informations utilisateur */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">
                {userData.prenom} {userData.nomFamille}
              </h2>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {userData.role === "admin" || userData.isAdmin
                    ? "👑 Administrateur"
                    : "👤 Utilisateur"}
                </span>
              </div>

              <div className="text-slate-600">
                <span className="font-medium">NuméroH:</span>{" "}
                <span className="text-blue-600 font-semibold">
                  {getNumeroHForDisplay(userData.numeroH, true, false)}
                </span>
              </div>
              {userData.handicap && (
                <div className="text-slate-600">
                  <span className="font-medium">Situation de handicap:</span>{" "}
                  <span className="text-emerald-700 font-semibold">
                    {userData.handicap === "OUI" ? "Oui" : "Non"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-row flex-wrap sm:flex-col gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setOpen(true)}
              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200 text-sm sm:text-base"
            >
              ✨ Identité
            </button>
            {canSeeAdminPanel && (
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 text-sm sm:text-base"
              >
                ⚙️ Admin
              </button>
            )}
            <button
              onClick={() => navigate('/mes-comptes-pro')}
              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] px-3 sm:px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors duration-200 text-sm sm:text-base"
            >
              💼 Mes comptes pro
            </button>
            <button
              onClick={() => setShowActions(!showActions)}
              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1 text-sm sm:text-base"
            >
              🚀 Actions
              <span className="text-xs bg-white/20 rounded px-1">
                {showActions ? '▲' : '▼'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Vidéo d'inscription ── */}
      {userData.video && (
        <div
          className="bg-white rounded-xl shadow-sm border border-blue-100 p-5 mt-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#3b82f6" }}
        >
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            🎥 Ma vidéo d'inscription
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            Vidéo enregistrée lors de votre inscription. Elle sert à confirmer votre identité.
          </p>
          <video
            src={userData.video as string}
            controls
            className="w-full max-w-sm rounded-xl border border-slate-200 shadow-sm"
            style={{ maxHeight: 280 }}
          />
        </div>
      )}

      <IdentiteModal
        open={open}
        onClose={() => setOpen(false)}
        onEditProfile={() => {
          setOpen(false);
          setShowEditProfile(true);
        }}
      />

      <EditProfileModal
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        userData={userData}
        onUpdate={(updatedData) => {
          // Mettre à jour l'état local immédiatement
          setUserData(updatedData);
          // Aussi recharger depuis localStorage pour être sûr d'avoir les dernières données
          setTimeout(() => loadUserData(), 100);
        }}
      />

      {canSeeAdminPanel && showAdmin && (
        <div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#3b82f6" }}
        >
          <h3 className="text-xl font-semibold text-slate-700 mb-6 flex items-center gap-2">
            ⚙️ Panneau d'Administration
          </h3>
          <AdminPanel userData={userData} />
        </div>
      )}

      {/* ── Panneau Actions : inscriptions professionnelles ── */}
      {showActions && (
        <div
          className="bg-white rounded-xl shadow-sm border border-orange-200 p-6 mt-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#f97316" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                🚀 Inscriptions Professionnelles
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Créez un compte professionnel pour proposer vos services à la communauté.
                Sélectionnez le type qui correspond à votre activité.
              </p>
            </div>
            <button
              onClick={() => setShowActions(false)}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              title="Fermer"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mt-5">

            {/* ── 1. Clinique / Hôpital ── */}
            <div className="border border-red-200 rounded-xl p-5 hover:border-red-400 hover:shadow-md transition-all duration-200 bg-red-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl flex-shrink-0">
                  🏥
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-red-800 text-base mb-1">Clinique / Hôpital</h4>
                  <p className="text-sm text-red-700 mb-3 leading-relaxed">
                    Pour les structures médicales : cliniques, hôpitaux, cabinets de médecins,
                    pharmacies et centres de santé. Permet de publier vos services, horaires,
                    spécialités et de recevoir des demandes de rendez-vous de la communauté.
                  </p>
                  <button
                    onClick={() => navigate('/inscription-pro?type=clinic')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    🏥 S'inscrire comme Clinique
                  </button>
                </div>
              </div>
            </div>

            {/* ── 2. Agence de Sécurité ── */}
            <div className="border border-gray-300 rounded-xl p-5 hover:border-gray-500 hover:shadow-md transition-all duration-200 bg-gray-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">
                  🛡️
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-800 text-base mb-1">Agence de Sécurité</h4>
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                    Pour les agences de gardiennage, sécurité privée, protection des personnes
                    et des biens. Mettez en avant vos services de surveillance, vos équipes
                    et vos zones d'intervention pour les particuliers et entreprises.
                  </p>
                  <button
                    onClick={() => navigate('/inscription-pro?type=security_agency')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    🛡️ S'inscrire comme Agence de Sécurité
                  </button>
                </div>
              </div>
            </div>

            {/* ── 3. Journaliste / Média ── */}
            <div className="border border-yellow-200 rounded-xl p-5 hover:border-yellow-400 hover:shadow-md transition-all duration-200 bg-yellow-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-2xl flex-shrink-0">
                  📰
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-yellow-800 text-base mb-1">Journaliste / Média</h4>
                  <p className="text-sm text-yellow-700 mb-3 leading-relaxed">
                    Pour les journalistes, rédactions, radios, chaînes de télévision et médias
                    en ligne. Diffusez vos articles, reportages et informations au sein de
                    la communauté et renforcez votre présence éditoriale.
                  </p>
                  <button
                    onClick={() => navigate('/inscription-pro?type=journalist')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    📰 S'inscrire comme Journaliste
                  </button>
                </div>
              </div>
            </div>

            {/* ── 4. Entreprise / Commerce ── */}
            <div className="border border-blue-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all duration-200 bg-blue-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                  🏢
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-blue-800 text-base mb-1">Entreprise / Commerce</h4>
                  <p className="text-sm text-blue-700 mb-3 leading-relaxed">
                    Pour toute société commerciale, PME, startup ou commerce de proximité.
                    Présentez votre activité, vos produits ou services, et connectez-vous
                    directement avec des clients potentiels au sein de la communauté.
                  </p>
                  <button
                    onClick={() => navigate('/inscription-pro?type=enterprise')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    🏢 S'inscrire comme Entreprise
                  </button>
                </div>
              </div>
            </div>

            {/* ── 5. École / Professeur ── */}
            <div className="border border-emerald-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-md transition-all duration-200 bg-emerald-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">
                  🎓
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-emerald-800 text-base mb-1">École / Professeur</h4>
                  <p className="text-sm text-emerald-700 mb-3 leading-relaxed">
                    Pour les établissements scolaires, universités, centres de formation
                    et enseignants indépendants. Publiez vos formations, cours et programmes,
                    et recevez des inscriptions d'élèves ou d'étudiants de la communauté.
                  </p>
                  <button
                    onClick={() => navigate('/inscription-pro?type=school')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    🎓 S'inscrire comme École / Professeur
                  </button>
                </div>
              </div>
            </div>

            {/* ── 6. Fournisseur / Distributeur ── */}
            <div className="border border-orange-200 rounded-xl p-5 hover:border-orange-400 hover:shadow-md transition-all duration-200 bg-orange-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl flex-shrink-0">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-orange-800 text-base mb-1">Fournisseur / Distributeur</h4>
                  <p className="text-sm text-orange-700 mb-3 leading-relaxed">
                    Pour les grossistes, importateurs, distributeurs et fournisseurs de matériaux
                    ou marchandises. Proposez vos catalogues, tarifs et conditions de livraison
                    à des acheteurs professionnels et particuliers de la communauté.
                  </p>
                  <button
                    onClick={() => navigate('/inscription-pro?type=supplier')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    📦 S'inscrire comme Fournisseur
                  </button>
                </div>
              </div>
            </div>

            {/* ── 7. Chercheur / Scientifique ── */}
            <div className="border border-purple-200 rounded-xl p-5 hover:border-purple-400 hover:shadow-md transition-all duration-200 bg-purple-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl flex-shrink-0">
                  🔬
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-purple-800 text-base mb-1">Chercheur / Scientifique</h4>
                  <p className="text-sm text-purple-700 mb-3 leading-relaxed">
                    Pour les chercheurs, laboratoires, instituts scientifiques et experts
                    en recherche et développement. Partagez vos travaux, publications et
                    découvertes avec la communauté et collaborez avec d'autres professionnels.
                  </p>
                  <button
                    onClick={() => navigate('/inscription-pro?type=scientist')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    🔬 S'inscrire comme Chercheur
                  </button>
                </div>
              </div>
            </div>

            {/* ── 8. ONG / Association ── */}
            <div className="border border-teal-200 rounded-xl p-5 hover:border-teal-400 hover:shadow-md transition-all duration-200 bg-teal-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-2xl flex-shrink-0">
                  🤝
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-teal-800 text-base mb-1">ONG / Association</h4>
                  <p className="text-sm text-teal-700 mb-3 leading-relaxed">
                    Pour les organisations non gouvernementales, associations humanitaires,
                    associations caritatives et organisations à but non lucratif. Gérez vos
                    projets, recrutez des bénévoles et mobilisez la communauté autour de vos causes.
                  </p>
                  <button
                    onClick={() => navigate('/inscription-pro?type=ngo')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    🤝 S'inscrire comme ONG / Association
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ── Section Éducation ── */}
          <div className="mt-6 border-t border-orange-100 pt-6">
            <h4 className="text-base font-bold text-slate-700 mb-4">🎓 Inscriptions Éducatives</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Professeur / Guide */}
              <div className="border border-indigo-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-md transition-all duration-200 bg-indigo-50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl flex-shrink-0">
                    🎓
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-indigo-800 text-base mb-1">Professeur / Guide</h4>
                    <p className="text-sm text-indigo-700 mb-3 leading-relaxed">
                      Proposez des cours, des formations et guidez des apprenants.
                      Votre profil sera visible après validation par un administrateur.
                    </p>
                    <button
                      onClick={() => navigate('/education?tab=inscription-suivi&role=professeur')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                    >
                      🎓 Devenir professeur
                    </button>
                  </div>
                </div>
              </div>

              {/* Apprenant */}
              <div className="border border-emerald-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-md transition-all duration-200 bg-emerald-50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">
                    📖
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-emerald-800 text-base mb-1">Apprenant</h4>
                    <p className="text-sm text-emerald-700 mb-3 leading-relaxed">
                      Inscrivez vos parents (NumeroH) pour qu&apos;ils puissent suivre votre
                      progression dans les formations et les cours.
                    </p>
                    <button
                      onClick={() => navigate('/education?tab=inscription-suivi&role=apprenant')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                    >
                      📖 S&apos;inscrire comme apprenant
                    </button>
                  </div>
                </div>
              </div>

              {/* Inscrire une école */}
              <div className="border border-violet-200 rounded-xl p-5 hover:border-violet-400 hover:shadow-md transition-all duration-200 bg-violet-50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0">
                    🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-violet-800 text-base mb-1">Inscrire une école</h4>
                    <p className="text-sm text-violet-700 mb-3 leading-relaxed">
                      Enregistrez votre établissement scolaire pour apparaître dans
                      la liste des écoles partenaires de la communauté.
                    </p>
                    <button
                      onClick={() => navigate('/ecoles')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                    >
                      🏫 Inscrire mon école
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
