import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";

const API_ROOT = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API_ROOT}/api/commerce-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "products" | "sales" | "clients" | "expenses";

function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const COLOR      = "#d97706";
const COLOR_BG   = "#fffbeb";
const COLOR_BDR  = "#fde68a";
const COLOR_DARK = "#92400e";
const GRADIENT   = "linear-gradient(135deg,#d97706,#f59e0b)";

const CATS_EXP = ["Transport", "Loyer", "Électricité", "Eau", "Emballage", "Réparation", "Approvisionnement", "Autre"];

interface Props { mode?: "commerce" | "vendeur" }

export default function GestionCommerce({ mode = "commerce" }: Props) {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showNewSale, setShowNewSale] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);

  const [pForm, setPForm] = useState({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce" });
  const [sForm, setSForm] = useState({ client_nom: "", type_paiement: "especes", montant_recu: "", est_credit: false, notes: "", items: [{ nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] });
  const [cForm, setCForm] = useState({ nom: "", telephone: "", adresse: "" });
  const [eForm, setEForm] = useState({ description: "", montant: "", categorie: "Transport" });
  const [saving, setSaving] = useState(false);

  const b = (code: string) => BASE(code);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadAll();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode) return;
    if (tab === "products") loadProducts();
    if (tab === "sales") { loadSales(); loadProducts(); }
    if (tab === "clients") loadClients();
    if (tab === "expenses") loadExpenses();
  }, [tab, tenantCode]);

  async function loadAll() {
    setLoading(true);
    try {
      const [tenantRes, dashRes] = await Promise.all([
        fetch(`${b(tenantCode!)}/info`, { headers: auth() }),
        fetch(`${b(tenantCode!)}/dashboard`, { headers: auth() })
      ]);
      const tData = await tenantRes.json();
      if (!tData.success) { setError(tData.message || "Accès refusé"); setLoading(false); return; }
      setTenant(tData.tenant);
      const dData = await dashRes.json();
      if (dData.success) setDash(dData);
    } catch { setError("Erreur de connexion"); }
    setLoading(false);
  }

  async function loadProducts() {
    const r = await fetch(`${b(tenantCode!)}/products`, { headers: auth() });
    const d = await r.json();
    if (d.success) setProducts(d.products || []);
  }
  async function loadSales() {
    const r = await fetch(`${b(tenantCode!)}/sales`, { headers: auth() });
    const d = await r.json();
    if (d.success) setSales(d.sales || []);
  }
  async function loadClients() {
    const r = await fetch(`${b(tenantCode!)}/clients`, { headers: auth() });
    const d = await r.json();
    if (d.success) setClients(d.clients || []);
  }
  async function loadExpenses() {
    const r = await fetch(`${b(tenantCode!)}/expenses`, { headers: auth() });
    const d = await r.json();
    if (d.success) setExpenses(d.expenses || []);
  }

  async function saveProduct() {
    if (!pForm.nom || !pForm.prix_vente) return;
    setSaving(true);
    const url = editProduct ? `${b(tenantCode!)}/products/${editProduct.id}` : `${b(tenantCode!)}/products`;
    const method = editProduct ? "PUT" : "POST";
    await fetch(url, { method, headers: auth(), body: JSON.stringify({ ...pForm, prix_vente: +pForm.prix_vente, prix_achat: +pForm.prix_achat, stock: +pForm.stock, stock_min: +pForm.stock_min }) });
    setSaving(false); setShowAddProduct(false); setEditProduct(null);
    setPForm({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce" });
    loadProducts();
  }
  async function updateStock(id: number, delta: number) {
    await fetch(`${b(tenantCode!)}/products/${id}/stock`, { method: "PUT", headers: auth(), body: JSON.stringify({ delta }) });
    loadProducts();
    const r = await fetch(`${b(tenantCode!)}/dashboard`, { headers: auth() });
    const d = await r.json();
    if (d.success) setDash(d);
  }
  async function saveSale() {
    const items = sForm.items.filter(i => i.nom && i.prix_unitaire);
    if (!items.length) return;
    setSaving(true);
    const total = items.reduce((s, i) => s + +i.prix_unitaire * +i.quantite, 0);
    const body: any = { ...sForm, items: items.map(i => ({ ...i, prix_unitaire: +i.prix_unitaire, quantite: +i.quantite })), montant_recu: sForm.montant_recu ? +sForm.montant_recu : total };
    await fetch(`${b(tenantCode!)}/sales`, { method: "POST", headers: auth(), body: JSON.stringify(body) });
    setSaving(false); setShowNewSale(false);
    setSForm({ client_nom: "", type_paiement: "especes", montant_recu: "", est_credit: false, notes: "", items: [{ nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] });
    loadSales(); loadAll(); loadProducts();
  }
  async function saveClient() {
    if (!cForm.nom) return;
    setSaving(true);
    await fetch(`${b(tenantCode!)}/clients`, { method: "POST", headers: auth(), body: JSON.stringify(cForm) });
    setSaving(false); setShowAddClient(false); setCForm({ nom: "", telephone: "", adresse: "" });
    loadClients();
  }
  async function payCredit(id: number) {
    const m = prompt("Montant à rembourser (GNF) :");
    if (!m) return;
    await fetch(`${b(tenantCode!)}/clients/${id}/pay-credit`, { method: "PUT", headers: auth(), body: JSON.stringify({ montant: +m }) });
    loadClients();
  }
  async function saveExpense() {
    if (!eForm.description || !eForm.montant) return;
    setSaving(true);
    await fetch(`${b(tenantCode!)}/expenses`, { method: "POST", headers: auth(), body: JSON.stringify(eForm) });
    setSaving(false); setShowAddExpense(false); setEForm({ description: "", montant: "", categorie: "Transport" });
    loadExpenses(); loadAll();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${COLOR_BDR}`, borderTopColor: COLOR, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#0f172a", marginBottom: 8 }}>{error}</h2>
      <button onClick={() => navigate("/gestion-interne")} style={{ padding: "10px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Retour</button>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Tableau de bord", icon: "📊" },
    { id: "products",  label: "Articles / Produits", icon: "📦" },
    { id: "sales",     label: "Ventes", icon: "🧾" },
    { id: "clients",   label: "Clients", icon: "👥" },
    { id: "expenses",  label: "Dépenses", icon: "💸" },
  ];

  const inputStyle = { width: "100%", border: `1px solid ${COLOR_BDR}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
  const formBg = { background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 12, padding: 20, marginBottom: 16 };
  const labelStyle = { fontSize: 11, fontWeight: 600 as const, color: COLOR_DARK, marginBottom: 4, display: "block" as const };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ background: GRADIENT, borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🏪</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "white" }}>{tenant?.name || "Boutique"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{tenantCode} · Gestion Commerce</span>
              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 20, padding: "2px 10px", fontWeight: 700, fontSize: 11 }}>🛒 Vente en Détail incluse</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate(`/commerce/${tenantCode}`)} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.25)", color: "white", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🌐 Voir ma vitrine</button>
          <button onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Retour</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f8fafc", borderRadius: 10, padding: 4, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, minWidth: 80, padding: "8px 4px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? "white" : "transparent", color: tab === t.id ? COLOR : "#64748b", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dash && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Articles / Produits", value: dash.totalProducts, icon: "📦", color: "#3b82f6" },
              { label: "Stock faible", value: dash.alertesStock, icon: "⚠️", color: "#ef4444" },
              { label: "Ventes aujourd'hui", value: dash.ventesAujourdhui, icon: "🧾", color: "#10b981" },
              { label: "Recette aujourd'hui", value: fmtMoney(dash.caAujourdhui), icon: "💰", color: COLOR, small: true },
              { label: "Recette ce mois", value: fmtMoney(dash.caMois), icon: "📈", color: "#8b5cf6", small: true },
              { label: "Crédits clients", value: fmtMoney(dash.totalCredits), icon: "🤝", color: "#f97316", small: true },
              { label: "Dépenses aujourd'hui", value: fmtMoney(dash.depensesAujourdhui), icon: "💸", color: "#dc2626", small: true },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: s.small ? 14 : 24, color: s.color, marginTop: 6 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {dash.recentSales?.length > 0 && (
            <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Dernières ventes</div>
              {dash.recentSales.map((s: any) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.client_nom || "Client"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(s.date_vente)} · {s.type_paiement}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: s.est_credit ? "#ef4444" : "#10b981", fontSize: 14 }}>{fmtMoney(s.total)}</div>
                </div>
              ))}
            </div>
          )}

          {dash.lowStockProducts?.length > 0 && (
            <div style={{ background: "#fff7ed", borderRadius: 12, padding: 20, border: "1px solid #fed7aa" }}>
              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: "#c2410c" }}>⚠️ Stock faible — réapprovisionnement nécessaire</div>
              {dash.lowStockProducts.map((p: any) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                  <span>{p.nom}</span>
                  <span style={{ fontWeight: 700, color: "#ef4444" }}>{p.stock} {p.unite} restant(s)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ARTICLES / PRODUITS ── */}
      {tab === "products" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Articles / Produits ({products.length})</div>
            <button onClick={() => setShowAddProduct(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
          </div>

          {showAddProduct && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{editProduct ? "Modifier l'article" : "Nouvel article / produit"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  ["Nom de l'article *", "nom"],
                  ["Catégorie", "categorie"],
                  ["Prix de vente (GNF) *", "prix_vente"],
                  ["Prix d'achat (GNF)", "prix_achat"],
                  ["Quantité en stock", "stock"],
                  ["Stock minimum alerte", "stock_min"],
                  ["Unité (pièce, kg, litre…)", "unite"],
                ] as [string, string][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input value={(pForm as any)[key]} onChange={e => setPForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={saveProduct} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => { setShowAddProduct(false); setEditProduct(null); setPForm({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce" }); }} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>
            {products.map(p => (
              <div key={p.id} style={{ background: "white", borderRadius: 12, padding: 16, border: `1px solid ${p.stock <= p.stock_min ? "#fca5a5" : "#f1f5f9"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.nom}</div>
                {p.categorie && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{p.categorie}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span>Vente : <b style={{ color: "#10b981" }}>{fmtMoney(p.prix_vente)}</b></span>
                  <span style={{ color: p.stock <= p.stock_min ? "#ef4444" : "#64748b" }}>Stock : <b>{p.stock} {p.unite}</b></span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => updateStock(p.id, -1)} style={{ flex: 1, padding: "4px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>−1</button>
                  <button onClick={() => updateStock(p.id, 1)} style={{ flex: 1, padding: "4px", background: "#dcfce7", color: "#16a34a", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>+1</button>
                  <button onClick={() => { setEditProduct(p); setPForm({ nom: p.nom, categorie: p.categorie || "", prix_vente: p.prix_vente, prix_achat: p.prix_achat || "", stock: p.stock, stock_min: p.stock_min || "5", unite: p.unite || "pièce" }); setShowAddProduct(true); }}
                    style={{ padding: "4px 8px", background: COLOR_BG, color: COLOR, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✏️</button>
                </div>
              </div>
            ))}
            {products.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun article. Ajoutez votre premier produit.</div>}
          </div>
        </div>
      )}

      {/* ── VENTES ── */}
      {tab === "sales" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Ventes ({sales.length})</div>
            <button onClick={() => setShowNewSale(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Nouvelle vente</button>
          </div>

          {showNewSale && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Enregistrer une vente</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Nom du client</label>
                  <input value={sForm.client_nom} onChange={e => setSForm(f => ({ ...f, client_nom: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mode de paiement</label>
                  <select value={sForm.type_paiement} onChange={e => setSForm(f => ({ ...f, type_paiement: e.target.value }))} style={{ ...inputStyle, width: "100%" }}>
                    {["especes", "orange_money", "mobile_money", "virement", "credit"].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Articles vendus</div>
              {sForm.items.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select value={item.product_id} onChange={e => {
                    const p = products.find(p => p.id === +e.target.value);
                    setSForm(f => { const items = [...f.items]; items[i] = { ...items[i], product_id: e.target.value, nom: p?.nom || "", prix_unitaire: p?.prix_vente?.toString() || "" }; return { ...f, items }; });
                  }} style={{ border: `1px solid ${COLOR_BDR}`, borderRadius: 6, padding: "7px 8px", fontSize: 13, outline: "none" }}>
                    <option value="">-- Article --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nom} ({fmtMoney(p.prix_vente)})</option>)}
                  </select>
                  <input placeholder="Prix" value={item.prix_unitaire} onChange={e => setSForm(f => { const items = [...f.items]; items[i] = { ...items[i], prix_unitaire: e.target.value }; return { ...f, items }; })} style={{ border: `1px solid ${COLOR_BDR}`, borderRadius: 6, padding: "7px 8px", fontSize: 13, outline: "none" }} />
                  <input placeholder="Qté" value={item.quantite} onChange={e => setSForm(f => { const items = [...f.items]; items[i] = { ...items[i], quantite: e.target.value }; return { ...f, items }; })} style={{ border: `1px solid ${COLOR_BDR}`, borderRadius: 6, padding: "7px 8px", fontSize: 13, outline: "none" }} />
                  <button onClick={() => setSForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "7px 10px", cursor: "pointer" }}>×</button>
                </div>
              ))}
              <button onClick={() => setSForm(f => ({ ...f, items: [...f.items, { nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] }))} style={{ fontSize: 12, color: COLOR, background: "none", border: "none", cursor: "pointer", marginBottom: 12 }}>+ Ajouter un article</button>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 700 }}>Total : {fmtMoney(sForm.items.reduce((s, i) => s + (+i.prix_unitaire || 0) * (+i.quantite || 1), 0))}</div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={sForm.est_credit} onChange={e => setSForm(f => ({ ...f, est_credit: e.target.checked }))} />
                  Vente à crédit
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveSale} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer la vente"}</button>
                <button onClick={() => setShowNewSale(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sales.map(s => (
              <div key={s.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: `1px solid ${s.est_credit ? "#fca5a5" : "#f1f5f9"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.client_nom || "Client"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(s.date_vente)} · {s.type_paiement}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: s.est_credit ? "#ef4444" : "#10b981" }}>{fmtMoney(s.total)}</div>
                  {s.est_credit && <div style={{ fontSize: 11, color: "#ef4444" }}>Crédit</div>}
                </div>
              </div>
            ))}
            {sales.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune vente enregistrée.</div>}
          </div>
        </div>
      )}

      {/* ── CLIENTS ── */}
      {tab === "clients" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Clients ({clients.length})</div>
            <button onClick={() => setShowAddClient(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
          </div>

          {showAddClient && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouveau client</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([["Nom *", "nom"], ["Téléphone", "telephone"], ["Adresse / Quartier", "adresse"]] as [string, string][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input value={(cForm as any)[key]} onChange={e => setCForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveClient} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddClient(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {clients.map(c => (
              <div key={c.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: `1px solid ${c.credit_total > 0 ? "#fca5a5" : "#f1f5f9"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nom}</div>
                  {c.telephone && <div style={{ fontSize: 12, color: "#64748b" }}>{c.telephone}</div>}
                  {c.adresse && <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.adresse}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {c.credit_total > 0 ? (
                    <>
                      <div style={{ fontWeight: 700, color: "#ef4444" }}>Crédit : {fmtMoney(c.credit_total)}</div>
                      <button onClick={() => payCredit(c.id)} style={{ padding: "6px 12px", background: "#dcfce7", color: "#16a34a", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Rembourser</button>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Pas de crédit</div>
                  )}
                </div>
              </div>
            ))}
            {clients.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun client enregistré.</div>}
          </div>
        </div>
      )}

      {/* ── DÉPENSES ── */}
      {tab === "expenses" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>Dépenses de la boutique — Vente en Détail incluse (loyer, transport, approvisionnement…)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Dépenses ({expenses.length})</div>
            <button onClick={() => setShowAddExpense(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
          </div>

          {showAddExpense && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouvelle dépense</div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Description *</label>
                  <input value={eForm.description} onChange={e => setEForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Ex: Loyer du mois, achat cartons..." />
                </div>
                <div>
                  <label style={labelStyle}>Montant (GNF) *</label>
                  <input type="number" value={eForm.montant} onChange={e => setEForm(f => ({ ...f, montant: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Catégorie</label>
                  <select value={eForm.categorie} onChange={e => setEForm(f => ({ ...f, categorie: e.target.value }))} style={{ ...inputStyle, width: "100%" }}>
                    {CATS_EXP.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={saveExpense} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddExpense(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {expenses.map(e => (
              <div key={e.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #fee2e2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.description}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(e.date_depense)} · {e.categorie}</div>
                </div>
                <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 15 }}>{fmtMoney(e.montant)}</div>
              </div>
            ))}
            {expenses.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune dépense enregistrée.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
