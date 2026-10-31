import { useState, useEffect } from "react";
import AccesRefuseGestion from "../components/AccesRefuseGestion";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionUser, getPhotoUrl } from "../utils/auth";
import { compressImage } from "../utils/compressImage";
import DynamicAppManifest from "../components/DynamicAppManifest";
import { TenantLogo, MoftalMark, TenantCodeCard } from "../components/GestionBrand";
import { goToMoftal } from "../utils/goToMoftal";
import InstallAppButton from "../components/InstallAppButton";
import ParametresEspacePro from "../components/ParametresEspacePro";
import ParametreLangue from "../components/ParametreLangue";
import { imprimerRecu } from "../utils/imprimerRecu";
import BarreRecherche from "../components/BarreRecherche";
import { filtrer } from "../utils/filtrer";
import { BoutonRapport } from "../components/RapportMois";
import { envoyerGestion } from "../utils/envoyerGestion";
import { cheminConnexion } from "../utils/connexionRetour";
import RenseignementsEtablissement from "../components/RenseignementsEtablissement";
import type { EtablissementGestion } from "../types/pro";
import type { RestaurantAnnouncement, RestaurantDish, RestaurantOrder, RestaurantStaff, RestaurantTable, TableauRestaurant, ArticleCommande } from "../types/gestion-restaurant";

const BASE = (code: string) => `/api/restaurant-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "dishes" | "tables" | "orders" | "staff" | "announcements" | "settings";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (Number(n) || 0).toLocaleString("fr-FR") + " GNF"; }
function fmtTime(d: string) { return d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"; }

const ORANGE = "#ea580c";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_BORDER = "#fed7aa";

const ORDER_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  nouvelle:       { bg: "#fef2f2", color: "#b91c1c", label: "Nouvelle (à confirmer)" },
  en_preparation: { bg: "#fffbeb", color: "#b45309", label: "En préparation" },
  pret:           { bg: "#eff6ff", color: "#2563eb", label: "Prêt" },
  servi:          { bg: "#f0fdf0", color: "#1a8f1a", label: "Servi" },
  annule:         { bg: "#fef2f2", color: "#dc2626", label: "Annulé" },
};
// Service d'une commande, et en-tête : la table, ou le client pour une commande du site
interface LignePlat { cle: string; nom: string; categorie: string; prix: string; description: string; disponible: boolean; image: string; erreur?: string }
const MAX_PLATS_A_LA_FOIS = 10;
const nouvelleLigne = (categorie = "Plat principal"): LignePlat =>
  ({ cle: Math.random().toString(36).slice(2), nom: "", categorie, prix: "", description: "", disponible: true, image: "" });

// Photo choisie → image compressée (data URL) envoyée au serveur, qui l'enregistre en base
const lirePhoto = async (f: File) => {
  const petite = await compressImage(f, 1200, 0.82);
  return new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(petite); });
};

const SERVICES: Record<string, string> = { sur_place: "Sur place", emporter: "À emporter", livraison: "Livraison" };
const enteteCommande = (o: RestaurantOrder) => o.source === "site" ? `🌐 ${o.client_nom || "Commande du site"}` : `Table ${o.table_num || "—"}`;

const TABLE_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  libre:    { bg: "#f0fdf0", color: "#1a8f1a", label: "Libre" },
  occupee:  { bg: "#fef2f2", color: "#dc2626", label: "Occupée" },
  reservee: { bg: "#eff6ff", color: "#2563eb", label: "Réservée" },
};

export default function GestionRestaurant() {
  const [recherche, setRecherche] = useState("");
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab] = useState<Tab>("dashboard");
  useEffect(() => { setRecherche(""); }, [tab]);
  const [tenant, setTenant] = useState<EtablissementGestion | null>(null);
  const [dash, setDash] = useState<TableauRestaurant | null>(null);
  const [dishes, setDishes] = useState<RestaurantDish[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [staff, setStaff] = useState<RestaurantStaff[]>([]);
  const [announcements, setAnnouncements] = useState<RestaurantAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddDish, setShowAddDish] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  // Ajout de plats : jusqu'à 10 d'un coup, chacun avec son prix et sa photo
  const [lignes, setLignes] = useState<LignePlat[]>([nouvelleLigne()]);
  const [bilanPlats, setBilanPlats] = useState<{ ok: boolean; texte: string } | null>(null);
  const [tForm, setTForm] = useState({ numero: "", capacite: "4", zone: "Salle" });
  const [oForm, setOForm] = useState({ table_id: "", table_num: "", type_service: "sur_place", type_paiement: "especes", notes: "", items: [{ dish_id: "", nom: "", prix: "", quantite: "1" }] });
  const [sForm, setSForm] = useState({ nom: "", prenom: "", poste: "Serveur", telephone: "", salaire: "" });
  const [anForm, setAnForm] = useState({ titre: "", contenu: "", type: "general" });

  useEffect(() => {
    if (!user) { navigate(cheminConnexion(), { replace: true }); return; }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || loading || error) return;
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    if (tab === "dishes")        fetch(`${BASE(tenantCode)}/dishes`,        { headers: h }).then(r => r.json()).then(d => d.success && setDishes(d.dishes || []));
    if (tab === "tables")        fetch(`${BASE(tenantCode)}/tables`,        { headers: h }).then(r => r.json()).then(d => d.success && setTables(d.tables || []));
    if (tab === "orders")        fetch(`${BASE(tenantCode)}/orders`,        { headers: h }).then(r => r.json()).then(d => d.success && setOrders(d.orders || []));
    if (tab === "staff")         fetch(`${BASE(tenantCode)}/staff`,         { headers: h }).then(r => r.json()).then(d => d.success && setStaff(d.staff || []));
    if (tab === "announcements") fetch(`${BASE(tenantCode)}/announcements`, { headers: h }).then(r => r.json()).then(d => d.success && setAnnouncements(d.announcements || []));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, [tab, tenantCode, loading]);

  const post = async (url: string, body: object) => {
    setSaving(true);
    try {
      const r = await fetch(url, { method: "POST", headers: auth(), body: JSON.stringify(body) });
      const d = await r.json().catch(() => null);
      if (!d) return { success: false, message: "Erreur de connexion : rien n'a été enregistré." };
      if (!r.ok && d.success !== false) return { ...d, success: false };
      return d;
    } catch {
      return { success: false, message: "Erreur de connexion : rien n'a été enregistré." };
    } finally { setSaving(false); }
  };
  const patch = (url: string, body: object) => fetch(url, { method: "PATCH", headers: auth(), body: JSON.stringify(body) }).then(r => { if (!r.ok) r.clone().json().catch(() => ({})).then((d) => alert(d.message || "Erreur : rien n'a été enregistré")); return r; }, e => { alert("Connexion coupée : rien n'a été enregistré"); throw e; });

  const reloadDash = () => {
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    fetch(`${BASE(tenantCode!)}/dashboard`, { headers: h }).then(r => r.json()).then(d => d.success && setDash(d));
  };
  const reloadOrders = () => {
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    fetch(`${BASE(tenantCode!)}/orders`, { headers: h }).then(r => r.json()).then(d => d.success && setOrders(d.orders || []));
  };
  const reloadTables = () => {
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    fetch(`${BASE(tenantCode!)}/tables`, { headers: h }).then(r => r.json()).then(d => d.success && setTables(d.tables || []));
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: "4px solid #fed7aa", borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return <AccesRefuseGestion message={error} couleur={ORANGE} emoji="🍽️" />;

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard",     label: "Dashboard",   emoji: "📊" },
    { id: "dishes",        label: "Menu",         emoji: "🍽️" },
    { id: "tables",        label: "Tables",       emoji: "🪑" },
    { id: "orders",        label: "Commandes",    emoji: "📋" },
    { id: "staff",         label: "Équipe",       emoji: "👨‍🍳" },
    { id: "announcements", label: "Annonces",     emoji: "📢" },
    { id: "settings",      label: "Paramètres",   emoji: "⚙️" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "10px 20px", background: bg, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 });

  const CATEGORIES = ["Entrée", "Plat principal", "Accompagnement", "Dessert", "Boisson", "Menu spécial"];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,sans-serif" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion restaurant — ${tenant?.name || ""}`}
        startUrl={`/gestion-restaurant/${tenantCode}`}
        themeColor={ORANGE}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @media(max-width:640px){.gestion-btn-secondary{display:none!important}}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#c2410c,#ea580c)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <TenantLogo tenantCode={tenantCode} logoUrl={tenant?.logo_url} fallback="🍽️" size={52} radius={12} style={{ background: "rgba(255,255,255,0.15)" }} />
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontWeight: 800, color: "white", fontSize: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant?.name || "Gestion Restaurant"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Gestion Interne</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <InstallAppButton name={tenant?.name} logoUrl={tenant?.logo_url} themeColor={ORANGE} />
          <button className="gestion-btn-secondary" onClick={() => navigate(`/restaurant/${tenantCode}`)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🌐 Vitrine</button>
          <button onClick={() => goToMoftal(navigate)} title="Retour sur Moftal" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><MoftalMark /> Moftal</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", background: tab === t.id ? ORANGE : "#f1f5f9", color: tab === t.id ? "white" : "#64748b", transition: "all 0.15s" }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dash && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <BoutonRapport base={`/api/restaurant-mgmt/${tenantCode}`} etablissement={tenant || undefined} couleur={ORANGE} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Plats au menu", value: dash.totalDishes ?? 0, color: "#ea580c", bg: "#fff7ed",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> },
              { label: "Commandes aujourd'hui", value: dash.ordersToday ?? 0, color: "#d97706", bg: "#fffbeb",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
              { label: "Tables", value: dash.totalTables ?? 0, color: "#b45309", bg: "#fffbeb",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/><line x1="12" y1="12" x2="12" y2="19"/></svg> },
              { label: "Équipe active", value: dash.totalStaff ?? 0, color: "#0891b2", bg: "#ecfeff",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
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
          {/* CA Banner */}
          <div style={{ background: "linear-gradient(135deg,#9a3412,#ea580c)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, color: "white" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>CA d'aujourd'hui</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{fmtMoney(dash.caToday)}</div>
            </div>
            <div style={{ textAlign: "right", opacity: 0.9 }}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>Ce mois</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtMoney(dash.caMonth)}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Commandes/jour</div>
              <div style={{ fontWeight: 700 }}>{dash.ordersToday ?? 0}</div>
            </div>
          </div>
          {/* Quick Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Nouvelle commande", icon: "📋", tab: "orders" as Tab },
              { label: "Gérer le menu",     icon: "🍽️", tab: "dishes" as Tab },
              { label: "État des tables",   icon: "🪑", tab: "tables" as Tab },
              { label: "Mon équipe",        icon: "👨‍🍳", tab: "staff" as Tab },
            ].map(a => (
              <button key={a.label} onClick={() => setTab(a.tab)}
                style={{ background: "white", border: `1px solid ${ORANGE_BORDER}`, borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                onMouseOver={e => (e.currentTarget.style.borderColor = ORANGE)}
                onMouseOut={e => (e.currentTarget.style.borderColor = ORANGE_BORDER)}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{a.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{a.label}</div>
              </button>
            ))}
          </div>
          {/* Recent Orders */}
          <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Commandes récentes</h3>
              <button onClick={() => setTab("orders")} style={{ fontSize: 12, color: ORANGE, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir toutes →</button>
            </div>
            {(dash.recentOrders?.length ?? 0) === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>Aucune commande aujourd'hui</div>
            ) : dash.recentOrders.map((o) => {
              const sc = ORDER_STATUS[o.statut] || { bg: "#f8fafc", color: "#64748b", label: o.statut };
              return (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: ORANGE_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🍽️</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{enteteCommande(o)} · {SERVICES[o.type_service] || o.type_service}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtTime(o.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: ORANGE, fontSize: 13 }}>{fmtMoney(+o.total)}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6 }}>{sc.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MENU / PLATS ── */}
      {tab === "dishes" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>🍽️ Menu ({dishes.length} plats)</h2>
            <button onClick={() => setShowAddDish(!showAddDish)} style={btn(ORANGE)}>{showAddDish ? "✕ Annuler" : "+ Ajouter plat"}</button>
          </div>
          {showAddDish && (
            <div style={{ background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: "#9a3412", marginBottom: 10 }}>
                Ajoutez jusqu'à {MAX_PLATS_A_LA_FOIS} plats d'un coup : <b>nom, prix et photo (obligatoire)</b>. Touchez « 📷 Photo » pour choisir la photo de chaque plat. Ils sont enregistrés sur le serveur et apparaissent tout de suite dans le menu de votre site.
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {lignes.map((l, i) => {
                  const maj = (champ: Partial<LignePlat>) => setLignes(ls => ls.map(x => x.cle === l.cle ? { ...x, ...champ, erreur: undefined } : x));
                  return (
                    <div key={l.cle} style={{ background: "white", border: `1.5px solid ${l.erreur ? "#fca5a5" : ORANGE_BORDER}`, borderRadius: 10, padding: 10, display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <label title="Photo du plat" style={{ flexShrink: 0, cursor: "pointer" }}>
                        {l.image
                          ? <img src={l.image} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", display: "block" }} />
                          : <span style={{ width: 72, height: 72, borderRadius: 10, border: `1.5px dashed ${ORANGE}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 22, color: ORANGE }}>📷<span style={{ fontSize: 10, fontWeight: 700 }}>Photo</span></span>}
                        <input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { maj({ image: await lirePhoto(f) }); } catch { alert("Cette photo n'a pas pu être lue. Essayez une autre image."); } }} />
                      </label>
                      <div style={{ flex: "1 1 220px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input style={{ ...inp, gridColumn: "1 / -1" }} placeholder={`Nom du plat ${i + 1} *`} value={l.nom} onChange={e => maj({ nom: e.target.value })} />
                        <input style={inp} placeholder="Prix (GNF) *" type="number" min="0" inputMode="numeric" value={l.prix} onChange={e => maj({ prix: e.target.value })} />
                        <select style={inp} value={l.categorie} onChange={e => maj({ categorie: e.target.value })}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input style={{ ...inp, gridColumn: "1 / -1" }} placeholder="Description (facultatif : ingrédients…)" value={l.description} onChange={e => maj({ description: e.target.value })} />
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                          <input type="checkbox" checked={l.disponible} onChange={e => maj({ disponible: e.target.checked })} /> Disponible
                        </label>
                        {lignes.length > 1 && (
                          <button type="button" onClick={() => setLignes(ls => ls.filter(x => x.cle !== l.cle))}
                            style={{ justifySelf: "end", background: "none", border: "none", color: "#be123c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Retirer cette ligne</button>
                        )}
                      </div>
                      {l.erreur && <div style={{ flexBasis: "100%", fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>⚠️ {l.erreur}</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                {lignes.length < MAX_PLATS_A_LA_FOIS && (
                  <button type="button" onClick={() => setLignes(ls => [...ls, nouvelleLigne(ls[ls.length - 1]?.categorie)])}
                    style={{ ...btn("white"), color: ORANGE, border: `1.5px solid ${ORANGE}` }}>+ Un autre plat ({lignes.length}/{MAX_PLATS_A_LA_FOIS})</button>
                )}
                <button disabled={saving} style={btn(ORANGE)} onClick={async () => {
                  setBilanPlats(null);
                  // Lignes vides ignorées ; nom et prix obligatoires, avec un message clair
                  const remplies = lignes.filter(l => l.nom.trim() || l.prix || l.image);
                  if (!remplies.length) { setBilanPlats({ ok: false, texte: "Écrivez au moins le nom et le prix d'un plat." }); return; }
                  const verifiees = remplies.map(l => ({ ...l, erreur: !l.nom.trim() ? "Le nom du plat manque." : (l.prix === "" || !(+l.prix >= 0)) ? "Le prix manque." : !l.image ? "La photo du plat manque : touchez « 📷 Photo »." : undefined }));
                  if (verifiees.some(l => l.erreur)) { setLignes(verifiees); setBilanPlats({ ok: false, texte: "Complétez les lignes en rouge, puis enregistrez." }); return; }
                  const restantes: LignePlat[] = [];
                  let enregistres = 0; let surAppareil = 0; let photosPerdues = 0;
                  for (const l of verifiees) {
                    const d = await post(`${BASE(tenantCode!)}/dishes`, { nom: l.nom.trim(), categorie: l.categorie, prix: +l.prix, description: l.description, disponible: l.disponible, image: l.image || undefined });
                    if (d.success && d.queued) surAppareil++;
                    // Photo envoyée mais absente de la réponse : le serveur ne l'a pas enregistrée
                    else if (d.success && l.image && !d.dish?.image_url) { photosPerdues++; enregistres++; }
                    else if (d.success) enregistres++;
                    else restantes.push({ ...l, erreur: d.message || "Pas enregistré. Réessayez." });
                  }
                  const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
                  if (!surAppareil) fetch(`${BASE(tenantCode!)}/dishes`, { headers: h }).then(r => r.json()).then(dd => dd.success && setDishes(dd.dishes || [])).catch(() => {});
                  setLignes(restantes.length ? restantes : [nouvelleLigne()]);
                  if (!restantes.length && !surAppareil) setShowAddDish(false);
                  const morceaux = [
                    enregistres ? `✅ ${enregistres} plat(s) enregistré(s) — visibles dans le menu de votre site.` : "",
                    surAppareil ? `📴 ${surAppareil} plat(s) gardé(s) sur l'appareil faute de connexion : ils seront envoyés au retour d'internet.` : "",
                    restantes.length ? `⚠️ ${restantes.length} plat(s) non enregistré(s) : voir les lignes en rouge.` : "",
                    photosPerdues ? `⚠️ Le serveur n'a pas enregistré la photo de ${photosPerdues} plat(s) : ajoutez-la avec « 📷 Photo » à côté du plat. Si cela recommence, le serveur doit être mis à jour.` : "",
                  ].filter(Boolean);
                  setBilanPlats({ ok: !restantes.length && !photosPerdues, texte: morceaux.join(" ") });
                }}>{saving ? "Enregistrement…" : `Enregistrer ${lignes.length > 1 ? `les ${lignes.length} plats` : "le plat"}`}</button>
              </div>
            </div>
          )}
          {bilanPlats && (
            <div style={{ background: bilanPlats.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${bilanPlats.ok ? "#bbf7d0" : "#fecaca"}`, color: bilanPlats.ok ? "#166534" : "#b91c1c", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
              {bilanPlats.texte}
            </div>
          )}
          {/* Rappel : un menu sans photos ne donne pas envie */}
          {dishes.some(d => !d.image_url) && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#9a3412" }}>
              📷 <b>{dishes.filter(d => !d.image_url).length} plat(s) sans photo.</b> Les clients choisissent avec les yeux : touchez « 📷 Photo » à côté d'un plat pour ajouter sa photo, elle apparaît tout de suite sur votre site.
            </div>
          )}
          {/* Group by category */}
          {[...CATEGORIES, "Autres"].map(cat => {
            // « Autres » : plats d'une catégorie qui n'est pas dans la liste (jamais cachés)
            const catDishes = filtrer(dishes, recherche).filter(d => cat === "Autres" ? !CATEGORIES.includes(d.categorie) : d.categorie === cat);
            if (catDishes.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: ORANGE, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{cat}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {catDishes.map(d => (
                    <div key={d.id} style={{ background: "white", border: `1px solid ${ORANGE_BORDER}`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <label title="Photo du plat" style={{ flexShrink: 0, cursor: "pointer" }}>
                        {d.image_url
                          ? <img src={getPhotoUrl(d.image_url) || ""} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", display: "block" }} />
                          : <span style={{ width: 56, height: 56, borderRadius: 10, border: `1.5px dashed ${ORANGE_BORDER}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 18, color: ORANGE }}>📷<span style={{ fontSize: 9, fontWeight: 700 }}>Photo</span></span>}
                        <input type="file" accept="image/*" hidden onChange={async e => {
                          const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
                          let image = "";
                          try { image = await lirePhoto(f); } catch { alert("Cette photo n'a pas pu être lue. Essayez une autre image."); return; }
                          if (await envoyerGestion(`${BASE(tenantCode!)}/dishes/${d.id}/photo`, { method: "PUT", headers: auth(), body: JSON.stringify({ image }) })) {
                            const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
                            fetch(`${BASE(tenantCode!)}/dishes`, { headers: h }).then(async r => {
                              const dd = await r.json();
                              if (!dd.success) return;
                              setDishes(dd.dishes || []);
                              // Relu en base (pas la copie gardée sur l'appareil) : la photo doit y être, sinon on le dit
                              const relueEnBase = navigator.onLine && !r.headers.get("X-Moftal-Offline");
                              if (relueEnBase && !(dd.dishes || []).find((x: RestaurantDish) => x.id === d.id)?.image_url) alert("Le serveur n'a pas enregistré la photo. Réessayez ; si cela recommence, le serveur doit être mis à jour.");
                            });
                          }
                        }} />
                      </label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{d.nom}</div>
                        {d.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{d.description}</div>}
                        <div style={{ fontSize: 13, fontWeight: 700, color: ORANGE, marginTop: 4 }}>{fmtMoney(+d.prix)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: d.disponible ? "#f0fdf0" : "#f1f5f9", color: d.disponible ? "#1a8f1a" : "#94a3b8", padding: "3px 10px", borderRadius: 20, cursor: "pointer" }}
                          onClick={async () => { const r = await patch(`${BASE(tenantCode!)}/dishes/${d.id}`, { disponible: !d.disponible }).catch(() => null); if (!r?.ok) return; const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/dishes`, { headers: h }).then(r => r.json()).then(dd => dd.success && setDishes(dd.dishes || [])); }}>
                          {d.disponible ? "✓ Disponible" : "Indisponible"}
                        </span>
                        <button onClick={async () => { if (await envoyerGestion(`${BASE(tenantCode!)}/dishes/${d.id}`, { method: "DELETE", headers: auth() })) setDishes(ds => ds.filter(x => x.id !== d.id)); }}
                          style={{ padding: "4px 10px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {dishes.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun plat dans le menu</div>}
        </div>
      )}

      {/* ── TABLES ── */}
      {tab === "tables" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>🪑 Tables ({tables.length})</h2>
            <button onClick={() => setShowAddTable(!showAddTable)} style={btn(ORANGE)}>{showAddTable ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddTable && (
            <div style={{ background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="N° de table" value={tForm.numero} onChange={e => setTForm(p => ({ ...p, numero: e.target.value }))} />
                <input style={inp} placeholder="Capacité (personnes)" type="number" value={tForm.capacite} onChange={e => setTForm(p => ({ ...p, capacite: e.target.value }))} />
                <input style={inp} placeholder="Zone (Salle, Terrasse…)" value={tForm.zone} onChange={e => setTForm(p => ({ ...p, zone: e.target.value }))} />
              </div>
              <button onClick={async () => {
                if (!tForm.numero) return;
                const d = await post(`${BASE(tenantCode!)}/tables`, { ...tForm, capacite: +tForm.capacite });
                if (d.success) { setShowAddTable(false); setTForm({ numero: "", capacite: "4", zone: "Salle" }); reloadTables(); } else alert(d.message || "Erreur : rien n'a été enregistré");
              }} disabled={saving} style={btn(ORANGE)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
            {tables.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", gridColumn: "1/-1" }}>Aucune table enregistrée</div> :
              filtrer(tables, recherche).map(t => {
                const sc = TABLE_STATUS[t.statut] || { bg: "#f8fafc", color: "#64748b", label: t.statut };
                return (
                  <div key={t.id} style={{ background: "white", border: `2px solid ${t.statut === "occupee" ? "#fca5a5" : t.statut === "reservee" ? "#93c5fd" : "#86efac"}`, borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>🪑</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>Table {t.numero}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{t.zone} · {t.capacite} pers.</div>
                    <select value={t.statut} onChange={async e => { await patch(`${BASE(tenantCode!)}/tables/${t.id}`, { statut: e.target.value }).catch(() => null); reloadTables(); }}
                      style={{ fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", width: "100%" }}>
                      {Object.entries(TABLE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── COMMANDES ── */}
      {tab === "orders" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📋 Commandes ({orders.length})</h2>
            <button onClick={() => setShowAddOrder(!showAddOrder)} style={btn(ORANGE)}>{showAddOrder ? "✕ Annuler" : "+ Nouvelle commande"}</button>
          </div>
          {showAddOrder && (
            <div style={{ background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <select style={inp} value={oForm.table_id} onChange={e => {
                  const t = tables.find(t => t.id === +e.target.value);
                  setOForm(p => ({ ...p, table_id: e.target.value, table_num: t?.numero || "" }));
                }}>
                  <option value="">-- Table (optionnel) --</option>
                  {tables.map(t => <option key={t.id} value={t.id}>Table {t.numero} ({t.statut})</option>)}
                </select>
                <select style={inp} value={oForm.type_service} onChange={e => setOForm(p => ({ ...p, type_service: e.target.value }))}>
                  <option value="sur_place">Sur place</option>
                  <option value="emporter">À emporter</option>
                  <option value="livraison">Livraison</option>
                </select>
                <select style={inp} value={oForm.type_paiement} onChange={e => setOForm(p => ({ ...p, type_paiement: e.target.value }))}>
                  {["especes","orange_money","mobile_money","carte","virement"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>Articles commandés</div>
              {oForm.items.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select style={{ ...inp, padding: "7px 8px" }} value={item.dish_id} onChange={e => {
                    const dish = dishes.find(d => d.id === +e.target.value);
                    setOForm(f => { const items = [...f.items]; items[i] = { ...items[i], dish_id: e.target.value, nom: dish?.nom || "", prix: dish?.prix?.toString() || "" }; return { ...f, items }; });
                  }}>
                    <option value="">-- Plat --</option>
                    {dishes.filter(d => d.disponible).map(d => <option key={d.id} value={d.id}>{d.nom} ({fmtMoney(+d.prix)})</option>)}
                  </select>
                  <input placeholder="Prix" value={item.prix} onChange={e => setOForm(f => { const items = [...f.items]; items[i] = { ...items[i], prix: e.target.value }; return { ...f, items }; })} style={{ ...inp, padding: "7px 8px" }} />
                  <input placeholder="Qté" type="number" value={item.quantite} onChange={e => setOForm(f => { const items = [...f.items]; items[i] = { ...items[i], quantite: e.target.value }; return { ...f, items }; })} style={{ ...inp, padding: "7px 8px" }} />
                  <button onClick={() => setOForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "7px 10px", cursor: "pointer" }}>×</button>
                </div>
              ))}
              <button onClick={() => setOForm(f => ({ ...f, items: [...f.items, { dish_id: "", nom: "", prix: "", quantite: "1" }] }))} style={{ fontSize: 12, color: ORANGE, background: "none", border: "none", cursor: "pointer", marginBottom: 12 }}>+ Ajouter un plat</button>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "#0f172a" }}>
                Total : {fmtMoney(oForm.items.reduce((s, i) => s + (+i.prix || 0) * (+i.quantite || 1), 0))}
              </div>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical", marginBottom: 10 }} placeholder="Notes (allergies, préférences…)" value={oForm.notes} onChange={e => setOForm(p => ({ ...p, notes: e.target.value }))} />
              <button onClick={async () => {
                const items = oForm.items.filter(i => i.nom && i.prix);
                if (!items.length) return;
                const d = await post(`${BASE(tenantCode!)}/orders`, { ...oForm, items: items.map(i => ({ ...i, prix: +i.prix, quantite: +i.quantite })), table_id: oForm.table_id || null });
                if (d.success) { setShowAddOrder(false); setOForm({ table_id: "", table_num: "", type_service: "sur_place", type_paiement: "especes", notes: "", items: [{ dish_id: "", nom: "", prix: "", quantite: "1" }] }); reloadOrders(); reloadDash(); reloadTables(); } else alert(d.message || "Erreur : rien n'a été enregistré");
              }} disabled={saving} style={btn(ORANGE)}>{saving ? "Enregistrement…" : "Valider la commande"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {orders.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune commande enregistrée</div> :
              filtrer(orders, recherche).map(o => {
                const sc = ORDER_STATUS[o.statut] || { bg: "#f8fafc", color: "#64748b", label: o.statut };
                const items: ArticleCommande[] = typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []);
                return (
                  <div key={o.id} style={{ background: "white", border: `1px solid ${ORANGE_BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{enteteCommande(o)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: "#fff7ed", color: ORANGE, padding: "2px 8px", borderRadius: 6 }}>{SERVICES[o.type_service] || o.type_service}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6 }}>{sc.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{items.map((i) => `${i.nom} ×${i.quantite || 1}`).join(" · ")}</div>
                        {o.client_telephone && (
                          <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>
                            📞 <a href={`tel:${o.client_telephone}`} style={{ color: "#334155", fontWeight: 700 }}>{o.client_telephone}</a>
                            {o.adresse_livraison && <> · 📍 {o.adresse_livraison}</>}
                          </div>
                        )}
                        {o.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>📝 {o.notes}</div>}
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{fmtDate(o.created_at)} {fmtTime(o.created_at)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ fontWeight: 800, color: ORANGE, fontSize: 15 }}>{fmtMoney(+o.total)}</div>
                        <button onClick={() => imprimerRecu({
                          titre: "Reçu de commande", numero: o.id, date: o.created_at, etablissement: tenant || {}, couleur: ORANGE,
                          details: [
                            o.source === "site" ? { label: "Client", valeur: `${o.client_nom || "—"} · ${o.client_telephone || ""}` } : { label: "Table", valeur: String(o.table_num || "—") },
                            { label: "Service", valeur: SERVICES[o.type_service] || o.type_service },
                          ],
                          lignes: items.map((i) => ({ libelle: i.nom, quantite: i.quantite || 1, prixUnitaire: i.prix, montant: (+i.prix || 0) * (+i.quantite || 1) })),
                          total: o.total, modePaiement: o.type_paiement,
                        })} style={{ fontSize: 11, border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 600 }}>🖨 Reçu</button>
                        <select value={o.statut} onChange={async e => { await patch(`${BASE(tenantCode!)}/orders/${o.id}`, { statut: e.target.value }).catch(() => null); reloadOrders(); reloadTables(); reloadDash(); }}
                          style={{ fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                          {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── ÉQUIPE ── */}
      {tab === "staff" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>👨‍🍳 Équipe ({staff.length})</h2>
            <button onClick={() => setShowAddStaff(!showAddStaff)} style={btn(ORANGE)}>{showAddStaff ? "✕ Annuler" : "+ Ajouter"}</button>
          </div>
          {showAddStaff && (
            <div style={{ background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input style={inp} placeholder="Nom *" value={sForm.nom} onChange={e => setSForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Prénom" value={sForm.prenom} onChange={e => setSForm(p => ({ ...p, prenom: e.target.value }))} />
                <select style={inp} value={sForm.poste} onChange={e => setSForm(p => ({ ...p, poste: e.target.value }))}>
                  {["Chef cuisinier","Cuisinier","Serveur","Caissier","Gérant","Plongeur","Livreur","Agent de sécurité"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input style={inp} placeholder="Téléphone" value={sForm.telephone} onChange={e => setSForm(p => ({ ...p, telephone: e.target.value }))} />
                <input style={inp} placeholder="Salaire mensuel (GNF)" type="number" value={sForm.salaire} onChange={e => setSForm(p => ({ ...p, salaire: e.target.value }))} />
              </div>
              <button onClick={async () => {
                if (!sForm.nom) return;
                const d = await post(`${BASE(tenantCode!)}/staff`, { ...sForm, salaire: +sForm.salaire || 0 });
                if (d.success) { setShowAddStaff(false); setSForm({ nom: "", prenom: "", poste: "Serveur", telephone: "", salaire: "" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/staff`, { headers: h }).then(r => r.json()).then(d => d.success && setStaff(d.staff || [])); } else alert(d.message || "Erreur : rien n'a été enregistré");
              }} disabled={saving} style={btn(ORANGE)}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {staff.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucun membre d'équipe</div> :
              filtrer(staff, recherche).map(s => (
                <div key={s.id} style={{ background: "white", border: `1px solid ${ORANGE_BORDER}`, borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{s.prenom ? `${s.prenom} ${s.nom}` : s.nom}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{s.poste}{s.telephone ? ` · 📞 ${s.telephone}` : ""}</div>
                    {+s.salaire > 0 && <div style={{ fontSize: 12, color: ORANGE, fontWeight: 600, marginTop: 2 }}>{fmtMoney(+s.salaire)}/mois</div>}
                  </div>
                  <button onClick={async () => { if (confirm("Retirer ce membre ?")) { if (await envoyerGestion(`${BASE(tenantCode!)}/staff/${s.id}`, { method: "DELETE", headers: auth() })) setStaff(ss => ss.filter(x => x.id !== s.id)); } }}
                    style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── ANNONCES ── */}
      {tab === "announcements" && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>📢 Annonces ({announcements.length})</h2>
            <button onClick={() => setShowAddAnn(!showAddAnn)} style={btn(ORANGE)}>{showAddAnn ? "✕ Annuler" : "+ Publier"}</button>
          </div>
          {showAddAnn && (
            <div style={{ background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input style={inp} placeholder="Titre *" value={anForm.titre} onChange={e => setAnForm(p => ({ ...p, titre: e.target.value }))} />
                <select style={inp} value={anForm.type} onChange={e => setAnForm(p => ({ ...p, type: e.target.value }))}>
                  {["general","plat_jour","fermeture","promotion","evenement"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} placeholder="Contenu *" value={anForm.contenu} onChange={e => setAnForm(p => ({ ...p, contenu: e.target.value }))} />
              </div>
              <button onClick={async () => {
                if (!anForm.titre || !anForm.contenu) return;
                const d = await post(`${BASE(tenantCode!)}/announcements`, anForm);
                if (d.success) { setShowAddAnn(false); setAnForm({ titre: "", contenu: "", type: "general" }); const h = { Authorization: `Bearer ${localStorage.getItem("token")}` }; fetch(`${BASE(tenantCode!)}/announcements`, { headers: h }).then(r => r.json()).then(d => d.success && setAnnouncements(d.announcements || [])); } else alert(d.message || "Erreur : rien n'a été enregistré");
              }} disabled={saving} style={{ ...btn(ORANGE), marginTop: 10 }}>{saving ? "Publication…" : "Publier"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {announcements.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Aucune annonce</div> :
              filtrer(announcements, recherche).map(a => (
                <div key={a.id} style={{ background: "white", border: `1px solid ${ORANGE_BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{a.titre}</div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{a.contenu}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{fmtDate(a.created_at)}</div>
                    </div>
                    <button onClick={async () => { if (await envoyerGestion(`${BASE(tenantCode!)}/announcements/${a.id}`, { method: "DELETE", headers: auth() })) setAnnouncements(as => as.filter(x => x.id !== a.id)); }}
                      style={{ padding: "5px 12px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── PARAMÈTRES : identifiant, langue, installer l'application, abonnement ── */}
      {tab === "settings" && (
        <div style={{ animation: "fadeIn 0.2s ease", maxWidth: 640, display: "grid", gap: 16 }}>
          <TenantCodeCard code={tenantCode} />
          <RenseignementsEtablissement base={BASE(tenantCode!)} tenantCode={tenantCode} tenant={tenant} couleur={ORANGE} emoji="🍽️"
            titre="Renseignements du restaurant" nomLabel="Nom du restaurant *" descriptionAide="Votre cuisine, vos spécialités…"
            horairesAide="Ex : Lun-Dim 10h-23h" onSaved={setTenant} />
          <ParametreLangue />
          <ParametresEspacePro />
        </div>
      )}
    </div>
  );
}
