import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TermsModal, resetTermsAcceptance, CONDITIONS } from '../components/TermsModal';

export default function ConditionsUtilisation() {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  const isAdmin = (() => {
    try {
      const s = localStorage.getItem('session_user');
      if (!s) return false;
      const u = JSON.parse(s);
      const user = u.userData || u;
      return user.role === 'admin' || user.role === 'Admin' || user.role === 'ADMIN';
    } catch { return false; }
  })();

  return (
    <div className="min-h-screen" style={{ background: '#f8f9ff' }}>

      {/* Header */}
      <div className="w-full py-10 px-4 text-center" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
        <div className="text-4xl mb-3">⚖️</div>
        <h1 className="text-white font-black text-2xl sm:text-3xl">Conditions Générales d'Utilisation</h1>
        <p className="text-blue-200 text-sm mt-1">Moftal — Les Enfants d'Adam · Avril 2026</p>
      </div>

      {/* Contenu */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {CONDITIONS.map(a => (
          <div key={a.num}
            className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(99,102,241,0.06)' }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                {a.num}
              </span>
              <h2 className="font-bold text-gray-900 text-sm">{a.titre}</h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed pl-10">{a.texte}</p>
          </div>
        ))}

        {/* Note finale */}
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
          <p className="text-white font-semibold text-sm">
            En créant un compte, vous acceptez l'intégralité de ces conditions.
          </p>
          <p className="text-blue-200 text-xs mt-1">
            Ces conditions peuvent être mises à jour. Vous en serez informé lors de votre prochaine connexion.
          </p>
        </div>

        {/* Bouton admin */}
        {isAdmin && (
          <div className="rounded-2xl p-4 border-2 border-dashed border-amber-300 bg-amber-50">
            <p className="text-amber-800 font-bold text-sm mb-1">🔧 Mode Administrateur</p>
            <p className="text-amber-700 text-xs mb-3">
              Prévisualisez la modal exactement telle qu'elle apparaît aux nouveaux utilisateurs.
            </p>
            <button
              onClick={() => { resetTermsAcceptance(); setShowPreview(true); }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}
            >
              👁 Prévisualiser la modal CGU
            </button>
          </div>
        )}

        {showPreview && (
          <TermsModal
            onAccept={() => setShowPreview(false)}
            onDecline={() => setShowPreview(false)}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-md"
            style={{ background: '#fff', border: '2px solid #e0e7ff', color: '#1e40af' }}
          >
            ← Retour
          </button>
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}
          >
            Se connecter →
          </Link>
        </div>
      </div>
    </div>
  );
}
