import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import IdentiteModal from "../components/IdentiteModal";
import EditProfileModal from "../components/EditProfileModal";
import { AdminPanel } from "../components/AdminPanel";
import { config } from "../config/api";
import { getPhotoUrl, isMasterAdmin, getNumeroHForDisplay } from "../utils/auth";
import { useI18n } from "../i18n/useI18n";
import { LANG_LABELS } from "../i18n/strings";

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
  const { t, lang, setLang } = useI18n();
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
  const [showLang, setShowLang] = useState(false);
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
      // Charger les données fraîches du serveur pour avoir la vidéo et toutes les infos à jour
      fetchFreshUserData();
    } catch {
      navigate("/login");
    }
  };

  const fetchFreshUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const API_BASE = config.API_BASE_URL || 'http://localhost:5002/api';
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserData(data.user);
        }
      }
    } catch {
      // Silencieux — on garde les données localStorage si le serveur est injoignable
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
    if (!window.confirm(`${t('toast.leave_confirm')} "${membership.name}" ?`)) return;
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


  if (!userData) return null;

  const canSeeAdminPanel = isMasterAdmin(userData);

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Barre de navigation dédiée style Facebook */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Retour"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {userData.prenom} {userData.nomFamille}
            </h1>
            <p className="text-xs text-gray-500 leading-tight">{t('dashboard.my_profile') || 'Mon profil'}</p>
          </div>
        </div>
      </header>

    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

      {/* Changer la page favorite */}
      {userData?.numeroH && (
        <button
          onClick={() => {
            localStorage.removeItem(`moftal_favori_${userData.numeroH}`);
            window.dispatchEvent(new CustomEvent('open-favori-modal'));
          }}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium transition-colors"
        >
          ⭐ Changer ma page d'accueil
        </button>
      )}

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
                    ? t('profile.role.admin')
                    : t('profile.role.user')}
                </span>
              </div>

              <div className="text-slate-600">
                <span className="font-medium">{t('profile.numeroh')}:</span>{" "}
                <span className="text-blue-600 font-semibold">
                  {getNumeroHForDisplay(userData.numeroH, true, false)}
                </span>
              </div>
              {userData.languesAutre && (
                <div className="text-slate-600">
                  <span className="font-medium">🌐 Langues :</span>{" "}
                  <span className="text-slate-700">
                    {(userData.languesAutre as string).split(";").map(l => l.trim()).filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
              {userData.handicap && (
                <div className="text-slate-600">
                  <span className="font-medium">{t('profile.handicap')}:</span>{" "}
                  <span className="text-emerald-700 font-semibold">
                    {userData.handicap === "OUI" ? t('profile.handicap.yes') : t('profile.handicap.no')}
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
              {t('profile.btn.identity')}
            </button>
            {canSeeAdminPanel && (
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 text-sm sm:text-base"
              >
                {t('profile.btn.admin')}
              </button>
            )}
            <button
              onClick={() => setShowActions(!showActions)}
              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1 text-sm sm:text-base"
            >
              {t('profile.btn.services')}
              <span className="text-xs bg-white/20 rounded px-1">
                {showActions ? '▲' : '▼'}
              </span>
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
            {t('profile.my_services')}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {t('profile.logos_desc')}
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
            {t('profile.logos_note')}
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
            {t('profile.my_video')}
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            {t('profile.video_desc')}
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
          style={{ borderLeftWidth: "4px", borderLeftColor: "#1a8f1a" }}
        >
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            {t('profile.my_institutions')}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {t('profile.institutions_desc')}
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
                  {t('profile.leave')}
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
            {t('profile.admin_panel')}
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
                {t('profile.offer_service')}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {t('profile.offer_service_desc')}
              </p>
            </div>
            <button
              onClick={() => setShowActions(false)}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              title={t('btn.close')}
            >
              ×
            </button>
          </div>

          {/* Offre 3 mois gratuits */}
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-4 py-3">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <div className="font-bold text-orange-700 text-sm">{t('profile.free_trial')}</div>
              <div className="text-xs text-orange-600 mt-0.5">{t('profile.free_trial_desc')}</div>
            </div>
          </div>

          {/* Types disponibles — aperçu visuel */}
          <div className="mt-5">
            <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">{t('profile.available_types')}</p>
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
              ].map(item => (
                <span key={item.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">
                  {item.icon} {item.label}
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
              {t('profile.create_pro')}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">{t('profile.create_pro_hint')}</p>
          </div>

        </div>
      )}

      {/* ── Langue + Se déconnecter + Supprimer ── */}
      <div className="mt-6 mb-4 flex flex-col gap-3">

        {/* Langue collapsible */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLang(!showLang)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">🌐 {t('header.language')}</span>
            <span className="text-xs text-gray-400">{showLang ? '▲' : '▼'}</span>
          </button>
          {showLang && (
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-slate-100 pt-3">
              {Object.entries(LANG_LABELS).map(([code, label]) => {
                const isSelected = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code as "fr" | "en" | "ar" | "man" | "pul")}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <span className="flex-1 text-left">{label}</span>
                    {isSelected && <span className="text-emerald-600">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Se déconnecter */}
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('session_user');
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold rounded-xl border border-orange-200 transition-colors"
        >
          <span>⏻</span>
          {t('btn.logout')}
        </button>

      </div>

    </div>
    </div>
  );
}
