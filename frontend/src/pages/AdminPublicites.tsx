import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../config/api";

interface Publicite {
  id: string;
  numero_h: string;
  nom: string;
  image_url: string;
  lien?: string;
  statut: "en_attente" | "approuve" | "refuse";
  raison_refus?: string;
  expire_le?: string;
  is_active: boolean;
  en_ligne?: boolean;
  created_at: string;
}

const API_ORIGIN = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "";

export default function AdminPublicites() {
  const navigate = useNavigate();
  const API = (config.API_BASE_URL || "http://localhost:5002/api");
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [tab, setTab] = useState<"attente" | "toutes">("attente");
  const [enAttente, setEnAttente] = useState<Publicite[]>([]);
  const [toutes, setToutes] = useState<Publicite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chargerTout();
  }, []);

  async function chargerTout() {
    setLoading(true);
    setError(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/publicites/admin/en-attente`, { headers }),
        fetch(`${API}/publicites/admin/toutes`, { headers }),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (d1.success) setEnAttente(d1.publicites);
      else setError(d1.message || "Impossible de charger les publicités en attente.");
      if (d2.success) setToutes(d2.publicites);
      else setError(prev => prev || d2.message || "Impossible de charger les publicités.");
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  async function approuver(id: string) {
    setBusyId(id);
    try {
      await fetch(`${API}/publicites/admin/${id}/approuver`, { method: "POST", headers });
      chargerTout();
    } finally {
      setBusyId(null);
    }
  }

  async function refuser(id: string) {
    const raison = prompt("Raison du refus (optionnel) :") || "";
    setBusyId(id);
    try {
      await fetch(`${API}/publicites/admin/${id}/refuser`, {
        method: "POST",
        headers,
        body: JSON.stringify({ raison }),
      });
      chargerTout();
    } finally {
      setBusyId(null);
    }
  }

  const imgUrl = (path: string) => (path.startsWith("http") ? path : `${API_ORIGIN}${path}`);

  const STATUT_LABEL: Record<string, { label: string; bg: string; text: string }> = {
    en_attente: { label: "⏳ En attente", bg: "bg-amber-100", text: "text-amber-700" },
    approuve:   { label: "✅ Approuvée",  bg: "bg-green-100", text: "text-green-700" },
    refuse:     { label: "❌ Refusée",    bg: "bg-red-100",   text: "text-red-700" },
  };

  const liste = tab === "attente" ? enAttente : toutes;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white px-6 py-5 flex items-center gap-4">
        <button onClick={() => navigate("/admin")} className="text-white/80 hover:text-white transition-colors">
          ← Retour Admin
        </button>
        <div>
          <h1 className="text-2xl font-bold">📣 Publicités — Approbation</h1>
          <p className="text-emerald-200 text-sm mt-0.5">
            Approuve ou refuse les publicités proposées avant qu'elles puissent être payées
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        {/* Onglets */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm w-fit">
          <button onClick={() => setTab("attente")}
            className={`px-5 py-2.5 text-sm font-bold transition-all ${tab === "attente" ? "bg-emerald-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
            ⏳ En attente {enAttente.length > 0 && `(${enAttente.length})`}
          </button>
          <button onClick={() => setTab("toutes")}
            className={`px-5 py-2.5 text-sm font-bold transition-all ${tab === "toutes" ? "bg-emerald-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
            📋 Toutes
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : liste.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
            <p className="text-3xl mb-3">📭</p>
            <p className="font-semibold">
              {tab === "attente" ? "Aucune publicité en attente." : "Aucune publicité pour l'instant."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liste.map(p => {
              const info = STATUT_LABEL[p.statut] || STATUT_LABEL.en_attente;
              const enLigne = p.is_active && (p.en_ligne === true || (p as any).en_ligne === "t");
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <img src={imgUrl(p.image_url)} alt="" className="w-full h-40 object-cover bg-gray-100" />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${enLigne ? "bg-green-100 text-green-700" : info.bg + " " + info.text}`}>
                        {enLigne ? "🟢 En ligne" : info.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{p.nom || p.numero_h}</p>
                    <p className="text-xs text-gray-400">{p.numero_h}</p>
                    {p.lien && <p className="text-xs text-blue-500 truncate mt-0.5">🔗 {p.lien}</p>}
                    {p.statut === "refuse" && p.raison_refus && (
                      <p className="text-xs text-red-500 mt-1">Raison : {p.raison_refus}</p>
                    )}
                    {p.statut === "en_attente" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => approuver(p.id)}
                          disabled={busyId === p.id}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => refuser(p.id)}
                          disabled={busyId === p.id}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                        >
                          Refuser
                        </button>
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
