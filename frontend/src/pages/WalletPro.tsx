import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionUser } from '../utils/auth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface CompteMoftalPayPro {
  id: string;
  nomPro: string;
  typePro: string;
  solde: number;
  totalRecu: number;
  totalRetire: number;
  orangeMoneyNumero: string | null;
  isActive: boolean;
}

interface Transaction {
  id: string;
  type: string;
  montant: number;
  description: string | null;
  payeurNom: string | null;
  statut: string;
  fedapayRef: string | null;
  createdAt: string;
}

const TYPE_FR: Record<string, string> = {
  depot_fedapay: 'Dépôt FedaPay',
  paiement_interne: 'Paiement famille',
  retrait: 'Retrait Orange Money',
};

const TYPE_ICON: Record<string, string> = {
  depot_fedapay: '⬆️',
  paiement_interne: '💸',
  retrait: '⬇️',
};

const STATUT_COLOR: Record<string, string> = {
  confirme: 'text-green-600',
  en_attente: 'text-amber-500',
  echoue: 'text-red-500',
};

export default function WalletPro() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const token = localStorage.getItem('token');

  const [wallet, setWallet] = useState<CompteMoftalPayPro | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restricted, setRestricted] = useState(false);

  // Retrait
  const [showRetrait, setShowRetrait] = useState(false);
  const [montantRetrait, setMontantRetrait] = useState('');
  const [numeroOM, setNumeroOM] = useState('');
  const [retraitLoading, setRetraitLoading] = useState(false);
  const [retraitMsg, setRetraitMsg] = useState('');

  // Dépôt FedaPay (pour tester / recharger son propre wallet pro)
  const [showDepot, setShowDepot] = useState(false);
  const [montantDepot, setMontantDepot] = useState('');
  const [depotLoading, setDepotLoading] = useState(false);

  useEffect(() => {
    if (!user || !token) { navigate('/login'); return; }
    charger();
  }, []);

  async function charger() {
    setLoading(true);
    setError('');
    try {
      const [wRes, tRes] = await Promise.all([
        fetch(`${API}/api/moftal-pay/mon-moftal-pay-pro`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/moftal-pay/mes-transactions`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const wData = await wRes.json();
      const tData = await tRes.json();
      if (wData.success) setWallet(wData.comptePro);
      else if (wData.restricted) setRestricted(true);
      else setError(wData.message || 'Impossible de charger le Moftal Pay Pro');
      if (tData.success) setTransactions(tData.transactions || []);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  async function demanderRetrait(e: React.FormEvent) {
    e.preventDefault();
    setRetraitLoading(true);
    setRetraitMsg('');
    try {
      const r = await fetch(`${API}/api/moftal-pay/retrait-pro`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ montant: parseInt(montantRetrait), numeroOrangeMoney: numeroOM || undefined }),
      });
      const d = await r.json();
      if (d.success) {
        setRetraitMsg(d.message || 'Retrait initié avec succès');
        setMontantRetrait('');
        setNumeroOM('');
        charger();
      } else {
        setRetraitMsg(d.message || 'Erreur lors du retrait');
      }
    } catch {
      setRetraitMsg('Erreur de connexion');
    } finally {
      setRetraitLoading(false);
    }
  }

  async function initierDepot(e: React.FormEvent) {
    e.preventDefault();
    setDepotLoading(true);
    try {
      const r = await fetch(`${API}/api/moftal-pay/initier-depot`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ montant: parseInt(montantDepot), type: 'pro' }),
      });
      const d = await r.json();
      if (d.paymentUrl) {
        window.location.href = d.paymentUrl;
      } else {
        alert(d.message || 'Impossible d\'initier le dépôt');
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setDepotLoading(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString('fr-GN') + ' FG';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement de votre Moftal Pay Pro...</p>
      </div>
    </div>
  );

  if (restricted) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-3">🔜</div>
        <p className="text-indigo-700 font-black text-lg mb-2">Bientôt disponible</p>
        <p className="text-gray-600 text-sm mb-3">
          Moftal Pay est actuellement disponible uniquement pour les services de <strong>Santé</strong> et d'<strong>Alimentation</strong>.
        </p>
        <p className="text-gray-400 text-xs mb-5">
          Votre service sera intégré prochainement. Merci de votre patience.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
          ← Retour
        </button>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-600 font-bold mb-2">Accès refusé</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <p className="text-gray-400 text-xs mb-4">
          Seuls les comptes professionnels enregistrés sur Moftal peuvent accéder à Moftal Pay.
        </p>
        <button
          onClick={() => navigate('/inscription-pro')}
          className="w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
          Créer un compte professionnel
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-4" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white text-sm">← Retour</button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-xs font-semibold tracking-wide uppercase">Moftal Pay Pro</p>
              <h1 className="text-white font-black text-xl leading-tight mt-0.5">
                {wallet?.nomPro || 'Moftal Pay Pro'}
              </h1>
              <p className="text-blue-300 text-xs mt-0.5">{wallet?.typePro || ''}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              💼
            </div>
          </div>

          {/* Solde principal */}
          <div className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <p className="text-blue-200 text-xs mb-1">Solde disponible</p>
            <p className="text-white font-black text-3xl">{fmt(wallet?.solde || 0)}</p>
            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-blue-300 text-xs">Total reçu</p>
                <p className="text-white font-bold text-sm">{fmt(wallet?.totalRecu || 0)}</p>
              </div>
              <div>
                <p className="text-blue-300 text-xs">Total retiré</p>
                <p className="text-white font-bold text-sm">{fmt(wallet?.totalRetire || 0)}</p>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setShowDepot(!showDepot); setShowRetrait(false); }}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: showDepot ? '#fff' : 'rgba(255,255,255,0.2)', color: showDepot ? '#1e3a5f' : '#fff' }}>
              ⬆️ Déposer
            </button>
            <button
              onClick={() => { setShowRetrait(!showRetrait); setShowDepot(false); }}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: showRetrait ? '#fff' : 'rgba(255,255,255,0.2)', color: showRetrait ? '#1e3a5f' : '#fff' }}>
              ⬇️ Retirer
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-4">

        {/* Formulaire Dépôt */}
        {showDepot && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-1">Déposer de l'argent</h3>
            <p className="text-gray-400 text-xs mb-4">
              Rechargez votre wallet via FedaPay (Orange Money, carte bancaire). Des frais FedaPay s'appliquent.
            </p>
            <form onSubmit={initierDepot} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Montant (FG)</label>
                <input
                  type="number" min="5000" step="1000" required
                  value={montantDepot} onChange={e => setMontantDepot(e.target.value)}
                  placeholder="Ex: 50000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum : 5 000 FG</p>
              </div>
              <button
                type="submit" disabled={depotLoading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                {depotLoading ? 'Redirection...' : '⬆️ Payer via FedaPay →'}
              </button>
            </form>
          </div>
        )}

        {/* Formulaire Retrait */}
        {showRetrait && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-1">Retirer vers Orange Money</h3>
            <p className="text-gray-400 text-xs mb-4">
              Les retraits passent par FedaPay Payout. Des frais FedaPay s'appliquent sur les retraits.
            </p>
            <form onSubmit={demanderRetrait} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Montant à retirer (FG)</label>
                <input
                  type="number" min="10000" step="1000" required
                  value={montantRetrait} onChange={e => setMontantRetrait(e.target.value)}
                  placeholder="Ex: 100000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  Numéro Orange Money {wallet?.orangeMoneyNumero ? `(enregistré : ${wallet.orangeMoneyNumero})` : '(non enregistré)'}
                </label>
                <input
                  type="tel"
                  value={numeroOM} onChange={e => setNumeroOM(e.target.value)}
                  placeholder={wallet?.orangeMoneyNumero || 'Ex: 628000000'}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1">Laissez vide pour utiliser le numéro enregistré.</p>
              </div>
              {retraitMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-bold ${
                  retraitMsg.includes('succès') || retraitMsg.includes('initié') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {retraitMsg}
                </div>
              )}
              <button
                type="submit" disabled={retraitLoading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                {retraitLoading ? 'Traitement...' : '⬇️ Demander le retrait'}
              </button>
            </form>
          </div>
        )}

        {/* Info paiements internes */}
        <div className="rounded-2xl p-4 border border-blue-100" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💸</span>
            <div>
              <p className="font-bold text-blue-900 text-sm">Paiements internes — Gratuits</p>
              <p className="text-blue-700 text-xs mt-0.5 leading-relaxed">
                Les familles Moftal peuvent vous payer directement depuis leur Moftal Pay familial.
                Ces transferts sont <strong>100% gratuits</strong> et instantanés — aucun frais FedaPay.
              </p>
            </div>
          </div>
        </div>

        {/* Historique des transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-800">Historique des transactions</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-gray-400 text-sm">Aucune transaction pour le moment.</p>
              <p className="text-gray-300 text-xs mt-1">Les dépôts et paiements apparaîtront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map(t => {
                const isEntrant = t.type !== 'retrait';
                return (
                  <div key={t.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[t.type] || '💳'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-gray-700 truncate">
                          {TYPE_FR[t.type] || t.type}
                        </span>
                        <span className={`text-sm font-black flex-shrink-0 ${isEntrant ? 'text-green-600' : 'text-red-500'}`}>
                          {isEntrant ? '+' : '-'}{t.montant.toLocaleString()} FG
                        </span>
                      </div>
                      {t.payeurNom && (
                        <p className="text-xs text-gray-400">De : {t.payeurNom}</p>
                      )}
                      {t.description && (
                        <p className="text-xs text-gray-300 italic truncate">{t.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-xs font-semibold ${STATUT_COLOR[t.statut] || 'text-gray-400'}`}>
                          {t.statut === 'confirme' ? '✓ Confirmé' : t.statut === 'en_attente' ? '⏳ En attente' : '✗ Échoué'}
                        </span>
                        <span className="text-xs text-gray-300">
                          {new Date(t.createdAt).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lien vers mon espace pro */}
        <button
          onClick={() => navigate('/mon-espace-pro')}
          className="w-full py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-500 hover:bg-gray-50 transition-all">
          ← Retour à mon espace professionnel
        </button>
      </div>
    </div>
  );
}
