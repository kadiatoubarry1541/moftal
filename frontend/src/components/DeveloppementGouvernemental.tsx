import { useState, useEffect } from 'react';

const DOMAINES_MAP: Record<string, { emoji: string; color: string }> = {
  agriculture:    { emoji: '🌾', color: '#156315' },
  habitat:        { emoji: '🏗️', color: '#0891b2' },
  energie:        { emoji: '⚡', color: '#d97706' },
  education:      { emoji: '📚', color: '#7c3aed' },
  sante:          { emoji: '🏥', color: '#1a8f1a' },
  numerique:      { emoji: '💻', color: '#6366f1' },
  commerce:       { emoji: '📈', color: '#1a8f1a' },
  infrastructure: { emoji: '🛣️', color: '#64748b' },
  environnement:  { emoji: '🌿', color: '#166534' },
  femmes:         { emoji: '👩', color: '#db2777' },
  jeunesse:       { emoji: '🎯', color: '#ea580c' },
  gouvernance:    { emoji: '🏛️', color: '#1d4ed8' },
};

const DOMAINES_OPTIONS = [
  { id: 'agriculture',    label: 'Agriculture',           emoji: '🌾' },
  { id: 'habitat',        label: 'Habitat & Logement',    emoji: '🏗️' },
  { id: 'energie',        label: 'Énergie',               emoji: '⚡' },
  { id: 'education',      label: 'Éducation',             emoji: '📚' },
  { id: 'sante',          label: 'Santé',                 emoji: '🏥' },
  { id: 'numerique',      label: 'Numérique',             emoji: '💻' },
  { id: 'commerce',       label: 'Commerce & PME',        emoji: '📈' },
  { id: 'infrastructure', label: 'Infrastructures',       emoji: '🛣️' },
  { id: 'environnement',  label: 'Environnement',         emoji: '🌿' },
  { id: 'femmes',         label: 'Femmes',                emoji: '👩' },
  { id: 'jeunesse',       label: 'Jeunesse & Emploi',     emoji: '🎯' },
  { id: 'gouvernance',    label: 'Gouvernance',           emoji: '🏛️' },
];

const STATUT_CONFIG = {
  annonce:   { label: 'Annoncé',    bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  en_cours:  { label: 'En cours',   bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  termine:   { label: 'Terminé',    bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  abandonne: { label: 'Abandonné',  bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
};

const TYPE_SIGNALEMENT = [
  { id: 'infrastructure',    label: 'Infrastructure endommagée', emoji: '🛣️' },
  { id: 'projet_abandonne',  label: 'Projet abandonné',          emoji: '⚠️' },
  { id: 'manque_service',    label: 'Service manquant',          emoji: '🏥' },
  { id: 'autre',             label: 'Autre problème',            emoji: '📌' },
];

interface Props {
  scope: string;
  location: string;
  locationName: string;
  isJournalist: boolean;
  isAdmin: boolean;
}

export default function DeveloppementGouvernemental({ scope, location, locationName, isJournalist, isAdmin }: Props) {
  const canPublish = isJournalist || isAdmin;
  const [activeTab, setActiveTab] = useState<'actualites' | 'projets' | 'signaler'>('actualites');

  // Actualités
  const [actualites, setActualites] = useState<any[]>([]);
  const [loadingActu, setLoadingActu] = useState(true);
  const [showActuForm, setShowActuForm] = useState(false);
  const [actuForm, setActuForm] = useState({ titre: '', content: '', mediaUrl: '', domaine: '' });
  const [actuLoading, setActuLoading] = useState(false);

  // Projets
  const [projets, setProjets] = useState<any[]>([]);
  const [loadingProjets, setLoadingProjets] = useState(true);
  const [showProjetForm, setShowProjetForm] = useState(false);
  const [projetForm, setProjetForm] = useState({
    titre: '', description: '', domaine: '', statut: 'annonce',
    budget: '', source: '', dateDebut: '', dateFin: ''
  });
  const [projetLoading, setProjetLoading] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreDomaine, setFiltreDomaine] = useState('');

  // Signalements
  const [signalements, setSignalements] = useState<any[]>([]);
  const [sigForm, setSigForm] = useState({ type: 'infrastructure', description: '', lieu: '' });
  const [sigLoading, setSigLoading] = useState(false);
  const [sigEnvoye, setSigEnvoye] = useState(false);

  const token = () => localStorage.getItem('token');
  const api = (path: string) => `http://localhost:5002/api/developpement${path}`;
  const qs = `scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`;

  useEffect(() => {
    loadActualites();
    loadProjets();
    if (canPublish) loadSignalements();
  }, [scope, location]);

  const loadActualites = async () => {
    setLoadingActu(true);
    try {
      const res = await fetch(api(`/actualites?${qs}`), { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setActualites(d.actualites || []); }
    } catch {} finally { setLoadingActu(false); }
  };

  const loadProjets = async () => {
    setLoadingProjets(true);
    try {
      const res = await fetch(api(`/projets?${qs}`), { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setProjets(d.projets || []); }
    } catch {} finally { setLoadingProjets(false); }
  };

  const loadSignalements = async () => {
    try {
      const res = await fetch(api(`/signalements?${qs}`), { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setSignalements(d.signalements || []); }
    } catch {}
  };

  const publierActualite = async () => {
    if (!actuForm.titre.trim() || !actuForm.content.trim()) return;
    setActuLoading(true);
    try {
      const res = await fetch(api('/actualites'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...actuForm, scope, location })
      });
      if (res.ok) {
        setShowActuForm(false);
        setActuForm({ titre: '', content: '', mediaUrl: '', domaine: '' });
        loadActualites();
      } else {
        const e = await res.json().catch(() => ({}));
        alert(e.message || 'Erreur lors de la publication');
      }
    } catch { alert('Erreur réseau'); } finally { setActuLoading(false); }
  };

  const supprimerActualite = async (id: string) => {
    if (!confirm('Supprimer cette actualité ?')) return;
    await fetch(api(`/actualites/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    loadActualites();
  };

  const ajouterProjet = async () => {
    if (!projetForm.titre.trim()) return;
    setProjetLoading(true);
    try {
      const res = await fetch(api('/projets'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projetForm, scope, location })
      });
      if (res.ok) {
        setShowProjetForm(false);
        setProjetForm({ titre: '', description: '', domaine: '', statut: 'annonce', budget: '', source: '', dateDebut: '', dateFin: '' });
        loadProjets();
      } else {
        const e = await res.json().catch(() => ({}));
        alert(e.message || 'Erreur');
      }
    } catch { alert('Erreur réseau'); } finally { setProjetLoading(false); }
  };

  const changerStatutProjet = async (id: string, statut: string) => {
    await fetch(api(`/projets/${id}`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut })
    });
    loadProjets();
  };

  const supprimerProjet = async (id: string) => {
    if (!confirm('Supprimer ce projet ?')) return;
    await fetch(api(`/projets/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    loadProjets();
  };

  const envoyerSignalement = async () => {
    if (!sigForm.description.trim()) return;
    setSigLoading(true);
    try {
      const res = await fetch(api('/signalements'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sigForm, scope, location })
      });
      if (res.ok) {
        setSigEnvoye(true);
        setSigForm({ type: 'infrastructure', description: '', lieu: '' });
      } else {
        alert('Erreur lors de l\'envoi');
      }
    } catch { alert('Erreur réseau'); } finally { setSigLoading(false); }
  };

  const validerSignalement = async (id: string, statut: string) => {
    await fetch(api(`/signalements/${id}/statut`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut })
    });
    loadSignalements();
  };

  const projetsFiltres = projets.filter(p => {
    if (filtreStatut && p.statut !== filtreStatut) return false;
    if (filtreDomaine && p.domaine !== filtreDomaine) return false;
    return true;
  });

  return (
    <div className="space-y-3">

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {[
          { id: 'actualites', icon: '📰', label: 'Actualités' },
          { id: 'projets',    icon: '🏗️', label: 'Projets' },
          { id: 'signaler',   icon: '📍', label: 'Signaler' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'projets' && projets.length > 0 && (
              <span className="ml-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 rounded-full">{projets.length}</span>
            )}
            {tab.id === 'signaler' && canPublish && signalements.filter(s => s.statut === 'recu').length > 0 && (
              <span className="ml-0.5 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 rounded-full">{signalements.filter(s => s.statut === 'recu').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB ACTUALITÉS ───────────────────────────────────────────────── */}
      {activeTab === 'actualites' && (
        <div className="space-y-3">
          {canPublish && (
            <button
              onClick={() => setShowActuForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition-colors"
            >
              ✚ Publier une actualité
            </button>
          )}

          {loadingActu ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" /></div>
          ) : actualites.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📰</div>
              <p className="text-gray-500 text-sm font-medium">Aucune actualité publiée</p>
              {canPublish && <p className="text-gray-400 text-xs mt-1">Publiez la première actualité sur le développement de {locationName}</p>}
              {!canPublish && <p className="text-gray-400 text-xs mt-1">Les journalistes approuvés publient les informations sur le développement ici</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {actualites.map(actu => {
                const dom = DOMAINES_MAP[actu.domaine] || null;
                return (
                  <div key={actu.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {actu.mediaUrl && (
                      <img src={actu.mediaUrl} alt={actu.titre} className="w-full h-40 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {dom && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: dom.color + '20', color: dom.color }}>
                              {dom.emoji} {DOMAINES_OPTIONS.find(d => d.id === actu.domaine)?.label}
                            </span>
                          )}
                        </div>
                        {canPublish && (
                          <button onClick={() => supprimerActualite(actu.id)} className="text-red-400 hover:text-red-600 text-xs flex-shrink-0">✕</button>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1.5">{actu.titre}</h3>
                      <p className="text-gray-600 text-xs leading-relaxed">{actu.content}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400">✍️ {actu.authorName}</span>
                        <span className="text-xs text-gray-400">{new Date(actu.createdAt || actu.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB PROJETS ──────────────────────────────────────────────────── */}
      {activeTab === 'projets' && (
        <div className="space-y-3">
          {canPublish && (
            <button
              onClick={() => setShowProjetForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white font-semibold rounded-xl text-sm hover:bg-amber-600 transition-colors"
            >
              ✚ Ajouter un projet
            </button>
          )}

          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={filtreStatut}
              onChange={e => setFiltreStatut(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select
              value={filtreDomaine}
              onChange={e => setFiltreDomaine(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="">Tous les domaines</option>
              {DOMAINES_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>)}
            </select>
          </div>

          {/* Légende statuts */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(STATUT_CONFIG).map(([k, v]) => (
              <span key={k} className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${v.bg} ${v.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />{v.label}
              </span>
            ))}
          </div>

          {loadingProjets ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" /></div>
          ) : projetsFiltres.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">🏗️</div>
              <p className="text-gray-500 text-sm font-medium">Aucun projet enregistré</p>
              {canPublish && <p className="text-gray-400 text-xs mt-1">Ajoutez les projets de développement de {locationName}</p>}
              {!canPublish && <p className="text-gray-400 text-xs mt-1">Les journalistes enregistrent ici les projets gouvernementaux</p>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {projetsFiltres.map(projet => {
                const statut = STATUT_CONFIG[projet.statut as keyof typeof STATUT_CONFIG] || STATUT_CONFIG.annonce;
                const dom = DOMAINES_MAP[projet.domaine] || null;
                return (
                  <div key={projet.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statut.bg} ${statut.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statut.dot}`} />{statut.label}
                          </span>
                          {dom && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: dom.color + '20', color: dom.color }}>
                              {dom.emoji}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">{projet.titre}</h4>
                        {projet.description && <p className="text-gray-500 text-xs mt-1">{projet.description}</p>}
                        <div className="flex gap-3 mt-2 flex-wrap">
                          {projet.budget && <span className="text-xs text-green-700 font-semibold">💰 {projet.budget}</span>}
                          {projet.source && <span className="text-xs text-blue-600">🏛️ {projet.source}</span>}
                          {projet.dateDebut && <span className="text-xs text-gray-400">📅 {new Date(projet.dateDebut).toLocaleDateString('fr-FR')}</span>}
                        </div>
                      </div>
                      {canPublish && (
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <select
                            value={projet.statut}
                            onChange={e => changerStatutProjet(projet.id, e.target.value)}
                            className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none"
                          >
                            {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <button onClick={() => supprimerProjet(projet.id)} className="text-red-400 hover:text-red-600 text-[10px] text-center">Supprimer</button>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between">
                      <span className="text-[10px] text-gray-400">Par {projet.authorName}</span>
                      <span className="text-[10px] text-gray-400">{new Date(projet.createdAt || projet.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB SIGNALER ─────────────────────────────────────────────────── */}
      {activeTab === 'signaler' && (
        <div className="space-y-4">

          {/* Formulaire citoyen */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 text-sm mb-1">📍 Signaler un problème de développement</h3>
            <p className="text-gray-400 text-xs mb-4">Signalez une infrastructure endommagée, un projet abandonné ou un service manquant. Votre signalement sera traité par les journalistes et les autorités.</p>

            {sigEnvoye ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-green-700 font-semibold text-sm">Signalement envoyé !</p>
                <p className="text-green-600 text-xs mt-1">Merci. Votre signalement a été transmis aux journalistes et aux autorités locales.</p>
                <button onClick={() => setSigEnvoye(false)} className="mt-3 text-xs text-green-600 underline">Faire un autre signalement</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type de problème</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPE_SIGNALEMENT.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSigForm({ ...sigForm, type: t.id })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                          sigForm.type === t.id ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg">{t.emoji}</span>
                        <span className="text-xs font-semibold text-gray-700 leading-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lieu précis (optionnel)</label>
                  <input
                    type="text"
                    value={sigForm.lieu}
                    onChange={e => setSigForm({ ...sigForm, lieu: e.target.value })}
                    placeholder="Ex: Route nationale entre Kindia et Coyah..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description du problème *</label>
                  <textarea
                    value={sigForm.description}
                    onChange={e => setSigForm({ ...sigForm, description: e.target.value })}
                    rows={3}
                    placeholder="Décrivez précisément le problème que vous constatez..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  />
                </div>
                <button
                  onClick={envoyerSignalement}
                  disabled={sigLoading || !sigForm.description.trim()}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  {sigLoading ? 'Envoi...' : '📍 Envoyer le signalement'}
                </button>
              </div>
            )}
          </div>

          {/* Signalements validés (visibles par tous) */}
          {signalements.filter(s => s.statut === 'publie').length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-600 mb-2">📢 Signalements confirmés</h4>
              <div className="space-y-2">
                {signalements.filter(s => s.statut === 'publie').map(s => {
                  const t = TYPE_SIGNALEMENT.find(x => x.id === s.type);
                  return (
                    <div key={s.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">{t?.emoji || '📌'}</span>
                        <div>
                          <p className="text-xs font-semibold text-orange-800">{t?.label}</p>
                          {s.lieu && <p className="text-xs text-orange-600">📍 {s.lieu}</p>}
                          <p className="text-xs text-gray-600 mt-1">{s.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File d'attente journaliste/admin */}
          {canPublish && signalements.filter(s => s.statut === 'recu').length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-600 mb-2">⏳ En attente de vérification ({signalements.filter(s => s.statut === 'recu').length})</h4>
              <div className="space-y-2">
                {signalements.filter(s => s.statut === 'recu').map(s => {
                  const t = TYPE_SIGNALEMENT.find(x => x.id === s.type);
                  return (
                    <div key={s.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-base flex-shrink-0">{t?.emoji || '📌'}</span>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{t?.label}</p>
                            {s.lieu && <p className="text-xs text-gray-500">📍 {s.lieu}</p>}
                            <p className="text-xs text-gray-600 mt-0.5">{s.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => validerSignalement(s.id, 'publie')}
                            className="px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded-lg hover:bg-green-600"
                          >
                            ✓ Publier
                          </button>
                          <button
                            onClick={() => validerSignalement(s.id, 'verifie')}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-[10px] font-semibold rounded-lg hover:bg-gray-300"
                          >
                            Archiver
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL : Publier actualité ────────────────────────────────────── */}
      {showActuForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-5">
              <h2 className="text-lg font-bold text-white">📰 Publier une actualité</h2>
              <p className="text-blue-100 text-xs mt-1">{locationName}</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={actuForm.titre}
                  onChange={e => setActuForm({ ...actuForm, titre: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Titre de l'actualité..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contenu *</label>
                <textarea
                  value={actuForm.content}
                  onChange={e => setActuForm({ ...actuForm, content: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="Décrivez l'activité de développement..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Domaine</label>
                <select
                  value={actuForm.domaine}
                  onChange={e => setActuForm({ ...actuForm, domaine: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">— Choisir un domaine —</option>
                  {DOMAINES_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Image (URL optionnel)</label>
                <input
                  type="url"
                  value={actuForm.mediaUrl}
                  onChange={e => setActuForm({ ...actuForm, mediaUrl: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowActuForm(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors">Annuler</button>
              <button
                onClick={publierActualite}
                disabled={actuLoading || !actuForm.titre.trim() || !actuForm.content.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {actuLoading ? 'Publication...' : '📰 Publier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Ajouter projet ───────────────────────────────────────── */}
      {showProjetForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-amber-600 to-amber-400 p-5 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">🏗️ Ajouter un projet</h2>
              <p className="text-amber-100 text-xs mt-1">{locationName}</p>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Titre du projet *</label>
                <input
                  type="text"
                  value={projetForm.titre}
                  onChange={e => setProjetForm({ ...projetForm, titre: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Ex: Construction du pont de Kindia..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={projetForm.description}
                  onChange={e => setProjetForm({ ...projetForm, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  placeholder="Décrivez le projet..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Domaine</label>
                  <select
                    value={projetForm.domaine}
                    onChange={e => setProjetForm({ ...projetForm, domaine: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    <option value="">— Domaine —</option>
                    {DOMAINES_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Statut</label>
                  <select
                    value={projetForm.statut}
                    onChange={e => setProjetForm({ ...projetForm, statut: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Budget (optionnel)</label>
                <input
                  type="text"
                  value={projetForm.budget}
                  onChange={e => setProjetForm({ ...projetForm, budget: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Ex: 5 milliards GNF, 2M USD..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Source / Bailleur (optionnel)</label>
                <input
                  type="text"
                  value={projetForm.source}
                  onChange={e => setProjetForm({ ...projetForm, source: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Ex: Banque Mondiale, Gouvernement, USAID..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date début</label>
                  <input type="date" value={projetForm.dateDebut} onChange={e => setProjetForm({ ...projetForm, dateDebut: e.target.value })} className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date fin prévue</label>
                  <input type="date" value={projetForm.dateFin} onChange={e => setProjetForm({ ...projetForm, dateFin: e.target.value })} className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3 flex-shrink-0 border-t pt-4">
              <button onClick={() => setShowProjetForm(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors">Annuler</button>
              <button
                onClick={ajouterProjet}
                disabled={projetLoading || !projetForm.titre.trim()}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {projetLoading ? 'Ajout...' : '🏗️ Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
