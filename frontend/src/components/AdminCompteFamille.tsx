import { useState, useEffect } from 'react';

interface Props {
  token: string;
  apiBase: string;
}

const TYPE_FR: Record<string, string> = {
  depot: 'Dépôt', paiement_sante: 'Santé', paiement_nourriture: 'Nourriture',
  urgence: 'Urgence', projet: 'Projet', reserve_deblocage: 'Déblocage réserve',
};

export function AdminCompteFamille({ token, apiBase }: Props) {
  const [comptes, setComptes] = useState<any[]>([]);
  const [total, setTotal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [testFundId, setTestFundId] = useState<string | null>(null);
  const [testMontant, setTestMontant] = useState('10000');
  const [testLoading, setTestLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => { charger(); }, []);

  async function charger() {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/family-fund/admin/tous`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.success) { setComptes(d.comptes); setTotal(d.totalGlobal); }
    } finally { setLoading(false); }
  }

  async function depotTest(fundId: string) {
    setTestLoading(true);
    setTestMsg('');
    try {
      const r = await fetch(`${apiBase}/api/family-fund/admin/depot-test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundId, montant: parseInt(testMontant) })
      });
      const d = await r.json();
      setTestMsg(d.message || (d.success ? 'OK' : 'Erreur'));
      if (d.success) { setTestFundId(null); charger(); }
    } finally { setTestLoading(false); }
  }

  async function voirTransactions(fundId: string) {
    if (selected === fundId) { setSelected(null); return; }
    setSelected(fundId);
    setTxLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/family-fund/admin/transactions/${fundId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.success) setTransactions(d.transactions);
    } finally { setTxLoading(false); }
  }

  const filtrés = comptes.filter(c =>
    c.nomFamille.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => n.toLocaleString('fr-GN') + ' FG';

  if (loading) return (
    <div className="text-center py-10 text-gray-400">Chargement des comptes famille...</div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">💰 Moftal Pay — Comptes Famille</h2>
        <p className="text-blue-600 text-xs font-bold">Système de paiement interne Moftal</p>
        <p className="text-sm text-gray-500 mt-1">
          Tous les Moftal Pay familiaux de Moftal. Vue admin complète sans limite.
        </p>
      </div>

      {/* Totaux globaux */}
      {total && (
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
          <p className="text-blue-200 text-sm mb-3 font-semibold">
            Totaux sur toute la plateforme — {comptes.length} famille{comptes.length > 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total collecté', val: total.total, icon: '💰' },
              { label: 'Total déposé', val: total.depose, icon: '⬆️' },
              { label: 'Total dépensé', val: total.depense, icon: '⬇️' },
              { label: 'Réserves bloquées', val: total.reserve, icon: '🔒' },
              { label: 'Fonds santé', val: total.sante, icon: '🏥' },
              { label: 'Fonds nourriture', val: total.nourriture, icon: '🌾' },
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
        placeholder="Rechercher une famille..."
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
      />

      {/* Liste des comptes */}
      <div className="space-y-3">
        {filtrés.length === 0 && (
          <p className="text-center text-gray-400 py-6">Aucun compte famille trouvé.</p>
        )}
        {filtrés.map(c => (
          <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* En-tête du compte */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-gray-900">Famille {c.nomFamille}</span>
                </div>
                <p className="text-blue-700 font-black text-lg mt-0.5">{fmt(c.soldes.total)}</p>
                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                  <span>Déposé : {fmt(c.totalDepose)}</span>
                  <span>Dépensé : {fmt(c.totalDepense)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={() => voirTransactions(c.id)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: selected === c.id ? '#dc2626' : 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                  {selected === c.id ? 'Fermer' : 'Détails'}
                </button>
                <button
                  onClick={() => { setTestFundId(testFundId === c.id ? null : c.id); setTestMsg(''); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-amber-400 text-amber-600 hover:bg-amber-50 transition-all">
                  🧪 Tester
                </button>
              </div>
            </div>

            {/* Répartition compacte */}
            <div className="grid grid-cols-5 border-t border-gray-50">
              {[
                { label: '🔒', val: c.soldes.reserve, pct: '50%' },
                { label: '🏥', val: c.soldes.sante, pct: '30%' },
                { label: '🌾', val: c.soldes.nourriture, pct: '10%' },
                { label: '🚨', val: c.soldes.urgence, pct: '5%' },
                { label: '🤝', val: c.soldes.projet, pct: '5%' },
              ].map((s, i) => (
                <div key={i} className="p-2 text-center border-r border-gray-50 last:border-0">
                  <div className="text-sm">{s.label}</div>
                  <div className="text-xs text-gray-400">{s.pct}</div>
                  <div className="text-xs font-bold text-gray-700">{s.val.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* Gérants */}
            {(c.gerant1 || c.gerant2) && (
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
                Gérants : {[c.gerant1, c.gerant2].filter(Boolean).join(' · ')}
              </div>
            )}

            {/* Panneau test admin */}
            {testFundId === c.id && (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold text-amber-700 mb-2">🧪 Dépôt de test — Admin G7</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number" min="1000" step="1000"
                    value={testMontant} onChange={e => setTestMontant(e.target.value)}
                    className="flex-1 rounded-xl border border-amber-300 px-3 py-2 text-sm outline-none focus:border-amber-500 bg-white"
                    placeholder="Montant (FG)"
                  />
                  <button
                    onClick={() => depotTest(c.id)} disabled={testLoading}
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

            {/* Transactions */}
            {selected === c.id && (
              <div className="border-t border-gray-100 p-4">
                <h4 className="font-bold text-gray-800 text-sm mb-3">Historique complet</h4>
                {txLoading ? (
                  <p className="text-gray-400 text-sm text-center py-3">Chargement...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-3">Aucune transaction.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transactions.map(t => (
                      <div key={t.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-lg">{t.type === 'depot' ? '⬆️' : '⬇️'}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700">{TYPE_FR[t.type] || t.type}</span>
                            <span className={`text-xs font-black ${t.type === 'depot' ? 'text-green-600' : 'text-red-500'}`}>
                              {t.type === 'depot' ? '+' : '-'}{t.montant.toLocaleString()} FG
                            </span>
                          </div>
                          {t.acteurNom && <p className="text-xs text-gray-400">Par : {t.acteurNom}</p>}
                          {t.beneficiaireNom && <p className="text-xs text-gray-400">→ {t.beneficiaireNom}</p>}
                          {t.description && <p className="text-xs text-gray-300 italic">{t.description}</p>}
                          <p className="text-xs text-gray-300">
                            {new Date(t.date).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
