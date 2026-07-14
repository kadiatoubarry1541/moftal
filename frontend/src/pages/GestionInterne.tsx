import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser, isAdmin } from "../utils/auth";
import { config } from "../config/api";
import Activite from "./Activite";
import { AddPersonModal } from "../components/AddPersonModal";


// Tous les services de la plateforme — référence unique de l'admin
const ADMIN_SERVICES = [
  { type: "clinic",          demoCode: "DEMO-REF-CLIN",  label: "Clinique / Hôpital",       emoji: "🏥", color: "#1a8f1a", bg: "#f0fdfa", path: "gestion-clinique",      vitrinePath: "clinique",        reseauPath: "reseau/clinic",          desc: "Patients, personnel médical, consultations, dossiers" },
  { type: "school",          demoCode: "DEMO-REF-ECO",   label: "École / Université",        emoji: "🏫", color: "#1a8f1a", bg: "#f0fdf0", path: "gestion-ecole",         vitrinePath: "ecole",           reseauPath: "reseau/school",          desc: "Élèves, cours, présences, notes, enseignants" },
  { type: "mosque",          demoCode: "DEMO-REF-MSQ",   label: "Réseau Imam",               emoji: "🕌", color: "#1a8f1a", bg: "#f0fdf0", path: "gestion-mosquee",       vitrinePath: "mosquee",         reseauPath: "reseau/mosque",          desc: "Imams, fidèles, prédications, mosquées partenaires, dons, Coran" },
  { type: "reseau",          demoCode: "DEMO-REF-RESEAU",label: "Association / Réseau",      emoji: "🌐", color: "#2563eb", bg: "#eff6ff", path: "gestion-reseau",        vitrinePath: "reseau-vitrine",  reseauPath: "reseau/reseau",          desc: "Membres, projets, cotisations, annonces — pour associations et groupes organisés" },
  { type: "madrasa",         demoCode: "DEMO-REF-MDS",   label: "Madrasa / Daroul",          emoji: "📖", color: "#0891b2", bg: "#ecfeff", path: "gestion-madrasa",       vitrinePath: "madrasa",         reseauPath: "reseau/madrasa",         desc: "Élèves, enseignants, cours religieux, certificats" },
  { type: "commerce",        demoCode: "DEMO-REF-COM",   label: "Boutique / Commerce",       emoji: "🏪", color: "#d97706", bg: "#fffbeb", path: "gestion-commerce",      vitrinePath: "commerce",        reseauPath: "reseau/commerce",        desc: "Stock, ventes, clients, caisse, crédits" },
  { type: "enterprise",      demoCode: "DEMO-REF-ENT",   label: "Entreprise",                emoji: "🏢", color: "#4f46e5", bg: "#eef2ff", path: "gestion-entreprise",    vitrinePath: "entreprise",      reseauPath: "reseau/enterprise",      desc: "Employés, clients, contrats, projets, annonces" },
  { type: "ngo",             demoCode: "DEMO-REF-NGO",   label: "ONG & Associations",        emoji: "🤝", color: "#e11d48", bg: "#fff1f2", path: "gestion-ngo",           vitrinePath: "ngo",             reseauPath: "reseau/ngo",             desc: "Bénévoles, projets solidaires, appels aux dons" },
  { type: "journalist",      demoCode: "DEMO-REF-JOUR",  label: "Journalistes / Médias",     emoji: "📰", color: "#dc2626", bg: "#fff1f2", path: "gestion-journaliste",   vitrinePath: "journaliste",     reseauPath: "reseau/journalist",      desc: "Journalistes, articles, abonnés, annonces" },
  { type: "scientist",       demoCode: "DEMO-REF-SCIEN", label: "Scientifiques",             emoji: "🔬", color: "#4338ca", bg: "#eef2ff", path: "gestion-scientifique",  vitrinePath: "scientifique",    reseauPath: "reseau/scientist",       desc: "Chercheurs, publications, projets scientifiques" },
  { type: "supplier",        demoCode: "DEMO-REF-FOUR",  label: "Fournisseurs / Grossistes", emoji: "🚚", color: "#0e7490", bg: "#ecfeff", path: "gestion-fournisseur",   vitrinePath: "fournisseur",     reseauPath: "reseau/supplier",        desc: "Produits, clients, commandes, annonces" },
  { type: "security_agency", demoCode: "DEMO-REF-SECU",  label: "Agences de Sécurité",       emoji: "🛡️", color: "#475569", bg: "#f8fafc", path: "gestion-securite",      vitrinePath: "securite",        reseauPath: "reseau/security_agency", desc: "Agents, missions, clients, annonces sécurité" },
  { type: "broker",          demoCode: "DEMO-REF-IMMO",  label: "Immobilier / Démarcheur",   emoji: "🏠", color: "#b45309", bg: "#fffbeb", path: "gestion-immobilier",    vitrinePath: "immobilier",      reseauPath: "reseau/broker",          desc: "Biens, locataires, loyers, maintenance, annonces" },
  { type: "restaurant",      demoCode: "DEMO-REF-RESTO", label: "Restaurant / Restauration", emoji: "🍽️", color: "#ea580c", bg: "#fff7ed", path: "gestion-restaurant",    vitrinePath: "restaurant",      reseauPath: "reseau/restaurant",      desc: "Menu, tables, commandes, équipe, annonces" },
  { type: "transport",       demoCode: "DEMO-REF-TRANS", label: "Transport & Livraison",     emoji: "🚌", color: "#1d4ed8", bg: "#eff6ff", path: "gestion-transport",     vitrinePath: "transport",       reseauPath: "reseau/transport",       desc: "Véhicules, chauffeurs, trajets, réservations, annonces" },
  { type: "mairie",          demoCode: "DEMO-REF-MAIR",  label: "Mairie / État Civil",       emoji: "🏛️", color: "#1d4ed8", bg: "#eff6ff", path: "gestion-mairie",        vitrinePath: "mairie",          reseauPath: "",                       desc: "Mariages, naissances, décès, certificats de résidence, agents" },
  { type: "vendor",          demoCode: "DEMO-REF-VENT",  label: "Vendeur / Détaillant",      emoji: "🛒", color: "#0891b2", bg: "#ecfeff", path: "gestion-vendeur",       vitrinePath: "vendeur",         reseauPath: "reseau/vendor",          desc: "Produits, ventes, clients, dépenses" },
  { type: "producer",        demoCode: "DEMO-REF-PROD",  label: "Entreprise de Production",  emoji: "🏭", color: "#7c3aed", bg: "#f5f3ff", path: "gestion-producer",      vitrinePath: "producteur",      reseauPath: "reseau/producer",        desc: "Produits fabriqués, lots, commandes, personnel" },
  { type: "beauty",          demoCode: "DEMO-REF-BEAU",  label: "Beauté & Bien-être",        emoji: "💈", color: "#db2777", bg: "#fdf2f8", path: "gestion-beauty",        vitrinePath: "beaute-vitrine",  reseauPath: "reseau/beauty",          desc: "Services, rendez-vous, personnel, clients" },
  { type: "artisan",         demoCode: "DEMO-REF-ARTI",  label: "Artisanat & Services",      emoji: "🔧", color: "#d97706", bg: "#fffbeb", path: "gestion-artisan",       vitrinePath: "artisan",         reseauPath: "reseau/artisan",         desc: "Interventions, services, clients, annonces" },
  { type: "health_worker",   demoCode: "DEMO-REF-HLTH",  label: "Médecin / Agent de santé",  emoji: "👨‍⚕️", color: "#1a8f1a", bg: "#f0fdfa", path: "gestion-clinique",      vitrinePath: "clinique",        reseauPath: "reseau/clinic",          desc: "Consultations, patients, rendez-vous (dashboard clinique)" },
];

function getTypeInfo(type: string) {
  const found = ADMIN_SERVICES.find(s => s.type === type);
  if (found) return { label: found.label, path: found.path || found.reseauPath, vitrinePath: found.vitrinePath || "", color: found.color, bg: found.bg, emoji: found.emoji };
  return { label: type || "Service", path: "gestion-commerce", vitrinePath: "", color: "#64748b", bg: "#f8fafc", emoji: "🏢" };
}

export default function GestionInterne() {
  const navigate = useNavigate();
  const [accounts, setAccounts]           = useState<any[]>([]);
  const [adminTenants, setAdminTenants]   = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [accesGI, setAccesGI]             = useState<any>(null);
  const [payGILoading, setPayGILoading]   = useState(false);
  const [showPaywall, setShowPaywall]     = useState(false);
  const [tabOverride, setTabOverride]     = useState<'pro' | 'activite' | null>(null);
  const [connectModal, setConnectModal]   = useState<{ accountId: number; name: string } | null>(null);

  const currentUser = getSessionUser();
  const userIsAdmin = isAdmin(currentUser);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!currentUser) { navigate("/login"); return; }

    const myAccountsPromise = fetch(`/api/professionals/my-accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const mgmt = (data.accounts || []).filter((a: any) => a.status === "approved");
        setAccounts(mgmt);
        // Redirection auto seulement si accès confirmé (vérifié plus bas)
      })
      .catch(() => {});

    // Vérifier l'accès à la Gestion Interne (essai ou vie)
    const accesPromise = !userIsAdmin
      ? fetch(`/api/payment/acces-gestion-interne`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => { if (d.success) setAccesGI(d); })
          .catch(() => {})
      : Promise.resolve();

    const adminTenantsPromise = userIsAdmin
      ? fetch(`/api/professionals/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => { if (data.success) setAdminTenants(data.tenants || []); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([myAccountsPromise, accesPromise, adminTenantsPromise]).finally(() => setLoading(false));
  }, []);

  // Redirection auto si un seul compte + accès confirmé
  useEffect(() => {
    if (userIsAdmin || accounts.length !== 1 || !accesGI) return;
    if (!accesGI.aAcces) return; // pas d'accès → rester sur la page (paywall)
    const a = accounts[0];
    if (a.tenant_code) {
      const info = getTypeInfo(a.type);
      ouvrirGestionUrl(info.path, a.tenant_code);
    }
  }, [accounts, accesGI]);

  async function payerGestionInterne(periode: 'mois' | 'an' | 'cinqAns') {
    setPayGILoading(true);
    try {
      const purposeMap = { mois: 'gestion_mois', an: 'gestion_an', cinqAns: 'gestion_5ans' };
      const prixMap = { mois: accesGI?.prixMois, an: accesGI?.prixAn, cinqAns: accesGI?.prixCinqAns };
      const r = await fetch(`/api/payment/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: prixMap[periode] || 0,
          currency: "GNF",
          purpose: purposeMap[periode],
          relatedId: accesGI?.proId,
          description: `Gestion Interne ${periode === 'mois' ? 'mensuel' : periode === 'an' ? 'annuel' : '5 ans'}`,
        }),
      });
      const d = await r.json();
      if (d.paymentUrl) { window.location.href = d.paymentUrl; }
      else alert(d.message || "Impossible de lancer le paiement. Réessayez.");
    } catch { alert("Erreur de connexion."); }
    finally { setPayGILoading(false); }
  }

  // Raccourci pour l'ancien bouton (5 ans)
  const payerGestionInterneVie = () => payerGestionInterne('cinqAns');

  // Redirige vers gestion.moftal.com avec le token d'authentification
  function ouvrirGestionUrl(path: string, tenantCode: string) {
    const t = localStorage.getItem('token') || '';
    const s = localStorage.getItem('session_user') || '';
    window.location.href = `https://gestions.moftal.com/${path}/${tenantCode}?_t=${encodeURIComponent(t)}&_s=${encodeURIComponent(s)}`;
  }

  // Ouvre la gestion : vérifie l'accès, auto-setup tenant_code si manquant
  async function ouvrirGestion(account: any) {
    // Bloquer si l'essai est terminé et pas payé à vie
    if (accesGI && !accesGI.aAcces) {
      alert("Votre essai gratuit est terminé. Achetez l'accès à vie ci-dessous pour continuer.");
      return;
    }
    const info = getTypeInfo(account.type);
    if (account.tenant_code) {
      ouvrirGestionUrl(info.path, account.tenant_code);
      return;
    }
    try {
      const r = await fetch(`/api/professionals/${account.id}/ensure-tenant`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.success && d.tenantCode) {
        ouvrirGestionUrl(info.path, d.tenantCode);
      } else {
        alert(d.message || "Impossible d'activer la gestion interne. Contactez l'administrateur.");
      }
    } catch {
      alert("Erreur de connexion.");
    }
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", minHeight:300 }}>
      <div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTopColor:"#1a8f1a", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Bandeau essai/vie pour utilisateurs non-admin ayant accès
  const BandeauAcces = () => {
    if (userIsAdmin || !accesGI?.aAcces) return null;
    if (accesGI.mode === 'vie') return (
      <div style={{ background:"#f0fdf0", border:"1px solid #86efac", borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>♾️</span>
        <p style={{ margin:0, fontSize:13, color:"#0f4b0f", fontWeight:700 }}>Accès à vie — Espace Professionnel débloqué définitivement.</p>
      </div>
    );
    if (accesGI.mode === 'essai') return (
      <div style={{ background:"#eff6ff", border:"1px solid #93c5fd", borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>⏳</span>
          <p style={{ margin:0, fontSize:13, color:"#1e40af", fontWeight:700 }}>
            Essai gratuit — <strong>{accesGI.joursRestants} jour{accesGI.joursRestants > 1 ? 's' : ''}</strong> restant{accesGI.joursRestants > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={payerGestionInterneVie} disabled={payGILoading}
          style={{ padding:"6px 14px", background:"#2563eb", color:"white", border:"none", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
          {payGILoading ? "..." : `💳 Débloquer à vie — ${(accesGI.prixVie||3000000).toLocaleString("fr-GN")} GNF`}
        </button>
      </div>
    );
    return null;
  };

  // Offre à vie — affichée quand l'essai est terminé et que l'utilisateur clique sur "Débloquer"
  const OffreVie = () => (
    <div style={{ background:"linear-gradient(135deg,#1e3a5f,#2563eb)", borderRadius:16, padding:"24px 22px", marginBottom:16, color:"white" }}>
      <p style={{ fontSize:13, fontWeight:600, color:"#93c5fd", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Accès à vie</p>
      <p style={{ fontSize:36, fontWeight:900, margin:"4px 0" }}>
        {(accesGI?.prixVie || 3000000).toLocaleString("fr-GN")} GNF
      </p>
      <p style={{ fontSize:13, color:"#bfdbfe", marginBottom:16 }}>Compte pro inclus automatiquement</p>
      <div style={{ display:"grid", gap:10 }}>
        {([
          { periode: 'mois' as const, label: '📅 Mensuel', prix: accesGI?.prixMois },
          { periode: 'an'  as const, label: '📆 Annuel',  prix: accesGI?.prixAn, badge: '2 mois offerts' },
          { periode: 'cinqAns' as const, label: '🏆 5 ans', prix: accesGI?.prixCinqAns, badge: '1 an offert' },
        ]).map(opt => (
          <button key={opt.periode}
            onClick={() => payerGestionInterne(opt.periode)}
            disabled={payGILoading}
            style={{ width:"100%", padding:"12px 16px", background:"white", color:"#1e3a5f", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:800, opacity: payGILoading ? 0.6 : 1, display:"flex", justifyContent:"space-between", alignItems:"center" }}
          >
            <span>{opt.label}</span>
            <span>
              {opt.prix?.toLocaleString("fr-GN")} GNF
              {opt.badge && <span style={{ marginLeft:8, fontSize:11, background:"#22c55e", color:"white", padding:"2px 6px", borderRadius:999 }}>{opt.badge}</span>}
            </span>
          </button>
        ))}
      </div>
      <p style={{ fontSize:12, color:"#bfdbfe", marginTop:14, marginBottom:0, textAlign:"center" }}>Paiement sécurisé via FedaPay (Orange Money, Wave, carte)</p>
    </div>
  );

  // Sans compte pro (et non admin) : on ouvre directement Activité (page créée depuis l'inscription, déjà accessible)
  const defaultTab: 'pro' | 'activite' = 'activite';
  const tab = tabOverride ?? defaultTab;

  // Deux espaces toujours visibles : Activité / Espace Pro (Activité en premier : tout le monde en a une, pas forcément un compte pro)
  const TabButtons = ({ proLabel, onProClick }: { proLabel: string; onProClick: () => void }) => (
    <div style={{ display:"flex", gap:8, marginBottom:16 }}>
      <button onClick={() => setTabOverride('activite')} style={{ flex:1, padding:"12px 0", borderRadius:10, border: tab === 'activite' ? "2px solid #cbd5e1" : "2px solid transparent", cursor:"pointer", fontSize:14, fontWeight:800, background: tab === 'activite' ? "#e2e8f0" : "#f1f5f9", color: tab === 'activite' ? "#1e293b" : "#475569" }}>
        🎯 Activité
      </button>
      <button onClick={onProClick} style={{ flex:1, padding:"12px 0", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, background: tab === 'pro' ? "#1a8f1a" : "#f1f5f9", color: tab === 'pro' ? "white" : "#475569" }}>
        {proLabel}
      </button>
    </div>
  );

  // ── Vue ADMIN ──────────────────────────────────────────────────────────────
  if (userIsAdmin) {
    const realTenants = adminTenants.filter((t: any) => !t.tenant_code?.startsWith("DEMO-REF-"));
    const tenantsByType: Record<string, any[]> = {};
    realTenants.forEach((t: any) => {
      if (!tenantsByType[t.type]) tenantsByType[t.type] = [];
      tenantsByType[t.type].push(t);
    });
    const totalReal = realTenants.length;

    // 6 services avec module Gestion Interne complet
    const GESTION_SERVICES = [
      { type: "clinic",     label: "Clinique / Hôpital",   emoji: "🏥", gradient: "linear-gradient(135deg,#1a8f1a,#1a8f1a)", border: "#bbf7bb", bgLight: "#f0fdfa", textColor: "#0f4b0f", features: "Patients · Personnel · RDV · Ordonnances · Dossiers · Paiements",          demoCode: "DEMO-REF-CLIN", path: "gestion-clinique",  btn: "#1a8f1a", btnH: "#156315" },
      { type: "school",     label: "École / Université",    emoji: "🎓", gradient: "linear-gradient(135deg,#f59e0b,#f97316)", border: "#fde68a", bgLight: "#fffbeb", textColor: "#92400e", features: "Élèves · Personnel · Classes · Présences · Notes · Frais scolaires",      demoCode: "DEMO-REF-ECO",  path: "gestion-ecole",    btn: "#f59e0b", btnH: "#d97706" },
      { type: "mosque",     label: "Réseau Imam",           emoji: "🕌", gradient: "linear-gradient(135deg,#156315,#1a8f1a)", border: "#bbf7bb", bgLight: "#f0fdf0", textColor: "#14532d", features: "Imams · Fidèles · Prédications · Mosquées partenaires · Dons · Coran",  demoCode: "DEMO-REF-MSQ", path: "gestion-mosquee",  btn: "#156315", btnH: "#0f4b0f" },
      { type: "reseau",     label: "Réseau",  emoji: "🌐", gradient: "linear-gradient(135deg,#1d4ed8,#2563eb)", border: "#bfdbfe", bgLight: "#eff6ff", textColor: "#1e3a8a", features: "Membres · Projets · Cotisations · Annonces · Événements",                demoCode: "DEMO-REF-RESEAU", path: "gestion-reseau", btn: "#2563eb", btnH: "#1d4ed8" },
      { type: "madrasa",    label: "Madrasa / Daroul",      emoji: "📖", gradient: "linear-gradient(135deg,#0891b2,#2563eb)", border: "#a5f3fc", bgLight: "#ecfeff", textColor: "#164e63", features: "Élèves · Enseignants · Cours religieux · Présences · Certificats",       demoCode: "DEMO-REF-MDS",  path: "gestion-madrasa",  btn: "#0891b2", btnH: "#0e7490" },
      { type: "commerce",   label: "Boutique / Commerce",   emoji: "🏪", gradient: "linear-gradient(135deg,#ea580c,#eab308)", border: "#fed7aa", bgLight: "#fff7ed", textColor: "#7c2d12", features: "Stock · Ventes · Clients · Caisse · Crédits · Fournisseurs",            demoCode: "DEMO-REF-COM",  path: "gestion-commerce", btn: "#ea580c", btnH: "#c2410c" },
      { type: "enterprise", label: "Entreprise",            emoji: "🏢", gradient: "linear-gradient(135deg,#4338ca,#7c3aed)", border: "#c7d2fe", bgLight: "#eef2ff", textColor: "#312e81", features: "Employés · Clients · Contrats / Projets · Annonces",                  demoCode: "DEMO-REF-ENT",  path: "gestion-entreprise", btn: "#4f46e5", btnH: "#4338ca" },
      { type: "ngo",        label: "ONG & Associations",    emoji: "🤝", gradient: "linear-gradient(135deg,#be123c,#e11d48)", border: "#fecdd3", bgLight: "#fff1f2", textColor: "#9f1239", features: "Bénévoles · Projets · Collectes de dons · Annonces",                demoCode: "DEMO-REF-NGO",  path: "gestion-ngo",          btn: "#e11d48", btnH: "#be123c" },
      { type: "journalist",      label: "Journalistes / Médias",    emoji: "📰", gradient: "linear-gradient(135deg,#b91c1c,#dc2626)", border: "#fecaca", bgLight: "#fff1f2", textColor: "#991b1b", features: "Journalistes · Articles · Abonnés · Annonces",                          demoCode: "DEMO-REF-JOUR",  path: "gestion-journaliste",  btn: "#dc2626", btnH: "#b91c1c" },
      { type: "scientist",       label: "Scientifiques",            emoji: "🔬", gradient: "linear-gradient(135deg,#3730a3,#4338ca)", border: "#c7d2fe", bgLight: "#eef2ff", textColor: "#312e81", features: "Chercheurs · Publications · Projets scientifiques · Annonces",          demoCode: "DEMO-REF-SCIEN", path: "gestion-scientifique", btn: "#4338ca", btnH: "#3730a3" },
      { type: "supplier",        label: "Fournisseurs / Grossistes",emoji: "🚚", gradient: "linear-gradient(135deg,#0e7490,#0891b2)", border: "#a5f3fc", bgLight: "#ecfeff", textColor: "#164e63", features: "Produits · Clients / Revendeurs · Commandes · Annonces · Catalogue public",  demoCode: "DEMO-REF-FOUR",  path: "gestion-fournisseur",  btn: "#0e7490", btnH: "#0c6072" },
      { type: "security_agency", label: "Agences de Sécurité",      emoji: "🛡️", gradient: "linear-gradient(135deg,#334155,#475569)", border: "#cbd5e1", bgLight: "#f8fafc", textColor: "#1e293b", features: "Agents · Missions · Clients · Annonces de sécurité",                    demoCode: "DEMO-REF-SECU",  path: "gestion-securite",     btn: "#475569", btnH: "#334155" },
      { type: "immobilier",      label: "Immobilier",               emoji: "🏠", gradient: "linear-gradient(135deg,#92400e,#b45309)", border: "#fde68a", bgLight: "#fffbeb", textColor: "#78350f", features: "Biens · Locataires · Loyers · Maintenance · Annonces",                demoCode: "DEMO-REF-IMMO",  path: "gestion-immobilier",   btn: "#b45309", btnH: "#92400e" },
      { type: "restaurant",      label: "Restaurant",               emoji: "🍽️", gradient: "linear-gradient(135deg,#9a3412,#ea580c)", border: "#fed7aa", bgLight: "#fff7ed", textColor: "#7c2d12", features: "Menu · Tables · Commandes · Équipe · CA du jour",                     demoCode: "DEMO-REF-RESTO", path: "gestion-restaurant",   btn: "#ea580c", btnH: "#c2410c" },
      { type: "transport",       label: "Transport & Livraison",    emoji: "🚌", gradient: "linear-gradient(135deg,#1e40af,#1d4ed8)", border: "#bfdbfe", bgLight: "#eff6ff", textColor: "#1e3a8a", features: "Véhicules · Chauffeurs · Trajets · Réservations · Annonces",             demoCode: "DEMO-REF-TRANS", path: "gestion-transport",    btn: "#1d4ed8", btnH: "#1e40af" },
      { type: "mairie",          label: "Mairie / État Civil",      emoji: "🏛️", gradient: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", border: "#bfdbfe", bgLight: "#eff6ff", textColor: "#1e3a8a", features: "Mariages · Naissances · Décès · Certificats de résidence · Agents",    demoCode: "DEMO-REF-MAIR",  path: "gestion-mairie",       btn: "#1d4ed8", btnH: "#1e3a8a" },
      { type: "vendor",          label: "Vendeur / Détaillant",     emoji: "🛒", gradient: "linear-gradient(135deg,#0e7490,#0891b2)", border: "#a5f3fc", bgLight: "#ecfeff", textColor: "#164e63", features: "Produits · Ventes journalières · Clients · Dépenses · Catalogue",              demoCode: "DEMO-REF-VENT",  path: "gestion-vendeur",      btn: "#0891b2", btnH: "#0e7490" },
      { type: "producer",        label: "Entreprise de Production", emoji: "🏭", gradient: "linear-gradient(135deg,#5b21b6,#7c3aed)", border: "#ddd6fe", bgLight: "#f5f3ff", textColor: "#3b0764", features: "Produits fabriqués · Lots · Commandes · Personnel · Stocks de production",     demoCode: "DEMO-REF-PROD",  path: "gestion-producer",     btn: "#7c3aed", btnH: "#6d28d9" },
      { type: "beauty",          label: "Beauté & Bien-être",       emoji: "💈", gradient: "linear-gradient(135deg,#be185d,#db2777)", border: "#fbcfe8", bgLight: "#fdf2f8", textColor: "#831843", features: "Services · Rendez-vous · Personnel · Clients · Caisse du jour",                 demoCode: "DEMO-REF-BEAU",  path: "gestion-beauty",       btn: "#db2777", btnH: "#be185d" },
      { type: "artisan",         label: "Artisanat & Services",     emoji: "🔧", gradient: "linear-gradient(135deg,#92400e,#d97706)", border: "#fde68a", bgLight: "#fffbeb", textColor: "#78350f", features: "Interventions · Services · Devis · Clients · Annonces",                         demoCode: "DEMO-REF-ARTI",  path: "gestion-artisan",      btn: "#d97706", btnH: "#b45309" },
    ];

    const RESEAU_SERVICES: any[] = [];

    return (
      <>
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"32px 20px" }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <TabButtons proLabel="Espace Pro" onProClick={() => setTabOverride('pro')} />

        {tab === 'pro' && <>
        {/* Header Super Admin */}
        <div style={{ background:"linear-gradient(135deg,#1d4ed8,#4f46e5)", borderRadius:16, padding:"22px 28px", marginBottom:36, display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:40 }}>👑</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, color:"white", fontSize:18 }}>Espace Super Administrateur</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", marginTop:4 }}>
              {GESTION_SERVICES.length} services avec Gestion Interne complète · {totalReal} établissement{totalReal !== 1 ? "s" : ""} enregistré{totalReal !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"10px 18px", textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:800, color:"white" }}>{totalReal}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)" }}>actifs</div>
          </div>
          <button onClick={() => navigate(-1 as any)} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"1px solid rgba(255,255,255,0.3)", borderRadius:10, padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:600, whiteSpace:"nowrap" }}>← Retour</button>
        </div>

        {/* ── ACTIONS RAPIDES ADMIN ── */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:28 }}>
          <button
            onClick={() => navigate("/admin/retraits")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 20px", background:"white", border:"2px solid #059669", borderRadius:14, cursor:"pointer", fontWeight:700, color:"#059669", fontSize:14, boxShadow:"0 2px 8px rgba(5,150,105,0.12)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ecfdf5"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "white"; }}
          >
            <span style={{ fontSize:22 }}>💳</span>
            <div style={{ textAlign:"left" }}>
              <div>Retraits cliniques</div>
              <div style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>Approuver / refuser les demandes</div>
            </div>
          </button>
          <button
            onClick={() => navigate("/admin")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 20px", background:"white", border:"2px solid #6366f1", borderRadius:14, cursor:"pointer", fontWeight:700, color:"#6366f1", fontSize:14, boxShadow:"0 2px 8px rgba(99,102,241,0.12)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#eef2ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "white"; }}
          >
            <span style={{ fontSize:22 }}>🛡️</span>
            <div style={{ textAlign:"left" }}>
              <div>Tableau de bord</div>
              <div style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>Modération et paramètres</div>
            </div>
          </button>
        </div>

        {/* ── SECTION 1 : Gestion Interne ── */}
        <div style={{ marginBottom:40 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:4, height:24, background:"#1a8f1a", borderRadius:2 }} />
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:"#0f172a" }}>Professionnel — {GESTION_SERVICES.length} espaces de référence</h2>
          </div>
          <p style={{ margin:"0 0 20px 14px", fontSize:13, color:"#64748b" }}>
            Chaque espace vous appartient exclusivement. C'est exactement ce que voit un établissement client après abonnement (3 000 000 GNF — à vie).
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:18 }}>
            {GESTION_SERVICES.map((svc, i) => {
              const realList = tenantsByType[svc.type] || [];
              const vitrinePath = ADMIN_SERVICES.find(a => a.type === svc.type)?.vitrinePath || "";
              return (
                <div key={svc.type} style={{ borderRadius:16, overflow:"hidden", boxShadow:"0 3px 14px rgba(0,0,0,0.09)", border:`1px solid ${svc.border}`, animation:`fadeIn 0.2s ease ${i * 0.07}s both` }}>
                  {/* Header gradient */}
                  <div style={{ background:svc.gradient, padding:"18px 20px", display:"flex", alignItems:"center", gap:14 }}>
                    <span style={{ fontSize:38 }}>{svc.emoji}</span>
                    <div style={{ color:"white" }}>
                      <div style={{ fontWeight:800, fontSize:15 }}>{svc.label} Référence Admin</div>
                      <div style={{ fontSize:11, opacity:0.8, marginTop:3 }}>Code : {svc.demoCode} · Accès exclusif G7</div>
                    </div>
                  </div>
                  {/* Features */}
                  <div style={{ background:svc.bgLight, padding:"10px 20px", fontSize:12, color:svc.textColor, borderBottom:`1px solid ${svc.border}`, fontWeight:500 }}>
                    {svc.features}
                  </div>
                  {/* Body */}
                  <div style={{ background:"white", padding:"16px 20px" }}>
                    {realList.length > 0 && (
                      <div style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>
                        <strong style={{ color:svc.btn }}>{realList.length}</strong> établissement{realList.length > 1 ? "s" : ""} inscrit{realList.length > 1 ? "s" : ""}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8 }}>
                      <button
                        onClick={() => navigate(`/${svc.path}/${svc.demoCode}`)}
                        style={{ flex:1, padding:"11px 0", background:svc.btn, color:"white", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = svc.btnH; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = svc.btn; }}
                      >
                        Ouvrir l'espace {svc.label.split("/")[0].trim().toLowerCase()} →
                      </button>
                      {vitrinePath && (
                        <button
                          onClick={() => navigate(`/${vitrinePath}/${svc.demoCode}`)}
                          style={{ padding:"11px 14px", background:"white", color:svc.btn, border:`1.5px solid ${svc.btn}`, borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap" }}
                          title="Voir le site public vitrine"
                        >
                          🌐
                        </button>
                      )}
                    </div>
                    {realList.length > 0 && (
                      <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:5 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>Établissements réels</div>
                        {realList.slice(0, 3).map((t: any) => (
                          <button key={t.tenant_code} onClick={() => navigate(`/${svc.path}/${t.tenant_code}`)}
                            style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:svc.bgLight, border:`1px solid ${svc.border}`, borderRadius:8, cursor:"pointer", fontSize:12, textAlign:"left" }}
                          >
                            <span style={{ fontWeight:600, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>
                            <span style={{ color:svc.btn, fontWeight:700, flexShrink:0, marginLeft:8 }}>›</span>
                          </button>
                        ))}
                        {realList.length > 3 && <div style={{ fontSize:11, color:"#94a3b8", textAlign:"center" }}>+{realList.length - 3} autre{realList.length - 3 > 1 ? "s" : ""}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* ── SECTION 3 : Tous les établissements réels ── */}
        {totalReal > 0 && (
          <>
            <div style={{ borderTop:"2px solid #f1f5f9", paddingTop:28, marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#0f172a" }}>Tous les établissements ({totalReal})</h2>
              <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Liste complète des comptes actifs sur la plateforme</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {realTenants.map((t: any, i: number) => {
                const info = getTypeInfo(t.type);
                return (
                  <div key={t.tenant_code} style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden", animation:`fadeIn 0.15s ease ${i * 0.03}s both` }}>
                    <button onClick={() => navigate(`/${info.path}/${t.tenant_code}`)}
                      style={{ display:"flex", alignItems:"center", gap:14, width:"100%", textAlign:"left", padding:"13px 16px", cursor:"pointer", background:"transparent", border:"none" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div style={{ width:38, height:38, borderRadius:8, background:info.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{info.emoji}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, color:"#0f172a", fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</div>
                        <div style={{ display:"flex", gap:6, marginTop:2 }}>
                          <span style={{ padding:"1px 8px", background:info.bg, color:info.color, borderRadius:20, fontSize:11, fontWeight:600 }}>{info.label}</span>
                          {t.tenant_code && <span style={{ fontFamily:"monospace", fontSize:11, color:"#94a3b8" }}>{t.tenant_code}</span>}
                          {t.owner_numero_h && <span style={{ fontFamily:"monospace", fontSize:10, background:"#f1f5f9", color:"#64748b", padding:"1px 6px", borderRadius:4 }}>{t.owner_numero_h}</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                        {info.vitrinePath && (
                          <span onClick={e => { e.stopPropagation(); navigate(`/${info.vitrinePath}/${t.tenant_code}`); }}
                            style={{ padding:"4px 10px", background:"#f0fdf0", color:"#1a8f1a", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", border:"1px solid #bbf7bb" }}>
                            🌐 Vitrine
                          </span>
                        )}
                        <div style={{ color:info.color, fontSize:13, fontWeight:700 }}>Ouvrir ›</div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
        </>}
      </div>
      {tab === 'activite' && <Activite embedded />}
      </>
    );
  }

  // ── Vue utilisateur non-admin ──────────────────────────────────────────────
  const filtered = accounts.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.tenant_code?.toLowerCase().includes(search.toLowerCase())
  );

  const sansAcces = accounts.length > 0 && accesGI && !accesGI.aAcces;

  // Bouton "Espace Pro" unique, adapté à la situation de l'utilisateur
  let espacePro: { emoji: string; titre: string; desc: string; label: string; onClick: () => void };
  if (accounts.length === 0) {
    espacePro = {
      emoji: "💼",
      titre: "Espace Pro",
      desc: "Inscrivez-vous comme professionnel pour ouvrir votre espace de gestion.",
      label: "Créer un compte pro",
      onClick: () => navigate("/inscription-pro"),
    };
  } else if (sansAcces) {
    espacePro = {
      emoji: "🔒",
      titre: "Espace Pro",
      desc: "Votre essai gratuit est terminé. Débloquez l'accès pour ouvrir votre espace.",
      label: "Débloquer mon Espace Pro",
      onClick: () => setShowPaywall(v => !v),
    };
  } else if (accounts.length === 1) {
    espacePro = {
      emoji: "📊",
      titre: "Espace Pro",
      desc: accounts[0].name || "",
      label: "Ouvrir mon Espace Pro",
      onClick: () => ouvrirGestion(accounts[0]),
    };
  } else {
    espacePro = {
      emoji: "📊",
      titre: "Espace Pro",
      desc: `${accounts.length} établissements`,
      label: "Mes espaces pro",
      onClick: () => document.getElementById("mes-espaces-pro-liste")?.scrollIntoView({ behavior: "smooth" }),
    };
  }

  return (
    <div>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"16px 20px 0" }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Bouton retour */}
        <button
          onClick={() => navigate(-1 as any)}
          style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:14, fontWeight:600, padding:"0 0 14px 0", marginBottom:2 }}
        >
          ← Retour
        </button>

        {/* Séparateur visuel avant les onglets */}
        <div style={{ borderTop:"1.5px solid #e2e8f0", marginBottom:16 }} />

        <TabButtons
          proLabel={accounts.length === 0 ? "Créer un compte pro" : "Espace Pro"}
          onProClick={() => accounts.length === 0 ? navigate("/inscription-pro") : setTabOverride('pro')}
        />

        {tab === 'pro' && <>
        {/* Bandeau Espace Pro adaptatif */}
        <div style={{ background:"linear-gradient(135deg,#1a8f1a,#156315)", borderRadius:14, padding:"18px 22px", marginBottom:12, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:32 }}>{espacePro.emoji}</div>
            <div>
              <div style={{ color:"white", fontWeight:800, fontSize:16 }}>{espacePro.titre}</div>
              <div style={{ color:"rgba(255,255,255,0.85)", fontSize:13, marginTop:2 }}>{espacePro.desc}</div>
            </div>
          </div>
          <button onClick={espacePro.onClick} style={{ padding:"10px 18px", background:"white", color:"#156315", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:800, whiteSpace:"nowrap" }}>
            {espacePro.label}
          </button>
        </div>

        {showPaywall && sansAcces && <OffreVie />}

        <BandeauAcces />

        {accounts.length > 1 && (
          <div id="mes-espaces-pro-liste" style={{ marginBottom:16 }}>
            <h2 style={{ margin:"0 0 10px", fontSize:15, fontWeight:800, color:"#0f172a" }}>Mes espaces de gestion</h2>

            {accounts.length > 4 && (
              <div style={{ position:"relative", marginBottom:12 }}>
                <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"9px 12px 9px 34px", fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filtered.map((a: any, i: number) => {
                const info = getTypeInfo(a.type);
                return (
                  <div key={a.tenant_code || a.id} style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", animation:`fadeIn 0.2s ease ${i * 0.05}s both`, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
                    <button onClick={() => ouvrirGestion(a)}
                      style={{ display:"flex", alignItems:"center", gap:16, width:"100%", textAlign:"left", padding:"16px 20px", cursor:"pointer", background:"transparent", border:"none", transition:"background 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div style={{ width:44, height:44, borderRadius:10, background:info.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{info.emoji}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, color:"#0f172a", fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3, flexWrap:"wrap" }}>
                          <span style={{ padding:"1px 8px", background:info.bg, color:info.color, borderRadius:20, fontSize:11, fontWeight:600 }}>{info.label}</span>
                          {a.subscriptionStatus !== "active" && (
                            <span style={{ padding:"1px 8px", background:"#fffbeb", color:"#b45309", borderRadius:20, fontSize:11, fontWeight:600 }}>⚠️ Abonnement requis</span>
                          )}
                          {a.tenant_code && <span style={{ fontFamily:"monospace", fontSize:11, color:"#94a3b8" }}>{a.tenant_code}</span>}
                        </div>
                      </div>
                      <div style={{ color:info.color, fontSize:13, fontWeight:600, flexShrink:0 }}>Gérer ›</div>
                    </button>
                    {/* Pied de carte : vitrine + connecter un client */}
                    <div style={{ borderTop:"1px solid #f1f5f9", padding:"8px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, background:"#fafbfc", flexWrap:"wrap" }}>
                      {info.vitrinePath ? (
                        <button onClick={() => navigate(`/${info.vitrinePath}/${a.tenant_code}`)}
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:info.color, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                          🌐 Voir le site client
                        </button>
                      ) : <span />}
                      <button onClick={() => setConnectModal({ accountId: a.id, name: a.name })}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:"#f0fdf4", color:"#166534", border:"1.5px solid #bbf7d0", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                        🤝 Connecter un client
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </>}
      </div>

      {tab === 'activite' && <Activite embedded />}

      {connectModal && (
        <AddPersonModal
          title={`Connecter un client — ${connectModal.name}`}
          onSelect={async (numeroH) => {
            try {
              const r = await fetch(`/api/professionals/${connectModal.accountId}/connect-client`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientNumeroH: numeroH })
              });
              const d = await r.json();
              alert(d.message || (d.success ? 'Client connecté avec succès !' : 'Erreur lors de la connexion.'));
            } catch { alert('Erreur de connexion au serveur.'); }
            setConnectModal(null);
          }}
          onClose={() => setConnectModal(null)}
          myNumeroH={currentUser?.numeroH}
          myPrenom={currentUser?.prenom}
          myNom={currentUser?.nomFamille}
        />
      )}
    </div>
  );
}
