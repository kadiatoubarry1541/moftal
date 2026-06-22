import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/ngo-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "members" | "projects" | "donations" | "announcements";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const ROSE = "#e11d48";
const ROSE_BG = "#fff1f2";
const ROSE_BORDER = "#fecdd3";

const STATUT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  en_cours:  { bg: "#eff6ff", color: "#1d4ed8", label: "En cours" },
  termine:   { bg: "#f0fdf0", color: "#156315", label: "Terminé" },
  suspendu:  { bg: "#fffbeb", color: "#b45309", label: "Suspendu" },
  planifie:  { bg: "#f5f3ff", color: "#7c3aed", label: "Planifié" },
};

export default function GestionNgo() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddDon, setShowAddDon] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [mForm, setMForm] = useState({ nom: "", prenom: "", telephone: "", numero_h: "", role: "bénévole", competence: "" });
  const [pForm, setPForm] = useState({ titre: "", description: "", statut: "en_cours", date_debut: new Date().toISOString().split("T")[0], date_fin: "", budget: "" });
  const [dForm, setDForm] = useState({ donateur_nom: "", montant: "", type_don: "financier", projet_id: "", projet_titre: "", date_don: new Date().toISOString().split("T")[0] });
  const [aForm, setAForm] = useState({ titre: "", contenu: "", type: "general" });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadAll();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || !tenant) return;
    if (tab === "members") loadMembers();
    else if (tab === "projects") loadProjects();
    else if (tab === "donations") loadDonations();
    else if (tab === "announcements") loadAnnouncements();
  }, [tab]);

  async function loadAll() {
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
    } catch { setError("Erreur de connexion au serveur"); }
    setLoading(false);
  }

  async function loadMembers() {
    const r = await fetch(`${BASE(tenantCode!)}/members`, { headers: auth() });
    const d = await r.json();
    if (d.success) setMembers(d.members);
  }
  async function loadProjects() {
    const r = await fetch(`${BASE(tenantCode!)}/projects`, { headers: auth() });
    const d = await r.json();
    if (d.success) setProjects(d.projects);
  }
  async function loadDonations() {
    const r = await fetch(`${BASE(tenantCode!)}/donations`, { headers: auth() });
    const d = await r.json();
    if (d.success) setDonations(d.donations);
  }
  async function loadAnnouncements() {
    const r = await fetch(`${BASE(tenantCode!)}/announcements`, { headers: auth() });
    const d = await r.json();
    if (d.success) setAnnouncements(d.announcements);
  }

  async function addMember() {
    if (!mForm.nom.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/members`, { method: "POST", headers: auth(), body: JSON.stringify(mForm) });
    setSaving(false); setShowAddMember(false);
    setMForm({ nom: "", prenom: "", telephone: "", numero_h: "", role: "bénévole", competence: "" });
    loadMembers(); loadAll();
  }
  async function deleteMember(id: number) {
    if (!confirm("Retirer ce membre ?")) return;
    await fetch(`${BASE(tenantCode!)}/members/${id}`, { method: "DELETE", headers: auth() });
    loadMembers(); loadAll();
  }

  async function addProject() {
    if (!pForm.titre.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/projects`, { method: "POST", headers: auth(), body: JSON.stringify(pForm) });
    setSaving(false); setShowAddProject(false);
    setPForm({ titre: "", description: "", statut: "en_cours", date_debut: new Date().toISOString().split("T")[0], date_fin: "", budget: "" });
    loadProjects(); loadAll();
  }
  async function updateStatut(id: number, statut: string) {
    await fetch(`${BASE(tenantCode!)}/projects/${id}/statut`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
    loadProjects(); loadAll();
  }
  async function deleteProject(id: number) {
    if (!confirm("Supprimer ce projet ?")) return;
    await fetch(`${BASE(tenantCode!)}/projects/${id}`, { method: "DELETE", headers: auth() });
    loadProjects(); loadAll();
  }

  async function addDonation() {
    if (!dForm.montant) return;
    setSaving(true);
    const sel = projects.find((p: any) => String(p.id) === dForm.projet_id);
    const payload = { ...dForm, projet_titre: sel ? sel.titre : dForm.projet_titre };
    await fetch(`${BASE(tenantCode!)}/donations`, { method: "POST", headers: auth(), body: JSON.stringify(payload) });
    setSaving(false); setShowAddDon(false);
    setDForm({ donateur_nom: "", montant: "", type_don: "financier", projet_id: "", projet_titre: "", date_don: new Date().toISOString().split("T")[0] });
    loadDonations(); loadAll();
  }
  async function deleteDonation(id: number) {
    if (!confirm("Supprimer ce don ?")) return;
    await fetch(`${BASE(tenantCode!)}/donations/${id}`, { method: "DELETE", headers: auth() });
    loadDonations(); loadAll();
  }

  async function addAnn() {
    if (!aForm.titre.trim() || !aForm.contenu.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/announcements`, { method: "POST", headers: auth(), body: JSON.stringify(aForm) });
    setSaving(false); setShowAddAnn(false);
    setAForm({ titre: "", contenu: "", type: "general" });
    loadAnnouncements(); loadAll();
  }
  async function deleteAnn(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`${BASE(tenantCode!)}/announcements/${id}`, { method: "DELETE", headers: auth() });
    loadAnnouncements(); loadAll();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #fecdd3", borderTopColor: ROSE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 500, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate(-1)} style={{ marginTop: 20, padding: "10px 24px", background: ROSE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Retour</button>
    </div>
  );

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "dashboard",     label: "Tableau de bord", emoji: "📊" },
    { key: "members",       label: "Bénévoles",        emoji: "🤝" },
    { key: "projects",      label: "Projets",          emoji: "📋" },
    { key: "donations",     label: "Collectes",        emoji: "💰" },
    { key: "announcements", label: "Annonces",         emoji: "📣" },
  ];

  const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #fecdd3", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#9f1239", marginBottom: 4 };
  const btnPrimary: React.CSSProperties = { padding: "10px 20px", background: ROSE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };
  const btnSecondary: React.CSSProperties = { padding: "9px 18px", background: "white", color: ROSE, border: `2px solid ${ROSE}`, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 60px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg,#be123c,#e11d48)", padding: "28px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>🤝</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "white", fontSize: 20 }}>{tenant?.name || "ONG & Associations"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Code : {tenantCode} · ONG & Associations</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate(`/ngo/${tenantCode}`)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>🌐 Vitrine</button>
            <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>← Retour</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "10px 18px", background: tab === t.key ? "white" : "transparent", color: tab === t.key ? ROSE : "rgba(255,255,255,0.8)", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: tab === t.key ? 700 : 500, fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && dash && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.2s ease" }}>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {[
                { label: "Bénévoles actifs",   val: dash.totalMembers,       color: ROSE,      bg: ROSE_BG,   icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                { label: "Projets en cours",   val: dash.projetsEnCours,     color: "#be123c", bg: "#ffe4e6",  icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                { label: "Annonces actives",   val: dash.totalAnnouncements, color: "#9f1239", bg: "#fff1f2",  icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
              ].map((s, i) => (
                <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px", borderLeft: `3px solid ${s.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" fill="none" stroke={s.color} strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{s.val ?? 0}</div>
                </div>
              ))}
            </div>

            {/* Dons gradient */}
            <div style={{ background: "linear-gradient(135deg,#9f1239,#e11d48)", borderRadius: 14, padding: "20px 24px", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(225,29,72,0.3)" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Collectes ce mois</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>{fmtMoney(dash.donsMois)}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Dons & financements reçus</div>
              </div>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
            </div>

            {/* Actions rapides */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Actions rapides</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {[
                  { label: "Ajouter bénévole", tab: "members",       emoji: "🤝" },
                  { label: "Nouveau projet",   tab: "projects",      emoji: "📋" },
                  { label: "Enregistrer don",  tab: "donations",     emoji: "💰" },
                  { label: "Annonce",          tab: "announcements", emoji: "📣" },
                ].map(a => (
                  <button key={a.tab} onClick={() => setTab(a.tab as Tab)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", background: ROSE_BG, border: `1px solid ${ROSE_BORDER}`, borderRadius: 10, cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = ROSE; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ROSE_BG; }}>
                    <span style={{ fontSize: 22 }}>{a.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: ROSE }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Projets récents */}
            {dash.recentProjects?.length > 0 ? (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Projets récents</span>
                  <button onClick={() => setTab("projects")} style={{ fontSize: 12, color: ROSE, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir tous →</button>
                </div>
                {dash.recentProjects.map((p: any) => {
                  const sc = STATUT_COLORS[p.statut] || STATUT_COLORS.en_cours;
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: ROSE_BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" fill="none" stroke={ROSE} strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{p.titre}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Début : {fmtDate(p.date_debut)}{p.budget > 0 ? ` · Budget : ${fmtMoney(p.budget)}` : ""}</div>
                      </div>
                      <span style={{ padding: "3px 10px", background: sc.bg, color: sc.color, borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{sc.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                <div style={{ fontSize: 13 }}>Aucune donnée. Commencez par ajouter des bénévoles et des projets.</div>
              </div>
            )}
          </div>
        )}

        {/* ── BÉNÉVOLES ── */}
        {tab === "members" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Bénévoles & membres ({members.length})</h2>
              <button onClick={() => setShowAddMember(true)} style={btnPrimary}>+ Ajouter</button>
            </div>
            {showAddMember && (
              <div style={{ background: ROSE_BG, border: `1px solid ${ROSE_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#9f1239" }}>Nouveau membre</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input value={mForm.nom} onChange={e => setMForm({...mForm, nom: e.target.value})} placeholder="Nom" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Prénom</label><input value={mForm.prenom} onChange={e => setMForm({...mForm, prenom: e.target.value})} placeholder="Prénom" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Téléphone</label><input value={mForm.telephone} onChange={e => setMForm({...mForm, telephone: e.target.value})} placeholder="+224..." style={inputStyle} /></div>
                  <div><label style={labelStyle}>Numéro H</label><input value={mForm.numero_h} onChange={e => setMForm({...mForm, numero_h: e.target.value})} placeholder="Optionnel" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Rôle</label>
                    <select value={mForm.role} onChange={e => setMForm({...mForm, role: e.target.value})} style={inputStyle}>
                      <option value="bénévole">Bénévole</option><option value="coordinateur">Coordinateur</option><option value="trésorier">Trésorier</option><option value="responsable">Responsable de projet</option><option value="partenaire">Partenaire</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Compétence</label><input value={mForm.competence} onChange={e => setMForm({...mForm, competence: e.target.value})} placeholder="Ex : médecine, comptabilité..." style={inputStyle} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addMember} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddMember(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucun membre enregistré</div>}
              {members.map((m: any) => (
                <div key={m.id} style={{ background: "white", border: `1px solid ${ROSE_BORDER}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: ROSE_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤝</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{m.nom} {m.prenom}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      <span style={{ padding: "1px 8px", background: ROSE_BG, color: ROSE, borderRadius: 12, fontSize: 11, fontWeight: 600, marginRight: 6 }}>{m.role}</span>
                      {m.competence} {m.telephone ? `· ${m.telephone}` : ""}
                    </div>
                  </div>
                  {m.numero_h && <span style={{ fontFamily: "monospace", fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 6 }}>{m.numero_h}</span>}
                  {userIsAdmin && <button onClick={() => deleteMember(m.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROJETS ── */}
        {tab === "projects" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Projets solidaires ({projects.length})</h2>
              <button onClick={() => setShowAddProject(true)} style={btnPrimary}>+ Nouveau projet</button>
            </div>
            {showAddProject && (
              <div style={{ background: ROSE_BG, border: `1px solid ${ROSE_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#9f1239" }}>Nouveau projet</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Titre *</label><input value={pForm.titre} onChange={e => setPForm({...pForm, titre: e.target.value})} placeholder="Titre du projet" style={inputStyle} /></div>
                  <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Description</label><textarea value={pForm.description} onChange={e => setPForm({...pForm, description: e.target.value})} rows={2} placeholder="Description du projet..." style={{...inputStyle, resize: "vertical"}} /></div>
                  <div>
                    <label style={labelStyle}>Statut</label>
                    <select value={pForm.statut} onChange={e => setPForm({...pForm, statut: e.target.value})} style={inputStyle}>
                      <option value="planifie">Planifié</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="suspendu">Suspendu</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Budget (GNF)</label><input type="number" value={pForm.budget} onChange={e => setPForm({...pForm, budget: e.target.value})} placeholder="0" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Date début</label><input type="date" value={pForm.date_debut} onChange={e => setPForm({...pForm, date_debut: e.target.value})} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Date fin</label><input type="date" value={pForm.date_fin} onChange={e => setPForm({...pForm, date_fin: e.target.value})} style={inputStyle} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addProject} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddProject(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucun projet enregistré</div>}
              {projects.map((p: any) => {
                const sc = STATUT_COLORS[p.statut] || STATUT_COLORS.en_cours;
                return (
                  <div key={p.id} style={{ background: "white", border: `1px solid ${ROSE_BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{p.titre}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select value={p.statut} onChange={e => updateStatut(p.id, e.target.value)} style={{ padding: "3px 8px", border: `1px solid ${sc.color}33`, borderRadius: 8, fontSize: 12, color: sc.color, background: sc.bg, fontWeight: 600, cursor: "pointer" }}>
                          <option value="planifie">Planifié</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="suspendu">Suspendu</option>
                        </select>
                        {userIsAdmin && <button onClick={() => deleteProject(p.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Suppr.</button>}
                      </div>
                    </div>
                    {p.description && <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>{p.description}</div>}
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b" }}>
                      <span>📅 Début : {fmtDate(p.date_debut)}</span>
                      {p.date_fin && <span>🏁 Fin : {fmtDate(p.date_fin)}</span>}
                      {p.budget > 0 && <span>💰 Budget : {fmtMoney(p.budget)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── COLLECTES / DONS ── */}
        {tab === "donations" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Collectes & dons ({donations.length})</h2>
              <button onClick={() => setShowAddDon(true)} style={btnPrimary}>+ Enregistrer un don</button>
            </div>
            {showAddDon && (
              <div style={{ background: ROSE_BG, border: `1px solid ${ROSE_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#9f1239" }}>Nouveau don</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Donateur</label><input value={dForm.donateur_nom} onChange={e => setDForm({...dForm, donateur_nom: e.target.value})} placeholder="Nom ou Anonyme" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Montant (GNF) *</label><input type="number" value={dForm.montant} onChange={e => setDForm({...dForm, montant: e.target.value})} placeholder="0" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Type de don</label>
                    <select value={dForm.type_don} onChange={e => setDForm({...dForm, type_don: e.target.value})} style={inputStyle}>
                      <option value="financier">Financier</option><option value="materiel">Matériel</option><option value="alimentaire">Alimentaire</option><option value="medical">Médical</option><option value="autre">Autre</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Date</label><input type="date" value={dForm.date_don} onChange={e => setDForm({...dForm, date_don: e.target.value})} style={inputStyle} /></div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labelStyle}>Projet concerné</label>
                    <select value={dForm.projet_id} onChange={e => setDForm({...dForm, projet_id: e.target.value})} style={inputStyle}>
                      <option value="">— Aucun projet spécifique —</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.titre}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addDonation} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddDon(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {donations.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucun don enregistré</div>}
              {donations.map((d: any) => (
                <div key={d.id} style={{ background: "white", border: `1px solid ${ROSE_BORDER}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: ROSE_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💰</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{fmtMoney(d.montant)}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {d.donateur_nom || "Anonyme"} · {fmtDate(d.date_don)} {d.projet_titre ? `· ${d.projet_titre}` : ""}
                    </div>
                  </div>
                  <span style={{ padding: "2px 10px", background: ROSE_BG, color: ROSE, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{d.type_don}</span>
                  {userIsAdmin && <button onClick={() => deleteDonation(d.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Suppr.</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ANNONCES ── */}
        {tab === "announcements" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Annonces ({announcements.length})</h2>
              <button onClick={() => setShowAddAnn(true)} style={btnPrimary}>+ Publier</button>
            </div>
            {showAddAnn && (
              <div style={{ background: ROSE_BG, border: `1px solid ${ROSE_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#9f1239" }}>Nouvelle annonce</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={labelStyle}>Titre *</label><input value={aForm.titre} onChange={e => setAForm({...aForm, titre: e.target.value})} placeholder="Titre de l'annonce" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={aForm.type} onChange={e => setAForm({...aForm, type: e.target.value})} style={inputStyle}>
                      <option value="general">Général</option><option value="appel_don">Appel aux dons</option><option value="evenement">Événement</option><option value="urgent">Urgent</option><option value="recrutement">Recrutement bénévoles</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Contenu *</label><textarea value={aForm.contenu} onChange={e => setAForm({...aForm, contenu: e.target.value})} rows={4} placeholder="Contenu de l'annonce..." style={{...inputStyle, resize: "vertical"}} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addAnn} disabled={saving} style={btnPrimary}>{saving ? "Publication..." : "Publier"}</button>
                  <button onClick={() => setShowAddAnn(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {announcements.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucune annonce publiée</div>}
              {announcements.map((a: any) => (
                <div key={a.id} style={{ background: "white", border: `1px solid ${ROSE_BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{a.titre}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{fmtDate(a.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ padding: "2px 10px", background: ROSE_BG, color: ROSE, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{a.type}</span>
                      {userIsAdmin && <button onClick={() => deleteAnn(a.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Suppr.</button>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{a.contenu}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
