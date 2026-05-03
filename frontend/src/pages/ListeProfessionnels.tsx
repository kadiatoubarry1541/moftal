import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSessionUser, isAdmin } from "../utils/auth";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface ProAccount {
  id: string;
  type: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  services: string[];
  specialties: string[];
  photo?: string;
}

const TYPES = [
  { id: "", label: "Tous", icon: "📋" },
  { id: "clinic", label: "Cliniques", icon: "🏥" },
  { id: "security_agency", label: "Sécurité", icon: "🛡️" },
  { id: "journalist", label: "Journalistes", icon: "📰" },
  { id: "enterprise", label: "Entreprises", icon: "🏢" },
  { id: "school", label: "Écoles", icon: "🎓" },
  { id: "supplier", label: "Fournisseurs", icon: "📦" },
  { id: "vendor", label: "Vendeurs", icon: "🛒" },
  { id: "producer", label: "Producteurs", icon: "🏭" },
  { id: "broker", label: "Immobilier", icon: "🏘️" },
  { id: "scientist", label: "Scientifiques", icon: "🔬" },
  { id: "ngo", label: "ONG / Associations", icon: "🤝" },
  { id: "restaurant", label: "Restaurants", icon: "🍽️" },
  { id: "transport", label: "Transport", icon: "🚗" },
  { id: "beauty", label: "Beauté", icon: "💈" },
  { id: "artisan", label: "Artisanat", icon: "🔧" },
];

function getTypeIcon(type: string) {
  return TYPES.find(t => t.id === type)?.icon || "🏢";
}

export default function ListeProfessionnels() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<ProAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filterType = searchParams.get("type") || "";

  const currentUser = getSessionUser();
  const userIsAdmin = isAdmin(currentUser);

  useEffect(() => {
    loadAccounts();
  }, [filterType]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const url = filterType
        ? `${API_BASE}/api/professionals/approved?type=${filterType}`
        : `${API_BASE}/api/professionals/approved`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setAccounts(data.accounts || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) { loadAccounts(); return; }
    setLoading(true);
    try {
      const url = `${API_BASE}/api/professionals/search?q=${encodeURIComponent(search)}&type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setAccounts(data.accounts || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildLocation = (pro: ProAccount) => {
    return [pro.address, pro.city, pro.country].filter(Boolean).join(", ");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/compte")} className="min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-colors">
            ← Retour
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Professionnels & Services</h1>
        </div>

        {/* Recherche */}
        <div className="flex gap-2 mb-4">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Rechercher un nom, une adresse, une ville..."
            className="flex-1 min-h-[44px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSearch} className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            🔍
          </button>
        </div>

        {/* Filtres par type */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-thin">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSearchParams(t.id ? { type: t.id } : {}); setExpandedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${
                filterType === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500">Aucun professionnel trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((pro) => {
              const isExpanded = expandedId === pro.id;
              const location = buildLocation(pro);

              return (
                <div key={pro.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">

                  {/* ── PHOTO ── */}
                  <div className="relative w-full h-44 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                    {pro.photo ? (
                      <img
                        src={pro.photo}
                        alt={pro.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">
                        {getTypeIcon(pro.type)}
                      </div>
                    )}
                    {/* Badge type */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-full shadow-sm">
                      {TYPES.find(t => t.id === pro.type)?.icon} {TYPES.find(t => t.id === pro.type)?.label}
                    </span>
                  </div>

                  {/* ── INFOS PRINCIPALES ── */}
                  <div className="p-4 flex flex-col flex-1">

                    {/* Nom */}
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-2 leading-snug">
                      {pro.name}
                    </h3>

                    {/* Services */}
                    {pro.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {pro.services.slice(0, 4).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-100 dark:border-blue-800">
                            {s}
                          </span>
                        ))}
                        {pro.services.length > 4 && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-full">
                            +{pro.services.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Adresse */}
                    {location && (
                      <div className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="mt-0.5 flex-shrink-0">📍</span>
                        <span>{location}</span>
                      </div>
                    )}

                    {/* Téléphone */}
                    {pro.phone && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-sm flex-shrink-0">📞</span>
                        <a
                          href={`tel:${pro.phone}`}
                          className="text-sm font-semibold text-green-600 dark:text-green-400 hover:underline"
                        >
                          {pro.phone}
                        </a>
                      </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* ── BOUTONS PRINCIPAUX ── */}
                    <div className="flex gap-2 mt-2">
                      {pro.phone && (
                        <a
                          href={`tel:${pro.phone}`}
                          className="flex-1 flex items-center justify-center gap-1 min-h-[38px] px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          📞 Appeler
                        </a>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : pro.id)}
                        className={`flex items-center justify-center gap-1 min-h-[38px] px-3 py-2 text-xs font-semibold rounded-xl transition-colors border ${
                          isExpanded
                            ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                            : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                        }`}
                      >
                        {isExpanded ? "✕ Fermer" : "＋ Plus d'infos"}
                      </button>
                    </div>

                    {/* ── SECTION DÉTAILS EXPANDABLE ── */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">

                        {/* Description */}
                        {pro.description && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Description</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pro.description}</p>
                          </div>
                        )}

                        {/* Spécialités */}
                        {pro.specialties?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Spécialités</p>
                            <div className="flex flex-wrap gap-1">
                              {pro.specialties.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full border border-purple-100 dark:border-purple-800">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Email */}
                        {pro.email && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">✉️</span>
                            <a href={`mailto:${pro.email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                              {pro.email}
                            </a>
                          </div>
                        )}

                        {/* Bouton Rendez-vous */}
                        <button
                          onClick={() => navigate(`/rendez-vous/${pro.id}`)}
                          className="w-full min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2"
                        >
                          📅 Prendre rendez-vous
                        </button>

                        {/* Bouton admin — accès direct au dashboard du professionnel */}
                        {userIsAdmin && (
                          <button
                            onClick={() => navigate(`/espace-pro/${pro.id}`)}
                            className="w-full min-h-[40px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            👁️ Voir le dashboard (Admin)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
