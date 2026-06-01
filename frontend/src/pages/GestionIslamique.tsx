import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

// ── CONFIG PAR MODE ───────────────────────────────────────────────────────────
const MODES = {
  mosque: {
    apiPrefix: "mosque-mgmt",
    label: "Gestion Mosquée",
    icon: "🕌",
    gradient: "linear-gradient(135deg,#065f46,#059669)",
    color: "#059669",
    colorBg: "#ecfdf5",
    colorBorder: "#a7f3d0",
    spinBorder: "#bbf7d0",
    tabs: ["dashboard","imams","members","donations","quran","announcements"] as const,
    tabLabels: { dashboard:"Dashboard", imams:"Imams", members:"Fidèles", donations:"Dons", quran:"Coran", announcements:"Annonces" },
    tabIcons:  { dashboard:"📊", imams:"🕌", members:"👥", donations:"💚", quran:"📖", announcements:"📣" },
  },
  imam: {
    apiPrefix: "imam-mgmt",
    label: "Gestion Réseau Imam",
    icon: "🕋",
    gradient: "linear-gradient(135deg,#4c1d95,#7c3aed)",
    color: "#7c3aed",
    colorBg: "#f5f3ff",
    colorBorder: "#ddd6fe",
    spinBorder: "#ede9fe",
    tabs: ["dashboard","imams","members","predications","mosques","donations","quran","announcements"] as const,
    tabLabels: { dashboard:"Dashboard", imams:"Imams", members:"Fidèles", predications:"Prédications", mosques:"Mosquées", donations:"Dons", quran:"Coran", announcements:"Annonces" },
    tabIcons:  { dashboard:"📊", imams:"🕋", members:"👥", predications:"📢", mosques:"🕌", donations:"💚", quran:"📖", announcements:"📣" },
  },
} as const;

type MosqueTab = typeof MODES.mosque.tabs[number];
type ImamTab   = typeof MODES.imam.tabs[number];
type AnyTab    = MosqueTab | ImamTab;

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const ROLES_FIDELE = ["imam", "muezzin", "enseignant", "responsable", "fidèle", "bénévole"];
const DON_TYPES    = ["sadaqa", "zakat", "waqf", "lilmosquee", "lilimam", "autre"];
const NIVEAUX_CORAN = ["Débutant", "Qa'idah", "Juz' Amma", "Hizb", "Mi-Coran", "Hafiz"];
const TYPES_PRED   = ["khutba", "cours", "conférence", "tarawih", "autre"];
const SPECS_IMAM   = ["Général","Coran","Fiqh","Hadith","Tafsir","Arabe","Akida"];

interface Props { mode: "mosque" | "imam" }

export default function GestionIslamique({ mode }: Props) {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();
  const M = MODES[mode];
  const BASE = (code: string) => `${API}/api/${M.apiPrefix}/${code}`;

  const [tab, setTab] = useState<AnyTab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [imams, setImams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [quranStudents, setQuranStudents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [predications, setPredications] = useState<any[]>([]);
  const [mosques, setMosques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Formulaires
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [editingRang, setEditingRang] = useState(1);
  const [iForm, setIForm] = useState({ nom:"", prenom:"", telephone:"", numero_h:"", rang:1, specialite:"Général", mosquee:"" });
  const [mForm, setMForm] = useState({ nom:"", prenom:"", telephone:"", numero_h:"", role:"fidèle" });
  const [dForm, setDForm] = useState({ donateur_nom:"", montant:"", type_don:"sadaqa" });
  const [qForm, setQForm] = useState({ nom:"", prenom:"", niveau_coran:"Débutant", telephone_parent:"" });
  const [aForm, setAForm] = useState({ titre:"", contenu:"", type:"general" });
  const [pForm, setPForm] = useState({ imam_nom:"", titre:"", type_pred:"khutba", date_pred:new Date().toISOString().split("T")[0], mosquee:"", notes:"" });
  const [msqForm, setMsqForm] = useState({ nom:"", adresse:"", responsable:"", telephone:"" });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    load("info+dashboard");
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || loading || error) return;
    if (tab === "imams")         load("imams");
    if (tab === "members")       load("members");
    if (tab === "donations")     load("donations");
    if (tab === "quran")         load("quran-students");
    if (tab === "announcements") load("announcements");
    if (tab === "predications")  load("predications");
    if (tab === "mosques")       load("mosques");
  }, [tab]);

  async function load(what: string) {
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    if (what === "info+dashboard") {
      setLoading(true);
      try {
        const [iRes, dRes] = await Promise.all([
          fetch(`${BASE(tenantCode!)}/info`, { headers: h }),
          fetch(`${BASE(tenantCode!)}/dashboard`, { headers: h }),
        ]);
        const iData = await iRes.json();
        if (!iData.success) { setError(iData.message || "Accès refusé"); setLoading(false); return; }
        setTenant(iData.tenant);
        const dData = await dRes.json();
        if (dData.success) setDash(dData);
      } catch { setError("Erreur de connexion"); }
      setLoading(false);
      return;
    }
    const r = await fetch(`${BASE(tenantCode!)}/${what}`, { headers: h });
    const d = await r.json();
    if (!d.success) return;
    if (what === "imams")          setImams(d.imams || []);
    if (what === "members")        setMembers(d.members || []);
    if (what === "donations")      setDonations(d.donations || []);
    if (what === "quran-students") setQuranStudents(d.students || []);
    if (what === "announcements")  setAnnouncements(d.announcements || []);
    if (what === "predications")   setPredications(d.predications || []);
    if (what === "mosques")        setMosques(d.mosques || []);
  }

  async function post(path: string, body: object) {
    setSaving(true);
    const r = await fetch(`${BASE(tenantCode!)}/${path}`, { method:"POST", headers:auth(), body:JSON.stringify(body) });
    const d = await r.json();
    setSaving(false);
    return d;
  }
  async function del(path: string) {
    await fetch(`${BASE(tenantCode!)}/${path}`, { method:"DELETE", headers:auth() });
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function saveImam() {
    if (!iForm.nom.trim()) return;
    const body = mode === "mosque"
      ? { nom:iForm.nom, prenom:iForm.prenom, telephone:iForm.telephone, numero_h:iForm.numero_h, rang:editingRang }
      : { nom:iForm.nom, prenom:iForm.prenom, telephone:iForm.telephone, numero_h:iForm.numero_h, specialite:iForm.specialite, mosquee:iForm.mosquee };
    const d = await post("imams", body);
    if (d.success) { setShowAdd(null); setIForm({ nom:"", prenom:"", telephone:"", numero_h:"", rang:1, specialite:"Général", mosquee:"" }); load("imams"); }
  }
  async function saveMember() {
    if (!mForm.nom.trim()) return;
    const d = await post("members", mForm);
    if (d.success) { setShowAdd(null); setMForm({ nom:"", prenom:"", telephone:"", numero_h:"", role:"fidèle" }); load("members"); }
  }
  async function saveDonation() {
    if (!dForm.montant) return;
    const d = await post("donations", { ...dForm, montant: +dForm.montant });
    if (d.success) { setShowAdd(null); setDForm({ donateur_nom:"", montant:"", type_don:"sadaqa" }); load("donations"); load("info+dashboard"); }
  }
  async function saveQuran() {
    if (!qForm.nom.trim()) return;
    const d = await post("quran-students", qForm);
    if (d.success) { setShowAdd(null); setQForm({ nom:"", prenom:"", niveau_coran:"Débutant", telephone_parent:"" }); load("quran-students"); }
  }
  async function saveAnnouncement() {
    if (!aForm.titre.trim() || !aForm.contenu.trim()) return;
    const d = await post("announcements", aForm);
    if (d.success) { setShowAdd(null); setAForm({ titre:"", contenu:"", type:"general" }); load("announcements"); }
  }
  async function savePredication() {
    if (!pForm.titre.trim()) return;
    const d = await post("predications", pForm);
    if (d.success) { setShowAdd(null); setPForm({ imam_nom:"", titre:"", type_pred:"khutba", date_pred:new Date().toISOString().split("T")[0], mosquee:"", notes:"" }); load("predications"); }
  }
  async function saveMosque() {
    if (!msqForm.nom.trim()) return;
    const d = await post("mosques", msqForm);
    if (d.success) { setShowAdd(null); setMsqForm({ nom:"", adresse:"", responsable:"", telephone:"" }); load("mosques"); }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inp: React.CSSProperties = { width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" };
  const inp2: React.CSSProperties = { ...inp, borderColor: M.colorBorder };
  const btnPrimary: React.CSSProperties = { padding:"10px 22px", background:M.color, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 };
  const btnGhost: React.CSSProperties = { padding:"9px 18px", background:"#f1f5f9", border:"none", borderRadius:8, cursor:"pointer", fontSize:13 };
  const btnDel: React.CSSProperties = { padding:"5px 12px", background:"#fff1f2", color:"#be123c", border:"1px solid #fecdd3", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600 };
  const card: React.CSSProperties = { background:"white", borderRadius:12, padding:"14px 18px", border:"1px solid #f1f5f9", marginBottom:10 };
  const formBox: React.CSSProperties = { background:M.colorBg, border:`1px solid ${M.colorBorder}`, borderRadius:12, padding:"18px 20px", marginBottom:18 };
  const grid2: React.CSSProperties = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}>
      <div style={{ width:34, height:34, border:`4px solid ${M.spinBorder}`, borderTopColor:M.color, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ maxWidth:480, margin:"80px auto", padding:24, textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h2 style={{ color:"#0f172a" }}>{error}</h2>
      <button onClick={() => navigate("/gestion-interne")} style={btnPrimary}>← Retour</button>
    </div>
  );

  const TABS = M.tabs.map(id => ({ id, label:(M.tabLabels as any)[id], icon:(M.tabIcons as any)[id] }));

  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px", fontFamily:"system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ background:M.gradient, borderRadius:16, padding:"20px 24px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{M.icon}</div>
          <div>
            <div style={{ fontWeight:800, fontSize:20, color:"white" }}>{tenant?.name || M.label}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", marginTop:3 }}>{tenantCode} · {M.label}</div>
          </div>
        </div>
        <button onClick={() => navigate("/gestion-interne")} style={{ padding:"8px 16px", background:"rgba(255,255,255,0.18)", color:"white", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }}>← Retour</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:22, background:"#f8fafc", borderRadius:12, padding:4, overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as AnyTab)}
            style={{ flex:1, minWidth:72, padding:"9px 6px", border:"none", borderRadius:10, cursor:"pointer", fontSize:12, fontWeight:tab===t.id?700:500, background:tab===t.id?"white":"transparent", color:tab===t.id?M.color:"#64748b", boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.1)":"none", whiteSpace:"nowrap", transition:"all 0.15s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dash && (
        <div style={{ animation:"fadeIn 0.2s ease" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
            {[
              { label:"Imams", value:dash.totalImams, icon:"🕋", color:M.color },
              { label:"Fidèles", value:dash.totalMembers, icon:"👥", color:"#3b82f6" },
              ...(mode==="imam" ? [{ label:"Prédications / mois", value:dash.predsMois, icon:"📢", color:"#8b5cf6" }] : []),
              ...(mode==="mosque" ? [{ label:"Élèves Coran", value:dash.quranStudents, icon:"📖", color:"#d97706" }] : []),
              { label:"Dons ce mois", value:fmtMoney(dash.donsMois), icon:"💚", color:"#059669", small:true },
              ...(mode==="imam" ? [{ label:"Mosquées", value:dash.totalMosques, icon:"🕌", color:"#0891b2" }] : [{ label:"Élèves Coran", value:dash.quranStudents, icon:"📖", color:"#d97706" }]),
            ].filter((_, i, arr) => arr.findIndex(a => a.label === arr[i].label) === i).slice(0,5).map((s, i) => (
              <div key={i} style={{ background:"white", borderRadius:12, padding:"16px 14px", border:"1px solid #f1f5f9", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontWeight:800, fontSize:(s as any).small ? 14 : 26, color:s.color }}>{s.value ?? 0}</div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {mode==="imam" && dash.recentPredications?.length > 0 && (
            <div style={{ background:"white", borderRadius:14, padding:"18px 20px", border:"1px solid #f1f5f9" }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>📢 Dernières prédications</div>
              {dash.recentPredications.map((p: any) => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f8fafc" }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{p.titre}</div>
                    <div style={{ fontSize:12, color:"#64748b" }}>{p.imam_nom || "—"} · {p.mosquee || "—"}</div>
                  </div>
                  <div style={{ fontSize:12, color:"#94a3b8" }}>{fmtDate(p.date_pred)}</div>
                </div>
              ))}
            </div>
          )}
          {mode==="mosque" && dash.recentAnnouncements?.length > 0 && (
            <div style={{ background:"white", borderRadius:14, padding:"18px 20px", border:"1px solid #f1f5f9" }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>📣 Dernières annonces</div>
              {dash.recentAnnouncements.map((a: any) => (
                <div key={a.id} style={{ padding:"10px 0", borderBottom:"1px solid #f8fafc" }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{a.titre}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{a.contenu}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>{fmtDate(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── IMAMS ── */}
      {tab === "imams" && (
        <div style={{ animation:"fadeIn 0.2s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>🕋 Imams ({imams.length})</h2>
            <button onClick={() => setShowAdd(showAdd==="imams"?null:"imams")} style={btnPrimary}>{showAdd==="imams"?"✕ Annuler":"+ Ajouter"}</button>
          </div>
          {showAdd === "imams" && (
            <div style={formBox}>
              {mode==="mosque" && (
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Rang (1 = Imam principal)</label>
                  <select style={inp2} value={editingRang} onChange={e => setEditingRang(+e.target.value)}>
                    <option value={1}>Rang 1 — Imam Principal</option>
                    <option value={2}>Rang 2 — Imam 2ème</option>
                    <option value={3}>Rang 3 — Imam 3ème</option>
                  </select>
                </div>
              )}
              <div style={grid2}>
                <input style={inp2} placeholder="Nom *" value={iForm.nom} onChange={e => setIForm(f=>({...f,nom:e.target.value}))} />
                <input style={inp2} placeholder="Prénom" value={iForm.prenom} onChange={e => setIForm(f=>({...f,prenom:e.target.value}))} />
                <input style={inp2} placeholder="Téléphone" value={iForm.telephone} onChange={e => setIForm(f=>({...f,telephone:e.target.value}))} />
                <input style={inp2} placeholder="Numéro H" value={iForm.numero_h} onChange={e => setIForm(f=>({...f,numero_h:e.target.value}))} />
                {mode==="imam" && <>
                  <select style={inp2} value={iForm.specialite} onChange={e => setIForm(f=>({...f,specialite:e.target.value}))}>
                    {SPECS_IMAM.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input style={inp2} placeholder="Mosquée affiliée" value={iForm.mosquee} onChange={e => setIForm(f=>({...f,mosquee:e.target.value}))} />
                </>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveImam} disabled={saving} style={btnPrimary}>{saving?"…":"Enregistrer"}</button>
                <button onClick={() => setShowAdd(null)} style={btnGhost}>Annuler</button>
              </div>
            </div>
          )}
          {imams.length === 0 ? <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Aucun imam enregistré.</div>
          : imams.map(imam => (
            <div key={imam.id} style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{imam.prenom ? `${imam.prenom} ${imam.nom}` : imam.nom}</div>
                  {imam.telephone && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>📞 {imam.telephone}</div>}
                  {mode==="mosque" && imam.rang && <div style={{ fontSize:12, color:"#64748b" }}>Rang {imam.rang}</div>}
                  {mode==="imam" && imam.specialite && <div style={{ fontSize:12, color:"#64748b" }}>{imam.specialite} · {imam.mosquee}</div>}
                </div>
                <button onClick={() => del(mode==="mosque" ? `imams/${imam.rang}` : `imams/${imam.id}`).then(() => load("imams"))} style={btnDel}>Retirer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FIDÈLES ── */}
      {tab === "members" && (
        <div style={{ animation:"fadeIn 0.2s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>👥 Fidèles ({members.length})</h2>
            <button onClick={() => setShowAdd(showAdd==="members"?null:"members")} style={btnPrimary}>{showAdd==="members"?"✕ Annuler":"+ Ajouter"}</button>
          </div>
          {showAdd === "members" && (
            <div style={formBox}>
              <div style={grid2}>
                <input style={inp2} placeholder="Nom *" value={mForm.nom} onChange={e => setMForm(f=>({...f,nom:e.target.value}))} />
                <input style={inp2} placeholder="Prénom" value={mForm.prenom} onChange={e => setMForm(f=>({...f,prenom:e.target.value}))} />
                <input style={inp2} placeholder="Téléphone" value={mForm.telephone} onChange={e => setMForm(f=>({...f,telephone:e.target.value}))} />
                <input style={inp2} placeholder="Numéro H (si membre)" value={mForm.numero_h} onChange={e => setMForm(f=>({...f,numero_h:e.target.value}))} />
                <select style={inp2} value={mForm.role} onChange={e => setMForm(f=>({...f,role:e.target.value}))}>
                  {ROLES_FIDELE.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveMember} disabled={saving} style={btnPrimary}>{saving?"…":"Enregistrer"}</button>
                <button onClick={() => setShowAdd(null)} style={btnGhost}>Annuler</button>
              </div>
            </div>
          )}
          {members.length === 0 ? <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Aucun fidèle enregistré.</div>
          : members.map(m => (
            <div key={m.id} style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{m.prenom ? `${m.prenom} ${m.nom}` : m.nom}</div>
                  {m.telephone && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>📞 {m.telephone}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ padding:"2px 10px", background:M.colorBg, color:M.color, borderRadius:20, fontSize:11, fontWeight:600, border:`1px solid ${M.colorBorder}` }}>{m.role}</span>
                  <button onClick={() => del(`members/${m.id}`).then(() => load("members"))} style={btnDel}>Retirer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PRÉDICATIONS (imam uniquement) ── */}
      {tab === "predications" && mode === "imam" && (
        <div style={{ animation:"fadeIn 0.2s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>📢 Prédications ({predications.length})</h2>
            <button onClick={() => setShowAdd(showAdd==="pred"?null:"pred")} style={btnPrimary}>{showAdd==="pred"?"✕ Annuler":"+ Nouvelle"}</button>
          </div>
          {showAdd === "pred" && (
            <div style={formBox}>
              <div style={grid2}>
                <input style={inp2} placeholder="Titre *" value={pForm.titre} onChange={e => setPForm(f=>({...f,titre:e.target.value}))} />
                <input style={inp2} placeholder="Imam prédicateur" value={pForm.imam_nom} onChange={e => setPForm(f=>({...f,imam_nom:e.target.value}))} />
                <select style={inp2} value={pForm.type_pred} onChange={e => setPForm(f=>({...f,type_pred:e.target.value}))}>
                  {TYPES_PRED.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input style={inp2} type="date" value={pForm.date_pred} onChange={e => setPForm(f=>({...f,date_pred:e.target.value}))} />
                <input style={inp2} placeholder="Mosquée" value={pForm.mosquee} onChange={e => setPForm(f=>({...f,mosquee:e.target.value}))} />
                <input style={inp2} placeholder="Notes" value={pForm.notes} onChange={e => setPForm(f=>({...f,notes:e.target.value}))} />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={savePredication} disabled={saving} style={btnPrimary}>{saving?"…":"Enregistrer"}</button>
                <button onClick={() => setShowAdd(null)} style={btnGhost}>Annuler</button>
              </div>
            </div>
          )}
          {predications.length === 0 ? <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Aucune prédication enregistrée.</div>
          : predications.map(p => (
            <div key={p.id} style={{ ...card, borderLeft:`4px solid ${M.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{p.titre}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>👤 {p.imam_nom || "—"} · 🕌 {p.mosquee || "—"}</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{fmtDate(p.date_pred)} · {p.type_pred}</div>
                  {p.notes && <div style={{ fontSize:12, color:"#64748b", marginTop:4, fontStyle:"italic" }}>{p.notes}</div>}
                </div>
                <button onClick={() => del(`predications/${p.id}`).then(() => load("predications"))} style={btnDel}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MOSQUÉES PARTENAIRES (imam uniquement) ── */}
      {tab === "mosques" && mode === "imam" && (
        <div style={{ animation:"fadeIn 0.2s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>🕌 Mosquées affiliées ({mosques.length})</h2>
            <button onClick={() => setShowAdd(showAdd==="mosques"?null:"mosques")} style={btnPrimary}>{showAdd==="mosques"?"✕ Annuler":"+ Ajouter"}</button>
          </div>
          {showAdd === "mosques" && (
            <div style={formBox}>
              <div style={grid2}>
                <input style={inp2} placeholder="Nom de la mosquée *" value={msqForm.nom} onChange={e => setMsqForm(f=>({...f,nom:e.target.value}))} />
                <input style={inp2} placeholder="Adresse / quartier" value={msqForm.adresse} onChange={e => setMsqForm(f=>({...f,adresse:e.target.value}))} />
                <input style={inp2} placeholder="Responsable" value={msqForm.responsable} onChange={e => setMsqForm(f=>({...f,responsable:e.target.value}))} />
                <input style={inp2} placeholder="Téléphone" value={msqForm.telephone} onChange={e => setMsqForm(f=>({...f,telephone:e.target.value}))} />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveMosque} disabled={saving} style={btnPrimary}>{saving?"…":"Enregistrer"}</button>
                <button onClick={() => setShowAdd(null)} style={btnGhost}>Annuler</button>
              </div>
            </div>
          )}
          {mosques.length === 0 ? <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Aucune mosquée affiliée.</div>
          : mosques.map(m => (
            <div key={m.id} style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>🕌 {m.nom}</div>
                  {m.adresse && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>📍 {m.adresse}</div>}
                  {m.responsable && <div style={{ fontSize:12, color:"#64748b" }}>👤 {m.responsable}</div>}
                  {m.telephone && <div style={{ fontSize:12, color:"#64748b" }}>📞 {m.telephone}</div>}
                </div>
                <button onClick={() => del(`mosques/${m.id}`).then(() => load("mosques"))} style={btnDel}>Retirer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DONS ── */}
      {tab === "donations" && (
        <div style={{ animation:"fadeIn 0.2s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>💚 Dons ({donations.length})</h2>
            <button onClick={() => setShowAdd(showAdd==="don"?null:"don")} style={btnPrimary}>{showAdd==="don"?"✕ Annuler":"+ Enregistrer"}</button>
          </div>
          {showAdd === "don" && (
            <div style={formBox}>
              <div style={grid2}>
                <input style={inp2} placeholder="Nom donateur (optionnel)" value={dForm.donateur_nom} onChange={e => setDForm(f=>({...f,donateur_nom:e.target.value}))} />
                <input style={inp2} type="number" placeholder="Montant (GNF) *" value={dForm.montant} onChange={e => setDForm(f=>({...f,montant:e.target.value}))} />
                <select style={inp2} value={dForm.type_don} onChange={e => setDForm(f=>({...f,type_don:e.target.value}))}>
                  {DON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveDonation} disabled={saving} style={btnPrimary}>{saving?"…":"Enregistrer"}</button>
                <button onClick={() => setShowAdd(null)} style={btnGhost}>Annuler</button>
              </div>
            </div>
          )}
          {donations.length === 0 ? <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Aucun don enregistré.</div>
          : donations.map(d => (
            <div key={d.id} style={{ ...card, borderLeft:`4px solid ${M.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>💚 {d.donateur_nom || "Anonyme"}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{d.type_don} · {fmtDate(d.date_don)}</div>
                </div>
                <div style={{ fontWeight:800, fontSize:16, color:M.color }}>{fmtMoney(d.montant)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COURS CORAN ── */}
      {tab === "quran" && (
        <div style={{ animation:"fadeIn 0.2s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>📖 Élèves Coran ({quranStudents.length})</h2>
            <button onClick={() => setShowAdd(showAdd==="quran"?null:"quran")} style={btnPrimary}>{showAdd==="quran"?"✕ Annuler":"+ Ajouter"}</button>
          </div>
          {showAdd === "quran" && (
            <div style={formBox}>
              <div style={grid2}>
                <input style={inp2} placeholder="Nom *" value={qForm.nom} onChange={e => setQForm(f=>({...f,nom:e.target.value}))} />
                <input style={inp2} placeholder="Prénom" value={qForm.prenom} onChange={e => setQForm(f=>({...f,prenom:e.target.value}))} />
                <select style={inp2} value={qForm.niveau_coran} onChange={e => setQForm(f=>({...f,niveau_coran:e.target.value}))}>
                  {NIVEAUX_CORAN.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <input style={inp2} placeholder="Tél. parent / tuteur" value={qForm.telephone_parent} onChange={e => setQForm(f=>({...f,telephone_parent:e.target.value}))} />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveQuran} disabled={saving} style={btnPrimary}>{saving?"…":"Enregistrer"}</button>
                <button onClick={() => setShowAdd(null)} style={btnGhost}>Annuler</button>
              </div>
            </div>
          )}
          {quranStudents.length === 0 ? <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Aucun élève enregistré.</div>
          : quranStudents.map(s => (
            <div key={s.id} style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{s.prenom ? `${s.prenom} ${s.nom}` : s.nom}</div>
                  {s.telephone_parent && <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>📞 Parent : {s.telephone_parent}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ padding:"2px 10px", background:M.colorBg, color:M.color, borderRadius:20, fontSize:11, fontWeight:600, border:`1px solid ${M.colorBorder}` }}>📖 {s.niveau_coran}</span>
                  <button onClick={() => del(`quran-students/${s.id}`).then(() => load("quran-students"))} style={btnDel}>Retirer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ANNONCES ── */}
      {tab === "announcements" && (
        <div style={{ animation:"fadeIn 0.2s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>📣 Annonces ({announcements.length})</h2>
            <button onClick={() => setShowAdd(showAdd==="ann"?null:"ann")} style={btnPrimary}>{showAdd==="ann"?"✕ Annuler":"+ Publier"}</button>
          </div>
          {showAdd === "ann" && (
            <div style={formBox}>
              <input style={{ ...inp2, marginBottom:10 }} placeholder="Titre *" value={aForm.titre} onChange={e => setAForm(f=>({...f,titre:e.target.value}))} />
              <textarea style={{ ...inp2, resize:"vertical", minHeight:80, marginBottom:10 }} placeholder="Contenu *" value={aForm.contenu} onChange={e => setAForm(f=>({...f,contenu:e.target.value}))} />
              <select style={{ ...inp2, marginBottom:12 }} value={aForm.type} onChange={e => setAForm(f=>({...f,type:e.target.value}))}>
                <option value="general">Général</option>
                <option value="urgent">Urgent</option>
                <option value="priere">Prière</option>
                <option value="reunion">Réunion</option>
                <option value="evenement">Événement</option>
              </select>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveAnnouncement} disabled={saving} style={btnPrimary}>{saving?"…":"Publier"}</button>
                <button onClick={() => setShowAdd(null)} style={btnGhost}>Annuler</button>
              </div>
            </div>
          )}
          {announcements.length === 0 ? <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Aucune annonce publiée.</div>
          : announcements.map(a => (
            <div key={a.id} style={{ ...card, borderLeft:`4px solid ${M.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{a.titre}</div>
                  <div style={{ fontSize:13, color:"#334155", lineHeight:1.6, marginBottom:6 }}>{a.contenu}</div>
                  <div style={{ display:"flex", gap:8, fontSize:11, color:"#94a3b8" }}>
                    <span style={{ background:M.colorBg, color:M.color, padding:"2px 8px", borderRadius:6, fontWeight:600, border:`1px solid ${M.colorBorder}` }}>{a.type}</span>
                    <span>{fmtDate(a.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => del(`announcements/${a.id}`).then(() => load("announcements"))} style={{ ...btnDel, marginLeft:12 }}>Archiver</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
