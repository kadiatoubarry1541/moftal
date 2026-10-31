import { useState, useEffect, useRef } from 'react';
import { useTraduction } from '../i18n/traduction';
import { acceptTerms, CONDITIONS } from "../utils/conditionsUtilisation";


interface TermsModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsModal({ onAccept, onDecline }: TermsModalProps) {
  const { tr } = useTraduction();
  const [checked, setChecked] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Si tout le contenu est visible sans scroll, on autorise directement
    if (el.scrollHeight <= el.clientHeight + 5) {
      setCanAccept(true);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) {
      setCanAccept(true);
    }
  };

  const handleAccept = () => {
    if (!checked) return;
    acceptTerms();
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
            <h2 className="text-white font-bold text-base leading-tight">{tr("Conditions d'Utilisation")}</h2>
            <p className="text-blue-200 text-xs">{tr("Moftal — À lire attentivement avant de continuer")}</p>
          </div>
        </div>

        {/* Corps scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          onScroll={handleScroll} style={{ minHeight: 0 }}>
          {CONDITIONS.map(p => (
            <div key={p.num} className="flex gap-3">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                {p.num}
              </span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{tr(p.titre)}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{tr(p.texte)}</p>
              </div>
            </div>
          ))}
          <div className="text-center text-xs text-gray-400 pt-2 pb-1 border-t">
            {tr("En acceptant, vous confirmez avoir lu et compris ces conditions.")}
          </div>
        </div>

        {/* Pied */}
        <div className="px-5 py-4 border-t flex-shrink-0 bg-gray-50 space-y-3">
          {!canAccept && (
            <p className="text-xs text-amber-600 text-center">⬇️ {tr("Faites défiler pour activer l'acceptation")}</p>
          )}
          <label className={`flex items-center gap-3 cursor-pointer select-none ${!canAccept ? 'opacity-40 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="w-5 h-5 accent-blue-700 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700">
              {tr("J'ai lu et j'accepte les")} <strong>{tr("Conditions d'Utilisation")}</strong> {tr("de la plateforme.")}
            </span>
          </label>
          <div className="flex gap-3">
            <button onClick={onDecline}
              className="flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm text-gray-500 border-gray-200 hover:bg-gray-100 transition-all">
              {tr("Refuser")}
            </button>
            <button onClick={handleAccept}
              disabled={!checked || !canAccept}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
              {tr("Accepter")} ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
