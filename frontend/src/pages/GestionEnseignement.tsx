import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";

interface Props { mode: "school" | "madrasa"; }

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Section = "dashboard" | "apprenants" | "staff" | "groupes" | "presences" | "notes" | "frais" | "bulletins";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const PERIODES = ["Trim 1", "Trim 2", "Trim 3", "Sem 1", "Sem 2", "Annuel"];

const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none";
const inpSt = { borderColor: "#e2e8f0", color: "#0f172a" };
const lbl = { fontSize: 11, fontWeight: 600 as const, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.04em" };

export default function GestionEnseignement({ mode }: Props) {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();

  const isMadrasa = mode === "madrasa";
  const apiName     = isMadrasa ? "madrasa-mgmt" : "school-mgmt";
  const groupEP     = isMadrasa ? "halaqas"      : "classrooms";
  const teacherFld  = isMadrasa ? "enseignant_id" : "professeur_id";

  const V = isMadrasa ? {
    color: "#0891b2", colorDark: "#0e7490",
    emoji: "📖", gradient: "linear-gradient(180deg,#082f49 0%,#0c4a6e 50%,#0e5a80 100%)",
    apprenants: "Apprenants", apprenant: "Apprenant",
    groupes: "Halaqas",  groupe: "Halaqa",
    staffLabel: "Enseignants", staffSingular: "Enseignant",
    niveaux: ["Iqra", "Qa'idah", "Débutant", "Juz' Amma", "Hizb", "Hafiz"],
    matieres: ["Coran", "Tajwid", "Hadith", "Fiqh", "Arabe", "Histoire islamique", "Morale"],
    roles: ["Directeur", "Cheikh", "Enseignant", "Surveillant", "Administratif", "Autre"],
    fraisTypes: ["Inscription", "Frais mensuels", "Frais annuels", "Examen", "Tenue islamique", "Autre"],
    sourate: true,
  } : {
    color: "#16a34a", colorDark: "#15803d",
    emoji: "🏫", gradient: "linear-gradient(180deg,#052e16 0%,#14532d 50%,#166534 100%)",
    apprenants: "Élèves", apprenant: "Élève",
    groupes: "Classes", groupe: "Classe",
    staffLabel: "Personnel", staffSingular: "Professeur",
    niveaux: ["CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "Terminale"],
    matieres: ["Mathématiques", "Français", "Sciences", "Histoire-Géo", "Anglais", "Arts", "EPS", "Autre"],
    roles: ["Directeur(trice)", "Professeur", "Surveillant", "Administratif", "Autre"],
    fraisTypes: ["Inscription", "Mensualité", "Cantine", "Transport", "Fournitures", "Examen", "Autre"],
    sourate: false,
  };

  const NAV: { id: Section; label: string; icon: string }[] = [
    { id: "dashboard",   label: "Tableau de bord",       icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "apprenants",  label: V.apprenants,             icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { id: "staff",       label: V.staffLabel,             icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "groupes",     label: V.groupes,                icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { id: "presences",   label: "Présences",              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { id: "notes",       label: "Notes / Progression",    icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" },
    { id: "frais",       label: "Frais",                  icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
    { id: "bulletins",   label: "Bulletins",              icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  ];

  const [section, setSection]     = useState<Section>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [tenant, setTenant]       = useState<any>(null);
  const [stats, setStats]         = useState<any>(null);
  const [students, setStudents]   = useState<any[]>([]);
  const [staff, setStaff]         = useState<any[]>([]);
  const [groupes, setGroupes]     = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [grades, setGrades]       = useState<any[]>([]);
  const [fees, setFees]           = useState<any[]>([]);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [search, setSearch]       = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [attendDate, setAttendDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [modal, setModal]         = useState<string | null>(null);
  const [form, setForm]           = useState<any>({});
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const get = useCallback(async (path: string) => {
    const r = await fetch(`${API}/api/${apiName}/${tenantCode!}${path}`, { headers: auth() });
    return r.json();
  }, [tenantCode, apiName]);

  const post = useCallback(async (path: string, body: any) => {
    const r = await fetch(`${API}/api/${apiName}/${tenantCode!}${path}`, { method: "POST", headers: auth(), body: JSON.stringify(body) });
    return r.json();
  }, [tenantCode, apiName]);

  const put = useCallback(async (path: string, body: any) => {
    const r = await fetch(`${API}/api/${apiName}/${tenantCode!}${path}`, { method: "PUT", headers: auth(), body: JSON.stringify(body) });
    return r.json();
  }, [tenantCode, apiName]);

  const del = useCallback(async (path: string) => {
    const r = await fetch(`${API}/api/${apiName}/${tenantCode!}${path}`, { method: "DELETE", headers: auth() });
    return r.json();
  }, [tenantCode, apiName]);

  useEffect(() => {
    const user = getSessionUser();
    if (!user) { navigate("/login"); return; }
    Promise.all([get("/info"), get("/dashboard")])
      .then(([info, dash]) => {
        if (!info.tenant) { setError(info.message || "Accès refusé."); return; }
        setTenant(info.tenant);
        setStats(dash);
      })
      .catch(e => setError("Impossible de joindre le serveur : " + (e?.message || e)))
      .finally(() => setLoading(false));
  }, [get]);

  const loadSection = useCallback((s: Section) => {
    setSection(s); setSearch(""); setNiveauFilter("");
    const loadG = () => get(`/${groupEP}`).then(d => setGroupes(d[groupEP] || []));
    if (s === "apprenants")  { get("/students").then(d => d.students && setStudents(d.students)); loadG(); }
    if (s === "staff")       { get("/staff").then(d => d.staff && setStaff(d.staff)); }
    if (s === "groupes")     { loadG(); get("/staff").then(d => d.staff && setStaff(d.staff)); }
    if (s === "presences")   { loadG(); get("/students").then(d => d.students && setStudents(d.students)); }
    if (s === "notes")       { get("/grades").then(d => d.grades && setGrades(d.grades)); get("/students").then(d => d.students && setStudents(d.students)); }
    if (s === "frais")       { get("/fees").then(d => d.fees && setFees(d.fees)); get("/students").then(d => d.students && setStudents(d.students)); }
    if (s === "bulletins")   { if (isMadrasa) get("/bulletins").then(d => d.bulletins && setBulletins(d.bulletins)); }
  }, [get, groupEP, isMadrasa]);

  const loadAttendance = useCallback((date: string, groupId: string) => {
    if (!groupId) return;
    const g = groupes.find(x => String(x.id) === groupId);
    if (!g) return;
    get(`/attendance?date=${date}`).then(d => {
      const existing: any[] = d.attendance || [];
      const gs = students.filter(s => s.niveau === g.niveau && s.is_active !== false);
      setAttendance(gs.map(s => {
        const rec = existing.find(r => r.student_id === s.id);
        return rec ? { student_id: s.id, prenom: s.prenom, nom: s.nom, statut: rec.statut }
                   : { student_id: s.id, prenom: s.prenom, nom: s.nom, statut: "present" };
      }));
    });
  }, [get, groupes, students]);

  const submit = async () => {
    setSaving(true);
    try {
      if (modal === "add-apprenant") {
        if (!form.nom || !form.prenom) { showToast("Nom et prénom obligatoires", false); return; }
        const d = await post("/students", { ...form, niveau: form.niveau || V.niveaux[0] });
        if (d.student) { setStudents(p => [d.student, ...p]); setModal(null); setForm({}); showToast(V.apprenant + " ajouté(e)"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-staff") {
        if (!form.nom || !form.prenom) { showToast("Nom et prénom obligatoires", false); return; }
        const d = await post("/staff", { ...form, role: form.role || V.roles[1] });
        if (d.staff) { setStaff(p => [d.staff, ...p]); setModal(null); setForm({}); showToast(V.staffSingular + " ajouté(e)"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-groupe") {
        if (!form.nom) { showToast("Nom obligatoire", false); return; }
        const body: any = { nom: form.nom, niveau: form.niveau || V.niveaux[0], capacite: +(form.capacite || 20) };
        if (form.enseignant_id) body[teacherFld] = form.enseignant_id;
        const d = await post(`/${groupEP}`, body);
        const created = d[isMadrasa ? "halaqa" : "classroom"];
        if (created) { setGroupes(p => [...p, created]); setModal(null); setForm({}); showToast(V.groupe + " créé(e)"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-note") {
        if (!form.student_id || !form.matiere || form.note === "") { showToast("Apprenant, matière et note obligatoires", false); return; }
        const d = await post("/grades", { ...form, note: parseFloat(form.note), note_max: parseFloat(form.note_max || 20) });
        if (d.grade) { setGrades(p => [d.grade, ...p]); setModal(null); setForm({}); showToast("Note enregistrée"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-frais") {
        if (!form.student_id || !form.montant) { showToast("Apprenant et montant obligatoires", false); return; }
        const d = await post("/fees", { ...form, montant: parseInt(form.montant), type_frais: form.type_frais || V.fraisTypes[1] });
        if (d.fee) { setFees(p => [d.fee, ...p]); setModal(null); setForm({}); showToast("Frais ajouté"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "save-presence") {
        await post("/attendance", { records: attendance.map(r => ({ student_id: r.student_id, statut: r.statut })) });
        setModal(null); showToast("Présences enregistrées");
      } else if (modal === "gen-bulletin") {
        if (!form.periode) { showToast("Période obligatoire", false); return; }
        const d = await post("/bulletins/generate", { periode: form.periode, annee: form.annee || "2025-2026", publish: !!form.publish });
        if (d.success) { showToast(`${d.generated} bulletin(s) généré(s)`); setModal(null); get("/bulletins").then(b => b.bulletins && setBulletins(b.bulletins)); }
        else showToast(d.message || "Erreur", false);
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: `3px solid #e2e8f0`, borderTopColor: V.color, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#64748b", fontSize: 14 }}>Chargement de l'espace {isMadrasa ? "madrasa" : "école"}…</p>
      </div>
    </div>
  );

  if (!tenant) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Espace inaccessible</h2>
        <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", borderRadius: 8, padding: "10px 16px", marginBottom: 16 }}>{error || "Erreur inconnue"}</p>
        <button onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 20px", background: V.color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Retour</button>
      </div>
    </div>
  );

  const currentUser = getSessionUser();
  const isAdminViewing = isAdmin(currentUser) && currentUser?.numeroH !== tenant.owner_numero_h;
  const sideW = collapsed ? 64 : 244;
  const currentNav = NAV.find(n => n.id === section)!;

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    return (!q || `${s.nom} ${s.prenom}`.toLowerCase().includes(q)) && (!niveauFilter || s.niveau === niveauFilter);
  });

  const niveauColor = (n: string) => {
    if (!isMadrasa) return "#16a34a";
    const map: Record<string, string> = { "Iqra": "#0891b2", "Qa'idah": "#0369a1", "Débutant": "#7c3aed", "Juz' Amma": "#059669", "Hizb": "#d97706", "Hafiz": "#dc2626" };
    return map[n] || "#64748b";
  };
  const niveauBg = (n: string) => {
    if (!isMadrasa) return "#f0fdf4";
    const map: Record<string, string> = { "Iqra": "#ecfeff", "Qa'idah": "#eff6ff", "Débutant": "#f5f3ff", "Juz' Amma": "#f0fdf4", "Hizb": "#fffbeb", "Hafiz": "#fef2f2" };
    return map[n] || "#f8fafc";
  };

  // ── Modal ──────────────────────────────────────────────────────────────────
  const MODAL = modal ? (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
      <div style={{ background: "white", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>

        {modal === "add-apprenant" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Nouvel {V.apprenant.toLowerCase()}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(["Prénom *|prenom|text","Nom *|nom|text","Date de naissance|date_naissance|date","Sexe|sexe|sexe","Tél. parent|telephone_parent|text","Niveau|niveau|niveau","NuméroH|numero_h|text","NuméroH parent|parent_numero_h|text"] as string[]).map(raw => {
              const [label, key, type] = raw.split("|");
              return (
                <div key={key}>
                  <label style={{ ...lbl, display: "block", marginBottom: 4 }}>{label}</label>
                  {type === "sexe" ? (
                    <select value={form[key]||"M"} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} className={inp} style={inpSt}>
                      <option value="M">Masculin</option><option value="F">Féminin</option>
                    </select>
                  ) : type === "niveau" ? (
                    <select value={form[key]||V.niveaux[0]} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} className={inp} style={inpSt}>
                      {V.niveaux.map(n=><option key={n}>{n}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={form[key]||""} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} className={inp} style={inpSt} />
                  )}
                </div>
              );
            })}
          </div>
        </>)}

        {modal === "add-staff" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Nouveau {V.staffSingular.toLowerCase()}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(["Prénom *|prenom|text","Nom *|nom|text","Rôle|role|role","Spécialité / Matière|specialite|mat","Téléphone|telephone|text","NuméroH|numero_h|text"] as string[]).map(raw => {
              const [label, key, type] = raw.split("|");
              return (
                <div key={key}>
                  <label style={{ ...lbl, display: "block", marginBottom: 4 }}>{label}</label>
                  {type === "role" ? (
                    <select value={form[key]||V.roles[1]} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} className={inp} style={inpSt}>
                      {V.roles.map(r=><option key={r}>{r}</option>)}
                    </select>
                  ) : type === "mat" ? (
                    <select value={form[key]||V.matieres[0]} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} className={inp} style={inpSt}>
                      {V.matieres.map(m=><option key={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={form[key]||""} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} className={inp} style={inpSt} />
                  )}
                </div>
              );
            })}
          </div>
        </>)}

        {modal === "add-groupe" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Nouvelle {V.groupe}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Nom *</label>
              <input value={form.nom||""} onChange={e=>setForm((f:any)=>({...f,nom:e.target.value}))} placeholder={isMadrasa?"Ex : Halaqa Al-Fajr":"Ex : CM2-A"} className={inp} style={inpSt} />
            </div>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Niveau</label>
              <select value={form.niveau||V.niveaux[0]} onChange={e=>setForm((f:any)=>({...f,niveau:e.target.value}))} className={inp} style={inpSt}>
                {V.niveaux.map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Capacité</label>
              <input type="number" value={form.capacite||"20"} onChange={e=>setForm((f:any)=>({...f,capacite:e.target.value}))} className={inp} style={inpSt} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>{V.staffSingular} responsable</label>
              <select value={form.enseignant_id||""} onChange={e=>setForm((f:any)=>({...f,enseignant_id:e.target.value}))} className={inp} style={inpSt}>
                <option value="">— Aucun —</option>
                {staff.map(s=><option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.specialite||s.role})</option>)}
              </select>
            </div>
          </div>
        </>)}

        {modal === "add-note" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Nouvelle note</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>{V.apprenant} *</label>
              <select value={form.student_id||""} onChange={e=>setForm((f:any)=>({...f,student_id:e.target.value}))} className={inp} style={inpSt}>
                <option value="">— Choisir —</option>
                {students.map(s=><option key={s.id} value={s.id}>{s.prenom} {s.nom} — {s.niveau}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Matière *</label>
              <select value={form.matiere||V.matieres[0]} onChange={e=>setForm((f:any)=>({...f,matiere:e.target.value}))} className={inp} style={inpSt}>
                {V.matieres.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Période</label>
              <select value={form.periode||"Trim 1"} onChange={e=>setForm((f:any)=>({...f,periode:e.target.value}))} className={inp} style={inpSt}>
                {PERIODES.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Note *</label>
              <input type="number" min="0" max="20" step="0.25" value={form.note||""} onChange={e=>setForm((f:any)=>({...f,note:e.target.value}))} className={inp} style={inpSt} placeholder="0–20" />
            </div>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Note max</label>
              <input type="number" value={form.note_max||"20"} onChange={e=>setForm((f:any)=>({...f,note_max:e.target.value}))} className={inp} style={inpSt} />
            </div>
            {V.sourate && (form.matiere === "Coran" || !form.matiere) && (
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Sourate mémorisée</label>
                <input value={form.sourate||""} onChange={e=>setForm((f:any)=>({...f,sourate:e.target.value}))} placeholder="Ex : Al-Baqara v. 1-50" className={inp} style={inpSt} />
              </div>
            )}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Commentaire</label>
              <input value={form.commentaire||""} onChange={e=>setForm((f:any)=>({...f,commentaire:e.target.value}))} className={inp} style={inpSt} />
            </div>
          </div>
        </>)}

        {modal === "add-frais" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Ajouter un frais</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>{V.apprenant} *</label>
              <select value={form.student_id||""} onChange={e=>setForm((f:any)=>({...f,student_id:e.target.value}))} className={inp} style={inpSt}>
                <option value="">— Choisir —</option>
                {students.map(s=><option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Type</label>
                <select value={form.type_frais||V.fraisTypes[1]} onChange={e=>setForm((f:any)=>({...f,type_frais:e.target.value}))} className={inp} style={inpSt}>
                  {V.fraisTypes.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Montant (GNF) *</label>
                <input type="number" value={form.montant||""} onChange={e=>setForm((f:any)=>({...f,montant:e.target.value}))} className={inp} style={inpSt} />
              </div>
            </div>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Date d'échéance</label>
              <input type="date" value={form.echeance||""} onChange={e=>setForm((f:any)=>({...f,echeance:e.target.value}))} className={inp} style={inpSt} />
            </div>
          </div>
        </>)}

        {modal === "save-presence" && (<>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Confirmer les présences</h3>
          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: V.colorDark }}>
            {attendance.filter(r=>r.statut==="present").length} présents · {attendance.filter(r=>r.statut!=="present").length} absents
          </div>
        </>)}

        {modal === "gen-bulletin" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Générer les bulletins</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Période *</label>
              <select value={form.periode||""} onChange={e=>setForm((f:any)=>({...f,periode:e.target.value}))} className={inp} style={inpSt}>
                <option value="">— Choisir —</option>
                {PERIODES.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Année scolaire</label>
              <input value={form.annee||"2025-2026"} onChange={e=>setForm((f:any)=>({...f,annee:e.target.value}))} className={inp} style={inpSt} />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.publish} onChange={e=>setForm((f:any)=>({...f,publish:e.target.checked}))} />
            Publier et notifier les familles
          </label>
        </>)}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", background: V.color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{saving ? "…" : "Enregistrer"}</button>
          <button onClick={()=>{setModal(null);setForm({});}} style={{ padding: "9px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Annuler</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}`}</style>
      {MODAL}

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? V.color : "#ef4444", color: "white", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", animation: "fadeIn 0.2s ease" }}>
          {toast.ok ? "✓ " : "⚠ "}{toast.msg}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{ display: "flex", flexDirection: "column", width: sideW, flexShrink: 0, transition: "width 0.25s ease", background: V.gradient, borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "16px 0" : "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${V.color},${isMadrasa?"#22d3ee":"#4ade80"})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>{V.emoji}</div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 165 }}>{tenant.name}</p>
              <p style={{ fontSize: 10, color: "rgba(200,240,200,0.7)", margin: 0, fontFamily: "monospace" }}>{tenantCode}</p>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV.map(n => {
            const active = section === n.id;
            return (
              <button key={n.id} onClick={()=>loadSection(n.id)} title={collapsed?n.label:undefined}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 11px", borderRadius: 8, marginBottom: 2, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active?600:500, justifyContent: collapsed?"center":"flex-start", background: active?`rgba(${isMadrasa?"8,145,178":"22,163,74"},0.22)`:"transparent", color: active?"white":"rgba(200,240,200,0.5)", boxShadow: active?`inset 2px 0 0 ${V.color}`:"none" }}>
                <svg width="16" height="16" fill="none" stroke={active?isMadrasa?"#67e8f9":"#86efac":"rgba(200,240,200,0.4)"} strokeWidth={active?2.2:1.8} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
                </svg>
                {!collapsed && n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: 8, flexShrink: 0 }}>
          <button onClick={() => navigate(`/${isMadrasa ? "madrasa" : "ecole"}/${tenantCode}`)}
            title={collapsed ? "Voir la vitrine" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 11px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 12, fontWeight: 600, justifyContent: collapsed ? "center" : "flex-start", marginBottom: 4 }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.2)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)";}}>
            🌐 {!collapsed && "Voir la vitrine"}
          </button>
          <button onClick={()=>navigate(-1 as any)} title={collapsed?"Retour":undefined}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 11px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "rgba(200,240,200,0.4)", fontSize: 12, justifyContent: collapsed?"center":"flex-start" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="white";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(200,240,200,0.4)";}}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            {!collapsed && "Retour plateforme"}
          </button>
          <button onClick={()=>setCollapsed(!collapsed)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "5px 0", border: "none", background: "transparent", color: `${V.color}80`, cursor: "pointer", fontSize: 11, marginTop: 4 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={collapsed?"M9 5l7 7-7 7":"M15 19l-7-7 7-7"} /></svg>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {isAdminViewing && (
          <div style={{ background: V.colorDark, color: "white", padding: "8px 24px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            👁 Mode Administrateur · <span style={{ fontFamily: "monospace", fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: 4 }}>{tenant.owner_numero_h}</span>
          </div>
        )}
        <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{currentNav.label}</h1>
            <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: "#94a3b8" }}>{tenant.name} · {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</p>
          </div>
          {section === "apprenants"  && <button onClick={()=>{setModal("add-apprenant");setForm({});}} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>+ Nouvel {V.apprenant.toLowerCase()}</button>}
          {section === "staff"       && <button onClick={()=>{setModal("add-staff");setForm({});}} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>+ Ajouter</button>}
          {section === "groupes"     && <button onClick={()=>{setModal("add-groupe");setForm({});}} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>+ Créer {V.groupe.toLowerCase()}</button>}
          {section === "notes"       && <button onClick={()=>{setModal("add-note");setForm({matiere:V.matieres[0],periode:"Trim 1"});}} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>+ Ajouter note</button>}
          {section === "frais"       && <button onClick={()=>{setModal("add-frais");setForm({});}} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>+ Ajouter frais</button>}
          {section === "bulletins" && isMadrasa && <button onClick={()=>{setModal("gen-bulletin");setForm({});}} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>⚙ Générer bulletins</button>}
        </div>

        <div style={{ padding: 28, flex: 1 }}>

          {/* ── DASHBOARD ── */}
          {section === "dashboard" && (
            <div style={{ display:"flex",flexDirection:"column",gap:20,animation:"fadeIn 0.2s ease" }}>
              {/* KPI Cards */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14 }}>
                {[
                  { label: V.apprenants, val: stats?.totalStudents??0, color: V.color, bg: isMadrasa?"#ecfeff":"#f0fdf4",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
                  { label: V.staffLabel, val: stats?.totalStaff??0, color: "#0369a1", bg: "#eff6ff",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                  { label: V.groupes, val: stats?.totalHalaqas??stats?.totalClassrooms??0, color: "#7c3aed", bg: "#f5f3ff",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
                  { label: "Présents aujourd'hui", val: stats?.presentToday??0, color: "#059669", bg: "#f0fdf4",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
                  { label: "Frais collectés (mois)", val: fmtMoney(stats?.feesCollected), color: "#16a34a", bg: "#f0fdf4",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
                  { label: "Frais impayés", val: stats?.unpaidFees??0, color: "#dc2626", bg: "#fef2f2",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
                ].map((s,i) => (
                  <div key={i} style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px",borderLeft:`4px solid ${s.color}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:40,height:40,borderRadius:9,background:s.bg,color:s.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4 }}>{s.label}</div>
                      <div style={{ fontSize:22,fontWeight:800,color:"#0f172a",lineHeight:1 }}>{s.val}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Financial Banner */}
              <div style={{ background:`linear-gradient(135deg,${isMadrasa?"#0c4a6e,#0e7490":"#14532d,#15803d"})`,borderRadius:14,padding:"18px 24px",display:"flex",alignItems:"center",gap:20,color:"white" }}>
                <div style={{ width:48,height:48,borderRadius:11,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,opacity:0.8,marginBottom:3 }}>Situation du mois</div>
                  <div style={{ fontSize:20,fontWeight:800 }}>{fmtMoney(stats?.feesCollected)} collectés</div>
                  <div style={{ fontSize:12,opacity:0.7,marginTop:2 }}>{stats?.unpaidFees??0} {V.apprenant.toLowerCase()}{(stats?.unpaidFees??0)>1?"s":""} avec frais impayés</div>
                </div>
                <div style={{ textAlign:"right",opacity:0.9 }}>
                  <div style={{ fontSize:12,marginBottom:2 }}>Présents</div>
                  <div style={{ fontWeight:700 }}>{stats?.presentToday??0}/{stats?.totalStudents??0}</div>
                </div>
              </div>
              {/* Quick Actions */}
              <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"20px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#0f172a" }}>Actions rapides</h3>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10 }}>
                  {[
                    {label:"Faire l'appel",    s:"presences" as Section, emoji:"📋"},
                    {label:`Ajouter ${V.apprenant.toLowerCase()}`, s:"apprenants" as Section, emoji:"👤"},
                    {label:"Saisir des notes", s:"notes" as Section,     emoji:"📝"},
                    {label:"Gérer les frais",  s:"frais" as Section,     emoji:"💰"},
                  ].map(q=>(
                    <button key={q.s} onClick={()=>loadSection(q.s)}
                      style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"14px 8px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,cursor:"pointer",transition:"all 0.15s" }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=V.color;(e.currentTarget as HTMLElement).style.background="white";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#e2e8f0";(e.currentTarget as HTMLElement).style.background="#f8fafc";}}>
                      <span style={{ fontSize:24 }}>{q.emoji}</span>
                      <span style={{ fontSize:11,fontWeight:600,color:V.color,textAlign:"center" }}>{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── APPRENANTS ── */}
          {section === "apprenants" && (
            <div style={{ display:"flex",flexDirection:"column",gap:16,animation:"fadeIn 0.2s ease" }}>
              <div style={{ display:"flex",gap:10 }}>
                <div style={{ flex:1,position:"relative" }}>
                  <svg style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)" }} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…" style={{ width:"100%",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 12px 8px 32px",fontSize:13,color:"#0f172a",outline:"none",boxSizing:"border-box" }} />
                </div>
                <select value={niveauFilter} onChange={e=>setNiveauFilter(e.target.value)} style={{ border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#475569",outline:"none",background:"white",minWidth:140 }}>
                  <option value="">Tous les niveaux</option>
                  {V.niveaux.map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                  <thead><tr style={{ background:"#f8fafc",borderBottom:"1px solid #e2e8f0" }}>
                    {[V.apprenant,"Niveau","Date naissance","Tél. parent","Action"].map(h=>(
                      <th key={h} style={{ padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredStudents.length===0 ? (
                      <tr><td colSpan={5} style={{ padding:"40px 16px",textAlign:"center",color:"#94a3b8" }}>Aucun {V.apprenant.toLowerCase()} trouvé</td></tr>
                    ) : filteredStudents.map(s=>(
                      <tr key={s.id} style={{ borderBottom:"1px solid #f8fafc" }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                        <td style={{ padding:"11px 16px" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <div style={{ width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${V.color},${isMadrasa?"#22d3ee":"#4ade80"})`,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:11,fontWeight:700,flexShrink:0 }}>{s.prenom?.charAt(0)}</div>
                            <span style={{ fontWeight:600,color:"#0f172a" }}>{s.prenom} {s.nom}</span>
                          </div>
                        </td>
                        <td style={{ padding:"11px 16px" }}><span style={{ padding:"2px 10px",background:niveauBg(s.niveau),color:niveauColor(s.niveau),borderRadius:20,fontSize:11,fontWeight:700 }}>{s.niveau}</span></td>
                        <td style={{ padding:"11px 16px",color:"#64748b" }}>{s.date_naissance?fmtDate(s.date_naissance):"—"}</td>
                        <td style={{ padding:"11px 16px",color:"#475569" }}>{s.telephone_parent||"—"}</td>
                        <td style={{ padding:"11px 16px" }}>
                          <button onClick={async()=>{ if(confirm(`Retirer ${s.prenom} ${s.nom} ?`)){await del(`/students/${s.id}`);setStudents(ss=>ss.filter(x=>x.id!==s.id));showToast("Retiré(e)"); }}} style={{ color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600 }}>Retirer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length>0 && <div style={{ padding:"10px 16px",borderTop:"1px solid #f1f5f9",fontSize:12,color:"#94a3b8" }}>{filteredStudents.length} {V.apprenant.toLowerCase()}{filteredStudents.length>1?"s":""}</div>}
              </div>
            </div>
          )}

          {/* ── STAFF ── */}
          {section === "staff" && (
            <div style={{ animation:"fadeIn 0.2s ease" }}>
              {staff.length===0 ? (
                <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"60px 20px",textAlign:"center",color:"#94a3b8" }}>Aucun {V.staffSingular.toLowerCase()} enregistré</div>
              ) : (
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
                  {staff.map(s=>(
                    <div key={s.id} style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:20,boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
                        <div style={{ width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${V.color},${isMadrasa?"#22d3ee":"#4ade80"})`,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:15 }}>{s.prenom?.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight:700,color:"#0f172a",fontSize:14 }}>{s.prenom} {s.nom}</div>
                          <span style={{ padding:"2px 8px",background:isMadrasa?"#ecfeff":"#f0fdf4",color:V.color,borderRadius:20,fontSize:11,fontWeight:600 }}>{s.role}</span>
                        </div>
                      </div>
                      {s.specialite && <div style={{ marginBottom:10 }}><span style={{ padding:"2px 8px",background:"#f0fdf4",color:"#16a34a",borderRadius:4,fontSize:11,fontWeight:600 }}>📚 {s.specialite}</span></div>}
                      <div style={{ fontSize:12,color:"#64748b",lineHeight:1.8 }}>
                        {s.telephone && <div>📞 {s.telephone}</div>}
                        {s.numero_h && <div style={{ fontFamily:"monospace",color:"#94a3b8",fontSize:11 }}>H: {s.numero_h}</div>}
                      </div>
                      <button onClick={async()=>{ if(confirm(`Retirer ${s.prenom} ${s.nom} ?`)){await del(`/staff/${s.id}`);setStaff(ss=>ss.filter(x=>x.id!==s.id));showToast("Retiré(e)"); }}} style={{ marginTop:12,color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600 }}>Retirer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── GROUPES (Halaqas / Classes) ── */}
          {section === "groupes" && (
            <div style={{ animation:"fadeIn 0.2s ease" }}>
              {groupes.length===0 ? (
                <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"60px 20px",textAlign:"center",color:"#94a3b8" }}>Aucune {V.groupe.toLowerCase()} créée.</div>
              ) : (
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
                  {groupes.map(g=>{
                    const teacher = staff.find(s=>s.id===(g.enseignant_id||g.professeur_id));
                    const pct = Math.min(100,((g.student_count||0)/(g.capacite||1))*100);
                    return (
                      <div key={g.id} style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:20,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",borderTop:`3px solid ${niveauColor(g.niveau)}` }}>
                        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12 }}>
                          <div>
                            <div style={{ fontSize:17,fontWeight:800,color:"#0f172a" }}>{g.nom}</div>
                            <span style={{ padding:"2px 10px",background:niveauBg(g.niveau),color:niveauColor(g.niveau),borderRadius:20,fontSize:11,fontWeight:700,marginTop:4,display:"inline-block" }}>{g.niveau}</span>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:26,fontWeight:800,color:niveauColor(g.niveau) }}>{g.student_count||0}</div>
                            <div style={{ fontSize:11,color:"#94a3b8" }}>/ {g.capacite} places</div>
                          </div>
                        </div>
                        <div style={{ height:4,background:"#f1f5f9",borderRadius:2,marginBottom:12,overflow:"hidden" }}>
                          <div style={{ height:"100%",width:`${pct}%`,background:niveauColor(g.niveau),borderRadius:2,transition:"width 0.4s ease" }} />
                        </div>
                        {teacher && <div style={{ fontSize:12,color:"#475569",marginBottom:10 }}>👤 {isMadrasa?"Cheikh":"Prof."} {teacher.prenom} {teacher.nom}</div>}
                        <button onClick={async()=>{ if(confirm(`Supprimer ${g.nom} ?`)){await del(`/${groupEP}/${g.id}`);setGroupes(gs=>gs.filter(x=>x.id!==g.id));showToast(V.groupe+" supprimée"); }}} style={{ color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600 }}>Supprimer</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PRESENCES ── */}
          {section === "presences" && (
            <div style={{ display:"flex",flexDirection:"column",gap:16,animation:"fadeIn 0.2s ease" }}>
              <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                <input type="date" value={attendDate} onChange={e=>{setAttendDate(e.target.value);loadAttendance(e.target.value,selectedGroup);}} style={{ border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#0f172a",outline:"none" }} />
                <select value={selectedGroup} onChange={e=>{setSelectedGroup(e.target.value);loadAttendance(attendDate,e.target.value);}} style={{ border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#475569",outline:"none",background:"white",minWidth:180 }}>
                  <option value="">Choisir {V.groupe.toLowerCase()}…</option>
                  {groupes.map(g=><option key={g.id} value={g.id}>{g.nom} — {g.niveau}</option>)}
                </select>
              </div>
              {!selectedGroup ? (
                <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"48px 20px",textAlign:"center" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>📋</div>
                  <div style={{ fontSize:13,color:"#94a3b8" }}>Sélectionnez une {V.groupe.toLowerCase()} pour faire l'appel</div>
                </div>
              ) : (
                <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ padding:"14px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div>
                      <span style={{ fontWeight:600,color:"#0f172a",fontSize:14 }}>Appel du {new Date(attendDate+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</span>
                      <div style={{ fontSize:11,color:"#94a3b8",marginTop:2 }}>✅ {attendance.filter(r=>r.statut==="present").length} présents · ❌ {attendance.filter(r=>r.statut!=="present").length} absents</div>
                    </div>
                    <button onClick={()=>setModal("save-presence")} style={{ padding:"8px 16px",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>✓ Enregistrer</button>
                  </div>
                  {attendance.length===0 ? (
                    <div style={{ padding:"40px 20px",textAlign:"center",color:"#94a3b8",fontSize:13 }}>Aucun(e) {V.apprenant.toLowerCase()} dans ce groupe</div>
                  ) : attendance.map((r:any,i:number)=>(
                    <div key={r.student_id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid #f8fafc" }}>
                      <div style={{ width:32,height:32,borderRadius:"50%",background:r.statut==="present"?isMadrasa?"#ecfeff":"#f0fdf4":"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:r.statut==="present"?V.color:"#ef4444",flexShrink:0 }}>{r.prenom?.charAt(0)}</div>
                      <div style={{ flex:1,fontWeight:600,color:"#0f172a",fontSize:13 }}>{r.prenom} {r.nom}</div>
                      <div style={{ display:"flex",gap:6 }}>
                        {["present","absent","retard"].map(s=>(
                          <button key={s} onClick={()=>setAttendance(at=>at.map((x:any,j:number)=>j===i?{...x,statut:s}:x))}
                            style={{ padding:"5px 12px",borderRadius:6,border:"1.5px solid",fontSize:12,fontWeight:600,cursor:"pointer",
                              borderColor:r.statut===s?(s==="present"?V.color:s==="absent"?"#ef4444":"#f59e0b"):"#e2e8f0",
                              background:r.statut===s?(s==="present"?V.color:s==="absent"?"#ef4444":"#f59e0b"):"white",
                              color:r.statut===s?"white":"#94a3b8" }}>
                            {s==="present"?"Présent":s==="absent"?"Absent":"Retard"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {section === "notes" && (
            <div style={{ animation:"fadeIn 0.2s ease" }}>
              <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                  <thead><tr style={{ background:"#f8fafc",borderBottom:"1px solid #e2e8f0" }}>
                    {[V.apprenant,"Matière","Note",V.sourate?"Sourate":"Référence","Période","Commentaire",""].map(h=>(
                      <th key={h} style={{ padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {grades.length===0 ? (
                      <tr><td colSpan={7} style={{ padding:"40px 16px",textAlign:"center",color:"#94a3b8" }}>Aucune note enregistrée</td></tr>
                    ) : grades.map(g=>{
                      const pct=(+g.note/+g.note_max)*100;
                      const nc=pct>=70?"#16a34a":pct>=50?"#d97706":"#ef4444";
                      return (
                        <tr key={g.id} style={{ borderBottom:"1px solid #f8fafc" }}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                          <td style={{ padding:"11px 16px",fontWeight:600,color:"#0f172a" }}>{g.student_prenom} {g.student_nom}</td>
                          <td style={{ padding:"11px 16px" }}><span style={{ padding:"2px 8px",background:isMadrasa?"#ecfeff":"#f0fdf4",color:V.color,borderRadius:4,fontSize:11,fontWeight:600 }}>{g.matiere}</span></td>
                          <td style={{ padding:"11px 16px" }}><span style={{ fontSize:16,fontWeight:800,color:nc }}>{g.note}</span><span style={{ fontSize:11,color:"#94a3b8" }}>/{g.note_max}</span></td>
                          <td style={{ padding:"11px 16px",color:"#7c3aed",fontSize:12 }}>{g.sourate||"—"}</td>
                          <td style={{ padding:"11px 16px" }}><span style={{ padding:"2px 8px",background:"#f1f5f9",color:"#475569",borderRadius:20,fontSize:11 }}>{g.periode||"—"}</span></td>
                          <td style={{ padding:"11px 16px",color:"#94a3b8",fontSize:12 }}>{g.commentaire||"—"}</td>
                          <td style={{ padding:"11px 16px" }}>
                            <button onClick={async()=>{ if(confirm("Supprimer cette note ?")){await del(`/grades/${g.id}`);setGrades(gs=>gs.filter(x=>x.id!==g.id));showToast("Note supprimée"); }}} style={{ color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600 }}>Suppr.</button>
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
          {section === "frais" && (
            <div style={{ display:"flex",flexDirection:"column",gap:16,animation:"fadeIn 0.2s ease" }}>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
                {[
                  { label:"Total facturé",  val:fmtMoney(fees.reduce((s,f)=>s+ +f.montant,0)),                             color:"#0369a1", bg:"#eff6ff" },
                  { label:"Total encaissé", val:fmtMoney(fees.filter(f=>f.est_paye).reduce((s,f)=>s+ +f.montant,0)),       color:"#16a34a", bg:"#f0fdf4" },
                  { label:"Reste à payer",  val:fmtMoney(fees.filter(f=>!f.est_paye).reduce((s,f)=>s+ +f.montant,0)),     color:"#dc2626", bg:"#fef2f2" },
                ].map((c,i)=>(
                  <div key={i} style={{ background:"white",borderRadius:10,border:"1px solid #e2e8f0",padding:"14px 16px",borderLeft:`3px solid ${c.color}` }}>
                    <div style={{ fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6 }}>{c.label}</div>
                    <div style={{ fontSize:16,fontWeight:700,color:c.color }}>{c.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                  <thead><tr style={{ background:"#f8fafc",borderBottom:"1px solid #e2e8f0" }}>
                    {[V.apprenant,"Type","Montant","Échéance","Statut","Action"].map(h=>(
                      <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {fees.length===0 ? (
                      <tr><td colSpan={6} style={{ padding:"40px 16px",textAlign:"center",color:"#94a3b8" }}>Aucun frais enregistré</td></tr>
                    ) : fees.map(f=>(
                      <tr key={f.id} style={{ borderBottom:"1px solid #f8fafc" }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                        <td style={{ padding:"11px 14px",fontWeight:600,color:"#0f172a" }}>{f.student_prenom} {f.student_nom}</td>
                        <td style={{ padding:"11px 14px",color:"#475569" }}>{f.type_frais}</td>
                        <td style={{ padding:"11px 14px",fontWeight:700,color:"#0f172a" }}>{fmtMoney(f.montant)}</td>
                        <td style={{ padding:"11px 14px",color:"#64748b" }}>{f.echeance?fmtDate(f.echeance):"—"}</td>
                        <td style={{ padding:"11px 14px" }}><span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:f.est_paye?"#f0fdf4":"#fef2f2",color:f.est_paye?"#16a34a":"#dc2626" }}>{f.est_paye?"✓ Payé":"Impayé"}</span></td>
                        <td style={{ padding:"11px 14px" }}>
                          {!f.est_paye && (
                            <button onClick={async()=>{ const d=await put(`/fees/${f.id}/pay`,{}); if(d.success){setFees(fs=>fs.map((x:any)=>x.id===f.id?{...x,est_paye:true}:x));showToast("Paiement enregistré");} }} style={{ padding:"5px 10px",background:V.color,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600 }}>Encaisser</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── BULLETINS ── */}
          {section === "bulletins" && (
            <div style={{ animation:"fadeIn 0.2s ease" }}>
              {!isMadrasa ? (
                <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"60px 20px",textAlign:"center" }}>
                  <div style={{ fontSize:48,marginBottom:12 }}>🚧</div>
                  <div style={{ fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:6 }}>Bulletins — Bientôt disponible</div>
                  <div style={{ fontSize:13,color:"#94a3b8" }}>La génération de bulletins pour les écoles sera disponible prochainement.</div>
                </div>
              ) : bulletins.length===0 ? (
                <div style={{ background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"60px 20px",textAlign:"center" }}>
                  <div style={{ fontSize:48,marginBottom:12 }}>📋</div>
                  <div style={{ fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:6 }}>Aucun bulletin généré</div>
                  <div style={{ fontSize:13,color:"#94a3b8",marginBottom:20 }}>Saisissez des notes puis générez les bulletins de progression islamique.</div>
                  <button onClick={()=>{setModal("gen-bulletin");setForm({});}} style={{ padding:"9px 20px",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13 }}>⚙ Générer maintenant</button>
                </div>
              ) : (
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16 }}>
                  {bulletins.map(b=>{
                    const mention=b.mention||"—";
                    const mc=mention.includes("Excellent")?"#16a34a":mention.includes("Très")?"#0891b2":mention.includes("Bien")?"#7c3aed":"#d97706";
                    return (
                      <div key={b.id} style={{ background:"white",borderRadius:12,border:`1px solid ${b.is_published?"#a5f3fc":"#e2e8f0"}`,padding:20,boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                          <div>
                            <div style={{ fontWeight:700,fontSize:14,color:"#0f172a" }}>{b.student_prenom} {b.student_nom}</div>
                            <div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>{b.niveau} · {b.periode} — {b.annee_scolaire}</div>
                          </div>
                          <span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:b.is_published?"#ecfeff":"#f8fafc",color:b.is_published?V.color:"#94a3b8" }}>{b.is_published?"✓ Publié":"Brouillon"}</span>
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#f8fafc",borderRadius:8 }}>
                          <div>
                            <div style={{ fontSize:11,color:"#94a3b8" }}>Moyenne générale</div>
                            <div style={{ fontSize:22,fontWeight:800,color:mc }}>{b.moyenne_generale}/20</div>
                          </div>
                          <div style={{ flex:1,textAlign:"right" }}>
                            <span style={{ fontSize:12,fontWeight:600,color:mc,background:"white",border:`1px solid ${mc}22`,padding:"4px 10px",borderRadius:6 }}>{mention}</span>
                          </div>
                        </div>
                        {!b.is_published && (
                          <button onClick={async()=>{ const d=await put(`/bulletins/${b.id}/publish`,{}); if(d.success){setBulletins(bs=>bs.map((x:any)=>x.id===b.id?{...x,is_published:true}:x));showToast("Bulletin publié");} }} style={{ marginTop:12,width:"100%",padding:"8px 0",background:V.color,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13 }}>Publier & notifier</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
