import { useState } from 'react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
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
  userData: any;
}

interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    phone_number: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo: string;
  };
  callback: (response: any) => void;
  onclose: () => void;
}

// Composant interne qui utilise le hook Flutterwave
function FlutterwaveButton({
  flwConfig,
  label,
  disabled,
}: {
  flwConfig: FlutterwaveConfig;
  label: string;
  disabled: boolean;
}) {
  const handleFlutterPayment = useFlutterwave(flwConfig);

  return (
    <button
      onClick={() => handleFlutterPayment({ callback: flwConfig.callback, onclose: flwConfig.onclose })}
      disabled={disabled}
      className="w-full py-3 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
    >
      <span>💳</span>
      {label}
    </button>
  );
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
  userData,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'choose' | 'processing' | 'done'>('choose');
  const [txRef, setTxRef] = useState('');
  const [publicKey, setPublicKey] = useState('');
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
      setPublicKey(data.publicKey);
      setStep('processing');
    } catch {
      setError('Impossible de contacter le serveur de paiement');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentCallback = async (response: any) => {
    closePaymentModal();
    if (response.status === 'successful' || response.status === 'completed') {
      setStep('done');
      onSuccess(txRef);
    } else {
      setError('Paiement annulé ou échoué. Réessayez.');
      setStep('choose');
    }
  };

  const handlePaymentClose = () => {
    setStep('choose');
  };

  const flwConfig: FlutterwaveConfig | null = publicKey && txRef ? {
    public_key: publicKey,
    tx_ref: txRef,
    amount,
    currency,
    payment_options: 'mobilemoney,card,ussd',
    customer: {
      email: userData?.email || `${userData?.numeroH}@enfants-adam.app`,
      phone_number: userData?.telephone || '',
      name: `${userData?.prenom || ''} ${userData?.nomFamille || ''}`.trim() || userData?.numeroH || '',
    },
    customizations: {
      title: 'Les Enfants d\'Adam',
      description,
      logo: '/logo.png',
    },
    callback: handlePaymentCallback,
    onclose: handlePaymentClose,
  } : null;

  if (!isOpen) return null;

  const amountFormatted = amount.toLocaleString('fr-FR');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white">
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
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Montant à payer</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
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

              {/* Bouton payer */}
              <button
                onClick={initPayment}
                disabled={loading}
                className="w-full py-3 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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
                Paiement sécurisé par Flutterwave • SSL 256-bit
              </p>
            </>
          )}

          {step === 'processing' && flwConfig && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                Prêt pour le paiement
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Cliquez ci-dessous pour ouvrir la fenêtre de paiement sécurisée
              </p>
              <FlutterwaveButton
                flwConfig={flwConfig}
                label={`Payer ${amountFormatted} ${currency}`}
                disabled={false}
              />
              <button
                onClick={() => setStep('choose')}
                className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
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
