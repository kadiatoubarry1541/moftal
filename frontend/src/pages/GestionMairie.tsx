import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/mairie-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Section = "dashboard" | "mariages" | "naissances" | "deces" | "residences" | "chefs_quartier" | "agents" | "settings";
type Statut = "en_attente" | "en_traitement" | "valide_chef" | "valide" | "rejete";

const ROLES_AGENT = ["Directeur", "Chef de service", "Agent d'état civil", "Secrétaire", "Archiviste", "Comptable", "Autre"];
const STATUT_LABELS: Record<string, string> = { en_attente: "En attente", en_traitement: "En traitement", valide_chef: "Validé chef quartier", valide: "Validé", rejete: "Rejeté" };
const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
  en_attente:    { bg: "#fef9c3", color: "#a16207" },
  en_traitement: { bg: "#dbeafe", color: "#1d4ed8" },
  valide_chef:   { bg: "#fef3c7", color: "#92400e" },
  valide:        { bg: "#dcfce7", color: "#166534" },
  rejete:        { bg: "#fee2e2", color: "#991b1b" },
};

const BLUE = "#1d4ed8";
const BLUE_LIGHT = "#3b82f6";
const BLUE_DARK = "#1e3a8a";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const inpStyle = { borderColor: "#e2e8f0", color: "#0f172a" };
const labelStyle = { fontSize: 11, fontWeight: 600 as const, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.04em" };

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard",      label: "Tableau de bord",    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "mariages",       label: "Mariages",           icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { id: "naissances",     label: "Naissances",         icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: "deces",          label: "Décès",              icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "residences",     label: "Résidences",         icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "chefs_quartier", label: "Chefs de quartier",  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "agents",         label: "Agents",             icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "settings",       label: "Paramètres",         icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const c = STATUT_COLORS[statut] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {STATUT_LABELS[statut] || statut}
    </span>
  );
}

export default function GestionMairie() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [recentMariages, setRecentMariages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Mariages
  const [mariages, setMariages] = useState<any[]>([]);
  const [mariageSearch, setMariageSearch] = useState("");
  const [mariageStatut, setMariageStatut] = useState("");
  const [showMariageForm, setShowMariageForm] = useState(false);
  const [editingMariage, setEditingMariage] = useState<any>(null);
  const [mariageForm, setMariageForm] = useState<any>({});

  // Naissances
  const [naissances, setNaissances] = useState<any[]>([]);
  const [naissanceSearch, setNaissanceSearch] = useState("");
  const [naissanceStatut, setNaissanceStatut] = useState("");
  const [showNaissanceForm, setShowNaissanceForm] = useState(false);
  const [editingNaissance, setEditingNaissance] = useState<any>(null);
  const [naissanceForm, setNaissanceForm] = useState<any>({});

  // Décès
  const [deces, setDeces] = useState<any[]>([]);
  const [decesSearch, setDecesSearch] = useState("");
  const [decesStatut, setDecesStatut] = useState("");
  const [showDecesForm, setShowDecesForm] = useState(false);
  const [editingDeces, setEditingDeces] = useState<any>(null);
  const [decesForm, setDecesForm] = useState<any>({});

  // Résidences
  const [residences, setResidences] = useState<any[]>([]);
  const [residenceSearch, setResidenceSearch] = useState("");
  const [residenceStatut, setResidenceStatut] = useState("");
  const [showResidenceForm, setShowResidenceForm] = useState(false);
  const [editingResidence, setEditingResidence] = useState<any>(null);
  const [residenceForm, setResidenceForm] = useState<any>({});

  // Chefs de quartier
  const [chefsQuartier, setChefsQuartier] = useState<any[]>([]);
  const [showChefForm, setShowChefForm] = useState(false);
  const [editingChef, setEditingChef] = useState<any>(null);
  const [chefForm, setChefForm] = useState<any>({});
  const [showChefValidationModal, setShowChefValidationModal] = useState(false);
  const [validatingResidence, setValidatingResidence] = useState<any>(null);
  const [chefValidationForm, setChefValidationForm] = useState<any>({});

  // Agents
  const [agents, setAgents] = useState<any[]>([]);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [agentForm, setAgentForm] = useState<any>({});

  // Settings
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTenant = useCallback(async () => {
    const r = await fetch(`${BASE(tenantCode!)}/info`, { headers: auth() });
    const d = await r.json();
    if (d.success) { setTenant(d.tenant); setSettingsForm({ name: d.tenant.name, address: d.tenant.address || "", phone: d.tenant.phone || "", email: d.tenant.email || "", description: d.tenant.description || "" }); }
  }, [tenantCode]);

  const fetchDashboard = useCallback(async () => {
    const r = await fetch(`${BASE(tenantCode!)}/dashboard`, { headers: auth() });
    const d = await r.json();
    if (d.success) { setStats(d.stats); setRecentMariages(d.recentMariages || []); }
    setLoading(false);
  }, [tenantCode]);

  const fetchMariages = useCallback(async () => {
    const params = new URLSearchParams();
    if (mariageSearch) params.set("search", mariageSearch);
    if (mariageStatut) params.set("statut", mariageStatut);
    const r = await fetch(`${BASE(tenantCode!)}/mariages?${params}`, { headers: auth() });
    const d = await r.json();
    if (d.success) setMariages(d.mariages);
  }, [tenantCode, mariageSearch, mariageStatut]);

  const fetchNaissances = useCallback(async () => {
    const params = new URLSearchParams();
    if (naissanceSearch) params.set("search", naissanceSearch);
    if (naissanceStatut) params.set("statut", naissanceStatut);
    const r = await fetch(`${BASE(tenantCode!)}/naissances?${params}`, { headers: auth() });
    const d = await r.json();
    if (d.success) setNaissances(d.naissances);
  }, [tenantCode, naissanceSearch, naissanceStatut]);

  const fetchDeces = useCallback(async () => {
    const params = new URLSearchParams();
    if (decesSearch) params.set("search", decesSearch);
    if (decesStatut) params.set("statut", decesStatut);
    const r = await fetch(`${BASE(tenantCode!)}/deces?${params}`, { headers: auth() });
    const d = await r.json();
    if (d.success) setDeces(d.deces);
  }, [tenantCode, decesSearch, decesStatut]);

  const fetchResidences = useCallback(async () => {
    const params = new URLSearchParams();
    if (residenceSearch) params.set("search", residenceSearch);
    if (residenceStatut) params.set("statut", residenceStatut);
    const r = await fetch(`${BASE(tenantCode!)}/residences?${params}`, { headers: auth() });
    const d = await r.json();
    if (d.success) setResidences(d.residences);
  }, [tenantCode, residenceSearch, residenceStatut]);

  const fetchChefsQuartier = useCallback(async () => {
    const r = await fetch(`${BASE(tenantCode!)}/chefs-quartier`, { headers: auth() });
    const d = await r.json();
    if (d.success) setChefsQuartier(d.chefs);
  }, [tenantCode]);

  const fetchAgents = useCallback(async () => {
    const r = await fetch(`${BASE(tenantCode!)}/agents`, { headers: auth() });
    const d = await r.json();
    if (d.success) setAgents(d.agents);
  }, [tenantCode]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchTenant();
    fetchDashboard();
  }, [fetchTenant, fetchDashboard]);

  useEffect(() => { if (section === "mariages") fetchMariages(); }, [section, fetchMariages]);
  useEffect(() => { if (section === "naissances") fetchNaissances(); }, [section, fetchNaissances]);
  useEffect(() => { if (section === "deces") fetchDeces(); }, [section, fetchDeces]);
  useEffect(() => { if (section === "residences") fetchResidences(); }, [section, fetchResidences]);
  useEffect(() => { if (section === "chefs_quartier") fetchChefsQuartier(); }, [section, fetchChefsQuartier]);
  useEffect(() => { if (section === "residences") fetchChefsQuartier(); }, [section]);
  useEffect(() => { if (section === "agents") fetchAgents(); }, [section, fetchAgents]);
  useEffect(() => { if (section === "mariages") fetchMariages(); }, [mariageSearch, mariageStatut]);
  useEffect(() => { if (section === "naissances") fetchNaissances(); }, [naissanceSearch, naissanceStatut]);
  useEffect(() => { if (section === "deces") fetchDeces(); }, [decesSearch, decesStatut]);
  useEffect(() => { if (section === "residences") fetchResidences(); }, [residenceSearch, residenceStatut]);

  // ── MARIAGE HANDLERS ──────────────────────────────────────────────────────
  const openMariageForm = (m?: any) => {
    setEditingMariage(m || null);
    setMariageForm(m ? { ...m } : { epoux_nom: "", epoux_prenom: "", epouse_nom: "", epouse_prenom: "", date_mariage: "", lieu_mariage: "", temoin1_nom: "", temoin2_nom: "", notes: "" });
    setShowMariageForm(true);
  };

  const saveMariage = async () => {
    const url = editingMariage ? `${BASE(tenantCode!)}/mariages/${editingMariage.id}` : `${BASE(tenantCode!)}/mariages`;
    const method = editingMariage ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: auth(), body: JSON.stringify(mariageForm) });
    const d = await r.json();
    if (d.success) { showToast(editingMariage ? "Dossier mis à jour" : "Dossier créé"); setShowMariageForm(false); fetchMariages(); fetchDashboard(); }
    else showToast(d.message || "Erreur", false);
  };

  const changeStatutMariage = async (id: number, statut: string) => {
    await fetch(`${BASE(tenantCode!)}/mariages/${id}/statut`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
    fetchMariages(); fetchDashboard();
  };

  const deleteMariage = async (id: number) => {
    if (!confirm("Supprimer ce dossier ?")) return;
    await fetch(`${BASE(tenantCode!)}/mariages/${id}`, { method: "DELETE", headers: auth() });
    fetchMariages(); fetchDashboard();
  };

  // ── NAISSANCE HANDLERS ────────────────────────────────────────────────────
  const openNaissanceForm = (n?: any) => {
    setEditingNaissance(n || null);
    setNaissanceForm(n ? { ...n } : { enfant_nom: "", enfant_prenom: "", date_naissance: "", lieu_naissance: "", sexe: "M", pere_nom: "", pere_prenom: "", mere_nom: "", mere_prenom: "", declarant_nom: "", notes: "" });
    setShowNaissanceForm(true);
  };

  const saveNaissance = async () => {
    const url = editingNaissance ? `${BASE(tenantCode!)}/naissances/${editingNaissance.id}` : `${BASE(tenantCode!)}/naissances`;
    const method = editingNaissance ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: auth(), body: JSON.stringify(naissanceForm) });
    const d = await r.json();
    if (d.success) { showToast(editingNaissance ? "Déclaration mise à jour" : "Déclaration enregistrée"); setShowNaissanceForm(false); fetchNaissances(); fetchDashboard(); }
    else showToast(d.message || "Erreur", false);
  };

  const changeStatutNaissance = async (id: number, statut: string) => {
    await fetch(`${BASE(tenantCode!)}/naissances/${id}/statut`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
    fetchNaissances(); fetchDashboard();
  };

  const deleteNaissance = async (id: number) => {
    if (!confirm("Supprimer cette déclaration ?")) return;
    await fetch(`${BASE(tenantCode!)}/naissances/${id}`, { method: "DELETE", headers: auth() });
    fetchNaissances(); fetchDashboard();
  };

  // ── DÉCÈS HANDLERS ────────────────────────────────────────────────────────
  const openDecesForm = (d?: any) => {
    setEditingDeces(d || null);
    setDecesForm(d ? { ...d } : { defunt_nom: "", defunt_prenom: "", date_deces: "", lieu_deces: "", cause_deces: "", declarant_nom: "", declarant_telephone: "", notes: "" });
    setShowDecesForm(true);
  };

  const saveDeces = async () => {
    const url = editingDeces ? `${BASE(tenantCode!)}/deces/${editingDeces.id}` : `${BASE(tenantCode!)}/deces`;
    const method = editingDeces ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: auth(), body: JSON.stringify(decesForm) });
    const d = await r.json();
    if (d.success) { showToast(editingDeces ? "Déclaration mise à jour" : "Déclaration enregistrée"); setShowDecesForm(false); fetchDeces(); fetchDashboard(); }
    else showToast(d.message || "Erreur", false);
  };

  const changeStatutDeces = async (id: number, statut: string) => {
    await fetch(`${BASE(tenantCode!)}/deces/${id}/statut`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
    fetchDeces(); fetchDashboard();
  };

  const deleteDeces = async (id: number) => {
    if (!confirm("Supprimer cette déclaration ?")) return;
    await fetch(`${BASE(tenantCode!)}/deces/${id}`, { method: "DELETE", headers: auth() });
    fetchDeces(); fetchDashboard();
  };

  // ── RÉSIDENCE HANDLERS ───────────────────────────────────────────────────
  const openResidenceForm = (r?: any) => {
    setEditingResidence(r || null);
    setResidenceForm(r ? { ...r } : { nom: "", prenom: "", adresse: "", depuis_quand: "", motif: "Emploi", notes: "", chef_quartier_id: "", chef_quartier_nom: "", chef_quartier_telephone: "" });
    setShowResidenceForm(true);
  };

  const saveResidence = async () => {
    const url = editingResidence ? `${BASE(tenantCode!)}/residences/${editingResidence.id}` : `${BASE(tenantCode!)}/residences`;
    const method = editingResidence ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: auth(), body: JSON.stringify(residenceForm) });
    const d = await r.json();
    if (d.success) { showToast(editingResidence ? "Dossier mis à jour" : "Demande enregistrée"); setShowResidenceForm(false); fetchResidences(); }
    else showToast(d.message || "Erreur", false);
  };

  const changeStatutResidence = async (id: number, statut: string) => {
    await fetch(`${BASE(tenantCode!)}/residences/${id}/statut`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
    fetchResidences();
  };

  const deleteResidence = async (id: number) => {
    if (!confirm("Supprimer ce dossier ?")) return;
    await fetch(`${BASE(tenantCode!)}/residences/${id}`, { method: "DELETE", headers: auth() });
    fetchResidences();
  };

  // ── CHEF DE QUARTIER HANDLERS ─────────────────────────────────────────────
  const openChefForm = (c?: any) => {
    setEditingChef(c || null);
    setChefForm(c ? { ...c } : { nom: "", prenom: "", quartier: "", telephone: "", date_prise_fonction: "" });
    setShowChefForm(true);
  };

  const saveChef = async () => {
    const url = editingChef ? `${BASE(tenantCode!)}/chefs-quartier/${editingChef.id}` : `${BASE(tenantCode!)}/chefs-quartier`;
    const method = editingChef ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: auth(), body: JSON.stringify(chefForm) });
    const d = await r.json();
    if (d.success) { showToast(editingChef ? "Chef de quartier mis à jour" : "Chef de quartier ajouté"); setShowChefForm(false); fetchChefsQuartier(); }
    else showToast(d.message || "Erreur", false);
  };

  const deleteChef = async (id: number) => {
    if (!confirm("Supprimer ce chef de quartier ?")) return;
    await fetch(`${BASE(tenantCode!)}/chefs-quartier/${id}`, { method: "DELETE", headers: auth() });
    fetchChefsQuartier();
  };

  const openChefValidation = (residence: any) => {
    setValidatingResidence(residence);
    const chef = chefsQuartier.find(c => c.id === residence.chef_quartier_id);
    setChefValidationForm({
      chef_quartier_nom: residence.chef_quartier_nom || chef?.nom || "",
      chef_quartier_telephone: residence.chef_quartier_telephone || chef?.telephone || "",
      valide: true,
    });
    setShowChefValidationModal(true);
  };

  const submitChefValidation = async () => {
    if (!validatingResidence) return;
    const r = await fetch(`${BASE(tenantCode!)}/residences/${validatingResidence.id}/chef-validation`, {
      method: "PATCH", headers: auth(), body: JSON.stringify(chefValidationForm)
    });
    const d = await r.json();
    if (d.success) {
      showToast(chefValidationForm.valide ? "Validation enregistrée" : "Validation annulée");
      setShowChefValidationModal(false);
      fetchResidences();
    } else showToast(d.message || "Erreur", false);
  };

  // ── AGENT HANDLERS ────────────────────────────────────────────────────────
  const openAgentForm = (a?: any) => {
    setEditingAgent(a || null);
    setAgentForm(a ? { ...a } : { nom: "", prenom: "", role: "Agent d'état civil", telephone: "", email: "" });
    setShowAgentForm(true);
  };

  const saveAgent = async () => {
    const url = editingAgent ? `${BASE(tenantCode!)}/agents/${editingAgent.id}` : `${BASE(tenantCode!)}/agents`;
    const method = editingAgent ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: auth(), body: JSON.stringify(agentForm) });
    const d = await r.json();
    if (d.success) { showToast(editingAgent ? "Agent mis à jour" : "Agent ajouté"); setShowAgentForm(false); fetchAgents(); }
    else showToast(d.message || "Erreur", false);
  };

  const deleteAgent = async (id: number) => {
    if (!confirm("Supprimer cet agent ?")) return;
    await fetch(`${BASE(tenantCode!)}/agents/${id}`, { method: "DELETE", headers: auth() });
    fetchAgents();
  };

  // ── SETTINGS HANDLER ──────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSavingSettings(true);
    const r = await fetch(`${BASE(tenantCode!)}/settings`, { method: "PUT", headers: auth(), body: JSON.stringify(settingsForm) });
    const d = await r.json();
    setSavingSettings(false);
    if (d.success) { showToast("Paramètres sauvegardés"); setTenant(d.tenant); }
    else showToast(d.message || "Erreur", false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `4px solid ${BLUE}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ color: BLUE, fontWeight: 600 }}>Chargement de l'espace mairie…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const Sidebar = () => (
    <aside style={{ width: 220, background: `linear-gradient(180deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🏛️</span>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{tenant?.name || "Mairie"}</span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>État Civil · Administration</div>
      </div>
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 2, background: section === item.id ? "rgba(255,255,255,0.15)" : "transparent", color: section === item.id ? "#fff" : "rgba(255,255,255,0.7)", fontWeight: section === item.id ? 700 : 500, fontSize: 13, transition: "all 0.15s" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <button onClick={() => navigate(-1)} style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Retour
        </button>
      </div>
    </aside>
  );

  const FormModal = ({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Annuler</button>
          <button onClick={onSave} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: BLUE, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );

  const FieldRow = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );

  // ── SECTION: DASHBOARD ────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Tableau de bord</h2>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Vue d'ensemble de l'état civil</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Mariages ce mois" value={stats.mariagesMois || 0} sub={`${stats.mariagesAujourdhui || 0} aujourd'hui`} color={BLUE} />
        <StatCard label="En attente" value={stats.mariagesEnAttente || 0} sub="Dossiers à traiter" color="#f59e0b" />
        <StatCard label="Naissances ce mois" value={stats.naissancesMois || 0} sub={`${stats.naissancesAujourdhui || 0} aujourd'hui`} color="#10b981" />
        <StatCard label="Décès ce mois" value={stats.decesMois || 0} sub="Déclarations reçues" color="#6366f1" />
        <StatCard label="Agents actifs" value={stats.agents || 0} sub="Personnel en service" color="#ec4899" />
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Derniers dossiers de mariage</h3>
          <button onClick={() => setSection("mariages")} style={{ fontSize: 12, color: BLUE, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir tout →</button>
        </div>
        {recentMariages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>Aucun dossier pour le moment</div>
        ) : recentMariages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{m.epoux_prenom} {m.epoux_nom} & {m.epouse_prenom} {m.epouse_nom}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>N° {m.numero_dossier} · Mariage le {fmtDate(m.date_mariage)}</div>
            </div>
            <StatutBadge statut={m.statut} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── SECTION: MARIAGES ─────────────────────────────────────────────────────
  const renderMariages = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Dossiers de mariage</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{mariages.length} dossier(s)</p>
        </div>
        <button onClick={() => openMariageForm()} style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          + Nouveau dossier
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input className={inp} style={{ ...inpStyle, maxWidth: 280 }} placeholder="Rechercher (nom époux/épouse, n° dossier)…" value={mariageSearch} onChange={e => setMariageSearch(e.target.value)} />
        <select className={inp} style={{ ...inpStyle, maxWidth: 180 }} value={mariageStatut} onChange={e => setMariageStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {mariages.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", background: "#fff", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💍</div>
          <div style={{ fontWeight: 600 }}>Aucun dossier de mariage</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mariages.map(m => (
            <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{m.epoux_prenom} {m.epoux_nom} & {m.epouse_prenom} {m.epouse_nom}</span>
                  <StatutBadge statut={m.statut} />
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  N° {m.numero_dossier} · Mariage le {fmtDate(m.date_mariage)} {m.lieu_mariage ? `· ${m.lieu_mariage}` : ""}
                </div>
                {(m.temoin1_nom || m.temoin2_nom) && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Témoins : {[m.temoin1_nom, m.temoin2_nom].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select value={m.statut} onChange={e => changeStatutMariage(m.id, e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#0f172a" }}>
                  {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={() => openMariageForm(m)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Modifier</button>
                <button onClick={() => deleteMariage(m.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showMariageForm && (
        <FormModal title={editingMariage ? "Modifier le dossier" : "Nouveau dossier de mariage"} onClose={() => setShowMariageForm(false)} onSave={saveMariage}>
          <div style={{ fontWeight: 700, color: BLUE, fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Époux</div>
          <FieldRow>
            <Field label="Nom *"><input className={inp} style={inpStyle} value={mariageForm.epoux_nom || ""} onChange={e => setMariageForm((f: any) => ({ ...f, epoux_nom: e.target.value }))} placeholder="Nom de l'époux" /></Field>
            <Field label="Prénom *"><input className={inp} style={inpStyle} value={mariageForm.epoux_prenom || ""} onChange={e => setMariageForm((f: any) => ({ ...f, epoux_prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Date de naissance"><input type="date" className={inp} style={inpStyle} value={mariageForm.epoux_ddn || ""} onChange={e => setMariageForm((f: any) => ({ ...f, epoux_ddn: e.target.value }))} /></Field>
            <Field label="N° Moftal (optionnel)"><input className={inp} style={inpStyle} value={mariageForm.epoux_numero_h || ""} onChange={e => setMariageForm((f: any) => ({ ...f, epoux_numero_h: e.target.value }))} placeholder="Ex: H-12345" /></Field>
          </FieldRow>
          <div style={{ fontWeight: 700, color: "#10b981", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Épouse</div>
          <FieldRow>
            <Field label="Nom *"><input className={inp} style={inpStyle} value={mariageForm.epouse_nom || ""} onChange={e => setMariageForm((f: any) => ({ ...f, epouse_nom: e.target.value }))} placeholder="Nom de l'épouse" /></Field>
            <Field label="Prénom *"><input className={inp} style={inpStyle} value={mariageForm.epouse_prenom || ""} onChange={e => setMariageForm((f: any) => ({ ...f, epouse_prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Date de naissance"><input type="date" className={inp} style={inpStyle} value={mariageForm.epouse_ddn || ""} onChange={e => setMariageForm((f: any) => ({ ...f, epouse_ddn: e.target.value }))} /></Field>
            <Field label="N° Moftal (optionnel)"><input className={inp} style={inpStyle} value={mariageForm.epouse_numero_h || ""} onChange={e => setMariageForm((f: any) => ({ ...f, epouse_numero_h: e.target.value }))} placeholder="Ex: H-12345" /></Field>
          </FieldRow>
          <div style={{ fontWeight: 700, color: "#64748b", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Cérémonie</div>
          <FieldRow>
            <Field label="Date du mariage *"><input type="date" className={inp} style={inpStyle} value={mariageForm.date_mariage || ""} onChange={e => setMariageForm((f: any) => ({ ...f, date_mariage: e.target.value }))} /></Field>
            <Field label="Lieu"><input className={inp} style={inpStyle} value={mariageForm.lieu_mariage || ""} onChange={e => setMariageForm((f: any) => ({ ...f, lieu_mariage: e.target.value }))} placeholder="Lieu de la cérémonie" /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Témoin 1"><input className={inp} style={inpStyle} value={mariageForm.temoin1_nom || ""} onChange={e => setMariageForm((f: any) => ({ ...f, temoin1_nom: e.target.value }))} placeholder="Nom du 1er témoin" /></Field>
            <Field label="Témoin 2"><input className={inp} style={inpStyle} value={mariageForm.temoin2_nom || ""} onChange={e => setMariageForm((f: any) => ({ ...f, temoin2_nom: e.target.value }))} placeholder="Nom du 2e témoin" /></Field>
          </FieldRow>
          <Field label="Notes"><textarea className={inp} style={{ ...inpStyle, resize: "vertical", minHeight: 60 } as any} value={mariageForm.notes || ""} onChange={e => setMariageForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Observations…" /></Field>
        </FormModal>
      )}
    </div>
  );

  // ── SECTION: NAISSANCES ───────────────────────────────────────────────────
  const renderNaissances = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Déclarations de naissance</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{naissances.length} déclaration(s)</p>
        </div>
        <button onClick={() => openNaissanceForm()} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + Nouvelle déclaration
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input className={inp} style={{ ...inpStyle, maxWidth: 280 }} placeholder="Rechercher (nom enfant, parent, n° dossier)…" value={naissanceSearch} onChange={e => setNaissanceSearch(e.target.value)} />
        <select className={inp} style={{ ...inpStyle, maxWidth: 180 }} value={naissanceStatut} onChange={e => setNaissanceStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {naissances.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", background: "#fff", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👶</div>
          <div style={{ fontWeight: 600 }}>Aucune déclaration de naissance</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {naissances.map(n => (
            <div key={n.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{n.enfant_prenom} {n.enfant_nom}</span>
                  <span style={{ fontSize: 11, color: "#64748b", background: n.sexe === "M" ? "#dbeafe" : "#fce7f3", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{n.sexe === "M" ? "Garçon" : "Fille"}</span>
                  <StatutBadge statut={n.statut} />
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  N° {n.numero_dossier} · Né(e) le {fmtDate(n.date_naissance)} {n.lieu_naissance ? `à ${n.lieu_naissance}` : ""}
                </div>
                {(n.pere_nom || n.mere_nom) && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Parents : {[n.pere_prenom && `${n.pere_prenom} ${n.pere_nom}`, n.mere_prenom && `${n.mere_prenom} ${n.mere_nom}`].filter(Boolean).join(" & ")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select value={n.statut} onChange={e => changeStatutNaissance(n.id, e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#0f172a" }}>
                  {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={() => openNaissanceForm(n)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Modifier</button>
                <button onClick={() => deleteNaissance(n.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNaissanceForm && (
        <FormModal title={editingNaissance ? "Modifier la déclaration" : "Nouvelle déclaration de naissance"} onClose={() => setShowNaissanceForm(false)} onSave={saveNaissance}>
          <div style={{ fontWeight: 700, color: "#10b981", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Enfant</div>
          <FieldRow>
            <Field label="Nom *"><input className={inp} style={inpStyle} value={naissanceForm.enfant_nom || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, enfant_nom: e.target.value }))} placeholder="Nom de l'enfant" /></Field>
            <Field label="Prénom *"><input className={inp} style={inpStyle} value={naissanceForm.enfant_prenom || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, enfant_prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Date de naissance *"><input type="date" className={inp} style={inpStyle} value={naissanceForm.date_naissance || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, date_naissance: e.target.value }))} /></Field>
            <Field label="Lieu de naissance"><input className={inp} style={inpStyle} value={naissanceForm.lieu_naissance || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, lieu_naissance: e.target.value }))} placeholder="Ville / Hôpital" /></Field>
          </FieldRow>
          <Field label="Sexe">
            <select className={inp} style={inpStyle} value={naissanceForm.sexe || "M"} onChange={e => setNaissanceForm((f: any) => ({ ...f, sexe: e.target.value }))}>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </Field>
          <div style={{ fontWeight: 700, color: "#64748b", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Père</div>
          <FieldRow>
            <Field label="Nom du père"><input className={inp} style={inpStyle} value={naissanceForm.pere_nom || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, pere_nom: e.target.value }))} placeholder="Nom" /></Field>
            <Field label="Prénom du père"><input className={inp} style={inpStyle} value={naissanceForm.pere_prenom || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, pere_prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <div style={{ fontWeight: 700, color: "#64748b", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Mère</div>
          <FieldRow>
            <Field label="Nom de la mère"><input className={inp} style={inpStyle} value={naissanceForm.mere_nom || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, mere_nom: e.target.value }))} placeholder="Nom" /></Field>
            <Field label="Prénom de la mère"><input className={inp} style={inpStyle} value={naissanceForm.mere_prenom || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, mere_prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <Field label="Déclarant"><input className={inp} style={inpStyle} value={naissanceForm.declarant_nom || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, declarant_nom: e.target.value }))} placeholder="Nom de la personne qui déclare" /></Field>
          <Field label="Notes"><textarea className={inp} style={{ ...inpStyle, resize: "vertical", minHeight: 60 } as any} value={naissanceForm.notes || ""} onChange={e => setNaissanceForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Observations…" /></Field>
        </FormModal>
      )}
    </div>
  );

  // ── SECTION: DÉCÈS ────────────────────────────────────────────────────────
  const renderDeces = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Déclarations de décès</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{deces.length} déclaration(s)</p>
        </div>
        <button onClick={() => openDecesForm()} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + Nouvelle déclaration
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input className={inp} style={{ ...inpStyle, maxWidth: 280 }} placeholder="Rechercher (nom défunt, déclarant, n° dossier)…" value={decesSearch} onChange={e => setDecesSearch(e.target.value)} />
        <select className={inp} style={{ ...inpStyle, maxWidth: 180 }} value={decesStatut} onChange={e => setDecesStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {deces.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", background: "#fff", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>Aucune déclaration de décès</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {deces.map(d => (
            <div key={d.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{d.defunt_prenom} {d.defunt_nom}</span>
                  <StatutBadge statut={d.statut} />
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  N° {d.numero_dossier} · Décédé(e) le {fmtDate(d.date_deces)} {d.lieu_deces ? `à ${d.lieu_deces}` : ""}
                </div>
                {d.declarant_nom && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Déclarant : {d.declarant_nom} {d.declarant_telephone ? `· ${d.declarant_telephone}` : ""}</div>}
                {d.cause_deces && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Cause : {d.cause_deces}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select value={d.statut} onChange={e => changeStatutDeces(d.id, e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#0f172a" }}>
                  {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={() => openDecesForm(d)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Modifier</button>
                <button onClick={() => deleteDeces(d.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDecesForm && (
        <FormModal title={editingDeces ? "Modifier la déclaration" : "Nouvelle déclaration de décès"} onClose={() => setShowDecesForm(false)} onSave={saveDeces}>
          <div style={{ fontWeight: 700, color: "#6366f1", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Défunt(e)</div>
          <FieldRow>
            <Field label="Nom *"><input className={inp} style={inpStyle} value={decesForm.defunt_nom || ""} onChange={e => setDecesForm((f: any) => ({ ...f, defunt_nom: e.target.value }))} placeholder="Nom" /></Field>
            <Field label="Prénom *"><input className={inp} style={inpStyle} value={decesForm.defunt_prenom || ""} onChange={e => setDecesForm((f: any) => ({ ...f, defunt_prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Date de naissance"><input type="date" className={inp} style={inpStyle} value={decesForm.defunt_ddn || ""} onChange={e => setDecesForm((f: any) => ({ ...f, defunt_ddn: e.target.value }))} /></Field>
            <Field label="N° Moftal (optionnel)"><input className={inp} style={inpStyle} value={decesForm.defunt_numero_h || ""} onChange={e => setDecesForm((f: any) => ({ ...f, defunt_numero_h: e.target.value }))} placeholder="Ex: H-12345" /></Field>
          </FieldRow>
          <div style={{ fontWeight: 700, color: "#64748b", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Informations du décès</div>
          <FieldRow>
            <Field label="Date du décès *"><input type="date" className={inp} style={inpStyle} value={decesForm.date_deces || ""} onChange={e => setDecesForm((f: any) => ({ ...f, date_deces: e.target.value }))} /></Field>
            <Field label="Lieu du décès"><input className={inp} style={inpStyle} value={decesForm.lieu_deces || ""} onChange={e => setDecesForm((f: any) => ({ ...f, lieu_deces: e.target.value }))} placeholder="Hôpital / Domicile / Ville" /></Field>
          </FieldRow>
          <Field label="Cause du décès"><input className={inp} style={inpStyle} value={decesForm.cause_deces || ""} onChange={e => setDecesForm((f: any) => ({ ...f, cause_deces: e.target.value }))} placeholder="Cause (si connue)" /></Field>
          <div style={{ fontWeight: 700, color: "#64748b", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Déclarant</div>
          <FieldRow>
            <Field label="Nom du déclarant"><input className={inp} style={inpStyle} value={decesForm.declarant_nom || ""} onChange={e => setDecesForm((f: any) => ({ ...f, declarant_nom: e.target.value }))} placeholder="Nom complet" /></Field>
            <Field label="Téléphone"><input className={inp} style={inpStyle} value={decesForm.declarant_telephone || ""} onChange={e => setDecesForm((f: any) => ({ ...f, declarant_telephone: e.target.value }))} placeholder="+224 6XX XX XX XX" /></Field>
          </FieldRow>
          <Field label="Notes"><textarea className={inp} style={{ ...inpStyle, resize: "vertical", minHeight: 60 } as any} value={decesForm.notes || ""} onChange={e => setDecesForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Observations…" /></Field>
        </FormModal>
      )}
    </div>
  );

  // ── SECTION: RÉSIDENCES ───────────────────────────────────────────────────
  const MOTIFS = ["Emploi", "École / Université", "Banque", "Voyage / Visa", "Administration", "Autre"];

  const renderResidences = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Certificats de résidence</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{residences.length} demande(s)</p>
        </div>
        <button onClick={() => openResidenceForm()} style={{ background: "#0891b2", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + Nouvelle demande
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input className={inp} style={{ ...inpStyle, maxWidth: 280 }} placeholder="Rechercher (nom, adresse, n° dossier)…" value={residenceSearch} onChange={e => setResidenceSearch(e.target.value)} />
        <select className={inp} style={{ ...inpStyle, maxWidth: 180 }} value={residenceStatut} onChange={e => setResidenceStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {residences.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", background: "#fff", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <div style={{ fontWeight: 600 }}>Aucune demande de certificat de résidence</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {residences.map(r => (
            <div key={r.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{r.prenom} {r.nom}</span>
                  <span style={{ fontSize: 11, color: "#0891b2", background: "#e0f2fe", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{r.motif}</span>
                  <StatutBadge statut={r.statut} />
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  N° {r.numero_dossier} · 🏠 {r.adresse}
                </div>
                {r.depuis_quand && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Réside depuis : {r.depuis_quand}</div>}
                {r.chef_quartier_nom ? (
                  <div style={{ fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: r.chef_quartier_valide ? "#166534" : "#92400e", background: r.chef_quartier_valide ? "#dcfce7" : "#fef9c3", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                      {r.chef_quartier_valide ? "✓" : "⏳"} Chef : {r.chef_quartier_nom}
                    </span>
                    {r.chef_quartier_valide && r.chef_quartier_date && (
                      <span style={{ color: "#94a3b8" }}>validé le {fmtDate(r.chef_quartier_date)}</span>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>⚠ Aucun chef de quartier assigné</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => openChefValidation(r)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #f59e0b", background: r.chef_quartier_valide ? "#fef9c3" : "#fffbeb", color: "#92400e", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  {r.chef_quartier_valide ? "✓ Chef validé" : "👤 Validation chef"}
                </button>
                <select value={r.statut} onChange={e => changeStatutResidence(r.id, e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#0f172a" }}>
                  {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={() => openResidenceForm(r)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Modifier</button>
                <button onClick={() => deleteResidence(r.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResidenceForm && (
        <FormModal title={editingResidence ? "Modifier la demande" : "Nouvelle demande de résidence"} onClose={() => setShowResidenceForm(false)} onSave={saveResidence}>
          <div style={{ fontWeight: 700, color: "#0891b2", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Demandeur</div>
          <FieldRow>
            <Field label="Nom *"><input className={inp} style={inpStyle} value={residenceForm.nom || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, nom: e.target.value }))} placeholder="Nom" /></Field>
            <Field label="Prénom *"><input className={inp} style={inpStyle} value={residenceForm.prenom || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Date de naissance"><input type="date" className={inp} style={inpStyle} value={residenceForm.date_naissance || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, date_naissance: e.target.value }))} /></Field>
            <Field label="N° Moftal (optionnel)"><input className={inp} style={inpStyle} value={residenceForm.numero_h || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, numero_h: e.target.value }))} placeholder="Ex: H-12345" /></Field>
          </FieldRow>
          <div style={{ fontWeight: 700, color: "#64748b", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Résidence</div>
          <Field label="Adresse complète *"><input className={inp} style={inpStyle} value={residenceForm.adresse || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, adresse: e.target.value }))} placeholder="Quartier, rue, numéro…" /></Field>
          <FieldRow>
            <Field label="Réside depuis">
              <input className={inp} style={inpStyle} value={residenceForm.depuis_quand || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, depuis_quand: e.target.value }))} placeholder="Ex: Janvier 2020" />
            </Field>
            <Field label="Motif de la demande">
              <select className={inp} style={inpStyle} value={residenceForm.motif || "Emploi"} onChange={e => setResidenceForm((f: any) => ({ ...f, motif: e.target.value }))}>
                {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </FieldRow>
          <Field label="Notes"><textarea className={inp} style={{ ...inpStyle, resize: "vertical", minHeight: 60 } as any} value={residenceForm.notes || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Observations…" /></Field>
          <div style={{ fontWeight: 700, color: "#92400e", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em", borderTop: "1px solid #fef9c3", paddingTop: 12 }}>Chef de quartier</div>
          <Field label="Sélectionner un chef de quartier (optionnel)">
            <select className={inp} style={inpStyle} value={residenceForm.chef_quartier_id || ""} onChange={e => {
              const chef = chefsQuartier.find(c => String(c.id) === e.target.value);
              setResidenceForm((f: any) => ({ ...f, chef_quartier_id: e.target.value || null, chef_quartier_nom: chef ? `${chef.prenom} ${chef.nom}`.trim() : f.chef_quartier_nom, chef_quartier_telephone: chef?.telephone || f.chef_quartier_telephone }));
            }}>
              <option value="">-- Choisir un chef de quartier --</option>
              {chefsQuartier.filter(c => c.is_active).map(c => (
                <option key={c.id} value={c.id}>{c.prenom} {c.nom} — Quartier : {c.quartier}</option>
              ))}
            </select>
          </Field>
          {!residenceForm.chef_quartier_id && (
            <FieldRow>
              <Field label="Nom du chef (manuel)"><input className={inp} style={inpStyle} value={residenceForm.chef_quartier_nom || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, chef_quartier_nom: e.target.value }))} placeholder="Nom complet du chef de quartier" /></Field>
              <Field label="Téléphone chef"><input className={inp} style={inpStyle} value={residenceForm.chef_quartier_telephone || ""} onChange={e => setResidenceForm((f: any) => ({ ...f, chef_quartier_telephone: e.target.value }))} placeholder="+224 6XX XX XX XX" /></Field>
            </FieldRow>
          )}
        </FormModal>
      )}

      {/* Modal validation chef de quartier */}
      {showChefValidationModal && validatingResidence && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Validation Chef de Quartier</h3>
              <button onClick={() => setShowChefValidationModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ background: "#fef9c3", borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: 12, color: "#92400e", fontWeight: 600 }}>
              Dossier : {validatingResidence.prenom} {validatingResidence.nom} — {validatingResidence.adresse}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nom du chef de quartier *</label>
                <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={chefValidationForm.chef_quartier_nom || ""} onChange={e => setChefValidationForm((f: any) => ({ ...f, chef_quartier_nom: e.target.value }))} placeholder="Nom complet" />
              </div>
              <div>
                <label style={labelStyle}>Téléphone du chef</label>
                <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={chefValidationForm.chef_quartier_telephone || ""} onChange={e => setChefValidationForm((f: any) => ({ ...f, chef_quartier_telephone: e.target.value }))} placeholder="+224 6XX XX XX XX" />
              </div>
              <div>
                <label style={labelStyle}>Décision</label>
                <select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={chefValidationForm.valide ? "oui" : "non"} onChange={e => setChefValidationForm((f: any) => ({ ...f, valide: e.target.value === "oui" }))}>
                  <option value="oui">✓ Le chef confirme la résidence</option>
                  <option value="non">✗ Le chef infirme / annule</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
              <button onClick={() => setShowChefValidationModal(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Annuler</button>
              <button onClick={submitChefValidation} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Enregistrer la décision</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── SECTION: CHEFS DE QUARTIER ────────────────────────────────────────────
  const renderChefsQuartier = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Chefs de quartier</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Les chefs enregistrés peuvent valider les certificats de résidence de leur quartier</p>
        </div>
        <button onClick={() => openChefForm()} style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + Enregistrer un chef
        </button>
      </div>
      {chefsQuartier.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", background: "#fff", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Aucun chef de quartier enregistré</div>
          <div style={{ fontSize: 12 }}>Enregistrez les chefs de quartier pour qu'ils puissent valider les demandes de résidence de leur secteur.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {chefsQuartier.map(c => (
            <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", opacity: c.is_active ? 1 : 0.6, borderLeft: "4px solid #f59e0b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{c.prenom} {c.nom}</div>
                  <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginTop: 2 }}>Quartier : {c.quartier}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.is_active ? "#fef3c7" : "#f1f5f9", color: c.is_active ? "#92400e" : "#94a3b8" }}>
                  {c.is_active ? "Actif" : "Inactif"}
                </span>
              </div>
              {c.telephone && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>📞 {c.telephone}</div>}
              {c.date_prise_fonction && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>En fonction depuis : {fmtDate(c.date_prise_fonction)}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button onClick={() => openChefForm(c)} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Modifier</button>
                <button onClick={() => deleteChef(c.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 11 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showChefForm && (
        <FormModal title={editingChef ? "Modifier le chef de quartier" : "Enregistrer un chef de quartier"} onClose={() => setShowChefForm(false)} onSave={saveChef}>
          <FieldRow>
            <Field label="Nom *"><input className={inp} style={inpStyle} value={chefForm.nom || ""} onChange={e => setChefForm((f: any) => ({ ...f, nom: e.target.value }))} placeholder="Nom" /></Field>
            <Field label="Prénom"><input className={inp} style={inpStyle} value={chefForm.prenom || ""} onChange={e => setChefForm((f: any) => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <Field label="Quartier *"><input className={inp} style={inpStyle} value={chefForm.quartier || ""} onChange={e => setChefForm((f: any) => ({ ...f, quartier: e.target.value }))} placeholder="Nom du quartier" /></Field>
          <FieldRow>
            <Field label="Téléphone"><input className={inp} style={inpStyle} value={chefForm.telephone || ""} onChange={e => setChefForm((f: any) => ({ ...f, telephone: e.target.value }))} placeholder="+224 6XX XX XX XX" /></Field>
            <Field label="Date de prise de fonction"><input type="date" className={inp} style={inpStyle} value={chefForm.date_prise_fonction ? chefForm.date_prise_fonction.slice(0, 10) : ""} onChange={e => setChefForm((f: any) => ({ ...f, date_prise_fonction: e.target.value }))} /></Field>
          </FieldRow>
          {editingChef && (
            <Field label="Statut">
              <select className={inp} style={inpStyle} value={chefForm.is_active ? "true" : "false"} onChange={e => setChefForm((f: any) => ({ ...f, is_active: e.target.value === "true" }))}>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </Field>
          )}
        </FormModal>
      )}
    </div>
  );

  // ── SECTION: AGENTS ───────────────────────────────────────────────────────
  const renderAgents = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Personnel</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{agents.filter(a => a.is_active).length} agent(s) actif(s)</p>
        </div>
        <button onClick={() => openAgentForm()} style={{ background: "#ec4899", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + Ajouter un agent
        </button>
      </div>
      {agents.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", background: "#fff", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👔</div>
          <div style={{ fontWeight: 600 }}>Aucun agent enregistré</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {agents.map(a => (
            <div key={a.id} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", opacity: a.is_active ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{a.prenom} {a.nom}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{a.role}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: a.is_active ? "#dcfce7" : "#f1f5f9", color: a.is_active ? "#166534" : "#94a3b8" }}>
                  {a.is_active ? "Actif" : "Inactif"}
                </span>
              </div>
              {a.telephone && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>📞 {a.telephone}</div>}
              {a.email && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>✉️ {a.email}</div>}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openAgentForm(a)} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Modifier</button>
                <button onClick={() => deleteAgent(a.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 11 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAgentForm && (
        <FormModal title={editingAgent ? "Modifier l'agent" : "Ajouter un agent"} onClose={() => setShowAgentForm(false)} onSave={saveAgent}>
          <FieldRow>
            <Field label="Nom *"><input className={inp} style={inpStyle} value={agentForm.nom || ""} onChange={e => setAgentForm((f: any) => ({ ...f, nom: e.target.value }))} placeholder="Nom" /></Field>
            <Field label="Prénom *"><input className={inp} style={inpStyle} value={agentForm.prenom || ""} onChange={e => setAgentForm((f: any) => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" /></Field>
          </FieldRow>
          <Field label="Rôle">
            <select className={inp} style={inpStyle} value={agentForm.role || ""} onChange={e => setAgentForm((f: any) => ({ ...f, role: e.target.value }))}>
              {ROLES_AGENT.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <FieldRow>
            <Field label="Téléphone"><input className={inp} style={inpStyle} value={agentForm.telephone || ""} onChange={e => setAgentForm((f: any) => ({ ...f, telephone: e.target.value }))} placeholder="+224 6XX XX XX XX" /></Field>
            <Field label="Email"><input type="email" className={inp} style={inpStyle} value={agentForm.email || ""} onChange={e => setAgentForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="email@mairie.gn" /></Field>
          </FieldRow>
          {editingAgent && (
            <Field label="Statut">
              <select className={inp} style={inpStyle} value={agentForm.is_active ? "true" : "false"} onChange={e => setAgentForm((f: any) => ({ ...f, is_active: e.target.value === "true" }))}>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </Field>
          )}
        </FormModal>
      )}
    </div>
  );

  // ── SECTION: SETTINGS ─────────────────────────────────────────────────────
  const renderSettings = () => (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Paramètres de la mairie</h2>
      <div style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", maxWidth: 560 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Nom de la mairie</label>
            <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.name || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Mairie de …" />
          </div>
          <div>
            <label style={labelStyle}>Adresse</label>
            <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.address || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, address: e.target.value }))} placeholder="Adresse complète" />
          </div>
          <FieldRow>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.phone || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+224 6XX XX XX XX" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.email || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="contact@mairie.gn" />
            </div>
          </FieldRow>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea className={inp} style={{ ...inpStyle, marginTop: 4, resize: "vertical", minHeight: 80 } as any} value={settingsForm.description || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Présentation de la mairie…" />
          </div>
          <button onClick={saveSettings} disabled={savingSettings} style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: savingSettings ? "not-allowed" : "pointer", opacity: savingSettings ? 0.7 : 1, alignSelf: "flex-start" }}>
            {savingSettings ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar desktop */}
      <div className="hidden md:block"><Sidebar /></div>

      {/* Sidebar mobile */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 201 }}><Sidebar /></div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button className="md:hidden" onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{tenant?.name || "Mairie"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>🏛️ Espace État Civil · {NAV_ITEMS.find(n => n.id === section)?.label}</div>
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, padding: "28px 24px", maxWidth: 960, width: "100%" }}>
          {section === "dashboard"      && renderDashboard()}
          {section === "mariages"       && renderMariages()}
          {section === "naissances"     && renderNaissances()}
          {section === "deces"          && renderDeces()}
          {section === "residences"     && renderResidences()}
          {section === "chefs_quartier" && renderChefsQuartier()}
          {section === "agents"         && renderAgents()}
          {section === "settings"       && renderSettings()}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 13, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", animation: "fadeIn 0.2s ease" }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 768px) { .hidden { display: none; } .md\\:block { display: block; } .md\\:hidden { display: none; } }
        @media (max-width: 767px) { .hidden { display: block; } .md\\:block { display: none; } .md\\:hidden { display: block; } }
      `}</style>
    </div>
  );
}
