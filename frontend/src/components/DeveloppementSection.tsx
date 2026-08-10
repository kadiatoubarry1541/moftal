import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const DOMAINES = [
  { id: 'agriculture',    label: 'Agriculture',           emoji: '🌾', color: '#156315', bg: '#f0fdf0', desc: 'Production locale, irrigation, coopératives agricoles' },
  { id: 'habitat',        label: 'Habitat & Logement',    emoji: '🏗️', color: '#0891b2', bg: '#ecfeff', desc: 'Construction, matériaux locaux, planification urbaine' },
  { id: 'energie',        label: 'Énergie',               emoji: '⚡', color: '#d97706', bg: '#fffbeb', desc: 'Solaire, eau, électrification des zones rurales' },
  { id: 'education',      label: 'Éducation',             emoji: '📚', color: '#7c3aed', bg: '#f5f3ff', desc: 'Scolarisation, alphabétisation, formation professionnelle' },
  { id: 'sante',          label: 'Santé',                 emoji: '🏥', color: '#1a8f1a', bg: '#f0fdfa', desc: 'Centres de santé, médicaments, nutrition' },
  { id: 'numerique',      label: 'Numérique',             emoji: '💻', color: '#6366f1', bg: '#eef2ff', desc: 'Internet, smartphones, compétences digitales' },
  { id: 'commerce',       label: 'Commerce & PME',        emoji: '📈', color: '#1a8f1a', bg: '#f0fdf0', desc: 'Marchés, microcrédit, incubateurs d\'entreprises' },
  { id: 'infrastructure', label: 'Infrastructures',       emoji: '🛣️', color: '#64748b', bg: '#f8fafc', desc: 'Routes, ponts, eau potable, assainissement' },
  { id: 'environnement',  label: 'Environnement',         emoji: '🌿', color: '#1a8f1a', bg: '#f0fdf0', desc: 'Reboisement, gestion des déchets, changement climatique' },
  { id: 'femmes',         label: 'Autonomisation femmes', emoji: '👩', color: '#db2777', bg: '#fdf2f8', desc: 'Entrepreneuriat féminin, droits, leadership' },
  { id: 'jeunesse',       label: 'Jeunesse & Emploi',     emoji: '🎯', color: '#ea580c', bg: '#fff7ed', desc: 'Stages, formation, insertion professionnelle' },
  { id: 'gouvernance',    label: 'Gouvernance',           emoji: '🏛️', color: '#1d4ed8', bg: '#eff6ff', desc: 'Démocratie locale, transparence, participation citoyenne' },
];

interface Props {
  scope: string;
  location: string;
  locationName: string;
  isJournalist?: boolean;
  isAdmin?: boolean;
}

export default function DeveloppementSection({ scope, location, locationName, isJournalist, isAdmin }: Props) {
  const canPublish = !!(isJournalist || isAdmin);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [totalCollecte, setTotalCollecte] = useState(0);
  const [parDomaine, setParDomaine] = useState<Record<string, number>>({});
  const [nbDonneurs, setNbDonneurs] = useState(0);
  const [projets, setProjets] = useState<any[]>([]);
  const [loadingProjets, setLoadingProjets] = useState(true);
  const [activeDomaine, setActiveDomaine] = useState<string | null>(null);
  const [showDon, setShowDon] = useState(false);
  const [showMesDons, setShowMesDons] = useState(false);
  const [mesDons, setMesDons] = useState<any[]>([]);
  const [donLoading, setDonLoading] = useState(false);
  const [donForm, setDonForm] = useState({
    amount: '',
    currency: 'FG',
    domaine: 'general',
    domaineLabel: 'Fonds Général de Développement',
    message: ''
  });

  useEffect(() => {
    if (location) { loadStats(); loadLogo(); loadProjets(); }
  }, [scope, location]);

  const loadProjets = async () => {
    setLoadingProjets(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/developpement/projets?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) { const d = await res.json(); setProjets(d.projets || []); }
    } catch {} finally { setLoadingProjets(false); }
  };

  const loadLogo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/developpement/logo?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) { const d = await res.json(); setLogoUrl(d.logoUrl || null); }
    } catch {}
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('scope', scope);
      formData.append('location', location);
      const res = await fetch(`${API_BASE}/api/developpement/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const d = await res.json();
      if (d.success) {
        setLogoUrl(d.logoUrl);
      } else {
        alert(d.message || 'Impossible de changer le logo');
      }
    } catch { alert('Erreur réseau lors de l\'envoi du logo'); } finally { setUploadingLogo(false); }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/developpement/stats?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setTotalCollecte(data.totalCollecte || 0);
        setParDomaine(data.parDomaine || {});
        setNbDonneurs(data.nbDonneurs || 0);
      }
    } catch {}
  };

  const loadMesDons = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/developpement/mes-dons?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setMesDons(data.dons || []);
      }
    } catch {}
  };

  const submitDon = async () => {
    if (!donForm.amount || parseFloat(donForm.amount) <= 0) return;
    setDonLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/developpement/donate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...donForm, scope, location })
      });
      if (res.ok) {
        setShowDon(false);
        setDonForm({ amount: '', currency: 'FG', domaine: 'general', domaineLabel: 'Fonds Général de Développement', message: '' });
        loadStats();
        alert('Cotisation enregistrée ! Merci pour votre soutien au développement.');
      } else {
        alert('Erreur lors de la cotisation. Veuillez réessayer.');
      }
    } catch {
      alert('Erreur lors de la cotisation.');
    } finally {
      setDonLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('fr-GN').format(Math.round(n)) + ' FG';

  return (
    <div className="space-y-4">

      {/* Bannière caisse */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {(logoUrl || canPublish) && (
              <label
                className={`relative w-11 h-11 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 ${canPublish ? 'cursor-pointer' : ''}`}
                title={canPublish ? `Changer le logo de ${locationName}` : undefined}
              >
                {logoUrl ? (
                  <img src={logoUrl.startsWith('http') ? logoUrl : `${API_BASE}${logoUrl}`} alt={`Logo de ${locationName}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">🏛️</span>
                )}
                {canPublish && (
                  <>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] leading-none">
                      {uploadingLogo ? '…' : '📷'}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </>
                )}
              </label>
            )}
            <div>
              <p className="text-green-100 text-xs font-medium">Caisse de développement — {locationName}</p>
              <p className="text-2xl font-extrabold mt-0.5">{fmt(totalCollecte)}</p>
              <p className="text-green-100 text-xs mt-0.5">{nbDonneurs} cotisant{nbDonneurs > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDon(true)}
              className="px-4 py-2 bg-white text-green-700 font-bold rounded-xl text-sm hover:bg-green-50 transition-colors shadow"
            >
              🤝 Cotiser
            </button>
            <button
              onClick={() => { setShowMesDons(true); loadMesDons(); }}
              className="px-4 py-2 bg-white/20 text-white font-semibold rounded-xl text-sm hover:bg-white/30 transition-colors"
            >
              📋 Mes dons
            </button>
          </div>
        </div>
      </div>

      {/* Domaines */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Domaines de développement</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {DOMAINES.map((dom) => (
            <button
              key={dom.id}
              onClick={() => setActiveDomaine(activeDomaine === dom.id ? null : dom.id)}
              className="flex flex-col items-start gap-1.5 p-3 bg-white rounded-xl border-2 transition-all hover:shadow-sm text-left"
              style={{ borderColor: activeDomaine === dom.id ? dom.color : '#e2e8f0', background: activeDomaine === dom.id ? dom.bg : 'white' }}
            >
              <span className="text-xl">{dom.emoji}</span>
              <span className="font-bold text-slate-800 text-xs leading-tight">{dom.label}</span>
              {parDomaine[dom.id] > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: dom.bg, color: dom.color }}>
                  {fmt(parDomaine[dom.id])}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeDomaine && (() => {
          const dom = DOMAINES.find(d => d.id === activeDomaine)!;
          return (
            <div className="mt-3 bg-white rounded-xl border p-4 shadow-sm" style={{ borderColor: dom.color + '44' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{dom.emoji}</span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{dom.label}</h4>
                    <p className="text-slate-500 text-xs">{dom.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDonForm({ amount: '', currency: 'FG', domaine: dom.id, domaineLabel: dom.label, message: '' });
                    setShowDon(true);
                  }}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
                  style={{ background: dom.color }}
                >
                  💰 Financer
                </button>
              </div>
              {parDomaine[dom.id] > 0 && (
                <p className="text-xs font-semibold mb-2" style={{ color: dom.color }}>
                  💚 {fmt(parDomaine[dom.id])} collectés pour ce domaine
                </p>
              )}
              {(() => {
                const projetsDomaine = projets.filter(p => p.domaine === dom.id);
                if (loadingProjets) {
                  return (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                    </div>
                  );
                }
                if (projetsDomaine.length === 0) {
                  return (
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <p className="text-slate-500 text-sm font-medium">Aucun projet enregistré pour l'instant</p>
                      <p className="text-slate-400 text-xs mt-1">Les projets soumis et approuvés apparaîtront ici</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {projetsDomaine.map((p: any) => {
                      const statutInfo: Record<string, { label: string; bg: string; text: string }> = {
                        annonce:   { label: 'Annoncé',   bg: 'bg-blue-100',  text: 'text-blue-700' },
                        en_cours:  { label: 'En cours',  bg: 'bg-amber-100', text: 'text-amber-700' },
                        termine:   { label: 'Terminé',   bg: 'bg-green-100', text: 'text-green-700' },
                        abandonne: { label: 'Abandonné', bg: 'bg-red-100',   text: 'text-red-700' },
                      };
                      const si = statutInfo[p.statut] || statutInfo.annonce;
                      return (
                        <div key={p.id} className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-800 text-sm">{p.titre}</p>
                            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${si.bg} ${si.text}`}>{si.label}</span>
                          </div>
                          {p.description && <p className="text-slate-500 text-xs mt-1">{p.description}</p>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border text-center">
          <div className="text-lg mb-0.5">📋</div>
          <div className="font-bold text-slate-800 text-base">{projets.filter(p => p.statut === 'en_cours').length}</div>
          <div className="text-slate-500 text-[10px]">En cours</div>
        </div>
        <div className="bg-white rounded-xl p-3 border text-center">
          <div className="text-lg mb-0.5">✅</div>
          <div className="font-bold text-slate-800 text-base">{projets.filter(p => p.statut === 'termine').length}</div>
          <div className="text-slate-500 text-[10px]">Terminés</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 border border-green-200 text-center cursor-pointer hover:bg-green-100 transition-colors" onClick={() => setShowDon(true)}>
          <div className="text-lg mb-0.5">🤝</div>
          <div className="font-bold text-green-700 text-sm">{fmt(totalCollecte)}</div>
          <div className="text-green-600 text-[10px] font-semibold">Caisse</div>
        </div>
      </div>

      {/* Modal cotisation */}
      {showDon && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-5">
              <h2 className="text-lg font-bold text-white">🤝 Cotisation — {locationName}</h2>
              <p className="text-green-100 text-sm mt-1">Contribuez au développement de votre territoire</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Domaine à soutenir</label>
                <select
                  value={donForm.domaine}
                  onChange={(e) => {
                    const dom = DOMAINES.find(d => d.id === e.target.value);
                    setDonForm({ ...donForm, domaine: e.target.value, domaineLabel: dom ? dom.label : 'Fonds Général de Développement' });
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="general">🌍 Caisse Générale</option>
                  {DOMAINES.map(dom => (
                    <option key={dom.id} value={dom.id}>{dom.emoji} {dom.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Montant</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={donForm.amount}
                    onChange={(e) => setDonForm({ ...donForm, amount: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ex: 50000"
                  />
                  <select
                    value={donForm.currency}
                    onChange={(e) => setDonForm({ ...donForm, currency: e.target.value })}
                    className="w-20 border border-slate-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="FG">FG</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  {['5000', '10000', '50000', '100000'].map(m => (
                    <button
                      key={m}
                      onClick={() => setDonForm({ ...donForm, amount: m })}
                      className="flex-1 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                    >
                      {parseInt(m).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message (optionnel)</label>
                <textarea
                  value={donForm.message}
                  onChange={(e) => setDonForm({ ...donForm, message: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Un mot pour votre communauté..."
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setShowDon(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitDon}
                disabled={donLoading || !donForm.amount}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {donLoading ? 'En cours...' : '🤝 Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal mes dons */}
      {showMesDons && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
            <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-5">
              <h2 className="text-lg font-bold text-white">📋 Mes cotisations — {locationName}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {mesDons.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">💚</div>
                  <p className="text-slate-600 font-medium">Aucune cotisation encore</p>
                  <button
                    onClick={() => { setShowMesDons(false); setShowDon(true); }}
                    className="mt-4 px-5 py-2 bg-green-600 text-white font-semibold rounded-xl text-sm hover:bg-green-700 transition-colors"
                  >
                    🤝 Cotiser maintenant
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mesDons.map((don: any) => {
                    const dom = DOMAINES.find(d => d.id === don.domaine);
                    return (
                      <div key={don.id} className="border rounded-xl p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{dom ? dom.emoji : '🌍'}</span>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{don.domaineLabel}</div>
                              <div className="text-xs text-slate-500">{new Date(don.createdAt || don.created_at).toLocaleDateString('fr-FR')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-700 text-sm">{parseFloat(don.amount).toLocaleString()} {don.currency}</div>
                          </div>
                        </div>
                        {don.message && <p className="text-xs text-slate-500 mt-1 italic">"{don.message}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowMesDons(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
