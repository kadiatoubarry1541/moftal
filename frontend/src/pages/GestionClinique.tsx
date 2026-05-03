import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/clinic-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Section = "dashboard" | "patients" | "staff" | "appointments" | "prescriptions" | "records" | "payments" | "factures" | "settings";

const SERVICES = ["Médecine générale", "Chirurgie", "Maternité", "Pédiatrie", "Ophtalmologie", "Gynécologie", "Urgences", "Radiologie", "Autre"];
const ROLES_CLINIC = ["Admin", "Médecin", "Spécialiste", "Infirmier(e)", "Sage-femme", "Laborantin", "Radiologue", "Secrétaire", "Comptable", "Autre"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const PAYMENT_MODES = ["especes", "orange_money", "mobile_money", "virement", "cheque"];
const PAYMENT_LABELS: Record<string, string> = { especes: "Espèces", orange_money: "Orange Money", mobile_money: "Mobile Money", virement: "Virement", cheque: "Chèque" };

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  "Admin":        { bg: "#eff6ff", color: "#1d4ed8" },
  "Médecin":      { bg: "#f0fdfa", color: "#0f766e" },
  "Spécialiste":  { bg: "#f0fdfa", color: "#0f766e" },
  "Infirmier(e)": { bg: "#fdf4ff", color: "#7e22ce" },
  "Sage-femme":   { bg: "#fdf4ff", color: "#7e22ce" },
  "Laborantin":   { bg: "#fff7ed", color: "#c2410c" },
  "Radiologue":   { bg: "#fff7ed", color: "#c2410c" },
  "Secrétaire":   { bg: "#f1f5f9", color: "#334155" },
  "Comptable":    { bg: "#f0fdf4", color: "#166534" },
  "Autre":        { bg: "#f1f5f9", color: "#475569" },
};

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }
function calcTotal(lignes: any[], remise: number) {
  const st = (lignes || []).reduce((s: number, l: any) => s + (+l.prix_unitaire || 0) * (+l.quantite || 1), 0);
  return Math.max(0, st - (remise || 0));
}

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard",     label: "Tableau de bord",  icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "patients",      label: "Patients",          icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "staff",         label: "Personnel",         icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "appointments",  label: "Rendez-vous",       icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "prescriptions", label: "Ordonnances",       icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "records",       label: "Dossiers médicaux", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { id: "payments",      label: "Paiements",         icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { id: "factures",      label: "Factures",          icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
  { id: "settings",      label: "Paramètres",        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";
const inpStyle = { borderColor: "#e2e8f0", color: "#0f172a" };
const labelStyle = { fontSize: 11, fontWeight: 600 as const, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.04em" };
const TEAL = "#0d9488";
const TEAL_LIGHT = "#14b8a6";
const TEAL_DARK = "#0f766e";

// ── PRINT FUNCTIONS ──────────────────────────────────────────────────────────

function printPrescription(p: any, clinicName: string) {
  const meds: any[] = Array.isArray(p.medicaments) ? p.medicaments : [];
  const date = p.date_prescription || p.created_at;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Ordonnance ${p.numero_ordo}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:40px;background:white}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d9488;padding-bottom:20px;margin-bottom:24px}.clinic-title{font-size:22px;font-weight:700;color:#0d9488}.ordo-num{background:#f0fdfa;border:1px solid #99f6e4;padding:5px 14px;border-radius:20px;font-family:monospace;font-size:13px;color:#0f766e}.s-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;margin-top:20px}.pat-box{background:#f8fafc;border-radius:8px;padding:14px;border-left:4px solid #0d9488}.pat-name{font-size:17px;font-weight:700}.diag{background:#fffbeb;border-radius:6px;padding:12px;border-left:3px solid #fbbf24;font-size:13px;color:#475569}.med-item{display:flex;align-items:center;padding:9px 14px;background:#f8fafc;border-radius:6px;margin-bottom:7px;border-left:3px solid #0d9488;font-size:13px}.footer{margin-top:60px;display:flex;justify-content:flex-end}.sig{width:200px;border-top:1px dashed #cbd5e1;padding-top:8px;font-size:12px;color:#64748b;text-align:center}@media print{@page{margin:20px}}</style></head><body>
<div class="header"><div><div class="clinic-title">✚ ${clinicName}</div><div style="font-size:12px;color:#64748b;margin-top:4px">Espace médical · Soins &amp; Consultations</div></div><div style="text-align:right"><div class="ordo-num">N° ${p.numero_ordo}</div><div style="font-size:12px;color:#64748b;margin-top:6px">Le ${new Date(date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</div></div></div>
<div class="s-label" style="margin-top:0">Patient</div><div class="pat-box"><div class="pat-name">${p.p_prenom||""} ${p.p_nom||""}</div></div>
${p.diagnostic?`<div class="s-label">Diagnostic</div><div class="diag">${p.diagnostic}</div>`:""}
<div class="s-label">Médicaments prescrits</div>
${meds.length===0?'<p style="color:#94a3b8;font-size:13px">Aucun médicament</p>':meds.map((m:any)=>`<div class="med-item">◆ &nbsp;${m.medicament||m}</div>`).join("")}
${p.notes?`<div class="s-label">Notes</div><p style="font-size:12px;color:#64748b;font-style:italic">${p.notes}</p>`:""}
<div class="footer"><div class="sig">Dr. ${p.s_nom?`${p.s_prenom||""} ${p.s_nom}`:"..."}<br>Médecin prescripteur</div></div>
<div style="font-size:10px;color:#e2e8f0;text-align:center;margin-top:40px">Les Enfants d'Adam · Plateforme de santé</div>
</body></html>`;
  const w = window.open("", "_blank", "width=800,height=900");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
}

function printInvoice(f: any, clinicName: string) {
  const lignes: any[] = Array.isArray(f.lignes) ? f.lignes : [];
  const isPaid = f.statut === "paye";
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${f.numero_facture}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:40px;background:white}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}.clinic-title{font-size:22px;font-weight:700;color:#0d9488}table{width:100%;border-collapse:collapse;margin:20px 0}thead tr{background:#0d9488;color:white}th{padding:10px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}tbody tr:nth-child(even){background:#f8fafc}td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f1f5f9}.tr-total{background:#f0fdfa!important;font-weight:700}.pat-box{background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:20px}.badge{display:inline-block;padding:5px 14px;border-radius:20px;font-weight:700;font-size:12px;background:${isPaid?"#f0fdf4":"#fffbeb"};color:${isPaid?"#16a34a":"#d97706"}}@media print{@page{margin:20px}}</style>
</head><body>
<div class="header"><div><div class="clinic-title">✚ ${clinicName}</div><div style="font-size:12px;color:#64748b;margin-top:4px">Espace médical · Facturation</div></div><div style="text-align:right"><div style="font-size:18px;font-weight:700;color:#0f172a">FACTURE</div><div style="font-family:monospace;font-size:15px;color:#0f766e;margin:4px 0">${f.numero_facture}</div><div style="font-size:12px;color:#64748b">Le ${new Date(f.date_facture||f.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</div><div style="margin-top:8px"><span class="badge">${isPaid?"✓ Payé":"⏳ En attente"}</span></div></div></div>
<div class="pat-box"><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Facturé à</div><div style="font-size:17px;font-weight:700">${f.p_prenom||""} ${f.p_nom||"Patient anonyme"}</div>${f.s_nom?`<div style="font-size:12px;color:#64748b;margin-top:2px">Médecin : Dr. ${f.s_prenom||""} ${f.s_nom}</div>`:""}</div>
<table><thead><tr><th style="width:50%">Description</th><th style="text-align:center">Qté</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Sous-total</th></tr></thead><tbody>
${lignes.map((l:any)=>`<tr><td>${l.description}</td><td style="text-align:center">${l.quantite}</td><td style="text-align:right">${(+l.prix_unitaire||0).toLocaleString("fr-FR")} GNF</td><td style="text-align:right;font-weight:600">${((+l.prix_unitaire||0)*(+l.quantite||1)).toLocaleString("fr-FR")} GNF</td></tr>`).join("")}
${+f.remise>0?`<tr><td colspan="3" style="text-align:right;color:#64748b">Remise</td><td style="text-align:right;color:#ef4444">- ${(+f.remise).toLocaleString("fr-FR")} GNF</td></tr>`:""}
<tr class="tr-total"><td colspan="3" style="text-align:right;font-size:14px">TOTAL</td><td style="text-align:right;font-size:18px;color:#0d9488">${(+f.total||0).toLocaleString("fr-FR")} GNF</td></tr></tbody></table>
${f.mode_paiement&&isPaid?`<p style="font-size:12px;color:#64748b;margin-top:8px">Mode de paiement : <strong>${PAYMENT_LABELS[f.mode_paiement]||f.mode_paiement}</strong></p>`:""}
${f.notes?`<p style="font-size:12px;color:#64748b;margin-top:8px;font-style:italic">Notes : ${f.notes}</p>`:""}
<div style="margin-top:60px;display:flex;justify-content:flex-end"><div style="width:200px;border-top:1px dashed #cbd5e1;padding-top:8px;text-align:center;font-size:12px;color:#64748b">Signature &amp; Cachet</div></div>
<div style="font-size:10px;color:#e2e8f0;text-align:center;margin-top:40px">Les Enfants d'Adam · Plateforme de santé</div>
</body></html>`;
  const w = window.open("", "_blank", "width=800,height=900");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
}

// ── COMPONENT ────────────────────────────────────────────────────────────────

export default function GestionClinique() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    navigate("/login-membre", { state: { from: `/gestion-clinique/${tenantCode}` } });
  }, [navigate, tenantCode]);

  const get = useCallback(async (path: string) => {
    const r = await fetch(`${BASE(tenantCode!)}${path}`, { headers: auth() });
    if (r.status === 401) { handleUnauthorized(); return { success: false }; }
    return r.json();
  }, [tenantCode, handleUnauthorized]);

  const post = useCallback(async (path: string, body: any) => {
    const r = await fetch(`${BASE(tenantCode!)}${path}`, { method: "POST", headers: auth(), body: JSON.stringify(body) });
    if (r.status === 401) { handleUnauthorized(); return { success: false }; }
    return r.json();
  }, [tenantCode, handleUnauthorized]);

  const put = useCallback(async (path: string, body: any) => {
    const r = await fetch(`${BASE(tenantCode!)}${path}`, { method: "PUT", headers: auth(), body: JSON.stringify(body) });
    if (r.status === 401) { handleUnauthorized(); return { success: false }; }
    return r.json();
  }, [tenantCode, handleUnauthorized]);

  const del = useCallback(async (path: string) => {
    const r = await fetch(`${BASE(tenantCode!)}${path}`, { method: "DELETE", headers: auth() });
    if (r.status === 401) { handleUnauthorized(); return { success: false }; }
    return r.json();
  }, [tenantCode, handleUnauthorized]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login-membre", { state: { from: `/gestion-clinique/${tenantCode}` } });
      return;
    }
    get("/info")
      .then(d => {
        if (d.success) {
          setTenant(d.tenant);
          setSettingsForm({ name: d.tenant.name, address: d.tenant.address || "", phone: d.tenant.phone || "", email: d.tenant.email || "", description: d.tenant.description || "" });
        } else if (d.success === false) setError(d.message || "Accès refusé.");
      })
      .catch(e => setError("Impossible de joindre le serveur : " + (e?.message || e)))
      .finally(() => setLoading(false));
    get("/dashboard")
      .then(d => { if (d.success) { setStats(d.stats); setRecentPatients(d.recentPatients || []); } })
      .catch(() => {});
  }, [get, navigate, tenantCode]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("Logo trop volumineux (max 2 Mo)", false); return; }
    const reader = new FileReader();
    reader.onload = () => setSettingsForm((f: any) => ({ ...f, logo_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSettingsSave = async () => {
    setSettingsSaving(true);
    try {
      const r = await fetch(`${BASE(tenantCode!)}/settings`, { method: "PUT", headers: auth(), body: JSON.stringify(settingsForm) });
      const d = await r.json();
      if (d.success) { setTenant(d.tenant); showToast("Paramètres enregistrés"); }
      else showToast(d.message || "Erreur", false);
    } catch { showToast("Erreur de connexion", false); }
    finally { setSettingsSaving(false); }
  };

  const loadSection = useCallback((s: Section) => {
    setSection(s);
    setSearch("");
    if (s === "patients") get("/patients").then(d => d.success && setPatients(d.patients));
    if (s === "staff") get("/staff").then(d => d.success && setStaff(d.staff));
    if (s === "appointments") {
      get("/appointments").then(d => d.success && setAppointments(d.appointments));
      get("/patients").then(d => d.success && setPatients(d.patients));
      get("/staff").then(d => d.success && setStaff(d.staff));
    }
    if (s === "prescriptions") {
      get("/prescriptions").then(d => d.success && setPrescriptions(d.prescriptions));
      get("/patients").then(d => d.success && setPatients(d.patients));
      get("/staff").then(d => d.success && setStaff(d.staff));
    }
    if (s === "records") {
      get("/records").then(d => d.success && setRecords(d.records));
      get("/patients").then(d => d.success && setPatients(d.patients));
      get("/staff").then(d => d.success && setStaff(d.staff));
    }
    if (s === "payments") {
      get("/payments").then(d => d.success && setPayments(d.payments));
      get("/patients").then(d => d.success && setPatients(d.patients));
    }
    if (s === "factures") {
      get("/invoices").then(d => d.success && setInvoices(d.invoices));
      get("/patients").then(d => d.success && setPatients(d.patients));
      get("/staff").then(d => d.success && setStaff(d.staff));
    }
  }, [get]);

  // Invoice line helpers
  const addLine = () => setForm((f: any) => ({ ...f, lignes: [...(f.lignes || []), { description: "", quantite: 1, prix_unitaire: 0 }] }));
  const removeLine = (i: number) => setForm((f: any) => ({ ...f, lignes: (f.lignes || []).filter((_: any, idx: number) => idx !== i) }));
  const updateLine = (i: number, field: string, val: any) => setForm((f: any) => {
    const lignes = [...(f.lignes || [])];
    lignes[i] = { ...lignes[i], [field]: val };
    return { ...f, lignes };
  });

  const submit = async () => {
    setSaving(true);
    try {
      if (modal === "add-patient") {
        if (!form.nom || !form.prenom) { showToast("Nom et prénom obligatoires", false); return; }
        const d = await post("/patients", form);
        if (d.success) { setPatients(p => [d.patient, ...p]); setModal(null); setForm({}); showToast("Patient ajouté"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-staff") {
        if (!form.nom || !form.prenom || !form.role) { showToast("Nom, prénom et rôle obligatoires", false); return; }
        const d = await post("/staff", form);
        if (d.success) { setStaff(p => [d.staff, ...p]); setModal(null); setForm({}); showToast("Personnel ajouté"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-appointment") {
        if (!form.patient_id || !form.date_rdv) { showToast("Patient et date obligatoires", false); return; }
        const d = await post("/appointments", form);
        if (d.success) { setAppointments(p => [d.appointment, ...p]); setModal(null); setForm({}); showToast("Rendez-vous créé"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-prescription") {
        if (!form.patient_id) { showToast("Patient obligatoire", false); return; }
        const meds = form.medicaments_text ? form.medicaments_text.split("\n").filter(Boolean).map((m: string) => ({ medicament: m.trim() })) : [];
        const d = await post("/prescriptions", { ...form, medicaments: meds });
        if (d.success) { setPrescriptions(p => [d.prescription, ...p]); setModal(null); setForm({}); showToast("Ordonnance créée"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-record") {
        if (!form.patient_id) { showToast("Patient obligatoire", false); return; }
        const d = await post("/records", form);
        if (d.success) {
          setRecords(p => [d.record, ...p]);
          setModal(null);
          setForm({});
          showToast("Consultation enregistrée");
        } else showToast(d.message || "Erreur", false);
      } else if (modal === "add-payment") {
        if (!form.montant) { showToast("Montant obligatoire", false); return; }
        const d = await post("/payments", form);
        if (d.success) { setPayments(p => [d.payment, ...p]); setModal(null); setForm({}); showToast("Paiement enregistré"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-invoice") {
        if (!(form.lignes || []).length) { showToast("Ajoutez au moins une ligne", false); return; }
        const lignes = form.lignes || [];
        const sous_total = lignes.reduce((s: number, l: any) => s + (+l.prix_unitaire || 0) * (+l.quantite || 1), 0);
        const remise = +form.remise || 0;
        const total = Math.max(0, sous_total - remise);
        const d = await post("/invoices", { ...form, sous_total, remise, total });
        if (d.success) { setInvoices(p => [d.invoice, ...p]); setModal(null); setForm({}); showToast("Facture créée"); }
        else showToast(d.message || "Erreur", false);
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#64748b", fontSize: 14 }}>Chargement de l'espace clinique...</p>
      </div>
    </div>
  );

  if (!tenant) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="28" height="28" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Espace clinique inaccessible</h2>
        <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", borderRadius: 8, padding: "10px 16px", marginBottom: 16 }}>{error || "Erreur inconnue"}</p>
        <p style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", marginBottom: 16 }}>Code : {tenantCode}</p>
        <button onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 20px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Retour à la liste</button>
      </div>
    </div>
  );

  const currentUser = getSessionUser();
  const isAdminViewing = isAdmin(currentUser) && currentUser?.numeroH !== tenant.owner_numero_h;
  const sideW = collapsed ? 64 : 240;
  const filteredPatients = patients.filter(p => !search || `${p.nom} ${p.prenom} ${p.numero_matricule}`.toLowerCase().includes(search.toLowerCase()));
  const currentNav = NAV_ITEMS.find(n => n.id === section)!;

  const BtnAdd = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? TEAL : "#ef4444", color: "white", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "fadeIn 0.2s ease" }}>
          {toast.ok ? "✓ " : "⚠ "}{toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <aside style={{ display: "flex", flexDirection: "column", width: sideW, flexShrink: 0, transition: "width 0.25s ease", background: "linear-gradient(180deg,#042f2e 0%,#0d3d3c 50%,#134d4b 100%)", borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "16px 0" : "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {(settingsForm.logo_url || tenant?.logo_url)
              ? <img src={settingsForm.logo_url || tenant.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <svg width="18" height="18" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            }
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 165 }}>{tenant.name}</p>
              <p style={{ fontSize: 10, color: "rgba(153,246,228,0.7)", margin: 0, fontFamily: "monospace" }}>{tenantCode}</p>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV_ITEMS.map(n => {
            const active = section === n.id;
            const isUrgent = n.id === "appointments" && stats?.urgences > 0;
            return (
              <button key={n.id} onClick={() => loadSection(n.id)} title={collapsed ? n.label : undefined}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 11px", borderRadius: 8, marginBottom: 2, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 500, transition: "all 0.15s", justifyContent: collapsed ? "center" : "flex-start", background: active ? "rgba(13,148,136,0.22)" : "transparent", color: active ? "white" : "rgba(153,246,228,0.65)", boxShadow: active ? `inset 2px 0 0 ${TEAL}` : "none" }}>
                <svg width="16" height="16" fill="none" stroke={active ? TEAL_LIGHT : "rgba(153,246,228,0.5)"} strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
                </svg>
                {!collapsed && <span style={{ flex: 1 }}>{n.label}</span>}
                {!collapsed && isUrgent && <span style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{stats.urgences}</span>}
              </button>
            );
          })}
        </nav>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: 8, flexShrink: 0 }}>
          <button onClick={() => navigate("/compte")} title={collapsed ? "Retour" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 11px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "rgba(153,246,228,0.45)", fontSize: 12, justifyContent: collapsed ? "center" : "flex-start" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(153,246,228,0.45)"; }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            {!collapsed && "Retour plateforme"}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "5px 0", border: "none", background: "transparent", color: "rgba(13,148,136,0.4)", cursor: "pointer", marginTop: 4 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {isAdminViewing && (
          <div style={{ background: "#0369a1", color: "white", padding: "8px 24px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Mode Administrateur · <span style={{ fontFamily: "monospace", fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: 4 }}>{tenant.owner_numero_h}</span>
          </div>
        )}

        {/* Header */}
        <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{currentNav.label}</h1>
            <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: "#94a3b8" }}>{tenant.name} · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => navigate("/wallet-pro")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "linear-gradient(135deg,#0d9488,#0891b2)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
              title="Mon Wallet Professionnel Moftal Pay"
            >
              💰 Wallet Pro
            </button>
            {section === "patients"      && <BtnAdd label="Nouveau patient"    onClick={() => { setModal("add-patient"); setForm({}); }} />}
            {section === "staff"         && <BtnAdd label="Ajouter personnel"  onClick={() => { setModal("add-staff"); setForm({}); }} />}
            {section === "appointments"  && <BtnAdd label="Nouveau RDV"        onClick={() => { setModal("add-appointment"); setForm({}); }} />}
            {section === "prescriptions" && <BtnAdd label="Créer ordonnance"   onClick={() => { setModal("add-prescription"); setForm({}); }} />}
            {section === "records"       && <BtnAdd label="Nouvelle consultation" onClick={() => { setModal("add-record"); setForm({}); }} />}
            {section === "payments"      && <BtnAdd label="Encaisser paiement" onClick={() => { setModal("add-payment"); setForm({}); }} />}
            {section === "factures"      && <BtnAdd label="Nouvelle facture"   onClick={() => { setModal("add-invoice"); setForm({ lignes: [{ description: "", quantite: 1, prix_unitaire: 0 }], statut: "impaye", mode_paiement: "especes" }); }} />}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 28, flex: 1 }}>

          {/* ── DASHBOARD ── */}
          {section === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Urgences banner */}
              {stats?.urgences > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10 }} onClick={() => loadSection("appointments")} role="button" style={{ cursor: "pointer", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#991b1b", fontSize: 14 }}>🚨 {stats.urgences} urgence{stats.urgences > 1 ? "s" : ""} en attente</div>
                    <div style={{ fontSize: 12, color: "#b91c1c" }}>Cliquez pour voir les rendez-vous urgents</div>
                  </div>
                </div>
              )}

              {/* Stats grid - row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {[
                  { label: "Patients total",     val: stats?.patients ?? "—",           color: TEAL,      bg: "#f0fdfa", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                  { label: "Patients aujourd'hui",val: stats?.patientsToday ?? "—",      color: "#0369a1", bg: "#eff6ff", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
                  { label: "Personnel actif",    val: stats?.staff ?? "—",              color: "#7c3aed", bg: "#f5f3ff", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px", borderLeft: `3px solid ${s.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="13" height="13" fill="none" stroke={s.color} strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Stats grid - row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {[
                  { label: "RDV aujourd'hui",   val: stats?.appointmentsToday ?? "—",  color: "#d97706", bg: "#fffbeb", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                  { label: "RDV en attente",    val: stats?.appointmentsPending ?? "—",color: "#6366f1", bg: "#eef2ff", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                  { label: "Urgences actives",  val: stats?.urgences ?? "—",           color: "#ef4444", bg: "#fef2f2", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px", borderLeft: `3px solid ${s.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="13" height="13" fill="none" stroke={s.color} strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Revenue cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "linear-gradient(135deg,#0f766e,#0d9488)", borderRadius: 12, padding: "18px 20px", color: "white", boxShadow: "0 4px 16px rgba(13,148,136,0.3)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Revenus ce mois</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{fmtMoney(stats?.revenueMonth)}</div>
                </div>
                <div style={{ background: "linear-gradient(135deg,#166534,#16a34a)", borderRadius: 12, padding: "18px 20px", color: "white", boxShadow: "0 4px 16px rgba(22,163,74,0.3)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Revenus aujourd'hui</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{fmtMoney(stats?.revenueToday)}</div>
                </div>
              </div>

              {/* Recent patients */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Patients récemment enregistrés</h3>
                  <button onClick={() => loadSection("patients")} style={{ fontSize: 12, color: TEAL, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir tous →</button>
                </div>
                {recentPatients.length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun patient enregistré pour le moment</div>
                ) : recentPatients.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{p.prenom?.charAt(0)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{p.prenom} {p.nom}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.numero_matricule}{p.telephone ? ` · ${p.telephone}` : ""}</div>
                    </div>
                    {p.groupe_sanguin && <span style={{ padding: "2px 8px", background: "#fef2f2", color: "#ef4444", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.groupe_sanguin}</span>}
                    <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{fmtDate(p.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PATIENTS ── */}
          {section === "patients" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, prénom, matricule..." style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Matricule", "Patient", "Sexe", "Né(e) le", "Gr. sanguin", "Téléphone", "Allergies", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun patient trouvé</td></tr>
                    ) : filteredPatients.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f8fafc" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{p.numero_matricule}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{p.prenom?.charAt(0)}</div>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{p.prenom} {p.nom}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 16px", color: "#64748b" }}>{p.sexe || "—"}</td>
                        <td style={{ padding: "11px 16px", color: "#64748b" }}>{fmtDate(p.date_naissance)}</td>
                        <td style={{ padding: "11px 16px" }}>
                          {p.groupe_sanguin ? <span style={{ padding: "2px 8px", background: "#fef2f2", color: "#ef4444", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.groupe_sanguin}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                        <td style={{ padding: "11px 16px", color: "#475569" }}>{p.telephone || "—"}</td>
                        <td style={{ padding: "11px 16px", color: "#94a3b8", fontSize: 12, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.allergies || "—"}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <button onClick={async () => { if (confirm(`Supprimer le dossier de ${p.prenom} ${p.nom} ?`)) { await del(`/patients/${p.id}`); setPatients(ps => ps.filter(x => x.id !== p.id)); showToast("Patient supprimé"); }}} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Supprimer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPatients.length > 0 && <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>{filteredPatients.length} patient{filteredPatients.length > 1 ? "s" : ""}</div>}
              </div>
            </div>
          )}

          {/* ── PERSONNEL ── */}
          {section === "staff" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {staff.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center", gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Aucun membre du personnel enregistré</div>
                </div>
              ) : staff.map(s => {
                const roleStyle = ROLE_COLORS[s.role] || ROLE_COLORS["Autre"];
                return (
                  <div key={s.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{s.prenom?.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{s.prenom} {s.nom}</div>
                        <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: roleStyle.bg, color: roleStyle.color }}>{s.role}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 2 }}>
                      {s.service    && <div>🏥 {s.service}</div>}
                      {s.specialite && <div>🔬 {s.specialite}</div>}
                      {s.telephone  && <div>📞 {s.telephone}</div>}
                      {s.email      && <div>✉ {s.email}</div>}
                      {s.matricule  && <div style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 11 }}>{s.matricule}</div>}
                    </div>
                    <button onClick={async () => { if (confirm(`Retirer ${s.prenom} ${s.nom} du personnel ?`)) { await del(`/staff/${s.id}`); setStaff(ss => ss.filter(x => x.id !== s.id)); showToast("Personnel retiré"); }}} style={{ marginTop: 14, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px" }}>Retirer</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── RENDEZ-VOUS ── */}
          {section === "appointments" && (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {["Date", "Heure", "Patient", "Médecin", "Service", "Motif", "Statut", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun rendez-vous</td></tr>
                  ) : appointments.map(a => {
                    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
                      confirmed: { bg: "#f0fdf4", color: "#16a34a", label: "Confirmé" },
                      done:      { bg: "#eff6ff", color: "#0369a1", label: "Terminé" },
                      cancelled: { bg: "#fef2f2", color: "#ef4444", label: "Annulé" },
                      pending:   { bg: "#fffbeb", color: "#d97706", label: "En attente" },
                    };
                    const st = statusMap[a.statut] || statusMap.pending;
                    const isUrgent = a.service === "Urgences";
                    return (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f8fafc", background: isUrgent && a.statut === "pending" ? "#fff7f7" : "transparent" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isUrgent && a.statut === "pending" ? "#fff7f7" : "transparent"}>
                        <td style={{ padding: "11px 16px", color: "#475569" }}>{fmtDate(a.date_rdv)}</td>
                        <td style={{ padding: "11px 16px", color: "#64748b" }}>{a.heure || "—"}</td>
                        <td style={{ padding: "11px 16px", fontWeight: 600, color: "#0f172a" }}>{a.p_prenom} {a.p_nom}</td>
                        <td style={{ padding: "11px 16px", color: "#475569" }}>{a.s_prenom ? `${a.s_prenom} ${a.s_nom}` : "—"}</td>
                        <td style={{ padding: "11px 16px" }}>
                          {isUrgent ? <span style={{ padding: "2px 8px", background: "#fef2f2", color: "#ef4444", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>🚨 Urgences</span> : <span style={{ color: "#64748b" }}>{a.service || "—"}</span>}
                        </td>
                        <td style={{ padding: "11px 16px", color: "#64748b", fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.motif || "—"}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {a.statut !== "confirmed" && a.statut !== "done" && (
                              <button onClick={async () => { await put(`/appointments/${a.id}`, { statut: "confirmed" }); setAppointments(as => as.map(x => x.id === a.id ? { ...x, statut: "confirmed" } : x)); showToast("RDV confirmé"); }} style={{ padding: "4px 8px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Confirmer</button>
                            )}
                            {a.statut === "confirmed" && (
                              <button onClick={async () => { await put(`/appointments/${a.id}`, { statut: "done" }); setAppointments(as => as.map(x => x.id === a.id ? { ...x, statut: "done" } : x)); showToast("RDV terminé"); }} style={{ padding: "4px 8px", background: "#eff6ff", color: "#0369a1", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Terminé</button>
                            )}
                            {a.statut !== "cancelled" && a.statut !== "done" && (
                              <button onClick={async () => { await put(`/appointments/${a.id}`, { statut: "cancelled" }); setAppointments(as => as.map(x => x.id === a.id ? { ...x, statut: "cancelled" } : x)); showToast("RDV annulé"); }} style={{ padding: "4px 8px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Annuler</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── ORDONNANCES ── */}
          {section === "prescriptions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {prescriptions.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Aucune ordonnance créée</div>
                </div>
              ) : prescriptions.map(p => (
                <div key={p.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{p.p_prenom} {p.p_nom}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{fmtDate(p.date_prescription || p.created_at)} · Dr. {p.s_nom || "?"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ padding: "3px 10px", background: "#f0fdfa", color: TEAL_DARK, borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "monospace" }}>N° {p.numero_ordo}</span>
                      <button onClick={() => printPrescription(p, tenant.name)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#f0fdfa", color: TEAL_DARK, border: `1px solid #99f6e4`, borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Imprimer
                      </button>
                    </div>
                  </div>
                  {p.diagnostic && <p style={{ fontSize: 13, color: "#475569", marginBottom: 10 }}><strong>Diagnostic :</strong> {p.diagnostic}</p>}
                  {p.medicaments?.length > 0 && (
                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Médicaments</p>
                      {p.medicaments.map((m: any, i: number) => <div key={i} style={{ fontSize: 13, color: "#475569", padding: "2px 0" }}>◆ {m.medicament || m}</div>)}
                    </div>
                  )}
                  {p.notes && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>{p.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ── DOSSIERS MÉDICAUX ── */}
          {section === "records" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {records.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Aucun dossier médical enregistré</div>
                </div>
              ) : records.map(r => (
                <div key={r.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: `3px solid ${TEAL}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{r.p_prenom} {r.p_nom}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{fmtDate(r.date_visite)} · Dr. {r.s_nom || "?"} · {r.type_consultation || "Consultation"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                      {r.poids       && <span style={{ color: "#475569" }}>⚖️ {r.poids} kg</span>}
                      {r.tension     && <span style={{ color: "#475569" }}>🩺 {r.tension}</span>}
                      {r.temperature && <span style={{ color: +r.temperature > 38 ? "#ef4444" : "#475569" }}>🌡️ {r.temperature}°C</span>}
                    </div>
                  </div>
                  {r.diagnostic && <p style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}><strong>Diagnostic :</strong> {r.diagnostic}</p>}
                  {r.traitement && <p style={{ fontSize: 13, color: "#475569" }}><strong>Traitement :</strong> {r.traitement}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ── PAIEMENTS ── */}
          {section === "payments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { label: "Total encaissé",  val: fmtMoney(payments.reduce((s, p) => s + +p.montant, 0)),  color: TEAL,      bg: "#f0fdfa" },
                  { label: "Ce mois",         val: fmtMoney(payments.filter(p => new Date(p.date_paiement).getMonth() === new Date().getMonth()).reduce((s, p) => s + +p.montant, 0)), color: "#0369a1", bg: "#eff6ff" },
                  { label: "Transactions",    val: payments.length,                                         color: "#7c3aed", bg: "#f5f3ff" },
                ].map((c, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 16px", borderLeft: `3px solid ${c.color}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["N° Reçu", "Patient", "Montant", "Motif", "Mode", "Date"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun paiement enregistré</td></tr>
                    ) : payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f8fafc" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{p.recu_numero}</td>
                        <td style={{ padding: "11px 16px", fontWeight: 600, color: "#0f172a" }}>{p.p_prenom} {p.p_nom}</td>
                        <td style={{ padding: "11px 16px", fontWeight: 700, color: TEAL_DARK, fontSize: 14 }}>{fmtMoney(p.montant)}</td>
                        <td style={{ padding: "11px 16px", color: "#475569" }}>{p.motif || "—"}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{ padding: "2px 8px", background: "#f1f5f9", color: "#475569", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{PAYMENT_LABELS[p.mode_paiement] || p.mode_paiement}</span>
                        </td>
                        <td style={{ padding: "11px 16px", color: "#64748b" }}>{fmtDate(p.date_paiement)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── FACTURES ── */}
          {section === "factures" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { label: "Total facturé",    val: fmtMoney(invoices.reduce((s, f) => s + +f.total, 0)),                         color: TEAL,      bg: "#f0fdfa" },
                  { label: "Payées",           val: invoices.filter(f => f.statut === "paye").length,                             color: "#16a34a", bg: "#f0fdf4" },
                  { label: "En attente",       val: invoices.filter(f => f.statut !== "paye").length,                             color: "#d97706", bg: "#fffbeb" },
                ].map((c, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 16px", borderLeft: `3px solid ${c.color}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["N° Facture", "Patient", "Médecin", "Total", "Statut", "Date", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucune facture créée</td></tr>
                    ) : invoices.map(f => {
                      const isPaid = f.statut === "paye";
                      return (
                        <tr key={f.id} style={{ borderBottom: "1px solid #f8fafc" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{f.numero_facture}</td>
                          <td style={{ padding: "11px 16px", fontWeight: 600, color: "#0f172a" }}>{f.p_prenom || ""} {f.p_nom || <span style={{ color: "#94a3b8", fontWeight: 400 }}>Anonyme</span>}</td>
                          <td style={{ padding: "11px 16px", color: "#475569" }}>{f.s_nom ? `Dr. ${f.s_prenom || ""} ${f.s_nom}` : "—"}</td>
                          <td style={{ padding: "11px 16px", fontWeight: 700, color: TEAL_DARK, fontSize: 14 }}>{fmtMoney(f.total)}</td>
                          <td style={{ padding: "11px 16px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: isPaid ? "#f0fdf4" : "#fffbeb", color: isPaid ? "#16a34a" : "#d97706" }}>{isPaid ? "✓ Payée" : "⏳ En attente"}</span>
                          </td>
                          <td style={{ padding: "11px 16px", color: "#64748b" }}>{fmtDate(f.date_facture || f.created_at)}</td>
                          <td style={{ padding: "11px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => printInvoice(f, tenant.name)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#f0fdfa", color: TEAL_DARK, border: "1px solid #99f6e4", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                PDF
                              </button>
                              {!isPaid && (
                                <button onClick={async () => {
                                  const d = await put(`/invoices/${f.id}`, { statut: "paye", mode_paiement: f.mode_paiement || "especes" });
                                  if (d.success) { setInvoices(inv => inv.map(x => x.id === f.id ? { ...x, statut: "paye" } : x)); showToast("Facture marquée payée"); }
                                }} style={{ padding: "4px 10px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                                  Marquer payée
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PARAMÈTRES ── */}
          {section === "settings" && (
            <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Logo */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Logo de la clinique</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 14, border: `2px solid ${TEAL}44`, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {(settingsForm.logo_url || tenant?.logo_url)
                      ? <img src={settingsForm.logo_url || tenant.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <svg width="32" height="32" fill="none" stroke={TEAL} strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    }
                  </div>
                  <div>
                    <label htmlFor="logo-upload-clin" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: TEAL, color: "white", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Choisir un logo
                    </label>
                    <input id="logo-upload-clin" type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>PNG, JPG, SVG · Max 2 Mo</p>
                    {settingsForm.logo_url && settingsForm.logo_url !== tenant?.logo_url && (
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: TEAL, fontWeight: 600 }}>✓ Nouveau logo sélectionné — enregistrez pour l'appliquer</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Infos générales */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Informations de la clinique</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nom de la clinique</label>
                    <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.name || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Ex : Clinique Saint-Gabriel" />
                  </div>
                  <div>
                    <label style={labelStyle}>Description / Spécialités</label>
                    <textarea className={inp} style={{ ...inpStyle, marginTop: 4, height: 80, resize: "none" as const }} value={settingsForm.description || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Décrivez votre clinique, vos services proposés..." />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Téléphone</label>
                      <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.phone || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+224 6xx xxx xxx" />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input type="email" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.email || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="contact@clinique.com" />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Adresse</label>
                    <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.address || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, address: e.target.value }))} placeholder="Ex : Quartier Ratoma, Conakry" />
                  </div>
                </div>
              </div>

              {/* Infos système (lecture seule) */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Informations système</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Code tenant", val: tenantCode, mono: true },
                    { label: "Type", val: "Clinique" },
                    { label: "Propriétaire (NuméroH)", val: tenant?.owner_numero_h, mono: true },
                    { label: "Statut", val: tenant?.is_active ? "Actif" : "Inactif" },
                  ].map(({ label, val, mono }) => (
                    <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, color: "#0f172a", fontFamily: mono ? "monospace" : "inherit", fontWeight: 600 }}>{val || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSettingsSave} disabled={settingsSaving} style={{ alignSelf: "flex-start", padding: "10px 28px", background: settingsSaving ? `${TEAL}88` : TEAL, color: "white", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: settingsSaving ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
                {settingsSaving ? "Enregistrement..." : "Enregistrer les paramètres"}
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ── MODALS ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, backdropFilter: "blur(2px)" }} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: modal === "add-invoice" ? 640 : 500, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ height: 3, background: `linear-gradient(90deg,${TEAL},${TEAL_LIGHT})`, flexShrink: 0 }} />
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                {modal === "add-patient"      && "Enregistrer un patient"}
                {modal === "add-staff"        && "Ajouter un membre du personnel"}
                {modal === "add-appointment"  && "Créer un rendez-vous"}
                {modal === "add-prescription" && "Rédiger une ordonnance"}
                {modal === "add-record"       && "Nouvelle consultation"}
                {modal === "add-payment"      && "Encaisser un paiement"}
                {modal === "add-invoice"      && "Créer une facture"}
              </h3>
            </div>
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

              {modal === "add-patient" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.nom || ""} onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Prénom *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.prenom || ""} onChange={e => setForm((f: any) => ({ ...f, prenom: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Date de naissance</label><input type="date" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.date_naissance || ""} onChange={e => setForm((f: any) => ({ ...f, date_naissance: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Sexe</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.sexe || ""} onChange={e => setForm((f: any) => ({ ...f, sexe: e.target.value }))}><option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
                </div>
                <div><label style={labelStyle}>Téléphone</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.telephone || ""} onChange={e => setForm((f: any) => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={labelStyle}>Adresse</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.adresse || ""} onChange={e => setForm((f: any) => ({ ...f, adresse: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Groupe sanguin</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.groupe_sanguin || ""} onChange={e => setForm((f: any) => ({ ...f, groupe_sanguin: e.target.value }))}><option value="">—</option>{BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}</select></div>
                  <div><label style={labelStyle}>Allergies</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="Pénicilline..." value={form.allergies || ""} onChange={e => setForm((f: any) => ({ ...f, allergies: e.target.value }))} /></div>
                </div>
              </>}

              {modal === "add-staff" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.nom || ""} onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Prénom *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.prenom || ""} onChange={e => setForm((f: any) => ({ ...f, prenom: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>Rôle *</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.role || ""} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}><option value="">Choisir un rôle...</option>{ROLES_CLINIC.map(r => <option key={r}>{r}</option>)}</select></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Service</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.service || ""} onChange={e => setForm((f: any) => ({ ...f, service: e.target.value }))}><option value="">—</option>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></div>
                  <div><label style={labelStyle}>Spécialité</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="Cardiologie..." value={form.specialite || ""} onChange={e => setForm((f: any) => ({ ...f, specialite: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Téléphone</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.telephone || ""} onChange={e => setForm((f: any) => ({ ...f, telephone: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Email</label><input type="email" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.email || ""} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
                </div>
              </>}

              {modal === "add-appointment" && <>
                <div><label style={labelStyle}>Patient *</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.patient_id || ""} onChange={e => setForm((f: any) => ({ ...f, patient_id: e.target.value }))}><option value="">Choisir un patient...</option>{patients.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Médecin</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.staff_id || ""} onChange={e => setForm((f: any) => ({ ...f, staff_id: e.target.value }))}><option value="">—</option>{staff.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.role}</option>)}</select></div>
                <div><label style={labelStyle}>Service</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.service || ""} onChange={e => setForm((f: any) => ({ ...f, service: e.target.value }))}><option value="">—</option>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Date *</label><input type="date" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.date_rdv || ""} onChange={e => setForm((f: any) => ({ ...f, date_rdv: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Heure</label><input type="time" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.heure || ""} onChange={e => setForm((f: any) => ({ ...f, heure: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>Motif</label><textarea className={inp} style={{ ...inpStyle, marginTop: 4, height: 80, resize: "none" as const }} value={form.motif || ""} onChange={e => setForm((f: any) => ({ ...f, motif: e.target.value }))} /></div>
              </>}

              {modal === "add-prescription" && <>
                <div><label style={labelStyle}>Patient *</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.patient_id || ""} onChange={e => setForm((f: any) => ({ ...f, patient_id: e.target.value }))}><option value="">Choisir...</option>{patients.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Médecin prescripteur</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.staff_id || ""} onChange={e => setForm((f: any) => ({ ...f, staff_id: e.target.value }))}><option value="">—</option>{staff.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Diagnostic</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.diagnostic || ""} onChange={e => setForm((f: any) => ({ ...f, diagnostic: e.target.value }))} /></div>
                <div><label style={labelStyle}>Médicaments (1 par ligne)</label><textarea className={inp} style={{ ...inpStyle, marginTop: 4, height: 100, resize: "none" as const }} placeholder={"Paracétamol 500mg — 3x/jour\nAmoxicilline 1g — 2x/jour"} value={form.medicaments_text || ""} onChange={e => setForm((f: any) => ({ ...f, medicaments_text: e.target.value }))} /></div>
                <div><label style={labelStyle}>Notes</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.notes || ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
              </>}

              {modal === "add-record" && <>
                <div><label style={labelStyle}>Patient *</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.patient_id || ""} onChange={e => setForm((f: any) => ({ ...f, patient_id: e.target.value }))}><option value="">Choisir...</option>{patients.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Médecin</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.staff_id || ""} onChange={e => setForm((f: any) => ({ ...f, staff_id: e.target.value }))}><option value="">—</option>{staff.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Type de consultation</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.type_consultation || ""} onChange={e => setForm((f: any) => ({ ...f, type_consultation: e.target.value }))}><option value="">—</option>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div><label style={labelStyle}>Poids (kg)</label><input type="number" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.poids || ""} onChange={e => setForm((f: any) => ({ ...f, poids: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Tension</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="120/80" value={form.tension || ""} onChange={e => setForm((f: any) => ({ ...f, tension: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Temp. (°C)</label><input type="number" step="0.1" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.temperature || ""} onChange={e => setForm((f: any) => ({ ...f, temperature: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>Diagnostic</label><textarea className={inp} style={{ ...inpStyle, marginTop: 4, height: 80, resize: "none" as const }} value={form.diagnostic || ""} onChange={e => setForm((f: any) => ({ ...f, diagnostic: e.target.value }))} /></div>
                <div><label style={labelStyle}>Traitement</label><textarea className={inp} style={{ ...inpStyle, marginTop: 4, height: 80, resize: "none" as const }} value={form.traitement || ""} onChange={e => setForm((f: any) => ({ ...f, traitement: e.target.value }))} /></div>
              </>}

              {modal === "add-payment" && <>
                <div><label style={labelStyle}>Patient</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.patient_id || ""} onChange={e => setForm((f: any) => ({ ...f, patient_id: e.target.value }))}><option value="">—</option>{patients.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Montant (GNF) *</label><input type="number" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.montant || ""} onChange={e => setForm((f: any) => ({ ...f, montant: e.target.value }))} /></div>
                <div><label style={labelStyle}>Motif</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="Consultation, Médicaments..." value={form.motif || ""} onChange={e => setForm((f: any) => ({ ...f, motif: e.target.value }))} /></div>
                <div><label style={labelStyle}>Mode de paiement</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.mode_paiement || "especes"} onChange={e => setForm((f: any) => ({ ...f, mode_paiement: e.target.value }))}>{PAYMENT_MODES.map(m => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}</select></div>
              </>}

              {modal === "add-invoice" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Patient</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.patient_id || ""} onChange={e => setForm((f: any) => ({ ...f, patient_id: e.target.value }))}><option value="">—</option>{patients.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></div>
                  <div><label style={labelStyle}>Médecin</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.staff_id || ""} onChange={e => setForm((f: any) => ({ ...f, staff_id: e.target.value }))}><option value="">—</option>{staff.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.role}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Date facture</label><input type="date" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.date_facture || new Date().toISOString().split("T")[0]} onChange={e => setForm((f: any) => ({ ...f, date_facture: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Statut</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.statut || "impaye"} onChange={e => setForm((f: any) => ({ ...f, statut: e.target.value }))}><option value="impaye">En attente</option><option value="paye">Payée</option></select></div>
                </div>

                <div>
                  <label style={labelStyle}>Lignes de facturation</label>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 2fr 28px", gap: 6, marginBottom: 4 }}>
                      <span style={{ ...labelStyle, fontSize: 10 }}>Description</span>
                      <span style={{ ...labelStyle, fontSize: 10 }}>Qté</span>
                      <span style={{ ...labelStyle, fontSize: 10 }}>Prix (GNF)</span>
                      <span />
                    </div>
                    {(form.lignes || []).map((l: any, i: number) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 2fr 28px", gap: 6, marginBottom: 7 }}>
                        <input value={l.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Ex: Consultation générale" style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#0f172a", outline: "none" }} />
                        <input type="number" min={1} value={l.quantite} onChange={e => updateLine(i, "quantite", +e.target.value || 1)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "#0f172a", outline: "none", textAlign: "center" }} />
                        <input type="number" min={0} value={l.prix_unitaire} onChange={e => updateLine(i, "prix_unitaire", +e.target.value || 0)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#0f172a", outline: "none" }} />
                        <button onClick={() => removeLine(i)} style={{ width: 28, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                    <button onClick={addLine} style={{ padding: "6px 14px", border: "1.5px dashed #cbd5e1", borderRadius: 6, background: "transparent", color: TEAL, cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 4 }}>+ Ajouter une ligne</button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1 }}>
                    <div><label style={labelStyle}>Remise (GNF)</label><input type="number" min={0} className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.remise || 0} onChange={e => setForm((f: any) => ({ ...f, remise: +e.target.value || 0 }))} /></div>
                    <div><label style={labelStyle}>Mode paiement</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.mode_paiement || "especes"} onChange={e => setForm((f: any) => ({ ...f, mode_paiement: e.target.value }))}>{PAYMENT_MODES.map(m => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}</select></div>
                  </div>
                  <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "10px 16px", textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>TOTAL</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: TEAL_DARK, marginTop: 2 }}>{fmtMoney(calcTotal(form.lignes || [], form.remise || 0))}</div>
                  </div>
                </div>
                <div><label style={labelStyle}>Notes</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="Informations complémentaires..." value={form.notes || ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
              </>}

            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "9px 16px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "white", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
              <button onClick={submit} disabled={saving} style={{ flex: 2, padding: "9px 16px", background: saving ? `${TEAL}88` : TEAL, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
