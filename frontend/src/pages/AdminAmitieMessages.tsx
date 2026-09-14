import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Démo INTERACTIVE du vrai système de messagerie Amitié (le composant
 * CoupleChat.tsx, utilisé sur la page Partenaire une fois deux personnes
 * liées) — même interface, mêmes catégories, mêmes bulles — mais sans
 * aucun appel au serveur : tout reste local à cette page. Un admin doit
 * pouvoir voir et utiliser chaque fonctionnalité de son site pour la
 * proposer aux gens, sans jamais consulter les vraies conversations
 * privées des utilisateurs.
 */

interface DemoMessage {
  id: string;
  from: "moi" | "partenaire";
  content: string;
  category: string;
  heure: string;
}

const CATEGORIES = [
  { id: "information", label: "Information", icon: "📰" },
  { id: "amour", label: "Amour", icon: "❤️" },
  { id: "sante", label: "Santé", icon: "🏥" },
  { id: "argent", label: "Argent", icon: "💰" },
  { id: "enfants", label: "Enfants", icon: "🧒" },
  { id: "opportunite", label: "Opportunité", icon: "🌟" },
  { id: "urgence", label: "Urgence", icon: "🚨" },
];

const REPONSES_AUTO = [
  "D'accord, merci de me le dire !",
  "Très bien, on en reparle ce soir ?",
  "Je note, merci 💕",
  "OK, je m'en occupe.",
  "Parfait, à tout à l'heure !",
];

const heureActuelle = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function AdminAmitieMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DemoMessage[]>([
    { id: "1", from: "partenaire", content: "Salut, comment s'est passée ta journée ?", category: "information", heure: "09:14" },
    { id: "2", from: "moi", content: "Très bien, merci ! Et toi ?", category: "information", heure: "09:16" },
    { id: "3", from: "partenaire", content: "On se voit ce soir pour le dîner en famille ?", category: "information", heure: "09:17" },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [category, setCategory] = useState("information");
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!newMessage.trim()) return;
    const mine: DemoMessage = { id: Date.now().toString(), from: "moi", content: newMessage.trim(), category, heure: heureActuelle() };
    setMessages(prev => [...prev, mine]);
    setNewMessage("");
    setTimeout(() => {
      const reponse = REPONSES_AUTO[Math.floor(Math.random() * REPONSES_AUTO.length)];
      setMessages(prev => [...prev, { id: Date.now().toString() + "-r", from: "partenaire", content: reponse, category, heure: heureActuelle() }]);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm">
            ← Retour
          </button>
          <div>
            <h1 className="text-lg font-bold">💕 Amitié — Démo de la messagerie</h1>
            <p className="text-xs text-pink-100">Interface réelle, conversation fictive — écris un message pour l'essayer</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-3">
          ⚠️ Démo : "Partenaire (exemple)" est fictif et te répond automatiquement. Personne d'autre ne voit ni ne reçoit ces messages — jamais les vraies conversations des utilisateurs.
        </div>

        {/* Même interface que CoupleChat.tsx (page Partenaire), en local */}
        <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white" style={{ minHeight: 480, maxHeight: "75vh" }}>
          <div className="flex-1 bg-gray-100 px-3 py-3 overflow-y-auto">
            <div className="space-y-3">
              {messages.map(msg => {
                const isMe = msg.from === "moi";
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs sm:max-w-md px-3 py-2 rounded-2xl shadow-sm ${isMe ? "bg-rose-500 text-white rounded-br-sm" : "bg-white text-gray-900 rounded-bl-sm"}`}>
                      <p className="text-sm whitespace-pre-line">
                        {msg.category !== "information" && (
                          <span className="mr-1">{CATEGORIES.find(c => c.id === msg.category)?.icon}</span>
                        )}
                        {msg.content}
                      </p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-rose-100" : "text-gray-500"}`}>{msg.heure}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryGrid(v => !v)}
                  title="Choisir le type d'information"
                  className={`absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-colors ${showCategoryGrid ? "bg-rose-100" : "hover:bg-gray-100"}`}
                >
                  <span className="text-base leading-none">{CATEGORIES.find(c => c.id === category)?.icon}</span>
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Écrivez à Partenaire (exemple)..."
                  className="w-full min-w-0 pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white text-sm"
                />
                {showCategoryGrid && (
                  <div className="absolute bottom-11 left-0 z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-4 gap-1 w-56">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setCategory(cat.id); setShowCategoryGrid(false); }}
                        className={`flex flex-col items-center gap-0.5 py-2 rounded-lg ${category === cat.id ? "bg-rose-100" : "hover:bg-gray-100"}`}
                        title={cat.label}
                      >
                        <span className="text-lg leading-none">{cat.icon}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {newMessage.trim() && (
                <button
                  type="button"
                  onClick={send}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-rose-600 hover:bg-rose-700 transition-colors flex-shrink-0"
                >
                  ➤
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
