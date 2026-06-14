import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import IdentiteModal from "../components/IdentiteModal";
import EditProfileModal from "../components/EditProfileModal";
import { AdminPanel } from "../components/AdminPanel";
import { config } from "../config/api";
import { getPhotoUrl, isMasterAdmin, getNumeroHForDisplay } from "../utils/auth";

const MEMBERSHIP_ROLE_LABELS: Record<string, string> = {
  eleve: "🎓 Élève",
  parent: "👨‍👩‍👧 Parent d'élève",
  apprenant: "🎓 Apprenant",
  patient: "🩺 Patient",
  fidele: "🕌 Fidèle",
  membre: "🤝 Membre",
  abonne: "📰 Abonné",
  collaborateur: "🔬 Collaborateur",
  administre: "🏛️ Administré",
  client: "🧑 Client",
};

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
  const [memberships, setMemberships] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
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
      loadMemberships();
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

  const loadMemberships = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = config.API_BASE_URL || 'http://localhost:5002/api';
      const response = await fetch(`${API_BASE}/pro-members/my-memberships`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMemberships(data.memberships || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des établissements liés:', error);
    }
  };

  const quitterEtablissement = async (membership: any) => {
    if (!window.confirm(`Quitter "${membership.name}" ?`)) return;
    try {
      const token = localStorage.getItem("token");
      const API_BASE = config.API_BASE_URL || 'http://localhost:5002/api';
      await fetch(`${API_BASE}/pro-members/${membership.professional_account_id}/members/${membership.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setMemberships(prev => prev.filter(m => m.id !== membership.id));
    } catch (error) {
      console.error('Erreur lors de la sortie de l\'établissement:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!emailConfirm.trim()) {
      toast.error('Veuillez saisir votre adresse email pour confirmer');
      return;
    }
    setDeletingAccount(true);
    try {
      const session = localStorage.getItem("session_user");
      const token = session ? JSON.parse(session).token : null;
      const API_BASE = config.API_BASE_URL || 'http://localhost:5002/api';
      const response = await fetch(`${API_BASE}/auth/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ email: emailConfirm.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.removeItem('session_user');
        localStorage.removeItem('token');
        navigate('/login', { state: { message: 'Votre compte a été supprimé avec succès.' } });
      } else {
        toast.error(data.message || 'Erreur lors de la suppression du compte');
      }
    } catch {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setDeletingAccount(false);
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
              onClick={() => setShowActions(!showActions)}
              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1 text-sm sm:text-base"
            >
              💼 Services
              <span className="text-xs bg-white/20 rounded px-1">
                {showActions ? '▲' : '▼'}
              </span>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] px-3 sm:px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors duration-200 text-sm sm:text-base border border-red-200"
            >
              🗑️ Supprimer mon compte
            </button>
          </div>
        </div>
      </div>

      {/* ── Logos d'activité professionnelle ── */}
      {userLogos.length > 0 && (
        <div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#6366f1" }}
        >
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            🏅 Mes Services
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Logos attribués par les administrateurs de chaque service — ils reflètent vos activités sur la plateforme
          </p>
          <div className="flex flex-wrap gap-4">
            {userLogos.map((userLogo) => {
              if (!userLogo?.logo) return null;
              return (
                <div
                  key={userLogo.id}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 min-w-[100px]"
                  style={{ borderColor: userLogo.logo.color || "#6366f1", background: (userLogo.logo.color || "#6366f1") + "11" }}
                >
                  {/* Grand icône */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-md border-4 border-white"
                    style={{ background: (userLogo.logo.color || "#6366f1") + "22" }}
                  >
                    <span style={{ color: userLogo.logo.color || "#6366f1" }}>
                      {userLogo.logo.icon}
                    </span>
                  </div>
                  {/* Nom du logo */}
                  <span className="text-xs font-bold text-slate-700 text-center leading-tight max-w-[90px]">
                    {userLogo.logo.name}
                  </span>
                  {/* Catégorie / description */}
                  {userLogo.logo.category && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: (userLogo.logo.color || "#6366f1") + "22", color: userLogo.logo.color || "#6366f1" }}
                    >
                      {userLogo.logo.category}
                    </span>
                  )}
                  {/* Date d'attribution */}
                  <span className="text-xs text-slate-400">
                    {new Date(userLogo.assignedAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">
            Ces logos ne sont pas attribués automatiquement — ils sont accordés par l'administrateur ou le chef de chaque service.
          </p>
        </div>
      )}

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

      {/* ── Mes établissements liés ── */}
      {memberships.length > 0 && (
        <div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#0d9488" }}
        >
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            🏫 Mes établissements liés
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Établissements qui vous ont donné accès à leur espace. Vous pouvez quitter à tout moment.
          </p>
          <div className="space-y-2">
            {memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg font-bold text-teal-700 flex-shrink-0 overflow-hidden">
                    {m.photo ? (
                      <img src={getPhotoUrl(m.photo)} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      m.name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{m.name}</p>
                    <p className="text-xs text-slate-400">{MEMBERSHIP_ROLE_LABELS[m.role] || m.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => quitterEtablissement(m)}
                  className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Quitter
                </button>
              </div>
            ))}
          </div>
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

      {/* ── Panneau Actions : inscription professionnelle ── */}
      {showActions && (
        <div
          className="bg-white rounded-xl shadow-sm border border-orange-200 p-6 mt-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#f97316" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                💼 Proposer un Service
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Créez un compte professionnel pour proposer vos services à la communauté.
                Sélectionnez le type qui correspond à votre service.
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

          {/* Offre 3 mois gratuits */}
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-4 py-3">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <div className="font-bold text-orange-700 text-sm">3 mois gratuits d'essai</div>
              <div className="text-xs text-orange-600 mt-0.5">Aucune carte requise — activez votre compte et commencez immédiatement.</div>
            </div>
          </div>

          {/* Types disponibles — aperçu visuel */}
          <div className="mt-5">
            <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Types de comptes disponibles</p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: '🏥', label: 'Clinique' },
                { icon: '🛡️', label: 'Sécurité' },
                { icon: '📰', label: 'Journaliste' },
                { icon: '🏢', label: 'Entreprise' },
                { icon: '🎓', label: 'École' },
                { icon: '📦', label: 'Fournisseur' },
                { icon: '🔬', label: 'Chercheur' },
                { icon: '🤝', label: 'ONG' },
                { icon: '🕌', label: 'Mosquée' },
                { icon: '📖', label: 'Madrasa' },
                { icon: '🚗', label: 'Transport' },
                { icon: '💈', label: 'Beauté' },
                { icon: '🔧', label: 'Artisan' },
                { icon: '🍽️', label: 'Restaurant' },
                { icon: '🏪', label: 'Commerce' },
                { icon: '🌾', label: 'Producteur' },
                { icon: '🏛️', label: 'Mairie' },
                { icon: '💇', label: 'Vendeur' },
              ].map(t => (
                <span key={t.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">
                  {t.icon} {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Bouton principal */}
          <div className="mt-6">
            <button
              onClick={() => navigate('/inscription-pro')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-base rounded-xl shadow-md transition-colors duration-200"
            >
              ➕ Créer mon compte professionnel
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">Choisissez votre type de compte sur la page suivante</p>
          </div>

        </div>
      )}

      {/* ── Modale suppression de compte ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header rouge */}
            <div className="bg-red-600 p-5">
              <h2 className="text-xl font-bold text-white">🗑️ Supprimer mon compte</h2>
              <p className="text-red-100 text-sm mt-1">Cette action est irréversible</p>
            </div>

            {/* Corps */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                <p className="font-bold mb-1">⚠️ Attention — Action définitive</p>
                <p>En supprimant votre compte, vous perdrez :</p>
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>Votre profil et toutes vos informations</li>
                  <li>Votre arbre familial</li>
                  <li>Vos histoires publiées</li>
                  <li>Vos comptes professionnels</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Saisissez votre adresse email pour confirmer
                </label>
                <input
                  type="email"
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Votre email enregistré : <strong>{userData.email || 'non renseigné'}</strong>
                </p>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowDeleteModal(false); setEmailConfirm(''); }}
                disabled={deletingAccount}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !emailConfirm.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {deletingAccount ? '⏳ Suppression...' : '🗑️ Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
