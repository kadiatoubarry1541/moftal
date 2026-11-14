import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser, isAdmin } from "../utils/auth";
import PaymentModal from "../components/PaymentModal";


interface MonDon {
  amount?: number | string;
  createdAt?: string | null;
  currency?: string | null;
  description?: string | null;
  id?: number | string;
  recipient?: string | null;
  recipientName?: string | null;
  // Domaine choisi et état du paiement (le don n'est « Payé » qu'une fois encaissé)
  domaine?: string | null;
  statut?: string | null;
  status?: string | null;
  domaineLabel?: string | null;
  message?: string | null;
}
interface Proposition {
  id: string;
  domaine: string;
  titre: string;
  description: string;
  lieu: string | null;
  statut: "en_attente" | "approuve" | "refuse" | "termine";
  motifRefus: string | null;
  auteurNom: string | null;
  creeLe: string;
}
const STATUT_PROPOSITION: Record<Proposition["statut"], { label: string; classe: string }> = {
  en_attente: { label: "⏳ En attente d'examen", classe: "bg-amber-100 text-amber-800" },
  approuve:   { label: "🔨 En cours",            classe: "bg-green-100 text-green-800" },
  termine:    { label: "✅ Terminé",              classe: "bg-blue-100 text-blue-800" },
  refuse:     { label: "✖ Non retenu",           classe: "bg-red-100 text-red-700" },
};
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');

const DOMAINES = [
  { id: "agriculture",    label: "Agriculture",           emoji: "🌾", color: "#156315", bg: "#f0fdf0", desc: "Production locale, irrigation, coopératives agricoles" },
  { id: "habitat",        label: "Habitat & Logement",    emoji: "🏗️", color: "#0891b2", bg: "#ecfeff", desc: "Construction, matériaux locaux, planification urbaine" },
  { id: "energie",        label: "Énergie",               emoji: "⚡", color: "#d97706", bg: "#fffbeb", desc: "Solaire, eau, électrification des zones rurales" },
  { id: "education",      label: "Éducation",             emoji: "📚", color: "#7c3aed", bg: "#f5f3ff", desc: "Scolarisation, alphabétisation, formation professionnelle" },
  { id: "sante",          label: "Santé",                 emoji: "🏥", color: "#1a8f1a", bg: "#f0fdfa", desc: "Centres de santé, médicaments, nutrition" },
  { id: "numerique",      label: "Numérique",             emoji: "💻", color: "#6366f1", bg: "#eef2ff", desc: "Internet, smartphones, compétences digitales" },
  { id: "commerce",       label: "Commerce & PME",        emoji: "📈", color: "#1a8f1a", bg: "#f0fdf0", desc: "Marchés, microcrédit, incubateurs d'entreprises" },
  { id: "infrastructure", label: "Infrastructures",       emoji: "🛣️", color: "#64748b", bg: "#f8fafc", desc: "Routes, ponts, eau potable, assainissement" },
  { id: "environnement",  label: "Environnement",         emoji: "🌿", color: "#1a8f1a", bg: "#f0fdf0", desc: "Reboisement, gestion des déchets, changement climatique" },
  { id: "femmes",         label: "Autonomisation femmes", emoji: "👩", color: "#db2777", bg: "#fdf2f8", desc: "Entrepreneuriat féminin, droits, leadership" },
  { id: "jeunesse",       label: "Jeunesse & Emploi",     emoji: "🎯", color: "#ea580c", bg: "#fff7ed", desc: "Stages, formation, insertion professionnelle" },
  { id: "gouvernance",    label: "Gouvernance",           emoji: "🏛️", color: "#1d4ed8", bg: "#eff6ff", desc: "Démocratie locale, transparence, participation citoyenne" },
];

const PHASES = [
  { num: 1, label: "Idée",          emoji: "💡", desc: "Soumission et évaluation des propositions" },
  { num: 2, label: "Planification", emoji: "📋", desc: "Étude de faisabilité et financement" },
  { num: 3, label: "Exécution",     emoji: "🔨", desc: "Travaux, formation, déploiement" },
  { num: 4, label: "Suivi",         emoji: "📊", desc: "Mesure d'impact et rapports" },
];

export default function Developpement() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);

  const [activeDomaine, setActiveDomaine] = useState<string | null>(null);
  const [showSoumettre, setShowSoumettre] = useState(false);

  // Propositions de projets (enregistrées en base, publiées après examen de l'admin)
  const [projets, setProjets] = useState<Proposition[]>([]);
  const [mesPropositions, setMesPropositions] = useState<Proposition[]>([]);
  const [statsProjets, setStatsProjets] = useState({ enCours: 0, termines: 0, idees: 0 });
  const [aExaminer, setAExaminer] = useState<Proposition[]>([]);
  const [propForm, setPropForm] = useState({ domaine: "", titre: "", description: "", lieu: "" });
  const [propEnvoi, setPropEnvoi] = useState(false);
  const [propErreur, setPropErreur] = useState("");
  const [propMerci, setPropMerci] = useState("");

  // États pour les dons
  const [totalCollecte, setTotalCollecte] = useState(0);
  const [parDomaine, setParDomaine] = useState<Record<string, number>>({});
  const [nbDonneurs, setNbDonneurs] = useState(0);
  const [showDon, setShowDon] = useState(false);
  // Don préparé, en attente de paiement (il ne compte qu'une fois payé)
  const [donAPayer, setDonAPayer] = useState<{ id: string; montant: number } | null>(null);
  const [showMesDons, setShowMesDons] = useState(false);
  const [mesDons, setMesDons] = useState<MonDon[]>([]);
  const [donLoading, setDonLoading] = useState(false);
  const [donForm, setDonForm] = useState({
    amount: "",
    currency: "FG",
    domaine: "general",
    domaineLabel: "Fonds Général de Développement",
    message: ""
  });

  useEffect(() => {
    if (user) { loadStats(); loadPropositions(); if (userIsAdmin) loadAExaminer(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, []);

  const loadPropositions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/developpement/propositions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProjets(data.projets || []);
        setMesPropositions(data.mesPropositions || []);
        if (data.stats) setStatsProjets(data.stats);
      }
    } catch { /* la page reste utilisable ; les projets se rechargent à la prochaine visite */ }
  };

  const loadAExaminer = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/developpement/propositions/a-examiner`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAExaminer((await res.json()).propositions || []);
    } catch { /* liste rechargée à la prochaine visite */ }
  };

  const ouvrirProposition = (domaine: string) => {
    setPropForm({ domaine, titre: "", description: "", lieu: "" });
    setPropErreur("");
    setPropMerci("");
    setShowSoumettre(true);
  };

  const envoyerProposition = async () => {
    setPropErreur("");
    if (!propForm.domaine) { setPropErreur("Choisissez un domaine."); return; }
    if (propForm.titre.trim().length < 5) { setPropErreur("Le titre doit faire au moins 5 caractères."); return; }
    if (propForm.description.trim().length < 20) { setPropErreur("Décrivez votre projet en 20 caractères au moins."); return; }
    setPropEnvoi(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/developpement/propositions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(propForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setPropErreur(data.message || "Votre projet n'a pas pu être envoyé. Réessayez."); return; }
      setPropMerci(data.message || "Merci ! Votre projet sera examiné par l'administrateur.");
      loadPropositions();
      if (userIsAdmin) loadAExaminer();
    } catch {
      setPropErreur("Connexion impossible : votre projet n'a pas été envoyé. Réessayez.");
    } finally {
      setPropEnvoi(false);
    }
  };

  const decider = async (p: Proposition, decision: "approuve" | "refuse" | "termine") => {
    let motif = "";
    if (decision === "refuse") {
      motif = window.prompt(`Motif du refus de « ${p.titre} » (l'auteur le verra) :`)?.trim() || "";
      if (!motif) return;
    } else if (!window.confirm(decision === "approuve" ? `Approuver « ${p.titre} » ? Il sera publié.` : `Marquer « ${p.titre} » comme terminé ?`)) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/developpement/propositions/${p.id}/decision`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ decision, motif }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { alert(data.message || "La décision n'a pas pu être enregistrée."); return; }
      loadAExaminer();
      loadPropositions();
    } catch {
      alert("Connexion impossible : la décision n'a pas été enregistrée.");
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/developpement/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/developpement/mes-dons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/developpement/donate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(donForm)
      });
      const data = await res.json().catch((): null => null);
      if (res.ok && data?.donId) {
        setShowDon(false);
        // Le don n'est compté qu'après le paiement
        setDonAPayer({ id: data.donId, montant: data.montant });
      } else {
        alert(data?.message || "Erreur lors du don. Veuillez réessayer.");
      }
    } catch {
      alert("Erreur lors du don. Veuillez réessayer.");
    } finally {
      setDonLoading(false);
    }
  };

  const formatMontant = (n: number) =>
    new Intl.NumberFormat("fr-GN").format(Math.round(n)) + " FG";

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">📈</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Développement</h2>
          <p className="text-slate-500 mb-6">Connectez-vous pour accéder aux projets de développement</p>
          <button onClick={() => navigate("/login")} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors">
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">

      {/* Hero */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white px-4 py-10 text-center">
        <div className="text-5xl mb-3">📈</div>
        <h1 className="text-3xl font-extrabold mb-2">Développement</h1>
        <p className="text-green-100 text-base max-w-lg mx-auto">
          Projets de développement communautaire — agriculture, habitat, énergie, éducation, emploi et bien plus
        </p>
        {userIsAdmin && (
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold">
            <span>👑</span> Mode Admin — Gestion complète des projets
          </div>
        )}
        {/* Bouton cotisation */}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setShowDon(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-green-700 font-bold rounded-xl hover:bg-green-50 transition-colors shadow"
          >
            🤝 Cotiser pour le quartier
          </button>
          <button
            onClick={() => { setShowMesDons(true); loadMesDons(); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors"
          >
            📋 Mes cotisations
          </button>
        </div>
      </div>

      {/* Bannière fonds collectés */}
      <div className="bg-white border-b border-green-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">🤝</div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Caisse de développement du quartier</div>
              <div className="text-xl font-extrabold text-green-700">{formatMontant(totalCollecte)}</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div>
              <div className="text-lg font-bold text-slate-800">{nbDonneurs}</div>
              <div className="text-xs text-slate-500">Cotisants</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{Object.keys(parDomaine).length}</div>
              <div className="text-xs text-slate-500">Domaines soutenus</div>
            </div>
          </div>
          <button
            onClick={() => setShowDon(true)}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            + Cotiser
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Phases du développement */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Cycle des projets</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PHASES.map((phase) => (
              <div key={phase.num} className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl mb-1">{phase.emoji}</div>
                <div className="font-bold text-slate-800 text-sm">Phase {phase.num}</div>
                <div className="font-semibold text-green-700 text-xs mt-0.5">{phase.label}</div>
                <div className="text-slate-400 text-xs mt-1">{phase.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Domaines */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Domaines de développement</h2>
              <p className="text-slate-500 text-sm mt-1">Sélectionnez un domaine pour voir les projets en cours</p>
            </div>
            <button
              onClick={() => ouvrirProposition(activeDomaine || "")}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors text-sm"
            >
              ✚ Proposer
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {DOMAINES.map((dom) => (
              <button
                key={dom.id}
                onClick={() => setActiveDomaine(activeDomaine === dom.id ? null : dom.id)}
                className="flex flex-col items-start gap-2 p-3.5 bg-white rounded-2xl border-2 transition-all duration-200 hover:shadow-md text-left"
                style={{ borderColor: activeDomaine === dom.id ? dom.color : "#e2e8f0", background: activeDomaine === dom.id ? dom.bg : "white" }}
              >
                <div className="text-2xl">{dom.emoji}</div>
                <div className="font-bold text-slate-800 text-xs leading-tight">{dom.label}</div>
                {parDomaine[dom.id] > 0 && (
                  <div className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: dom.bg, color: dom.color }}>
                    {formatMontant(parDomaine[dom.id])}
                  </div>
                )}
              </button>
            ))}
          </div>

          {activeDomaine && (() => {
            const dom = DOMAINES.find(d => d.id === activeDomaine)!;
            const montantDom = parDomaine[dom.id] || 0;
            return (
              <div className="mt-4 bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: dom.color + "44" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{dom.emoji}</div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{dom.label}</h3>
                      <p className="text-slate-500 text-sm">{dom.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDonForm({ amount: "", currency: "FG", domaine: dom.id, domaineLabel: dom.label, message: "" });
                      setShowDon(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
                    style={{ background: dom.color }}
                  >
                    💰 Financer
                  </button>
                </div>
                {montantDom > 0 && (
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: dom.color }}>
                    <span>💚</span>
                    <span>{formatMontant(montantDom)} collectés pour ce domaine</span>
                  </div>
                )}
                {(() => {
                  const duDomaine = projets.filter(p => p.domaine === dom.id);
                  const miennes = mesPropositions.filter(p => p.domaine === dom.id && (p.statut === "en_attente" || p.statut === "refuse"));
                  return (
                    <div className="space-y-3">
                      {duDomaine.length === 0 ? (
                        <div className="bg-slate-50 rounded-xl p-5 text-center">
                          <div className="text-4xl mb-3">🚀</div>
                          <p className="text-slate-600 font-medium">Aucun projet approuvé pour l'instant</p>
                          <p className="text-slate-400 text-sm mt-1">
                            Les projets soumis et approuvés par l'administrateur apparaîtront ici
                          </p>
                        </div>
                      ) : duDomaine.map(p => (
                        <div key={p.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-slate-800">{p.titre}</p>
                            <span className={`flex-shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5 ${STATUT_PROPOSITION[p.statut].classe}`}>{STATUT_PROPOSITION[p.statut].label}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{[p.lieu, p.auteurNom && `proposé par ${p.auteurNom}`].filter(Boolean).join(" · ")}</p>
                          <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{p.description}</p>
                          {userIsAdmin && p.statut === "approuve" && (
                            <button onClick={() => decider(p, "termine")} className="mt-2 text-xs font-semibold text-blue-700 hover:underline">✅ Marquer terminé</button>
                          )}
                        </div>
                      ))}
                      {miennes.length > 0 && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                          <p className="text-xs font-bold text-amber-800 mb-2">Mes propositions dans ce domaine</p>
                          {miennes.map(p => (
                            <div key={p.id} className="text-sm text-slate-700 py-1">
                              <span className="font-semibold">{p.titre}</span>{" "}
                              <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${STATUT_PROPOSITION[p.statut].classe}`}>{STATUT_PROPOSITION[p.statut].label}</span>
                              {p.statut === "refuse" && p.motifRefus && <p className="text-xs text-red-700 mt-0.5">Motif : {p.motifRefus}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-center">
                        <button
                          onClick={() => ouvrirProposition(dom.id)}
                          className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors text-white"
                          style={{ background: dom.color }}
                        >
                          ✚ Proposer un projet dans ce domaine
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>

        {/* Administrateur : propositions à examiner */}
        {userIsAdmin && aExaminer.length > 0 && (
          <div className="mb-8 bg-white rounded-2xl border border-amber-300 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-3">📝 Propositions à examiner ({aExaminer.length})</h2>
            <div className="space-y-3">
              {aExaminer.map(p => {
                const dom = DOMAINES.find(d => d.id === p.domaine);
                return (
                  <div key={p.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-bold text-slate-800">{dom?.emoji} {p.titre}</p>
                    <p className="text-xs text-slate-400">{[dom?.label, p.lieu, p.auteurNom].filter(Boolean).join(" · ")}</p>
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{p.description}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => decider(p, "approuve")} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold">✓ Approuver</button>
                      <button onClick={() => decider(p, "refuse")} className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold">✖ Refuser</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats globales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl mb-1">📋</div>
            <div className="font-bold text-slate-800 text-xl">{statsProjets.enCours}</div>
            <div className="text-slate-500 text-xs">Projets en cours</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="font-bold text-slate-800 text-xl">{statsProjets.termines}</div>
            <div className="text-slate-500 text-xs">Projets terminés</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl mb-1">💡</div>
            <div className="font-bold text-slate-800 text-xl">{statsProjets.idees}</div>
            <div className="text-slate-500 text-xs">Idées soumises</div>
          </div>
          <div
            className="bg-green-50 rounded-xl p-4 border border-green-200 text-center cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => setShowDon(true)}
          >
            <div className="text-2xl mb-1">🤝</div>
            <div className="font-bold text-green-700 text-lg">{formatMontant(totalCollecte)}</div>
            <div className="text-green-600 text-xs font-semibold">Caisse quartier</div>
          </div>
        </div>

        {/* Liens connexes */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-800 mb-3">En lien avec le développement</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => navigate("/solidarite")} className="flex flex-col items-center gap-1.5 p-3 bg-white border rounded-xl hover:shadow-sm text-center">
              <span className="text-xl">🤝</span><span className="text-xs font-semibold text-slate-700">Solidarité</span>
            </button>
            <button onClick={() => navigate("/echange")} className="flex flex-col items-center gap-1.5 p-3 bg-white border rounded-xl hover:shadow-sm text-center">
              <span className="text-xl">🔄</span><span className="text-xs font-semibold text-slate-700">Échanges</span>
            </button>
            <button onClick={() => navigate("/education")} className="flex flex-col items-center gap-1.5 p-3 bg-white border rounded-xl hover:shadow-sm text-center">
              <span className="text-xl">📚</span><span className="text-xs font-semibold text-slate-700">Éducation</span>
            </button>
            <button onClick={() => navigate("/activite")} className="flex flex-col items-center gap-1.5 p-3 bg-white border rounded-xl hover:shadow-sm text-center">
              <span className="text-xl">💼</span><span className="text-xs font-semibold text-slate-700">Activité</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modal : Cotisation communautaire ────────────────────────────────── */}
      {showDon && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-5">
              <h2 className="text-xl font-bold text-white">🤝 Cotisation pour le développement</h2>
              <p className="text-green-100 text-sm mt-1">Chaque habitant contribue librement selon ses moyens</p>
            </div>
            <div className="p-6 space-y-4">

              {/* Domaine cible */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Domaine à soutenir</label>
                <select
                  value={donForm.domaine}
                  onChange={(e) => {
                    const dom = DOMAINES.find(d => d.id === e.target.value);
                    setDonForm({ ...donForm, domaine: e.target.value, domaineLabel: dom ? dom.label : "Fonds Général de Développement" });
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="general">🌍 Caisse Générale du Quartier</option>
                  {DOMAINES.map(dom => (
                    <option key={dom.id} value={dom.id}>{dom.emoji} {dom.label}</option>
                  ))}
                </select>
              </div>

              {/* Montant */}
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
                    className="w-24 border border-slate-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="FG">FG</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                {/* Montants suggérés */}
                <div className="flex gap-2 mt-2">
                  {["5000", "10000", "50000", "100000"].map(m => (
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

              {/* Message optionnel */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message pour le quartier (optionnel)</label>
                <textarea
                  value={donForm.message}
                  onChange={(e) => setDonForm({ ...donForm, message: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Un mot d'encouragement pour vos voisins..."
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                Votre cotisation est gérée par le <strong>gestionnaire économique du quartier</strong>, désigné par le chef de quartier. Elle finance les projets validés par la communauté.
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
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
                {donLoading ? "En cours..." : "🤝 Confirmer ma cotisation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal : Mes cotisations ──────────────────────────────────────────── */}
      {showMesDons && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
            <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-5">
              <h2 className="text-xl font-bold text-white">📋 Mes cotisations</h2>
              <p className="text-green-100 text-sm mt-1">Votre participation au développement du quartier</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {mesDons.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">💚</div>
                  <p className="text-slate-600 font-medium">Aucune cotisation encore</p>
                  <p className="text-slate-400 text-sm mt-1">Soyez le premier à soutenir le développement du quartier !</p>
                  <button
                    onClick={() => { setShowMesDons(false); setShowDon(true); }}
                    className="mt-4 px-5 py-2 bg-green-600 text-white font-semibold rounded-xl text-sm hover:bg-green-700 transition-colors"
                  >
                    🤝 Cotiser maintenant
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mesDons.map((don) => {
                    const dom = DOMAINES.find(d => d.id === (don.domaine || don.recipient));
                    return (
                      <div key={don.id} className="border rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{dom ? dom.emoji : "🌍"}</span>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{don.domaineLabel || don.recipientName}</div>
                              <div className="text-xs text-slate-500">{new Date(don.createdAt).toLocaleDateString("fr-FR")}</div>
                            </div>
                          </div>
                          <div className="text-right">
                          <div className="font-bold text-green-700">{parseFloat(String(don.amount)).toLocaleString()} {don.currency}</div>
                          {(don.statut === "paye" || don.status === "completed")
                            ? <div className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Payé</div>
                            : <div className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Non payé</div>}
                          </div>
                        </div>
                        {(don.message || don.description) && (
                          <p className="text-xs text-slate-500 mt-2 italic">"{don.message || don.description}"</p>
                        )}
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

      {donAPayer && (
        <PaymentModal
          isOpen={!!donAPayer}
          onClose={() => setDonAPayer(null)}
          onSuccess={() => {
            setDonAPayer(null);
            setDonForm({ amount: "", currency: "FG", domaine: "general", domaineLabel: "Fonds Général de Développement", message: "" });
            loadStats();
            loadMesDons();
            alert("Paiement confirmé ! Merci pour votre soutien au développement du quartier.");
          }}
          amount={donAPayer.montant}
          currency="GNF"
          purpose="don_developpement"
          relatedId={donAPayer.id}
          description="Cotisation pour le développement"
        />
      )}

      {/* ─── Modal : Soumettre un projet ──────────────────────────────────────── */}
      {showSoumettre && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-green-600 p-5">
              <h2 className="text-xl font-bold text-white">✚ Proposer un projet</h2>
              <p className="text-green-100 text-sm mt-1">Votre idée sera examinée par l'administrateur</p>
            </div>
            {propMerci ? (
              <div className="p-6 text-center space-y-4">
                <div className="text-4xl">🙏</div>
                <p className="text-green-800 font-semibold">{propMerci}</p>
                <p className="text-slate-500 text-sm">Vous recevrez une notification quand il sera examiné.</p>
                <button onClick={() => setShowSoumettre(false)} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm">Fermer</button>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Domaine</label>
                  <select value={propForm.domaine} onChange={e => setPropForm({ ...propForm, domaine: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="">— Choisir —</option>
                    {DOMAINES.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Titre du projet</label>
                  <input value={propForm.titre} maxLength={150} onChange={e => setPropForm({ ...propForm, titre: e.target.value })} placeholder="Ex. : Un forage pour le quartier" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lieu (facultatif)</label>
                  <input value={propForm.lieu} maxLength={150} onChange={e => setPropForm({ ...propForm, lieu: e.target.value })} placeholder="Quartier, ville…" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea value={propForm.description} maxLength={5000} rows={5} onChange={e => setPropForm({ ...propForm, description: e.target.value })} placeholder="Le besoin, ce que vous proposez, qui en profitera…" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                {propErreur && <p className="text-sm text-red-600">{propErreur}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setShowSoumettre(false)} disabled={propEnvoi} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm">Annuler</button>
                  <button onClick={envoyerProposition} disabled={propEnvoi} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
                    {propEnvoi ? "Envoi…" : "Envoyer le projet"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
