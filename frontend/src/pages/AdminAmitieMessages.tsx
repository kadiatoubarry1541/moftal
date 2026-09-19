import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Modération Amitié — réservée au chef unique (G7), pour la sécurité des
 * utilisateurs. Montre les vraies conversations et permet de les consulter
 * (lecture seule : un admin ne doit jamais écrire à la place de quelqu'un).
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

interface AdminMessage {
  id: string;
  numeroH: string;
  authorName: string;
  content: string;
  messageType?: string;
  mediaUrl?: string | null;
  createdAt?: string;
  created_at?: string;
}

export default function AdminAmitieMessages() {
  const navigate = useNavigate();
  const [links, setLinks] = useState<ConversationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ConversationLink | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

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

  const openConversation = async (link: ConversationLink) => {
    setSelected(link);
    setMessagesLoading(true);
    setMessages([]);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/friends/messages?linkId=${link.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMessages(data.messages || []);
    } catch {
      // non bloquant
    } finally {
      setMessagesLoading(false);
    }
  };

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
          <button onClick={() => (selected ? setSelected(null) : navigate("/admin"))} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm">
            ← Retour
          </button>
          <div>
            <h1 className="text-lg font-bold">💕 Amitié — Modération</h1>
            <p className="text-xs text-pink-100">Accès réservé, pour la sécurité des utilisateurs</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {!selected ? (
          <>
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
              <p className="text-center text-gray-500 py-8">Aucune conversation trouvée.</p>
            ) : (
              <div className="space-y-2">
                {filteredLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => openConversation(link)}
                    className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{label(link.userA)} ↔ {label(link.userB)}</p>
                      <p className="text-xs text-gray-400">{link.userA.numeroH} · {link.userB.numeroH}</p>
                    </div>
                    <span className="text-gray-300">→</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white" style={{ minHeight: 480, maxHeight: "75vh" }}>
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-800">{label(selected.userA)} ↔ {label(selected.userB)}</p>
            </div>
            <div className="flex-1 bg-gray-100 px-3 py-3 overflow-y-auto">
              {messagesLoading ? (
                <p className="text-center text-gray-500 text-sm py-8">Chargement...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">Aucun message pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isA = msg.numeroH === selected.userA.numeroH;
                    return (
                      <div key={msg.id} className={`flex ${isA ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-xs sm:max-w-md px-3 py-2 rounded-2xl shadow-sm ${isA ? "bg-white text-gray-900 rounded-bl-sm" : "bg-rose-500 text-white rounded-br-sm"}`}>
                          <p className={`text-[10px] font-semibold mb-0.5 ${isA ? "text-gray-500" : "text-rose-100"}`}>{msg.authorName}</p>
                          {msg.messageType === "image" && msg.mediaUrl ? (
                            <img src={msg.mediaUrl} alt="" className="rounded-lg max-h-48" />
                          ) : msg.messageType === "video" && msg.mediaUrl ? (
                            <video src={msg.mediaUrl} controls className="rounded-lg max-h-48" />
                          ) : msg.messageType === "audio" && msg.mediaUrl ? (
                            <audio src={msg.mediaUrl} controls />
                          ) : (
                            <p className="text-sm whitespace-pre-line">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
