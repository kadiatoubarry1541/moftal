import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";

const API_ROOT = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API_ROOT}/api/retailer-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "products" | "sales" | "clients" | "expenses";
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const COLOR     = "#0891b2";
const COLOR_BG  = "#ecfeff";
const COLOR_BDR = "#a5f3fc";
const GRADIENT  = "linear-gradient(135deg,#0891b2,#06b6d4)";
const CATS_EXP  = ["Transport", "Loyer", "Électricité", "Eau", "Emballage", "Réparation", "Approvisionnement", "Autre"];

export default function GestionVendeur() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab]               = useState<Tab>("dashboard");
  const [tenant, setTenant]         = useState<any>(null);
  const [dash, setDash]             = useState<any>(null);
  const [products, setProducts]     = useState<any[]>([]);
  const [sales, setSales]           = useState<any[]>([]);
  const [clients, setClients]       = useState<any[]>([]);
  const [expenses, setExpenses]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);

  const [showAddProduct, setShowAddProduct]   = useState(false);
  const [showNewSale, setShowNewSale]         = useState(false);
  const [showAddClient, setShowAddClient]     = useState(false);
  const [showAddExpense, setShowAddExpense]   = useState(false);
  const [editProduct, setEditProduct]         = useState<any>(null);

  const [pForm, setPForm] = useState({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce" });
  const [sForm, setSForm] = useState({ client_nom: "", type_paiement: "especes", montant_recu: "", est_credit: false, notes: "", items: [{ nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] });
  const [cForm, setCForm] = useState({ nom: "", telephone: "", adresse: "" });
  const [eForm, setEForm] = useState({ description: "", montant: "", categorie: "Transport" });

  const b = BASE;

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
        fetch(`${b(tenantCode!)}/dashboard`, { headers: auth() }),
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

  async function saveProduct(isEdit = false) {
    setSaving(true);
    const url = isEdit ? `${b(tenantCode!)}/products/${editProduct.id}` : `${b(tenantCode!)}/products`;
    const method = isEdit ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: auth(), body: JSON.stringify(pForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddProduct(false); setEditProduct(null); setPForm({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce" }); loadProducts(); loadAll(); }
    else alert(d.message);
  }

  async function saveSale() {
    const valid = sForm.items.filter(i => i.nom && i.prix_unitaire);
    if (!valid.length) return alert("Ajoutez au moins un article");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/sales`, { method: "POST", headers: auth(), body: JSON.stringify({ ...sForm, items: valid }) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowNewSale(false); setSForm({ client_nom: "", type_paiement: "especes", montant_recu: "", est_credit: false, notes: "", items: [{ nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] }); loadAll(); loadSales(); }
    else alert(d.message);
  }

  async function saveClient() {
    if (!cForm.nom) return alert("Nom requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/clients`, { method: "POST", headers: auth(), body: JSON.stringify(cForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddClient(false); setCForm({ nom: "", telephone: "", adresse: "" }); loadClients(); }
    else alert(d.message);
  }

  async function saveExpense() {
    if (!eForm.description || !eForm.montant) return alert("Description et montant requis");
    setSaving(true);
    const r = await fetch(`${b(tenantCode!)}/expenses`, { method: "POST", headers: auth(), body: JSON.stringify(eForm) });
    const d = await r.json(); setSaving(false);
    if (d.success) { setShowAddExpense(false); setEForm({ description: "", montant: "", categorie: "Transport" }); loadExpenses(); loadAll(); }
    else alert(d.message);
  }

  async function payCredit(clientId: number, montant: number) {
    const m = prompt("Montant à encaisser (GNF) :", String(montant));
    if (!m) return;
    const r = await fetch(`${b(tenantCode!)}/clients/${clientId}/pay-credit`, { method: "PUT", headers: auth(), body: JSON.stringify({ montant: +m }) });
    const d = await r.json();
    if (d.success) loadClients();
  }

  async function adjustStock(productId: number, delta: number) {
    await fetch(`${b(tenantCode!)}/products/${productId}/stock`, { method: "PUT", headers: auth(), body: JSON.stringify({ delta }) });
    loadProducts();
  }

  const saleTotal = sForm.items.reduce((s, i) => s + (+(i.prix_unitaire || 0)) * (+(i.quantite || 1)), 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: `4px solid ${COLOR_BDR}`, borderTopColor: COLOR, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate(-1 as any)} style={{ marginTop: 16, padding: "10px 24px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>← Retour</button>
    </div>
  );

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard", label: "Dashboard",  emoji: "📊" },
    { id: "products",  label: "Produits",   emoji: "🛒" },
    { id: "sales",     label: "Ventes",     emoji: "💰" },
    { id: "clients",   label: "Clients",    emoji: "👤" },
    { id: "expenses",  label: "Dépenses",   emoji: "📋" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
  const btn = (bg: string, color = "white"): React.CSSProperties => ({ padding: "8px 16px", background: bg, color, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px", fontFamily: "system-ui,sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: GRADIENT, borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 40 }}>🛒</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{tenant?.name || "Vente au Détail"}</h1>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Gestion Interne — Vendeur</p>
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
              { label: "Produits actifs",    val: dash?.totalProducts || 0,    emoji: "📦" },
              { label: "Alertes stock",       val: dash?.alertesStock || 0,     emoji: "⚠️", warn: (dash?.alertesStock||0) > 0 },
              { label: "Ventes aujourd'hui",  val: dash?.ventesAujourdhui || 0, emoji: "🧾" },
              { label: "CA aujourd'hui",      val: fmtMoney(dash?.caAujourdhui || 0), emoji: "💵" },
              { label: "CA ce mois",          val: fmtMoney(dash?.caMois || 0), emoji: "📈" },
              { label: "Crédits en cours",    val: fmtMoney(dash?.totalCredits || 0), emoji: "⏳", warn: (dash?.totalCredits||0) > 0 },
              { label: "Clients",             val: dash?.totalClients || 0,     emoji: "👥" },
              { label: "Dépenses aujourd'hui",val: fmtMoney(dash?.depensesAujourdhui || 0), emoji: "📋" },
            ].map(s => (
              <div key={s.label} style={{ background: s.warn ? "#fff7ed" : COLOR_BG, border: `1px solid ${s.warn ? "#fed7aa" : COLOR_BDR}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: s.warn ? "#ea580c" : COLOR }}>{s.val}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {(dash?.recentSales?.length > 0) && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Dernières ventes</h3>
              {dash.recentSales.map((s: any) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                  <span>{s.client_nom || "Client"} {s.est_credit && <span style={{ color: "#ea580c", fontSize: 12 }}>· crédit</span>}</span>
                  <span style={{ fontWeight: 700, color: COLOR }}>{fmtMoney(s.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRODUITS */}
      {tab === "products" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>🛒 Produits en vente</h2>
            <button onClick={() => { setEditProduct(null); setPForm({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce" }); setShowAddProduct(true); }} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {(showAddProduct || editProduct) && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editProduct ? "Modifier" : "Nouveau produit"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={pForm.nom} onChange={e => setPForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Catégorie</label><input style={inp} value={pForm.categorie} onChange={e => setPForm(f => ({ ...f, categorie: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prix vente (GNF) *</label><input style={inp} type="number" value={pForm.prix_vente} onChange={e => setPForm(f => ({ ...f, prix_vente: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prix achat (GNF)</label><input style={inp} type="number" value={pForm.prix_achat} onChange={e => setPForm(f => ({ ...f, prix_achat: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Stock</label><input style={inp} type="number" value={pForm.stock} onChange={e => setPForm(f => ({ ...f, stock: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Stock minimum alerte</label><input style={inp} type="number" value={pForm.stock_min} onChange={e => setPForm(f => ({ ...f, stock_min: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Unité</label>
                  <select style={inp} value={pForm.unite} onChange={e => setPForm(f => ({ ...f, unite: e.target.value }))}>
                    {["pièce", "kg", "g", "litre", "sachet", "boîte", "carton"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => saveProduct(!!editProduct)} disabled={saving} style={btn(COLOR)}>{saving ? "..." : editProduct ? "Modifier" : "Ajouter"}</button>
                <button onClick={() => { setShowAddProduct(false); setEditProduct(null); }} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {products.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun produit encore.</p>}
            {products.map(p => (
              <div key={p.id} style={{ background: "white", border: p.stock <= p.stock_min ? "1px solid #fca5a5" : "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.nom}</div>
                    {p.categorie && <div style={{ fontSize: 12, color: "#64748b" }}>{p.categorie} · {p.unite}</div>}
                  </div>
                  <button onClick={() => { setEditProduct(p); setPForm({ nom: p.nom, categorie: p.categorie || "", prix_vente: String(p.prix_vente), prix_achat: String(p.prix_achat || ""), stock: String(p.stock), stock_min: String(p.stock_min), unite: p.unite }); setShowAddProduct(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>✏️</button>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: COLOR }}>{fmtMoney(p.prix_vente)}</span>
                  <span style={{ fontSize: 13, color: p.stock <= p.stock_min ? "#dc2626" : "#1a8f1a", fontWeight: 600 }}>Stock: {p.stock} {p.unite}</span>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={() => adjustStock(p.id, -1)} style={btn("#fef2f2", "#dc2626")}>−1</button>
                  <button onClick={() => adjustStock(p.id, 1)} style={btn("#f0fdf0", "#1a8f1a")}>+1</button>
                  <button onClick={() => { const n = prompt("Ajouter au stock :", "10"); if (n) adjustStock(p.id, +n); }} style={btn(COLOR_BG, COLOR)}>+N</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VENTES */}
      {tab === "sales" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>💰 Ventes</h2>
            <button onClick={() => setShowNewSale(true)} style={btn(COLOR)}>+ Nouvelle vente</button>
          </div>
          {showNewSale && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Nouvelle vente</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Client</label><input style={inp} value={sForm.client_nom} onChange={e => setSForm(f => ({ ...f, client_nom: e.target.value }))} placeholder="Nom du client" /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Paiement</label>
                  <select style={inp} value={sForm.type_paiement} onChange={e => setSForm(f => ({ ...f, type_paiement: e.target.value }))}>
                    {["especes", "mobile_money", "virement", "cheque"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: "#64748b" }}>Crédit ?</label>
                  <input type="checkbox" checked={sForm.est_credit} onChange={e => setSForm(f => ({ ...f, est_credit: e.target.checked }))} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Articles</div>
                {sForm.items.map((item, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 80px 32px", gap: 6, marginBottom: 6 }}>
                    <input style={inp} placeholder="Nom article" value={item.nom} onChange={e => { const items = [...sForm.items]; items[i] = { ...items[i], nom: e.target.value }; setSForm(f => ({ ...f, items })); }} />
                    <select style={inp} value={item.product_id} onChange={e => {
                      const p = products.find(p => p.id == +e.target.value);
                      const items = [...sForm.items];
                      items[i] = { ...items[i], product_id: e.target.value, nom: p?.nom || items[i].nom, prix_unitaire: p ? String(p.prix_vente) : items[i].prix_unitaire };
                      setSForm(f => ({ ...f, items }));
                    }}>
                      <option value="">Produit</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                    </select>
                    <input style={inp} type="number" placeholder="Prix" value={item.prix_unitaire} onChange={e => { const items = [...sForm.items]; items[i] = { ...items[i], prix_unitaire: e.target.value }; setSForm(f => ({ ...f, items })); }} />
                    <input style={inp} type="number" placeholder="Qté" value={item.quantite} onChange={e => { const items = [...sForm.items]; items[i] = { ...items[i], quantite: e.target.value }; setSForm(f => ({ ...f, items })); }} />
                    <button onClick={() => setSForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} style={{ border: "none", background: "#fef2f2", color: "#dc2626", borderRadius: 4, cursor: "pointer" }}>×</button>
                  </div>
                ))}
                <button onClick={() => setSForm(f => ({ ...f, items: [...f.items, { nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] }))} style={btn(COLOR_BG, COLOR)}>+ Article</button>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: COLOR, marginBottom: 12 }}>Total : {fmtMoney(saleTotal)}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveSale} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowNewSale(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            {sales.length === 0 && <p style={{ padding: 16, color: "#94a3b8", fontStyle: "italic" }}>Aucune vente enregistrée.</p>}
            {sales.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.client_nom || "Client"}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(s.date_vente)} · {s.type_paiement} {s.est_credit && "· crédit"}</div>
                </div>
                <div style={{ fontWeight: 700, color: COLOR }}>{fmtMoney(s.total)}</div>
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
            <button onClick={() => setShowAddClient(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddClient && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={cForm.nom} onChange={e => setCForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={cForm.telephone} onChange={e => setCForm(f => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Adresse</label><input style={inp} value={cForm.adresse} onChange={e => setCForm(f => ({ ...f, adresse: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveClient} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddClient(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {clients.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun client encore.</p>}
            {clients.map(c => (
              <div key={c.id} style={{ background: "white", border: c.credit_total > 0 ? "1px solid #fca5a5" : "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 600 }}>{c.nom}</div>
                {c.telephone && <div style={{ fontSize: 13, color: "#64748b" }}>📞 {c.telephone}</div>}
                {c.adresse && <div style={{ fontSize: 13, color: "#64748b" }}>📍 {c.adresse}</div>}
                {c.credit_total > 0 && (
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>Crédit : {fmtMoney(c.credit_total)}</span>
                    <button onClick={() => payCredit(c.id, c.credit_total)} style={btn("#f0fdf0", "#1a8f1a")}>Encaisser</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DÉPENSES */}
      {tab === "expenses" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>📋 Dépenses</h2>
            <button onClick={() => setShowAddExpense(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddExpense && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Description *</label><input style={inp} value={eForm.description} onChange={e => setEForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Montant (GNF) *</label><input style={inp} type="number" value={eForm.montant} onChange={e => setEForm(f => ({ ...f, montant: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Catégorie</label>
                  <select style={inp} value={eForm.categorie} onChange={e => setEForm(f => ({ ...f, categorie: e.target.value }))}>
                    {CATS_EXP.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveExpense} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddExpense(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            {expenses.length === 0 && <p style={{ padding: 16, color: "#94a3b8", fontStyle: "italic" }}>Aucune dépense enregistrée.</p>}
            {expenses.map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.description}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{e.categorie} · {fmtDate(e.date_depense)}</div>
                </div>
                <div style={{ fontWeight: 700, color: "#dc2626" }}>{fmtMoney(e.montant)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
