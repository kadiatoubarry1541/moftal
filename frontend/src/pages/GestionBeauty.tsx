import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";

const API_ROOT = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API_ROOT}/api/beauty-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "services" | "bookings" | "staff" | "clients" | "announcements";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const COLOR     = "#db2777";
const COLOR_BG  = "#fdf2f8";
const COLOR_BDR = "#fbcfe8";
const GRADIENT  = "linear-gradient(135deg,#db2777,#ec4899)";

const BOOKING_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  en_attente:  { bg: "#fffbeb", color: "#b45309", label: "En attente" },
  confirme:    { bg: "#eff6ff", color: "#2563eb", label: "Confirmé" },
  en_cours:    { bg: "#f0fdf0", color: "#1a8f1a", label: "En cours" },
  termine:     { bg: "#f0fdf0", color: "#156315", label: "Terminé" },
  annule:      { bg: "#fef2f2", color: "#dc2626", label: "Annulé" },
};

export default function GestionBeauty() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab]                       = useState<Tab>("dashboard");
  const [tenant, setTenant]                 = useState<any>(null);
  const [dash, setDash]                     = useState<any>(null);
  const [services, setServices]             = useState<any[]>([]);
  const [bookings, setBookings]             = useState<any[]>([]);
  const [staff, setStaff]                   = useState<any[]>([]);
  const [clients, setClients]               = useState<any[]>([]);
  const [announcements, setAnnouncements]   = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [saving, setSaving]                 = useState(false);

  const [showAddService, setShowAddService]       = useState(false);
  const [showAddBooking, setShowAddBooking]       = useState(false);
  const [showAddStaff, setShowAddStaff]           = useState(false);
  const [showAddClient, setShowAddClient]         = useState(false);
  const [showAddAnn, setShowAddAnn]               = useState(false);

  const [svcForm, setSvcForm] = useState({ nom: "", categorie: "Coiffure", prix: "", duree_min: "30", description: "" });
  const [bkForm, setBkForm]   = useState({ client_nom: "", client_telephone: "", service_id: "", staff_id: "", date_rdv: "", heure_rdv: "", notes: "" });
  const [stForm, setStForm]   = useState({ nom: "", prenom: "", poste: "Coiffeur/se", telephone: "", specialite: "", salaire: "" });
  const [cliForm, setCliForm] = useState({ nom: "", telephone: "", email: "", notes: "" });
  const [annForm, setAnnForm] = useState({ titre: "", contenu: "", type: "general" });

  const b = BASE;

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadAll();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || loading) return;
    if (tab === "services")     loadServices();
    if (tab === "bookings")     { loadBookings(); loadServices(); loadStaff(); }
    if (tab === "staff")        loadStaff();
    if (tab === "clients")      loadClients();
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

  async function loadServices()      { const r = await fetch(`${b(tenantCode!)}/services`,      { headers: auth() }); const d = await r.json(); if (d.success) setServices(d.services || []); }
  async function loadBookings()      { const r = await fetch(`${b(tenantCode!)}/bookings`,      { headers: auth() }); const d = await r.json(); if (d.success) setBookings(d.bookings || []); }
  async function loadStaff()         { const r = await fetch(`${b(tenantCode!)}/staff`,         { headers: auth() }); const d = await r.json(); if (d.success) setStaff(d.staff || []); }
  async function loadClients()       { const r = await fetch(`${b(tenantCode!)}/clients`,       { headers: auth() }); const d = await r.json(); if (d.success) setClients(d.clients || []); }
  async function loadAnnouncements() { const r = await fetch(`${b(tenantCode!)}/announcements`, { headers: auth() }); const d = await r.json(); if (d.success) setAnnouncements(d.announcements || []); }

  async function saveService() {
    if (!svcForm.nom || !svcForm.prix) return alert("Nom et prix requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/services`, { method: "POST", headers: auth(), body: JSON.stringify(svcForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddService(false); setSvcForm({ nom: "", categorie: "Coiffure", prix: "", duree_min: "30", description: "" }); loadServices(); loadAll(); }
    else alert(d.message);
  }

  async function deleteService(id: number) {
    if (!confirm("Supprimer ce service ?")) return;
    await fetch(`${b(tenantCode!)}/services/${id}`, { method: "DELETE", headers: auth() });
    loadServices();
  }

  async function saveBooking() {
    if (!bkForm.client_nom || !bkForm.date_rdv) return alert("Nom client et date requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/bookings`, { method: "POST", headers: auth(), body: JSON.stringify(bkForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddBooking(false); setBkForm({ client_nom: "", client_telephone: "", service_id: "", staff_id: "", date_rdv: "", heure_rdv: "", notes: "" }); loadBookings(); loadAll(); }
    else alert(d.message);
  }

  async function patchBooking(id: number, statut: string) {
    await fetch(`${b(tenantCode!)}/bookings/${id}`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
    loadBookings(); loadAll();
  }

  async function saveStaff() {
    if (!stForm.nom) return alert("Nom requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/staff`, { method: "POST", headers: auth(), body: JSON.stringify(stForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddStaff(false); setStForm({ nom: "", prenom: "", poste: "Coiffeur/se", telephone: "", specialite: "", salaire: "" }); loadStaff(); loadAll(); }
    else alert(d.message);
  }

  async function deleteStaff(id: number) {
    if (!confirm("Retirer ce membre du personnel ?")) return;
    await fetch(`${b(tenantCode!)}/staff/${id}`, { method: "DELETE", headers: auth() });
    loadStaff(); loadAll();
  }

  async function saveClient() {
    if (!cliForm.nom) return alert("Nom requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/clients`, { method: "POST", headers: auth(), body: JSON.stringify(cliForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddClient(false); setCliForm({ nom: "", telephone: "", email: "", notes: "" }); loadClients(); }
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
    { id: "dashboard",     label: "Dashboard",   emoji: "📊" },
    { id: "services",      label: "Services",    emoji: "✂️" },
    { id: "bookings",      label: "Rendez-vous", emoji: "📅" },
    { id: "staff",         label: "Personnel",   emoji: "👩‍🦱" },
    { id: "clients",       label: "Clients",     emoji: "👤" },
    { id: "announcements", label: "Annonces",    emoji: "📣" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
  const btn = (bg: string, color = "white"): React.CSSProperties => ({ padding: "8px 16px", background: bg, color, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px", fontFamily: "system-ui,sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: GRADIENT, borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 40 }}>💈</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{tenant?.name || "Beauté & Bien-être"}</h1>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Gestion Interne — Salon / Institut</p>
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
              { label: "Services actifs",     val: dash?.totalServices || 0,      emoji: "✂️" },
              { label: "Personnel",            val: dash?.totalStaff || 0,         emoji: "👩‍🦱" },
              { label: "RDV aujourd'hui",      val: dash?.rdvAujourdhui || 0,      emoji: "📅" },
              { label: "RDV ce mois",          val: dash?.rdvCeMois || 0,          emoji: "📈" },
              { label: "RDV en attente",       val: dash?.rdvEnAttente || 0,       emoji: "⏳", warn: (dash?.rdvEnAttente||0) > 0 },
              { label: "Clients fidèles",      val: dash?.totalClients || 0,       emoji: "👥" },
            ].map(s => (
              <div key={s.label} style={{ background: s.warn ? "#fff7ed" : COLOR_BG, border: `1px solid ${s.warn ? "#fed7aa" : COLOR_BDR}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: s.warn ? "#ea580c" : COLOR }}>{s.val}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {(dash?.recentBookings?.length > 0) && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Derniers rendez-vous</h3>
              {dash.recentBookings.map((b: any) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{b.client_nom}</span>
                  <span style={{ color: "#64748b" }}>{b.service_nom || "Service"} · {fmtDate(b.date_rdv)} {b.heure_rdv}</span>
                  <span style={{ ...BOOKING_STATUS[b.statut], padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{BOOKING_STATUS[b.statut]?.label || b.statut}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SERVICES */}
      {tab === "services" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>✂️ Services proposés</h2>
            <button onClick={() => setShowAddService(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddService && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={svcForm.nom} onChange={e => setSvcForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Coupe femme" /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Catégorie</label>
                  <select style={inp} value={svcForm.categorie} onChange={e => setSvcForm(f => ({ ...f, categorie: e.target.value }))}>
                    {["Coiffure", "Soins visage", "Soins corps", "Manucure", "Maquillage", "Massage", "Autre"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prix (GNF) *</label><input style={inp} type="number" value={svcForm.prix} onChange={e => setSvcForm(f => ({ ...f, prix: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Durée (minutes)</label><input style={inp} type="number" value={svcForm.duree_min} onChange={e => setSvcForm(f => ({ ...f, duree_min: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Description</label><input style={inp} value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveService} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddService(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
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
                    <div style={{ fontSize: 12, color: "#64748b" }}>{s.categorie} · {s.duree_min} min</div>
                  </div>
                  <button onClick={() => deleteService(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18 }}>🗑</button>
                </div>
                <div style={{ marginTop: 8, fontWeight: 700, color: COLOR }}>{fmtMoney(s.prix)}</div>
                {s.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDEZ-VOUS */}
      {tab === "bookings" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>📅 Rendez-vous</h2>
            <button onClick={() => setShowAddBooking(true)} style={btn(COLOR)}>+ Nouveau RDV</button>
          </div>
          {showAddBooking && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Client *</label><input style={inp} value={bkForm.client_nom} onChange={e => setBkForm(f => ({ ...f, client_nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={bkForm.client_telephone} onChange={e => setBkForm(f => ({ ...f, client_telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Service</label>
                  <select style={inp} value={bkForm.service_id} onChange={e => setBkForm(f => ({ ...f, service_id: e.target.value }))}>
                    <option value="">Choisir un service</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.nom} — {fmtMoney(s.prix)}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Styliste</label>
                  <select style={inp} value={bkForm.staff_id} onChange={e => setBkForm(f => ({ ...f, staff_id: e.target.value }))}>
                    <option value="">Choisir (optionnel)</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.nom} {s.prenom}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Date *</label><input style={inp} type="date" value={bkForm.date_rdv} onChange={e => setBkForm(f => ({ ...f, date_rdv: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Heure</label><input style={inp} type="time" value={bkForm.heure_rdv} onChange={e => setBkForm(f => ({ ...f, heure_rdv: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Notes</label><input style={inp} value={bkForm.notes} onChange={e => setBkForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveBooking} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddBooking(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            {bookings.length === 0 && <p style={{ padding: 16, color: "#94a3b8", fontStyle: "italic" }}>Aucun rendez-vous.</p>}
            {bookings.map(bk => {
              const st = BOOKING_STATUS[bk.statut] || BOOKING_STATUS.en_attente;
              return (
                <div key={bk.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{bk.client_nom} {bk.client_telephone && <span style={{ fontSize: 12, color: "#64748b" }}>· {bk.client_telephone}</span>}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{bk.service_nom || "Service"} · {fmtDate(bk.date_rdv)} {bk.heure_rdv}</div>
                      {bk.staff_nom && <div style={{ fontSize: 12, color: "#64748b" }}>👩‍🦱 {bk.staff_nom}</div>}
                    </div>
                    <span style={{ background: st.bg, color: st.color, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                  </div>
                  {bk.statut === "en_attente" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => patchBooking(bk.id, "confirme")}  style={btn("#eff6ff", "#2563eb")}>Confirmer</button>
                      <button onClick={() => patchBooking(bk.id, "en_cours")}  style={btn("#f0fdf0", "#1a8f1a")}>Démarrer</button>
                      <button onClick={() => patchBooking(bk.id, "annule")}    style={btn("#fef2f2", "#dc2626")}>Annuler</button>
                    </div>
                  )}
                  {bk.statut === "confirme" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => patchBooking(bk.id, "en_cours")}  style={btn("#f0fdf0", "#1a8f1a")}>Démarrer</button>
                      <button onClick={() => patchBooking(bk.id, "annule")}    style={btn("#fef2f2", "#dc2626")}>Annuler</button>
                    </div>
                  )}
                  {bk.statut === "en_cours" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => patchBooking(bk.id, "termine")}   style={btn(COLOR)}>Terminé ✓</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PERSONNEL */}
      {tab === "staff" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>👩‍🦱 Personnel</h2>
            <button onClick={() => setShowAddStaff(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddStaff && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={stForm.nom} onChange={e => setStForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prénom</label><input style={inp} value={stForm.prenom} onChange={e => setStForm(f => ({ ...f, prenom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Poste</label>
                  <select style={inp} value={stForm.poste} onChange={e => setStForm(f => ({ ...f, poste: e.target.value }))}>
                    {["Coiffeur/se", "Esthéticienne", "Maquilleur/se", "Masseur/se", "Manucure", "Responsable"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={stForm.telephone} onChange={e => setStForm(f => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Spécialité</label><input style={inp} value={stForm.specialite} onChange={e => setStForm(f => ({ ...f, specialite: e.target.value }))} placeholder="Ex: Tresses, colorations..." /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Salaire (GNF)</label><input style={inp} type="number" value={stForm.salaire} onChange={e => setStForm(f => ({ ...f, salaire: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveStaff} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddStaff(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {staff.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun personnel encore.</p>}
            {staff.map(s => (
              <div key={s.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.nom} {s.prenom}</div>
                    <div style={{ fontSize: 13, color: COLOR }}>{s.poste}</div>
                    {s.specialite && <div style={{ fontSize: 12, color: "#64748b" }}>{s.specialite}</div>}
                    {s.telephone && <div style={{ fontSize: 12, color: "#64748b" }}>📞 {s.telephone}</div>}
                    {s.salaire > 0 && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Salaire: {fmtMoney(s.salaire)}</div>}
                  </div>
                  <button onClick={() => deleteStaff(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18 }}>🗑</button>
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
            <h2 style={{ margin: 0, fontSize: 18 }}>👤 Clients fidèles</h2>
            <button onClick={() => setShowAddClient(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddClient && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={cliForm.nom} onChange={e => setCliForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={cliForm.telephone} onChange={e => setCliForm(f => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Email</label><input style={inp} value={cliForm.email} onChange={e => setCliForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Notes (allergies, préférences…)</label><input style={inp} value={cliForm.notes} onChange={e => setCliForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveClient} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddClient(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {clients.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun client enregistré.</p>}
            {clients.map(c => (
              <div key={c.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 600 }}>{c.nom}</div>
                {c.telephone && <div style={{ fontSize: 13, color: "#64748b" }}>📞 {c.telephone}</div>}
                {c.email && <div style={{ fontSize: 13, color: "#64748b" }}>✉️ {c.email}</div>}
                {c.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{c.notes}</div>}
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
