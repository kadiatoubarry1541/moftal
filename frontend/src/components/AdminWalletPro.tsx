import { useState, useEffect } from 'react';

interface Props {
  token: string;
  apiBase: string;
}

const TYPE_FR: Record<string, string> = {
  clinic: 'Clinique', school: 'École', enterprise: 'Entreprise',
  ngo: 'ONG', security_agency: 'Sécurité', supplier: 'Fournisseur',
  journalist: 'Journaliste', scientist: 'Scientifique',
};

const TYPE_ICON: Record<string, string> = {
  clinic: '🏥', school: '🎓', enterprise: '🏢', ngo: '🤝',
  security_agency: '🛡️', supplier: '📦', journalist: '📰', scientist: '🔬',
};

export function AdminWalletPro({ token, apiBase }: Props) {
  const [wallets, setWallets] = useState<any[]>([]);
  const [totaux, setTotaux] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [testWalletId, setTestWalletId] = useState<string | null>(null);
  const [testMontant, setTestMontant] = useState('50000');
  const [testLoading, setTestLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => { charger(); }, []);

  async function depotTest(walletId: string) {
    setTestLoading(true);
    setTestMsg('');
    try {
      const r = await fetch(`${apiBase}/api/moftal-pay/admin/depot-test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, montant: parseInt(testMontant) })
      });
      const d = await r.json();
      setTestMsg(d.message || (d.success ? 'OK' : 'Erreur'));
      if (d.success) { setTestWalletId(null); charger(); }
    } finally { setTestLoading(false); }
  }

  async function charger() {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/moftal-pay/admin/comptes-pro`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.success) { setWallets(d.comptes); setTotaux(d.totaux); }
    } finally { setLoading(false); }
  }

  const filtrés = wallets.filter(w =>
    w.nomPro?.toLowerCase().includes(search.toLowerCase()) ||
    w.ownerNumeroH?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => n.toLocaleString('fr-GN') + ' FG';

  if (loading) return (
    <div className="text-center py-10 text-gray-400">Chargement des comptes Moftal Pay...</div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">💼 Moftal Pay — Comptes Professionnels</h2>
        <p className="text-blue-600 text-xs font-bold">Comptes Moftal Pay des professionnels</p>
        <p className="text-sm text-gray-500 mt-1">
          Tous les comptes Moftal Pay actifs — retraits Orange Money uniquement via FedaPay.
        </p>
      </div>

      {/* Totaux globaux */}
      {totaux && (
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
          <p className="text-blue-200 text-sm mb-3 font-semibold">
            Vue globale — {wallets.length} compte{wallets.length > 1 ? 's' : ''} Moftal Pay
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total en caisse', val: totaux.totalSolde, icon: '💼' },
              { label: 'Total reçu (cumul)', val: totaux.totalRecu, icon: '⬆️' },
              { label: 'Total retiré (cumul)', val: totaux.totalRetire, icon: '⬇️' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <p className="text-blue-200 text-xs mb-0.5">{item.icon} {item.label}</p>
                <p className="text-white font-black text-sm">{fmt(item.val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recherche */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher un professionnel..."
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
      />

      {/* Liste */}
      <div className="space-y-3">
        {filtrés.length === 0 && (
          <p className="text-center text-gray-400 py-6">Aucun compte Moftal Pay trouvé.</p>
        )}
        {filtrés.map(w => (
          <div key={w.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{TYPE_ICON[w.typePro] || '💼'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-gray-900 truncate">{w.nomPro || '—'}</p>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                    {TYPE_FR[w.typePro] || w.typePro}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">NumeroH : {w.ownerNumeroH}</p>

                {/* Soldes */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="rounded-xl p-2 text-center" style={{ background: '#eff6ff' }}>
                    <p className="text-blue-400 text-xs">Solde</p>
                    <p className="text-blue-700 font-black text-sm">{fmt(w.solde)}</p>
                  </div>
                  <div className="rounded-xl p-2 text-center" style={{ background: '#f0fdf0' }}>
                    <p className="text-green-400 text-xs">Total reçu</p>
                    <p className="text-green-700 font-bold text-sm">{fmt(w.totalRecu)}</p>
                  </div>
                  <div className="rounded-xl p-2 text-center" style={{ background: '#fef2f2' }}>
                    <p className="text-red-400 text-xs">Total retiré</p>
                    <p className="text-red-600 font-bold text-sm">{fmt(w.totalRetire)}</p>
                  </div>
                </div>

                {/* Orange Money */}
                {w.orangeMoney && (
                  <p className="text-xs text-gray-500 mt-2">
                    📱 Orange Money : <span className="font-bold">{w.orangeMoney}</span>
                  </p>
                )}
                {!w.orangeMoney && (
                  <p className="text-xs text-amber-500 mt-2">⚠️ Aucun numéro Orange Money enregistré</p>
                )}

                <p className="text-xs text-gray-300 mt-1">
                  Créé le {new Date(w.creeLe).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>

                {/* Bouton test */}
                <button
                  onClick={() => { setTestWalletId(testWalletId === w.id ? null : w.id); setTestMsg(''); }}
                  className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-amber-400 text-amber-600 hover:bg-amber-50 transition-all">
                  🧪 Tester un dépôt
                </button>
              </div>
            </div>

            {/* Panneau test */}
            {testWalletId === w.id && (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 rounded-b-2xl">
                <p className="text-xs font-bold text-amber-700 mb-2">🧪 Dépôt de test</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number" min="1000" step="1000"
                    value={testMontant} onChange={e => setTestMontant(e.target.value)}
                    className="flex-1 rounded-xl border border-amber-300 px-3 py-2 text-sm outline-none bg-white"
                    placeholder="Montant (FG)"
                  />
                  <button
                    onClick={() => depotTest(w.id)} disabled={testLoading}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-all">
                    {testLoading ? '...' : 'Créditer'}
                  </button>
                </div>
                {testMsg && (
                  <p className={`text-xs mt-2 font-semibold ${testMsg.includes('TEST') || testMsg.includes('crédités') ? 'text-green-700' : 'text-red-600'}`}>
                    {testMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
