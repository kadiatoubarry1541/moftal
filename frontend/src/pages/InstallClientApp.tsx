import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const API = "http://localhost:5002";

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  clinic:          { label: "Clinique / Hôpital",        icon: "🏥", color: "#1a8f1a" },
  health_worker:   { label: "Médecin / Agent de santé",  icon: "👨‍⚕️", color: "#1a8f1a" },
  school:          { label: "École / Établissement",     icon: "🏫", color: "#2563eb" },
  madrasa:         { label: "Formation Religieuse",       icon: "📖", color: "#2563eb" },
  mosque:          { label: "Mosquée / Madrasa",         icon: "🕌", color: "#f43f5e" },
  enterprise:      { label: "Entreprise",                icon: "🏢", color: "#f59e0b" },
  restaurant:      { label: "Restaurant",                icon: "🍽️", color: "#f97316" },
  transport:       { label: "Transport & Livraison",     icon: "🚗", color: "#3b82f6" },
  beauty:          { label: "Beauté & Bien-être",        icon: "💈", color: "#d946ef" },
  artisan:         { label: "Artisanat & Services",      icon: "🔧", color: "#57534e" },
  ngo:             { label: "ONG / Association",         icon: "🤝", color: "#f43f5e" },
  reseau:          { label: "Association / Réseau",      icon: "🌐", color: "#06b6d4" },
  commerce:        { label: "Commerce / Boutique",       icon: "🛒", color: "#06b6d4" },
  security_agency: { label: "Sécurité",                  icon: "🛡️", color: "#334155" },
  mairie:          { label: "Mairie / État Civil",       icon: "🏛️", color: "#1e40af" },
  journalist:      { label: "Journaliste",               icon: "📰", color: "#06b6d4" },
  supplier:        { label: "Fournisseur",               icon: "📦", color: "#06b6d4" },
  vendor:          { label: "Vendeur",                   icon: "🛒", color: "#06b6d4" },
  scientist:       { label: "Chercheur / Scientifique",  icon: "🔬", color: "#4f46e5" },
};

interface ProInfo {
  id: string;
  name: string;
  type: string;
  photo?: string | null;
  city?: string;
  description?: string;
  phone?: string;
}

export default function InstallClientApp() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pro, setPro] = useState<ProInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/professionals/detail/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.account) {
          setPro(data.account);
        } else {
          setError("Établissement introuvable.");
        }
      })
      .catch(() => setError("Impossible de charger les informations."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !pro) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-gray-700 font-semibold mb-4">{error || "Lien invalide."}</p>
        <button onClick={() => navigate("/")} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const typeInfo = TYPE_LABELS[pro.type] || { label: "Établissement", icon: "🏢", color: "#1a8f1a" };

  return (
    <>
      <DynamicAppManifest
        name={pro.name}
        description={`Accès direct — ${pro.name}`}
        proId={pro.id}
        startUrl={`/rendez-vous/${pro.id}`}
        themeColor={typeInfo.color}
        backgroundColor="#ffffff"
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm">

          {/* Carte principale */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

            {/* En-tête coloré */}
            <div
              className="px-6 py-8 text-center"
              style={{ background: `linear-gradient(135deg, ${typeInfo.color}, ${typeInfo.color}cc)` }}
            >
              {/* Logo / Icône */}
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/20 backdrop-blur mx-auto mb-4 flex items-center justify-center shadow-lg border-4 border-white/40">
                {pro.photo ? (
                  <img src={pro.photo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-5xl">{typeInfo.icon}</span>
                )}
              </div>
              <h1 className="text-white font-bold text-xl leading-tight">{pro.name}</h1>
              <p className="text-white/80 text-sm mt-1">{typeInfo.icon} {typeInfo.label}</p>
              {pro.city && <p className="text-white/70 text-xs mt-0.5">📍 {pro.city}</p>}
            </div>

            {/* Corps */}
            <div className="px-6 py-6 space-y-5">
              <div className="text-center">
                <p className="text-gray-700 font-semibold text-base">
                  Installez l'app sur votre téléphone
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Accédez directement à <strong>{pro.name}</strong> depuis votre écran d'accueil — sans chercher dans un navigateur.
                </p>
              </div>

              {/* Bouton d'installation */}
              <div className="flex justify-center">
                <InstallAppButton />
              </div>

              {/* Description si dispo */}
              {pro.description && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-600 line-clamp-3">{pro.description}</p>
                </div>
              )}

              {/* Contact rapide */}
              {pro.phone && (
                <a
                  href={`tel:${pro.phone}`}
                  className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 hover:bg-emerald-100 transition-colors"
                >
                  <span className="text-xl">📞</span>
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">Appeler directement</p>
                    <p className="text-sm text-emerald-700">{pro.phone}</p>
                  </div>
                </a>
              )}

              {/* Prendre RDV */}
              <button
                onClick={() => navigate(`/rendez-vous/${pro.id}`)}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all active:scale-95"
                style={{ backgroundColor: typeInfo.color }}
              >
                Prendre rendez-vous →
              </button>
            </div>
          </div>

          {/* Retour site principal */}
          <div className="mt-5 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-gray-500 text-sm hover:text-gray-700 underline underline-offset-2"
            >
              ← Retour à Les Enfants d'Adam
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
