import { useState, useEffect } from "react";
import AccesRefuseGestion from "../components/AccesRefuseGestion";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionUser } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import { TenantLogo, MoftalMark, TenantCodeCard } from "../components/GestionBrand";
import { goToMoftal } from "../utils/goToMoftal";
import ParametreLangue from "../components/ParametreLangue";
import ParametresEspacePro from "../components/ParametresEspacePro";
import RenseignementsEtablissement from "../components/RenseignementsEtablissement";
import InstallAppButton from "../components/InstallAppButton";
import { envoyerGestion } from "../utils/envoyerGestion";
import { imprimerRecu } from "../utils/imprimerRecu";
import BarreRecherche from "../components/BarreRecherche";
import { filtrer } from "../utils/filtrer";
import { BoutonRapport } from "../components/RapportMois";
import { envoyerRappel, dateTexte } from "../utils/rappelMessage";
import { cheminConnexion } from "../utils/connexionRetour";
import CarreauPhoto from "../components/CarreauPhoto";
import type { EtablissementGestion, ReponseServeur } from "../types/pro";
import type { JuridiqueAnnouncement, JuridiqueBooking, JuridiqueClient, JuridiqueDossier, JuridiqueService, JuridiqueStaff, TableauJuridique } from "../types/gestion-juridique";

const BASE = (code: string) => `/api/juridique-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "dossiers" | "bookings" | "clients" | "services" | "staff" | "announcements" | "settings";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (Number(n) || 0).toLocaleString("fr-FR") + " GNF"; }

const COLOR     = "#7f1d1d";
const COLOR_BG  = "#fef2f2";
const COLOR_BDR = "#fecaca";
const GRADIENT  = "linear-gradient(135deg,#7f1d1d,#b45309)";

const DOMAINES = ["Conseil", "Foncier", "Famille", "Affaires", "Travail", "Pénal", "Contrats", "Recouvrement", "Création d'entreprise", "Fiscalité", "Autre"];

const DOSSIER_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  ouvert:   { bg: "#eff6ff", color: "#2563eb", label: "Ouvert" },
  en_cours: { bg: "#fffbeb", color: "#b45309", label: "En cours" },
  clos:     { bg: "#f1f5f9", color: "#475569", label: "Clos" },
};
const DOSSIER_VIDE = { titre: "", client_nom: "", client_telephone: "", domaine: "Conseil", responsable_id: "", prochaine_etape: "", date_echeance: "", honoraires: "", notes: "" };

const BOOKING_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  en_attente:  { bg: "#fffbeb", color: "#b45309", label: "En attente" },
  confirme:    { bg: "#eff6ff", color: "#2563eb", label: "Confirmé" },
  termine:     { bg: "#f0fdf0", color: "#156315", label: "Terminé" },
  annule:      { bg: "#fef2f2", color: "#dc2626", label: "Annulé" },
};

export default function GestionJuridique() {
  const [recherche, setRecherche] = useState("");
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();

  const [tab, setTab]                       = useState<Tab>("dashboard");
  useEffect(() => { setRecherche(""); }, [tab]);
  const [tenant, setTenant]                 = useState<EtablissementGestion | null>(null);
  const [dash, setDash]                     = useState<TableauJuridique | null>(null);
  const [services, setServices]             = useState<JuridiqueService[]>([]);
  const [bookings, setBookings]             = useState<JuridiqueBooking[]>([]);
  const [staff, setStaff]                   = useState<JuridiqueStaff[]>([]);
  const [clients, setClients]               = useState<JuridiqueClient[]>([]);
  const [announcements, setAnnouncements]   = useState<JuridiqueAnnouncement[]>([]);
  const [dossiers, setDossiers]             = useState<JuridiqueDossier[]>([]);
  const [showAddDossier, setShowAddDossier] = useState(false);
  const [dosForm, setDosForm] = useState({ ...DOSSIER_VIDE });
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [saving, setSaving]                 = useState(false);

  const [showAddService, setShowAddService]       = useState(false);
  const [showAddBooking, setShowAddBooking]       = useState(false);
  const [showAddStaff, setShowAddStaff]           = useState(false);
  const [showAddClient, setShowAddClient]         = useState(false);
  const [showAddAnn, setShowAddAnn]               = useState(false);

  const [svcForm, setSvcForm] = useState({ nom: "", categorie: "Conseil", prix: "", duree_min: "60", description: "" });
  const [bkForm, setBkForm]   = useState({ client_nom: "", client_telephone: "", service_id: "", staff_id: "", date_rdv: "", heure_rdv: "", notes: "" });
  const [stForm, setStForm]   = useState({ nom: "", prenom: "", poste: "Avocat", telephone: "", specialite: "", salaire: "" });
  const [cliForm, setCliForm] = useState({ nom: "", telephone: "", email: "", notes: "" });
  const [annForm, setAnnForm] = useState({ titre: "", contenu: "", type: "general" });

  const b = BASE;

  useEffect(() => {
    if (!user) { navigate(cheminConnexion(), { replace: true }); return; }
    if (!tenantCode) return;
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || loading) return;
    if (tab === "dossiers")     { loadDossiers(); loadStaff(); }
    if (tab === "services")     loadServices();
    if (tab === "bookings")     { loadBookings(); loadServices(); loadStaff(); }
    if (tab === "staff")        loadStaff();
    if (tab === "clients")      loadClients();
    if (tab === "announcements") loadAnnouncements();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
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
  async function loadDossiers()      { const r = await fetch(`${b(tenantCode!)}/dossiers`,      { headers: auth() }); const d = await r.json(); if (d.success) setDossiers(d.dossiers || []); }
  async function loadAnnouncements() { const r = await fetch(`${b(tenantCode!)}/announcements`, { headers: auth() }); const d = await r.json(); if (d.success) setAnnouncements(d.announcements || []); }

  // Envoi d'un formulaire : en cas de coupure ou de réponse illisible, on renvoie
  // une erreur (jamais de faux succès) et le bouton est toujours débloqué.
  async function poster(url: string, body: object): Promise<ReponseServeur> {
    setSaving(true);
    try {
      const r = await fetch(url, { method: "POST", headers: auth(), body: JSON.stringify(body) });
      const d = await r.json().catch((): null => null);
      if (!d) return { success: false, message: "Erreur de connexion : rien n'a été enregistré." };
      if (!r.ok && d.success !== false) return { ...d, success: false };
      return d;
    } catch {
      return { success: false, message: "Erreur de connexion : rien n'a été enregistré." };
    } finally {
      setSaving(false);
    }
  }

  async function saveService() {
    if (!svcForm.nom) return alert("Nom de la prestation requis");
    const d = await poster(`${b(tenantCode!)}/services`, svcForm);
    if (d.success) { setShowAddService(false); setSvcForm({ nom: "", categorie: "Conseil", prix: "", duree_min: "60", description: "" }); loadServices(); loadAll(); }
    else alert(d.message || "Erreur : rien n'a été enregistré.");
  }

  async function deleteService(id: number) {
    if (!confirm("Retirer cette prestation du site ?")) return;
    if (!(await envoyerGestion(`${b(tenantCode!)}/services/${id}`, { method: "DELETE", headers: auth() }))) { return; }
    loadServices();
  }

  async function saveBooking() {
    if (!bkForm.client_nom || !bkForm.date_rdv) return alert("Nom client et date requis");
    const d = await poster(`${b(tenantCode!)}/bookings`, bkForm);
    if (d.success) { setShowAddBooking(false); setBkForm({ client_nom: "", client_telephone: "", service_id: "", staff_id: "", date_rdv: "", heure_rdv: "", notes: "" }); loadBookings(); loadAll(); }
    else alert(d.message || "Erreur : rien n'a été enregistré.");
  }

  async function patchBooking(id: number, statut: string) {
    if (!(await envoyerGestion(`${b(tenantCode!)}/bookings/${id}`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) }))) { return; }
    loadBookings(); loadAll();
  }

  async function saveStaff() {
    if (!stForm.nom) return alert("Nom requis");
    const d = await poster(`${b(tenantCode!)}/staff`, stForm);
    if (d.success) { setShowAddStaff(false); setStForm({ nom: "", prenom: "", poste: "Avocat", telephone: "", specialite: "", salaire: "" }); loadStaff(); loadAll(); }
    else alert(d.message || "Erreur : rien n'a été enregistré.");
  }

  async function deleteStaff(id: number) {
    if (!confirm("Retirer ce membre de l'équipe ?")) return;
    if (!(await envoyerGestion(`${b(tenantCode!)}/staff/${id}`, { method: "DELETE", headers: auth() }))) { return; }
    loadStaff(); loadAll();
  }

  async function saveClient() {
    if (!cliForm.nom) return alert("Nom requis");
    const d = await poster(`${b(tenantCode!)}/clients`, cliForm);
    if (d.success) { setShowAddClient(false); setCliForm({ nom: "", telephone: "", email: "", notes: "" }); loadClients(); }
    else alert(d.message || "Erreur : rien n'a été enregistré.");
  }

  async function saveDossier() {
    if (!dosForm.titre) return alert("Intitulé du dossier requis");
    const d = await poster(`${b(tenantCode!)}/dossiers`, dosForm);
    if (d.success) { setShowAddDossier(false); setDosForm({ ...DOSSIER_VIDE }); loadDossiers(); loadAll(); }
    else alert(d.message || "Erreur : rien n'a été enregistré.");
  }

  async function patchDossier(id: number, champs: Record<string, unknown>) {
    if (!(await envoyerGestion(`${b(tenantCode!)}/dossiers/${id}`, { method: "PATCH", headers: auth(), body: JSON.stringify(champs) }))) { return; }
    loadDossiers(); loadAll();
  }

  async function saveAnn() {
    if (!annForm.titre || !annForm.contenu) return alert("Titre et contenu requis");
    const d = await poster(`${b(tenantCode!)}/announcements`, annForm);
    if (d.success) { setShowAddAnn(false); setAnnForm({ titre: "", contenu: "", type: "general" }); loadAnnouncements(); }
    else alert(d.message || "Erreur : rien n'a été enregistré.");
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: `4px solid ${COLOR_BDR}`, borderTopColor: COLOR, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return <AccesRefuseGestion message={error} couleur={COLOR} emoji="⚖️" />;

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard",     label: "Tableau de bord", emoji: "📊" },
    { id: "dossiers",      label: "Dossiers",        emoji: "📁" },
    { id: "bookings",      label: "Rendez-vous",     emoji: "📅" },
    { id: "clients",       label: "Clients",         emoji: "👤" },
    { id: "services",      label: "Prestations",     emoji: "⚖️" },
    { id: "staff",         label: "Équipe",          emoji: "👔" },
    { id: "announcements", label: "Annonces",        emoji: "📣" },
    { id: "settings",      label: "Paramètres",      emoji: "⚙️" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
  const btn = (bg: string, color = "white"): React.CSSProperties => ({ padding: "8px 16px", background: bg, color, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px", fontFamily: "system-ui,sans-serif" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion du cabinet — ${tenant?.name || ""}`}
        startUrl={`/gestion-juridique/${tenantCode}`}
        themeColor={COLOR}
      />
      <style>{`@media(max-width:640px){.gestion-btn-secondary{display:none!important}}`}</style>

      {/* HEADER */}
      <div style={{ background: GRADIENT, borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TenantLogo tenantCode={tenantCode} logoUrl={tenant?.logo_url} fallback="⚖️" size={48} radius={12} style={{ background: "rgba(255,255,255,0.15)" }} />
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant?.name || "Cabinet juridique"}</h1>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Gestion Interne — Cabinet juridique</p>
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
            <InstallAppButton name={tenant?.name} logoUrl={tenant?.logo_url} themeColor={COLOR} />
            <button onClick={() => goToMoftal(navigate)} title="Retour sur Moftal" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", ...btn("rgba(255,255,255,0.2)"), fontSize: 13 }}><MoftalMark /> Moftal</button>
          </div>
        </div>
      </div>

      {/* TABS : une seule ligne, qui défile sur téléphone */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", flexShrink: 0, background: tab === t.id ? COLOR : COLOR_BG, color: tab === t.id ? "white" : COLOR }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div>
          <BoutonRapport base={`/api/juridique-mgmt/${tenantCode}`} etablissement={tenant || undefined} couleur={COLOR} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Dossiers en cours",     val: dash?.dossiersOuverts || 0,    emoji: "📁" },
              { label: "Échéances (7 jours)",   val: dash?.echeancesSemaine || 0,   emoji: "⏰", warn: (dash?.echeancesSemaine||0) > 0 },
              { label: "RDV aujourd'hui",       val: dash?.rdvAujourdhui || 0,      emoji: "📅" },
              { label: "RDV en attente",        val: dash?.rdvEnAttente || 0,       emoji: "⏳", warn: (dash?.rdvEnAttente||0) > 0 },
              { label: "Clients",               val: dash?.totalClients || 0,       emoji: "👥" },
              { label: "Équipe",                val: dash?.totalStaff || 0,         emoji: "👔" },
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
              {dash.recentBookings.map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{b.client_nom}</span>
                  <span style={{ color: "#64748b" }}>{b.service_nom || "Consultation"} · {fmtDate(b.date_rdv)} {b.heure_rdv}</span>
                  <span style={{ ...BOOKING_STATUS[b.statut], padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{BOOKING_STATUS[b.statut]?.label || b.statut}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DOSSIERS — confidentiels : visibles uniquement dans la gestion */}
      {tab === "dossiers" && (
        <div>
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>📁 Dossiers</h2>
            <button onClick={() => setShowAddDossier(true)} style={btn(COLOR)}>+ Nouveau dossier</button>
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: "-8px 0 14px" }}>🔒 Les dossiers restent dans votre gestion : ils n'apparaissent jamais sur votre site.</p>
          {showAddDossier && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Intitulé *</label><input style={inp} value={dosForm.titre} onChange={e => setDosForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: Litige terrain Kipé" /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Client</label><input style={inp} value={dosForm.client_nom} onChange={e => setDosForm(f => ({ ...f, client_nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone du client</label><input style={inp} value={dosForm.client_telephone} onChange={e => setDosForm(f => ({ ...f, client_telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Domaine</label>
                  <select style={inp} value={dosForm.domaine} onChange={e => setDosForm(f => ({ ...f, domaine: e.target.value }))}>
                    {DOMAINES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Responsable</label>
                  <select style={inp} value={dosForm.responsable_id} onChange={e => setDosForm(f => ({ ...f, responsable_id: e.target.value }))}>
                    <option value="">Choisir (optionnel)</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.nom} {s.prenom}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prochaine étape</label><input style={inp} value={dosForm.prochaine_etape} onChange={e => setDosForm(f => ({ ...f, prochaine_etape: e.target.value }))} placeholder="Ex: Audience, dépôt de pièces…" /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Date de l'échéance</label><input style={inp} type="date" value={dosForm.date_echeance} onChange={e => setDosForm(f => ({ ...f, date_echeance: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Honoraires convenus (GNF)</label><input style={inp} type="number" value={dosForm.honoraires} onChange={e => setDosForm(f => ({ ...f, honoraires: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Notes (confidentielles)</label><textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={dosForm.notes} onChange={e => setDosForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveDossier} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setShowAddDossier(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {dossiers.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun dossier encore.</p>}
            {filtrer(dossiers, recherche).map(d => {
              const st = DOSSIER_STATUS[d.statut] || DOSSIER_STATUS.ouvert;
              const reste = (Number(d.honoraires) || 0) - (Number(d.montant_paye) || 0);
              return (
                <div key={d.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{d.reference}</div>
                      <div style={{ fontWeight: 700 }}>{d.titre}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{d.domaine}{d.client_nom ? ` · 👤 ${d.client_nom}` : ""}{d.client_telephone ? ` · 📞 ${d.client_telephone}` : ""}</div>
                      {d.responsable_nom && <div style={{ fontSize: 12, color: "#64748b" }}>👔 {d.responsable_nom} {d.responsable_prenom || ""}</div>}
                      {(d.prochaine_etape || d.date_echeance) && (
                        <div style={{ fontSize: 13, color: COLOR, marginTop: 4, fontWeight: 600 }}>⏰ {d.prochaine_etape || "Échéance"}{d.date_echeance ? ` — ${fmtDate(d.date_echeance)}` : ""}</div>
                      )}
                      {Number(d.honoraires) > 0 && (
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Honoraires : {fmtMoney(+d.honoraires)} · Payé : {fmtMoney(+d.montant_paye)}{reste > 0 ? ` · Reste : ${fmtMoney(reste)}` : " ✓"}</div>
                      )}
                      {d.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic", whiteSpace: "pre-wrap" }}>{d.notes}</div>}
                    </div>
                    <span style={{ background: st.bg, color: st.color, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{st.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {d.statut === "ouvert" && <button onClick={() => patchDossier(d.id, { statut: "en_cours" })} style={btn("#fffbeb", "#b45309")}>En cours</button>}
                    {d.statut !== "clos" && <button onClick={() => {
                      const etape = prompt("Prochaine étape :", d.prochaine_etape || "");
                      if (etape === null) return;
                      const date = prompt("Date de l'échéance (AAAA-MM-JJ), vide = aucune :", d.date_echeance ? String(d.date_echeance).slice(0, 10) : "");
                      if (date === null) return;
                      patchDossier(d.id, { prochaine_etape: etape, date_echeance: date });
                    }} style={btn("#eff6ff", "#2563eb")}>⏰ Échéance</button>}
                    {Number(d.honoraires) > 0 && d.statut !== "clos" && <button onClick={() => {
                      const v = prompt("Montant total déjà payé (GNF) :", String(Number(d.montant_paye) || 0));
                      if (v === null || v.trim() === "" || isNaN(Number(v))) return;
                      patchDossier(d.id, { montant_paye: Number(v) });
                    }} style={btn("#f0fdf0", "#156315")}>💰 Paiement</button>}
                    {d.statut !== "clos"
                      ? <button onClick={() => { if (confirm("Clore ce dossier ?")) patchDossier(d.id, { statut: "clos" }); }} style={btn("#f1f5f9", "#475569")}>Clore</button>
                      : <button onClick={() => patchDossier(d.id, { statut: "en_cours" })} style={btn("#f1f5f9", "#475569")}>↺ Rouvrir</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SERVICES */}
      {tab === "services" && (
        <div>
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>⚖️ Prestations affichées sur le site</h2>
            <button onClick={() => setShowAddService(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddService && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={svcForm.nom} onChange={e => setSvcForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Consultation juridique" /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Domaine</label>
                  <select style={inp} value={svcForm.categorie} onChange={e => setSvcForm(f => ({ ...f, categorie: e.target.value }))}>
                    {DOMAINES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Honoraires (GNF, vide = sur devis)</label><input style={inp} type="number" value={svcForm.prix} onChange={e => setSvcForm(f => ({ ...f, prix: e.target.value }))} /></div>
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
            {services.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucune prestation encore.</p>}
            {filtrer(services, recherche).map(s => (
              <div key={s.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                {/* Case photo : la photo apparaît sur le site */}
                <CarreauPhoto tenantCode={tenantCode!} articleId={s.id} imageUrl={s.image_url} couleur={COLOR}
                  onChange={url => setServices(xs => xs.map(x => x.id === s.id ? { ...x, image_url: url } : x))}
                  style={{ float: "left", marginInlineEnd: 12 }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.nom}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{s.categorie} · {s.duree_min} min</div>
                  </div>
                  <button onClick={() => deleteService(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18 }}>🗑</button>
                </div>
                <div style={{ marginTop: 8, fontWeight: 700, color: COLOR }}>{Number(s.prix) > 0 ? fmtMoney(+s.prix) : "Sur devis"}</div>
                {s.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDEZ-VOUS */}
      {tab === "bookings" && (
        <div>
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>📅 Rendez-vous</h2>
            <button onClick={() => setShowAddBooking(true)} style={btn(COLOR)}>+ Nouveau RDV</button>
          </div>
          {showAddBooking && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Client *</label><input style={inp} value={bkForm.client_nom} onChange={e => setBkForm(f => ({ ...f, client_nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={bkForm.client_telephone} onChange={e => setBkForm(f => ({ ...f, client_telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prestation</label>
                  <select style={inp} value={bkForm.service_id} onChange={e => setBkForm(f => ({ ...f, service_id: e.target.value }))}>
                    <option value="">Choisir une prestation</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.nom}{Number(s.prix) > 0 ? ` — ${fmtMoney(+s.prix)}` : ""}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Avocat / juriste</label>
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
            {filtrer(bookings, recherche).map(bk => {
              const st = BOOKING_STATUS[bk.statut] || BOOKING_STATUS.en_attente;
              return (
                <div key={bk.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{bk.client_nom} {bk.client_telephone && <span style={{ fontSize: 12, color: "#64748b" }}>· {bk.client_telephone}</span>}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{bk.service_nom || "Consultation"} · {fmtDate(bk.date_rdv)} {bk.heure_rdv}</div>
                      {bk.staff_nom && <div style={{ fontSize: 12, color: "#64748b" }}>👔 {bk.staff_nom}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ background: st.bg, color: st.color, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                      {(bk.statut === "en_attente" || bk.statut === "confirme") && <button onClick={() => envoyerRappel(bk.client_telephone, `Bonjour ${bk.client_nom || ""}, ${tenant?.name || "le cabinet"} vous rappelle votre rendez-vous ${bk.service_nom ? `(${bk.service_nom}) ` : ""}le ${dateTexte(bk.date_rdv)}${bk.heure_rdv ? ` à ${bk.heure_rdv}` : ""}. À bientôt !`)} style={{ fontSize: 11, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontWeight: 600 }}>📲 Rappel</button>}
                      <button onClick={() => imprimerRecu({
                        titre: "Reçu d'honoraires", numero: bk.id, date: bk.date_rdv, etablissement: tenant || {}, couleur: COLOR,
                        client: bk.client_nom, clientTelephone: bk.client_telephone,
                        details: [{ label: "Rendez-vous", valeur: `${fmtDate(bk.date_rdv)} ${bk.heure_rdv || ""}`.trim() }, ...(bk.staff_nom ? [{ label: "Reçu par", valeur: bk.staff_nom }] : [])],
                        lignes: [{ libelle: bk.service_nom || "Consultation", montant: bk.service_prix || 0 }],
                        total: bk.service_prix || 0, note: bk.notes,
                      })} style={{ fontSize: 11, border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontWeight: 600 }}>🖨 Reçu</button>
                    </div>
                  </div>
                  {bk.statut === "en_attente" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => patchBooking(bk.id, "confirme")}  style={btn("#eff6ff", "#2563eb")}>Confirmer</button>
                      <button onClick={() => patchBooking(bk.id, "annule")}    style={btn("#fef2f2", "#dc2626")}>Annuler</button>
                    </div>
                  )}
                  {bk.statut === "confirme" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => patchBooking(bk.id, "termine")}   style={btn(COLOR)}>Terminé ✓</button>
                      <button onClick={() => patchBooking(bk.id, "annule")}    style={btn("#fef2f2", "#dc2626")}>Annuler</button>
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
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>👔 Équipe du cabinet</h2>
            <button onClick={() => setShowAddStaff(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddStaff && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={stForm.nom} onChange={e => setStForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Prénom</label><input style={inp} value={stForm.prenom} onChange={e => setStForm(f => ({ ...f, prenom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Poste</label>
                  <select style={inp} value={stForm.poste} onChange={e => setStForm(f => ({ ...f, poste: e.target.value }))}>
                    {["Avocat", "Avocat associé", "Juriste", "Conseiller juridique", "Stagiaire", "Secrétaire", "Responsable"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={stForm.telephone} onChange={e => setStForm(f => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Spécialité</label><input style={inp} value={stForm.specialite} onChange={e => setStForm(f => ({ ...f, specialite: e.target.value }))} placeholder="Ex: Droit foncier, droit des affaires..." /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Salaire (GNF)</label><input style={inp} type="number" value={stForm.salaire} onChange={e => setStForm(f => ({ ...f, salaire: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveStaff} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddStaff(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {staff.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun membre de l'équipe encore.</p>}
            {filtrer(staff, recherche).map(s => (
              <div key={s.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.nom} {s.prenom}</div>
                    <div style={{ fontSize: 13, color: COLOR }}>{s.poste}</div>
                    {s.specialite && <div style={{ fontSize: 12, color: "#64748b" }}>{s.specialite}</div>}
                    {s.telephone && <div style={{ fontSize: 12, color: "#64748b" }}>📞 {s.telephone}</div>}
                    {+s.salaire > 0 && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Salaire: {fmtMoney(+s.salaire)}</div>}
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
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>👤 Clients</h2>
            <button onClick={() => setShowAddClient(true)} style={btn(COLOR)}>+ Ajouter</button>
          </div>
          {showAddClient && (
            <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BDR}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Nom *</label><input style={inp} value={cliForm.nom} onChange={e => setCliForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Téléphone</label><input style={inp} value={cliForm.telephone} onChange={e => setCliForm(f => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#64748b" }}>Email</label><input style={inp} value={cliForm.email} onChange={e => setCliForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 12, color: "#64748b" }}>Notes (confidentielles)</label><input style={inp} value={cliForm.notes} onChange={e => setCliForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveClient} disabled={saving} style={btn(COLOR)}>{saving ? "..." : "Ajouter"}</button>
                <button onClick={() => setShowAddClient(false)} style={btn("#e2e8f0", "#374151")}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {clients.length === 0 && <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Aucun client enregistré.</p>}
            {filtrer(clients, recherche).map(c => (
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
          <BarreRecherche valeur={recherche} onChange={setRecherche} />
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
                    {["general", "fermeture", "evenement"].map(t => <option key={t}>{t}</option>)}
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
          {filtrer(announcements, recherche).map(a => (
            <div key={a.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{a.titre}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{a.contenu}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{a.type} · {fmtDate(a.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {/* PARAMÈTRES : identifiant, renseignements du cabinet, langue, abonnement */}
      {tab === "settings" && (
        <div style={{ maxWidth: 640, display: "grid", gap: 16 }}>
          <TenantCodeCard code={tenantCode} />
          <RenseignementsEtablissement base={b(tenantCode!)} tenantCode={tenantCode} tenant={tenant} couleur={COLOR} emoji="⚖️"
            titre="Renseignements du cabinet" nomLabel="Nom du cabinet *" descriptionAide="Vos domaines, votre expérience…"
            horairesAide="Ex : Lun-Ven 8h-17h" onSaved={setTenant} />
          <ParametreLangue />
          <ParametresEspacePro />
        </div>
      )}
    </div>
  );
}
