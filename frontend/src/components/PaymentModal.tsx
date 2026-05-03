import { useState } from 'react';
import { config } from '../config/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txRef: string) => void;
  amount: number;
  currency?: string;
  purpose: string;
  relatedId?: string;
  description: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  currency = 'GNF',
  purpose,
  relatedId,
  description,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'choose' | 'waiting' | 'done'>('choose');
  const [txRef, setTxRef] = useState('');
  const [error, setError] = useState('');

  const getToken = () => {
    try {
      const s = localStorage.getItem('session_user');
      return s ? JSON.parse(s).token : null;
    } catch { return null; }
  };

  const initPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${config.API_BASE_URL}/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ amount, currency, purpose, relatedId, description }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Erreur lors de l\'initiation du paiement');
        setLoading(false);
        return;
      }

      setTxRef(data.txRef);
      // Ouvrir FedaPay dans un nouvel onglet
      window.open(data.paymentUrl, '_blank', 'noopener,noreferrer');
      setStep('waiting');
    } catch {
      setError('Impossible de contacter le serveur de paiement');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/payment/verify/${txRef}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.payment?.status === 'success') {
        setStep('done');
        onSuccess(txRef);
      } else {
        setError('Paiement non encore confirmé. Vérifiez que vous avez bien payé, puis réessayez.');
      }
    } catch {
      setError('Erreur de vérification. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Paiement masqué si VITE_PAYMENTS_ENABLED n'est pas 'true'
  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
  if (!paymentsEnabled) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="text-5xl mb-4">🔧</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Paiement en cours de configuration</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Le système de paiement sera disponible prochainement. Merci de votre patience.
          </p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-700 font-medium transition-colors">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const amountFormatted = amount.toLocaleString('fr-FR');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Paiement sécurisé</h2>
              <p className="text-sm opacity-90 mt-1">{description}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="p-6">
          {step === 'choose' && (
            <>
              {/* Montant */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Montant à payer</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                  {amountFormatted} <span className="text-lg">{currency}</span>
                </p>
              </div>

              {/* Méthodes disponibles */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Méthodes de paiement acceptées :</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-2xl">📱</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 text-center">Orange Money</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-2xl">🌊</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 text-center">Wave</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-2xl">💳</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 text-center">Visa / MasterCard</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={initPayment}
                disabled={loading}
                className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Préparation...
                  </>
                ) : (
                  <>💳 Payer {amountFormatted} {currency}</>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Paiement sécurisé par Moftal Pay • SSL 256-bit
              </p>
            </>
          )}

          {step === 'waiting' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                Paiement en cours
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                Une page de paiement s'est ouverte dans un nouvel onglet.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Complétez le paiement, puis cliquez sur <strong>J'ai payé</strong>.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={confirmPayment}
                disabled={loading}
                className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mb-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : '✅ J\'ai payé — Confirmer'}
              </button>

              <button
                onClick={() => { setStep('choose'); setError(''); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Annuler
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-xl font-bold text-green-600 mb-2">Paiement réussi !</h3>
              <p className="text-sm text-gray-500 mb-1">Référence : <span className="font-mono text-xs">{txRef}</span></p>
              <p className="text-sm text-gray-500 mb-6">Votre accès a été activé automatiquement.</p>
              <button
                onClick={onClose}
                className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
