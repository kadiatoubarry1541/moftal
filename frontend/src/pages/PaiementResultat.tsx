import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PaiementResultat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const txRef = searchParams.get('tx_ref');

  const [countdown, setCountdown] = useState(5);

  const isSuccess   = status === 'success' || status === 'successful';
  const isCancelled = status === 'cancelled';
  const redirectTarget = isSuccess ? '/mes-comptes-pro' : '/activite';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(redirectTarget);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, redirectTarget]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">

        {isSuccess ? (
          <>
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Paiement réussi !</h1>
            <p className="text-gray-500 mb-2">Votre paiement a été traité avec succès.</p>
            <p className="text-sm text-green-600 font-medium mb-2">Votre abonnement est maintenant actif !</p>
            {txRef && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 mb-6 font-mono break-all">
                Réf: {txRef}
              </p>
            )}
          </>
        ) : isCancelled ? (
          <>
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-amber-600 mb-2">Paiement annulé</h1>
            <p className="text-gray-500 mb-6">Vous avez annulé le paiement. Aucun montant n'a été débité.</p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Paiement échoué</h1>
            <p className="text-gray-500 mb-6">Le paiement n'a pas pu être traité. Veuillez réessayer.</p>
          </>
        )}

        <p className="text-sm text-gray-400 mb-4">
          Redirection automatique dans <span className="font-bold text-gray-600">{countdown}</span>s...
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(redirectTarget)}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
          >
            {isSuccess ? 'Mes comptes' : 'Accueil'}
          </button>
          {!isSuccess && (
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
            >
              Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
