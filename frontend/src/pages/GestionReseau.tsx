import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/reseau-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "membres" | "projets" | "cotisations" | "annonces";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const BLUE = "#2563eb";
const BLUE_BG = "#eff6ff";

const ROLES = ["président", "vice-président", "secrétaire", "trésorier", "responsable", "membre", "observateur"];
const STATUTS = ["en_cours", "terminé", "suspendu", "planifié"];
const STATUT_LABELS: Record<string, string> = { en_cours: "En cours", terminé: "Terminé", suspendu: "Suspendu", planifié: "Planifié" };
const STATUT_COLORS: Record<string, string> = { en_cours: "#2563eb", terminé: "#16a34a", suspendu: "#dc2626", planifié: "#d97706" };
const COT_TYPES = ["mensuelle", "trimestrielle", "annuelle", "ponctuelle"];

export default function GestionReseau() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [membres, setMembres] = useState<any[]>([]);
  const [projets, setProjets] = useState<any[]>([]);
  const [cotisations, setCotisations] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddMembre, setShowAddMembre] = useState(false);
  const [showAddProjet, setShowAddProjet] = useState(false);
  const [showAddCot, setShowAddCot] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [mForm, setMForm] = useState({ nom: "", prenom: "", telephone: "", email: "", numero_h: "", role: "membre" });
  const [pForm, setPForm] = useState({ titre: "", description: "", responsable: "", date_debut: "", date_fin: "", statut: "en_cours" });
  const [cForm, setCForm] = useState({ membre_nom: "", montant: "", type_cot: "mensuelle", periode: "" });
  const [aForm, setAForm] = useState({ titre: "", contenu: "", type: "general" });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadDashboard();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode) return;
    if (tab === "membres") loadMembres();
    if (tab === "projets") loadProjets();
    if (tab === "cotisations") loadCotisations();
    if (tab === "annonces") loadAnnonces();
  }, [tab, tenantCode]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        fetch(`${BASE(tenantCode!)}/info`, { headers: auth() }),
        fetch(`${BASE(tenantCode!)}/dashboard`, { headers: auth() }),
      ]);
      const tData = await tRes.json();
      if (!tData.success) { setError(tData.message || "Accès refusé"); setLoading(false); return; }
      setTenant(tData.tenant);
      const dData = await dRes.json();
      if (dData.success) setDash(dData);
    } catch { setError("Erreur de connexion au serveur"); }
    setLoading(false);
  }

  async function loadMembres() { const r = await fetch(`${BASE(tenantCode!)}/members`, { headers: auth() }); const d = await r.json(); if (d.success) setMembres(d.members || []); }
  async function loadProjets() { const r = await fetch(`${BASE(tenantCode!)}/projets`, { headers: auth() }); const d = await r.json(); if (d.success) setProjets(d.projets || []); }
  async function loadCotisations() { const r = await fetch(`${BASE(tenantCode!)}/cotisations`, { headers: auth() }); const d = await r.json(); if (d.success) setCotisations(d.cotisations || []); }
  async function loadAnnonces() { const r = await fetch(`${BASE(tenantCode!)}/announcements`, { headers: auth() }); const d = await r.json(); if (d.success) setAnnonces(d.announcements || []); }

  async function saveMembre() {
    if (!mForm.nom) return;
    setSaving(true);
    const r = await fetch(`${BASE(tenantCode!)}/members`, { method: "POST", headers: auth(), body: JSON.stringify(mForm) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { setShowAddMembre(false); setMForm({ nom: "", prenom: "", telephone: "", email: "", numero_h: "", role: "membre" }); loadMembres(); }
  }

  async function deleteMembre(id: number) {
    if (!confirm("Retirer ce membre ?")) return;
    await fetch(`${BASE(tenantCode!)}/members/${id}`, { method: "DELETE", headers: auth() });
    loadMembres();
  }

  async function saveProjet() {
    if (!pForm.titre) return;
    setSaving(true);
    const r = await fetch(`${BASE(tenantCode!)}/projets`, { method: "POST", headers: auth(), body: JSON.stringify(pForm) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { setShowAddProjet(false); setPForm({ titre: "", description: "", responsable: "", date_debut: "", date_fin: "", statut: "en_cours" }); loadProjets(); }
  }

  async function updateStatutProjet(id: number, statut: string) {
    await fetch(`${BASE(tenantCode!)}/projets/${id}/statut`, { method: "PUT", headers: auth(), body: JSON.stringify({ statut }) });
    loadProjets(); loadDashboard();
  }

  async function deleteProjet(id: number) {
    if (!confirm("Supprimer ce projet ?")) return;
    await fetch(`${BASE(tenantCode!)}/projets/${id}`, { method: "DELETE", headers: auth() });
    loadProjets();
  }

  async function saveCotisation() {
    if (!cForm.montant) return;
    setSaving(true);
    const r = await fetch(`${BASE(tenantCode!)}/cotisations`, { method: "POST", headers: auth(), body: JSON.stringify({ ...cForm, montant: +cForm.montant }) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { setShowAddCot(false); setCForm({ membre_nom: "", montant: "", type_cot: "mensuelle", periode: "" }); loadCotisations(); loadDashboard(); }
  }

  async function saveAnnonce() {
    if (!aForm.titre || !aForm.contenu) return;
    setSaving(true);
    const r = await fetch(`${BASE(tenantCode!)}/announcements`, { method: "POST", headers: auth(), body: JSON.stringify(aForm) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { setShowAddAnn(false); setAForm({ titre: "", contenu: "", type: "general" }); loadAnnonces(); }
  }

  async function deleteAnnonce(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`${BASE(tenantCode!)}/announcements/${id}`, { method: "DELETE", headers: auth() });
    loadAnnonces();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 32, height: 32, border: `3px solid #bfdbfe`, borderTopColor: BLUE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate("/gestion-interne")} style={{ padding: "10px 20px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>← Retour</button>
    </div>
  );

  const isAdminViewing = isAdmin(user) && user?.numeroH !== tenant?.owner_numero_h;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard",   label: "Dashboard",    icon: "📊" },
    { id: "membres",     label: "Membres",       icon: "👥" },
    { id: "projets",     label: "Projets",       icon: "📋" },
    { id: "cotisations", label: "Cotisations",   icon: "💰" },
    { id: "annonces",    label: "Annonces",      icon: "📢" },
  ];

  const inp = { width: "100%", border: "1px solid #bfdbfe", borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      {/* Admin banner */}
      {isAdminViewing && (
        <div style={{ background: BLUE, color: "white", padding: "8px 20px", fontSize: 12, fontWeight: 600, borderRadius: 8, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          👁 Mode Administrateur — Consultation
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e40af,#2563eb)", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🌐</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "white" }}>{tenant?.name || "Mon Réseau"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{tenantCode} · Gestion Réseau</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate(`/reseau-vitrine/${tenantCode}`)} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🌐 Vitrine</button>
          <button onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Retour</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f8fafc", borderRadius: 10, padding: 4, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, minWidth: 80, padding: "8px 4px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? "white" : "transparent", color: tab === t.id ? BLUE : "#64748b", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none", whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dash && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Membres",         value: dash.totalMembers,       icon: "👥", color: BLUE },
              { label: "Projets en cours",value: dash.projetsEnCours,     icon: "📋", color: "#7c3aed" },
              { label: "Cotisations (an)",value: fmtMoney(dash.cotisationsAnnee), icon: "💰", color: "#16a34a", small: true },
              { label: "Annonces actives",value: dash.totalAnnouncements, icon: "📢", color: "#d97706" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: s.small ? 14 : 26, color: s.color, marginTop: 6 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {dash.recentAnnouncements?.length > 0 && (
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Dernières annonces</div>
              {dash.recentAnnouncements.map((a: any) => (
                <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.titre}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.5 }}>{a.contenu}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{fmtDate(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MEMBRES ── */}
      {tab === "membres" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Membres ({membres.length})</div>
            <button onClick={() => setShowAddMembre(true)} style={{ padding: "8px 16px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
          </div>
          {showAddMembre && (
            <div style={{ background: BLUE_BG, border: "1px solid #bfdbfe", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouveau membre</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["Nom *", "nom"], ["Prénom", "prenom"], ["Téléphone", "telephone"], ["Email", "email"], ["NuméroH", "numero_h"]].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>{label}</div>
                    <input value={(mForm as any)[key]} onChange={e => setMForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Rôle</div>
                  <select value={mForm.role} onChange={e => setMForm(f => ({ ...f, role: e.target.value }))} style={inp}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveMembre} disabled={saving} style={{ padding: "8px 20px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddMembre(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {membres.map(m => (
              <div key={m.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: BLUE_BG, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: BLUE, fontSize: 14, flexShrink: 0 }}>{m.nom?.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.prenom ? `${m.prenom} ${m.nom}` : m.nom}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{m.telephone || m.email || ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ padding: "2px 10px", background: BLUE_BG, color: BLUE, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{m.role}</span>
                  <button onClick={() => deleteMembre(m.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>Retirer</button>
                </div>
              </div>
            ))}
            {membres.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun membre enregistré.</div>}
          </div>
        </div>
      )}

      {/* ── PROJETS ── */}
      {tab === "projets" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Projets ({projets.length})</div>
            <button onClick={() => setShowAddProjet(true)} style={{ padding: "8px 16px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Nouveau projet</button>
          </div>
          {showAddProjet && (
            <div style={{ background: BLUE_BG, border: "1px solid #bfdbfe", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouveau projet</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Titre *</div>
                  <input value={pForm.titre} onChange={e => setPForm(f => ({ ...f, titre: e.target.value }))} style={inp} placeholder="Ex : Construction du siège social" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Responsable</div>
                  <input value={pForm.responsable} onChange={e => setPForm(f => ({ ...f, responsable: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Statut</div>
                  <select value={pForm.statut} onChange={e => setPForm(f => ({ ...f, statut: e.target.value }))} style={inp}>
                    {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Date début</div>
                  <input type="date" value={pForm.date_debut} onChange={e => setPForm(f => ({ ...f, date_debut: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Date fin prévue</div>
                  <input type="date" value={pForm.date_fin} onChange={e => setPForm(f => ({ ...f, date_fin: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Description</div>
                  <textarea value={pForm.description} onChange={e => setPForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveProjet} disabled={saving} style={{ padding: "8px 20px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Créer"}</button>
                <button onClick={() => setShowAddProjet(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projets.map(p => (
              <div key={p.id} style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9", borderLeft: `3px solid ${STATUT_COLORS[p.statut] || BLUE}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.titre}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${STATUT_COLORS[p.statut]}15`, color: STATUT_COLORS[p.statut] }}>{STATUT_LABELS[p.statut] || p.statut}</span>
                      {p.responsable && <span style={{ fontSize: 12, color: "#64748b" }}>👤 {p.responsable}</span>}
                      {p.date_debut && <span style={{ fontSize: 12, color: "#94a3b8" }}>{fmtDate(p.date_debut)}{p.date_fin ? ` → ${fmtDate(p.date_fin)}` : ""}</span>}
                    </div>
                    {p.description && <div style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.5 }}>{p.description}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                    <select value={p.statut} onChange={e => updateStatutProjet(p.id, e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer", outline: "none" }}>
                      {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
                    </select>
                    <button onClick={() => deleteProjet(p.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                  </div>
                </div>
              </div>
            ))}
            {projets.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", background: "white", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>Aucun projet créé</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Lancez votre premier projet collectif</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COTISATIONS ── */}
      {tab === "cotisations" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Cotisations ({cotisations.length})</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Total encaissé : {fmtMoney(cotisations.reduce((s, c) => s + +c.montant, 0))}</div>
            </div>
            <button onClick={() => setShowAddCot(true)} style={{ padding: "8px 16px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Enregistrer</button>
          </div>
          {showAddCot && (
            <div style={{ background: BLUE_BG, border: "1px solid #bfdbfe", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouvelle cotisation</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Nom du membre</div>
                  <input value={cForm.membre_nom} onChange={e => setCForm(f => ({ ...f, membre_nom: e.target.value }))} style={inp} placeholder="Anonyme si vide" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Montant (GNF) *</div>
                  <input type="number" value={cForm.montant} onChange={e => setCForm(f => ({ ...f, montant: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Type</div>
                  <select value={cForm.type_cot} onChange={e => setCForm(f => ({ ...f, type_cot: e.target.value }))} style={inp}>
                    {COT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Période (ex : Janvier 2025)</div>
                  <input value={cForm.periode} onChange={e => setCForm(f => ({ ...f, periode: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveCotisation} disabled={saving} style={{ padding: "8px 20px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddCot(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cotisations.map(c => (
              <div key={c.id} style={{ background: "white", borderRadius: 10, padding: "12px 16px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.membre_nom || "Anonyme"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.type_cot}{c.periode ? ` · ${c.periode}` : ""} · {fmtDate(c.date_paiement)}</div>
                </div>
                <div style={{ fontWeight: 700, color: "#16a34a", fontSize: 15 }}>{fmtMoney(c.montant)}</div>
              </div>
            ))}
            {cotisations.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune cotisation enregistrée.</div>}
          </div>
        </div>
      )}

      {/* ── ANNONCES ── */}
      {tab === "annonces" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Annonces ({annonces.length})</div>
            <button onClick={() => setShowAddAnn(true)} style={{ padding: "8px 16px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Publier</button>
          </div>
          {showAddAnn && (
            <div style={{ background: BLUE_BG, border: "1px solid #bfdbfe", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouvelle annonce</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Titre *</div>
                <input value={aForm.titre} onChange={e => setAForm(f => ({ ...f, titre: e.target.value }))} style={inp} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Contenu *</div>
                <textarea value={aForm.contenu} onChange={e => setAForm(f => ({ ...f, contenu: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", marginBottom: 4 }}>Type</div>
                <select value={aForm.type} onChange={e => setAForm(f => ({ ...f, type: e.target.value }))} style={{ ...inp, width: "auto" }}>
                  {["general", "urgent", "événement", "décision", "autre"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveAnnonce} disabled={saving} style={{ padding: "8px 20px", background: BLUE, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Publier"}</button>
                <button onClick={() => setShowAddAnn(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {annonces.map(a => (
              <div key={a.id} style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.titre}</div>
                  <button onClick={() => deleteAnnonce(a.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Supprimer</button>
                </div>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{a.contenu}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <span style={{ padding: "1px 8px", background: BLUE_BG, color: BLUE, borderRadius: 20, fontSize: 11 }}>{a.type}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(a.created_at)}</span>
                </div>
              </div>
            ))}
            {annonces.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune annonce publiée.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
