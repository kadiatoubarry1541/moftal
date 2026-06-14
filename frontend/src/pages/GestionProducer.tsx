import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";

const API_ROOT = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API_ROOT}/api/producer-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "products" | "lots" | "orders" | "staff" | "announcements";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const COLOR     = "#7c3aed";
const COLOR_BG  = "#f5f3ff";
const COLOR_BDR = "#ddd6fe";
const GRADIENT  = "linear-gradient(135deg,#7c3aed,#8b5cf6)";

const STATUT_LOT: Record<string, { bg: string; color: string; label: string }> = {
  en_cours:   { bg: "#fffbeb", color: "#b45309",  label: "En cours" },
  termine:    { bg: "#f0fdf4", color: "#15803d",  label: "Terminé" },
  annule:     { bg: "#fef2f2", color: "#dc2626",  label: "Annulé" },
  en_attente: { bg: "#f5f3ff", color: "#7c3aed",  label: "En attente" },
};
const STATUT_ORDER: Record<string, { bg: string; color: string; label: string }> = {
  en_attente:    { bg: "#fffbeb", color: "#b45309",  label: "En attente" },
  en_production: { bg: "#eff6ff", color: "#2563eb",  label: "En production" },
  pret:          { bg: "#f0fdf4", color: "#16a34a",  label: "Prêt" },
  livre:         { bg: "#f0fdf4", color: "#15803d",  label: "Livré" },
  annule:        { bg: "#fef2f2", color: "#dc2626",  label: "Annulé" },
};

export default function GestionProducer() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab]                     = useState<Tab>("dashboard");
  const [tenant, setTenant]               = useState<any>(null);
  const [dash, setDash]                   = useState<any>(null);
  const [products, setProducts]           = useState<any[]>([]);
  const [lots, setLots]                   = useState<any[]>([]);
  const [orders, setOrders]               = useState<any[]>([]);
  const [staff, setStaff]                 = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [saving, setSaving]               = useState(false);

  const [showAddProd, setShowAddProd]   = useState(false);
  const [showAddLot, setShowAddLot]     = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddAnn, setShowAddAnn]     = useState(false);

  const [prodForm, setProdForm] = useState({ nom: "", categorie: "", unite: "kg", prix_unitaire: "", stock: "0", description: "" });
  const [lotForm, setLotForm]   = useState({ product_id: "", quantite_prevue: "", date_debut: "", date_fin_prevue: "", notes: "" });
  const [ordForm, setOrdForm]   = useState({ client_nom: "", client_telephone: "", product_id: "", quantite: "", montant_total: "", date_livraison_prevue: "", notes: "" });
  const [stForm, setStForm]     = useState({ nom: "", prenom: "", poste: "Ouvrier", telephone: "", salaire: "" });
  const [annForm, setAnnForm]   = useState({ titre: "", contenu: "", type: "general" });

  const b = BASE;

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadAll();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || loading) return;
    if (tab === "products")      loadProducts();
    if (tab === "lots")          { loadLots(); loadProducts(); }
    if (tab === "orders")        { loadOrders(); loadProducts(); }
    if (tab === "staff")         loadStaff();
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

  async function loadProducts()      { const r = await fetch(`${b(tenantCode!)}/products`,      { headers: auth() }); const d = await r.json(); if (d.success) setProducts(d.products || []); }
  async function loadLots()          { const r = await fetch(`${b(tenantCode!)}/lots`,          { headers: auth() }); const d = await r.json(); if (d.success) setLots(d.lots || []); }
  async function loadOrders()        { const r = await fetch(`${b(tenantCode!)}/orders`,        { headers: auth() }); const d = await r.json(); if (d.success) setOrders(d.orders || []); }
  async function loadStaff()         { const r = await fetch(`${b(tenantCode!)}/staff`,         { headers: auth() }); const d = await r.json(); if (d.success) setStaff(d.staff || []); }
  async function loadAnnouncements() { const r = await fetch(`${b(tenantCode!)}/announcements`, { headers: auth() }); const d = await r.json(); if (d.success) setAnnouncements(d.announcements || []); }

  async function saveProd() {
    if (!prodForm.nom) return alert("Nom requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/products`, { method: "POST", headers: auth(), body: JSON.stringify(prodForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddProd(false); setProdForm({ nom: "", categorie: "", unite: "kg", prix_unitaire: "", stock: "0", description: "" }); loadProducts(); loadAll(); }
    else alert(d.message);
  }

  async function adjustStock(id: number, delta: number) {
    await fetch(`${b(tenantCode!)}/products/${id}/stock`, { method: "PATCH", headers: auth(), body: JSON.stringify({ delta }) });
    loadProducts();
  }

  async function deleteProd(id: number) {
    if (!confirm("Supprimer ce produit ?")) return;
    await fetch(`${b(tenantCode!)}/products/${id}`, { method: "DELETE", headers: auth() });
    loadProducts(); loadAll();
  }

  async function saveLot() {
    if (!lotForm.product_id || !lotForm.quantite_prevue) return alert("Produit et quantité requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/lots`, { method: "POST", headers: auth(), body: JSON.stringify(lotForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddLot(false); setLotForm({ product_id: "", quantite_prevue: "", date_debut: "", date_fin_prevue: "", notes: "" }); loadLots(); loadAll(); }
    else alert(d.message);
  }

  async function patchLot(id: number, statut: string) {
    let qte: string | null = null;
    if (statut === "termine") {
      const q = prompt("Quantité réellement produite :", "0");
      if (q === null) return;
      qte = q;
    }
    await fetch(`${b(tenantCode!)}/lots/${id}`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut, quantite_produite: qte }) });
    loadLots(); loadAll();
  }

  async function saveOrder() {
    if (!ordForm.client_nom || !ordForm.product_id || !ordForm.quantite) return alert("Client, produit et quantité requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/orders`, { method: "POST", headers: auth(), body: JSON.stringify(ordForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddOrder(false); setOrdForm({ client_nom: "", client_telephone: "", product_id: "", quantite: "", montant_total: "", date_livraison_prevue: "", notes: "" }); loadOrders(); loadAll(); }
    else alert(d.message);
  }

  async function patchOrder(id: number, statut: string) {
    await fetch(`${b(tenantCode!)}/orders/${id}`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
    loadOrders(); loadAll();
  }

  async function saveStaff() {
    if (!stForm.nom) return alert("Nom requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/staff`, { method: "POST", headers: auth(), body: JSON.stringify(stForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddStaff(false); setStForm({ nom: "", prenom: "", poste: "Ouvrier", telephone: "", salaire: "" }); loadStaff(); loadAll(); }
    else alert(d.message);
  }

  async function deleteStaff(id: number) {
    if (!confirm("Retirer ce membre ?")) return;
    await fetch(`${b(tenantCode!)}/staff/${id}`, { method: "DELETE", headers: auth() });
    loadStaff(); loadAll();
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
    { id: "dashboard",     label: "Dashboard",  emoji: "📊" },
    { id: "products",      label: "Produits",   emoji: "📦" },
    { id: "lots",          label: "Production", emoji: "🏭" },
    { id: "orders",        label: "Commandes",  emoji: "📋" },
    { id: "staff",         label: "Personnel",  emoji: "👷" },
    { id: "announcements", label: "Annonces",   emoji: "📣" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
  const btn = (bg: string, color = "white"): React.CSSProperties => ({ padding: "8px 16px", background: bg, color, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px", fontFamily: "system-ui,sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: GRADIENT, borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 40 }}>🏭</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{tenant?.name || "Entreprise de Production"}</h1>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Gestion Interne — Producteur</p>
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
              { label: "Produits",          val: dash?.totalProducts || 0,          emoji: "📦" },
              { label: "Lots en cours",     val: dash?.lotsEnCours || 0,            emoji: "🏭", warn: (dash?.lotsEnCours||0) > 0 },
              { label: "Commandes actives", val: dash?.commandesEnAttente || 0,     emoji: "📋", warn: (dash?.commandesEnAttente||0) > 0 },
              { label: "Personnel",         val: dash?.totalStaff || 0,             emoji: "👷" },
              { label: "CA ce mois",        val: fmtMoney(dash?.caCeMois || 0),     emoji: "💵" },
            ].map(s => (
              <div key={s.label} style={{ background: s.warn ? "#fff7ed" : COLOR_BG, border: `1px solid ${s.warn ? "#fed7aa" : COLOR_BDR}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: s.warn ? "#ea580c" : COLOR }}>{s.val}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {(dash?.recentOrders?.length > 0) && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Dernières commandes</h3>
              {dash.recentOrders.map((o: any) => {
                const st = STATUT_ORDER[o.statut] || STATUT_ORDER.en_attente;
                return (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{o.client_nom} · {o.produit_nom}</span>
                    <span style={{ background: st.bg, color: st.color, padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PRODUITS */}
      {tab === "products" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>📦 Produits fabriqués</h2>
            <button onClick={() => setShowAddProd(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddProd && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={prodForm.nom} onChange={e => setProdForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Catégorie</label><input style={inp} value={prodForm.categorie} onChange={e => setProdForm(f => ({ ...f, categorie: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Unité</label>
                  <select style={inp} value={prodForm.unite} onChange={e => setProdForm(f => ({ ...f, unite: e.target.value }))}>
                    {["kg", "tonne", "litre", "pièce", "carton", "sac", "m²", "m³"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prix unitaire (GNF)</label><input style={inp} type="number" value={prodForm.prix_unitaire} onChange={e => setProdForm(f => ({ ...f, prix_unitaire: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Stock initial</label><input style={inp} type="number" value={prodForm.stock} onChange={e => setProdForm(f => ({ ...f, stock: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Description</label><input style={inp} value={prodForm.description} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveProd} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddProd(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {products.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun produit encore.</p>}
            {products.map(p => (
              <div key={p.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.nom}</div>
                    {p.categorie && <div style={{ fontSize: 12, color: "#64748b" }}>{p.categorie}</div>}
                    <div style={{ fontSize: 13, color: COLOR, fontWeight: 700, marginTop: 4 }}>{fmtMoney(p.prix_unitaire)} / {p.unite}</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Stock: <strong>{p.stock} {p.unite}</strong></div>
                  </div>
                  <button onClick={() => deleteProd(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18 }}>🗑</button>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={() => adjustStock(p.id, -1)} style={btn("#fef2f2", "#dc2626")}>−1</button>
                  <button onClick={() => adjustStock(p.id, 1)} style={btn("#f0fdf4", "#16a34a")}>+1</button>
                  <button onClick={() => { const n = prompt(`Ajuster le stock (+/−) :`, "10"); if (n) adjustStock(p.id, +n); }} style={btn(COLOR_BG, COLOR)}>±N</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOTS DE PRODUCTION */}
      {tab === "lots" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>🏭 Lots de production</h2>
            <button onClick={() => { setShowAddLot(true); if (!products.length) loadProducts(); }} style={btn(COLOR)}>+ Nouveau lot</button>
          </div>
          {showAddLot && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Produit *</label>
                  <select style={inp} value={lotForm.product_id} onChange={e => setLotForm(f => ({ ...f, product_id: e.target.value }))}>
                    <option value="">Choisir</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.unite})</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Quantité prévue *</label><input style={inp} type="number" value={lotForm.quantite_prevue} onChange={e => setLotForm(f => ({ ...f, quantite_prevue: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Date début</label><input style={inp} type="date" value={lotForm.date_debut} onChange={e => setLotForm(f => ({ ...f, date_debut: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Date fin prévue</label><input style={inp} type="date" value={lotForm.date_fin_prevue} onChange={e => setLotForm(f => ({ ...f, date_fin_prevue: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Notes</label><input style={inp} value={lotForm.notes} onChange={e => setLotForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveLot} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Créer"}</button>
                <button onClick={() => setShowAddLot(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          {lots.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun lot encore.</p>}
          {lots.map(lot => {
            const st = STATUT_LOT[lot.statut] || STATUT_LOT.en_attente;
            return (
              <div key={lot.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{lot.produit_nom}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>Prévu: {lot.quantite_prevue} · Produit: {lot.quantite_produite || 0}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Début: {fmtDate(lot.date_debut)} · Fin prévue: {fmtDate(lot.date_fin_prevue)}</div>
                    {lot.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{lot.notes}</div>}
                  </div>
                  <span style={{ background: st.bg, color: st.color, padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 12 }}>{st.label}</span>
                </div>
                {lot.statut === "en_attente" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button onClick={() => patchLot(lot.id, "en_cours")} style={btn("#eff6ff", "#2563eb")}>Démarrer</button>
                    <button onClick={() => patchLot(lot.id, "annule")} style={btn("#fef2f2", "#dc2626")}>Annuler</button>
                  </div>
                )}
                {lot.statut === "en_cours" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button onClick={() => patchLot(lot.id, "termine")} style={btn(COLOR)}>Terminer ✓</button>
                    <button onClick={() => patchLot(lot.id, "annule")} style={btn("#fef2f2", "#dc2626")}>Annuler</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* COMMANDES */}
      {tab === "orders" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>📋 Commandes clients</h2>
            <button onClick={() => { setShowAddOrder(true); if (!products.length) loadProducts(); }} style={btn(COLOR)}>+ Nouvelle</button>
          </div>
          {showAddOrder && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Client *</label><input style={inp} value={ordForm.client_nom} onChange={e => setOrdForm(f => ({ ...f, client_nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={ordForm.client_telephone} onChange={e => setOrdForm(f => ({ ...f, client_telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Produit *</label>
                  <select style={inp} value={ordForm.product_id} onChange={e => setOrdForm(f => ({ ...f, product_id: e.target.value }))}>
                    <option value="">Choisir</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.unite})</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Quantité *</label><input style={inp} type="number" value={ordForm.quantite} onChange={e => setOrdForm(f => ({ ...f, quantite: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Montant total (GNF)</label><input style={inp} type="number" value={ordForm.montant_total} onChange={e => setOrdForm(f => ({ ...f, montant_total: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Livraison prévue</label><input style={inp} type="date" value={ordForm.date_livraison_prevue} onChange={e => setOrdForm(f => ({ ...f, date_livraison_prevue: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Notes</label><input style={inp} value={ordForm.notes} onChange={e => setOrdForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveOrder} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddOrder(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          {orders.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucune commande encore.</p>}
          {orders.map(ord => {
            const st = STATUT_ORDER[ord.statut] || STATUT_ORDER.en_attente;
            return (
              <div key={ord.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ord.client_nom} {ord.client_telephone && <span style={{ fontSize: 12, color: "#64748b" }}>· {ord.client_telephone}</span>}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{ord.produit_nom} · {ord.quantite} unités</div>
                    <div style={{ fontSize: 13, color: COLOR, fontWeight: 700 }}>{fmtMoney(ord.montant_total)}</div>
                    {ord.date_livraison_prevue && <div style={{ fontSize: 12, color: "#94a3b8" }}>Livraison prévue: {fmtDate(ord.date_livraison_prevue)}</div>}
                  </div>
                  <span style={{ background: st.bg, color: st.color, padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 12 }}>{st.label}</span>
                </div>
                {ord.statut !== "livre" && ord.statut !== "annule" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {ord.statut === "en_attente"    && <button onClick={() => patchOrder(ord.id, "en_production")} style={btn("#eff6ff", "#2563eb")}>En production</button>}
                    {ord.statut === "en_production" && <button onClick={() => patchOrder(ord.id, "pret")}          style={btn("#f0fdf4", "#16a34a")}>Prêt</button>}
                    {ord.statut === "pret"          && <button onClick={() => patchOrder(ord.id, "livre")}         style={btn(COLOR)}>Livré ✓</button>}
                    <button onClick={() => patchOrder(ord.id, "annule")} style={btn("#fef2f2", "#dc2626")}>Annuler</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PERSONNEL */}
      {tab === "staff" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>👷 Personnel</h2>
            <button onClick={() => setShowAddStaff(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddStaff && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={stForm.nom} onChange={e => setStForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prénom</label><input style={inp} value={stForm.prenom} onChange={e => setStForm(f => ({ ...f, prenom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Poste</label>
                  <select style={inp} value={stForm.poste} onChange={e => setStForm(f => ({ ...f, poste: e.target.value }))}>
                    {["Ouvrier", "Chef d'atelier", "Technicien", "Contrôleur qualité", "Magasinier", "Directeur production"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={stForm.telephone} onChange={e => setStForm(f => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Salaire (GNF)</label><input style={inp} type="number" value={stForm.salaire} onChange={e => setStForm(f => ({ ...f, salaire: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveStaff} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddStaff(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {staff.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun membre du personnel.</p>}
            {staff.map(s => (
              <div key={s.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.nom} {s.prenom}</div>
                    <div style={{ fontSize: 13, color: COLOR }}>{s.poste}</div>
                    {s.telephone && <div style={{ fontSize: 12, color: "#64748b" }}>📞 {s.telephone}</div>}
                    {s.salaire > 0 && <div style={{ fontSize: 12, color: "#64748b" }}>Salaire: {fmtMoney(s.salaire)}</div>}
                  </div>
                  <button onClick={() => deleteStaff(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18 }}>🗑</button>
                </div>
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
                    {["general", "recrutement", "appel_offre", "evenement"].map(t => <option key={t}>{t}</option>)}
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
