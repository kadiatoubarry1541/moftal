import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser, isAdmin } from "../utils/auth";

interface ResponsablesQuartier {
  chef_nom?: string | null;
  chef_numero_h?: string | null;
  gestionnaire_nom?: string | null;
  gestionnaire_numero_h?: string | null;
}
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');

export default function Quartier() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);
  const quartierNom = user?.quartier || user?.ville || "";
  const userNumeroH = user?.numeroH || user?.numero_h || "";

  const [manager, setManager] = useState<ResponsablesQuartier | null>(null);
  const [showGestion, setShowGestion] = useState(false);
  const [mgrLoading, setMgrLoading] = useState(false);
  const [mgrForm, setMgrForm] = useState({
    chef_numero_h: "", chef_nom: "",
    gestionnaire_numero_h: "", gestionnaire_nom: ""
  });

  useEffect(() => {
    if (user && quartierNom) loadManager();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, []);

  const loadManager = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/mosque-mgmt/quartier-managers/${encodeURIComponent(quartierNom)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setManager(data.manager);
        if (data.manager) {
          setMgrForm({
            chef_numero_h: data.manager.chef_numero_h || "",
            chef_nom: data.manager.chef_nom || "",
            gestionnaire_numero_h: data.manager.gestionnaire_numero_h || "",
            gestionnaire_nom: data.manager.gestionnaire_nom || ""
          });
        }
      }
    } catch {}
  };

  const saveManager = async () => {
    if (!quartierNom) return;
    setMgrLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/mosque-mgmt/quartier-managers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ quartier_nom: quartierNom, ...mgrForm })
      });
      if (res.ok) {
        await loadManager();
        setShowGestion(false);
        alert("Responsables du quartier mis à jour avec succès !");
      } else {
        const err = await res.json();
        alert(err.message || "Erreur lors de la mise à jour.");
      }
    } catch {
      alert("Erreur réseau. Veuillez réessayer.");
    } finally {
      setMgrLoading(false);
    }
  };

  const isChef = manager && manager.chef_numero_h && manager.chef_numero_h === userNumeroH;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🏘️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Mon Quartier</h2>
          <p className="text-slate-500 mb-6">Connectez-vous pour accéder à votre espace quartier</p>
          <button onClick={() => navigate("/login")} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white px-4 py-10 text-center">
        <div className="text-5xl mb-3">🏘️</div>
        <h1 className="text-3xl font-extrabold mb-2">Mon Quartier</h1>
        <p className="text-blue-100 text-base max-w-lg mx-auto">
          Les responsables de votre quartier, et un signalement en un geste
        </p>
        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
          <span>📍</span>
          <span>{quartierNom || "Quartier non défini"}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ─── Responsables du quartier ─── */}
        {quartierNom && (
          <div className="mb-6 bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Responsables du quartier</h2>
              {(userIsAdmin || isChef) && (
                <button
                  onClick={() => setShowGestion(true)}
                  className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {manager ? "Modifier" : "Désigner"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Chef de quartier */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">👑</div>
                <div className="min-w-0">
                  <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Chef de quartier</div>
                  {manager?.chef_nom ? (
                    <>
                      <div className="font-bold text-slate-800 text-sm truncate">{manager.chef_nom}</div>
                      {manager.chef_numero_h && (
                        <div className="text-xs text-slate-400">N°H {manager.chef_numero_h}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-slate-400 italic">Non désigné</div>
                  )}
                </div>
              </div>
              {/* Gestionnaire de caisse */}
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0">💰</div>
                <div className="min-w-0">
                  <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Gestionnaire de caisse</div>
                  {manager?.gestionnaire_nom ? (
                    <>
                      <div className="font-bold text-slate-800 text-sm truncate">{manager.gestionnaire_nom}</div>
                      {manager.gestionnaire_numero_h && (
                        <div className="text-xs text-slate-400">N°H {manager.gestionnaire_numero_h}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-slate-400 italic">Non désigné</div>
                  )}
                </div>
              </div>
            </div>
            {!manager && !userIsAdmin && (
              <p className="text-xs text-slate-400 text-center mt-3">Les responsables de ce quartier seront désignés par l'administrateur.</p>
            )}
          </div>
        )}

        {/* Bouton signalement */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="text-4xl">📢</div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-slate-800">Signaler un problème dans le quartier</h3>
            <p className="text-slate-500 text-sm mt-1">Route dégradée, manque d'éclairage, insécurité… faites remonter l'information</p>
          </div>
          {/* Le signalement se publie dans l'espace du quartier (Terre d'Adam,
              catégorie Sécurité) — pas dans la Caisse de la famille */}
          <button
            onClick={() => navigate("/terre-adam")}
            className="px-5 py-2.5 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors text-sm whitespace-nowrap"
          >
            📢 Signaler
          </button>
        </div>
      </div>

      {/* ─── Modal : Désigner les responsables ──────────────────────────── */}
      {showGestion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-cyan-600 p-5">
              <h2 className="text-xl font-bold text-white">👑 Responsables du quartier</h2>
              <p className="text-blue-100 text-sm mt-1">{quartierNom} — 1 chef + 1 gestionnaire de caisse</p>
            </div>
            <div className="p-6 space-y-5">

              {/* Chef de quartier — visible admin seulement */}
              {userIsAdmin && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">👑</span>
                    <span className="font-bold text-slate-800 text-sm">Chef de quartier</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={mgrForm.chef_nom}
                      onChange={(e) => setMgrForm({ ...mgrForm, chef_nom: e.target.value })}
                      placeholder="Nom complet du chef *"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={mgrForm.chef_numero_h}
                      onChange={(e) => setMgrForm({ ...mgrForm, chef_numero_h: e.target.value })}
                      placeholder="Numéro H (ex: H-12345)"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Gestionnaire de caisse — chef ou admin */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💰</span>
                  <span className="font-bold text-slate-800 text-sm">Gestionnaire de caisse</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={mgrForm.gestionnaire_nom}
                    onChange={(e) => setMgrForm({ ...mgrForm, gestionnaire_nom: e.target.value })}
                    placeholder="Nom complet du gestionnaire *"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={mgrForm.gestionnaire_numero_h}
                    onChange={(e) => setMgrForm({ ...mgrForm, gestionnaire_numero_h: e.target.value })}
                    placeholder="Numéro H (ex: H-67890)"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                <strong>Règle :</strong> 1 seul chef de quartier + 1 gestionnaire de caisse par quartier. Le gestionnaire gère les cotisations de la caisse de développement.
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowGestion(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveManager}
                disabled={mgrLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {mgrLoading ? "Enregistrement..." : "✔ Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
