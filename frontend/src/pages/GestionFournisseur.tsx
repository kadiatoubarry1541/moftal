import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/supplier-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "products" | "clients" | "orders" | "announcements";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const CYAN = "#0e7490";
const CYAN_BG = "#ecfeff";
const CYAN_BORDER = "#a5f3fc";

const STATUT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  en_attente:  { bg: "#fffbeb", color: "#b45309", label: "En attente" },
  en_cours:    { bg: "#eff6ff", color: "#1d4ed8", label: "En cours" },
  livree:      { bg: "#f0fdf4", color: "#15803d", label: "Livrée" },
  annulee:     { bg: "#fff1f2", color: "#be123c", label: "Annulée" },
};

export default function GestionFournisseur() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [prForm, setPrForm] = useState({ nom: "", categorie: "", prix_gros: "", prix_detail: "", stock: "", unite: "unité" });
  const [clForm, setClForm] = useState({ nom: "", telephone: "", adresse: "", type_client: "revendeur" });
  const [orForm, setOrForm] = useState({ client_nom: "", client_id: "", montant_total: "", statut: "en_attente", date_commande: new Date().toISOString().split("T")[0], notes: "" });
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
    if (tab === "products")     fetch(`${BASE(tenantCode)}/products`,      { headers: h }).then(r => r.json()).then(d => d.success && setProducts(d.products || []));
    if (tab === "clients")      fetch(`${BASE(tenantCode)}/clients`,       { headers: h }).then(r => r.json()).then(d => d.success && setClients(d.clients || []));
    if (tab === "orders")       fetch(`${BASE(tenantCode)}/orders`,        { headers: h }).then(r => r.json()).then(d => d.success && setOrders(d.orders || []));
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

  const handleAddProduct = async () => {
    if (!prForm.nom) return;
    const d = await post(`${BASE(tenantCode!)}/products`, { ...prForm, prix_gros: +prForm.prix_gros, prix_detail: +prForm.prix_detail, stock: +prForm.stock });
    if (d.success) { setShowAddProduct(false); setPrForm({ nom: "", categorie: "", prix_gros: "", prix_detail: "", stock: "", unite: "unité" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/products`, { headers: h }).then(r => r.json()).then(d => d.success && setProducts(d.products || [])); }
  };

  const handleAddClient = async () => {
    if (!clForm.nom) return;
    const d = await post(`${BASE(tenantCode!)}/clients`, clForm);
    if (d.success) { setShowAddClient(false); setClForm({ nom: "", telephone: "", adresse: "", type_client: "revendeur" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/clients`, { headers: h }).then(r => r.json()).then(d => d.success && setClients(d.clients || [])); }
  };

  const handleAddOrder = async () => {
    if (!orForm.montant_total) return;
    const d = await post(`${BASE(tenantCode!)}/orders`, { ...orForm, montant_total: +orForm.montant_total });
    if (d.success) { setShowAddOrder(false); setOrForm({ client_nom: "", client_id: "", montant_total: "", statut: "en_attente", date_commande: new Date().toISOString().split("T")[0], notes: "" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/orders`, { headers: h }).then(r => r.json()).then(d => d.success && setOrders(d.orders || [])); }
  };

  const handleAddAnn = async () => {
    if (!anForm.titre || !anForm.contenu) return;
    const d = await post(`${BASE(tenantCode!)}/announcements`, anForm);
    if (d.success) { setShowAddAnn(false); setAnForm({ titre: "", contenu: "", type: "general" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/announcements`, { headers: h }).then(r => r.json()).then(d => d.success && setAnnouncements(d.announcements || [])); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: "4px solid #e0f2fe", borderTopColor: CYAN, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate("/gestion-interne")} style={{ marginTop: 16, padding: "10px 24px", background: CYAN, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Retour</button>
    </div>
  );

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard",     label: "Dashboard",       emoji: "📊" },
    { id: "products",      label: "Produits",         emoji: "📦" },
    { id: "clients",       label: "Clients / Revendeurs", emoji: "🤝" },
    { id: "orders",        label: "Commandes",        emoji: "📋" },
    { id: "announcements", label: "Annonces",         emoji: "📢" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "10px 20px", background: bg, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 });
  const card: React.CSSProperties = { background: "white", border: `1px solid ${CYAN_BORDER}`, borderRadius: 12, padding: "16px 18px", marginBottom: 10 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,#0e7490,#0891b2)`, borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 44 }}>🚚</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: "white", fontSize: 20 }}>{tenant?.name || "Fournisseur / Grossiste"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Code : {tenantCode} · Gestion Interne</div>
        </div>
        <button onClick={() => navigate(-1 as any)} style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>← Retour</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", background: tab === t.id ? CYAN : "#f1f5f9", color: tab === t.id ? "white" : "#64748b", transition: "all 0.15s" }}>
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
              { label: "Produits actifs", value: dash.totalProducts ?? 0, color: "#0e7490", bg: "#ecfeff",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
              { label: "Clients / Revendeurs", value: dash.totalClients ?? 0, color: "#0891b2", bg: "#f0f9ff",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { label: "Commandes en attente", value: dash.commandesEnAttente ?? 0, color: "#b45309", bg: "#fffbeb",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
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
          {/* CA Banner */}
          <div style={{ background: "linear-gradient(135deg,#0c4a6e,#0e7490)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, color: "white" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Chiffre d'affaires ce mois</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{(dash.caMois || 0).toLocaleString("fr-FR")} GNF</div>
            </div>
            <div style={{ textAlign: "right", opacity: 0.9 }}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>Produits</div>
              <div style={{ fontWeight: 700 }}>{dash.totalProducts ?? 0}</div>
              <div style={{ fontSize: 12, marginTop: 6, marginBottom: 2 }}>Clients</div>
              <div style={{ fontWeight: 700 }}>{dash.totalClients ?? 0}</div>
            </div>
          </div>
          {/* Quick Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Ajouter produit", icon: "📦", tab: "products" as Tab },
              { label: "Nouveau client",  icon: "🤝", tab: "clients" as Tab },
              { label: "Commande",        icon: "📋", tab: "orders" as Tab },
              { label: "Annonce",         icon: "📢", tab: "announcements" as Tab },
            ].map(a => (
              <button key={a.label} onClick={() => setTab(a.tab)}
                style={{ background: "white", border: `1px solid ${CYAN_BORDER}`, borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                onMouseOver={e => (e.currentTarget.style.borderColor = CYAN)}
                onMouseOut={e => (e.currentTarget.style.borderColor = CYAN_BORDER)}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{a.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{a.label}</div>
              </button>
            ))}
          </div>
          {/* Recent Orders */}
          <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Dernières commandes</h3>
              <button onClick={() => setTab("orders")} style={{ fontSize: 12, color: CYAN, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir toutes →</button>
            </div>
            {(dash.recentOrders?.length ?? 0) === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 14 }}>Aucune commande récente</div>
            ) : dash.recentOrders.map((o: any) => {
              const sc = STATUT_COLORS[o.statut] || { bg: "#f1f5f9", color: "#64748b", label: o.statut };
              return (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#ecfeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📋</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.client_nom || "Client"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(o.date_commande)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: CYAN, fontSize: 13 }}>{(o.montant_total || 0).toLocaleString("fr-FR")} GNF</div>
                    <span style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6 }}>{sc.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PRODUITS ── */}
      {tab === "products" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📦 Produits ({products.length})</h2>
            <button onClick={() => setShowAddProduct(!showAddProduct)} style={btn(CYAN)}>{showAddProduct ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddProduct && (
            <div style={{ background: CYAN_BG, border: `1px solid ${CYAN_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom du produit *" value={prForm.nom} onChange={e => setPrForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Catégorie" value={prForm.categorie} onChange={e => setPrForm(p => ({ ...p, categorie: e.target.value }))} />
                <input style={inp} placeholder="Prix gros (GNF)" type="number" value={prForm.prix_gros} onChange={e => setPrForm(p => ({ ...p, prix_gros: e.target.value }))} />
                <input style={inp} placeholder="Prix détail (GNF)" type="number" value={prForm.prix_detail} onChange={e => setPrForm(p => ({ ...p, prix_detail: e.target.value }))} />
                <input style={inp} placeholder="Stock" type="number" value={prForm.stock} onChange={e => setPrForm(p => ({ ...p, stock: e.target.value }))} />
                <input style={inp} placeholder="Unité (kg, L, unité…)" value={prForm.unite} onChange={e => setPrForm(p => ({ ...p, unite: e.target.value }))} />
              </div>
              <button onClick={handleAddProduct} disabled={saving} style={btn(CYAN)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          {products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun produit enregistré</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: CYAN_BG }}>
                    {["Produit","Catégorie","Prix gros","Prix détail","Stock","Unité","Action"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#0f172a", borderBottom: `2px solid ${CYAN_BORDER}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{p.nom}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{p.categorie || "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#0f172a" }}>{(p.prix_gros || 0).toLocaleString("fr-FR")} GNF</td>
                      <td style={{ padding: "10px 12px", color: "#0f172a" }}>{(p.prix_detail || 0).toLocaleString("fr-FR")} GNF</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: p.stock > 0 ? "#15803d" : "#be123c" }}>{p.stock}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{p.unite || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={async () => { await del(`${BASE(tenantCode!)}/products/${p.id}`); setProducts(ps => ps.filter(x => x.id !== p.id)); }}
                          style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CLIENTS / REVENDEURS ── */}
      {tab === "clients" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>🤝 Clients / Revendeurs ({clients.length})</h2>
            <button onClick={() => setShowAddClient(!showAddClient)} style={btn(CYAN)}>{showAddClient ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddClient && (
            <div style={{ background: CYAN_BG, border: `1px solid ${CYAN_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom *" value={clForm.nom} onChange={e => setClForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={clForm.telephone} onChange={e => setClForm(p => ({ ...p, telephone: e.target.value }))} />
                <input style={inp} placeholder="Adresse" value={clForm.adresse} onChange={e => setClForm(p => ({ ...p, adresse: e.target.value }))} />
                <select style={inp} value={clForm.type_client} onChange={e => setClForm(p => ({ ...p, type_client: e.target.value }))}>
                  <option value="revendeur">Revendeur</option>
                  <option value="grossiste">Grossiste</option>
                  <option value="detaillant">Détaillant</option>
                  <option value="entreprise">Entreprise</option>
                </select>
              </div>
              <button onClick={handleAddClient} disabled={saving} style={btn(CYAN)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
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
                  <span style={{ fontSize: 11, fontWeight: 700, background: CYAN_BG, color: CYAN, padding: "3px 10px", borderRadius: 6, border: `1px solid ${CYAN_BORDER}` }}>{c.type_client}</span>
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

      {/* ── COMMANDES ── */}
      {tab === "orders" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📋 Commandes ({orders.length})</h2>
            <button onClick={() => setShowAddOrder(!showAddOrder)} style={btn(CYAN)}>{showAddOrder ? "✕ Annuler" : "+ Nouvelle commande"}</button>
          </div>
          {showAddOrder && (
            <div style={{ background: CYAN_BG, border: `1px solid ${CYAN_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom client *" value={orForm.client_nom} onChange={e => setOrForm(p => ({ ...p, client_nom: e.target.value }))} />
                <input style={inp} placeholder="Montant total (GNF) *" type="number" value={orForm.montant_total} onChange={e => setOrForm(p => ({ ...p, montant_total: e.target.value }))} />
                <select style={inp} value={orForm.statut} onChange={e => setOrForm(p => ({ ...p, statut: e.target.value }))}>
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="livree">Livrée</option>
                  <option value="annulee">Annulée</option>
                </select>
                <input style={inp} type="date" value={orForm.date_commande} onChange={e => setOrForm(p => ({ ...p, date_commande: e.target.value }))} />
              </div>
              <textarea style={{ ...inp, resize: "vertical", minHeight: 64 }} placeholder="Notes…" value={orForm.notes} onChange={e => setOrForm(p => ({ ...p, notes: e.target.value }))} />
              <div style={{ marginTop: 10 }}>
                <button onClick={handleAddOrder} disabled={saving} style={btn(CYAN)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </div>
          )}
          {orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune commande enregistrée</div>
          ) : orders.map(o => {
            const sc = STATUT_COLORS[o.statut] || { bg: "#f1f5f9", color: "#64748b", label: o.statut };
            return (
              <div key={o.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{o.client_nom || "Client inconnu"}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6 }}>{sc.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Date : {fmtDate(o.date_commande)}</div>
                    {o.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{o.notes}</div>}
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: CYAN }}>{(o.montant_total || 0).toLocaleString("fr-FR")} GNF</div>
                    <select
                      value={o.statut}
                      onChange={async e => { await patchStatut(`${BASE(tenantCode!)}/orders/${o.id}/statut`, e.target.value); setOrders(os => os.map(x => x.id === o.id ? { ...x, statut: e.target.value } : x)); }}
                      style={{ marginTop: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, cursor: "pointer" }}>
                      <option value="en_attente">En attente</option>
                      <option value="en_cours">En cours</option>
                      <option value="livree">Livrée</option>
                      <option value="annulee">Annulée</option>
                    </select>
                    <br />
                    <button onClick={async () => { await del(`${BASE(tenantCode!)}/orders/${o.id}`); setOrders(os => os.filter(x => x.id !== o.id)); }}
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
            <button onClick={() => setShowAddAnn(!showAddAnn)} style={btn(CYAN)}>{showAddAnn ? "✕ Annuler" : "+ Publier"}</button>
          </div>
          {showAddAnn && (
            <div style={{ background: CYAN_BG, border: `1px solid ${CYAN_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <input style={{ ...inp, marginBottom: 10 }} placeholder="Titre *" value={anForm.titre} onChange={e => setAnForm(p => ({ ...p, titre: e.target.value }))} />
              <textarea style={{ ...inp, resize: "vertical", minHeight: 80, marginBottom: 10 }} placeholder="Contenu *" value={anForm.contenu} onChange={e => setAnForm(p => ({ ...p, contenu: e.target.value }))} />
              <select style={{ ...inp, marginBottom: 10 }} value={anForm.type} onChange={e => setAnForm(p => ({ ...p, type: e.target.value }))}>
                <option value="general">Général</option>
                <option value="offre">Offre commerciale</option>
                <option value="rupture">Rupture de stock</option>
                <option value="nouveau">Nouveau produit</option>
                <option value="urgent">Urgent</option>
              </select>
              <button onClick={handleAddAnn} disabled={saving} style={btn(CYAN)}>{saving ? "Publication…" : "Publier"}</button>
            </div>
          )}
          {announcements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune annonce publiée</div>
          ) : announcements.map(a => (
            <div key={a.id} style={{ ...card, borderLeft: `4px solid ${CYAN}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{a.titre}</div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 8 }}>{a.contenu}</div>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#94a3b8" }}>
                    <span style={{ background: CYAN_BG, color: CYAN, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{a.type}</span>
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
