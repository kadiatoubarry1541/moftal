import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');

type PaymentStatus = 'loading' | 'success' | 'pending' | 'cancelled' | 'failed';

export default function PaiementResultat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Le serveur met txRef dans l'adresse de retour ; status=cancelled si le client a annulé
  const txRef    = searchParams.get('txRef');
  const status   = searchParams.get('status');

  const [payStatus, setPayStatus] = useState<PaymentStatus>('loading');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let fini = false;
    // Le résultat vient TOUJOURS du serveur (jamais de l'adresse, qu'on peut
    // modifier à la main) : on attend la confirmation du paiement jusqu'à 1 minute.
    const verifier = async () => {
      if (status === 'cancelled') { setPayStatus('cancelled'); return; }
      if (!txRef) { setPayStatus('pending'); return; }
      const token = localStorage.getItem('token');
      for (let essai = 0; essai < 20 && !fini; essai++) {
        try {
          const r = await fetch(`${API}/api/payment/verify/${encodeURIComponent(txRef)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const d = await r.json();
          const st = d.payment?.status;
          if (d.success && st === 'completed') { setPayStatus('success'); return; }
          if (d.success && (st === 'failed' || st === 'cancelled')) { setPayStatus(st === 'cancelled' ? 'cancelled' : 'failed'); return; }
        } catch { /* nouvel essai */ }
        await new Promise(res => setTimeout(res, 3000));
      }
      if (!fini) setPayStatus('pending');
    };
    verifier();
    return () => { fini = true; };
  }, [txRef, status]);

  const isSuccess   = payStatus === 'success';
  const isCancelled = payStatus === 'cancelled';
  const isLoading   = payStatus === 'loading';
  const isPending   = payStatus === 'pending';
  const redirectTarget = isSuccess || isPending ? '/mes-comptes-pro' : '/activite';

  useEffect(() => {
    if (isLoading || isPending) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); navigate(redirectTarget); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoading, navigate, redirectTarget]);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Vérification du paiement...</p>
      </div>
    </div>
  );

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
            <p className="text-sm text-green-600 font-medium mb-2">Ce que vous avez payé est maintenant débloqué.</p>
            {txRef && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 mb-6 font-mono break-all">
                Réf: {txRef}
              </p>
            )}
          </>
        ) : isPending ? (
          <>
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold text-blue-600 mb-2">Paiement en cours de confirmation</h1>
            <p className="text-gray-500 mb-6">Nous attendons encore la confirmation du service de paiement. Ce que vous avez payé sera débloqué dès sa réception : revenez dans quelques minutes.</p>
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

        {!isPending && <p className="text-sm text-gray-400 mb-4">
          Redirection automatique dans <span className="font-bold text-gray-600">{countdown}</span>s...
        </p>}

        <div className="flex gap-3">
          <button
            onClick={() => navigate(redirectTarget)}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
          >
            {isSuccess || isPending ? 'Mes comptes' : 'Accueil'}
          </button>
          {!isSuccess && !isPending && (
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
