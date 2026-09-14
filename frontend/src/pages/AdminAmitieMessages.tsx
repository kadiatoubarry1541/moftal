import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../config/api";

interface UserMini {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  photo?: string;
}

interface CoupleLinkRow {
  id: string;
  status: string;
  numeroH1: string;
  numeroH2: string;
  createdAt: string;
  confirmedAt?: string | null;
  user1: UserMini | null;
  user2: UserMini | null;
}

interface CoupleMessageRow {
  id: string;
  numeroH: string;
  authorName: string;
  messageType: string;
  content: string;
  mediaUrl?: string | null;
  created_at: string;
}

export default function AdminAmitieMessages() {
  const navigate = useNavigate();
  const API = config.API_BASE_URL || "http://localhost:5002/api";
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [links, setLinks] = useState<CoupleLinkRow[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CoupleLinkRow | null>(null);
  const [messages, setMessages] = useState<CoupleMessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetch(`${API}/couple/admin/all-links`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d.success) setLinks(d.links || []);
        else setError(d.message || "Erreur lors du chargement.");
      })
      .catch(() => setError("Erreur réseau."))
      .finally(() => setLoadingLinks(false));
  }, []);

  const openConversation = (link: CoupleLinkRow) => {
    setSelected(link);
    setMessages([]);
    setLoadingMessages(true);
    fetch(`${API}/couple/messages?linkId=${link.id}`, { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setMessages(d.messages || []); })
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  };

  const nameOf = (u: UserMini | null) => u ? `${u.prenom || ""} ${u.nomFamille || ""}`.trim() || u.numeroH : "?";

  const filteredLinks = links.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return nameOf(l.user1).toLowerCase().includes(q) || nameOf(l.user2).toLowerCase().includes(q);
  });

  const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    active: { label: "Actif", cls: "bg-green-100 text-green-700" },
    pending: { label: "En attente", cls: "bg-amber-100 text-amber-700" },
    rejected: { label: "Refusé", cls: "bg-gray-100 text-gray-600" },
    broken: { label: "Rompu", cls: "bg-red-100 text-red-700" },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm">
            ← Retour
          </button>
          <div>
            <h1 className="text-lg font-bold">💕 Messagerie Amitié — Vue admin</h1>
            <p className="text-xs text-pink-100">Tous les couples liés et leurs conversations, pour connaître le produit</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Liste des liens */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un nom..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 outline-none focus:ring-2 focus:ring-pink-200"
          />
          {loadingLinks ? (
            <p className="text-sm text-gray-400 text-center py-6">Chargement...</p>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-6">{error}</p>
          ) : filteredLinks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun lien de couple trouvé.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredLinks.map(link => {
                const st = STATUS_LABELS[link.status] || { label: link.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <button
                    key={link.id}
                    onClick={() => openConversation(link)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selected?.id === link.id ? "border-pink-400 bg-pink-50" : "border-gray-100 hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {nameOf(link.user1)} 💕 {nameOf(link.user2)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {link.confirmedAt ? `Confirmé le ${new Date(link.confirmedAt).toLocaleDateString("fr-FR")}` : `Créé le ${new Date(link.createdAt).toLocaleDateString("fr-FR")}`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-4">
          {!selected ? (
            <p className="text-sm text-gray-400 text-center py-10">Sélectionnez un couple à gauche pour voir sa conversation.</p>
          ) : (
            <>
              <h3 className="text-sm font-bold text-gray-800 mb-3">
                {nameOf(selected.user1)} 💕 {nameOf(selected.user2)}
              </h3>
              {loadingMessages ? (
                <p className="text-sm text-gray-400 text-center py-6">Chargement...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucun message échangé pour l'instant.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {messages.map(m => (
                    <div key={m.id} className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-bold text-pink-700">{m.authorName}</span>
                        <span className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                      </div>
                      {m.messageType === "text" ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.content}</p>
                      ) : m.messageType === "image" && m.mediaUrl ? (
                        <img src={m.mediaUrl} alt="" className="max-w-[200px] rounded-lg mt-1" />
                      ) : m.messageType === "video" && m.mediaUrl ? (
                        <video src={m.mediaUrl} controls className="max-w-[200px] rounded-lg mt-1" />
                      ) : m.messageType === "audio" && m.mediaUrl ? (
                        <audio src={m.mediaUrl} controls className="mt-1" />
                      ) : (
                        <p className="text-sm text-gray-500 italic">{m.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
