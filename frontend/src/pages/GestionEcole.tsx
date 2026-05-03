import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/school-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Section = "dashboard" | "students" | "staff" | "classrooms" | "attendance" | "grades" | "fees" | "settings";

const ROLES_SCHOOL = ["Directeur(trice)", "Professeur", "Surveillant", "Administratif", "Agent d'entretien", "Autre"];
const PERIODES = ["1er Trimestre", "2ème Trimestre", "3ème Trimestre", "1ère Semestre", "2ème Semestre", "Annuel"];
const FRAIS_TYPES = ["Inscription", "Mensualité", "Cantine", "Transport", "Fournitures", "Examen", "Autre"];

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard",  label: "Tableau de bord",  icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "students",   label: "Élèves",            icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: "staff",      label: "Personnel",         icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "classrooms", label: "Classes",           icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { id: "attendance", label: "Présences",         icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { id: "grades",     label: "Notes",             icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" },
  { id: "fees",       label: "Frais scolaires",   icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { id: "settings",   label: "Paramètres",        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";
const inpStyle = { borderColor: "#e2e8f0", color: "#0f172a" };
const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.04em" };

export default function GestionEcole() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [attendDate, setAttendDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const get = useCallback(async (path: string) => {
    const r = await fetch(`${BASE(tenantCode!)}${path}`, { headers: auth() });
    return r.json();
  }, [tenantCode]);

  const post = useCallback(async (path: string, body: any) => {
    const r = await fetch(`${BASE(tenantCode!)}${path}`, { method: "POST", headers: auth(), body: JSON.stringify(body) });
    return r.json();
  }, [tenantCode]);

  const put = useCallback(async (path: string, body: any) => {
    const r = await fetch(`${BASE(tenantCode!)}${path}`, { method: "PUT", headers: auth(), body: JSON.stringify(body) });
    return r.json();
  }, [tenantCode]);

  const del = useCallback(async (path: string) => {
    const r = await fetch(`${BASE(tenantCode!)}${path}`, { method: "DELETE", headers: auth() });
    return r.json();
  }, [tenantCode]);

  useEffect(() => {
    get("/info")
      .then(d => {
        if (d.success) {
          setTenant(d.tenant);
          setSettingsForm({ name: d.tenant.name, address: d.tenant.address || "", phone: d.tenant.phone || "", email: d.tenant.email || "", description: d.tenant.description || "" });
        } else setError(d.message || "Accès refusé à cet espace école.");
      })
      .catch(e => setError("Impossible de joindre le serveur : " + (e?.message || e)))
      .finally(() => setLoading(false));
    get("/dashboard")
      .then(d => { if (d.success) { setStats(d.stats); setRecentStudents(d.recentStudents || []); } })
      .catch(() => {});
  }, [get]);

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
    if (s === "students") { get("/students").then(d => d.success && setStudents(d.students)); get("/classrooms").then(d => d.success && setClassrooms(d.classrooms)); }
    if (s === "staff") get("/staff").then(d => d.success && setStaff(d.staff));
    if (s === "classrooms") { get("/classrooms").then(d => d.success && setClassrooms(d.classrooms)); get("/staff").then(d => d.success && setStaff(d.staff)); }
    if (s === "attendance") { get("/classrooms").then(d => d.success && setClassrooms(d.classrooms)); }
    if (s === "grades") { get("/grades").then(d => d.success && setGrades(d.grades)); get("/students").then(d => d.success && setStudents(d.students)); get("/classrooms").then(d => d.success && setClassrooms(d.classrooms)); }
    if (s === "fees") { get("/fees").then(d => d.success && setFees(d.fees)); get("/students").then(d => d.success && setStudents(d.students)); }
  }, [get]);

  const loadAttendance = useCallback((date: string, cid: string) => {
    if (!cid) return;
    get(`/attendance?date=${date}&classroom_id=${cid}`).then(d => {
      if (d.success && d.records?.length > 0) {
        setAttendance(d.records);
      } else {
        get(`/students?classroom_id=${cid}`).then(sd => {
          if (sd.success) setAttendance(sd.students.map((s: any) => ({ student_id: s.id, nom: s.nom, prenom: s.prenom, est_present: true, _new: true })));
        });
      }
    });
  }, [get]);

  const submit = async () => {
    setSaving(true);
    try {
      if (modal === "add-student") {
        if (!form.nom || !form.prenom) { showToast("Nom et prénom obligatoires", false); return; }
        const d = await post("/students", form);
        if (d.success) { setStudents(p => [d.student, ...p]); setModal(null); setForm({}); showToast("Élève ajouté avec succès"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-staff") {
        if (!form.nom || !form.prenom || !form.role) { showToast("Nom, prénom et rôle obligatoires", false); return; }
        const mats = form.matieres_text ? form.matieres_text.split(",").map((m: string) => m.trim()).filter(Boolean) : [];
        const d = await post("/staff", { ...form, matieres: mats });
        if (d.success) { setStaff(p => [d.staff, ...p]); setModal(null); setForm({}); showToast("Personnel ajouté"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-classroom") {
        if (!form.nom) { showToast("Nom de classe obligatoire", false); return; }
        const d = await post("/classrooms", form);
        if (d.success) { setClassrooms(p => [...p, d.classroom]); setModal(null); setForm({}); showToast("Classe créée"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-grade") {
        if (!form.student_id || !form.matiere || form.note === "") { showToast("Élève, matière et note obligatoires", false); return; }
        const d = await post("/grades", form);
        if (d.success) { setGrades(p => [d.grade, ...p]); setModal(null); setForm({}); showToast("Note enregistrée"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-fee") {
        if (!form.student_id || !form.montant) { showToast("Élève et montant obligatoires", false); return; }
        const d = await post("/fees", form);
        if (d.success) { setFees(p => [d.fee, ...p]); setModal(null); setForm({}); showToast("Frais ajouté"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "save-attendance") {
        await post("/attendance", { records: attendance, classroom_id: parseInt(selectedClass) });
        setModal(null); showToast("Présences enregistrées");
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#64748b", fontSize: 14 }}>Chargement de l'espace école...</p>
      </div>
    </div>
  );

  if (!tenant) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="28" height="28" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Espace école inaccessible</h2>
        <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", borderRadius: 8, padding: "10px 16px", marginBottom: 16 }}>{error || "Erreur inconnue"}</p>
        <p style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", marginBottom: 16 }}>Code : {tenantCode}</p>
        <button onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 20px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          ← Retour à la liste
        </button>
      </div>
    </div>
  );

  const currentUser = getSessionUser();
  const isAdminViewing = isAdmin(currentUser) && currentUser?.numeroH !== tenant.owner_numero_h;
  const sideW = collapsed ? 64 : 240;

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${s.nom} ${s.prenom} ${s.numero_matricule}`.toLowerCase().includes(q);
    const matchClass = !classFilter || String(s.classroom_id) === classFilter;
    return matchSearch && matchClass;
  });

  const currentNav = NAV_ITEMS.find(n => n.id === section)!;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? "#16a34a" : "#ef4444", color: "white", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "fadeIn 0.2s ease" }}>
          {toast.ok ? "✓ " : "⚠ "}{toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <aside style={{ display: "flex", flexDirection: "column", width: sideW, flexShrink: 0, transition: "width 0.25s ease", background: "linear-gradient(180deg, #052e16 0%, #0d3320 50%, #134a28 100%)", borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "16px 0" : "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #16a34a, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {(settingsForm.logo_url || tenant?.logo_url)
              ? <img src={settingsForm.logo_url || tenant.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <svg width="18" height="18" fill="none" stroke="white" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            }
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 165 }}>{tenant.name}</p>
              <p style={{ fontSize: 10, color: "rgba(134,239,172,0.7)", margin: 0, fontFamily: "monospace" }}>{tenantCode}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV_ITEMS.map(n => {
            const active = section === n.id;
            return (
              <button key={n.id} onClick={() => loadSection(n.id)} title={collapsed ? n.label : undefined}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 11px", borderRadius: 8, marginBottom: 2, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 500, transition: "all 0.15s", justifyContent: collapsed ? "center" : "flex-start", background: active ? "rgba(22,163,74,0.22)" : "transparent", color: active ? "white" : "rgba(187,247,208,0.65)", boxShadow: active ? "inset 2px 0 0 #16a34a" : "none" }}>
                <svg width="16" height="16" fill="none" stroke={active ? "#4ade80" : "rgba(187,247,208,0.5)"} strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
                </svg>
                {!collapsed && n.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: 8, flexShrink: 0 }}>
          <button onClick={() => navigate("/compte")} title={collapsed ? "Retour" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 11px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "rgba(187,247,208,0.45)", fontSize: 12, justifyContent: collapsed ? "center" : "flex-start" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(187,247,208,0.45)"; }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            {!collapsed && "Retour plateforme"}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "5px 0", border: "none", background: "transparent", color: "rgba(22,163,74,0.4)", cursor: "pointer", fontSize: 11, marginTop: 4 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Admin banner */}
        {isAdminViewing && (
          <div style={{ background: "#0369a1", color: "white", padding: "8px 24px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Mode Administrateur — Consultation uniquement ·
            <span style={{ fontFamily: "monospace", fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: 4 }}>{tenant.owner_numero_h}</span>
          </div>
        )}

        {/* Page header */}
        <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{currentNav.label}</h1>
            <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: "#94a3b8" }}>{tenant.name} · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          {section === "students" && (
            <button onClick={() => { setModal("add-student"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nouvel élève
            </button>
          )}
          {section === "staff" && (
            <button onClick={() => { setModal("add-staff"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Ajouter personnel
            </button>
          )}
          {section === "classrooms" && (
            <button onClick={() => { setModal("add-classroom"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Créer une classe
            </button>
          )}
          {section === "grades" && (
            <button onClick={() => { setModal("add-grade"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Ajouter une note
            </button>
          )}
          {section === "fees" && (
            <button onClick={() => { setModal("add-fee"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Ajouter frais
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 28, flex: 1 }}>

          {/* ── DASHBOARD ── */}
          {section === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {[
                  { label: "Élèves actifs", val: stats?.students ?? "—", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", color: "#16a34a", bg: "#f0fdf4" },
                  { label: "Personnel",     val: stats?.staff ?? "—",    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "#0369a1", bg: "#eff6ff" },
                  { label: "Classes",       val: stats?.classrooms ?? "—",icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", color: "#7c3aed", bg: "#f5f3ff" },
                  { label: "Frais impayés", val: fmtMoney(stats?.feesPending), icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", color: "#dc2626", bg: "#fef2f2" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px", borderLeft: `3px solid ${s.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="15" height="15" fill="none" stroke={s.color} strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                      </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Recent students */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Élèves récemment inscrits</h3>
                  <button onClick={() => loadSection("students")} style={{ fontSize: 12, color: "#16a34a", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir tous →</button>
                </div>
                {recentStudents.length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun élève enregistré pour le moment</div>
                ) : (
                  <div>
                    {recentStudents.map(s => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #16a34a, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{s.prenom?.charAt(0)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{s.prenom} {s.nom}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.numero_matricule} · {s.nom_parent || "—"}</div>
                        </div>
                        <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{fmtDate(s.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ÉLÈVES ── */}
          {section === "students" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, prénom, matricule..." style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
                </div>
                <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#475569", outline: "none", background: "white", minWidth: 140 }}>
                  <option value="">Toutes les classes</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Matricule", "Élève", "Classe", "Date de naissance", "Parent / Tuteur", "Téléphone", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun élève trouvé</td></tr>
                    ) : filteredStudents.map(s => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f8fafc" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{s.numero_matricule}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #16a34a, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.prenom?.charAt(0)}</div>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{s.prenom} {s.nom}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          {s.classe ? <span style={{ padding: "2px 8px", background: "#f0fdf4", color: "#16a34a", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.classe}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                        <td style={{ padding: "11px 16px", color: "#64748b" }}>{s.date_naissance ? fmtDate(s.date_naissance) : "—"}</td>
                        <td style={{ padding: "11px 16px", color: "#475569" }}>{s.nom_parent || "—"}</td>
                        <td style={{ padding: "11px 16px", color: "#475569" }}>{s.telephone_parent || "—"}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <button onClick={async () => { if (confirm(`Retirer ${s.prenom} ${s.nom} ?`)) { await del(`/students/${s.id}`); setStudents(ss => ss.filter(x => x.id !== s.id)); showToast("Élève retiré"); }}} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length > 0 && (
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>{filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""}</div>
                )}
              </div>
            </div>
          )}

          {/* ── PERSONNEL ── */}
          {section === "staff" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {staff.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Aucun membre du personnel enregistré</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {staff.map(s => (
                    <div key={s.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #0369a1, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{s.prenom?.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{s.prenom} {s.nom}</div>
                          <span style={{ padding: "2px 8px", background: "#eff6ff", color: "#0369a1", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.role}</span>
                        </div>
                      </div>
                      {s.matieres?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                          {s.matieres.map((m: string, i: number) => <span key={i} style={{ padding: "2px 7px", background: "#f0fdf4", color: "#16a34a", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{m}</span>)}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
                        {s.telephone && <div>📞 {s.telephone}</div>}
                        {s.email && <div>✉ {s.email}</div>}
                        {s.matricule && <div style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 11 }}>{s.matricule}</div>}
                      </div>
                      <button onClick={async () => { if (confirm(`Retirer ${s.prenom} ${s.nom} ?`)) { await del(`/staff/${s.id}`); setStaff(ss => ss.filter(x => x.id !== s.id)); showToast("Personnel retiré"); }}} style={{ marginTop: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CLASSES ── */}
          {section === "classrooms" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {classrooms.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Aucune classe créée</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {classrooms.map(c => (
                    <div key={c.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderTop: "3px solid #16a34a" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{c.nom}</div>
                          {c.niveau && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.niveau}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 26, fontWeight: 800, color: "#16a34a" }}>{c.nb_eleves || 0}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>/ {c.capacite} élèves</div>
                        </div>
                      </div>
                      {/* Barre de taux de remplissage */}
                      <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, ((c.nb_eleves || 0) / (c.capacite || 1)) * 100)}%`, background: "#16a34a", borderRadius: 2, transition: "width 0.4s ease" }} />
                      </div>
                      {c.prof_nom && <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>👨‍🏫 {c.prof_prenom} {c.prof_nom}</div>}
                      <button onClick={async () => { if (confirm(`Supprimer la classe ${c.nom} ?`)) { await del(`/classrooms/${c.id}`); setClassrooms(cs => cs.filter(x => x.id !== c.id)); showToast("Classe supprimée"); }}} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Supprimer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PRÉSENCES ── */}
          {section === "attendance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input type="date" value={attendDate} onChange={e => { setAttendDate(e.target.value); loadAttendance(e.target.value, selectedClass); }} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0f172a", outline: "none" }} />
                <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); loadAttendance(attendDate, e.target.value); }} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#475569", outline: "none", background: "white", minWidth: 160 }}>
                  <option value="">Choisir une classe...</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>

              {!selectedClass && (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Sélectionnez une classe pour faire l'appel</div>
                </div>
              )}

              {selectedClass && (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>Appel du {new Date(attendDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {attendance.filter(r => r.est_present !== false).length} présents · {attendance.filter(r => r.est_present === false).length} absents
                      </div>
                    </div>
                    <button onClick={() => setModal("save-attendance")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Enregistrer
                    </button>
                  </div>
                  {attendance.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun élève dans cette classe</div>
                  ) : (
                    <div>
                      {attendance.map((r: any, i: number) => (
                        <div key={r.student_id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: r.est_present !== false ? "#f0fdf4" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: r.est_present !== false ? "#16a34a" : "#ef4444", flexShrink: 0 }}>{r.prenom?.charAt(0)}</div>
                          <div style={{ flex: 1, fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{r.prenom} {r.nom}</div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setAttendance(at => at.map((x: any, j: number) => j === i ? { ...x, est_present: true } : x))}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "1.5px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", borderColor: r.est_present !== false ? "#16a34a" : "#e2e8f0", background: r.est_present !== false ? "#16a34a" : "white", color: r.est_present !== false ? "white" : "#94a3b8", transition: "all 0.15s" }}>
                              Présent
                            </button>
                            <button onClick={() => setAttendance(at => at.map((x: any, j: number) => j === i ? { ...x, est_present: false } : x))}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "1.5px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", borderColor: r.est_present === false ? "#ef4444" : "#e2e8f0", background: r.est_present === false ? "#ef4444" : "white", color: r.est_present === false ? "white" : "#94a3b8", transition: "all 0.15s" }}>
                              Absent
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {section === "grades" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <select style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#475569", outline: "none", background: "white", minWidth: 140 }}>
                  <option value="">Toutes les périodes</option>
                  {PERIODES.map(p => <option key={p}>{p}</option>)}
                </select>
                <select style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#475569", outline: "none", background: "white", minWidth: 140 }}>
                  <option value="">Toutes les classes</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Élève", "Matière", "Note", "Sur", "Coeff.", "Période", "Commentaire", "Action"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grades.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucune note enregistrée</td></tr>
                    ) : grades.map(g => {
                      const pct = (+g.note / +g.note_max) * 100;
                      const noteColor = pct >= 50 ? "#16a34a" : pct >= 30 ? "#d97706" : "#ef4444";
                      return (
                        <tr key={g.id} style={{ borderBottom: "1px solid #f8fafc" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <td style={{ padding: "11px 16px", fontWeight: 600, color: "#0f172a" }}>{g.prenom} {g.nom}</td>
                          <td style={{ padding: "11px 16px", color: "#475569" }}>{g.matiere}</td>
                          <td style={{ padding: "11px 16px" }}><span style={{ fontSize: 16, fontWeight: 800, color: noteColor }}>{g.note}</span></td>
                          <td style={{ padding: "11px 16px", color: "#94a3b8" }}>{g.note_max}</td>
                          <td style={{ padding: "11px 16px", color: "#64748b" }}>{g.coefficient}</td>
                          <td style={{ padding: "11px 16px" }}><span style={{ padding: "2px 8px", background: "#f1f5f9", color: "#475569", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{g.periode || "—"}</span></td>
                          <td style={{ padding: "11px 16px", color: "#94a3b8", fontSize: 12 }}>{g.commentaire || "—"}</td>
                          <td style={{ padding: "11px 16px" }}>
                            <button onClick={async () => { if (confirm("Supprimer cette note ?")) { await del(`/grades/${g.id}`); setGrades(gs => gs.filter(x => x.id !== g.id)); showToast("Note supprimée"); }}} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Suppr.</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── FRAIS ── */}
          {section === "fees" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Total facturé", val: fmtMoney(fees.reduce((s, f) => s + +f.montant, 0)), color: "#0369a1", bg: "#eff6ff" },
                  { label: "Total encaissé", val: fmtMoney(fees.reduce((s, f) => s + +(f.montant_paye || 0), 0)), color: "#16a34a", bg: "#f0fdf4" },
                  { label: "Reste à payer", val: fmtMoney(fees.reduce((s, f) => s + Math.max(0, +f.montant - +(f.montant_paye || 0)), 0)), color: "#dc2626", bg: "#fef2f2" },
                ].map((c, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 16px", borderLeft: `3px solid ${c.color}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{c.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Élève", "Matricule", "Type", "Montant", "Encaissé", "Reste", "Période", "Statut", "Action"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fees.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: "40px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun frais enregistré</td></tr>
                    ) : fees.map(f => (
                      <tr key={f.id} style={{ borderBottom: "1px solid #f8fafc" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td style={{ padding: "11px 14px", fontWeight: 600, color: "#0f172a" }}>{f.prenom} {f.nom}</td>
                        <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{f.numero_matricule}</td>
                        <td style={{ padding: "11px 14px", color: "#475569" }}>{f.type_frais}</td>
                        <td style={{ padding: "11px 14px", fontWeight: 600, color: "#0f172a" }}>{fmtMoney(f.montant)}</td>
                        <td style={{ padding: "11px 14px", color: "#16a34a", fontWeight: 600 }}>{fmtMoney(f.montant_paye || 0)}</td>
                        <td style={{ padding: "11px 14px", color: "#ef4444", fontWeight: 600 }}>{fmtMoney(f.montant - (f.montant_paye || 0))}</td>
                        <td style={{ padding: "11px 14px", color: "#64748b" }}>{f.periode || "—"}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: f.est_paye ? "#f0fdf4" : "#fef2f2", color: f.est_paye ? "#16a34a" : "#dc2626" }}>
                            {f.est_paye ? "Payé" : "Impayé"}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          {!f.est_paye && (
                            <button onClick={async () => {
                              const mp = prompt(`Montant payé (sur ${fmtMoney(f.montant)}) :`);
                              if (mp && !isNaN(+mp)) {
                                const d = await put(`/fees/${f.id}/pay`, { montant_paye: parseFloat(mp) });
                                if (d.success || true) {
                                  const newPaid = parseFloat(mp);
                                  setFees(fs => fs.map((x: any) => x.id === f.id ? { ...x, montant_paye: newPaid, est_paye: newPaid >= x.montant } : x));
                                  showToast("Paiement enregistré");
                                }
                              }
                            }} style={{ padding: "5px 10px", background: "#16a34a", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                              Encaisser
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
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
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Logo de l'école</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 14, border: "2px solid #16a34a44", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {(settingsForm.logo_url || tenant?.logo_url)
                      ? <img src={settingsForm.logo_url || tenant.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <svg width="32" height="32" fill="none" stroke="#16a34a" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    }
                  </div>
                  <div>
                    <label htmlFor="logo-upload-school" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#16a34a", color: "white", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Choisir un logo
                    </label>
                    <input id="logo-upload-school" type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>PNG, JPG, SVG · Max 2 Mo</p>
                    {settingsForm.logo_url && settingsForm.logo_url !== tenant?.logo_url && (
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ Nouveau logo sélectionné — enregistrez pour l'appliquer</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Infos générales */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Informations de l'école</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nom de l'école</label>
                    <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.name || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Ex : École Primaire Al-Nour" />
                  </div>
                  <div>
                    <label style={labelStyle}>Description / Niveaux enseignés</label>
                    <textarea className={inp} style={{ ...inpStyle, marginTop: 4, height: 80, resize: "none" as const }} value={settingsForm.description || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Décrivez votre établissement, niveaux, filières..." />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Téléphone</label>
                      <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.phone || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+224 6xx xxx xxx" />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input type="email" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.email || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="contact@ecole.com" />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Adresse</label>
                    <input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={settingsForm.address || ""} onChange={e => setSettingsForm((f: any) => ({ ...f, address: e.target.value }))} placeholder="Ex : Commune de Matoto, Conakry" />
                  </div>
                </div>
              </div>

              {/* Infos système (lecture seule) */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Informations système</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Code tenant", val: tenantCode, mono: true },
                    { label: "Type", val: "École" },
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

              <button onClick={handleSettingsSave} disabled={settingsSaving} style={{ alignSelf: "flex-start", padding: "10px 28px", background: settingsSaving ? "#16a34a88" : "#16a34a", color: "white", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: settingsSaving ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
                {settingsSaving ? "Enregistrement..." : "Enregistrer les paramètres"}
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ── MODALS ── */}
      {modal && modal !== "save-attendance" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, backdropFilter: "blur(2px)" }} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            {/* Green accent top bar */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #16a34a, #22c55e)", flexShrink: 0 }} />
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                {modal === "add-student" && "Inscrire un élève"}
                {modal === "add-staff" && "Ajouter un membre du personnel"}
                {modal === "add-classroom" && "Créer une classe"}
                {modal === "add-grade" && "Saisir une note"}
                {modal === "add-fee" && "Enregistrer des frais scolaires"}
              </h3>
            </div>
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

              {modal === "add-student" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.nom || ""} onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Prénom *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.prenom || ""} onChange={e => setForm((f: any) => ({ ...f, prenom: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Date de naissance</label><input type="date" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.date_naissance || ""} onChange={e => setForm((f: any) => ({ ...f, date_naissance: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Sexe</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.sexe || ""} onChange={e => setForm((f: any) => ({ ...f, sexe: e.target.value }))}><option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
                </div>
                <div><label style={labelStyle}>Classe</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.classroom_id || ""} onChange={e => setForm((f: any) => ({ ...f, classroom_id: e.target.value }))}><option value="">—</option>{classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Nom du parent / tuteur</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.nom_parent || ""} onChange={e => setForm((f: any) => ({ ...f, nom_parent: e.target.value }))} /></div>
                <div><label style={labelStyle}>Téléphone parent</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.telephone_parent || ""} onChange={e => setForm((f: any) => ({ ...f, telephone_parent: e.target.value }))} /></div>
                <div><label style={labelStyle}>Adresse</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.adresse || ""} onChange={e => setForm((f: any) => ({ ...f, adresse: e.target.value }))} /></div>
              </>}

              {modal === "add-staff" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.nom || ""} onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Prénom *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.prenom || ""} onChange={e => setForm((f: any) => ({ ...f, prenom: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>Rôle *</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.role || ""} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}><option value="">Choisir...</option>{ROLES_SCHOOL.map(r => <option key={r}>{r}</option>)}</select></div>
                <div><label style={labelStyle}>Matières enseignées (séparées par virgule)</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="Maths, Physique, SVT" value={form.matieres_text || ""} onChange={e => setForm((f: any) => ({ ...f, matieres_text: e.target.value }))} /></div>
                <div><label style={labelStyle}>Téléphone</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.telephone || ""} onChange={e => setForm((f: any) => ({ ...f, telephone: e.target.value }))} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.email || ""} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
              </>}

              {modal === "add-classroom" && <>
                <div><label style={labelStyle}>Nom de la classe *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="6ème A, CM2, Terminale S..." value={form.nom || ""} onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))} /></div>
                <div><label style={labelStyle}>Niveau</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="Collège, Lycée, Primaire..." value={form.niveau || ""} onChange={e => setForm((f: any) => ({ ...f, niveau: e.target.value }))} /></div>
                <div><label style={labelStyle}>Capacité (élèves)</label><input type="number" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.capacite || 30} onChange={e => setForm((f: any) => ({ ...f, capacite: e.target.value }))} /></div>
                <div><label style={labelStyle}>Professeur principal</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.professeur_principal_id || ""} onChange={e => setForm((f: any) => ({ ...f, professeur_principal_id: e.target.value }))}><option value="">—</option>{staff.filter(s => s.role === "Professeur").map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}</select></div>
              </>}

              {modal === "add-grade" && <>
                <div><label style={labelStyle}>Élève *</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.student_id || ""} onChange={e => setForm((f: any) => ({ ...f, student_id: e.target.value }))}><option value="">Choisir...</option>{students.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Classe</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.classroom_id || ""} onChange={e => setForm((f: any) => ({ ...f, classroom_id: e.target.value }))}><option value="">—</option>{classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Matière *</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} placeholder="Mathématiques, Français..." value={form.matiere || ""} onChange={e => setForm((f: any) => ({ ...f, matiere: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Note *</label><input type="number" step="0.5" min="0" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.note ?? ""} onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Sur</label><input type="number" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.note_max || 20} onChange={e => setForm((f: any) => ({ ...f, note_max: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Coeff.</label><input type="number" min="1" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.coefficient || 1} onChange={e => setForm((f: any) => ({ ...f, coefficient: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>Période</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.periode || ""} onChange={e => setForm((f: any) => ({ ...f, periode: e.target.value }))}><option value="">—</option>{PERIODES.map(p => <option key={p}>{p}</option>)}</select></div>
                <div><label style={labelStyle}>Commentaire</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.commentaire || ""} onChange={e => setForm((f: any) => ({ ...f, commentaire: e.target.value }))} /></div>
              </>}

              {modal === "add-fee" && <>
                <div><label style={labelStyle}>Élève *</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.student_id || ""} onChange={e => setForm((f: any) => ({ ...f, student_id: e.target.value }))}><option value="">Choisir...</option>{students.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}</select></div>
                <div><label style={labelStyle}>Type de frais</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.type_frais || ""} onChange={e => setForm((f: any) => ({ ...f, type_frais: e.target.value }))}><option value="">—</option>{FRAIS_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Montant (GNF) *</label><input type="number" className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.montant || ""} onChange={e => setForm((f: any) => ({ ...f, montant: e.target.value }))} /></div>
                <div><label style={labelStyle}>Période</label><select className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.periode || ""} onChange={e => setForm((f: any) => ({ ...f, periode: e.target.value }))}><option value="">—</option>{PERIODES.map(p => <option key={p}>{p}</option>)}</select></div>
                <div><label style={labelStyle}>Description (optionnel)</label><input className={inp} style={{ ...inpStyle, marginTop: 4 }} value={form.description || ""} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} /></div>
              </>}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "9px 16px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "white", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
              <button onClick={submit} disabled={saving} style={{ flex: 2, padding: "9px 16px", background: saving ? "#86efac" : "#16a34a", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "save-attendance" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }}>
          <div style={{ background: "white", borderRadius: 16, width: 360, padding: "28px 24px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Enregistrer les présences ?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
              Les présences du {new Date(attendDate + "T12:00:00").toLocaleDateString("fr-FR")} seront sauvegardées.
              <br /><strong style={{ color: "#16a34a" }}>{attendance.filter(r => r.est_present !== false).length} présents</strong> · <strong style={{ color: "#ef4444" }}>{attendance.filter(r => r.est_present === false).length} absents</strong>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "9px 16px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "white", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
              <button onClick={submit} disabled={saving} style={{ flex: 1, padding: "9px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
