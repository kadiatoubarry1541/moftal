import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/immo-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "properties" | "tenants" | "payments" | "maintenance" | "announcements";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const AMBER = "#b45309";
const AMBER_LIGHT = "#fffbeb";
const AMBER_BORDER = "#fde68a";

const STATUT_PROP: Record<string, { bg: string; color: string; label: string }> = {
  vacant:    { bg: "#fef2f2", color: "#dc2626", label: "Vacant" },
  occupe:    { bg: "#f0fdf0", color: "#1a8f1a", label: "Occupé" },
  travaux:   { bg: "#fff7ed", color: "#ea580c", label: "Travaux" },
  reserve:   { bg: "#eff6ff", color: "#2563eb", label: "Réservé" },
};
const PRIORITE: Record<string, { bg: string; color: string }> = {
  urgente: { bg: "#fef2f2", color: "#dc2626" },
  haute:   { bg: "#fff7ed", color: "#ea580c" },
  normale: { bg: "#f0fdf0", color: "#1a8f1a" },
  basse:   { bg: "#f8fafc", color: "#64748b" },
};

export default function GestionImmobilier() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddProp, setShowAddProp] = useState(false);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [prForm, setPrForm] = useState({ nom: "", type_bien: "appartement", adresse: "", ville: "", surface: "", nb_pieces: "", loyer_mensuel: "", charges: "", description: "" });
  const [ltForm, setLtForm] = useState({ nom: "", prenom: "", telephone: "", email: "", cni: "", property_id: "", date_entree: new Date().toISOString().split("T")[0], loyer: "", caution: "" });
  const [pyForm, setPyForm] = useState({ tenant_id: "", property_id: "", montant: "", mois_concerne: new Date().toISOString().slice(0, 7), type_paiement: "especes", statut: "paye", notes: "" });
  const [mtForm, setMtForm] = useState({ property_id: "", titre: "", description: "", type_intervention: "reparation", priorite: "normale", cout_estime: "" });
  const [anForm, setAnForm] = useState({ titre: "", contenu: "", type: "general" });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
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
    // toujours charger biens et locataires (utiles dans les formulaires de paiement)
    fetch(`${BASE(tenantCode)}/properties`, { headers: h }).then(r => r.json()).then(d => d.success && setProperties(d.properties || []));
    fetch(`${BASE(tenantCode)}/tenants`,    { headers: h }).then(r => r.json()).then(d => d.success && setTenants(d.tenants || []));
    if (tab === "payments")      fetch(`${BASE(tenantCode)}/payments`,      { headers: h }).then(r => r.json()).then(d => d.success && setPayments(d.payments || []));
    if (tab === "maintenance")   fetch(`${BASE(tenantCode)}/maintenance`,   { headers: h }).then(r => r.json()).then(d => d.success && setMaintenance(d.maintenance || []));
    if (tab === "announcements") fetch(`${BASE(tenantCode)}/announcements`, { headers: h }).then(r => r.json()).then(d => d.success && setAnnouncements(d.announcements || []));
  }, [tab, tenantCode, loading]);

  const post = async (url: string, body: object) => {
    setSaving(true);
    const r = await fetch(url, { method: "POST", headers: auth(), body: JSON.stringify(body) });
    const d = await r.json(); setSaving(false); return d;
  };
  const del = (url: string) => fetch(url, { method: "DELETE", headers: auth() });
  const patch = (url: string, body: object) => fetch(url, { method: "PATCH", headers: auth(), body: JSON.stringify(body) });

  const reloadTab = (t: Tab) => {
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    if (t === "properties")    fetch(`${BASE(tenantCode!)}/properties`,    { headers: h }).then(r => r.json()).then(d => d.success && setProperties(d.properties || []));
    if (t === "tenants")       fetch(`${BASE(tenantCode!)}/tenants`,       { headers: h }).then(r => r.json()).then(d => d.success && setTenants(d.tenants || []));
    if (t === "payments")      fetch(`${BASE(tenantCode!)}/payments`,      { headers: h }).then(r => r.json()).then(d => d.success && setPayments(d.payments || []));
    if (t === "maintenance")   fetch(`${BASE(tenantCode!)}/maintenance`,   { headers: h }).then(r => r.json()).then(d => d.success && setMaintenance(d.maintenance || []));
    if (t === "announcements") fetch(`${BASE(tenantCode!)}/announcements`, { headers: h }).then(r => r.json()).then(d => d.success && setAnnouncements(d.announcements || []));
    fetch(`${BASE(tenantCode!)}/dashboard`, { headers: h }).then(r => r.json()).then(d => d.success && setDash(d));
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: "4px solid #fde68a", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate(-1 as any)} style={{ marginTop: 16, padding: "10px 24px", background: AMBER, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>← Retour</button>
    </div>
  );

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard",     label: "Dashboard",    emoji: "📊" },
    { id: "properties",   label: "Biens",         emoji: "🏠" },
    { id: "tenants",      label: "Locataires",    emoji: "👤" },
    { id: "payments",     label: "Loyers",        emoji: "💰" },
    { id: "maintenance",  label: "Maintenance",   emoji: "🔧" },
    { id: "announcements",label: "Annonces",      emoji: "📢" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "10px 20px", background: bg, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,sans-serif" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion immobilier — ${tenant?.name || ""}`}
        startUrl={`/gestion-immobilier/${tenantCode}`}
        themeColor={AMBER}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @media(max-width:640px){.gestion-btn-secondary{display:none!important}}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#92400e,#b45309)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        {tenant?.logo_url ? (
          <img src={tenant.logo_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0, background: "rgba(255,255,255,0.15)" }} />
        ) : (
          <span style={{ fontSize: 44, flexShrink: 0 }}>🏠</span>
        )}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontWeight: 800, color: "white", fontSize: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant?.name || "Gestion Immobilière"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Code : {tenantCode} · Gestion Interne</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <InstallAppButton name={tenant?.name} logoUrl={tenant?.logo_url} themeColor={AMBER} />
          <button className="gestion-btn-secondary" onClick={() => navigate(`/immobilier/${tenantCode}`)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🌐 Vitrine</button>
          <button className="gestion-btn-secondary" onClick={() => navigate(-1 as any)} style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Retour</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", background: tab === t.id ? AMBER : "#f1f5f9", color: tab === t.id ? "white" : "#64748b", transition: "all 0.15s" }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dash && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Biens au total", value: dash.totalProperties ?? 0, color: "#b45309", bg: "#fffbeb",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { label: "Biens occupés", value: dash.loyersOccupes ?? 0, color: "#1a8f1a", bg: "#f0fdf0",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
              { label: "Biens vacants", value: dash.propertiesVacantes ?? 0, color: "#dc2626", bg: "#fef2f2",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
              { label: "Maintenance active", value: dash.maintenanceEnCours ?? 0, color: "#7c3aed", bg: "#f5f3ff",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
            ].map(s => (
              <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${s.color}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Loyers Banner */}
          <div style={{ background: "linear-gradient(135deg,#78350f,#b45309)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, color: "white" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Loyers collectés ce mois</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{fmtMoney(dash.loyersMois)}</div>
            </div>
            <div style={{ textAlign: "right", opacity: 0.9 }}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>Baux expirant bientôt</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{dash.arrieresBails ?? 0}</div>
            </div>
          </div>
          {/* Quick Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Ajouter un bien", icon: "🏠", tab: "properties" as Tab },
              { label: "Nouveau locataire", icon: "👤", tab: "tenants" as Tab },
              { label: "Encaisser loyer", icon: "💰", tab: "payments" as Tab },
              { label: "Maintenance", icon: "🔧", tab: "maintenance" as Tab },
            ].map(a => (
              <button key={a.label} onClick={() => setTab(a.tab)}
                style={{ background: "white", border: `1px solid ${AMBER_BORDER}`, borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                onMouseOver={e => (e.currentTarget.style.borderColor = AMBER)}
                onMouseOut={e => (e.currentTarget.style.borderColor = AMBER_BORDER)}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{a.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{a.label}</div>
              </button>
            ))}
          </div>
          {/* Recent Payments */}
          <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Derniers paiements</h3>
              <button onClick={() => setTab("payments")} style={{ fontSize: 12, color: AMBER, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir tous →</button>
            </div>
            {(dash.recentPayments?.length ?? 0) === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>Aucun paiement récent</div>
            ) : dash.recentPayments.map((p: any) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: AMBER_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💰</div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{p.locataire_nom || "Locataire"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(p.date_paiement)}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: "#1a8f1a", fontSize: 13 }}>{fmtMoney(p.montant)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BIENS ── */}
      {tab === "properties" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>🏠 Biens immobiliers ({properties.length})</h2>
            <button onClick={() => setShowAddProp(!showAddProp)} style={btn(AMBER)}>{showAddProp ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddProp && (
            <div style={{ background: AMBER_LIGHT, border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom du bien *" value={prForm.nom} onChange={e => setPrForm(p => ({ ...p, nom: e.target.value }))} />
                <select style={inp} value={prForm.type_bien} onChange={e => setPrForm(p => ({ ...p, type_bien: e.target.value }))}>
                  {["appartement","maison","bureau","boutique","entrepot","terrain","villa","studio"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
                <input style={inp} placeholder="Adresse" value={prForm.adresse} onChange={e => setPrForm(p => ({ ...p, adresse: e.target.value }))} />
                <input style={inp} placeholder="Ville" value={prForm.ville} onChange={e => setPrForm(p => ({ ...p, ville: e.target.value }))} />
                <input style={inp} placeholder="Surface (m²)" type="number" value={prForm.surface} onChange={e => setPrForm(p => ({ ...p, surface: e.target.value }))} />
                <input style={inp} placeholder="Nb pièces" type="number" value={prForm.nb_pieces} onChange={e => setPrForm(p => ({ ...p, nb_pieces: e.target.value }))} />
                <input style={inp} placeholder="Loyer mensuel (GNF)" type="number" value={prForm.loyer_mensuel} onChange={e => setPrForm(p => ({ ...p, loyer_mensuel: e.target.value }))} />
                <input style={inp} placeholder="Charges (GNF)" type="number" value={prForm.charges} onChange={e => setPrForm(p => ({ ...p, charges: e.target.value }))} />
              </div>
              <textarea style={{ ...inp, minHeight: 64, resize: "vertical" }} placeholder="Description" value={prForm.description} onChange={e => setPrForm(p => ({ ...p, description: e.target.value }))} />
              <button onClick={async () => {
                if (!prForm.nom) return;
                const d = await post(`${BASE(tenantCode!)}/properties`, { ...prForm, surface: prForm.surface ? +prForm.surface : null, nb_pieces: prForm.nb_pieces ? +prForm.nb_pieces : null, loyer_mensuel: +prForm.loyer_mensuel || 0 });
                if (d.success) { setShowAddProp(false); setPrForm({ nom: "", type_bien: "appartement", adresse: "", ville: "", surface: "", nb_pieces: "", loyer_mensuel: "", charges: "", description: "" }); reloadTab("properties"); }
              }} disabled={saving} style={{ ...btn(AMBER), marginTop: 10 }}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {properties.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun bien enregistré</div> :
              properties.map(p => {
                const sc = STATUT_PROP[p.statut] || { bg: "#f8fafc", color: "#64748b", label: p.statut };
                return (
                  <div key={p.id} style={{ background: "white", border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{p.nom}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{p.type_bien} · {p.adresse}{p.ville ? ` · ${p.ville}` : ""}</div>
                        {(p.surface || p.nb_pieces) && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{p.surface ? `${p.surface} m²` : ""}{p.surface && p.nb_pieces ? " · " : ""}{p.nb_pieces ? `${p.nb_pieces} pièces` : ""}</div>}
                        {p.loyer_mensuel > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: AMBER, marginTop: 6 }}>{fmtMoney(p.loyer_mensuel)}/mois</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <select value={p.statut} onChange={async e => { await patch(`${BASE(tenantCode!)}/properties/${p.id}`, { statut: e.target.value }); reloadTab("properties"); }}
                          style={{ fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                          {Object.entries(STATUT_PROP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={async () => { if (confirm("Supprimer ce bien ?")) { await del(`${BASE(tenantCode!)}/properties/${p.id}`); reloadTab("properties"); } }}
                          style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Supprimer</button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── LOCATAIRES ── */}
      {tab === "tenants" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>👤 Locataires ({tenants.length})</h2>
            <button onClick={() => setShowAddTenant(!showAddTenant)} style={btn(AMBER)}>{showAddTenant ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddTenant && (
            <div style={{ background: AMBER_LIGHT, border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom *" value={ltForm.nom} onChange={e => setLtForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Prénom" value={ltForm.prenom} onChange={e => setLtForm(p => ({ ...p, prenom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={ltForm.telephone} onChange={e => setLtForm(p => ({ ...p, telephone: e.target.value }))} />
                <input style={inp} placeholder="Email" value={ltForm.email} onChange={e => setLtForm(p => ({ ...p, email: e.target.value }))} />
                <input style={inp} placeholder="CNI / Pièce d'identité" value={ltForm.cni} onChange={e => setLtForm(p => ({ ...p, cni: e.target.value }))} />
                <select style={inp} value={ltForm.property_id} onChange={e => setLtForm(p => ({ ...p, property_id: e.target.value }))}>
                  <option value="">-- Bien associé --</option>
                  {properties.filter(p => p.statut !== "occupe").map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
                <input style={inp} placeholder="Loyer mensuel (GNF)" type="number" value={ltForm.loyer} onChange={e => setLtForm(p => ({ ...p, loyer: e.target.value }))} />
                <input style={inp} placeholder="Caution (GNF)" type="number" value={ltForm.caution} onChange={e => setLtForm(p => ({ ...p, caution: e.target.value }))} />
                <input style={inp} type="date" value={ltForm.date_entree} onChange={e => setLtForm(p => ({ ...p, date_entree: e.target.value }))} />
              </div>
              <button onClick={async () => {
                if (!ltForm.nom) return;
                const d = await post(`${BASE(tenantCode!)}/tenants`, { ...ltForm, loyer: +ltForm.loyer || 0, caution: +ltForm.caution || 0, property_id: ltForm.property_id || null });
                if (d.success) { setShowAddTenant(false); setLtForm({ nom: "", prenom: "", telephone: "", email: "", cni: "", property_id: "", date_entree: new Date().toISOString().split("T")[0], loyer: "", caution: "" }); reloadTab("tenants"); }
              }} disabled={saving} style={btn(AMBER)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tenants.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun locataire enregistré</div> :
              tenants.map(t => (
                <div key={t.id} style={{ background: "white", border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{t.prenom ? `${t.prenom} ${t.nom}` : t.nom}</div>
                      {t.telephone && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>📞 {t.telephone}</div>}
                      {t.property_nom && <div style={{ fontSize: 12, color: "#64748b" }}>🏠 {t.property_nom}</div>}
                      {t.loyer > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: AMBER, marginTop: 4 }}>{fmtMoney(t.loyer)}/mois</div>}
                    </div>
                    <button onClick={async () => { if (confirm("Retirer ce locataire ?")) { await del(`${BASE(tenantCode!)}/tenants/${t.id}`); reloadTab("tenants"); } }}
                      style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── PAIEMENTS LOYERS ── */}
      {tab === "payments" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>💰 Paiements de loyers ({payments.length})</h2>
            <button onClick={() => setShowAddPayment(!showAddPayment)} style={btn(AMBER)}>{showAddPayment ? "✕ Annuler" : "+ Encaisser"}</button>
          </div>
          {showAddPayment && (
            <div style={{ background: AMBER_LIGHT, border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <select style={inp} value={pyForm.tenant_id} onChange={e => setPyForm(p => ({ ...p, tenant_id: e.target.value }))}>
                  <option value="">-- Locataire --</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.prenom ? `${t.prenom} ${t.nom}` : t.nom}</option>)}
                </select>
                <select style={inp} value={pyForm.property_id} onChange={e => setPyForm(p => ({ ...p, property_id: e.target.value }))}>
                  <option value="">-- Bien --</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
                <input style={inp} placeholder="Montant (GNF)" type="number" value={pyForm.montant} onChange={e => setPyForm(p => ({ ...p, montant: e.target.value }))} />
                <input style={inp} type="month" value={pyForm.mois_concerne} onChange={e => setPyForm(p => ({ ...p, mois_concerne: e.target.value }))} />
                <select style={inp} value={pyForm.type_paiement} onChange={e => setPyForm(p => ({ ...p, type_paiement: e.target.value }))}>
                  {["especes","virement","mobile_money","orange_money","cheque"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select style={inp} value={pyForm.statut} onChange={e => setPyForm(p => ({ ...p, statut: e.target.value }))}>
                  <option value="paye">Payé</option>
                  <option value="partiel">Partiel</option>
                  <option value="en_attente">En attente</option>
                </select>
              </div>
              <button onClick={async () => {
                if (!pyForm.montant) return;
                const d = await post(`${BASE(tenantCode!)}/payments`, { ...pyForm, montant: +pyForm.montant, tenant_id: pyForm.tenant_id || null, property_id: pyForm.property_id || null });
                if (d.success) { setShowAddPayment(false); setPyForm({ tenant_id: "", property_id: "", montant: "", mois_concerne: new Date().toISOString().slice(0, 7), type_paiement: "especes", statut: "paye", notes: "" }); reloadTab("payments"); }
              }} disabled={saving} style={btn(AMBER)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {payments.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun paiement enregistré</div> :
              payments.map(p => (
                <div key={p.id} style={{ background: "white", border: `1px solid ${AMBER_BORDER}`, borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{p.locataire_nom || "—"}{p.locataire_prenom ? ` ${p.locataire_prenom}` : ""}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{p.property_nom || ""} · {p.mois_concerne || fmtDate(p.date_paiement)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1a8f1a" }}>{fmtMoney(p.montant)}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, background: p.statut === "paye" ? "#f0fdf0" : "#fffbeb", color: p.statut === "paye" ? "#1a8f1a" : "#b45309", padding: "2px 8px", borderRadius: 6 }}>{p.statut}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── MAINTENANCE ── */}
      {tab === "maintenance" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>🔧 Maintenance ({maintenance.length})</h2>
            <button onClick={() => setShowAddMaint(!showAddMaint)} style={btn(AMBER)}>{showAddMaint ? "✕ Annuler" : "+ Signaler"}</button>
          </div>
          {showAddMaint && (
            <div style={{ background: AMBER_LIGHT, border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <select style={inp} value={mtForm.property_id} onChange={e => setMtForm(p => ({ ...p, property_id: e.target.value }))}>
                  <option value="">-- Bien concerné --</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
                <select style={inp} value={mtForm.type_intervention} onChange={e => setMtForm(p => ({ ...p, type_intervention: e.target.value }))}>
                  {["reparation","peinture","plomberie","electricite","menuiserie","nettoyage","autre"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
                <input style={inp} placeholder="Titre de l'intervention *" value={mtForm.titre} onChange={e => setMtForm(p => ({ ...p, titre: e.target.value }))} />
                <select style={inp} value={mtForm.priorite} onChange={e => setMtForm(p => ({ ...p, priorite: e.target.value }))}>
                  <option value="urgente">Urgente</option>
                  <option value="haute">Haute</option>
                  <option value="normale">Normale</option>
                  <option value="basse">Basse</option>
                </select>
                <input style={inp} placeholder="Coût estimé (GNF)" type="number" value={mtForm.cout_estime} onChange={e => setMtForm(p => ({ ...p, cout_estime: e.target.value }))} />
              </div>
              <textarea style={{ ...inp, minHeight: 64, resize: "vertical" }} placeholder="Description" value={mtForm.description} onChange={e => setMtForm(p => ({ ...p, description: e.target.value }))} />
              <button onClick={async () => {
                if (!mtForm.titre) return;
                const d = await post(`${BASE(tenantCode!)}/maintenance`, { ...mtForm, property_id: mtForm.property_id || null, cout_estime: +mtForm.cout_estime || 0 });
                if (d.success) { setShowAddMaint(false); setMtForm({ property_id: "", titre: "", description: "", type_intervention: "reparation", priorite: "normale", cout_estime: "" }); reloadTab("maintenance"); }
              }} disabled={saving} style={{ ...btn(AMBER), marginTop: 10 }}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {maintenance.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune intervention signalée</div> :
              maintenance.map(m => {
                const pr = PRIORITE[m.priorite] || { bg: "#f8fafc", color: "#64748b" };
                return (
                  <div key={m.id} style={{ background: "white", border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{m.titre}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, background: pr.bg, color: pr.color, padding: "2px 8px", borderRadius: 6 }}>{m.priorite}</span>
                        </div>
                        {m.property_nom && <div style={{ fontSize: 12, color: "#64748b" }}>🏠 {m.property_nom}</div>}
                        {m.description && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{m.description}</div>}
                        {m.cout_estime > 0 && <div style={{ fontSize: 12, color: AMBER, marginTop: 4, fontWeight: 600 }}>Coût estimé : {fmtMoney(m.cout_estime)}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select value={m.statut} onChange={async e => { await patch(`${BASE(tenantCode!)}/maintenance/${m.id}`, { statut: e.target.value }); reloadTab("maintenance"); }}
                          style={{ fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                          <option value="en_cours">En cours</option>
                          <option value="termine">Terminé</option>
                          <option value="annule">Annulé</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── ANNONCES ── */}
      {tab === "announcements" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📢 Annonces ({announcements.length})</h2>
            <button onClick={() => setShowAddAnn(!showAddAnn)} style={btn(AMBER)}>{showAddAnn ? "✕ Annuler" : "+ Publier"}</button>
          </div>
          {showAddAnn && (
            <div style={{ background: AMBER_LIGHT, border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input style={inp} placeholder="Titre *" value={anForm.titre} onChange={e => setAnForm(p => ({ ...p, titre: e.target.value }))} />
                <select style={inp} value={anForm.type} onChange={e => setAnForm(p => ({ ...p, type: e.target.value }))}>
                  {["general","bien_disponible","hausse_loyer","travaux","avis_locataires"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} placeholder="Contenu *" value={anForm.contenu} onChange={e => setAnForm(p => ({ ...p, contenu: e.target.value }))} />
              </div>
              <button onClick={async () => {
                if (!anForm.titre || !anForm.contenu) return;
                const d = await post(`${BASE(tenantCode!)}/announcements`, anForm);
                if (d.success) { setShowAddAnn(false); setAnForm({ titre: "", contenu: "", type: "general" }); reloadTab("announcements"); }
              }} disabled={saving} style={{ ...btn(AMBER), marginTop: 10 }}>{saving ? "Publication…" : "Publier"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {announcements.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune annonce publiée</div> :
              announcements.map(a => (
                <div key={a.id} style={{ background: "white", border: `1px solid ${AMBER_BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{a.titre}</div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{a.contenu}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{fmtDate(a.created_at)}</div>
                    </div>
                    <button onClick={async () => { await del(`${BASE(tenantCode!)}/announcements/${a.id}`); reloadTab("announcements"); }}
                      style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
