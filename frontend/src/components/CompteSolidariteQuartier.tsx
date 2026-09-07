import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import PaymentModal from './PaymentModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface Props {
  scope: string; // 'quartier' | 'sous-prefecture'
  location: string;
  locationName: string;
}

interface Chef { numeroH: string; nom: string; photo: string | null }
interface Compte {
  id: string;
  soldes: { sante: number; orphelins: number; developpement: number; disponible: number; total: number };
  totalDepose: number;
  totalDepense: number;
  chefs: Chef[];
  seuilConfirmation: number;
  estChef: boolean;
}
interface Demande {
  id: string;
  type: 'sante' | 'orphelins';
  montant: number;
  nombreSacs: number | null;
  beneficiaireNom: string | null;
  description: string | null;
  demandeurNom: string | null;
  confirmations: { numeroH: string; nom: string; date: string }[];
  statut: 'en_attente' | 'approuve' | 'rejete';
  date: string;
}

function getMyNumeroH(): string | null {
  try {
    const parsed = JSON.parse(localStorage.getItem('session_user') || '{}');
    return (parsed.userData || parsed)?.numeroH || null;
  } catch { return null; }
}

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

export interface CompteSolidariteQuartierHandle {
  open: () => void;
}

const CompteSolidariteQuartier = forwardRef<CompteSolidariteQuartierHandle, Props>(function CompteSolidariteQuartier(
  { scope, location, locationName },
  ref
) {
  const [open, setOpen] = useState(false);
  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }), []);
  const [loading, setLoading] = useState(false);
  const [existe, setExiste] = useState<boolean | null>(null);
  const [peutCreer, setPeutCreer] = useState(false);
  const [compte, setCompte] = useState<Compte | null>(null);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [erreur, setErreur] = useState('');
  const myNumeroH = getMyNumeroH();

  // Création du compte (admin)
  const [showCreer, setShowCreer] = useState(false);
  const [chef1, setChef1] = useState('');
  const [chef2, setChef2] = useState('');
  const [chef3, setChef3] = useState('');

  // Dépôt — réparti automatiquement 50% santé / 20% orphelins / 30% développement (bloqué)
  const [montantDepot, setMontantDepot] = useState('');
  const [showDepotPayment, setShowDepotPayment] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Demande de paiement (chef)
  const [showDemande, setShowDemande] = useState(false);
  const [demandeForm, setDemandeForm] = useState({ type: 'sante' as 'sante' | 'orphelins', montant: '', nombreSacs: '', beneficiaireNom: '', description: '' });
  const [demandeLoading, setDemandeLoading] = useState(false);

  const token = () => localStorage.getItem('token');

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');
    try {
      const r = await fetch(
        `${API_BASE}/api/quartier-fund/mon-compte?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}&locationName=${encodeURIComponent(locationName)}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      const d = await r.json();
      if (d.success) {
        setExiste(d.existe);
        setPeutCreer(!!d.peutCreer);
        if (d.existe) {
          setCompte(d.compte);
          setDemandes(d.demandes || []);
        }
      } else {
        setErreur(d.message || 'Erreur.');
      }
    } catch {
      setErreur('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }, [scope, location, locationName]);

  useEffect(() => { if (open) charger(); }, [open, charger]);

  const estAdminPrincipal = myNumeroH === 'G0C0P0R0E0F0 0' || myNumeroH === 'G7C7P7R7E7F7 7';

  async function creerCompte() {
    if (!chef1) return alert('Le chef 1 est requis.');
    if (!chef2 && !estAdminPrincipal) return alert('Il faut désigner au moins 2 chefs.');
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/quartier-fund/creer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, location, locationName, chef1NumeroH: chef1, chef2NumeroH: chef2, chef3NumeroH: chef3 || undefined })
      });
      const d = await r.json();
      if (d.success) {
        setShowCreer(false);
        await charger();
      } else {
        alert(d.message || 'Erreur.');
      }
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  function deposer() {
    const m = parseInt(montantDepot, 10);
    if (!m || m < 1000) return alert('Montant minimum : 1 000 GNF');
    setShowDepotPayment(true);
  }

  async function onDepotSuccess() {
    setShowDepotPayment(false);
    setMontantDepot('');
    await charger();
  }

  async function envoyerDemande() {
    if (demandeForm.type === 'sante') {
      const m = parseInt(demandeForm.montant, 10);
      if (!m || m <= 0) return alert('Montant invalide.');
      if (!demandeForm.beneficiaireNom.trim()) return alert("Indiquez le nom de l'hôpital.");
    } else {
      const sacs = parseInt(demandeForm.nombreSacs, 10);
      if (!sacs || sacs < 1) return alert('Indiquez un nombre de sacs de riz valide.');
    }
    setDemandeLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/quartier-fund/demander`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, location, ...demandeForm })
      });
      const d = await r.json();
      if (d.success) {
        setShowDemande(false);
        setDemandeForm({ type: 'sante', montant: '', nombreSacs: '', beneficiaireNom: '', description: '' });
        await charger();
      } else {
        alert(d.message || 'Erreur.');
      }
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setDemandeLoading(false);
    }
  }

  async function confirmer(id: string) {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/quartier-fund/confirmer/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      if (!d.success) alert(d.message || 'Erreur.');
      await charger();
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  async function rejeter(id: string) {
    if (!confirm('Rejeter cette demande ?')) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/quartier-fund/rejeter/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      if (!d.success) alert(d.message || 'Erreur.');
      await charger();
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="font-black text-base">💰 Caisse — {locationName}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            <div className="p-4 space-y-4">
              {erreur && <div className="bg-red-50 text-red-700 text-sm p-2 rounded-lg">{erreur}</div>}
              {loading && !compte && existe === null && <div className="text-center text-sm text-gray-400 py-6">Chargement...</div>}

              {existe === false && (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-gray-500">
                    Pas encore de Compte Solidarité pour {locationName}.
                  </p>
                  {peutCreer ? (
                    !showCreer ? (
                      <button
                        onClick={() => { if (estAdminPrincipal && myNumeroH) setChef1(myNumeroH); setShowCreer(true); }}
                        className="px-4 py-2 rounded-full bg-cyan-700 text-white text-sm font-bold"
                      >
                        Créer le compte
                      </button>
                    ) : (
                      <div className="text-left space-y-2 bg-gray-50 p-3 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">
                          {estAdminPrincipal
                            ? 'En tant qu\'admin, tu peux créer seule (pour voir le compte) ou désigner directement les chefs.'
                            : 'Désigne 2 ou 3 chefs (numéro H). 2 confirmations seront requises pour chaque paiement.'}
                        </p>
                        <input value={chef1} onChange={e => setChef1(e.target.value)} placeholder="Numéro H — Chef 1" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        <input value={chef2} onChange={e => setChef2(e.target.value)} placeholder={`Numéro H — Chef 2${estAdminPrincipal ? ' (optionnel)' : ''}`} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        <input value={chef3} onChange={e => setChef3(e.target.value)} placeholder="Numéro H — Chef 3 (optionnel)" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        <button onClick={creerCompte} disabled={loading} className="w-full py-2 rounded-full bg-cyan-700 text-white text-sm font-bold disabled:opacity-50">
                          Confirmer la création
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-gray-400">Seul un administrateur peut créer ce compte.</p>
                  )}
                </div>
              )}

              {existe && compte && (
                <>
                  {/* Solde global, détail dépliable */}
                  <div className="bg-cyan-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-cyan-700 font-bold">💰 Solde total</div>
                    <div className="text-2xl font-black text-cyan-900">{fmt(compte.soldes.total)} GNF</div>
                    <button onClick={() => setShowDetail(v => !v)} className="text-[11px] text-cyan-700 underline mt-1">
                      {showDetail ? 'Cacher le détail' : 'Voir le détail'}
                    </button>
                  </div>

                  {showDetail && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 rounded-xl p-2 text-center">
                        <div className="text-[10px] text-emerald-700 font-bold">🏥 Santé</div>
                        <div className="text-sm font-black text-emerald-800">{fmt(compte.soldes.sante)}</div>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-2 text-center">
                        <div className="text-[10px] text-amber-700 font-bold">🍚 Orphelins</div>
                        <div className="text-sm font-black text-amber-800">{fmt(compte.soldes.orphelins)}</div>
                      </div>
                      <div className="bg-gray-100 rounded-xl p-2 text-center">
                        <div className="text-[10px] text-gray-500 font-bold">🔒 Projets</div>
                        <div className="text-sm font-black text-gray-600">{fmt(compte.soldes.developpement)}</div>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 text-center">
                    Chaque dépôt est réparti automatiquement : 50% santé, 20% orphelins, 30% projets (bloqué pour le moment).
                    Jamais de retrait en argent. Total déposé depuis le début : {fmt(compte.totalDepose)} GNF.
                  </p>

                  {/* Chefs */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-600 mb-1.5">Chefs gestionnaires ({compte.seuilConfirmation} confirmations requises)</p>
                    <div className="flex flex-wrap gap-2">
                      {compte.chefs.map(c => (
                        <span key={c.numeroH} className="text-xs bg-white border px-2 py-1 rounded-full">
                          {c.nom || c.numeroH}{c.numeroH === myNumeroH ? ' (toi)' : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Dépôt */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-gray-600">Déposer de l'argent</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={montantDepot}
                        onChange={e => setMontantDepot(e.target.value)}
                        placeholder="Montant (GNF)"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button onClick={deposer} className="px-4 py-2 rounded-lg bg-cyan-700 text-white text-sm font-bold">Déposer</button>
                    </div>
                  </div>

                  {/* Demande de paiement (chef seulement) */}
                  {compte.estChef && (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-600">Demander un paiement</p>
                        {!showDemande && (
                          <button onClick={() => setShowDemande(true)} className="text-xs font-bold text-cyan-700">+ Nouvelle demande</button>
                        )}
                      </div>
                      {showDemande && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDemandeForm(f => ({ ...f, type: 'sante' }))}
                              className={`flex-1 py-1.5 rounded-full text-xs font-bold ${demandeForm.type === 'sante' ? 'bg-emerald-600 text-white' : 'bg-white border text-gray-600'}`}
                            >🏥 Santé (hôpital)</button>
                            <button
                              onClick={() => setDemandeForm(f => ({ ...f, type: 'orphelins' }))}
                              className={`flex-1 py-1.5 rounded-full text-xs font-bold ${demandeForm.type === 'orphelins' ? 'bg-amber-600 text-white' : 'bg-white border text-gray-600'}`}
                            >🍚 Orphelins (riz)</button>
                          </div>
                          <input
                            value={demandeForm.beneficiaireNom}
                            onChange={e => setDemandeForm(f => ({ ...f, beneficiaireNom: e.target.value }))}
                            placeholder={demandeForm.type === 'sante' ? "Nom de l'hôpital" : "Nom de l'orphelin/tuteur"}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                          {demandeForm.type === 'sante' ? (
                            <input
                              type="number"
                              value={demandeForm.montant}
                              onChange={e => setDemandeForm(f => ({ ...f, montant: e.target.value }))}
                              placeholder="Montant (GNF)"
                              className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                          ) : (
                            <input
                              type="number"
                              value={demandeForm.nombreSacs}
                              onChange={e => setDemandeForm(f => ({ ...f, nombreSacs: e.target.value }))}
                              placeholder="Nombre de sacs de riz"
                              className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                          )}
                          <textarea
                            value={demandeForm.description}
                            onChange={e => setDemandeForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Détails (raison, contact...)"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setShowDemande(false)} className="flex-1 py-2 rounded-full border text-sm font-bold text-gray-600">Annuler</button>
                            <button onClick={envoyerDemande} disabled={demandeLoading} className="flex-1 py-2 rounded-full bg-cyan-700 text-white text-sm font-bold disabled:opacity-50">Envoyer</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Liste des demandes */}
                  {demandes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-600">Demandes de paiement</p>
                      {demandes.map(d => (
                        <div key={d.id} className="border rounded-xl p-3 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{d.type === 'sante' ? '🏥' : '🍚'} {fmt(d.montant)} GNF</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              d.statut === 'approuve' ? 'bg-green-100 text-green-700' :
                              d.statut === 'rejete' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{d.statut === 'approuve' ? 'Payé' : d.statut === 'rejete' ? 'Rejeté' : 'En attente'}</span>
                          </div>
                          {d.type === 'orphelins' && d.nombreSacs && <p className="text-xs text-gray-500">{d.nombreSacs} sac(s) de riz</p>}
                          {d.beneficiaireNom && <p className="text-xs text-gray-500">Vers : {d.beneficiaireNom}</p>}
                          {d.description && <p className="text-xs text-gray-400">{d.description}</p>}
                          <p className="text-[11px] text-gray-400">
                            Demandé par {d.demandeurNom} · {d.confirmations.length}/{compte.seuilConfirmation} confirmation(s)
                          </p>
                          {d.statut === 'en_attente' && compte.estChef && (
                            <div className="flex gap-2 pt-1">
                              {!d.confirmations.some(c => c.numeroH === myNumeroH) && (
                                <button onClick={() => confirmer(d.id)} className="flex-1 py-1.5 rounded-full bg-green-600 text-white text-xs font-bold">
                                  Confirmer
                                </button>
                              )}
                              <button onClick={() => rejeter(d.id)} className="flex-1 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-200">
                                Rejeter
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showDepotPayment}
        onClose={() => setShowDepotPayment(false)}
        onSuccess={onDepotSuccess}
        amount={parseInt(montantDepot) || 0}
        purpose="wallet_depot_quartier_fund"
        relatedId={`${scope}:${location}:${montantDepot}`}
        description={`Dépôt Compte Solidarité — ${locationName}`}
      />
    </>
  );
});

export default CompteSolidariteQuartier;
