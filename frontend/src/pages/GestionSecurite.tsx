import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/security-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "agents" | "missions" | "clients" | "announcements";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const SLATE = "#475569";
const SLATE_BG = "#f8fafc";
const SLATE_BORDER = "#cbd5e1";

const STATUT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  en_cours:  { bg: "#eff6ff", color: "#1d4ed8", label: "En cours" },
  terminee:  { bg: "#f0fdf0", color: "#156315", label: "Terminée" },
  annulee:   { bg: "#fff1f2", color: "#be123c", label: "Annulée" },
  planifiee: { bg: "#f5f3ff", color: "#7c3aed", label: "Planifiée" },
};

export default function GestionSecurite() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddMission, setShowAddMission] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [agForm, setAgForm] = useState({ nom: "", prenom: "", telephone: "", numero_h: "", grade: "Agent", zone: "" });
  const [msForm, setMsForm] = useState({ agent_id: "", agent_nom: "", titre: "", client_nom: "", lieu: "", date_debut: new Date().toISOString().split("T")[0], date_fin: "", statut: "en_cours", notes: "" });
  const [clForm, setClForm] = useState({ nom: "", telephone: "", adresse: "", type_contrat: "ponctuel" });
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
    if (tab === "agents")       fetch(`${BASE(tenantCode)}/agents`,        { headers: h }).then(r => r.json()).then(d => d.success && setAgents(d.agents || []));
    if (tab === "missions")     fetch(`${BASE(tenantCode)}/missions`,      { headers: h }).then(r => r.json()).then(d => d.success && setMissions(d.missions || []));
    if (tab === "clients")      fetch(`${BASE(tenantCode)}/clients`,       { headers: h }).then(r => r.json()).then(d => d.success && setClients(d.clients || []));
    if (tab === "announcements") fetch(`${BASE(tenantCode)}/announcements`, { headers: h }).then(r => r.json()).then(d => d.success && setAnnouncements(d.announcements || []));
  }, [tab, tenantCode, loading]);

  const post = async (url: string, body: object) => {
    setSaving(true);
    const r = await fetch(url, { method: "POST", headers: auth(), body: JSON.stringify(body) });
    const d = await r.json();
    setSaving(false);
    return d;
  };

  const del = async (url: string) => {
    await fetch(url, { method: "DELETE", headers: auth() });
  };

  const patchStatut = async (url: string, statut: string) => {
    await fetch(url, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
  };

  const handleAddAgent = async () => {
    if (!agForm.nom) return;
    const d = await post(`${BASE(tenantCode!)}/agents`, agForm);
    if (d.success) { setShowAddAgent(false); setAgForm({ nom: "", prenom: "", telephone: "", numero_h: "", grade: "Agent", zone: "" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/agents`, { headers: h }).then(r => r.json()).then(d => d.success && setAgents(d.agents || [])); }
  };

  const handleAddMission = async () => {
    if (!msForm.titre) return;
    const d = await post(`${BASE(tenantCode!)}/missions`, msForm);
    if (d.success) { setShowAddMission(false); setMsForm({ agent_id: "", agent_nom: "", titre: "", client_nom: "", lieu: "", date_debut: new Date().toISOString().split("T")[0], date_fin: "", statut: "en_cours", notes: "" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/missions`, { headers: h }).then(r => r.json()).then(d => d.success && setMissions(d.missions || [])); }
  };

  const handleAddClient = async () => {
    if (!clForm.nom) return;
    const d = await post(`${BASE(tenantCode!)}/clients`, clForm);
    if (d.success) { setShowAddClient(false); setClForm({ nom: "", telephone: "", adresse: "", type_contrat: "ponctuel" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/clients`, { headers: h }).then(r => r.json()).then(d => d.success && setClients(d.clients || [])); }
  };

  const handleAddAnn = async () => {
    if (!anForm.titre || !anForm.contenu) return;
    const d = await post(`${BASE(tenantCode!)}/announcements`, anForm);
    if (d.success) { setShowAddAnn(false); setAnForm({ titre: "", contenu: "", type: "general" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/announcements`, { headers: h }).then(r => r.json()).then(d => d.success && setAnnouncements(d.announcements || [])); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: "4px solid #e2e8f0", borderTopColor: SLATE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate("/gestion-interne")} style={{ marginTop: 16, padding: "10px 24px", background: SLATE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Retour</button>
    </div>
  );

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard",     label: "Dashboard",   emoji: "📊" },
    { id: "agents",        label: "Agents",       emoji: "👮" },
    { id: "missions",      label: "Missions",     emoji: "🎯" },
    { id: "clients",       label: "Clients",      emoji: "🏢" },
    { id: "announcements", label: "Annonces",     emoji: "📢" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "10px 20px", background: bg, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 });
  const card: React.CSSProperties = { background: "white", border: `1px solid ${SLATE_BORDER}`, borderRadius: 12, padding: "16px 18px", marginBottom: 10 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,#334155,#475569)`, borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 44 }}>🛡️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: "white", fontSize: 20 }}>{tenant?.name || "Agence de Sécurité"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Code : {tenantCode} · Gestion Interne</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate(`/securite/${tenantCode}`)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🌐 Vitrine</button>
          <button onClick={() => navigate(-1 as any)} style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>← Retour</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", background: tab === t.id ? SLATE : "#f1f5f9", color: tab === t.id ? "white" : "#64748b", transition: "all 0.15s" }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dash && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Agents actifs", value: dash.totalAgents ?? 0, color: "#334155", bg: "#f8fafc",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
              { label: "Missions en cours", value: dash.missionsEnCours ?? 0, color: "#1d4ed8", bg: "#eff6ff",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
              { label: "Clients actifs", value: dash.totalClients ?? 0, color: "#0e7490", bg: "#ecfeff",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
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
          {/* Ops Banner */}
          <div style={{ background: "linear-gradient(135deg,#1e293b,#334155)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, color: "white" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 4 }}>État opérationnel</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{dash.missionsEnCours ?? 0} mission{(dash.missionsEnCours ?? 0) !== 1 ? "s" : ""} en cours</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{dash.totalAgents ?? 0} agent{(dash.totalAgents ?? 0) !== 1 ? "s" : ""} déployés · {dash.totalClients ?? 0} client{(dash.totalClients ?? 0) !== 1 ? "s" : ""} protégés</div>
            </div>
          </div>
          {/* Quick Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Ajouter agent",  icon: "👮", tab: "agents" as Tab },
              { label: "Nouvelle mission", icon: "🎯", tab: "missions" as Tab },
              { label: "Nouveau client", icon: "🏢", tab: "clients" as Tab },
              { label: "Annonce",        icon: "📢", tab: "announcements" as Tab },
            ].map(a => (
              <button key={a.label} onClick={() => setTab(a.tab)}
                style={{ background: "white", border: `1px solid ${SLATE_BORDER}`, borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                onMouseOver={e => (e.currentTarget.style.borderColor = SLATE)}
                onMouseOut={e => (e.currentTarget.style.borderColor = SLATE_BORDER)}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{a.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{a.label}</div>
              </button>
            ))}
          </div>
          {/* Recent Missions */}
          <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Missions récentes</h3>
              <button onClick={() => setTab("missions")} style={{ fontSize: 12, color: SLATE, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir toutes →</button>
            </div>
            {(dash.recentMissions?.length ?? 0) === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 14 }}>Aucune mission récente</div>
            ) : dash.recentMissions.map((m: any) => {
              const sc = STATUT_COLORS[m.statut] || { bg: "#f1f5f9", color: "#64748b", label: m.statut };
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🎯</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.titre}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{m.client_nom || "—"} · {fmtDate(m.date_debut)}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{sc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AGENTS ── */}
      {tab === "agents" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>👮 Agents ({agents.length})</h2>
            <button onClick={() => setShowAddAgent(!showAddAgent)} style={btn(SLATE)}>{showAddAgent ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddAgent && (
            <div style={{ background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom *" value={agForm.nom} onChange={e => setAgForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Prénom" value={agForm.prenom} onChange={e => setAgForm(p => ({ ...p, prenom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={agForm.telephone} onChange={e => setAgForm(p => ({ ...p, telephone: e.target.value }))} />
                <input style={inp} placeholder="Numéro H" value={agForm.numero_h} onChange={e => setAgForm(p => ({ ...p, numero_h: e.target.value }))} />
                <select style={inp} value={agForm.grade} onChange={e => setAgForm(p => ({ ...p, grade: e.target.value }))}>
                  <option value="Agent">Agent</option>
                  <option value="Chef d'équipe">Chef d'équipe</option>
                  <option value="Superviseur">Superviseur</option>
                  <option value="Responsable">Responsable</option>
                  <option value="Directeur">Directeur</option>
                </select>
                <input style={inp} placeholder="Zone / Secteur" value={agForm.zone} onChange={e => setAgForm(p => ({ ...p, zone: e.target.value }))} />
              </div>
              <button onClick={handleAddAgent} disabled={saving} style={btn(SLATE)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          {agents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun agent enregistré</div>
          ) : agents.map(a => (
            <div key={a.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{a.nom} {a.prenom}</div>
                  {a.telephone && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>📞 {a.telephone}</div>}
                  {a.zone && <div style={{ fontSize: 12, color: "#64748b" }}>📍 Zone : {a.zone}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: SLATE_BG, color: SLATE, padding: "3px 10px", borderRadius: 6, border: `1px solid ${SLATE_BORDER}` }}>{a.grade}</span>
                  <button onClick={async () => { await del(`${BASE(tenantCode!)}/agents/${a.id}`); setAgents(as => as.filter(x => x.id !== a.id)); }}
                    style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Retirer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MISSIONS ── */}
      {tab === "missions" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>🎯 Missions ({missions.length})</h2>
            <button onClick={() => setShowAddMission(!showAddMission)} style={btn(SLATE)}>{showAddMission ? "✕ Annuler" : "+ Nouvelle mission"}</button>
          </div>
          {showAddMission && (
            <div style={{ background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Titre de la mission *" value={msForm.titre} onChange={e => setMsForm(p => ({ ...p, titre: e.target.value }))} />
                <input style={inp} placeholder="Nom agent" value={msForm.agent_nom} onChange={e => setMsForm(p => ({ ...p, agent_nom: e.target.value }))} />
                <input style={inp} placeholder="Client / Entreprise" value={msForm.client_nom} onChange={e => setMsForm(p => ({ ...p, client_nom: e.target.value }))} />
                <input style={inp} placeholder="Lieu" value={msForm.lieu} onChange={e => setMsForm(p => ({ ...p, lieu: e.target.value }))} />
                <div>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Début</label>
                  <input style={inp} type="date" value={msForm.date_debut} onChange={e => setMsForm(p => ({ ...p, date_debut: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Fin (optionnel)</label>
                  <input style={inp} type="date" value={msForm.date_fin} onChange={e => setMsForm(p => ({ ...p, date_fin: e.target.value }))} />
                </div>
                <select style={inp} value={msForm.statut} onChange={e => setMsForm(p => ({ ...p, statut: e.target.value }))}>
                  <option value="planifiee">Planifiée</option>
                  <option value="en_cours">En cours</option>
                  <option value="terminee">Terminée</option>
                  <option value="annulee">Annulée</option>
                </select>
              </div>
              <textarea style={{ ...inp, resize: "vertical", minHeight: 64, marginBottom: 10 }} placeholder="Notes…" value={msForm.notes} onChange={e => setMsForm(p => ({ ...p, notes: e.target.value }))} />
              <button onClick={handleAddMission} disabled={saving} style={btn(SLATE)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          {missions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune mission enregistrée</div>
          ) : missions.map(m => {
            const sc = STATUT_COLORS[m.statut] || { bg: "#f1f5f9", color: "#64748b", label: m.statut };
            return (
              <div key={m.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{m.titre}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6 }}>{sc.label}</span>
                    </div>
                    {m.agent_nom && <div style={{ fontSize: 12, color: "#64748b" }}>👮 Agent : {m.agent_nom}</div>}
                    {m.client_nom && <div style={{ fontSize: 12, color: "#64748b" }}>🏢 Client : {m.client_nom}</div>}
                    {m.lieu && <div style={{ fontSize: 12, color: "#64748b" }}>📍 {m.lieu}</div>}
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{fmtDate(m.date_debut)}{m.date_fin ? ` → ${fmtDate(m.date_fin)}` : ""}</div>
                    {m.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{m.notes}</div>}
                  </div>
                  <div style={{ marginLeft: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    <select
                      value={m.statut}
                      onChange={async e => { await patchStatut(`${BASE(tenantCode!)}/missions/${m.id}/statut`, e.target.value); setMissions(ms => ms.map(x => x.id === m.id ? { ...x, statut: e.target.value } : x)); }}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, cursor: "pointer" }}>
                      <option value="planifiee">Planifiée</option>
                      <option value="en_cours">En cours</option>
                      <option value="terminee">Terminée</option>
                      <option value="annulee">Annulée</option>
                    </select>
                    <button onClick={async () => { await del(`${BASE(tenantCode!)}/missions/${m.id}`); setMissions(ms => ms.filter(x => x.id !== m.id)); }}
                      style={{ padding: "4px 10px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CLIENTS ── */}
      {tab === "clients" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>🏢 Clients ({clients.length})</h2>
            <button onClick={() => setShowAddClient(!showAddClient)} style={btn(SLATE)}>{showAddClient ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddClient && (
            <div style={{ background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom *" value={clForm.nom} onChange={e => setClForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={clForm.telephone} onChange={e => setClForm(p => ({ ...p, telephone: e.target.value }))} />
                <input style={inp} placeholder="Adresse" value={clForm.adresse} onChange={e => setClForm(p => ({ ...p, adresse: e.target.value }))} />
                <select style={inp} value={clForm.type_contrat} onChange={e => setClForm(p => ({ ...p, type_contrat: e.target.value }))}>
                  <option value="ponctuel">Ponctuel</option>
                  <option value="mensuel">Mensuel</option>
                  <option value="annuel">Annuel</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
              <button onClick={handleAddClient} disabled={saving} style={btn(SLATE)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
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
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: SLATE_BG, color: SLATE, padding: "3px 10px", borderRadius: 6, border: `1px solid ${SLATE_BORDER}` }}>{c.type_contrat}</span>
                  <button onClick={async () => { await del(`${BASE(tenantCode!)}/clients/${c.id}`); setClients(cs => cs.filter(x => x.id !== c.id)); }}
                    style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Retirer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ANNONCES ── */}
      {tab === "announcements" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📢 Annonces ({announcements.length})</h2>
            <button onClick={() => setShowAddAnn(!showAddAnn)} style={btn(SLATE)}>{showAddAnn ? "✕ Annuler" : "+ Publier"}</button>
          </div>
          {showAddAnn && (
            <div style={{ background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <input style={{ ...inp, marginBottom: 10 }} placeholder="Titre *" value={anForm.titre} onChange={e => setAnForm(p => ({ ...p, titre: e.target.value }))} />
              <textarea style={{ ...inp, resize: "vertical", minHeight: 80, marginBottom: 10 }} placeholder="Contenu *" value={anForm.contenu} onChange={e => setAnForm(p => ({ ...p, contenu: e.target.value }))} />
              <select style={{ ...inp, marginBottom: 10 }} value={anForm.type} onChange={e => setAnForm(p => ({ ...p, type: e.target.value }))}>
                <option value="general">Général</option>
                <option value="alerte">Alerte sécurité</option>
                <option value="consigne">Consigne</option>
                <option value="recrutement">Recrutement</option>
                <option value="urgent">Urgent</option>
              </select>
              <button onClick={handleAddAnn} disabled={saving} style={btn(SLATE)}>{saving ? "Publication…" : "Publier"}</button>
            </div>
          )}
          {announcements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune annonce publiée</div>
          ) : announcements.map(a => (
            <div key={a.id} style={{ ...card, borderLeft: `4px solid ${SLATE}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{a.titre}</div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 8 }}>{a.contenu}</div>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#94a3b8" }}>
                    <span style={{ background: SLATE_BG, color: SLATE, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{a.type}</span>
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
