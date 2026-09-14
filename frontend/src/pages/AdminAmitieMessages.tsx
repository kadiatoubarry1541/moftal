import { useNavigate } from "react-router-dom";

/**
 * Vue "exemple" de la fonctionnalité Amitié — PAS les vraies conversations
 * des utilisateurs. Un admin ne doit jamais consulter les messages privés
 * réels des gens : ceci montre juste à quoi ressemble un lien de couple
 * confirmé et un échange de messages type, pour comprendre le fonctionnement
 * de la fonctionnalité sans violer la vie privée de personne.
 */
const EXEMPLE_MESSAGES = [
  { auteur: "Amadou (exemple)", texte: "Salut, comment s'est passée ta journée ?", heure: "09:14" },
  { auteur: "Fatoumata (exemple)", texte: "Très bien, merci ! Et toi ?", heure: "09:16" },
  { auteur: "Amadou (exemple)", texte: "On se voit ce soir pour le dîner en famille ?", heure: "09:17" },
  { auteur: "Fatoumata (exemple)", texte: "Avec plaisir 💕", heure: "09:20" },
];

export default function AdminAmitieMessages() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm">
            ← Retour
          </button>
          <div>
            <h1 className="text-lg font-bold">💕 Amitié — Exemple de fonctionnement</h1>
            <p className="text-xs text-pink-100">Données fictives, pour comprendre la fonctionnalité</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          ⚠️ Ceci est un exemple avec des noms et messages fictifs — pas les vraies conversations des utilisateurs. Un admin ne consulte jamais les messages privés réels des gens.
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">1. Comment un lien se crée</h2>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Une personne entre le NuméroH de son/sa partenaire et envoie une demande.</li>
            <li>L'autre personne reçoit une notification et doit confirmer pour que le lien devienne actif.</li>
            <li>Une fois actif, les deux peuvent s'écrire dans une messagerie privée liée à ce couple.</li>
          </ol>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">2. Exemple de conversation</h2>
          <div className="space-y-2">
            {EXEMPLE_MESSAGES.map((m, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-pink-700">{m.auteur}</span>
                  <span className="text-[10px] text-gray-400">{m.heure}</span>
                </div>
                <p className="text-sm text-gray-700">{m.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
