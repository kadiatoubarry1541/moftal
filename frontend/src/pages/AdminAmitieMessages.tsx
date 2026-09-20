import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Relations Amitié — réservé au chef unique (G7), pour la sécurité des
 * utilisateurs. Montre uniquement qui est en lien avec qui (comme la liste
 * des couples) — jamais le contenu des messages, qui reste strictement
 * privé entre les deux personnes concernées.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

interface LinkUser {
  numeroH: string;
  prenom?: string;
  nomFamille?: string;
  photo?: string;
}

interface ConversationLink {
  id: string;
  userA: LinkUser;
  userB: LinkUser;
  acceptedAt?: string;
}

export default function AdminAmitieMessages() {
  const navigate = useNavigate();
  const [links, setLinks] = useState<ConversationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/api/friends/admin/all-links`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLinks(data.links || []);
        else setError(data.message || "Accès refusé");
      })
      .catch(() => setError("Erreur de connexion"))
      .finally(() => setLoading(false));
  }, []);

  const label = (u: LinkUser) => `${u.prenom || ""} ${u.nomFamille || ""}`.trim() || u.numeroH;

  const filteredLinks = links.filter((l) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return label(l.userA).toLowerCase().includes(q) || label(l.userB).toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm">
            ← Retour
          </button>
          <div>
            <h1 className="text-lg font-bold">💕 Amitié — Relations</h1>
            <p className="text-xs text-pink-100">Qui est ami avec qui, sans accès au contenu des messages</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un nom..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        {loading ? (
          <p className="text-center text-gray-500 py-8">Chargement...</p>
        ) : error ? (
          <p className="text-center text-red-600 py-8">{error}</p>
        ) : filteredLinks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune relation trouvée.</p>
        ) : (
          <div className="space-y-2">
            {filteredLinks.map((link) => (
              <div key={link.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{label(link.userA)} ↔ {label(link.userB)}</p>
                  <p className="text-xs text-gray-400">{link.userA.numeroH} · {link.userB.numeroH}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
