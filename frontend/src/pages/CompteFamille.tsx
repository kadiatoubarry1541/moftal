import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeviseUtilisateur, formaterMontant, type DeviseInfo } from '../utils/currency';
import { ReçuTransaction } from '../components/ReçuTransaction';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const CATEGORIES = [
  { key: 'reserve',    label: 'Réserve bloquée',  pct: 50, color: '#1e3a5f', icon: '🔒' },
  { key: 'sante',      label: 'Santé',             pct: 30, color: '#059669', icon: '🏥' },
  { key: 'nourriture', label: 'Nourriture',        pct: 10, color: '#d97706', icon: '🌾' },
  { key: 'urgence',    label: 'Urgence',           pct: 5,  color: '#dc2626', icon: '🚨' },
  { key: 'projet',     label: 'Projet collectif',  pct: 5,  color: '#7c3aed', icon: '🤝' },
];

const TYPE_MAP: Record<string, string> = {
  depot:               'Dépôt',
  paiement_sante:      'Paiement santé',
  paiement_nourriture: 'Paiement nourriture',
  urgence:             'Urgence',
  projet:              'Projet collectif',
  reserve_deblocage:   'Déblocage réserve',
};

function calculerAge(dateNaissance: string | undefined): number {
  if (!dateNaissance) return 99;
  const dn = new Date(dateNaissance);
  if (isNaN(dn.getTime())) return 99;
  return Math.floor((Date.now() - dn.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function CompteFamille() {
  const navigate = useNavigate();
  const devise: DeviseInfo = getDeviseUtilisateur();

  const [compte, setCompte] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [existe, setExiste] = useState(false);
  const [nbMembres, setNbMembres] = useState(0);
  const [msgErreur, setMsgErreur] = useState('');

  // Âge de l'utilisateur (restriction budget < 40 ans)
  const [userAge, setUserAge] = useState(99);

  // Dépôt
  const [montantDepot, setMontantDepot] = useState('');
  const [loadingDepot, setLoadingDepot] = useState(false);

  // Paiement (admins seulement, santé + nourriture uniquement)
  const [showRepartition, setShowRepartition] = useState(false);
  const [showPaiement, setShowPaiement] = useState(false);
  const [typePaiement, setTypePaiement] = useState('paiement_sante');
  const [montantPaiement, setMontantPaiement] = useState('');
  const [beneficiaire, setBeneficiaire] = useState('');
  const [contact, setContact] = useState('');
  const [raison, setRaison] = useState('');
  const [loadingPaiement, setLoadingPaiement] = useState(false);

  // Paiement direct vers un professionnel (Moftal Pay interne)
  const [showPayerPro, setShowPayerPro] = useState(false);
  const [rechercheProQ, setRechercheProQ] = useState('');
  const [proResults, setProResults] = useState<any[]>([]);
  const [proSelectionne, setProSelectionne] = useState<any>(null);
  const [montantPayerPro, setMontantPayerPro] = useState('');
  const [categoriePro, setCategoriePro] = useState<'sante' | 'nourriture'>('sante');
  const [descriptionPayerPro, setDescriptionPayerPro] = useState('');
  const [loadingPayerPro, setLoadingPayerPro] = useState(false);

  // Reçu à afficher après opération
  const [reçu, setReçu] = useState<any>(null);

  const token = localStorage.getItem('token');

  // Calcul de l'âge depuis la session
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('session_user') || '{}');
    const u = session.userData || session;
    const dn = u?.dateNaissance || u?.date_naissance;
    if (dn) setUserAge(calculerAge(dn));
  }, []);

  useEffect(() => { charger(); }, []);

  async function charger() {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/family-fund/mon-compte`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (!d.success) {
        setMsgErreur(d.message || 'Erreur lors du chargement.');
        return;
      }
      setNbMembres(d.nbMembres || 0);
      if (d.existe) {
        setExiste(true);
        setCompte(d.compte);
        setTransactions(d.transactions || []);
      } else {
        setExiste(false);
        if (!d.nbMembres && d.message?.includes('nom de famille')) {
          setMsgErreur(d.message);
        }
      }
    } catch {
      setMsgErreur('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  async function deposer() {
    const montant = parseInt(montantDepot);
    if (!montant || montant < 1000) return alert('Montant minimum : 1 000 GNF');
    setLoadingDepot(true);
    try {
      const r = await fetch(`${API}/api/family-fund/deposer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ montant })
      });
      const d = await r.json();
      if (d.success) {
        setMontantDepot('');
        // Afficher le reçu
        const session = JSON.parse(localStorage.getItem('session_user') || '{}');
        const u = session.userData || session;
        setReçu({
          id: Date.now().toString(),
          type: 'depot',
          montant,
          date: new Date().toISOString(),
          acteurNom: `${u?.prenom || ''} ${u?.nomFamille || ''}`.trim(),
          nomFamille: compte?.nomFamille,
          repartition: d.repartition,
        });
        charger();
      } else {
        alert(d.message);
      }
    } finally { setLoadingDepot(false); }
  }

  async function payer() {
    const montant = parseInt(montantPaiement);
    if (!montant || montant < 100) return alert('Montant invalide');
    if (!beneficiaire) return alert('Indiquez le bénéficiaire');
    if (!['paiement_sante', 'paiement_nourriture'].includes(typePaiement)) {
      return alert('Seuls les transferts vers Santé et Alimentation sont autorisés.');
    }
    setLoadingPaiement(true);
    try {
      const r = await fetch(`${API}/api/family-fund/payer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: typePaiement, montant, beneficiaireNom: beneficiaire, beneficiaireContact: contact, description: raison })
      });
      const d = await r.json();
      if (d.success) {
        setShowPaiement(false);
        setMontantPaiement(''); setBeneficiaire(''); setContact(''); setRaison('');
        // Afficher le reçu
        const session = JSON.parse(localStorage.getItem('session_user') || '{}');
        const u = session.userData || session;
        setReçu({
          id: Date.now().toString(),
          type: typePaiement,
          montant,
          date: new Date().toISOString(),
          acteurNom: `${u?.prenom || ''} ${u?.nomFamille || ''}`.trim(),
          beneficiaireNom: beneficiaire,
          beneficiaireContact: contact,
          description: raison,
          nomFamille: compte?.nomFamille,
        });
        charger();
      } else {
        alert(d.message);
      }
    } finally { setLoadingPaiement(false); }
  }

  async function rechercherPros(q: string) {
    setRechercheProQ(q);
    setProSelectionne(null);
    if (q.trim().length < 2) { setProResults([]); return; }
    try {
      const r = await fetch(`${API}/api/professionals/search?q=${encodeURIComponent(q.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      const filtres = (d.accounts || []).filter((a: any) =>
        ['clinic', 'supplier'].includes(a.type) && a.status === 'approved'
      );
      setProResults(filtres);
    } catch { setProResults([]); }
  }

  async function payerPro() {
    const montant = parseInt(montantPayerPro);
    if (!montant || montant < 100) return alert('Montant minimum : 100 GNF');
    if (!proSelectionne) return alert('Sélectionnez un professionnel dans les résultats');
    setLoadingPayerPro(true);
    try {
      const r = await fetch(`${API}/api/moftal-pay/paiement-interne`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant,
          proAccountId: proSelectionne.id,
          categorie: categoriePro,
          description: descriptionPayerPro || `Paiement famille → ${proSelectionne.name}`
        })
      });
      const d = await r.json();
      if (d.success) {
        setShowPayerPro(false);
        setProSelectionne(null); setRechercheProQ(''); setProResults([]);
        setMontantPayerPro(''); setDescriptionPayerPro('');
        const session = JSON.parse(localStorage.getItem('session_user') || '{}');
        const u = session.userData || session;
        setReçu({
          id: Date.now().toString(),
          type: categoriePro === 'sante' ? 'paiement_sante' : 'paiement_nourriture',
          montant,
          date: new Date().toISOString(),
          acteurNom: `${u?.prenom || ''} ${u?.nomFamille || ''}`.trim(),
          beneficiaireNom: proSelectionne.name,
          description: descriptionPayerPro,
          nomFamille: compte?.nomFamille,
          proNom: proSelectionne.name,
          logoUrl: proSelectionne.photo || null,
        });
        charger();
      } else {
        alert(d.message);
      }
    } finally { setLoadingPayerPro(false); }
  }

  // Peut voir le budget ? (18 ans ou plus)
  const peutVoirBudget = userAge >= 18 || compte?.estAdmin;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f4ff' }}>
      <div className="text-center">
        <div className="text-4xl mb-3">💰</div>
        <p className="text-gray-500">Chargement du compte famille...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-10" style={{ background: '#f0f4ff' }}>

      {/* Reçu modal */}
      {reçu && (
        <ReçuTransaction
          id={reçu.id}
          type={reçu.type}
          montant={reçu.montant}
          date={reçu.date}
          acteurNom={reçu.acteurNom}
          beneficiaireNom={reçu.beneficiaireNom}
          beneficiaireContact={reçu.beneficiaireContact}
          description={reçu.description}
          nomFamille={reçu.nomFamille}
          repartition={reçu.repartition}
          onClose={() => setReçu(null)}
        />
      )}

      {/* Header */}
      <div className="w-full py-8 px-4 text-center" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
        <div className="text-4xl mb-2">💰</div>
        <h1 className="text-white font-black text-2xl">Moftal Pay — Compte Famille</h1>
        <p className="text-blue-200 text-xs font-semibold tracking-widest mt-0.5">MOFTAL</p>
        <p className="text-blue-200 text-sm mt-1">Solidarité · Santé · Entraide</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">

        {/* Erreur profil */}
        {msgErreur && !existe && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-red-100">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-600 font-semibold text-sm">{msgErreur}</p>
          </div>
        )}

        {/* Arbre pas encore assez grand */}
        {!existe && !msgErreur && nbMembres < 10 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🌳</div>
              <h2 className="font-bold text-gray-900 text-lg mb-1">Moftal Pay s'ouvre à 10 membres</h2>
              <p className="text-gray-500 text-sm">
                Votre arbre familial doit rassembler <strong>10 membres</strong> pour activer le Moftal Pay.
              </p>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-gray-600">Membres actuels</span>
                <span style={{ color: '#2563eb' }}>{nbMembres} / 10</span>
              </div>
              <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min((nbMembres / 10) * 100, 100)}%`, background: 'linear-gradient(90deg,#2563eb,#1e3a5f)' }}
                />
              </div>
              <p className="text-blue-600 text-xs font-bold mt-1.5 text-center">
                Encore {10 - nbMembres} membre{10 - nbMembres > 1 ? 's' : ''} à inviter dans l'arbre
              </p>
            </div>
            <div className="rounded-xl p-3 text-sm space-y-1" style={{ background: '#f0f7ff' }}>
              <p className="font-semibold text-blue-900 text-xs mb-1">Ce qui s'active à 10 membres :</p>
              {CATEGORIES.map(c => (
                <div key={c.key} className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{c.icon}</span>
                  <span>{c.label} — {c.pct}% de chaque dépôt</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activation en cours */}
        {!existe && !msgErreur && nbMembres >= 10 && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-green-100">
            <div className="text-5xl mb-3">⏳</div>
            <h2 className="font-bold text-gray-900 text-lg mb-1">Activation en cours…</h2>
            <p className="text-green-600 font-semibold text-sm mb-2">🎉 {nbMembres} membres dans l'arbre</p>
            <p className="text-gray-500 text-sm">Rechargez la page dans quelques instants.</p>
          </div>
        )}

        {/* Compte existant */}
        {existe && compte && (
          <>
            {/* ─── Restriction âge < 40 ans ─── */}
            {!peutVoirBudget && (
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-amber-100">
                <div className="text-5xl mb-3">🔒</div>
                <h2 className="font-bold text-amber-900 text-lg mb-2">Accès restreint</h2>
                <p className="text-amber-700 text-sm">
                  Le budget familial est réservé aux membres adultes de <strong>18 ans et plus</strong>.
                </p>
                <p className="text-gray-400 text-xs mt-3">
                  Vous pouvez quand même faire des dépôts pour alimenter la caisse familiale.
                </p>
              </div>
            )}

            {/* Solde total (visible 40+ ou admin) */}
            {peutVoirBudget && (
              <>
                <div className="rounded-2xl p-6 text-white"
                  style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                  <p className="text-blue-200 text-sm mb-1 text-center">Famille {compte.nomFamille}</p>
                  {compte.familyCode && (
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-lg">🩸</span>
                      <span className="font-black text-white tracking-widest text-base">{compte.familyCode}</span>
                      {compte.bloodNumber && <span className="text-blue-300 text-xs">· Sang n°{compte.bloodNumber}</span>}
                    </div>
                  )}
                  <p className="font-black text-4xl text-center mb-0.5">
                    {formaterMontant(compte.soldes.total, devise)}
                  </p>
                  {devise.code !== 'GNF' && (
                    <p className="text-blue-300 text-xs text-center mb-1">
                      ≈ {compte.soldes.total.toLocaleString()} FG
                    </p>
                  )}
                  <p className="text-blue-200 text-xs text-center mb-4">Transferts internes gratuits · {nbMembres} membres</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                      <p className="text-blue-200 text-xs mb-0.5">Total déposé</p>
                      <p className="text-white font-black text-base">{formaterMontant(compte.totalDepose, devise)}</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                      <p className="text-blue-200 text-xs mb-0.5">Total dépensé</p>
                      <p className="text-white font-black text-base">{formaterMontant(compte.totalDepense, devise)}</p>
                    </div>
                  </div>

                  <button onClick={() => setShowRepartition(v => !v)}
                    className="w-full py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                    {showRepartition ? '▲ Masquer la répartition' : '▼ Voir la répartition'}
                  </button>
                </div>

                {/* Répartition */}
                {showRepartition && (
                  <div className="grid grid-cols-1 gap-3">
                    {CATEGORIES.map(cat => (
                      <div key={cat.key} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: cat.color + '18' }}>
                          {cat.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 text-sm">{cat.label}</span>
                            <span className="text-xs font-bold rounded-full px-2 py-0.5 text-white"
                              style={{ background: cat.color }}>{cat.pct}%</span>
                          </div>
                          <p className="font-black text-lg" style={{ color: cat.color }}>
                            {formaterMontant(compte.soldes[cat.key] || 0, devise)}
                          </p>
                          {cat.key === 'reserve' && (
                            <p className="text-xs text-gray-400 mt-0.5">🔒 Bloqué — vote unanime requis</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ─── Administrateurs de l'arbre ─── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span>👑</span> Chefs de la famille
              </h3>
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">
                Les chefs sont désignés depuis l'arbre familial
              </p>
              <div className="space-y-2">
                {/* Patriarche en premier — le plus important */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200" style={{ background: '#fff8e6' }}>
                  <span className="text-xl">🦁</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-amber-900">Patriarche</p>
                    <p className="text-xs text-gray-500">Le plus âgé · Chef à vie · Premier responsable</p>
                  </div>
                  {compte.conseillerNom
                    ? <span className="text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">{compte.conseillerNom}</span>
                    : <span className="text-xs text-gray-400 italic">Non désigné</span>}
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0f7ff' }}>
                  <span className="text-xl">🎙️</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-blue-900">Porte-parole</p>
                    <p className="text-xs text-gray-500">Élu par la famille · Remplaçable</p>
                  </div>
                  {compte.gerant1
                    ? <span className="text-xs font-bold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">#{compte.gerant1}</span>
                    : <span className="text-xs text-gray-400 italic">Non désigné</span>}
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0f7ff' }}>
                  <span className="text-xl">🤲</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-blue-900">Délégué</p>
                    <p className="text-xs text-gray-500">Élu par la famille · Remplaçable</p>
                  </div>
                  {compte.gerant2
                    ? <span className="text-xs font-bold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">#{compte.gerant2}</span>
                    : <span className="text-xs text-gray-400 italic">Non désigné</span>}
                </div>
              </div>
              {compte.estAdmin && (
                <p className="mt-3 text-center text-xs font-bold text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                  ✅ Vous êtes administrateur de ce compte
                </p>
              )}
            </div>

            {/* ─── Formulaire dépôt (tous les membres) ─── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-1">💵 Faire un dépôt</h3>
              <p className="text-xs text-gray-400 mb-3">
                Réparti automatiquement : 50% réserve · 30% santé · 10% nourriture · 5% urgence · 5% projet
              </p>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={montantDepot}
                  onChange={e => setMontantDepot(e.target.value)}
                  placeholder="Montant en GNF (min 1 000)"
                  min="1000"
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <button onClick={deposer} disabled={loadingDepot}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                  {loadingDepot ? '...' : 'Déposer'}
                </button>
              </div>
            </div>

            {/* ─── Paiement : admins + santé/nourriture seulement ─── */}
            {compte.estAdmin && peutVoirBudget && (
              <>
                <button onClick={() => setShowPaiement(!showPaiement)}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                  {showPaiement ? '✕ Annuler' : '💸 Effectuer un paiement'}
                </button>

                {showPaiement && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 space-y-3">
                    <h3 className="font-bold text-gray-900">Nouveau paiement</h3>
                    <p className="text-xs text-green-700 font-semibold bg-green-50 rounded-lg px-3 py-1.5">
                      👑 Réservé aux administrateurs · Santé et Alimentation uniquement
                    </p>

                    {/* Seulement santé et nourriture pour les familles */}
                    <select value={typePaiement} onChange={e => setTypePaiement(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none">
                      <option value="paiement_sante">🏥 Santé (30%)</option>
                      <option value="paiement_nourriture">🌾 Alimentation (10%)</option>
                    </select>

                    <input type="number" value={montantPaiement} onChange={e => setMontantPaiement(e.target.value)}
                      placeholder="Montant en GNF" min="100"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none" />

                    <input type="text" value={beneficiaire} onChange={e => setBeneficiaire(e.target.value)}
                      placeholder="Bénéficiaire (clinique, fournisseur...)"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none" />

                    <input type="text" value={contact} onChange={e => setContact(e.target.value)}
                      placeholder="Orange Money ou compte du bénéficiaire"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none" />

                    <textarea value={raison} onChange={e => setRaison(e.target.value)}
                      placeholder="Raison du paiement (ex: hospitalisation de Mamadou Barry)"
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none resize-none" />

                    <button onClick={payer} disabled={loadingPaiement}
                      className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                      {loadingPaiement ? 'Traitement...' : 'Confirmer le paiement'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ─── Payer un professionnel Moftal (admins, santé ou alimentation) ─── */}
            {compte.estAdmin && peutVoirBudget && (
              <>
                <button
                  onClick={() => { setShowPayerPro(!showPayerPro); setShowPaiement(false); }}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#2563eb)' }}>
                  {showPayerPro ? '✕ Annuler' : '🏥 Payer un professionnel Moftal'}
                </button>

                {showPayerPro && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100 space-y-3">
                    <h3 className="font-bold text-gray-900">Paiement vers un professionnel</h3>
                    <p className="text-xs text-blue-700 font-semibold bg-blue-50 rounded-lg px-3 py-2">
                      💸 Transfert interne <strong>100% gratuit</strong> — aucun frais FedaPay
                    </p>

                    {/* Catégorie */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Budget utilisé</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCategoriePro('sante')}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            categoriePro === 'sante'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-500'
                          }`}>
                          🏥 Santé ({compte.soldes.sante.toLocaleString()} FG)
                        </button>
                        <button
                          onClick={() => setCategoriePro('nourriture')}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            categoriePro === 'nourriture'
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-gray-200 text-gray-500'
                          }`}>
                          🌾 Aliment. ({compte.soldes.nourriture.toLocaleString()} FG)
                        </button>
                      </div>
                    </div>

                    {/* Recherche */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">
                        Chercher une {categoriePro === 'sante' ? 'clinique / médecin' : 'épicerie / fournisseur'}
                      </label>
                      <input
                        type="text"
                        value={rechercheProQ}
                        onChange={e => rechercherPros(e.target.value)}
                        placeholder="Tapez le nom (min 2 caractères)..."
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      />
                    </div>

                    {/* Résultats de recherche */}
                    {proResults.length > 0 && !proSelectionne && (
                      <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {proResults.map(pro => (
                          <button
                            key={pro.id}
                            onClick={() => {
                              setProSelectionne(pro);
                              setProResults([]);
                              if (pro.type === 'clinic') setCategoriePro('sante');
                              else if (pro.type === 'supplier') setCategoriePro('nourriture');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors">
                            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center text-lg">
                              {pro.photo ? <img src={pro.photo} className="w-full h-full object-cover" alt="" /> : (pro.type === 'clinic' ? '🏥' : '🛒')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{pro.name}</p>
                              <p className="text-xs text-gray-400">{pro.type === 'clinic' ? 'Santé' : 'Alimentation'} · {pro.city || ''}</p>
                            </div>
                            <span className="text-blue-500 text-xs font-bold">Choisir →</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {rechercheProQ.length >= 2 && proResults.length === 0 && !proSelectionne && (
                      <p className="text-xs text-gray-400 text-center py-2">Aucun professionnel Moftal trouvé pour "{rechercheProQ}"</p>
                    )}

                    {/* Pro sélectionné */}
                    {proSelectionne && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white flex items-center justify-center text-xl">
                          {proSelectionne.photo ? <img src={proSelectionne.photo} className="w-full h-full object-cover" alt="" /> : (proSelectionne.type === 'clinic' ? '🏥' : '🛒')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-blue-900">{proSelectionne.name}</p>
                          <p className="text-xs text-blue-600">{proSelectionne.city || ''}</p>
                        </div>
                        <button onClick={() => { setProSelectionne(null); setRechercheProQ(''); }}
                          className="text-xs text-red-400 hover:text-red-600 font-bold">✕</button>
                      </div>
                    )}

                    {/* Montant */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Montant (GNF)</label>
                      <input
                        type="number" min="100" step="100"
                        value={montantPayerPro}
                        onChange={e => setMontantPayerPro(e.target.value)}
                        placeholder="Ex: 500000"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Motif (optionnel)</label>
                      <input
                        type="text"
                        value={descriptionPayerPro}
                        onChange={e => setDescriptionPayerPro(e.target.value)}
                        placeholder="Ex: Consultation médicale Aminata, achat vivres"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      />
                    </div>

                    <button
                      onClick={payerPro}
                      disabled={loadingPayerPro || !proSelectionne}
                      className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-all"
                      style={{ background: 'linear-gradient(135deg,#0ea5e9,#2563eb)' }}>
                      {loadingPayerPro ? 'Traitement...' : `💸 Envoyer ${montantPayerPro ? parseInt(montantPayerPro).toLocaleString() + ' FG' : ''} → ${proSelectionne?.name || '...'}`}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ─── Historique (visible 40+ ou admin) ─── */}
            {peutVoirBudget && transactions.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3">Historique récent</h3>
                <div className="space-y-3">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                      <div className="text-2xl">{t.type === 'depot' ? '⬆️' : '⬇️'}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 text-sm">{TYPE_MAP[t.type] || t.type}</span>
                          <span className={`font-black text-sm ${t.type === 'depot' ? 'text-green-600' : 'text-red-500'}`}>
                            {t.type === 'depot' ? '+' : '-'}{formaterMontant(t.montant, devise)}
                          </span>
                        </div>
                        {t.acteurNom && <p className="text-xs text-gray-400">par {t.acteurNom}</p>}
                        {t.beneficiaireNom && <p className="text-xs text-gray-500">→ {t.beneficiaireNom}</p>}
                        {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-gray-300">
                            {new Date(t.date).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          {/* Bouton reçu sur chaque transaction */}
                          <button
                            onClick={() => setReçu({
                              id: t.id,
                              type: t.type,
                              montant: t.montant,
                              date: t.date,
                              acteurNom: t.acteurNom,
                              beneficiaireNom: t.beneficiaireNom,
                              beneficiaireContact: t.beneficiaireContact,
                              description: t.description,
                              nomFamille: compte.nomFamille,
                              repartition: t.repartition,
                            })}
                            className="text-xs text-blue-600 underline"
                          >
                            🧾 Reçu
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <button onClick={() => navigate(-1)}
          className="w-full py-3 rounded-2xl text-blue-700 font-semibold text-sm bg-white border border-blue-100 shadow-sm">
          ← Retour
        </button>
      </div>
    </div>
  );
}
