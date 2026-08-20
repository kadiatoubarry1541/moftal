import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser, isAdmin, isMasterAdmin, getPhotoUrl } from "../utils/auth";
import { config } from "../config/api";
import { VerifiedBadge } from "../components/VerifiedBadge";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";

interface Candidat {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  photo?: string;
  nbEnfants: number;
}

export default function AdminVerification() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const token = localStorage.getItem("token");

  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; texte: string } | null>(null);

  useEffect(() => {
    if (!user || (!isAdmin(user) && !isMasterAdmin(user))) {
      navigate("/");
      return;
    }
    charger();
  }, []);

  async function charger() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/verification/admin/candidats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCandidats(data.candidats);
    } catch {
      /* silencieux */
    }
    setLoading(false);
  }

  async function approuver(c: Candidat) {
    if (!confirm(`Accorder le badge "Compte vérifié" à ${c.prenom} ${c.nomFamille} ?`)) return;
    setActionLoading(c.numeroH);
    try {
      const res = await fetch(`${API}/api/verification/admin/${c.numeroH}/approuver`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessage({ type: data.success ? "ok" : "err", texte: data.message });
      if (data.success) setCandidats((prev) => prev.filter((x) => x.numeroH !== c.numeroH));
    } catch {
      setMessage({ type: "err", texte: "Erreur de connexion." });
    }
    setActionLoading(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">←</button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="font-bold text-gray-800 flex items-center gap-1.5">
            <VerifiedBadge size={18} /> Comptes vérifiés
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
          Ces comptes remplissent déjà tous les critères automatiques : au moins un enfant dans l'arbre familial, une activité professionnelle approuvée, une photo de profil, un numéro de téléphone, et un compte actif depuis au moins 60 jours. Il ne manque que ton approbation.
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-sm font-semibold ${message.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.texte}
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-10">Chargement...</p>
        ) : candidats.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <p className="text-3xl mb-3">📭</p>
            <p className="font-semibold">Aucun candidat pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidats.map((c) => (
              <div key={c.numeroH} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                <img
                  src={getPhotoUrl(c.photo)}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border border-gray-200 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{c.prenom} {c.nomFamille}</p>
                  <p className="text-xs text-gray-500">{c.nbEnfants} enfant{c.nbEnfants > 1 ? "s" : ""} · {c.numeroH}</p>
                </div>
                <button
                  onClick={() => approuver(c)}
                  disabled={actionLoading === c.numeroH}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg flex-shrink-0"
                >
                  {actionLoading === c.numeroH ? "..." : "✅ Approuver"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
