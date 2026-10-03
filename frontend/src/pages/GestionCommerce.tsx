import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import { TenantLogo, goToMoftal, MoftalMark, TenantCodeCard } from "../components/GestionBrand";
import InstallAppButton from "../components/InstallAppButton";
import ParametresEspacePro from "../components/ParametresEspacePro";
import { normaliserLogo } from "../utils/logoImage";
import { imprimerRecu } from "../utils/imprimerRecu";

const BASE = (code: string) => `/api/commerce-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "products" | "sales" | "clients" | "expenses" | "suppliers" | "staff" | "avis" | "settings";

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
function parseCsv(text: string): string[][] {
  const sep = text.includes(";") ? ";" : ",";
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.trim()).map(line => {
    const cells: string[] = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === sep) { cells.push(cur); cur = ""; }
        else cur += c;
      }
    }
    cells.push(cur);
    return cells;
  });
}

const COLOR      = "#d97706";
const COLOR_BG   = "#fffbeb";
const COLOR_BDR  = "#fde68a";
const COLOR_DARK = "#92400e";
const GRADIENT   = "linear-gradient(135deg,#d97706,#f59e0b)";

const CATS_EXP = ["Transport", "Loyer", "Électricité", "Eau", "Emballage", "Réparation", "Approvisionnement", "Autre"];
const ROLES_STAFF = ["Propriétaire", "Gérant", "Caissier"];
const ROLE_PERMISSIONS: Record<string, Tab[]> = {
  "Propriétaire": ["dashboard", "products", "sales", "clients", "expenses", "suppliers", "staff", "avis", "settings"],
  "Gérant":       ["dashboard", "products", "sales", "clients", "expenses", "suppliers", "staff", "avis"],
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

  const [pForm, setPForm] = useState<any>({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce", code_barre: "", photo_url: "" });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  const [supForm, setSupForm] = useState({ nom: "", telephone: "", adresse: "" });
  const [purForm, setPurForm] = useState({ supplier_id: "", product_id: "", quantite: "1", prix_unitaire: "" });
  const [barcodeInput, setBarcodeInput] = useState("");
  const [sForm, setSForm] = useState({ client_nom: "", type_paiement: "especes", montant_recu: "", est_credit: false, notes: "", remise: "", items: [{ nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] });
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
    if (tab === "suppliers") { loadSuppliers(); loadPurchases(); loadProducts(); }
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
    const d = await envoyer(`/products`, "GET");
    if (d.success) setProducts(d.products || []);
  }
  async function loadSales() {
    const d = await envoyer(`/sales`, "GET");
    if (d.success) setSales(d.sales || []);
  }
  async function loadClients() {
    const d = await envoyer(`/clients`, "GET");
    if (d.success) setClients(d.clients || []);
  }
  async function loadExpenses() {
    const d = await envoyer(`/expenses`, "GET");
    if (d.success) setExpenses(d.expenses || []);
  }
  async function loadSuppliers() {
    const d = await envoyer(`/suppliers`, "GET");
    if (d.success) setSuppliers(d.suppliers || []);
  }
  async function loadPurchases() {
    const d = await envoyer(`/purchases`, "GET");
    if (d.success) setPurchases(d.purchases || []);
  }
  // Envoie au serveur et renvoie toujours une réponse lisible. En cas d'échec,
  // on prévient et le formulaire reste ouvert : rien n'est perdu en silence.
  async function envoyer(chemin: string, method: string, body?: any): Promise<any> {
    try {
      const r = await fetch(`${b(tenantCode!)}${chemin}`, { method, headers: auth(), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      return await r.json().catch(() => ({ success: false, message: `Erreur du serveur (${r.status}).` }));
    } catch {
      return { success: false, message: "Connexion coupée : rien n'a été enregistré. Réessayez." };
    }
  }
  function echec(d: any) { alert(d?.message || "Erreur : rien n'a été enregistré."); }

  async function saveSupplier() {
    if (!supForm.nom) return;
    setSaving(true);
    const d = await envoyer("/suppliers", "POST", supForm);
    setSaving(false);
    if (!d.success) return echec(d);
    setShowAddSupplier(false); setSupForm({ nom: "", telephone: "", adresse: "" });
    loadSuppliers();
  }
  async function deleteSupplier(id: number) {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    const d = await envoyer(`/suppliers/${id}`, "DELETE");
    if (!d.success) return echec(d);
    loadSuppliers();
  }
  async function savePurchase() {
    if (!purForm.product_id || !purForm.quantite) return;
    setSaving(true);
    const d = await envoyer("/purchases", "POST", { ...purForm, quantite: +purForm.quantite, prix_unitaire: +purForm.prix_unitaire || 0 });
    setSaving(false);
    if (!d.success) return echec(d);
    setShowNewPurchase(false); setPurForm({ supplier_id: "", product_id: "", quantite: "1", prix_unitaire: "" });
    loadPurchases(); loadProducts();
  }
  async function loadStaff() {
    const d = await envoyer(`/staff`, "GET");
    if (d.success) setStaff(d.staff || []);
  }
  async function loadReviews() {
    const d = await envoyer(`/reviews`, "GET");
    if (d.success) setReviews(d.reviews || []);
  }
  async function saveStaff() {
    if (!stForm.nom) return;
    setSaving(true);
    const d = await envoyer(editStaff ? `/staff/${editStaff.id}` : "/staff", editStaff ? "PUT" : "POST", stForm);
    setSaving(false);
    if (!d.success) return echec(d);
    setShowAddStaff(false); setEditStaff(null);
    setStForm({ nom: "", telephone: "", role: "Caissier", numero_h: "" });
    loadStaff();
  }
  async function deleteStaff(id: number) {
    if (!confirm("Retirer ce membre du personnel ?")) return;
    const d = await envoyer(`/staff/${id}`, "DELETE");
    if (!d.success) return echec(d);
    loadStaff();
  }
  async function approveReview(id: number) {
    const d = await envoyer(`/reviews/${id}`, "PUT", { statut: "approuve" });
    if (!d.success) return echec(d);
    setReviews(rs => rs.map(r => r.id === id ? { ...r, statut: "approuve" } : r));
  }
  async function deleteReview(id: number) {
    if (!confirm("Supprimer cet avis ?")) return;
    const d = await envoyer(`/reviews/${id}`, "DELETE");
    if (!d.success) return echec(d);
    setReviews(rs => rs.filter(r => r.id !== id));
  }

  async function saveProduct() {
    if (!pForm.nom || !pForm.prix_vente) return;
    setSaving(true);
    const d = await envoyer(editProduct ? `/products/${editProduct.id}` : "/products", editProduct ? "PUT" : "POST",
      { ...pForm, prix_vente: +pForm.prix_vente, prix_achat: +pForm.prix_achat || 0, stock: +pForm.stock || 0, stock_min: +pForm.stock_min || 0 });
    setSaving(false);
    if (!d.success) return echec(d);
    setShowAddProduct(false); setEditProduct(null);
    setPForm({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce", code_barre: "", photo_url: "" });
    loadProducts();
  }
  async function updateStock(id: number, delta: number) {
    const res = await envoyer(`/products/${id}/stock`, "PUT", { delta });
    if (!res.success) return echec(res);
    loadProducts();
    const d = await envoyer(`/dashboard`, "GET");
    if (d.success) setDash(d);
  }
  async function saveSale() {
    const items = sForm.items.filter(i => i.nom && i.prix_unitaire);
    if (!items.length) return;
    // Vente à crédit : il faut savoir à qui
    if (sForm.est_credit && !sForm.client_nom.trim()) { alert("Indiquez le nom du client pour une vente à crédit."); return; }
    setSaving(true);
    const brut = items.reduce((s, i) => s + +i.prix_unitaire * +i.quantite, 0);
    const net = Math.max(0, brut - (+sForm.remise || 0));
    const body: any = { ...sForm, remise: +sForm.remise || 0, items: items.map(i => ({ ...i, prix_unitaire: +i.prix_unitaire, quantite: +i.quantite })), montant_recu: sForm.montant_recu !== "" ? +sForm.montant_recu : (sForm.est_credit ? 0 : net) };
    const d = await envoyer("/sales", "POST", body);
    setSaving(false);
    // Vente refusée ou connexion coupée : on garde le panier pour réessayer
    if (!d.success) return echec(d);
    setShowNewSale(false); setBarcodeInput("");
    setSForm({ client_nom: "", type_paiement: "especes", montant_recu: "", est_credit: false, notes: "", remise: "", items: [{ nom: "", product_id: "", prix_unitaire: "", quantite: "1" }] });
    loadSales(); loadAll(); loadProducts();
  }
  function addByBarcode() {
    const code = barcodeInput.trim();
    if (!code) return;
    const p = products.find(p => p.code_barre === code);
    if (!p) { alert("Aucun article trouvé pour ce code-barres."); setBarcodeInput(""); return; }
    setSForm(f => {
      const empty = f.items.findIndex(i => !i.product_id);
      const newItem = { nom: p.nom, product_id: String(p.id), prix_unitaire: String(p.prix_vente), quantite: "1" };
      const items = empty >= 0 ? f.items.map((it, i) => i === empty ? newItem : it) : [...f.items, newItem];
      return { ...f, items };
    });
    setBarcodeInput("");
  }
  async function saveClient() {
    if (!cForm.nom) return;
    setSaving(true);
    const d = await envoyer("/clients", "POST", cForm);
    setSaving(false);
    if (!d.success) return echec(d);
    setShowAddClient(false); setCForm({ nom: "", telephone: "", adresse: "" });
    loadClients();
  }
  async function payCredit(id: number) {
    const m = prompt("Montant à rembourser (GNF) :");
    if (!m) return;
    if (!(+m > 0)) { alert("Montant invalide."); return; }
    const d = await envoyer(`/clients/${id}/pay-credit`, "PUT", { montant: +m });
    if (!d.success) return echec(d);
    loadClients();
  }
  async function saveExpense() {
    if (!eForm.description || !eForm.montant) return;
    setSaving(true);
    const d = await envoyer(editExpense ? `/expenses/${editExpense.id}` : "/expenses", editExpense ? "PUT" : "POST", eForm);
    setSaving(false);
    if (!d.success) return echec(d);
    setShowAddExpense(false); setEditExpense(null); setEForm({ description: "", montant: "", categorie: "Transport" });
    loadExpenses(); loadAll();
  }
  async function deleteExpense(id: number) {
    if (!confirm("Supprimer cette dépense ?")) return;
    const d = await envoyer(`/expenses/${id}`, "DELETE");
    if (!d.success) return echec(d);
    loadExpenses(); loadAll();
  }
  async function importProductsCsv(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) { alert("Fichier vide ou invalide."); return; }
    const header = rows[0].map(h => h.trim().toLowerCase());
    const idx = (name: string) => header.findIndex(h => h.includes(name));
    const iNom = idx("nom"), iCat = idx("catégor") >= 0 ? idx("catégor") : idx("categor"), iPv = idx("vente"), iPa = idx("achat"), iStk = idx("stock") >= 0 && !header[idx("stock")].includes("min") ? idx("stock") : -1, iSmin = idx("min"), iU = idx("unit");
    if (iNom < 0) { alert("Colonne « Nom » introuvable dans le fichier."); return; }
    const products = rows.slice(1).map(r => ({
      nom: r[iNom], categorie: iCat >= 0 ? r[iCat] : "", prix_vente: iPv >= 0 ? r[iPv] : 0, prix_achat: iPa >= 0 ? r[iPa] : 0,
      stock: iStk >= 0 ? r[iStk] : 0, stock_min: iSmin >= 0 ? r[iSmin] : 5, unite: iU >= 0 ? r[iU] : "pièce",
    })).filter(p => p.nom);
    const d = await envoyer("/products/import", "POST", { products });
    if (d.success) { alert(`${d.count} article(s) importé(s) avec succès.`); loadProducts(); }
    else alert(d.message || "Erreur lors de l'import.");
  }
  async function deleteProduct(id: number) {
    if (!confirm("Supprimer cet article ? Il disparaîtra de votre catalogue et de la vitrine.")) return;
    const d = await envoyer(`/products/${id}`, "DELETE");
    if (!d.success) return echec(d);
    loadProducts();
  }
  async function openMovements(product: any) {
    setMovementsFor(product);
    const d = await envoyer(`/products/${product.id}/movements`, "GET");
    if (d.success) setMovements(d.movements || []);
  }
  async function saveClientEdit() {
    if (!editClient?.nom) return;
    setSaving(true);
    const d = await envoyer(`/clients/${editClient.id}`, "PUT", editClient);
    setSaving(false);
    if (!d.success) return echec(d);
    setEditClient(null);
    loadClients();
  }
  async function deleteClient(id: number) {
    if (!confirm("Supprimer ce client ?")) return;
    const d = await envoyer(`/clients/${id}`, "DELETE");
    if (!d.success) return echec(d);
    loadClients();
  }
  async function cancelSale(id: number) {
    if (!confirm("Annuler cette vente ? Le stock sera restauré et le crédit client ajusté.")) return;
    const d = await envoyer(`/sales/${id}`, "DELETE");
    if (!d.success) return echec(d);
    loadSales(); loadAll(); loadProducts();
  }
  function printSaleReceipt(s: any) {
    imprimerRecu({
      titre: "Reçu de vente", numero: s.id, date: s.date_vente, etablissement: tenant || {}, couleur: COLOR,
      client: s.client_nom || "Client",
      lignes: (s.items || []).map((i: any) => ({ libelle: i.nom, quantite: i.quantite, prixUnitaire: i.prix_unitaire, montant: +i.prix_unitaire * +i.quantite })),
      remise: s.remise, total: s.total, paye: s.montant_recu, modePaiement: s.est_credit ? `${s.type_paiement} (crédit)` : s.type_paiement,
    });
  }
  // Logo converti en PNG 512 px : s'affiche partout et sert d'icône d'application
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    normaliserLogo(file)
      .then(logo => setSettingsForm((f: any) => ({ ...f, logo_url: logo })))
      .catch(err => alert(err.message));
  };
  async function saveSettings() {
    setSettingsSaving(true);
    try {
      const d = await envoyer("/settings", "PUT", settingsForm);
      if (d.success) { setTenant(d.tenant); alert("Paramètres enregistrés."); }
      else echec(d);
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
    { id: "suppliers", label: "Fournisseurs", icon: "🚚" },
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
          <TenantLogo tenantCode={tenantCode} logoUrl={tenant?.logo_url} fallback="🏪" size={52} radius={12} style={{ background: "rgba(255,255,255,0.15)" }} />
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant?.name || "Boutique"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>
              <span>Gestion Commerce</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <InstallAppButton name={tenant?.name} logoUrl={tenant?.logo_url} themeColor={COLOR} />
          <button className="gestion-btn-secondary" onClick={() => navigate(`/commerce/${tenantCode}`)} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.25)", color: "white", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🌐 Voir ma vitrine</button>
          <button onClick={() => goToMoftal(navigate)} title="Retour sur Moftal" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}><MoftalMark /> Moftal</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f8fafc", borderRadius: 10, padding: 4, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: "1 0 auto", minWidth: 80, padding: "8px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? "white" : "transparent", color: tab === t.id ? COLOR : "#64748b", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s", whiteSpace: "nowrap" }}>
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => downloadCsv(`produits_${tenantCode}.csv`, [["Nom", "Catégorie", "Prix vente", "Prix achat", "Stock", "Stock min", "Unité"], ...products.map(p => [p.nom, p.categorie || "", p.prix_vente, p.prix_achat, p.stock, p.stock_min, p.unite])])} style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>⬇️ CSV</button>
              <label htmlFor="import-products-csv" style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center" }}>⬆️ Importer CSV</label>
              <input id="import-products-csv" type="file" accept=".csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importProductsCsv(f); e.target.value = ""; }} />
              <button onClick={() => setShowAddProduct(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ajouter</button>
            </div>
          </div>

          {showAddProduct && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{editProduct ? "Modifier l'article" : "Nouvel article / produit"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, border: `1px solid ${COLOR_BDR}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {pForm.photo_url ? <img src={pForm.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>📦</span>}
                </div>
                <div>
                  <label htmlFor="product-photo-upload" style={{ display: "inline-flex", padding: "6px 12px", background: "white", border: `1px solid ${COLOR_BDR}`, borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: COLOR }}>Choisir une photo</label>
                  <input id="product-photo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { alert("Photo trop volumineuse (max 2 Mo)"); return; }
                    const reader = new FileReader();
                    reader.onload = () => setPForm((f: any) => ({ ...f, photo_url: reader.result as string }));
                    reader.readAsDataURL(file);
                  }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  ["Nom de l'article *", "nom"],
                  ["Catégorie", "categorie"],
                  ["Prix de vente (GNF) *", "prix_vente"],
                  ["Prix d'achat (GNF)", "prix_achat"],
                  ["Quantité en stock", "stock"],
                  ["Stock minimum alerte", "stock_min"],
                  ["Unité (pièce, kg, litre…)", "unite"],
                  ["Code-barres", "code_barre"],
                ] as [string, string][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input value={(pForm as any)[key]} onChange={e => setPForm((f: any) => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={saveProduct} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => { setShowAddProduct(false); setEditProduct(null); setPForm({ nom: "", categorie: "", prix_vente: "", prix_achat: "", stock: "", stock_min: "5", unite: "pièce", code_barre: "", photo_url: "" }); }} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>
            {products.map(p => (
              <div key={p.id} style={{ background: "white", borderRadius: 12, padding: 16, border: `1px solid ${p.stock <= p.stock_min ? "#fca5a5" : "#f1f5f9"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                {p.photo_url && (
                  <div style={{ width: "100%", height: 100, borderRadius: 8, overflow: "hidden", marginBottom: 10, background: "#f8fafc" }}>
                    <img src={p.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.nom}</div>
                {p.categorie && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{p.categorie}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span>Vente : <b style={{ color: "#22a722" }}>{fmtMoney(p.prix_vente)}</b></span>
                  <span style={{ color: p.stock <= p.stock_min ? "#ef4444" : "#64748b" }}>Stock : <b>{p.stock} {p.unite}</b></span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => updateStock(p.id, -1)} style={{ flex: 1, padding: "4px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>−1</button>
                  <button onClick={() => updateStock(p.id, 1)} style={{ flex: 1, padding: "4px", background: "#dcfcdc", color: "#1a8f1a", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>+1</button>
                  <button onClick={() => { setEditProduct(p); setPForm({ nom: p.nom, categorie: p.categorie || "", prix_vente: p.prix_vente, prix_achat: p.prix_achat || "", stock: p.stock, stock_min: p.stock_min || "5", unite: p.unite || "pièce", code_barre: p.code_barre || "", photo_url: p.photo_url || "" }); setShowAddProduct(true); }}
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

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input placeholder="🔎 Scanner ou saisir un code-barres…" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addByBarcode(); } }} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addByBarcode} style={{ padding: "8px 14px", background: COLOR_BG, color: COLOR, border: `1px solid ${COLOR_BDR}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Ajouter</button>
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

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Remise (GNF)</label>
                <input placeholder="0" value={sForm.remise} onChange={e => setSForm(f => ({ ...f, remise: e.target.value }))} style={{ ...inputStyle, width: 120 }} />
              </div>

              {(() => {
                const brut = sForm.items.reduce((s, i) => s + (+i.prix_unitaire || 0) * (+i.quantite || 1), 0);
                const net = Math.max(0, brut - (+sForm.remise || 0));
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                    <div style={{ fontWeight: 700 }}>
                      {(+sForm.remise || 0) > 0 && <span style={{ color: "#94a3b8", fontWeight: 500, textDecoration: "line-through", marginRight: 8 }}>{fmtMoney(brut)}</span>}
                      Total : {fmtMoney(net)}
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                      <input type="checkbox" checked={sForm.est_credit} onChange={e => setSForm(f => ({ ...f, est_credit: e.target.checked }))} />
                      Vente à crédit
                    </label>
                  </div>
                );
              })()}

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

      {/* ── FOURNISSEURS & ACHATS ── */}
      {tab === "suppliers" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Fournisseurs ({suppliers.length})</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddSupplier(true)} style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Fournisseur</button>
              <button onClick={() => setShowNewPurchase(true)} style={{ padding: "8px 16px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Réapprovisionner</button>
            </div>
          </div>

          {showAddSupplier && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouveau fournisseur</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([["Nom *", "nom"], ["Téléphone", "telephone"], ["Adresse", "adresse"]] as [string, string][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input value={(supForm as any)[key]} onChange={e => setSupForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveSupplier} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddSupplier(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          {showNewPurchase && (
            <div style={formBg}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Enregistrer un réapprovisionnement</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Fournisseur</label>
                  <select value={purForm.supplier_id} onChange={e => setPurForm(f => ({ ...f, supplier_id: e.target.value }))} style={{ ...inputStyle, width: "100%" }}>
                    <option value="">-- Aucun --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Article *</label>
                  <select value={purForm.product_id} onChange={e => {
                    const p = products.find(p => p.id === +e.target.value);
                    setPurForm(f => ({ ...f, product_id: e.target.value, prix_unitaire: p?.prix_achat?.toString() || f.prix_unitaire }));
                  }} style={{ ...inputStyle, width: "100%" }}>
                    <option value="">-- Article --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Quantité *</label>
                  <input value={purForm.quantite} onChange={e => setPurForm(f => ({ ...f, quantite: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Prix d'achat unitaire (GNF)</label>
                  <input value={purForm.prix_unitaire} onChange={e => setPurForm(f => ({ ...f, prix_unitaire: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={savePurchase} disabled={saving} style={{ padding: "8px 20px", background: COLOR, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowNewPurchase(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {suppliers.map(s => (
              <div key={s.id} style={{ background: "white", borderRadius: 10, padding: "12px 16px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.nom}</div>
                  {s.telephone && <div style={{ fontSize: 12, color: "#64748b" }}>{s.telephone}</div>}
                </div>
                <button onClick={() => deleteSupplier(s.id)} style={{ padding: "5px 8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🗑️</button>
              </div>
            ))}
            {suppliers.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, fontSize: 13 }}>Aucun fournisseur enregistré.</div>}
          </div>

          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Historique des achats</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {purchases.map(p => (
              <div key={p.id} style={{ background: "white", borderRadius: 10, padding: "10px 16px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <div>
                  <b>{p.product_nom}</b> × {p.quantite} {p.supplier_nom ? `· ${p.supplier_nom}` : ""}
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(p.created_at)}</div>
                </div>
                <div style={{ fontWeight: 700, color: COLOR }}>{fmtMoney(p.total)}</div>
              </div>
            ))}
            {purchases.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, fontSize: 13 }}>Aucun achat enregistré.</div>}
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
          <TenantCodeCard code={tenantCode} />
          <div style={formBg}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Logo</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, border: `2px solid ${COLOR_BDR}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                <TenantLogo tenantCode={tenantCode} logoUrl={settingsForm.logo_url || tenant?.logo_url} fallback="🏪" size={72} radius={14} />
              </div>
              <div>
                <label htmlFor="logo-upload-com" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: COLOR, color: "white", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Choisir un logo</label>
                <input id="logo-upload-com" type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>PNG, JPG ou SVG · appliqué partout dans votre gestion</p>
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
          <ParametresEspacePro />
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
