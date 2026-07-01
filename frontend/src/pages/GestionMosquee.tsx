import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/mosque-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "imams" | "members" | "predications" | "partenaires" | "announcements" | "donations" | "quran";

function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const GREEN = "#1a8f1a";
const GREEN_BG = "#f0fdf0";

export default function GestionMosquee() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [quranStudents, setQuranStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [imams, setImams] = useState<any[]>([]);
  const [predications, setPredications] = useState<any[]>([]);
  const [partenaires, setPartenaires] = useState<any[]>([]);
  const [showAddImam, setShowAddImam] = useState(false);
  const [showAddPred, setShowAddPred] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [predForm, setPredForm] = useState({ titre: "", type: "khutba", sourate: "", contenu: "", date_pred: new Date().toISOString().slice(0, 10) });
  const [partForm, setPartForm] = useState({ nom_mosquee: "", ville: "", imam_nom: "", telephone: "" });
  const [editingRang, setEditingRang] = useState<number>(1);
  const [iForm, setIForm] = useState({ nom: "", prenom: "", telephone: "", numero_h: "", rang: 1 });

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);
  const [showAddDon, setShowAddDon] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mForm, setMForm] = useState({ nom: "", prenom: "", telephone: "", numero_h: "", role: "fidèle" });
  const [aForm, setAForm] = useState({ titre: "", contenu: "", type: "general" });
  const [dForm, setDForm] = useState({ donateur_nom: "", montant: "", type_don: "sadaqa" });
  const [qForm, setQForm] = useState({ nom: "", prenom: "", niveau_coran: "Débutant", telephone_parent: "", enseignant_id: "" });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadDashboard();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode) return;
    if (tab === "members") loadMembers();
    if (tab === "announcements") loadAnnouncements();
    if (tab === "donations") loadDonations();
    if (tab === "quran") loadQuranStudents();
    if (tab === "imams") loadImams();
    if (tab === "predications") loadPredications();
    if (tab === "partenaires") loadPartenaires();
  }, [tab, tenantCode]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        fetch(`${BASE(tenantCode!)}/info`, { headers: auth() }),
        fetch(`${BASE(tenantCode!)}/dashboard`, { headers: auth() })
      ]);
      const tData = await tRes.json();
      if (!tData.success) { setError(tData.message || "Accès refusé"); setLoading(false); return; }
      setTenant(tData.tenant);
      const dData = await dRes.json();
      if (dData.success) setDash(dData);
    } catch { setError("Erreur de connexion"); }
    setLoading(false);
  }

  async function loadMembers() {
    const r = await fetch(`${BASE(tenantCode!)}/members`, { headers: auth() });
    const d = await r.json();
    if (d.success) setMembers(d.members || []);
  }

  async function loadAnnouncements() {
    const r = await fetch(`${BASE(tenantCode!)}/announcements`, { headers: auth() });
    const d = await r.json();
    if (d.success) setAnnouncements(d.announcements || []);
  }

  async function loadDonations() {
    const r = await fetch(`${BASE(tenantCode!)}/donations`, { headers: auth() });
    const d = await r.json();
    if (d.success) setDonations(d.donations || []);
  }

  async function loadQuranStudents() {
    const r = await fetch(`${BASE(tenantCode!)}/quran-students`, { headers: auth() });
    const d = await r.json();
    if (d.success) setQuranStudents(d.students || []);
  }

  async function saveMember() {
    if (!mForm.nom) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/members`, { method: "POST", headers: auth(), body: JSON.stringify(mForm) });
    setSaving(false); setShowAddMember(false); setMForm({ nom: "", prenom: "", telephone: "", numero_h: "", role: "fidèle" });
    loadMembers();
  }

  async function deleteMember(id: number) {
    if (!confirm("Retirer ce membre ?")) return;
    await fetch(`${BASE(tenantCode!)}/members/${id}`, { method: "DELETE", headers: auth() });
    loadMembers();
  }

  async function saveAnnouncement() {
    if (!aForm.titre || !aForm.contenu) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/announcements`, { method: "POST", headers: auth(), body: JSON.stringify(aForm) });
    setSaving(false); setShowAddAnn(false); setAForm({ titre: "", contenu: "", type: "general" });
    loadAnnouncements();
  }

  async function deleteAnnouncement(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`${BASE(tenantCode!)}/announcements/${id}`, { method: "DELETE", headers: auth() });
    loadAnnouncements();
  }

  async function saveDonation() {
    if (!dForm.montant) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/donations`, { method: "POST", headers: auth(), body: JSON.stringify({ ...dForm, montant: +dForm.montant }) });
    setSaving(false); setShowAddDon(false); setDForm({ donateur_nom: "", montant: "", type_don: "sadaqa" });
    loadDonations(); loadDashboard();
  }

  async function saveQuranStudent() {
    if (!qForm.nom) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/quran-students`, { method: "POST", headers: auth(), body: JSON.stringify(qForm) });
    setSaving(false); setShowAddStudent(false); setQForm({ nom: "", prenom: "", niveau_coran: "Débutant", telephone_parent: "", enseignant_id: "" });
    loadQuranStudents();
  }

  async function loadImams() {
    const r = await fetch(`${BASE(tenantCode!)}/imams`, { headers: auth() });
    const d = await r.json();
    if (d.success) setImams(d.imams || []);
  }

  async function loadPredications() {
    const r = await fetch(`${BASE(tenantCode!)}/predications`, { headers: auth() });
    const d = await r.json();
    if (d.success) setPredications(d.predications || []);
  }

  async function loadPartenaires() {
    const r = await fetch(`${BASE(tenantCode!)}/partenaires`, { headers: auth() });
    const d = await r.json();
    if (d.success) setPartenaires(d.partenaires || []);
  }

  async function savePredication() {
    if (!predForm.titre) return;
    setSaving(true);
    const r = await fetch(`${BASE(tenantCode!)}/predications`, { method: "POST", headers: auth(), body: JSON.stringify(predForm) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { setShowAddPred(false); setPredForm({ titre: "", type: "khutba", sourate: "", contenu: "", date_pred: new Date().toISOString().slice(0, 10) }); loadPredications(); }
  }

  async function deletePredication(id: number) {
    if (!confirm("Supprimer cette prédication ?")) return;
    await fetch(`${BASE(tenantCode!)}/predications/${id}`, { method: "DELETE", headers: auth() });
    loadPredications();
  }

  async function savePartenaire() {
    if (!partForm.nom_mosquee) return;
    setSaving(true);
    const r = await fetch(`${BASE(tenantCode!)}/partenaires`, { method: "POST", headers: auth(), body: JSON.stringify(partForm) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { setShowAddPart(false); setPartForm({ nom_mosquee: "", ville: "", imam_nom: "", telephone: "" }); loadPartenaires(); }
  }

  async function deletePartenaire(id: number) {
    if (!confirm("Retirer cette mosquée partenaire ?")) return;
    await fetch(`${BASE(tenantCode!)}/partenaires/${id}`, { method: "DELETE", headers: auth() });
    loadPartenaires();
  }

  async function saveImam() {
    if (!iForm.nom) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/imams`, { method: "POST", headers: auth(), body: JSON.stringify({ ...iForm, rang: editingRang }) });
    setSaving(false); setShowAddImam(false); setIForm({ nom: "", prenom: "", telephone: "", numero_h: "", rang: 1 });
    loadImams();
  }

  async function removeImam(rang: number) {
    if (!confirm(`Retirer le Cheikh Imam ${rang} ?`)) return;
    await fetch(`${BASE(tenantCode!)}/imams/${rang}`, { method: "DELETE", headers: auth() });
    loadImams();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #bbf7bb", borderTopColor: GREEN, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2>{error}</h2>
      <button onClick={() => navigate("/gestion-interne")} style={{ padding: "10px 20px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Retour</button>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard",    label: "Dashboard",           icon: "📊" },
    { id: "imams",        label: "Imams",                icon: "🕌" },
    { id: "members",      label: "Fidèles",              icon: "👥" },
    { id: "predications", label: "Prédications",         icon: "📜" },
    { id: "partenaires",  label: "Mosquées partenaires", icon: "🤝" },
    { id: "announcements",label: "Annonces",             icon: "📢" },
    { id: "donations",    label: "Dons",                 icon: "💚" },
    { id: "quran",        label: "Coran",                icon: "📖" },
  ];

  const ROLES = ["imam", "muezzin", "enseignant", "responsable", "fidèle"];
  const DON_TYPES = ["sadaqa", "zakat", "waqf", "lilmosquee", "autre"];
  const NIVEAUX = ["Débutant", "Qa'idah", "Juz' Amma", "Hizb", "Mi-Coran", "Hafiz"];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion mosquée — ${tenant?.name || ""}`}
        startUrl={`/gestion-mosquee/${tenantCode}`}
        themeColor={GREEN}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      <style>{`@media(max-width:640px){.gestion-btn-secondary{display:none!important}}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f4b0f, #1a8f1a)", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1, overflow: "hidden" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🕌</div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant?.name || "Réseau Imam"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{tenantCode} · Réseau Imam & Mosquée</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <InstallAppButton />
          <button className="gestion-btn-secondary" onClick={() => navigate(`/mosquee/${tenantCode}`)} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🌐 Vitrine</button>
          <button className="gestion-btn-secondary" onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Retour</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f8fafc", borderRadius: 10, padding: 4, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, minWidth: 80, padding: "8px 4px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? "white" : "transparent", color: tab === t.id ? GREEN : "#64748b", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none", whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && dash && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Membres", value: dash.totalMembers ?? 0, color: "#1a8f1a", bg: "#f0fdf0",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { label: "Élèves Coran", value: dash.quranStudents ?? 0, color: "#d97706", bg: "#fffbeb",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
              { label: "Annonces actives", value: dash.totalAnnouncements ?? 0, color: "#7c3aed", bg: "#f5f3ff",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
            ].map(s => (
              <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "18px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${s.color}`, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Dons Banner */}
          <div style={{ background: "linear-gradient(135deg,#093809,#1a8f1a)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, color: "white" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Dons reçus ce mois</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{fmtMoney(dash.donsMois)}</div>
            </div>
            <div style={{ textAlign: "right", opacity: 0.9 }}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>Membres</div>
              <div style={{ fontWeight: 700 }}>{dash.totalMembers ?? 0}</div>
              <div style={{ fontSize: 12, marginTop: 6, marginBottom: 2 }}>Élèves Coran</div>
              <div style={{ fontWeight: 700 }}>{dash.quranStudents ?? 0}</div>
            </div>
          </div>
          {/* Quick Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Ajouter membre", icon: "👥", tab: "members" as Tab },
              { label: "Prédication",    icon: "🕌", tab: "predications" as Tab },
              { label: "Don",            icon: "💚", tab: "donations" as Tab },
              { label: "Annonce",        icon: "📢", tab: "announcements" as Tab },
            ].map(a => (
              <button key={a.label} onClick={() => setTab(a.tab)}
                style={{ background: "white", border: "1px solid #bbf7bb", borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                onMouseOver={e => (e.currentTarget.style.borderColor = GREEN)}
                onMouseOut={e => (e.currentTarget.style.borderColor = "#bbf7bb")}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{a.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{a.label}</div>
              </button>
            ))}
          </div>
          {/* Recent Announcements */}
          <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Dernières annonces</h3>
              <button onClick={() => setTab("announcements")} style={{ fontSize: 12, color: GREEN, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir toutes →</button>
            </div>
            {(dash.recentAnnouncements?.length ?? 0) === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 14 }}>Aucune annonce récente</div>
            ) : dash.recentAnnouncements.map((a: any) => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9", alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: GREEN_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📢</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titre}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.contenu}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{fmtDate(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEMBRES */}
      {tab === "members" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Membres ({members.length})</div>
            <button onClick={() => setShowAddMember(true)} style={{ padding: "8px 16px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
          </div>

          {showAddMember && (
            <div style={{ background: GREEN_BG, border: "1px solid #bbf7bb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouveau membre</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["Nom *", "nom"], ["Prénom", "prenom"], ["Téléphone", "telephone"], ["NuméroH (si membre)", "numero_h"]].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>{label}</div>
                    <input value={(mForm as any)[key]} onChange={e => setMForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Rôle</div>
                  <select value={mForm.role} onChange={e => setMForm(f => ({ ...f, role: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveMember} disabled={saving} style={{ padding: "8px 20px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddMember(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map(m => (
              <div key={m.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.prenom ? `${m.prenom} ${m.nom}` : m.nom}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{m.telephone || ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ padding: "2px 10px", background: GREEN_BG, color: GREEN, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{m.role}</span>
                  <button onClick={() => deleteMember(m.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>Retirer</button>
                </div>
              </div>
            ))}
            {members.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun membre enregistré.</div>}
          </div>
        </div>
      )}

      {/* ANNONCES */}
      {tab === "announcements" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Annonces ({announcements.length})</div>
            <button onClick={() => setShowAddAnn(true)} style={{ padding: "8px 16px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Publier</button>
          </div>

          {showAddAnn && (
            <div style={{ background: GREEN_BG, border: "1px solid #bbf7bb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouvelle annonce</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Titre *</div>
                <input value={aForm.titre} onChange={e => setAForm(f => ({ ...f, titre: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Contenu *</div>
                <textarea value={aForm.contenu} onChange={e => setAForm(f => ({ ...f, contenu: e.target.value }))} rows={3} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Type</div>
                <select value={aForm.type} onChange={e => setAForm(f => ({ ...f, type: e.target.value }))} style={{ border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
                  {["general", "priere", "evenement", "urgence"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveAnnouncement} disabled={saving} style={{ padding: "8px 20px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Publier"}</button>
                <button onClick={() => setShowAddAnn(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {announcements.map(a => (
              <div key={a.id} style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.titre}</div>
                  <button onClick={() => deleteAnnouncement(a.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Supprimer</button>
                </div>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{a.contenu}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <span style={{ padding: "1px 8px", background: GREEN_BG, color: GREEN, borderRadius: 20, fontSize: 11 }}>{a.type}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(a.created_at)}</span>
                </div>
              </div>
            ))}
            {announcements.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune annonce publiée.</div>}
          </div>
        </div>
      )}

      {/* DONATIONS */}
      {tab === "donations" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Dons ({donations.length})</div>
            <button onClick={() => setShowAddDon(true)} style={{ padding: "8px 16px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Enregistrer</button>
          </div>

          {showAddDon && (
            <div style={{ background: GREEN_BG, border: "1px solid #bbf7bb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouveau don</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Donateur</div>
                  <input value={dForm.donateur_nom} onChange={e => setDForm(f => ({ ...f, donateur_nom: e.target.value }))} placeholder="Anonyme" style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Montant (GNF) *</div>
                  <input value={dForm.montant} onChange={e => setDForm(f => ({ ...f, montant: e.target.value }))} type="number" style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Type</div>
                  <select value={dForm.type_don} onChange={e => setDForm(f => ({ ...f, type_don: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
                    {DON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveDonation} disabled={saving} style={{ padding: "8px 20px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddDon(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {donations.map(d => (
              <div key={d.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d.donateur_nom || "Anonyme"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(d.date_don)} · {d.type_don}</div>
                </div>
                <div style={{ fontWeight: 700, color: GREEN, fontSize: 15 }}>{fmtMoney(d.montant)}</div>
              </div>
            ))}
            {donations.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun don enregistré.</div>}
          </div>
        </div>
      )}

      {/* ÉLÈVES CORAN */}
      {tab === "quran" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Élèves Coran ({quranStudents.length})</div>
            <button onClick={() => setShowAddStudent(true)} style={{ padding: "8px 16px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Inscrire</button>
          </div>

          {showAddStudent && (
            <div style={{ background: GREEN_BG, border: "1px solid #bbf7bb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouvel élève</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["Nom *", "nom"], ["Prénom", "prenom"], ["Tél. parent", "telephone_parent"]].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>{label}</div>
                    <input value={(qForm as any)[key]} onChange={e => setQForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Niveau</div>
                  <select value={qForm.niveau_coran} onChange={e => setQForm(f => ({ ...f, niveau_coran: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Enseignant (ID membre)</div>
                  <input value={qForm.enseignant_id} onChange={e => setQForm(f => ({ ...f, enseignant_id: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveQuranStudent} disabled={saving} style={{ padding: "8px 20px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Inscrire"}</button>
                <button onClick={() => setShowAddStudent(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {quranStudents.map(s => (
              <div key={s.id} style={{ background: "white", borderRadius: 10, padding: 16, border: "1px solid #f1f5f9" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.prenom ? `${s.prenom} ${s.nom}` : s.nom}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ padding: "2px 10px", background: "#fef9c3", color: "#713f12", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.niveau_coran}</span>
                </div>
                {s.enseignant_nom && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Enseignant : {s.enseignant_nom}</div>}
                {s.telephone_parent && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Parent : {s.telephone_parent}</div>}
              </div>
            ))}
            {quranStudents.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun élève inscrit.</div>}
          </div>
        </div>
      )}

      {/* ── Onglet IMAMS ─────────────────────────────────────────────────────── */}
      {tab === "imams" && (
        <div style={{ padding: "0 16px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Cheikh Imams ({imams.length}/3)</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Chaque mosquée peut avoir jusqu'à 3 cheikh imams gestionnaires
              </div>
            </div>
          </div>

          {/* Info important */}
          <div style={{ background: "#f0fdf0", border: "1px solid #bbf7bb", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#0f4b0f" }}>
            <strong>Accès gestionnaire :</strong> Chaque imam enregistré avec son <strong>Numéro H</strong> pourra se connecter et gérer cette mosquée directement depuis son compte.
          </div>

          {/* 3 slots d'imams */}
          <div style={{ display: "grid", gap: 16 }}>
            {[1, 2, 3].map(rang => {
              const imam = imams.find((i: any) => i.rang === rang);
              const labels = ["", "Cheikh Imam Principal", "Cheikh Imam 2", "Cheikh Imam 3"];
              const colors = ["", "#1a8f1a", "#0891b2", "#7c3aed"];
              const bgs = ["", "#f0fdf0", "#ecfeff", "#f5f3ff"];
              return (
                <div key={rang} style={{ background: imam ? bgs[rang] : "#f8fafc", border: `1.5px solid ${imam ? colors[rang] + "44" : "#e2e8f0"}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: imam ? 12 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: imam ? colors[rang] : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {imam ? "🕌" : "○"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: imam ? colors[rang] : "#94a3b8" }}>{labels[rang]}</div>
                        {!imam && <div style={{ fontSize: 11, color: "#cbd5e1" }}>Poste vacant</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => { setEditingRang(rang); setIForm(imam ? { nom: imam.nom, prenom: imam.prenom || "", telephone: imam.telephone || "", numero_h: imam.numero_h || "", rang } : { nom: "", prenom: "", telephone: "", numero_h: "", rang }); setShowAddImam(true); }}
                        style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: imam ? colors[rang] : GREEN, color: "white" }}>
                        {imam ? "Modifier" : "+ Nommer"}
                      </button>
                      {imam && (
                        <button onClick={() => removeImam(rang)}
                          style={{ padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, background: "#fee2e2", color: "#dc2626" }}>
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                  {imam && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                      <div><span style={{ color: "#94a3b8" }}>Nom : </span><strong>{imam.nom} {imam.prenom || ""}</strong></div>
                      {imam.telephone && <div><span style={{ color: "#94a3b8" }}>Tél : </span>{imam.telephone}</div>}
                      {imam.numero_h && (
                        <div style={{ gridColumn: "1/-1" }}>
                          <span style={{ color: "#94a3b8" }}>Numéro H : </span>
                          <span style={{ fontFamily: "monospace", background: bgs[rang], padding: "2px 8px", borderRadius: 6, color: colors[rang], fontWeight: 700 }}>{imam.numero_h}</span>
                          <span style={{ marginLeft: 6, fontSize: 11, color: "#1a8f1a" }}>✓ Accès gestionnaire activé</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modal ajouter/modifier imam */}
          {showAddImam && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 420, overflow: "hidden" }}>
                <div style={{ background: GREEN, padding: "16px 20px" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>🕌 {editingRang === 1 ? "Cheikh Imam Principal" : `Cheikh Imam ${editingRang}`}</div>
                  <div style={{ color: "#bbf7bb", fontSize: 12, marginTop: 2 }}>Nommer ou modifier cet imam</div>
                </div>
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Nom *</label>
                    <input value={iForm.nom} onChange={e => setIForm({ ...iForm, nom: e.target.value })} placeholder="Nom de l'imam" style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Prénom</label>
                    <input value={iForm.prenom} onChange={e => setIForm({ ...iForm, prenom: e.target.value })} placeholder="Prénom" style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Téléphone</label>
                    <input value={iForm.telephone} onChange={e => setIForm({ ...iForm, telephone: e.target.value })} placeholder="+224 ..." style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Numéro H (compte plateforme)</label>
                    <input value={iForm.numero_h} onChange={e => setIForm({ ...iForm, numero_h: e.target.value })} placeholder="Ex: G1C2P3R4E5F6 7" style={{ width: "100%", border: "1px solid #e0f2fe", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", background: "#f0f9ff", boxSizing: "border-box", fontFamily: "monospace" }} />
                    <p style={{ fontSize: 11, color: "#0891b2", marginTop: 4 }}>Si renseigné, l'imam peut gérer la mosquée depuis son compte</p>
                  </div>
                </div>
                <div style={{ padding: "0 20px 20px", display: "flex", gap: 10 }}>
                  <button onClick={() => setShowAddImam(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>Annuler</button>
                  <button onClick={saveImam} disabled={saving || !iForm.nom} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", background: GREEN, color: "white", fontWeight: 700, opacity: saving ? 0.6 : 1 }}>{saving ? "Enregistrement..." : "Confirmer"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRÉDICATIONS */}
      {tab === "predications" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Prédications & Khutbas ({predications.length})</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Khutbas du vendredi, cours, conférences islamiques</div>
            </div>
            <button onClick={() => setShowAddPred(true)} style={{ padding: "8px 16px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
          </div>

          {showAddPred && (
            <div style={{ background: GREEN_BG, border: "1px solid #bbf7bb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouvelle prédication</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Titre *</div>
                  <input value={predForm.titre} onChange={e => setPredForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex : Khutba du vendredi - La patience" style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Type</div>
                  <select value={predForm.type} onChange={e => setPredForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
                    {["khutba", "cours", "conférence", "tarawih", "dars", "autre"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Date</div>
                  <input type="date" value={predForm.date_pred} onChange={e => setPredForm(f => ({ ...f, date_pred: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Sourate (optionnel)</div>
                  <input value={predForm.sourate} onChange={e => setPredForm(f => ({ ...f, sourate: e.target.value }))} placeholder="Ex : Al-Baqara v.2" style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>Contenu / Résumé</div>
                  <textarea value={predForm.contenu} onChange={e => setPredForm(f => ({ ...f, contenu: e.target.value }))} rows={3} placeholder="Résumé de la prédication..." style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={savePredication} disabled={saving} style={{ padding: "8px 20px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddPred(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {predications.map(p => (
              <div key={p.id} style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderLeft: `3px solid ${GREEN}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.titre}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <span style={{ padding: "2px 8px", background: GREEN_BG, color: GREEN, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.type}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{fmtDate(p.date_pred)}</span>
                      {p.sourate && <span style={{ fontSize: 12, color: "#7c3aed" }}>📖 {p.sourate}</span>}
                    </div>
                  </div>
                  <button onClick={() => deletePredication(p.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>Supprimer</button>
                </div>
                {p.contenu && <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>{p.contenu}</div>}
              </div>
            ))}
            {predications.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", background: "white", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📜</div>
                <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Aucune prédication enregistrée</div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>Enregistrez vos khutbas, cours et conférences islamiques</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOSQUÉES PARTENAIRES */}
      {tab === "partenaires" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Mosquées partenaires ({partenaires.length})</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Mosquées sœurs et alliées de votre réseau</div>
            </div>
            <button onClick={() => setShowAddPart(true)} style={{ padding: "8px 16px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
          </div>

          {showAddPart && (
            <div style={{ background: GREEN_BG, border: "1px solid #bbf7bb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouvelle mosquée partenaire</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["Nom de la mosquée *", "nom_mosquee"], ["Ville / Quartier", "ville"], ["Nom de l'imam", "imam_nom"], ["Téléphone", "telephone"]].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#093809", marginBottom: 4 }}>{label}</div>
                    <input value={(partForm as any)[key]} onChange={e => setPartForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", border: "1px solid #bbf7bb", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={savePartenaire} disabled={saving} style={{ padding: "8px 20px", background: GREEN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddPart(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {partenaires.map(p => (
              <div key={p.id} style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: GREEN_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🕌</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nom_mosquee}</div>
                    {p.ville && <div style={{ fontSize: 12, color: "#64748b" }}>{p.ville}</div>}
                  </div>
                </div>
                {p.imam_nom && <div style={{ fontSize: 13, color: "#334155", marginBottom: 4 }}>👨‍✈️ Imam : {p.imam_nom}</div>}
                {p.telephone && <div style={{ fontSize: 12, color: "#64748b" }}>📞 {p.telephone}</div>}
                <button onClick={() => deletePartenaire(p.id)} style={{ marginTop: 10, background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, width: "100%" }}>Retirer</button>
              </div>
            ))}
            {partenaires.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 20px", background: "white", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🤝</div>
                <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Aucune mosquée partenaire</div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>Ajoutez les mosquées sœurs de votre réseau islamique</div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
