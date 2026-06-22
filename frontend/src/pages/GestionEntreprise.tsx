import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/enterprise-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "employees" | "clients" | "contracts" | "announcements";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const INDIGO = "#4f46e5";
const INDIGO_BG = "#eef2ff";
const INDIGO_BORDER = "#c7d2fe";

const STATUT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  en_cours:  { bg: "#eff6ff", color: "#1d4ed8", label: "En cours" },
  termine:   { bg: "#f0fdf0", color: "#156315", label: "Terminé" },
  suspendu:  { bg: "#fffbeb", color: "#b45309", label: "Suspendu" },
  annule:    { bg: "#fff1f2", color: "#be123c", label: "Annulé" },
  planifie:  { bg: "#f5f3ff", color: "#7c3aed", label: "Planifié" },
};

export default function GestionEntreprise() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [emForm, setEmForm] = useState({ nom: "", prenom: "", telephone: "", numero_h: "", poste: "Employé", departement: "" });
  const [clForm, setClForm] = useState({ nom: "", telephone: "", adresse: "", secteur: "" });
  const [ctForm, setCtForm] = useState({ titre: "", client_nom: "", budget: "", statut: "en_cours", date_debut: new Date().toISOString().split("T")[0], date_fin: "", description: "" });
  const [anForm, setAnForm] = useState({ titre: "", contenu: "", type: "general" });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    const token = localStorage.getItem("token");
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${BASE(tenantCode)}/info`, { headers: h }).then(r => r.json()),
      fetch(`${BASE(tenantCode)}/dashboard`, { headers: h }).then(r => r.json()),
    ]).then(([info, d]) => {
      if (!info.success) { setError(info.message || "Accès refusé."); return; }
      setTenant(info.tenant);
      setDash(d);
    }).catch(() => setError("Erreur de connexion.")).finally(() => setLoading(false));
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || loading || error) return;
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    if (tab === "employees")    fetch(`${BASE(tenantCode)}/employees`,    { headers: h }).then(r => r.json()).then(d => d.success && setEmployees(d.employees || []));
    if (tab === "clients")      fetch(`${BASE(tenantCode)}/clients`,      { headers: h }).then(r => r.json()).then(d => d.success && setClients(d.clients || []));
    if (tab === "contracts")    fetch(`${BASE(tenantCode)}/contracts`,    { headers: h }).then(r => r.json()).then(d => d.success && setContracts(d.contracts || []));
    if (tab === "announcements") fetch(`${BASE(tenantCode)}/announcements`, { headers: h }).then(r => r.json()).then(d => d.success && setAnnouncements(d.announcements || []));
  }, [tab, tenantCode, loading]);

  const post = async (url: string, body: object) => {
    setSaving(true);
    const r = await fetch(url, { method: "POST", headers: auth(), body: JSON.stringify(body) });
    const d = await r.json();
    setSaving(false);
    return d;
  };
  const del = async (url: string) => { await fetch(url, { method: "DELETE", headers: auth() }); };
  const patchStatut = async (url: string, statut: string) => { await fetch(url, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) }); };

  const reload = (resource: string, setter: (v: any[]) => void, key: string) => {
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    fetch(`${BASE(tenantCode!)}/${resource}`, { headers: h }).then(r => r.json()).then(d => d.success && setter(d[key] || []));
  };

  const handleAddEmployee = async () => {
    if (!emForm.nom) return;
    const d = await post(`${BASE(tenantCode!)}/employees`, emForm);
    if (d.success) { setShowAddEmployee(false); setEmForm({ nom: "", prenom: "", telephone: "", numero_h: "", poste: "Employé", departement: "" }); reload("employees", setEmployees, "employees"); }
  };
  const handleAddClient = async () => {
    if (!clForm.nom) return;
    const d = await post(`${BASE(tenantCode!)}/clients`, clForm);
    if (d.success) { setShowAddClient(false); setClForm({ nom: "", telephone: "", adresse: "", secteur: "" }); reload("clients", setClients, "clients"); }
  };
  const handleAddContract = async () => {
    if (!ctForm.titre) return;
    const d = await post(`${BASE(tenantCode!)}/contracts`, { ...ctForm, budget: +ctForm.budget });
    if (d.success) { setShowAddContract(false); setCtForm({ titre: "", client_nom: "", budget: "", statut: "en_cours", date_debut: new Date().toISOString().split("T")[0], date_fin: "", description: "" }); reload("contracts", setContracts, "contracts"); }
  };
  const handleAddAnn = async () => {
    if (!anForm.titre || !anForm.contenu) return;
    const d = await post(`${BASE(tenantCode!)}/announcements`, anForm);
    if (d.success) { setShowAddAnn(false); setAnForm({ titre: "", contenu: "", type: "general" }); reload("announcements", setAnnouncements, "announcements"); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: "4px solid #e0e7ff", borderTopColor: INDIGO, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate("/gestion-interne")} style={{ marginTop: 16, padding: "10px 24px", background: INDIGO, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Retour</button>
    </div>
  );

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard",     label: "Dashboard",      emoji: "📊" },
    { id: "employees",     label: "Employés",        emoji: "👔" },
    { id: "clients",       label: "Clients",         emoji: "🤝" },
    { id: "contracts",     label: "Contrats / Projets", emoji: "📑" },
    { id: "announcements", label: "Annonces",        emoji: "📢" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "10px 20px", background: bg, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 });
  const card: React.CSSProperties = { background: "white", border: `1px solid ${INDIGO_BORDER}`, borderRadius: 12, padding: "16px 18px", marginBottom: 10 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,#4338ca,#7c3aed)`, borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 44 }}>🏢</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: "white", fontSize: 20 }}>{tenant?.name || "Entreprise"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Code : {tenantCode} · Gestion Interne</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate(`/entreprise/${tenantCode}`)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🌐 Vitrine</button>
          <button onClick={() => navigate(-1 as any)} style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>← Retour</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", background: tab === t.id ? INDIGO : "#f1f5f9", color: tab === t.id ? "white" : "#64748b", transition: "all 0.15s" }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dash && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.2s ease" }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { label: "Employés actifs",   val: dash.totalEmployees,  color: INDIGO,    bg: INDIGO_BG,  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
              { label: "Clients actifs",    val: dash.totalClients,    color: "#7c3aed", bg: "#f5f3ff",  icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
              { label: "Contrats en cours", val: dash.contratsEnCours, color: "#1d4ed8", bg: "#eff6ff",  icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
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

          {/* CA gradient */}
          <div style={{ background: "linear-gradient(135deg,#3730a3,#4f46e5)", borderRadius: 14, padding: "20px 24px", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(79,70,229,0.35)" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Chiffre d'affaires total</div>
              <div style={{ fontSize: 30, fontWeight: 800 }}>{(dash.caTotal || 0).toLocaleString("fr-FR")} GNF</div>
            </div>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="26" height="26" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
          </div>

          {/* Actions rapides */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Actions rapides</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[
                { label: "Ajouter employé",  tab: "employees",    emoji: "👔" },
                { label: "Nouveau client",   tab: "clients",      emoji: "🤝" },
                { label: "Nouveau contrat",  tab: "contracts",    emoji: "📑" },
                { label: "Annonce",          tab: "announcements",emoji: "📣" },
              ].map(a => (
                <button key={a.tab} onClick={() => setTab(a.tab as Tab)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", background: INDIGO_BG, border: `1px solid ${INDIGO_BORDER}`, borderRadius: 10, cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = INDIGO; (e.currentTarget as HTMLElement).style.color = "white"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = INDIGO_BG; (e.currentTarget as HTMLElement).style.color = ""; }}>
                  <span style={{ fontSize: 22 }}>{a.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: INDIGO }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contrats récents */}
          {dash.recentContracts?.length > 0 && (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Contrats récents</span>
                <button onClick={() => setTab("contracts")} style={{ fontSize: 12, color: INDIGO, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir tous →</button>
              </div>
              {dash.recentContracts.map((c: any) => {
                const sc = STATUT_COLORS[c.statut] || { bg: "#f1f5f9", color: "#64748b", label: c.statut };
                return (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: INDIGO_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="16" height="16" fill="none" stroke={INDIGO} strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{c.titre}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{c.client_nom || "—"} · {fmtDate(c.date_debut)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: INDIGO, fontSize: 13 }}>{(c.budget || 0).toLocaleString("fr-FR")} GNF</div>
                      <span style={{ fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6 }}>{sc.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!dash.recentContracts?.length && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
              <div style={{ fontSize: 13 }}>Aucune donnée. Commencez par ajouter des employés et des clients.</div>
            </div>
          )}
        </div>
      )}

      {/* ── EMPLOYÉS ── */}
      {tab === "employees" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>👔 Employés ({employees.length})</h2>
            <button onClick={() => setShowAddEmployee(!showAddEmployee)} style={btn(INDIGO)}>{showAddEmployee ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddEmployee && (
            <div style={{ background: INDIGO_BG, border: `1px solid ${INDIGO_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom *" value={emForm.nom} onChange={e => setEmForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Prénom" value={emForm.prenom} onChange={e => setEmForm(p => ({ ...p, prenom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={emForm.telephone} onChange={e => setEmForm(p => ({ ...p, telephone: e.target.value }))} />
                <input style={inp} placeholder="Numéro H" value={emForm.numero_h} onChange={e => setEmForm(p => ({ ...p, numero_h: e.target.value }))} />
                <input style={inp} placeholder="Poste (ex: Comptable)" value={emForm.poste} onChange={e => setEmForm(p => ({ ...p, poste: e.target.value }))} />
                <input style={inp} placeholder="Département" value={emForm.departement} onChange={e => setEmForm(p => ({ ...p, departement: e.target.value }))} />
              </div>
              <button onClick={handleAddEmployee} disabled={saving} style={btn(INDIGO)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          {employees.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun employé enregistré</div>
          ) : employees.map(e => (
            <div key={e.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{e.nom} {e.prenom}</div>
                  {e.telephone && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>📞 {e.telephone}</div>}
                  {e.departement && <div style={{ fontSize: 12, color: "#64748b" }}>🏬 {e.departement}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: INDIGO_BG, color: INDIGO, padding: "3px 10px", borderRadius: 6, border: `1px solid ${INDIGO_BORDER}` }}>{e.poste}</span>
                  <button onClick={async () => { await del(`${BASE(tenantCode!)}/employees/${e.id}`); setEmployees(es => es.filter(x => x.id !== e.id)); }}
                    style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Retirer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CLIENTS ── */}
      {tab === "clients" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>🤝 Clients ({clients.length})</h2>
            <button onClick={() => setShowAddClient(!showAddClient)} style={btn(INDIGO)}>{showAddClient ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddClient && (
            <div style={{ background: INDIGO_BG, border: `1px solid ${INDIGO_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom *" value={clForm.nom} onChange={e => setClForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={clForm.telephone} onChange={e => setClForm(p => ({ ...p, telephone: e.target.value }))} />
                <input style={inp} placeholder="Adresse" value={clForm.adresse} onChange={e => setClForm(p => ({ ...p, adresse: e.target.value }))} />
                <input style={inp} placeholder="Secteur d'activité" value={clForm.secteur} onChange={e => setClForm(p => ({ ...p, secteur: e.target.value }))} />
              </div>
              <button onClick={handleAddClient} disabled={saving} style={btn(INDIGO)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          {clients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun client enregistré</div>
          ) : clients.map(c => (
            <div key={c.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{c.nom}</div>
                  {c.telephone && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>📞 {c.telephone}</div>}
                  {c.adresse && <div style={{ fontSize: 12, color: "#64748b" }}>📍 {c.adresse}</div>}
                  {c.secteur && <div style={{ fontSize: 12, color: "#64748b" }}>🏭 {c.secteur}</div>}
                </div>
                <button onClick={async () => { await del(`${BASE(tenantCode!)}/clients/${c.id}`); setClients(cs => cs.filter(x => x.id !== c.id)); }}
                  style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  Retirer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CONTRATS / PROJETS ── */}
      {tab === "contracts" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📑 Contrats / Projets ({contracts.length})</h2>
            <button onClick={() => setShowAddContract(!showAddContract)} style={btn(INDIGO)}>{showAddContract ? "✕ Annuler" : "+ Nouveau"}</button>
          </div>
          {showAddContract && (
            <div style={{ background: INDIGO_BG, border: `1px solid ${INDIGO_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Titre *" value={ctForm.titre} onChange={e => setCtForm(p => ({ ...p, titre: e.target.value }))} />
                <input style={inp} placeholder="Nom client" value={ctForm.client_nom} onChange={e => setCtForm(p => ({ ...p, client_nom: e.target.value }))} />
                <input style={inp} placeholder="Budget (GNF)" type="number" value={ctForm.budget} onChange={e => setCtForm(p => ({ ...p, budget: e.target.value }))} />
                <select style={inp} value={ctForm.statut} onChange={e => setCtForm(p => ({ ...p, statut: e.target.value }))}>
                  <option value="planifie">Planifié</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="annule">Annulé</option>
                </select>
                <div>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Début</label>
                  <input style={inp} type="date" value={ctForm.date_debut} onChange={e => setCtForm(p => ({ ...p, date_debut: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Fin (optionnel)</label>
                  <input style={inp} type="date" value={ctForm.date_fin} onChange={e => setCtForm(p => ({ ...p, date_fin: e.target.value }))} />
                </div>
              </div>
              <textarea style={{ ...inp, resize: "vertical", minHeight: 64, marginBottom: 10 }} placeholder="Description…" value={ctForm.description} onChange={e => setCtForm(p => ({ ...p, description: e.target.value }))} />
              <button onClick={handleAddContract} disabled={saving} style={btn(INDIGO)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          {contracts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun contrat enregistré</div>
          ) : contracts.map(c => {
            const sc = STATUT_COLORS[c.statut] || { bg: "#f1f5f9", color: "#64748b", label: c.statut };
            return (
              <div key={c.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{c.titre}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6 }}>{sc.label}</span>
                    </div>
                    {c.client_nom && <div style={{ fontSize: 12, color: "#64748b" }}>🤝 {c.client_nom}</div>}
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{fmtDate(c.date_debut)}{c.date_fin ? ` → ${fmtDate(c.date_fin)}` : ""}</div>
                    {c.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{c.description}</div>}
                  </div>
                  <div style={{ marginLeft: 12, textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: INDIGO, marginBottom: 6 }}>{(c.budget || 0).toLocaleString("fr-FR")} GNF</div>
                    <select
                      value={c.statut}
                      onChange={async e => { await patchStatut(`${BASE(tenantCode!)}/contracts/${c.id}/statut`, e.target.value); setContracts(cs => cs.map(x => x.id === c.id ? { ...x, statut: e.target.value } : x)); }}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, cursor: "pointer" }}>
                      <option value="planifie">Planifié</option>
                      <option value="en_cours">En cours</option>
                      <option value="termine">Terminé</option>
                      <option value="suspendu">Suspendu</option>
                      <option value="annule">Annulé</option>
                    </select>
                    <br />
                    <button onClick={async () => { await del(`${BASE(tenantCode!)}/contracts/${c.id}`); setContracts(cs => cs.filter(x => x.id !== c.id)); }}
                      style={{ marginTop: 6, padding: "4px 10px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ANNONCES ── */}
      {tab === "announcements" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📢 Annonces ({announcements.length})</h2>
            <button onClick={() => setShowAddAnn(!showAddAnn)} style={btn(INDIGO)}>{showAddAnn ? "✕ Annuler" : "+ Publier"}</button>
          </div>
          {showAddAnn && (
            <div style={{ background: INDIGO_BG, border: `1px solid ${INDIGO_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <input style={{ ...inp, marginBottom: 10 }} placeholder="Titre *" value={anForm.titre} onChange={e => setAnForm(p => ({ ...p, titre: e.target.value }))} />
              <textarea style={{ ...inp, resize: "vertical", minHeight: 80, marginBottom: 10 }} placeholder="Contenu *" value={anForm.contenu} onChange={e => setAnForm(p => ({ ...p, contenu: e.target.value }))} />
              <select style={{ ...inp, marginBottom: 10 }} value={anForm.type} onChange={e => setAnForm(p => ({ ...p, type: e.target.value }))}>
                <option value="general">Général</option>
                <option value="rh">RH / Personnel</option>
                <option value="financier">Financier</option>
                <option value="reunion">Réunion</option>
                <option value="urgent">Urgent</option>
              </select>
              <button onClick={handleAddAnn} disabled={saving} style={btn(INDIGO)}>{saving ? "Publication…" : "Publier"}</button>
            </div>
          )}
          {announcements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune annonce publiée</div>
          ) : announcements.map(a => (
            <div key={a.id} style={{ ...card, borderLeft: `4px solid ${INDIGO}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{a.titre}</div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 8 }}>{a.contenu}</div>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#94a3b8" }}>
                    <span style={{ background: INDIGO_BG, color: INDIGO, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{a.type}</span>
                    <span>{fmtDate(a.created_at)}</span>
                  </div>
                </div>
                <button onClick={async () => { await del(`${BASE(tenantCode!)}/announcements/${a.id}`); setAnnouncements(as => as.filter(x => x.id !== a.id)); }}
                  style={{ marginLeft: 12, padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  Archiver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
