import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";

const API_ROOT = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API_ROOT}/api/artisan-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "interventions" | "services" | "clients" | "announcements";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const COLOR     = "#d97706";
const COLOR_BG  = "#fffbeb";
const COLOR_BDR = "#fde68a";
const GRADIENT  = "linear-gradient(135deg,#d97706,#f59e0b)";

const STATUT_INT: Record<string, { bg: string; color: string; label: string }> = {
  en_attente:   { bg: "#fffbeb", color: "#b45309",  label: "En attente" },
  confirmee:    { bg: "#eff6ff", color: "#2563eb",  label: "Confirmée" },
  en_cours:     { bg: "#f0fdf0", color: "#1a8f1a",  label: "En cours" },
  terminee:     { bg: "#f0fdf0", color: "#156315",  label: "Terminée" },
  annulee:      { bg: "#fef2f2", color: "#dc2626",  label: "Annulée" },
};
const PRIORITE: Record<string, { color: string; label: string }> = {
  urgente: { color: "#dc2626", label: "🔴 Urgente" },
  haute:   { color: "#ea580c", label: "🟠 Haute" },
  normale: { color: "#1a8f1a", label: "🟢 Normale" },
  basse:   { color: "#64748b", label: "⚪ Basse" },
};

export default function GestionArtisan() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab]                       = useState<Tab>("dashboard");
  const [tenant, setTenant]                 = useState<any>(null);
  const [dash, setDash]                     = useState<any>(null);
  const [interventions, setInterventions]   = useState<any[]>([]);
  const [services, setServices]             = useState<any[]>([]);
  const [clients, setClients]               = useState<any[]>([]);
  const [announcements, setAnnouncements]   = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [saving, setSaving]                 = useState(false);
  const [filterStatut, setFilterStatut]     = useState("tous");

  const [showAddInt, setShowAddInt]         = useState(false);
  const [showAddSvc, setShowAddSvc]         = useState(false);
  const [showAddCli, setShowAddCli]         = useState(false);
  const [showAddAnn, setShowAddAnn]         = useState(false);

  const [intForm, setIntForm] = useState({ client_id: "", service_id: "", titre: "", description: "", adresse: "", date_debut: "", cout_estime: "", priorite: "normale", notes: "" });
  const [svcForm, setSvcForm] = useState({ nom: "", categorie: "Plomberie", prix_base: "", description: "", zone_intervention: "" });
  const [cliForm, setCliForm] = useState({ nom: "", telephone: "", adresse: "", email: "" });
  const [annForm, setAnnForm] = useState({ titre: "", contenu: "", type: "general" });

  const b = BASE;

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadAll();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || loading) return;
    if (tab === "interventions") { loadInterventions(); loadServices(); loadClients(); }
    if (tab === "services")      loadServices();
    if (tab === "clients")       loadClients();
    if (tab === "announcements") loadAnnouncements();
  }, [tab, tenantCode, loading]);

  async function loadAll() {
    setLoading(true);
    try {
      const [infoRes, dashRes] = await Promise.all([
        fetch(`${b(tenantCode!)}/info`, { headers: auth() }),
        fetch(`${b(tenantCode!)}/dashboard`, { headers: auth() }),
      ]);
      const info = await infoRes.json();
      if (!info.success) { setError(info.message || "Accès refusé"); setLoading(false); return; }
      setTenant(info.tenant);
      const d = await dashRes.json();
      if (d.success) setDash(d);
    } catch { setError("Erreur de connexion"); }
    setLoading(false);
  }

  async function loadInterventions() {
    const url = filterStatut !== "tous" ? `${b(tenantCode!)}/interventions?statut=${filterStatut}` : `${b(tenantCode!)}/interventions`;
    const r = await fetch(url, { headers: auth() }); const d = await r.json(); if (d.success) setInterventions(d.interventions || []);
  }
  async function loadServices()      { const r = await fetch(`${b(tenantCode!)}/services`,      { headers: auth() }); const d = await r.json(); if (d.success) setServices(d.services || []); }
  async function loadClients()       { const r = await fetch(`${b(tenantCode!)}/clients`,       { headers: auth() }); const d = await r.json(); if (d.success) setClients(d.clients || []); }
  async function loadAnnouncements() { const r = await fetch(`${b(tenantCode!)}/announcements`, { headers: auth() }); const d = await r.json(); if (d.success) setAnnouncements(d.announcements || []); }

  async function saveIntervention() {
    if (!intForm.titre) return alert("Titre requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/interventions`, { method: "POST", headers: auth(), body: JSON.stringify(intForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddInt(false); setIntForm({ client_id: "", service_id: "", titre: "", description: "", adresse: "", date_debut: "", cout_estime: "", priorite: "normale", notes: "" }); loadInterventions(); loadAll(); }
    else alert(d.message);
  }

  async function patchIntervention(id: number, statut: string, cout_reel?: string) {
    const body: any = { statut };
    if (cout_reel !== undefined) body.cout_reel = cout_reel;
    await fetch(`${b(tenantCode!)}/interventions/${id}`, { method: "PATCH", headers: auth(), body: JSON.stringify(body) });
    loadInterventions(); loadAll();
  }

  async function terminerIntervention(id: number) {
    const cout = prompt("Coût réel de l'intervention (GNF) :", "0");
    if (cout === null) return;
    await patchIntervention(id, "terminee", cout);
  }

  async function saveService() {
    if (!svcForm.nom) return alert("Nom requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/services`, { method: "POST", headers: auth(), body: JSON.stringify(svcForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddSvc(false); setSvcForm({ nom: "", categorie: "Plomberie", prix_base: "", description: "", zone_intervention: "" }); loadServices(); }
    else alert(d.message);
  }

  async function deleteService(id: number) {
    if (!confirm("Supprimer ce service ?")) return;
    await fetch(`${b(tenantCode!)}/services/${id}`, { method: "DELETE", headers: auth() });
    loadServices();
  }

  async function saveClient() {
    if (!cliForm.nom) return alert("Nom requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/clients`, { method: "POST", headers: auth(), body: JSON.stringify(cliForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddCli(false); setCliForm({ nom: "", telephone: "", adresse: "", email: "" }); loadClients(); }
    else alert(d.message);
  }

  async function saveAnn() {
    if (!annForm.titre || !annForm.contenu) return alert("Titre et contenu requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/announcements`, { method: "POST", headers: auth(), body: JSON.stringify(annForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddAnn(false); setAnnForm({ titre: "", contenu: "", type: "general" }); loadAnnouncements(); }
    else alert(d.message);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: `4px solid ${COLOR_BDR}`, borderTopColor: COLOR, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2>{error}</h2>
      <button onClick={() => navigate(-1 as any)} style={{ padding: "10px 24px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>← Retour</button>
    </div>
  );

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard",     label: "Dashboard",      emoji: "📊" },
    { id: "interventions", label: "Interventions",  emoji: "🔧" },
    { id: "services",      label: "Services",       emoji: "⚙️" },
    { id: "clients",       label: "Clients",        emoji: "👤" },
    { id: "announcements", label: "Annonces",       emoji: "📣" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
  const btn = (bg: string, color = "white"): React.CSSProperties => ({ padding: "8px 16px", background: bg, color, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px", fontFamily: "system-ui,sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: GRADIENT, borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 40 }}>🔧</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{tenant?.name || "Artisanat & Services"}</h1>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Gestion Interne — Artisan</p>
          </div>
          <button onClick={() => navigate("/gestion-interne")} style={{ ...btn("rgba(255,255,255,0.2)"), marginLeft: "auto", fontSize: 13 }}>← Mes espaces</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, background: tab === t.id ? COLOR : COLOR_BG, color: tab === t.id ? "white" : COLOR }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Services proposés",   val: dash?.totalServices || 0,          emoji: "⚙️" },
              { label: "Interventions actives",val: dash?.interventionsEnCours || 0,  emoji: "🔧", warn: (dash?.interventionsEnCours||0) > 0 },
              { label: "En cours",             val: dash?.enCours || 0,               emoji: "⚒️" },
              { label: "Terminées aujourd'hui",val: dash?.terminéesAujourdhui || 0,   emoji: "✅" },
              { label: "Clients",              val: dash?.totalClients || 0,          emoji: "👤" },
              { label: "CA ce mois",           val: fmtMoney(dash?.caCeMois || 0),   emoji: "💵" },
            ].map(s => (
              <div key={s.label} style={{ background: s.warn ? "#fff7ed" : COLOR_BG, border: `1px solid ${s.warn ? "#fed7aa" : COLOR_BDR}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: s.warn ? "#ea580c" : COLOR }}>{s.val}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {(dash?.recentInterventions?.length > 0) && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Dernières interventions</h3>
              {dash.recentInterventions.map((i: any) => {
                const st = STATUT_INT[i.statut] || STATUT_INT.en_attente;
                const pr = PRIORITE[i.priorite] || PRIORITE.normale;
                return (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{i.titre}</span>
                      {i.client_nom && <span style={{ color: "#64748b" }}> · {i.client_nom}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ color: pr.color, fontSize: 12 }}>{pr.label}</span>
                      <span style={{ background: st.bg, color: st.color, padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* INTERVENTIONS */}
      {tab === "interventions" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>🔧 Interventions</h2>
            <button onClick={() => { setShowAddInt(true); if (!services.length) loadServices(); if (!clients.length) loadClients(); }} style={btn(COLOR)}>+ Nouvelle</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {["tous", "en_attente", "confirmee", "en_cours", "terminee", "annulee"].map(s => (
              <button key={s} onClick={() => { setFilterStatut(s); }} style={{ padding: "4px 12px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 13, background: filterStatut === s ? COLOR : "#f1f5f9", color: filterStatut === s ? "white" : "#374151" }}>
                {s === "tous" ? "Toutes" : STATUT_INT[s]?.label || s}
              </button>
            ))}
          </div>
          {showAddInt && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Titre *</label><input style={inp} value={intForm.titre} onChange={e => setIntForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: Réparation fuite" /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Priorité</label>
                  <select style={inp} value={intForm.priorite} onChange={e => setIntForm(f => ({ ...f, priorite: e.target.value }))}>
                    {["urgente", "haute", "normale", "basse"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Client</label>
                  <select style={inp} value={intForm.client_id} onChange={e => setIntForm(f => ({ ...f, client_id: e.target.value }))}>
                    <option value="">Choisir (optionnel)</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.telephone && `· ${c.telephone}`}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Service</label>
                  <select style={inp} value={intForm.service_id} onChange={e => setIntForm(f => ({ ...f, service_id: e.target.value }))}>
                    <option value="">Choisir (optionnel)</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Adresse d'intervention</label><input style={inp} value={intForm.adresse} onChange={e => setIntForm(f => ({ ...f, adresse: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Date prévue</label><input style={inp} type="date" value={intForm.date_debut} onChange={e => setIntForm(f => ({ ...f, date_debut: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Coût estimé (GNF)</label><input style={inp} type="number" value={intForm.cout_estime} onChange={e => setIntForm(f => ({ ...f, cout_estime: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Description</label><textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={intForm.description} onChange={e => setIntForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveIntervention} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Créer"}</button>
                <button onClick={() => setShowAddInt(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          {interventions.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucune intervention.</p>}
          {interventions.map(int => {
            const st = STATUT_INT[int.statut] || STATUT_INT.en_attente;
            const pr = PRIORITE[int.priorite] || PRIORITE.normale;
            return (
              <div key={int.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{int.titre}</span>
                      <span style={{ color: pr.color, fontSize: 12 }}>{pr.label}</span>
                    </div>
                    {int.client_nom && <div style={{ fontSize: 13, color: "#64748b" }}>👤 {int.client_nom} {int.client_telephone && `· ${int.client_telephone}`}</div>}
                    {int.service_nom && <div style={{ fontSize: 13, color: "#64748b" }}>⚙️ {int.service_nom}</div>}
                    {int.adresse && <div style={{ fontSize: 13, color: "#64748b" }}>📍 {int.adresse}</div>}
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Estimé: {fmtMoney(int.cout_estime)} · Réel: {fmtMoney(int.cout_reel)}</div>
                    {int.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{int.description}</div>}
                  </div>
                  <span style={{ background: st.bg, color: st.color, padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 12 }}>{st.label}</span>
                </div>
                {(int.statut === "en_attente" || int.statut === "confirmee" || int.statut === "en_cours") && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {int.statut === "en_attente" && <button onClick={() => patchIntervention(int.id, "confirmee")} style={btn("#eff6ff", "#2563eb")}>Confirmer</button>}
                    {(int.statut === "en_attente" || int.statut === "confirmee") && <button onClick={() => patchIntervention(int.id, "en_cours")} style={btn("#f0fdf0", "#1a8f1a")}>Démarrer</button>}
                    {int.statut === "en_cours" && <button onClick={() => terminerIntervention(int.id)} style={btn(COLOR)}>Terminer ✓</button>}
                    <button onClick={() => patchIntervention(int.id, "annulee")} style={btn("#fef2f2", "#dc2626")}>Annuler</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SERVICES */}
      {tab === "services" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>⚙️ Services proposés</h2>
            <button onClick={() => setShowAddSvc(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddSvc && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Service *</label><input style={inp} value={svcForm.nom} onChange={e => setSvcForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Réparation plomberie" /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Catégorie</label>
                  <select style={inp} value={svcForm.categorie} onChange={e => setSvcForm(f => ({ ...f, categorie: e.target.value }))}>
                    {["Plomberie", "Électricité", "Menuiserie", "Maçonnerie", "Peinture", "Soudure", "Climatisation", "Jardinage", "Autre"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prix de base (GNF)</label><input style={inp} type="number" value={svcForm.prix_base} onChange={e => setSvcForm(f => ({ ...f, prix_base: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Zone d'intervention</label><input style={inp} value={svcForm.zone_intervention} onChange={e => setSvcForm(f => ({ ...f, zone_intervention: e.target.value }))} placeholder="Ex: Conakry, Matam..." /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Description</label><input style={inp} value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveService} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddSvc(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {services.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun service encore.</p>}
            {services.map(s => (
              <div key={s.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.nom}</div>
                    <div style={{ fontSize: 12, color: COLOR, fontWeight: 600 }}>{s.categorie}</div>
                    {s.zone_intervention && <div style={{ fontSize: 12, color: "#64748b" }}>📍 {s.zone_intervention}</div>}
                    {s.prix_base > 0 && <div style={{ fontSize: 13, marginTop: 4, fontWeight: 700 }}>À partir de {fmtMoney(s.prix_base)}</div>}
                    {s.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.description}</div>}
                  </div>
                  <button onClick={() => deleteService(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLIENTS */}
      {tab === "clients" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>👤 Clients</h2>
            <button onClick={() => setShowAddCli(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddCli && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={cliForm.nom} onChange={e => setCliForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={cliForm.telephone} onChange={e => setCliForm(f => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Adresse</label><input style={inp} value={cliForm.adresse} onChange={e => setCliForm(f => ({ ...f, adresse: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Email</label><input style={inp} value={cliForm.email} onChange={e => setCliForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveClient} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddCli(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {clients.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun client encore.</p>}
            {clients.map(c => (
              <div key={c.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 600 }}>{c.nom}</div>
                {c.telephone && <div style={{ fontSize: 13, color: "#64748b" }}>📞 {c.telephone}</div>}
                {c.adresse && <div style={{ fontSize: 13, color: "#64748b" }}>📍 {c.adresse}</div>}
                {c.email && <div style={{ fontSize: 13, color: "#64748b" }}>✉️ {c.email}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANNONCES */}
      {tab === "announcements" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>📣 Annonces</h2>
            <button onClick={() => setShowAddAnn(true)} style={btn(COLOR)}>+ Publier</button>
          </div>
          {showAddAnn && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Titre *</label><input style={inp} value={annForm.titre} onChange={e => setAnnForm(f => ({ ...f, titre: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Contenu *</label><textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={annForm.contenu} onChange={e => setAnnForm(f => ({ ...f, contenu: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Type</label>
                  <select style={inp} value={annForm.type} onChange={e => setAnnForm(f => ({ ...f, type: e.target.value }))}>
                    {["general", "promotion", "fermeture", "evenement"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveAnn} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Publier"}</button>
                <button onClick={() => setShowAddAnn(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          {announcements.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucune annonce.</p>}
          {announcements.map(a => (
            <div key={a.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{a.titre}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{a.contenu}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{a.type} · {fmtDate(a.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
