import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = (code: string) => `${API}/api/scientist-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "members" | "publications" | "projects" | "announcements";
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const INDIGO = "#4338ca";
const INDIGO_BG = "#eef2ff";
const INDIGO_BORDER = "#c7d2fe";

const STATUT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  en_cours:  { bg: "#eff6ff", color: "#1d4ed8", label: "En cours" },
  publie:    { bg: "#f0fdf0", color: "#156315", label: "Publié" },
  soumis:    { bg: "#fffbeb", color: "#b45309", label: "Soumis" },
  rejete:    { bg: "#fff1f2", color: "#be123c", label: "Rejeté" },
  termine:   { bg: "#f0fdf0", color: "#156315", label: "Terminé" },
  planifie:  { bg: "#f5f3ff", color: "#7c3aed", label: "Planifié" },
  suspendu:  { bg: "#f8fafc", color: "#475569", label: "Suspendu" },
};

export default function GestionScientifique() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddPub, setShowAddPub] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [mForm, setMForm] = useState({ nom: "", prenom: "", telephone: "", numero_h: "", titre: "Chercheur", domaine: "", institution: "" });
  const [pForm, setPForm] = useState({ auteur_id: "", auteur_nom: "", titre: "", type_pub: "article", domaine: "", statut: "en_cours", date_pub: new Date().toISOString().split("T")[0], resume: "" });
  const [prjForm, setPrjForm] = useState({ titre: "", description: "", responsable: "", statut: "en_cours", date_debut: new Date().toISOString().split("T")[0], date_fin: "", budget: "" });
  const [aForm, setAForm] = useState({ titre: "", contenu: "", type: "general" });

  useEffect(() => { if (!user) { navigate("/login"); return; } if (!tenantCode) return; loadAll(); }, [tenantCode]);
  useEffect(() => {
    if (!tenantCode || !tenant) return;
    if (tab === "members") loadMembers();
    else if (tab === "publications") loadPublications();
    else if (tab === "projects") loadProjects();
    else if (tab === "announcements") loadAnnouncements();
  }, [tab]);

  async function loadAll() {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([fetch(`${BASE(tenantCode!)}/info`, { headers: auth() }), fetch(`${BASE(tenantCode!)}/dashboard`, { headers: auth() })]);
      const tData = await tRes.json();
      if (!tData.success) { setError(tData.message || "Accès refusé"); setLoading(false); return; }
      setTenant(tData.tenant);
      const dData = await dRes.json();
      if (dData.success) setDash(dData);
    } catch { setError("Erreur de connexion au serveur"); }
    setLoading(false);
  }

  async function loadMembers() { const r = await fetch(`${BASE(tenantCode!)}/members`, { headers: auth() }); const d = await r.json(); if (d.success) setMembers(d.members); }
  async function loadPublications() { const r = await fetch(`${BASE(tenantCode!)}/publications`, { headers: auth() }); const d = await r.json(); if (d.success) setPublications(d.publications); }
  async function loadProjects() { const r = await fetch(`${BASE(tenantCode!)}/projects`, { headers: auth() }); const d = await r.json(); if (d.success) setProjects(d.projects); }
  async function loadAnnouncements() { const r = await fetch(`${BASE(tenantCode!)}/announcements`, { headers: auth() }); const d = await r.json(); if (d.success) setAnnouncements(d.announcements); }

  async function addMember() {
    if (!mForm.nom.trim()) return; setSaving(true);
    await fetch(`${BASE(tenantCode!)}/members`, { method: "POST", headers: auth(), body: JSON.stringify(mForm) });
    setSaving(false); setShowAddMember(false); setMForm({ nom: "", prenom: "", telephone: "", numero_h: "", titre: "Chercheur", domaine: "", institution: "" });
    loadMembers(); loadAll();
  }
  async function deleteMember(id: number) { if (!confirm("Retirer ce chercheur ?")) return; await fetch(`${BASE(tenantCode!)}/members/${id}`, { method: "DELETE", headers: auth() }); loadMembers(); loadAll(); }

  async function addPublication() {
    if (!pForm.titre.trim()) return; setSaving(true);
    const sel = members.find((m: any) => String(m.id) === pForm.auteur_id);
    await fetch(`${BASE(tenantCode!)}/publications`, { method: "POST", headers: auth(), body: JSON.stringify({ ...pForm, auteur_nom: sel ? `${sel.nom} ${sel.prenom||""}`.trim() : pForm.auteur_nom }) });
    setSaving(false); setShowAddPub(false); setPForm({ auteur_id: "", auteur_nom: "", titre: "", type_pub: "article", domaine: "", statut: "en_cours", date_pub: new Date().toISOString().split("T")[0], resume: "" });
    loadPublications(); loadAll();
  }
  async function updatePubStatut(id: number, statut: string) { await fetch(`${BASE(tenantCode!)}/publications/${id}/statut`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) }); loadPublications(); loadAll(); }
  async function deletePub(id: number) { if (!confirm("Supprimer cette publication ?")) return; await fetch(`${BASE(tenantCode!)}/publications/${id}`, { method: "DELETE", headers: auth() }); loadPublications(); loadAll(); }

  async function addProject() {
    if (!prjForm.titre.trim()) return; setSaving(true);
    await fetch(`${BASE(tenantCode!)}/projects`, { method: "POST", headers: auth(), body: JSON.stringify(prjForm) });
    setSaving(false); setShowAddProject(false); setPrjForm({ titre: "", description: "", responsable: "", statut: "en_cours", date_debut: new Date().toISOString().split("T")[0], date_fin: "", budget: "" });
    loadProjects(); loadAll();
  }
  async function updatePrjStatut(id: number, statut: string) { await fetch(`${BASE(tenantCode!)}/projects/${id}/statut`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) }); loadProjects(); loadAll(); }
  async function deleteProject(id: number) { if (!confirm("Supprimer ce projet ?")) return; await fetch(`${BASE(tenantCode!)}/projects/${id}`, { method: "DELETE", headers: auth() }); loadProjects(); loadAll(); }

  async function addAnn() {
    if (!aForm.titre.trim() || !aForm.contenu.trim()) return; setSaving(true);
    await fetch(`${BASE(tenantCode!)}/announcements`, { method: "POST", headers: auth(), body: JSON.stringify(aForm) });
    setSaving(false); setShowAddAnn(false); setAForm({ titre: "", contenu: "", type: "general" });
    loadAnnouncements(); loadAll();
  }
  async function deleteAnn(id: number) { if (!confirm("Supprimer cette annonce ?")) return; await fetch(`${BASE(tenantCode!)}/announcements/${id}`, { method: "DELETE", headers: auth() }); loadAnnouncements(); loadAll(); }

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}><div style={{ width:32, height:32, border:"3px solid #c7d2fe", borderTopColor:INDIGO, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (error) return <div style={{ maxWidth:500, margin:"60px auto", textAlign:"center" }}><div style={{ fontSize:48 }}>🔒</div><h2>{error}</h2><button onClick={() => navigate(-1)} style={{ padding:"10px 24px", background:INDIGO, color:"white", border:"none", borderRadius:8, cursor:"pointer" }}>Retour</button></div>;

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "dashboard", label: "Tableau de bord", emoji: "📊" },
    { key: "members", label: "Chercheurs", emoji: "🔬" },
    { key: "publications", label: "Publications", emoji: "📄" },
    { key: "projects", label: "Projets", emoji: "🧪" },
    { key: "announcements", label: "Annonces", emoji: "📣" },
  ];

  const inp: React.CSSProperties = { width:"100%", border:`1px solid ${INDIGO_BORDER}`, borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:12, fontWeight:600, color:"#3730a3", marginBottom:4 };
  const btnP: React.CSSProperties = { padding:"10px 20px", background:INDIGO, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 };
  const btnS: React.CSSProperties = { padding:"9px 18px", background:"white", color:INDIGO, border:`2px solid ${INDIGO}`, borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 };

  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:"0 0 60px" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion scientifique — ${tenant?.name || ""}`}
        startUrl={`/gestion-scientifique/${tenantCode}`}
        themeColor={INDIGO}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @media(max-width:640px){.gestion-btn-secondary{display:none!important}}`}</style>

      <div style={{ background:"linear-gradient(135deg,#3730a3,#4338ca)", padding:"28px 28px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0 }}>🔬</div>
          <div style={{ flex:1, minWidth:0, overflow:"hidden" }}>
            <div style={{ fontWeight:800, color:"white", fontSize:20, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tenant?.name || "Scientifiques"}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:2 }}>Code : {tenantCode} · Scientifiques & Recherche</div>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <InstallAppButton />
            <button className="gestion-btn-secondary" onClick={() => navigate(`/scientifique/${tenantCode}`)} style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontWeight:600, fontSize:13 }}>🌐 Vitrine</button>
            <button className="gestion-btn-secondary" onClick={() => navigate(-1)} style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:600, fontSize:13 }}>← Retour</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
          {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={{ padding:"10px 18px", background:tab===t.key?"white":"transparent", color:tab===t.key?INDIGO:"rgba(255,255,255,0.8)", border:"none", borderRadius:"8px 8px 0 0", cursor:"pointer", fontWeight:tab===t.key?700:500, fontSize:13, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}><span>{t.emoji}</span>{t.label}</button>)}
        </div>
      </div>

      <div style={{ padding:"24px 28px" }}>

        {tab === "dashboard" && dash && (
          <div style={{ display:"flex", flexDirection:"column", gap:20, animation:"fadeIn 0.2s ease" }}>

            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr) repeat(2,1fr)", gap:14 }}>
              {[
                { label:"Chercheurs",          val:dash.totalMembers,       color:INDIGO,     bg:INDIGO_BG,    icon:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                { label:"Publications",        val:dash.totalPublications,  color:"#3730a3",  bg:"#eef2ff",    icon:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                { label:"Projets en cours",    val:dash.projetsEnCours,     color:"#6d28d9",  bg:"#f5f3ff",    icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                { label:"Annonces actives",    val:dash.totalAnnouncements, color:"#312e81",  bg:"#eef2ff",    icon:"M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
              ].map((s,i) => (
                <div key={i} style={{ background:"white", borderRadius:12, border:"1px solid #e2e8f0", padding:"16px 18px", borderLeft:`3px solid ${s.color}`, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</span>
                    <div style={{ width:30, height:30, borderRadius:8, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="14" height="14" fill="none" stroke={s.color} strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                    </div>
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, color:"#0f172a" }}>{s.val ?? 0}</div>
                </div>
              ))}
            </div>

            {/* Banner recherche */}
            <div style={{ background:"linear-gradient(135deg,#312e81,#4338ca)", borderRadius:14, padding:"18px 24px", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 20px rgba(67,56,202,0.35)" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, opacity:0.75, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Réseau de recherche</div>
                <div style={{ fontSize:26, fontWeight:800 }}>{dash.totalMembers ?? 0} chercheurs actifs</div>
                <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{dash.totalPublications ?? 0} publications · {dash.projetsEnCours ?? 0} projets en cours</div>
              </div>
              <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="24" height="24" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
            </div>

            {/* Actions rapides */}
            <div style={{ background:"white", borderRadius:12, border:"1px solid #e2e8f0", padding:"16px 20px" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", marginBottom:12 }}>Actions rapides</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {[
                  { label:"Ajouter chercheur", tab:"members",       emoji:"🔬" },
                  { label:"Publier résultat",  tab:"publications",  emoji:"📄" },
                  { label:"Nouveau projet",    tab:"projects",      emoji:"🧪" },
                  { label:"Annonce",           tab:"announcements", emoji:"📣" },
                ].map(a=>(
                  <button key={a.tab} onClick={()=>setTab(a.tab as Tab)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"12px 8px", background:INDIGO_BG, border:`1px solid ${INDIGO_BORDER}`, borderRadius:10, cursor:"pointer" }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=INDIGO;}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=INDIGO_BG;}}>
                    <span style={{ fontSize:22 }}>{a.emoji}</span>
                    <span style={{ fontSize:11, fontWeight:600, color:INDIGO }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Publications récentes */}
            {dash.recentPublications?.length > 0 ? (
              <div style={{ background:"white", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
                <div style={{ padding:"14px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>Publications récentes</span>
                  <button onClick={()=>setTab("publications")} style={{ fontSize:12, color:INDIGO, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Voir toutes →</button>
                </div>
                {dash.recentPublications.map((p:any)=>{
                  const sc=STATUT_COLORS[p.statut]||STATUT_COLORS.en_cours;
                  return (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid #f8fafc" }}>
                      <div style={{ width:38, height:38, borderRadius:8, background:INDIGO_BG, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="16" height="16" fill="none" stroke={INDIGO} strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, color:"#0f172a", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.titre}</div>
                        <div style={{ fontSize:11, color:"#64748b" }}>{p.auteur_nom||"Auteur"} · {fmtDate(p.date_pub)} · {p.type_pub}</div>
                      </div>
                      <span style={{ padding:"3px 10px", background:sc.bg, color:sc.color, borderRadius:20, fontSize:11, fontWeight:600, flexShrink:0 }}>{sc.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>
                <div style={{ fontSize:48 }}>🔬</div>
                <div style={{ fontSize:13, marginTop:8 }}>Aucune donnée. Commencez par ajouter des chercheurs.</div>
              </div>
            )}
          </div>
        )}

        {tab === "members" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800 }}>Chercheurs & scientifiques ({members.length})</h2>
              <button onClick={() => setShowAddMember(true)} style={btnP}>+ Ajouter</button>
            </div>
            {showAddMember && (
              <div style={{ background:INDIGO_BG, border:`1px solid ${INDIGO_BORDER}`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:"#3730a3" }}>Nouveau chercheur</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div><label style={lbl}>Nom *</label><input value={mForm.nom} onChange={e => setMForm({...mForm, nom:e.target.value})} placeholder="Nom" style={inp} /></div>
                  <div><label style={lbl}>Prénom</label><input value={mForm.prenom} onChange={e => setMForm({...mForm, prenom:e.target.value})} placeholder="Prénom" style={inp} /></div>
                  <div><label style={lbl}>Téléphone</label><input value={mForm.telephone} onChange={e => setMForm({...mForm, telephone:e.target.value})} placeholder="+224..." style={inp} /></div>
                  <div><label style={lbl}>Numéro H</label><input value={mForm.numero_h} onChange={e => setMForm({...mForm, numero_h:e.target.value})} placeholder="Optionnel" style={inp} /></div>
                  <div><label style={lbl}>Titre</label><select value={mForm.titre} onChange={e => setMForm({...mForm, titre:e.target.value})} style={inp}><option>Chercheur</option><option>Docteur</option><option>Professeur</option><option>Ingénieur</option><option>Étudiant doctorat</option></select></div>
                  <div><label style={lbl}>Domaine</label><input value={mForm.domaine} onChange={e => setMForm({...mForm, domaine:e.target.value})} placeholder="Ex: Médecine, Physique..." style={inp} /></div>
                  <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Institution</label><input value={mForm.institution} onChange={e => setMForm({...mForm, institution:e.target.value})} placeholder="Université, laboratoire..." style={inp} /></div>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button onClick={addMember} disabled={saving} style={btnP}>{saving?"Enregistrement...":"Enregistrer"}</button>
                  <button onClick={() => setShowAddMember(false)} style={btnS}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {members.length === 0 && <div style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>Aucun chercheur enregistré</div>}
              {members.map((m: any) => (
                <div key={m.id} style={{ background:"white", border:`1px solid ${INDIGO_BORDER}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:INDIGO_BG, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🔬</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:"#0f172a", fontSize:14 }}>{m.titre} {m.nom} {m.prenom}</div>
                    <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{m.domaine} {m.institution ? `· ${m.institution}` : ""} {m.telephone ? `· ${m.telephone}` : ""}</div>
                  </div>
                  {m.numero_h && <span style={{ fontFamily:"monospace", fontSize:11, background:"#f1f5f9", color:"#64748b", padding:"2px 8px", borderRadius:6 }}>{m.numero_h}</span>}
                  {userIsAdmin && <button onClick={() => deleteMember(m.id)} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:12, fontWeight:600 }}>Retirer</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "publications" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800 }}>Publications & travaux ({publications.length})</h2>
              <button onClick={() => setShowAddPub(true)} style={btnP}>+ Nouvelle publication</button>
            </div>
            {showAddPub && (
              <div style={{ background:INDIGO_BG, border:`1px solid ${INDIGO_BORDER}`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:"#3730a3" }}>Nouvelle publication</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Titre *</label><input value={pForm.titre} onChange={e => setPForm({...pForm, titre:e.target.value})} placeholder="Titre de la publication" style={inp} /></div>
                  <div><label style={lbl}>Auteur</label><select value={pForm.auteur_id} onChange={e => setPForm({...pForm, auteur_id:e.target.value})} style={inp}><option value="">— Non précisé —</option>{members.map((m:any) => <option key={m.id} value={m.id}>{m.nom} {m.prenom}</option>)}</select></div>
                  <div><label style={lbl}>Type</label><select value={pForm.type_pub} onChange={e => setPForm({...pForm, type_pub:e.target.value})} style={inp}><option value="article">Article</option><option value="these">Thèse</option><option value="rapport">Rapport</option><option value="brevet">Brevet</option><option value="communication">Communication</option></select></div>
                  <div><label style={lbl}>Domaine</label><input value={pForm.domaine} onChange={e => setPForm({...pForm, domaine:e.target.value})} placeholder="Médecine, Physique..." style={inp} /></div>
                  <div><label style={lbl}>Statut</label><select value={pForm.statut} onChange={e => setPForm({...pForm, statut:e.target.value})} style={inp}><option value="en_cours">En cours</option><option value="soumis">Soumis</option><option value="publie">Publié</option></select></div>
                  <div><label style={lbl}>Date</label><input type="date" value={pForm.date_pub} onChange={e => setPForm({...pForm, date_pub:e.target.value})} style={inp} /></div>
                  <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Résumé</label><textarea value={pForm.resume} onChange={e => setPForm({...pForm, resume:e.target.value})} rows={3} placeholder="Résumé de la publication..." style={{...inp, resize:"vertical"}} /></div>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button onClick={addPublication} disabled={saving} style={btnP}>{saving?"Enregistrement...":"Enregistrer"}</button>
                  <button onClick={() => setShowAddPub(false)} style={btnS}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {publications.length === 0 && <div style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>Aucune publication enregistrée</div>}
              {publications.map((p: any) => {
                const sc = STATUT_COLORS[p.statut] || STATUT_COLORS.en_cours;
                return (
                  <div key={p.id} style={{ background:"white", border:`1px solid ${INDIGO_BORDER}`, borderRadius:12, padding:"16px 20px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <div style={{ fontWeight:700, color:"#0f172a", fontSize:15 }}>{p.titre}</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <select value={p.statut} onChange={e => updatePubStatut(p.id, e.target.value)} style={{ padding:"3px 8px", border:`1px solid ${sc.color}33`, borderRadius:8, fontSize:12, color:sc.color, background:sc.bg, fontWeight:600, cursor:"pointer" }}>
                          <option value="en_cours">En cours</option><option value="soumis">Soumis</option><option value="publie">Publié</option><option value="rejete">Rejeté</option>
                        </select>
                        {userIsAdmin && <button onClick={() => deletePub(p.id)} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12 }}>Suppr.</button>}
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>
                      <span style={{ padding:"1px 8px", background:INDIGO_BG, color:INDIGO, borderRadius:12, fontSize:11, fontWeight:600, marginRight:6 }}>{p.type_pub}</span>
                      {p.auteur_nom||"Auteur non précisé"} · {fmtDate(p.date_pub)} {p.domaine ? `· ${p.domaine}` : ""}
                    </div>
                    {p.resume && <div style={{ fontSize:13, color:"#374151", lineHeight:1.5, maxHeight:50, overflow:"hidden" }}>{p.resume}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "projects" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800 }}>Projets de recherche ({projects.length})</h2>
              <button onClick={() => setShowAddProject(true)} style={btnP}>+ Nouveau projet</button>
            </div>
            {showAddProject && (
              <div style={{ background:INDIGO_BG, border:`1px solid ${INDIGO_BORDER}`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:"#3730a3" }}>Nouveau projet de recherche</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Titre *</label><input value={prjForm.titre} onChange={e => setPrjForm({...prjForm, titre:e.target.value})} placeholder="Titre du projet" style={inp} /></div>
                  <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Description</label><textarea value={prjForm.description} onChange={e => setPrjForm({...prjForm, description:e.target.value})} rows={2} style={{...inp, resize:"vertical"}} /></div>
                  <div><label style={lbl}>Responsable</label><input value={prjForm.responsable} onChange={e => setPrjForm({...prjForm, responsable:e.target.value})} placeholder="Nom du responsable" style={inp} /></div>
                  <div><label style={lbl}>Statut</label><select value={prjForm.statut} onChange={e => setPrjForm({...prjForm, statut:e.target.value})} style={inp}><option value="planifie">Planifié</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="suspendu">Suspendu</option></select></div>
                  <div><label style={lbl}>Date début</label><input type="date" value={prjForm.date_debut} onChange={e => setPrjForm({...prjForm, date_debut:e.target.value})} style={inp} /></div>
                  <div><label style={lbl}>Date fin</label><input type="date" value={prjForm.date_fin} onChange={e => setPrjForm({...prjForm, date_fin:e.target.value})} style={inp} /></div>
                  <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Budget (GNF)</label><input type="number" value={prjForm.budget} onChange={e => setPrjForm({...prjForm, budget:e.target.value})} placeholder="0" style={inp} /></div>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button onClick={addProject} disabled={saving} style={btnP}>{saving?"Enregistrement...":"Enregistrer"}</button>
                  <button onClick={() => setShowAddProject(false)} style={btnS}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {projects.length === 0 && <div style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>Aucun projet enregistré</div>}
              {projects.map((p: any) => {
                const sc = STATUT_COLORS[p.statut] || STATUT_COLORS.en_cours;
                return (
                  <div key={p.id} style={{ background:"white", border:`1px solid ${INDIGO_BORDER}`, borderRadius:12, padding:"16px 20px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <div style={{ fontWeight:700, color:"#0f172a", fontSize:15 }}>{p.titre}</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <select value={p.statut} onChange={e => updatePrjStatut(p.id, e.target.value)} style={{ padding:"3px 8px", border:`1px solid ${sc.color}33`, borderRadius:8, fontSize:12, color:sc.color, background:sc.bg, fontWeight:600, cursor:"pointer" }}>
                          <option value="planifie">Planifié</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="suspendu">Suspendu</option>
                        </select>
                        {userIsAdmin && <button onClick={() => deleteProject(p.id)} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12 }}>Suppr.</button>}
                      </div>
                    </div>
                    {p.description && <div style={{ fontSize:13, color:"#374151", marginBottom:6 }}>{p.description}</div>}
                    <div style={{ fontSize:12, color:"#64748b" }}>{p.responsable ? `👤 ${p.responsable} · ` : ""}📅 {fmtDate(p.date_debut)} {p.date_fin ? `→ ${fmtDate(p.date_fin)}` : ""} {p.budget > 0 ? `· 💰 ${(+p.budget).toLocaleString("fr-FR")} GNF` : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "announcements" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800 }}>Annonces ({announcements.length})</h2>
              <button onClick={() => setShowAddAnn(true)} style={btnP}>+ Publier</button>
            </div>
            {showAddAnn && (
              <div style={{ background:INDIGO_BG, border:`1px solid ${INDIGO_BORDER}`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:"#3730a3" }}>Nouvelle annonce</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div><label style={lbl}>Titre *</label><input value={aForm.titre} onChange={e => setAForm({...aForm, titre:e.target.value})} style={inp} /></div>
                  <div><label style={lbl}>Type</label><select value={aForm.type} onChange={e => setAForm({...aForm, type:e.target.value})} style={inp}><option value="general">Général</option><option value="appel_projet">Appel à projets</option><option value="conference">Conférence</option><option value="recrutement">Recrutement</option></select></div>
                  <div><label style={lbl}>Contenu *</label><textarea value={aForm.contenu} onChange={e => setAForm({...aForm, contenu:e.target.value})} rows={4} style={{...inp, resize:"vertical"}} /></div>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button onClick={addAnn} disabled={saving} style={btnP}>{saving?"Publication...":"Publier"}</button>
                  <button onClick={() => setShowAddAnn(false)} style={btnS}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {announcements.length === 0 && <div style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>Aucune annonce publiée</div>}
              {announcements.map((a: any) => (
                <div key={a.id} style={{ background:"white", border:`1px solid ${INDIGO_BORDER}`, borderRadius:12, padding:"16px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div><div style={{ fontWeight:700, color:"#0f172a", fontSize:15 }}>{a.titre}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{fmtDate(a.created_at)}</div></div>
                    <div style={{ display:"flex", gap:8 }}>
                      <span style={{ padding:"2px 10px", background:INDIGO_BG, color:INDIGO, borderRadius:20, fontSize:11, fontWeight:600 }}>{a.type}</span>
                      {userIsAdmin && <button onClick={() => deleteAnn(a.id)} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12 }}>Suppr.</button>}
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:"#374151", lineHeight:1.6 }}>{a.contenu}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
