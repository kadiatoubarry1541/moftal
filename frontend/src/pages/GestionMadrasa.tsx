import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/madrasa-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Section = "dashboard" | "apprenants" | "enseignants" | "halaqas" | "presences" | "progression" | "frais" | "bulletins";

const NIVEAUX  = ["Iqra", "Qa'idah", "Débutant", "Juz' Amma", "Hizb", "Hafiz"];
const MATIERES = ["Coran", "Tajwid", "Hadith", "Fiqh", "Arabe", "Histoire islamique", "Morale"];
const PERIODES = ["Trim 1", "Trim 2", "Trim 3", "Sem 1", "Sem 2", "Annuel"];
const FRAIS_TYPES = ["Inscription", "Frais mensuels", "Frais annuels", "Examen", "Tenue islamique", "Autre"];
const ROLES_MADRASA = ["Directeur", "Cheikh", "Enseignant", "Surveillant", "Administratif", "Autre"];

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const TEAL = "#0891b2";
const TEAL_DARK = "#0e7490";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard",   label: "Tableau de bord",   icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "apprenants",  label: "Apprenants",         icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: "enseignants", label: "Enseignants",        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "halaqas",     label: "Halaqas",            icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "presences",   label: "Présences",          icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { id: "progression", label: "Notes / Progression", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" },
  { id: "frais",       label: "Frais",              icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { id: "bulletins",   label: "Bulletins",          icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none";
const inpSt = { borderColor: "#e2e8f0", color: "#0f172a" };
const labelSt = { fontSize: 11, fontWeight: 600 as const, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.04em" };

export default function GestionMadrasa() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();

  const [section, setSection] = useState<Section>("dashboard");
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [tenant, setTenant]       = useState<any>(null);
  const [stats, setStats]         = useState<any>(null);
  const [students, setStudents]   = useState<any[]>([]);
  const [staff, setStaff]         = useState<any[]>([]);
  const [halaqas, setHalaqas]     = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [grades, setGrades]       = useState<any[]>([]);
  const [fees, setFees]           = useState<any[]>([]);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [search, setSearch]       = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [attendDate, setAttendDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedHalaqa, setSelectedHalaqa] = useState("");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [modal, setModal]         = useState<string | null>(null);
  const [form, setForm]           = useState<any>({});
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

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

  // Chargement initial
  useEffect(() => {
    const user = getSessionUser();
    if (!user) { navigate("/login"); return; }
    Promise.all([get("/info"), get("/dashboard")])
      .then(([info, dash]) => {
        if (!info.tenant) { setError(info.message || "Accès refusé à cet espace madrasa."); return; }
        setTenant(info.tenant);
        setStats(dash);
      })
      .catch(e => setError("Impossible de joindre le serveur : " + (e?.message || e)))
      .finally(() => setLoading(false));
  }, [get]);

  const loadSection = useCallback((s: Section) => {
    setSection(s); setSearch(""); setNiveauFilter("");
    if (window.innerWidth < 768) setCollapsed(true);
    if (s === "apprenants")  { get("/students").then(d => d.students && setStudents(d.students)); get("/halaqas").then(d => d.halaqas && setHalaqas(d.halaqas)); }
    if (s === "enseignants") { get("/staff").then(d => d.staff && setStaff(d.staff)); }
    if (s === "halaqas")     { get("/halaqas").then(d => d.halaqas && setHalaqas(d.halaqas)); get("/staff").then(d => d.staff && setStaff(d.staff)); }
    if (s === "presences")   { get("/halaqas").then(d => d.halaqas && setHalaqas(d.halaqas)); get("/students").then(d => d.students && setStudents(d.students)); }
    if (s === "progression") { get("/grades").then(d => d.grades && setGrades(d.grades)); get("/students").then(d => d.students && setStudents(d.students)); }
    if (s === "frais")       { get("/fees").then(d => d.fees && setFees(d.fees)); get("/students").then(d => d.students && setStudents(d.students)); }
    if (s === "bulletins")   { get("/bulletins").then(d => d.bulletins && setBulletins(d.bulletins)); }
  }, [get]);

  const loadAttendance = useCallback((date: string, halaqaId: string) => {
    if (!halaqaId) return;
    const halaqa = halaqas.find(h => String(h.id) === halaqaId);
    if (!halaqa) return;
    get(`/attendance?date=${date}`).then(d => {
      const existing: any[] = d.attendance || [];
      // Students du même niveau que la halaqa
      const halaqaStudents = students.filter(s => s.niveau === halaqa.niveau && s.is_active !== false);
      const merged = halaqaStudents.map(s => {
        const rec = existing.find(r => r.student_id === s.id);
        return rec
          ? { student_id: s.id, prenom: s.prenom, nom: s.nom, statut: rec.statut }
          : { student_id: s.id, prenom: s.prenom, nom: s.nom, statut: "present", _new: true };
      });
      setAttendance(merged);
    });
  }, [get, halaqas, students]);

  const submit = async () => {
    setSaving(true);
    try {
      if (modal === "add-apprenant") {
        if (!form.nom || !form.prenom) { showToast("Nom et prénom obligatoires", false); return; }
        const d = await post("/students", { ...form, niveau: form.niveau || "Iqra" });
        if (d.student) { setStudents(p => [d.student, ...p]); setModal(null); setForm({}); showToast("Apprenant ajouté"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-enseignant") {
        if (!form.nom || !form.prenom) { showToast("Nom et prénom obligatoires", false); return; }
        const d = await post("/staff", { ...form, role: form.role || "Enseignant", specialite: form.specialite || "Coran" });
        if (d.staff) { setStaff(p => [d.staff, ...p]); setModal(null); setForm({}); showToast("Enseignant ajouté"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-halaqa") {
        if (!form.nom) { showToast("Nom de la halaqa obligatoire", false); return; }
        const d = await post("/halaqas", { ...form, niveau: form.niveau || "Iqra", capacite: +(form.capacite || 20) });
        if (d.halaqa) { setHalaqas(p => [...p, d.halaqa]); setModal(null); setForm({}); showToast("Halaqa créée"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-note") {
        if (!form.student_id || !form.matiere || form.note === "") { showToast("Apprenant, matière et note obligatoires", false); return; }
        const d = await post("/grades", { ...form, note: parseFloat(form.note), note_max: parseFloat(form.note_max || 20) });
        if (d.grade) { setGrades(p => [d.grade, ...p]); setModal(null); setForm({}); showToast("Note enregistrée"); }
        else showToast(d.message || "Erreur", false);
      } else if (modal === "add-frais") {
        if (!form.student_id || !form.montant) { showToast("Apprenant et montant obligatoires", false); return; }
        const d = await post("/fees", { ...form, montant: parseInt(form.montant), type_frais: form.type_frais || "Frais mensuels" });
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

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: `3px solid #e2e8f0`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#64748b", fontSize: 14 }}>Chargement de l'espace madrasa...</p>
      </div>
    </div>
  );

  if (!tenant) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="28" height="28" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Espace madrasa inaccessible</h2>
        <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", borderRadius: 8, padding: "10px 16px", marginBottom: 16 }}>{error || "Erreur inconnue"}</p>
        <button onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 20px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Retour à la liste</button>
      </div>
    </div>
  );

  const currentUser = getSessionUser();
  const isAdminViewing = isAdmin(currentUser) && currentUser?.numeroH !== tenant.owner_numero_h;
  const isMobile = window.innerWidth < 768;
  const sideW = collapsed ? (isMobile ? 0 : 64) : 244;

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${s.nom} ${s.prenom}`.toLowerCase().includes(q);
    const matchNiveau = !niveauFilter || s.niveau === niveauFilter;
    return matchSearch && matchNiveau;
  });

  const nivColor = (n: string) => {
    const map: Record<string, string> = { "Iqra": "#0891b2", "Qa'idah": "#0369a1", "Débutant": "#7c3aed", "Juz' Amma": "#1a8f1a", "Hizb": "#d97706", "Hafiz": "#dc2626" };
    return map[n] || "#64748b";
  };
  const nivBg = (n: string) => {
    const map: Record<string, string> = { "Iqra": "#ecfeff", "Qa'idah": "#eff6ff", "Débutant": "#f5f3ff", "Juz' Amma": "#f0fdf0", "Hizb": "#fffbeb", "Hafiz": "#fef2f2" };
    return map[n] || "#f8fafc";
  };

  const currentNav = NAV.find(n => n.id === section)!;

  // ── Modal overlay ──────────────────────────────────────────────────────────
  const MODAL = modal ? (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
      <div style={{ background: "white", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>

        {/* Ajouter apprenant */}
        {modal === "add-apprenant" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Nouvel apprenant</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Prénom *", "prenom", "text"], ["Nom *", "nom", "text"], ["Date de naissance", "date_naissance", "date"], ["Sexe", "sexe", "select-sexe"], ["Téléphone parent", "telephone_parent", "text"], ["Niveau", "niveau", "select-niveau"], ["NuméroH apprenant", "numero_h", "text"], ["NuméroH parent", "parent_numero_h", "text"]].map(([label, key, type]) => (
              <div key={key} style={{ gridColumn: key === "prenom" || key === "nom" ? undefined : undefined }}>
                <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>{label}</label>
                {type === "select-sexe" ? (
                  <select value={form[key] || "M"} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inp} style={inpSt}>
                    <option value="M">Masculin</option><option value="F">Féminin</option>
                  </select>
                ) : type === "select-niveau" ? (
                  <select value={form[key] || "Iqra"} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inp} style={inpSt}>
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : (
                  <input type={type} value={form[key] || ""} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inp} style={inpSt} />
                )}
              </div>
            ))}
          </div>
        </>)}

        {/* Ajouter enseignant */}
        {modal === "add-enseignant" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Nouvel enseignant</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Prénom *", "prenom", "text"], ["Nom *", "nom", "text"], ["Rôle", "role", "select-role"], ["Spécialité", "specialite", "select-mat"], ["Téléphone", "telephone", "text"], ["NuméroH", "numero_h", "text"]].map(([label, key, type]) => (
              <div key={key}>
                <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>{label}</label>
                {type === "select-role" ? (
                  <select value={form[key] || "Enseignant"} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inp} style={inpSt}>
                    {ROLES_MADRASA.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : type === "select-mat" ? (
                  <select value={form[key] || "Coran"} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inp} style={inpSt}>
                    {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input type={type} value={form[key] || ""} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inp} style={inpSt} />
                )}
              </div>
            ))}
          </div>
        </>)}

        {/* Ajouter halaqa */}
        {modal === "add-halaqa" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Nouvelle Halaqa</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Nom de la halaqa *</label>
              <input value={form.nom || ""} onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))} placeholder="Ex : Halaqa Al-Fajr" className={inp} style={inpSt} />
            </div>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Niveau</label>
              <select value={form.niveau || "Iqra"} onChange={e => setForm((f: any) => ({ ...f, niveau: e.target.value }))} className={inp} style={inpSt}>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Capacité</label>
              <input type="number" value={form.capacite || "20"} onChange={e => setForm((f: any) => ({ ...f, capacite: e.target.value }))} className={inp} style={inpSt} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Enseignant responsable</label>
              <select value={form.enseignant_id || ""} onChange={e => setForm((f: any) => ({ ...f, enseignant_id: e.target.value }))} className={inp} style={inpSt}>
                <option value="">— Aucun —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.specialite})</option>)}
              </select>
            </div>
          </div>
        </>)}

        {/* Ajouter note */}
        {modal === "add-note" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Nouvelle note / progression</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Apprenant *</label>
              <select value={form.student_id || ""} onChange={e => setForm((f: any) => ({ ...f, student_id: e.target.value }))} className={inp} style={inpSt}>
                <option value="">— Choisir un apprenant —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom} — {s.niveau}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Matière *</label>
              <select value={form.matiere || "Coran"} onChange={e => setForm((f: any) => ({ ...f, matiere: e.target.value }))} className={inp} style={inpSt}>
                {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Période</label>
              <select value={form.periode || "Trim 1"} onChange={e => setForm((f: any) => ({ ...f, periode: e.target.value }))} className={inp} style={inpSt}>
                {PERIODES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Note *</label>
              <input type="number" min="0" max="20" step="0.25" value={form.note || ""} onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))} className={inp} style={inpSt} placeholder="0 – 20" />
            </div>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Note max</label>
              <input type="number" value={form.note_max || "20"} onChange={e => setForm((f: any) => ({ ...f, note_max: e.target.value }))} className={inp} style={inpSt} />
            </div>
            {(form.matiere === "Coran" || !form.matiere) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Sourate mémorisée (Coran)</label>
                <input value={form.sourate || ""} onChange={e => setForm((f: any) => ({ ...f, sourate: e.target.value }))} placeholder="Ex : Al-Baqara, v. 1-50" className={inp} style={inpSt} />
              </div>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Commentaire</label>
              <input value={form.commentaire || ""} onChange={e => setForm((f: any) => ({ ...f, commentaire: e.target.value }))} className={inp} style={inpSt} placeholder="Observation de l'enseignant…" />
            </div>
          </div>
        </>)}

        {/* Ajouter frais */}
        {modal === "add-frais" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Ajouter un frais</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Apprenant *</label>
              <select value={form.student_id || ""} onChange={e => setForm((f: any) => ({ ...f, student_id: e.target.value }))} className={inp} style={inpSt}>
                <option value="">— Choisir —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Type de frais</label>
                <select value={form.type_frais || "Frais mensuels"} onChange={e => setForm((f: any) => ({ ...f, type_frais: e.target.value }))} className={inp} style={inpSt}>
                  {FRAIS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Montant (GNF) *</label>
                <input type="number" value={form.montant || ""} onChange={e => setForm((f: any) => ({ ...f, montant: e.target.value }))} className={inp} style={inpSt} />
              </div>
            </div>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Date d'échéance</label>
              <input type="date" value={form.echeance || ""} onChange={e => setForm((f: any) => ({ ...f, echeance: e.target.value }))} className={inp} style={inpSt} />
            </div>
          </div>
        </>)}

        {/* Enregistrer présences */}
        {modal === "save-presence" && (<>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Confirmer les présences</h3>
          <div style={{ background: "#ecfeff", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#0e7490", marginBottom: 16 }}>
            {attendance.filter(r => r.statut === "present").length} présents · {attendance.filter(r => r.statut !== "present").length} absents
          </div>
        </>)}

        {/* Générer bulletins */}
        {modal === "gen-bulletin" && (<>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Générer les bulletins</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Période *</label>
              <select value={form.periode || ""} onChange={e => setForm((f: any) => ({ ...f, periode: e.target.value }))} className={inp} style={inpSt}>
                <option value="">— Choisir —</option>
                {PERIODES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...labelSt, display: "block", marginBottom: 4 }}>Année</label>
              <input value={form.annee || "2025-2026"} onChange={e => setForm((f: any) => ({ ...f, annee: e.target.value }))} className={inp} style={inpSt} />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.publish} onChange={e => setForm((f: any) => ({ ...f, publish: e.target.checked }))} />
            Publier et notifier les familles
          </label>
        </>)}

        {/* Actions */}
        {modal !== null && (
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{saving ? "..." : "Enregistrer"}</button>
            <button onClick={() => { setModal(null); setForm({}); }} style={{ padding: "9px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Annuler</button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // ── Render principal ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion madrasa — ${tenant?.name || ""}`}
        startUrl={`/gestion-madrasa/${tenantCode}`}
        themeColor={TEAL}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

      {MODAL}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? TEAL : "#ef4444", color: "white", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", animation: "fadeIn 0.2s ease" }}>
          {toast.ok ? "✓ " : "⚠ "}{toast.msg}
        </div>
      )}

      {/* Overlay mobile */}
      {!collapsed && isMobile && (
        <div onClick={() => setCollapsed(true)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 49 }} />
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{ display: "flex", flexDirection: "column", width: collapsed ? (isMobile ? 0 : 64) : 244, flexShrink: 0, transition: "width 0.25s ease", background: "linear-gradient(180deg,#082f49 0%,#0c4a6e 50%,#0e5a80 100%)", borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", ...(isMobile && !collapsed ? { position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50 } : {}) }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "16px 0" : "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${TEAL},#22d3ee)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>📖</div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 165 }}>{tenant.name}</p>
              <p style={{ fontSize: 10, color: "rgba(125,211,252,0.7)", margin: 0, fontFamily: "monospace" }}>{tenantCode}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV.map(n => {
            const active = section === n.id;
            return (
              <button key={n.id} onClick={() => loadSection(n.id)} title={collapsed ? n.label : undefined}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 11px", borderRadius: 8, marginBottom: 2, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 500, transition: "all 0.15s", justifyContent: collapsed ? "center" : "flex-start", background: active ? `rgba(8,145,178,0.22)` : "transparent", color: active ? "white" : "rgba(186,230,253,0.6)", boxShadow: active ? `inset 2px 0 0 ${TEAL}` : "none" }}>
                <svg width="16" height="16" fill="none" stroke={active ? "#67e8f9" : "rgba(186,230,253,0.5)"} strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
                </svg>
                {!collapsed && n.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: 8, flexShrink: 0 }}>
          <button onClick={() => navigate(-1 as any)} title={collapsed ? "Retour" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 11px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "rgba(186,230,253,0.4)", fontSize: 12, justifyContent: collapsed ? "center" : "flex-start" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(186,230,253,0.4)"; }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            {!collapsed && "Retour plateforme"}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "5px 0", border: "none", background: "transparent", color: `rgba(8,145,178,0.4)`, cursor: "pointer", fontSize: 11, marginTop: 4 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {isAdminViewing && (
          <div style={{ background: "#0369a1", color: "white", padding: "8px 24px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            👁 Mode Administrateur — Consultation · <span style={{ fontFamily: "monospace", fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: 4 }}>{tenant.owner_numero_h}</span>
          </div>
        )}

        {/* Page header */}
        <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {collapsed && (
              <button onClick={() => setCollapsed(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "#64748b", display: "flex", alignItems: "center" }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{currentNav.label}</h1>
              <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: "#94a3b8" }}>{tenant.name} · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <InstallAppButton />
          {section === "apprenants"  && <button onClick={() => { setModal("add-apprenant"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 16 }}>+</span> Nouvel apprenant</button>}
          {section === "enseignants" && <button onClick={() => { setModal("add-enseignant"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 16 }}>+</span> Ajouter enseignant</button>}
          {section === "halaqas"     && <button onClick={() => { setModal("add-halaqa"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 16 }}>+</span> Créer une halaqa</button>}
          {section === "progression" && <button onClick={() => { setModal("add-note"); setForm({ matiere: "Coran", periode: "Trim 1" }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 16 }}>+</span> Ajouter note</button>}
          {section === "frais"       && <button onClick={() => { setModal("add-frais"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 16 }}>+</span> Ajouter frais</button>}
          {section === "bulletins"   && <button onClick={() => { setModal("gen-bulletin"); setForm({}); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>⚙ Générer bulletins</button>}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: 28, flex: 1 }}>

          {/* ── DASHBOARD ── */}
          {section === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Apprenants",        val: stats?.totalStudents   ?? "—", color: TEAL,      bg: "#ecfeff",  icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
                  { label: "Enseignants",        val: stats?.totalStaff     ?? "—", color: "#0369a1", bg: "#eff6ff",  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                  { label: "Halaqas",            val: stats?.totalHalaqas   ?? "—", color: "#7c3aed", bg: "#f5f3ff",  icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
                  { label: "Présents aujourd'hui", val: stats?.presentToday  ?? "—", color: "#1a8f1a", bg: "#f0fdf0",  icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
                  { label: "Frais collectés (mois)", val: fmtMoney(stats?.feesCollected), color: "#1a8f1a", bg: "#f0fdf0", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
                  { label: "Frais impayés",      val: stats?.unpaidFees     ?? "—", color: "#dc2626", bg: "#fef2f2",  icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
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

              {/* Accès rapide */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Accès rapide</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { label: "Faire l'appel", section: "presences" as Section, emoji: "📋", color: TEAL },
                    { label: "Ajouter apprenant", section: "apprenants" as Section, emoji: "👤", color: "#0369a1" },
                    { label: "Saisir des notes", section: "progression" as Section, emoji: "📝", color: "#7c3aed" },
                    { label: "Gérer les frais", section: "frais" as Section, emoji: "💰", color: "#1a8f1a" },
                  ].map(q => (
                    <button key={q.section} onClick={() => loadSection(q.section)}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = q.color; (e.currentTarget as HTMLElement).style.background = "white"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}>
                      <span style={{ fontSize: 24 }}>{q.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: q.color }}>{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── APPRENANTS ── */}
          {section === "apprenants" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom…" style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
                </div>
                <select value={niveauFilter} onChange={e => setNiveauFilter(e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#475569", outline: "none", background: "white", minWidth: 140 }}>
                  <option value="">Tous les niveaux</option>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Apprenant", "Niveau", "Date de naissance", "Tel. parent", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: "40px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun apprenant trouvé</td></tr>
                    ) : filteredStudents.map(s => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f8fafc" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},#22d3ee)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.prenom?.charAt(0)}</div>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{s.prenom} {s.nom}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{ padding: "2px 10px", background: nivBg(s.niveau), color: nivColor(s.niveau), borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.niveau}</span>
                        </td>
                        <td style={{ padding: "11px 16px", color: "#64748b" }}>{s.date_naissance ? fmtDate(s.date_naissance) : "—"}</td>
                        <td style={{ padding: "11px 16px", color: "#475569" }}>{s.telephone_parent || "—"}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <button onClick={async () => { if (confirm(`Retirer ${s.prenom} ${s.nom} ?`)) { await del(`/students/${s.id}`); setStudents(ss => ss.filter(x => x.id !== s.id)); showToast("Apprenant retiré"); }}} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length > 0 && (
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>{filteredStudents.length} apprenant{filteredStudents.length > 1 ? "s" : ""}</div>
                )}
              </div>
            </div>
          )}

          {/* ── ENSEIGNANTS ── */}
          {section === "enseignants" && (
            <div>
              {staff.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Aucun enseignant enregistré</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                  {staff.map(s => (
                    <div key={s.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},#22d3ee)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 15 }}>{s.prenom?.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{s.prenom} {s.nom}</div>
                          <span style={{ padding: "2px 8px", background: "#ecfeff", color: TEAL, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.role}</span>
                        </div>
                      </div>
                      {s.specialite && (
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ padding: "2px 8px", background: "#f0fdf0", color: "#1a8f1a", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>📚 {s.specialite}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
                        {s.telephone && <div>📞 {s.telephone}</div>}
                        {s.numero_h && <div style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 11 }}>H: {s.numero_h}</div>}
                      </div>
                      <button onClick={async () => { if (confirm(`Retirer ${s.prenom} ${s.nom} ?`)) { await del(`/staff/${s.id}`); setStaff(ss => ss.filter(x => x.id !== s.id)); showToast("Enseignant retiré"); }}} style={{ marginTop: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── HALAQAS ── */}
          {section === "halaqas" && (
            <div>
              {halaqas.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Aucune halaqa créée. Créez votre premier cercle d'étude.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                  {halaqas.map(h => {
                    const enseignant = staff.find(s => s.id === h.enseignant_id);
                    const pct = Math.min(100, ((h.student_count || 0) / (h.capacite || 1)) * 100);
                    return (
                      <div key={h.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderTop: `3px solid ${nivColor(h.niveau)}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{h.nom}</div>
                            <span style={{ padding: "2px 10px", background: nivBg(h.niveau), color: nivColor(h.niveau), borderRadius: 20, fontSize: 11, fontWeight: 700, marginTop: 4, display: "inline-block" }}>{h.niveau}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 26, fontWeight: 800, color: nivColor(h.niveau) }}>{h.student_count || 0}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>/ {h.capacite} places</div>
                          </div>
                        </div>
                        <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: nivColor(h.niveau), borderRadius: 2, transition: "width 0.4s ease" }} />
                        </div>
                        {enseignant && <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>👨‍🏫 Cheikh {enseignant.prenom} {enseignant.nom}</div>}
                        <button onClick={async () => { if (confirm(`Supprimer la halaqa ${h.nom} ?`)) { await del(`/halaqas/${h.id}`); setHalaqas(hs => hs.filter(x => x.id !== h.id)); showToast("Halaqa supprimée"); }}} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Supprimer</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PRÉSENCES ── */}
          {section === "presences" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input type="date" value={attendDate} onChange={e => { setAttendDate(e.target.value); loadAttendance(e.target.value, selectedHalaqa); }} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0f172a", outline: "none" }} />
                <select value={selectedHalaqa} onChange={e => { setSelectedHalaqa(e.target.value); loadAttendance(attendDate, e.target.value); }} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#475569", outline: "none", background: "white", minWidth: 180 }}>
                  <option value="">Choisir une halaqa…</option>
                  {halaqas.map(h => <option key={h.id} value={h.id}>{h.nom} — {h.niveau}</option>)}
                </select>
              </div>

              {!selectedHalaqa && (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Sélectionnez une halaqa pour faire l'appel</div>
                </div>
              )}

              {selectedHalaqa && (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>Appel du {new Date(attendDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        ✅ {attendance.filter(r => r.statut === "present").length} présents · ❌ {attendance.filter(r => r.statut !== "present").length} absents
                      </div>
                    </div>
                    <button onClick={() => setModal("save-presence")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      ✓ Enregistrer
                    </button>
                  </div>
                  {attendance.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun apprenant dans cette halaqa</div>
                  ) : (
                    attendance.map((r: any, i: number) => (
                      <div key={r.student_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: r.statut === "present" ? "#ecfeff" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: r.statut === "present" ? TEAL : "#ef4444", flexShrink: 0 }}>{r.prenom?.charAt(0)}</div>
                        <div style={{ flex: 1, fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{r.prenom} {r.nom}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {["present", "absent", "retard"].map(s => (
                            <button key={s} onClick={() => setAttendance(at => at.map((x: any, j: number) => j === i ? { ...x, statut: s } : x))}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "1.5px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                                borderColor: r.statut === s ? (s === "present" ? TEAL : s === "absent" ? "#ef4444" : "#f59e0b") : "#e2e8f0",
                                background: r.statut === s ? (s === "present" ? TEAL : s === "absent" ? "#ef4444" : "#f59e0b") : "white",
                                color: r.statut === s ? "white" : "#94a3b8" }}>
                              {s === "present" ? "Présent" : s === "absent" ? "Absent" : "Retard"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── PROGRESSION / NOTES ── */}
          {section === "progression" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Apprenant", "Matière", "Note", "Sourate / Référence", "Période", "Commentaire", "Action"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grades.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucune note enregistrée</td></tr>
                    ) : grades.map(g => {
                      const pct = (+g.note / +g.note_max) * 100;
                      const noteColor = pct >= 70 ? "#1a8f1a" : pct >= 50 ? "#d97706" : "#ef4444";
                      return (
                        <tr key={g.id} style={{ borderBottom: "1px solid #f8fafc" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <td style={{ padding: "11px 16px", fontWeight: 600, color: "#0f172a" }}>{g.student_prenom} {g.student_nom}</td>
                          <td style={{ padding: "11px 16px" }}><span style={{ padding: "2px 8px", background: "#ecfeff", color: TEAL, borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{g.matiere}</span></td>
                          <td style={{ padding: "11px 16px" }}><span style={{ fontSize: 16, fontWeight: 800, color: noteColor }}>{g.note}</span><span style={{ fontSize: 11, color: "#94a3b8" }}>/{g.note_max}</span></td>
                          <td style={{ padding: "11px 16px", color: "#7c3aed", fontSize: 12 }}>{g.sourate || "—"}</td>
                          <td style={{ padding: "11px 16px" }}><span style={{ padding: "2px 8px", background: "#f1f5f9", color: "#475569", borderRadius: 20, fontSize: 11 }}>{g.periode || "—"}</span></td>
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
          {section === "frais" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { label: "Total facturé",   val: fmtMoney(fees.reduce((s, f) => s + +f.montant, 0)),             color: "#0369a1", bg: "#eff6ff" },
                  { label: "Total encaissé",  val: fmtMoney(fees.filter(f => f.est_paye).reduce((s, f) => s + +f.montant, 0)), color: "#1a8f1a", bg: "#f0fdf0" },
                  { label: "Reste à payer",   val: fmtMoney(fees.filter(f => !f.est_paye).reduce((s, f) => s + +f.montant, 0)), color: "#dc2626", bg: "#fef2f2" },
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
                      {["Apprenant", "Type", "Montant", "Échéance", "Statut", "Action"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fees.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "#94a3b8" }}>Aucun frais enregistré</td></tr>
                    ) : fees.map(f => (
                      <tr key={f.id} style={{ borderBottom: "1px solid #f8fafc" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td style={{ padding: "11px 14px", fontWeight: 600, color: "#0f172a" }}>{f.student_prenom} {f.student_nom}</td>
                        <td style={{ padding: "11px 14px", color: "#475569" }}>{f.type_frais}</td>
                        <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0f172a" }}>{fmtMoney(f.montant)}</td>
                        <td style={{ padding: "11px 14px", color: "#64748b" }}>{f.echeance ? fmtDate(f.echeance) : "—"}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: f.est_paye ? "#f0fdf0" : "#fef2f2", color: f.est_paye ? "#1a8f1a" : "#dc2626" }}>
                            {f.est_paye ? "✓ Payé" : "Impayé"}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          {!f.est_paye && (
                            <button onClick={async () => {
                              const r = await put(`/fees/${f.id}/pay`, {});
                              if (r.success) { setFees(fs => fs.map((x: any) => x.id === f.id ? { ...x, est_paye: true } : x)); showToast("Paiement enregistré"); }
                            }} style={{ padding: "5px 10px", background: TEAL, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
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

          {/* ── BULLETINS ── */}
          {section === "bulletins" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {bulletins.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Aucun bulletin généré</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Saisissez des notes puis générez les bulletins de progression islamique.</div>
                  <button onClick={() => { setModal("gen-bulletin"); setForm({}); }} style={{ padding: "9px 20px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>⚙ Générer maintenant</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
                  {bulletins.map(b => {
                    const mention = b.mention || "—";
                    const mColor = mention.includes("Excellent") ? "#1a8f1a" : mention.includes("Très") ? "#0891b2" : mention.includes("Bien") ? "#7c3aed" : "#d97706";
                    return (
                      <div key={b.id} style={{ background: "white", borderRadius: 12, border: `1px solid ${b.is_published ? "#a5f3fc" : "#e2e8f0"}`, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{b.student_prenom} {b.student_nom}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{b.niveau} · {b.periode} — {b.annee_scolaire}</div>
                          </div>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: b.is_published ? "#ecfeff" : "#f8fafc", color: b.is_published ? TEAL : "#94a3b8" }}>
                            {b.is_published ? "✓ Publié" : "Brouillon"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>Moyenne générale</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: mColor }}>{b.moyenne_generale}/20</div>
                          </div>
                          <div style={{ flex: 1, textAlign: "right" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: mColor, background: "white", border: `1px solid ${mColor}22`, padding: "4px 10px", borderRadius: 6 }}>{mention}</span>
                          </div>
                        </div>
                        {!b.is_published && (
                          <button onClick={async () => {
                            const d = await put(`/bulletins/${b.id}/publish`, {});
                            if (d.success) { setBulletins(bs => bs.map((x: any) => x.id === b.id ? { ...x, is_published: true } : x)); showToast("Bulletin publié et familles notifiées"); }
                          }} style={{ marginTop: 12, width: "100%", padding: "8px 0", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                            Publier & notifier
                          </button>
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
