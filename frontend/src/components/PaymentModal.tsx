import { useState, useEffect, useRef } from 'react';
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

type PayMethod = 'OM' | 'MOMO' | 'CARD';
type Step = 'choose' | 'waiting' | 'success' | 'error';

const METHODS = [
  {
    id: 'OM' as PayMethod,
    label: 'Orange Money',
    sublabel: 'Guinée, Sénégal, France...',
    emoji: '🟠',
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    active: 'border-orange-500 bg-orange-50 ring-2 ring-orange-400',
  },
  {
    id: 'MOMO' as PayMethod,
    label: 'MTN MoMo',
    sublabel: 'Mobile Money',
    emoji: '🟡',
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
    active: 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-400',
  },
  {
    id: 'CARD' as PayMethod,
    label: 'Visa / Mastercard',
    sublabel: 'Carte bancaire internationale',
    emoji: '💳',
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    active: 'border-blue-500 bg-blue-50 ring-2 ring-blue-400',
  },
];

export default function PaymentModal({
  isOpen, onClose, onSuccess,
  amount, currency = 'GNF', purpose, description,
}: PaymentModalProps) {
  const [step, setStep]       = useState<Step>('choose');
  const [method, setMethod]   = useState<PayMethod | null>(null);
  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [txRef, setTxRef]     = useState('');
  const [txId, setTxId]       = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const token = localStorage.getItem('token');
  const API   = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || 'http://localhost:5002';

  useEffect(() => {
    if (!isOpen) {
      setStep('choose');
      setMethod(null);
      setPhone('');
      setError('');
      setTxId('');
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [isOpen]);

  const startPolling = (transactionId: string, ref: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 40) {
        clearInterval(pollRef.current!);
        setStep('error');
        setError('Délai dépassé. Vérifiez votre téléphone et réessayez.');
        return;
      }
      try {
        const res  = await fetch(`${API}/api/djomy/status/${transactionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const status = data.status || data.data?.status || '';
        if (status === 'SUCCESS') {
          clearInterval(pollRef.current!);
          setTxRef(ref);
          setStep('success');
          onSuccess(ref);
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          clearInterval(pollRef.current!);
          setStep('error');
          setError('Paiement échoué. Vérifiez votre solde et réessayez.');
        }
      } catch { /* continue */ }
    }, 3000);
  };

  const handlePay = async () => {
    if (!method) return;
    if ((method === 'OM' || method === 'MOMO') && phone.replace(/\D/g, '').length < 8) {
      setError('Entrez un numéro de téléphone valide (8-9 chiffres).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ref = `MF-${purpose}-${Date.now()}`;

      if (method === 'CARD') {
        const res  = await fetch(`${API}/api/djomy/gateway`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            allowedPaymentMethods: ['CARD', 'OM', 'MOMO', 'PAYCARD'],
            description,
            reference: ref,
          }),
        });
        const data = await res.json();
        const url  = data.redirectUrl || data.paymentUrl || data.url || data.data?.redirectUrl;
        if (data.success && url) {
          window.open(url, '_blank');
          setTxRef(ref);
          setStep('waiting');
        } else {
          setError(data.message || 'Erreur lors de la création du paiement.');
        }
      } else {
        const res  = await fetch(`${API}/api/djomy/initiate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: method,
            payerPhone: phone,
            amount,
            description,
            reference: ref,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const id = data.transactionId || data.data?.transactionId || data.id || '';
          setTxId(id);
          setTxRef(ref);
          setStep('waiting');
          if (id) startPolling(id, ref);
        } else {
          setError(data.message || "Erreur lors de l'initiation du paiement.");
        }
      }
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const confirmManually = async () => {
    if (!txId) {
      setStep('success');
      onSuccess(txRef);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/djomy/status/${txId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const status = data.status || data.data?.status || '';
      if (status === 'SUCCESS') {
        clearInterval(pollRef.current!);
        setStep('success');
        onSuccess(txRef);
      } else {
        setError('Paiement non encore confirmé. Confirmez sur votre téléphone puis réessayez.');
      }
    } catch {
      setError('Erreur de vérification. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">Paiement sécurisé</h2>
              <p className="text-sm text-emerald-100 mt-0.5 leading-snug">{description}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-3xl leading-none ml-3">×</button>
          </div>
          <div className="mt-4 bg-white/20 backdrop-blur rounded-2xl py-3 text-center">
            <span className="text-3xl font-bold">{fmt(amount)}</span>
            <span className="text-xl ml-1 font-medium">{currency}</span>
          </div>
        </div>

        <div className="p-5">

          {/* ── ÉTAPE 1 : CHOIX MÉTHODE ── */}
          {step === 'choose' && (
            <>
              <p className="text-sm font-semibold text-gray-600 mb-3">Choisissez votre moyen de paiement</p>

              <div className="space-y-3 mb-5">
                {METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMethod(m.id); setError(''); setPhone(''); }}
                    className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl transition-all text-left ${
                      method === m.id
                        ? m.active
                        : `${m.border} ${m.bg} hover:opacity-80`
                    }`}
                  >
                    <span className="text-3xl">{m.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 text-sm">{m.label}</div>
                      <div className="text-xs text-gray-500">{m.sublabel}</div>
                    </div>
                    {method === m.id && (
                      <span className="text-emerald-600 font-bold text-xl">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Champ téléphone pour OM / MTN */}
              {(method === 'OM' || method === 'MOMO') && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Numéro {method === 'OM' ? 'Orange Money' : 'MTN MoMo'}
                  </label>
                  <div className="flex items-center border-2 border-gray-200 focus-within:border-emerald-500 rounded-xl overflow-hidden transition-colors">
                    <span className="px-3 py-3 bg-gray-50 text-gray-500 text-sm font-semibold border-r border-gray-200 shrink-0">
                      +224
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder={method === 'OM' ? '6XX XXX XXX' : '67X XXX XXX'}
                      maxLength={9}
                      className="flex-1 px-3 py-3 outline-none text-gray-800 text-base"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Vous recevrez une notification pour confirmer le paiement.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={!method || loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  `Payer ${fmt(amount)} ${currency}`
                )}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Paiement sécurisé par Djomy · SSL 256-bit
              </p>
            </>
          )}

          {/* ── ÉTAPE 2 : EN ATTENTE ── */}
          {step === 'waiting' && (
            <div className="text-center py-4">
              {method === 'CARD' ? (
                <>
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <span className="text-4xl">💳</span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg mb-2">Page de paiement ouverte</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Complétez le paiement dans l'onglet qui s'est ouvert,<br />
                    puis revenez ici et cliquez sur confirmer.
                  </p>
                </>
              ) : (
                <>
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: method === 'OM' ? '#FF6600' : '#FFCC00' }}
                  >
                    <span className="text-4xl">{method === 'OM' ? '🟠' : '🟡'}</span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg mb-2">
                    Confirmez sur votre téléphone
                  </h3>
                  <p className="text-sm text-gray-500 mb-1">
                    Notification envoyée au <strong>+224 {phone}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mb-5">
                    Ouvrez {method === 'OM' ? 'Orange Money' : 'MTN MoMo'} et acceptez le paiement de{' '}
                    <strong>{fmt(amount)} {currency}</strong>.
                  </p>
                  {/* Points animés */}
                  <div className="flex justify-center gap-1.5 mb-6">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={confirmManually}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl mb-3 disabled:opacity-50 active:scale-95 transition-transform"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  "J'ai confirmé le paiement"
                )}
              </button>

              <button
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  setStep('choose');
                  setError('');
                }}
                className="text-sm text-gray-400 hover:text-gray-600 py-2"
              >
                Annuler et recommencer
              </button>
            </div>
          )}

          {/* ── ÉTAPE 3 : SUCCÈS ── */}
          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-5xl">✅</span>
              </div>
              <h3 className="text-2xl font-bold text-emerald-600 mb-2">Paiement réussi !</h3>
              <p className="text-sm text-gray-500 mb-1">Votre accès a été activé avec succès.</p>
              <p className="text-xs text-gray-400 font-mono mt-1 mb-7">{txRef}</p>
              <button
                onClick={onClose}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl active:scale-95 transition-transform"
              >
                Continuer
              </button>
            </div>
          )}

          {/* ── ÉTAPE 4 : ÉCHEC ── */}
          {step === 'error' && (
            <div className="text-center py-6">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-5xl">❌</span>
              </div>
              <h3 className="text-xl font-bold text-red-600 mb-2">Paiement échoué</h3>
              <p className="text-sm text-gray-500 mb-7">{error}</p>
              <button
                onClick={() => { setStep('choose'); setError(''); }}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl mb-3 active:scale-95 transition-transform"
              >
                Réessayer
              </button>
              <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 py-2">
                Annuler
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
