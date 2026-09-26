import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const BASE = (code: string) => `/api/commerce-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "products" | "sales" | "clients" | "expenses" | "staff" | "avis" | "settings";

function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const COLOR      = "#d97706";
const COLOR_BG   = "#fffbeb";
const COLOR_BDR  = "#fde68a";
const COLOR_DARK = "#92400e";
const GRADIENT   = "linear-gradient(135deg,#d97706,#f59e0b)";

const CATS_EXP = ["Transport", "Loyer", "Électricité", "Eau", "Emballage", "Réparation", "Approvisionnement", "Autre"];
const ROLES_STAFF = ["Propriétaire", "Gérant", "Caissier"];
const ROLE_PERMISSIONS: Record<string, Tab[]> = {
  "Propriétaire": ["dashboard", "products", "sales", "clients", "expenses", "staff", "avis", "settings"],
  "Gérant":       ["dashboard", "products", "sales", "clients", "expenses", "staff", "avis"],
  "Caissier":     ["dashboard", "products", "sales", "clients"],
};

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
  const [editClient, setEditClient] = useState<any>(null);
  const [editExpense, setEditExpense] = useState<any>(null);
  const [movementsFor, setMovementsFor] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string>("Propriétaire");
  const [staff, setStaff] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editStaff, setEditStaff] = useState<any>(null);
  const [stockAlertDismissed, setStockAlertDismissed] = useState(false);

  const [pForm, setPForm] = useState({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce" });
  const [sForm, setSForm] = useState({ client_nom: "", type_paiement: "especes", montant_recu: "", est_credit: false, notes: "", items: [{ nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] });
  const [cForm, setCForm] = useState({ nom: "", telephone: "", adresse: "" });
  const [eForm, setEForm] = useState({ description: "", montant: "", categorie: "Transport" });
  const [stForm, setStForm] = useState({ nom: "", telephone: "", role: "Caissier", numero_h: "" });
  const [saving, setSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [settingsSaving, setSettingsSaving] = useState(false);

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
    if (tab === "staff") loadStaff();
    if (tab === "avis") loadReviews();
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
      setMyRole(tData.myRole || "Propriétaire");
      setSettingsForm({ name: tData.tenant.name || "", address: tData.tenant.address || "", phone: tData.tenant.phone || "", email: tData.tenant.email || "", description: tData.tenant.description || "", horaires: tData.tenant.horaires || "", phone_urgence: tData.tenant.phone_urgence || "" });
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
  async function loadStaff() {
    const r = await fetch(`${b(tenantCode!)}/staff`, { headers: auth() });
    const d = await r.json();
    if (d.success) setStaff(d.staff || []);
  }
  async function loadReviews() {
    const r = await fetch(`${b(tenantCode!)}/reviews`, { headers: auth() });
    const d = await r.json();
    if (d.success) setReviews(d.reviews || []);
  }
  async function saveStaff() {
    if (!stForm.nom) return;
    setSaving(true);
    const url = editStaff ? `${b(tenantCode!)}/staff/${editStaff.id}` : `${b(tenantCode!)}/staff`;
    const method = editStaff ? "PUT" : "POST";
    await fetch(url, { method, headers: auth(), body: JSON.stringify(stForm) });
    setSaving(false); setShowAddStaff(false); setEditStaff(null);
    setStForm({ nom: "", telephone: "", role: "Caissier", numero_h: "" });
    loadStaff();
  }
  async function deleteStaff(id: number) {
    if (!confirm("Retirer ce membre du personnel ?")) return;
    await fetch(`${b(tenantCode!)}/staff/${id}`, { method: "DELETE", headers: auth() });
    loadStaff();
  }
  async function approveReview(id: number) {
    await fetch(`${b(tenantCode!)}/reviews/${id}`, { method: "PUT", headers: auth(), body: JSON.stringify({ statut: "approuve" }) });
    setReviews(rs => rs.map(r => r.id === id ? { ...r, statut: "approuve" } : r));
  }
  async function deleteReview(id: number) {
    if (!confirm("Supprimer cet avis ?")) return;
    await fetch(`${b(tenantCode!)}/reviews/${id}`, { method: "DELETE", headers: auth() });
    setReviews(rs => rs.filter(r => r.id !== id));
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
    const url = editExpense ? `${b(tenantCode!)}/expenses/${editExpense.id}` : `${b(tenantCode!)}/expenses`;
    const method = editExpense ? "PUT" : "POST";
    await fetch(url, { method, headers: auth(), body: JSON.stringify(eForm) });
    setSaving(false); setShowAddExpense(false); setEditExpense(null); setEForm({ description: "", montant: "", categorie: "Transport" });
    loadExpenses(); loadAll();
  }
  async function deleteExpense(id: number) {
    if (!confirm("Supprimer cette dépense ?")) return;
    await fetch(`${b(tenantCode!)}/expenses/${id}`, { method: "DELETE", headers: auth() });
    loadExpenses(); loadAll();
  }
  async function deleteProduct(id: number) {
    if (!confirm("Supprimer cet article ? Il disparaîtra de votre catalogue et de la vitrine.")) return;
    await fetch(`${b(tenantCode!)}/products/${id}`, { method: "DELETE", headers: auth() });
    loadProducts();
  }
  async function openMovements(product: any) {
    setMovementsFor(product);
    const r = await fetch(`${b(tenantCode!)}/products/${product.id}/movements`, { headers: auth() });
    const d = await r.json();
    if (d.success) setMovements(d.movements || []);
  }
  async function saveClientEdit() {
    if (!editClient?.nom) return;
    setSaving(true);
    await fetch(`${b(tenantCode!)}/clients/${editClient.id}`, { method: "PUT", headers: auth(), body: JSON.stringify(editClient) });
    setSaving(false); setEditClient(null);
    loadClients();
  }
  async function deleteClient(id: number) {
    if (!confirm("Supprimer ce client ?")) return;
    const r = await fetch(`${b(tenantCode!)}/clients/${id}`, { method: "DELETE", headers: auth() });
    const d = await r.json();
    if (!d.success) { alert(d.message || "Erreur"); return; }
    loadClients();
  }
  async function cancelSale(id: number) {
    if (!confirm("Annuler cette vente ? Le stock sera restauré et le crédit client ajusté.")) return;
    const r = await fetch(`${b(tenantCode!)}/sales/${id}`, { method: "DELETE", headers: auth() });
    const d = await r.json();
    if (!d.success) { alert(d.message || "Erreur"); return; }
    loadSales(); loadAll(); loadProducts();
  }
  function printSaleReceipt(s: any) {
    const w = window.open("", "_blank");
    if (!w) return;
    const items = (s.items || []).map((i: any) => `<tr><td>${i.nom}</td><td style="text-align:center">${i.quantite}</td><td style="text-align:right">${fmtMoney(+i.prix_unitaire)}</td><td style="text-align:right">${fmtMoney(+i.prix_unitaire * +i.quantite)}</td></tr>`).join("");
    w.document.write(`
      <html><head><title>Reçu ${s.id}</title><style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 4px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{padding:6px 4px;border-bottom:1px solid #e2e8f0;font-size:13px}
        .total{font-weight:700;font-size:15px}
      </style></head><body>
        <h1>${tenant?.name || "Boutique"}</h1>
        <div style="font-size:12px;color:#64748b">Reçu de vente #${s.id} · ${fmtDate(s.date_vente)}</div>
        <div style="margin-top:10px;font-size:13px">Client : <b>${s.client_nom || "Client"}</b></div>
        <table><thead><tr><th style="text-align:left">Article</th><th>Qté</th><th style="text-align:right">P.U.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${items}</tbody></table>
        <div style="text-align:right;margin-top:12px" class="total">Total : ${fmtMoney(s.total)}</div>
        <div style="text-align:right;font-size:12px;color:#64748b">Reçu : ${fmtMoney(s.montant_recu)} · Mode : ${s.type_paiement}</div>
        <div style="margin-top:24px;text-align:center;font-size:11px;color:#94a3b8">Merci pour votre achat — propulsé par Moftal</div>
      </body></html>
    `);
    w.document.close(); w.print();
  }
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo trop volumineux (max 2 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = () => setSettingsForm((f: any) => ({ ...f, logo_url: reader.result as string }));
    reader.readAsDataURL(file);
  };
  async function saveSettings() {
    setSettingsSaving(true);
    try {
      const r = await fetch(`${b(tenantCode!)}/settings`, { method: "PUT", headers: auth(), body: JSON.stringify(settingsForm) });
      const d = await r.json();
      if (d.success) setTenant(d.tenant);
    } finally { setSettingsSaving(false); }
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

  const ALL_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Tableau de bord", icon: "📊" },
    { id: "products",  label: "Articles / Produits", icon: "📦" },
    { id: "sales",     label: "Ventes", icon: "🧾" },
    { id: "clients",   label: "Clients", icon: "👥" },
    { id: "expenses",  label: "Dépenses", icon: "💸" },
    { id: "staff",     label: "Personnel", icon: "🧑‍💼" },
    { id: "avis",      label: "Avis", icon: "⭐" },
    { id: "settings",  label: "Paramètres", icon: "⚙️" },
  ];
  const allowed = ROLE_PERMISSIONS[myRole] || ROLE_PERMISSIONS.Caissier;
  const TABS = ALL_TABS.filter(t => allowed.includes(t.id));

  const inputStyle = { width: "100%", border: `1px solid ${COLOR_BDR}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
  const formBg = { background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 12, padding: 20, marginBottom: 16 };
  const labelStyle = { fontSize: 11, fontWeight: 600 as const, color: COLOR_DARK, marginBottom: 4, display: "block" as const };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion commerce — ${tenant?.name || ""}`}
        startUrl={`/gestion-commerce/${tenantCode}`}
        themeColor={COLOR}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}} @media(max-width:640px){.gestion-btn-secondary{display:none!important}}`}</style>

      {/* Header */}
      <div style={{ background: GRADIENT, borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1, overflow: "hidden" }}>
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🏪</div>
          )}
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant?.name || "Boutique"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>
              <span>{tenantCode} · Gestion Commerce</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <InstallAppButton name={tenant?.name} logoUrl={tenant?.logo_url} themeColor={COLOR} />
          <button className="gestion-btn-secondary" onClick={() => navigate(`/commerce/${tenantCode}`)} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.25)", color: "white", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🌐 Voir ma vitrine</button>
          <button className="gestion-btn-secondary" onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Retour</button>
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

      {/* Alerte stock faible proactive, visible sur tous les onglets */}
      {!stockAlertDismissed && dash?.alertesStock > 0 && tab !== "dashboard" && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#c2410c", fontWeight: 600 }}>⚠️ {dash.alertesStock} article{dash.alertesStock > 1 ? "s" : ""} en stock faible — réapprovisionnement conseillé.</span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setTab("dashboard")} style={{ padding: "5px 12px", background: "#f59e0b", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Voir</button>
            <button onClick={() => setStockAlertDismissed(true)} style={{ padding: "5px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#c2410c" }}>×</button>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dash && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Articles / Produits", value: dash.totalProducts, icon: "📦", color: "#3b82f6" },
              { label: "Stock faible", value: dash.alertesStock, icon: "⚠️", color: "#ef4444" },
              { label: "Ventes aujourd'hui", value: dash.ventesAujourdhui, icon: "🧾", color: "#22a722" },
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
                  <div style={{ fontWeight: 700, color: s.est_credit ? "#ef4444" : "#22a722", fontSize: 14 }}>{fmtMoney(s.total)}</div>
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
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadCsv(`produits_${tenantCode}.csv`, [["Nom", "Catégorie", "Prix vente", "Prix achat", "Stock", "Stock min", "Unité"], ...products.map(p => [p.nom, p.categorie || "", p.prix_vente, p.prix_achat, p.stock, p.stock_min, p.unite])])} style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>⬇️ CSV</button>
              <button onClick={() => setShowAddProduct(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
            </div>
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
                  <span>Vente : <b style={{ color: "#22a722" }}>{fmtMoney(p.prix_vente)}</b></span>
                  <span style={{ color: p.stock <= p.stock_min ? "#ef4444" : "#64748b" }}>Stock : <b>{p.stock} {p.unite}</b></span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => updateStock(p.id, -1)} style={{ flex: 1, padding: "4px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>−1</button>
                  <button onClick={() => updateStock(p.id, 1)} style={{ flex: 1, padding: "4px", background: "#dcfcdc", color: "#1a8f1a", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>+1</button>
                  <button onClick={() => { setEditProduct(p); setPForm({ nom: p.nom, categorie: p.categorie || "", prix_vente: p.prix_vente, prix_achat: p.prix_achat || "", stock: p.stock, stock_min: p.stock_min || "5", unite: p.unite || "pièce" }); setShowAddProduct(true); }}
                    style={{ padding: "4px 8px", background: COLOR_BG, color: COLOR, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✏️</button>
                  <button onClick={() => openMovements(p)} title="Historique du stock" style={{ padding: "4px 8px", background: "#eff6ff", color: "#2563eb", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>📈</button>
                  <button onClick={() => deleteProduct(p.id)} title="Supprimer" style={{ padding: "4px 8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🗑️</button>
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
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadCsv(`ventes_${tenantCode}.csv`, [["Date", "Client", "Total", "Reçu", "Paiement", "Crédit", "Annulée"], ...sales.map(s => [fmtDate(s.date_vente), s.client_nom || "", s.total, s.montant_recu, s.type_paiement, s.est_credit ? "Oui" : "Non", s.annulee ? "Oui" : "Non"])])} style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>⬇️ CSV</button>
              <button onClick={() => setShowNewSale(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Nouvelle vente</button>
            </div>
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
              <div key={s.id} style={{ background: s.annulee ? "#f8fafc" : "white", opacity: s.annulee ? 0.6 : 1, borderRadius: 10, padding: "14px 16px", border: `1px solid ${s.est_credit && !s.annulee ? "#fca5a5" : "#f1f5f9"}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.client_nom || "Client"} {s.annulee && <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>· Annulée</span>}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(s.date_vente)} · {s.type_paiement}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: s.annulee ? "#94a3b8" : s.est_credit ? "#ef4444" : "#22a722", textDecoration: s.annulee ? "line-through" : "none" }}>{fmtMoney(s.total)}</div>
                    {s.est_credit && !s.annulee && <div style={{ fontSize: 11, color: "#ef4444" }}>Crédit</div>}
                  </div>
                  <button onClick={() => printSaleReceipt(s)} title="Imprimer le reçu" style={{ padding: "6px 10px", background: COLOR_BG, color: COLOR, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🖨️</button>
                  {!s.annulee && (
                    <button onClick={() => cancelSale(s.id)} title="Annuler la vente" style={{ padding: "6px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Annuler</button>
                  )}
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

          {editClient && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Modifier le client</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([["Nom *", "nom"], ["Téléphone", "telephone"], ["Adresse / Quartier", "adresse"]] as [string, string][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input value={editClient[key] || ""} onChange={e => setEditClient((f: any) => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveClientEdit} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setEditClient(null)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {clients.map(c => (
              <div key={c.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: `1px solid ${c.credit_total > 0 ? "#fca5a5" : "#f1f5f9"}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nom}</div>
                  {c.telephone && <div style={{ fontSize: 12, color: "#64748b" }}>{c.telephone}</div>}
                  {c.adresse && <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.adresse}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {c.credit_total > 0 ? (
                    <>
                      <div style={{ fontWeight: 700, color: "#ef4444" }}>Crédit : {fmtMoney(c.credit_total)}</div>
                      <button onClick={() => payCredit(c.id)} style={{ padding: "6px 12px", background: "#dcfcdc", color: "#1a8f1a", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Rembourser</button>
                      {c.telephone && (
                        <button onClick={() => window.open(`https://wa.me/${c.telephone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${c.nom}, un rappel amical : vous avez un crédit de ${fmtMoney(c.credit_total)} chez ${tenant?.name || "nous"}. Merci de régulariser dès que possible.`)}`, "_blank")}
                            style={{ padding: "6px 10px", background: "#dcfce7", color: "#16a34a", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📲 Relancer</button>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Pas de crédit</div>
                  )}
                  <button onClick={() => setEditClient(c)} title="Modifier" style={{ padding: "6px 8px", background: COLOR_BG, color: COLOR, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✏️</button>
                  <button onClick={() => deleteClient(c.id)} title="Supprimer" style={{ padding: "6px 8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🗑️</button>
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
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadCsv(`depenses_${tenantCode}.csv`, [["Date", "Description", "Catégorie", "Montant"], ...expenses.map(e => [fmtDate(e.date_depense), e.description, e.categorie, e.montant])])} style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>⬇️ CSV</button>
              <button onClick={() => setShowAddExpense(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
            </div>
          </div>

          {showAddExpense && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{editExpense ? "Modifier la dépense" : "Nouvelle dépense"}</div>
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
                <button onClick={() => { setShowAddExpense(false); setEditExpense(null); setEForm({ description: "", montant: "", categorie: "Transport" }); }} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {expenses.map(e => (
              <div key={e.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #fee2e2", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.description}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(e.date_depense)} · {e.categorie}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 15 }}>{fmtMoney(e.montant)}</div>
                  <button onClick={() => { setEditExpense(e); setEForm({ description: e.description, montant: e.montant, categorie: e.categorie || "Transport" }); setShowAddExpense(true); }} title="Modifier" style={{ padding: "5px 8px", background: COLOR_BG, color: COLOR, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✏️</button>
                  <button onClick={() => deleteExpense(e.id)} title="Supprimer" style={{ padding: "5px 8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🗑️</button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune dépense enregistrée.</div>}
          </div>
        </div>
      )}

      {/* ── PERSONNEL / VENDEURS ── */}
      {tab === "staff" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Personnel ({staff.length})</div>
            <button onClick={() => setShowAddStaff(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
          </div>

          {showAddStaff && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{editStaff ? "Modifier" : "Nouveau"} membre du personnel</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input value={stForm.nom} onChange={e => setStForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input value={stForm.telephone} onChange={e => setStForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Rôle</label>
                  <select value={stForm.role} onChange={e => setStForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, width: "100%" }}>
                    {ROLES_STAFF.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Numéro H (compte Moftal)</label>
                  <input value={stForm.numero_h} onChange={e => setStForm(f => ({ ...f, numero_h: e.target.value }))} style={inputStyle} placeholder="Ex : H-123456" />
                </div>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#94a3b8" }}>Renseignez le numéro H pour permettre à cette personne de se connecter à la gestion de la boutique avec son propre compte Moftal.</p>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={saveStaff} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => { setShowAddStaff(false); setEditStaff(null); setStForm({ nom: "", telephone: "", role: "Caissier", numero_h: "" }); }} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {staff.map(s => (
              <div key={s.id} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.nom}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.role}{s.telephone ? ` · ${s.telephone}` : ""}{s.numero_h ? ` · ${s.numero_h}` : " · accès non lié"}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setEditStaff(s); setStForm({ nom: s.nom, telephone: s.telephone || "", role: s.role || "Caissier", numero_h: s.numero_h || "" }); setShowAddStaff(true); }} style={{ padding: "6px 8px", background: COLOR_BG, color: COLOR, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✏️</button>
                  <button onClick={() => deleteStaff(s.id)} style={{ padding: "6px 8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🗑️</button>
                </div>
              </div>
            ))}
            {staff.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun membre du personnel enregistré. Vous êtes seul(e) à gérer la boutique.</div>}
          </div>
        </div>
      )}

      {/* ── AVIS CLIENTS ── */}
      {tab === "avis" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Avis clients ({reviews.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ background: "white", borderRadius: 12, border: "1px solid #f1f5f9", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "#f59e0b", fontSize: 14, marginBottom: 4 }}>{"★".repeat(r.note)}{"☆".repeat(5 - r.note)}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{r.nom_auteur || "Anonyme"}</div>
                    {r.commentaire && <p style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>{r.commentaire}</p>}
                    {r.statut === "en_attente" && <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>En attente de modération</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {r.statut === "en_attente" && <button onClick={() => approveReview(r.id)} style={{ padding: "5px 12px", background: "#f0fdf0", color: "#1a8f1a", border: "1px solid #bbf7bb", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Approuver</button>}
                    <button onClick={() => deleteReview(r.id)} style={{ padding: "5px 12px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
            {reviews.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun avis pour le moment.</div>}
          </div>
        </div>
      )}

      {/* ── PARAMÈTRES ── */}
      {tab === "settings" && (
        <div style={{ animation: "fadeIn 0.2s ease", maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={formBg}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Logo</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, border: `2px solid ${COLOR_BDR}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {(settingsForm.logo_url || tenant?.logo_url)
                  ? <img src={settingsForm.logo_url || tenant.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 30 }}>🏪</span>}
              </div>
              <div>
                <label htmlFor="logo-upload-com" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: COLOR, color: "white", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Choisir un logo</label>
                <input id="logo-upload-com" type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>PNG, JPG, SVG · Max 2 Mo</p>
              </div>
            </div>
          </div>

          <div style={formBg}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Informations de la boutique</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nom</label>
                <input style={inputStyle} value={settingsForm.name || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, height: 70, resize: "none" as const }} value={settingsForm.description || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={labelStyle}>Téléphone</label><input style={inputStyle} value={settingsForm.phone || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={settingsForm.email || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div>
                <label style={labelStyle}>Adresse</label>
                <input style={inputStyle} value={settingsForm.address || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, address: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Horaires d'ouverture</label>
                  <input style={inputStyle} placeholder="Ex : Lun-Sam 8h-19h" value={settingsForm.horaires || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, horaires: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Téléphone d'urgence</label>
                  <input style={inputStyle} value={settingsForm.phone_urgence || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, phone_urgence: e.target.value }))} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Ces informations sont affichées sur votre page vitrine publique.</p>
            </div>
          </div>

          <button onClick={saveSettings} disabled={settingsSaving} style={{ alignSelf: "flex-start", padding: "10px 28px", background: settingsSaving ? `${COLOR}88` : COLOR, color: "white", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: settingsSaving ? "not-allowed" : "pointer" }}>
            {settingsSaving ? "Enregistrement..." : "Enregistrer les paramètres"}
          </button>
        </div>
      )}

      {/* ── HISTORIQUE DES MOUVEMENTS DE STOCK ── */}
      {movementsFor && (
        <div onClick={() => setMovementsFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 14, padding: 24, width: "min(440px,95vw)", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>📈 Historique — {movementsFor.nom}</div>
              <button onClick={() => setMovementsFor(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer" }}>×</button>
            </div>
            {movements.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>Aucun mouvement enregistré.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {movements.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{m.reason.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(m.created_at)}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: m.delta > 0 ? "#1a8f1a" : "#dc2626" }}>{m.delta > 0 ? "+" : ""}{m.delta}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
