import { useState } from 'react';

const TERMS_KEY = 'terms_accepted_v1';

export function hasAcceptedTerms(): boolean {
  return localStorage.getItem(TERMS_KEY) === 'true';
}

/** Permet à l'admin de réinitialiser l'acceptation pour revoir la modal */
export function resetTermsAcceptance(): void {
  localStorage.removeItem(TERMS_KEY);
}

interface TermsModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

const POINTS = [
  { num: 1, titre: 'Légalité & Responsabilité', texte: "En utilisant ce portail, vous reconnaissez connaître les lois de votre pays applicables à la protection des données et assumez seul l'entière responsabilité de ce que vous publiez — la plateforme ne peut en être tenue responsable." },
  { num: 2, titre: 'Respect & Contenu', texte: "Il est strictement interdit de publier sans consentement des informations sur autrui, ainsi que tout contenu sexuel, haineux, violent ou illégal ; tout manquement entraîne la suspension ou suppression immédiate du compte." },
  { num: 3, titre: 'Liberté & Contrôle', texte: "Vous êtes libre de définir ce que vous partagez, avec qui vous interagissez et ce que vous rendez visible, et vous pouvez supprimer votre compte à tout moment — vos données seront effacées conformément à la loi." },
];

export function TermsModal({ onAccept, onDecline }: TermsModalProps) {
  const [checked, setChecked] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (!checked) return;
    localStorage.setItem(TERMS_KEY, 'true');
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="relative flex flex-col rounded-2xl overflow-hidden w-full"
        style={{ maxWidth: 520, maxHeight: '88vh', background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
          <span style={{ fontSize: 24 }}>⚖️</span>
          <div>
            <h2 className="text-white font-bold text-base leading-tight">Conditions d'Utilisation</h2>
            <p className="text-blue-200 text-xs">Les Enfants d'Adam — À lire avant de continuer</p>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" onScroll={handleScroll} style={{ minHeight: 0 }}>
          {POINTS.map(p => (
            <div key={p.num} className="flex gap-3">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                {p.num}
              </span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{p.titre}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{p.texte}</p>
              </div>
            </div>
          ))}

          <div className="text-center text-xs text-gray-400 pt-2 pb-1 border-t">
            En acceptant, vous confirmez avoir lu et compris ces conditions.
          </div>
        </div>

        {/* Pied */}
        <div className="px-5 py-4 border-t flex-shrink-0 bg-gray-50 space-y-3">
          {!scrolledToBottom && (
            <p className="text-xs text-amber-600 text-center">⬇️ Faites défiler pour activer l'acceptation</p>
          )}

          <label className={`flex items-center gap-3 cursor-pointer select-none ${!scrolledToBottom ? 'opacity-40 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="w-5 h-5 accent-blue-700 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700">
              J'ai lu et j'accepte les <strong>Conditions d'Utilisation</strong> de la plateforme.
            </span>
          </label>

          <div className="flex gap-3">
            <button onClick={onDecline}
              className="flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm text-gray-500 border-gray-200 hover:bg-gray-100 transition-all">
              Refuser
            </button>
            <button onClick={handleAccept}
              disabled={!checked || !scrolledToBottom}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
              Accepter ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}