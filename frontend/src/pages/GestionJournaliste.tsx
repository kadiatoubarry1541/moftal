import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const BASE = (code: string) => `/api/journalist-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "reporters" | "articles" | "subscribers" | "announcements";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const RED = "#dc2626";
const RED_BG = "#fff1f2";
const RED_BORDER = "#fecaca";

const STATUT_ARTICLE: Record<string, { bg: string; color: string; label: string }> = {
  brouillon: { bg: "#f8fafc", color: "#64748b", label: "Brouillon" },
  revision:  { bg: "#fffbeb", color: "#b45309", label: "En révision" },
  publie:    { bg: "#f0fdf0", color: "#156315", label: "Publié" },
  archive:   { bg: "#f1f5f9", color: "#475569", label: "Archivé" },
};

export default function GestionJournaliste() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [reporters, setReporters] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddReporter, setShowAddReporter] = useState(false);
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [rForm, setRForm] = useState({ nom: "", prenom: "", telephone: "", numero_h: "", specialite: "Général", role: "journaliste" });
  const [aForm, setAForm] = useState({ reporter_id: "", reporter_nom: "", titre: "", contenu: "", categorie: "Actualité", statut: "brouillon", date_pub: new Date().toISOString().split("T")[0] });
  const [sForm, setSForm] = useState({ nom: "", telephone: "", email: "", type_abo: "gratuit" });
  const [annForm, setAnnForm] = useState({ titre: "", contenu: "", type: "general" });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadAll();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || !tenant) return;
    if (tab === "reporters") loadReporters();
    else if (tab === "articles") loadArticles();
    else if (tab === "subscribers") loadSubscribers();
    else if (tab === "announcements") loadAnnouncements();
  }, [tab]);

  async function loadAll() {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        fetch(`${BASE(tenantCode!)}/info`, { headers: auth() }),
        fetch(`${BASE(tenantCode!)}/dashboard`, { headers: auth() })
      ]);
      const tData = await tRes.json();
      if (!tData.success) { setError(tData.message || "Accès refusé"); setLoading(false); return; }
      setTenant(tData.tenant);
      const dData = await dRes.json();
      if (dData.success) setDash(dData);
    } catch { setError("Erreur de connexion au serveur"); }
    setLoading(false);
  }

  async function loadReporters() { const r = await fetch(`${BASE(tenantCode!)}/reporters`, { headers: auth() }); const d = await r.json(); if (d.success) setReporters(d.reporters); }
  async function loadArticles() { const r = await fetch(`${BASE(tenantCode!)}/articles`, { headers: auth() }); const d = await r.json(); if (d.success) setArticles(d.articles); }
  async function loadSubscribers() { const r = await fetch(`${BASE(tenantCode!)}/subscribers`, { headers: auth() }); const d = await r.json(); if (d.success) setSubscribers(d.subscribers); }
  async function loadAnnouncements() { const r = await fetch(`${BASE(tenantCode!)}/announcements`, { headers: auth() }); const d = await r.json(); if (d.success) setAnnouncements(d.announcements); }

  async function addReporter() {
    if (!rForm.nom.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/reporters`, { method: "POST", headers: auth(), body: JSON.stringify(rForm) });
    setSaving(false); setShowAddReporter(false);
    setRForm({ nom: "", prenom: "", telephone: "", numero_h: "", specialite: "Général", role: "journaliste" });
    loadReporters(); loadAll();
  }
  async function deleteReporter(id: number) {
    if (!confirm("Retirer ce journaliste ?")) return;
    await fetch(`${BASE(tenantCode!)}/reporters/${id}`, { method: "DELETE", headers: auth() });
    loadReporters(); loadAll();
  }

  async function addArticle() {
    if (!aForm.titre.trim()) return;
    setSaving(true);
    const sel = reporters.find((r: any) => String(r.id) === aForm.reporter_id);
    const payload = { ...aForm, reporter_nom: sel ? `${sel.nom} ${sel.prenom||""}`.trim() : aForm.reporter_nom };
    await fetch(`${BASE(tenantCode!)}/articles`, { method: "POST", headers: auth(), body: JSON.stringify(payload) });
    setSaving(false); setShowAddArticle(false);
    setAForm({ reporter_id: "", reporter_nom: "", titre: "", contenu: "", categorie: "Actualité", statut: "brouillon", date_pub: new Date().toISOString().split("T")[0] });
    loadArticles(); loadAll();
  }
  async function updateStatutArticle(id: number, statut: string) {
    await fetch(`${BASE(tenantCode!)}/articles/${id}/statut`, { method: "PATCH", headers: auth(), body: JSON.stringify({ statut }) });
    loadArticles(); loadAll();
  }
  async function deleteArticle(id: number) {
    if (!confirm("Supprimer cet article ?")) return;
    await fetch(`${BASE(tenantCode!)}/articles/${id}`, { method: "DELETE", headers: auth() });
    loadArticles(); loadAll();
  }

  async function addSubscriber() {
    if (!sForm.nom.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/subscribers`, { method: "POST", headers: auth(), body: JSON.stringify(sForm) });
    setSaving(false); setShowAddSub(false);
    setSForm({ nom: "", telephone: "", email: "", type_abo: "gratuit" });
    loadSubscribers(); loadAll();
  }
  async function deleteSubscriber(id: number) {
    if (!confirm("Retirer cet abonné ?")) return;
    await fetch(`${BASE(tenantCode!)}/subscribers/${id}`, { method: "DELETE", headers: auth() });
    loadSubscribers(); loadAll();
  }

  async function addAnn() {
    if (!annForm.titre.trim() || !annForm.contenu.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/announcements`, { method: "POST", headers: auth(), body: JSON.stringify(annForm) });
    setSaving(false); setShowAddAnn(false);
    setAnnForm({ titre: "", contenu: "", type: "general" });
    loadAnnouncements(); loadAll();
  }
  async function deleteAnn(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`${BASE(tenantCode!)}/announcements/${id}`, { method: "DELETE", headers: auth() });
    loadAnnouncements(); loadAll();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #fecaca", borderTopColor: RED, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 500, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate(-1)} style={{ marginTop: 20, padding: "10px 24px", background: RED, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Retour</button>
    </div>
  );

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "dashboard",     label: "Tableau de bord", emoji: "📊" },
    { key: "reporters",     label: "Journalistes",    emoji: "📰" },
    { key: "articles",      label: "Articles",        emoji: "📝" },
    { key: "subscribers",   label: "Abonnés",         emoji: "👥" },
    { key: "announcements", label: "Annonces",        emoji: "📣" },
  ];

  const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#991b1b", marginBottom: 4 };
  const btnPrimary: React.CSSProperties = { padding: "10px 20px", background: RED, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };
  const btnSecondary: React.CSSProperties = { padding: "9px 18px", background: "white", color: RED, border: `2px solid ${RED}`, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 60px" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion journaliste — ${tenant?.name || ""}`}
        startUrl={`/gestion-journaliste/${tenantCode}`}
        themeColor={RED}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @media(max-width:640px){.gestion-btn-secondary{display:none!important}}`}</style>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg,#b91c1c,#dc2626)", padding: "28px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>📰</div>
          )}
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontWeight: 800, color: "white", fontSize: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant?.name || "Journalistes / Médias"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Code : {tenantCode} · Journalistes & Médias</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <InstallAppButton name={tenant?.name} logoUrl={tenant?.logo_url} themeColor={RED} />
            <button className="gestion-btn-secondary" onClick={() => navigate(`/journaliste/${tenantCode}`)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>🌐 Vitrine</button>
            <button className="gestion-btn-secondary" onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>← Retour</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "10px 18px", background: tab === t.key ? "white" : "transparent", color: tab === t.key ? RED : "rgba(255,255,255,0.8)", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: tab === t.key ? 700 : 500, fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && dash && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.2s ease" }}>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr) repeat(2,1fr)", gap: 14 }}>
              {[
                { label: "Journalistes",     val: dash.totalReporters,     color: RED,       bg: RED_BG,     icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                { label: "Articles publiés", val: dash.totalArticles,      color: "#b91c1c",  bg: "#fff1f2",  icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
                { label: "Abonnés",          val: dash.totalSubscribers,   color: "#7f1d1d",  bg: "#fef2f2",  icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
                { label: "Annonces actives", val: dash.totalAnnouncements, color: "#991b1b",  bg: "#fff1f2",  icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
              ].map((s, i) => (
                <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px", borderLeft: `3px solid ${s.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" fill="none" stroke={s.color} strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{s.val ?? 0}</div>
                </div>
              ))}
            </div>

            {/* Banner abonnés */}
            <div style={{ background: "linear-gradient(135deg,#7f1d1d,#dc2626)", borderRadius: 14, padding: "18px 24px", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(220,38,38,0.3)" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Audience totale</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{dash.totalSubscribers ?? 0} abonnés</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{dash.totalArticles ?? 0} articles · {dash.totalReporters ?? 0} journalistes</div>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              </div>
            </div>

            {/* Actions rapides */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Actions rapides</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {[
                  { label: "Ajouter journaliste", tab: "reporters",      emoji: "📰" },
                  { label: "Nouvel article",       tab: "articles",       emoji: "📝" },
                  { label: "Nouvel abonné",        tab: "subscribers",    emoji: "👥" },
                  { label: "Annonce",              tab: "announcements",  emoji: "📣" },
                ].map(a => (
                  <button key={a.tab} onClick={() => setTab(a.tab as Tab)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", background: RED_BG, border: `1px solid ${RED_BORDER}`, borderRadius: 10, cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = RED; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = RED_BG; }}>
                    <span style={{ fontSize: 22 }}>{a.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: RED }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Articles récents */}
            {dash.recentArticles?.length > 0 ? (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Articles récents</span>
                  <button onClick={() => setTab("articles")} style={{ fontSize: 12, color: RED, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Voir tous →</button>
                </div>
                {dash.recentArticles.map((a: any) => {
                  const sc = STATUT_ARTICLE[a.statut] || STATUT_ARTICLE.brouillon;
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: RED_BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" fill="none" stroke={RED} strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titre}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{a.reporter_nom || "Journaliste"} · {fmtDate(a.date_pub)} · {a.categorie}</div>
                      </div>
                      <span style={{ padding: "3px 10px", background: sc.bg, color: sc.color, borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{sc.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
                <div style={{ fontSize: 13 }}>Aucune donnée. Commencez par ajouter des journalistes et des articles.</div>
              </div>
            )}
          </div>
        )}

        {/* ── JOURNALISTES ── */}
        {tab === "reporters" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Journalistes & rédacteurs ({reporters.length})</h2>
              <button onClick={() => setShowAddReporter(true)} style={btnPrimary}>+ Ajouter</button>
            </div>
            {showAddReporter && (
              <div style={{ background: RED_BG, border: `1px solid ${RED_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#991b1b" }}>Nouveau journaliste</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input value={rForm.nom} onChange={e => setRForm({...rForm, nom: e.target.value})} placeholder="Nom" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Prénom</label><input value={rForm.prenom} onChange={e => setRForm({...rForm, prenom: e.target.value})} placeholder="Prénom" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Téléphone</label><input value={rForm.telephone} onChange={e => setRForm({...rForm, telephone: e.target.value})} placeholder="+224..." style={inputStyle} /></div>
                  <div><label style={labelStyle}>Numéro H</label><input value={rForm.numero_h} onChange={e => setRForm({...rForm, numero_h: e.target.value})} placeholder="Optionnel" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Rôle</label>
                    <select value={rForm.role} onChange={e => setRForm({...rForm, role: e.target.value})} style={inputStyle}>
                      <option value="journaliste">Journaliste</option><option value="redacteur">Rédacteur</option><option value="photographe">Photographe</option><option value="caméraman">Caméraman</option><option value="éditeur">Éditeur</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Spécialité</label>
                    <select value={rForm.specialite} onChange={e => setRForm({...rForm, specialite: e.target.value})} style={inputStyle}>
                      <option>Général</option><option>Politique</option><option>Sport</option><option>Culture</option><option>Économie</option><option>Santé</option><option>Technologie</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addReporter} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddReporter(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reporters.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucun journaliste enregistré</div>}
              {reporters.map((r: any) => (
                <div key={r.id} style={{ background: "white", border: `1px solid ${RED_BORDER}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: RED_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📰</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{r.nom} {r.prenom}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      <span style={{ padding: "1px 8px", background: RED_BG, color: RED, borderRadius: 12, fontSize: 11, fontWeight: 600, marginRight: 6 }}>{r.role}</span>
                      {r.specialite} {r.telephone ? `· ${r.telephone}` : ""}
                    </div>
                  </div>
                  {r.numero_h && <span style={{ fontFamily: "monospace", fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 6 }}>{r.numero_h}</span>}
                  {userIsAdmin && <button onClick={() => deleteReporter(r.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ARTICLES ── */}
        {tab === "articles" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Articles ({articles.length})</h2>
              <button onClick={() => setShowAddArticle(true)} style={btnPrimary}>+ Nouvel article</button>
            </div>
            {showAddArticle && (
              <div style={{ background: RED_BG, border: `1px solid ${RED_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#991b1b" }}>Nouvel article</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Titre *</label><input value={aForm.titre} onChange={e => setAForm({...aForm, titre: e.target.value})} placeholder="Titre de l'article" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Journaliste</label>
                    <select value={aForm.reporter_id} onChange={e => setAForm({...aForm, reporter_id: e.target.value})} style={inputStyle}>
                      <option value="">— Non précisé —</option>
                      {reporters.map((r: any) => <option key={r.id} value={r.id}>{r.nom} {r.prenom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Catégorie</label>
                    <select value={aForm.categorie} onChange={e => setAForm({...aForm, categorie: e.target.value})} style={inputStyle}>
                      <option>Actualité</option><option>Politique</option><option>Sport</option><option>Culture</option><option>Économie</option><option>Santé</option><option>Technologie</option><option>Société</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Statut</label>
                    <select value={aForm.statut} onChange={e => setAForm({...aForm, statut: e.target.value})} style={inputStyle}>
                      <option value="brouillon">Brouillon</option><option value="revision">En révision</option><option value="publie">Publié</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Date publication</label><input type="date" value={aForm.date_pub} onChange={e => setAForm({...aForm, date_pub: e.target.value})} style={inputStyle} /></div>
                  <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Contenu</label><textarea value={aForm.contenu} onChange={e => setAForm({...aForm, contenu: e.target.value})} rows={4} placeholder="Contenu de l'article..." style={{...inputStyle, resize: "vertical"}} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addArticle} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddArticle(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {articles.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucun article enregistré</div>}
              {articles.map((a: any) => {
                const sc = STATUT_ARTICLE[a.statut] || STATUT_ARTICLE.brouillon;
                return (
                  <div key={a.id} style={{ background: "white", border: `1px solid ${RED_BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{a.titre}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select value={a.statut} onChange={e => updateStatutArticle(a.id, e.target.value)} style={{ padding: "3px 8px", border: `1px solid ${sc.color}33`, borderRadius: 8, fontSize: 12, color: sc.color, background: sc.bg, fontWeight: 600, cursor: "pointer" }}>
                          <option value="brouillon">Brouillon</option><option value="revision">En révision</option><option value="publie">Publié</option><option value="archive">Archivé</option>
                        </select>
                        {userIsAdmin && <button onClick={() => deleteArticle(a.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Suppr.</button>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                      <span style={{ padding: "1px 8px", background: RED_BG, color: RED, borderRadius: 12, fontSize: 11, fontWeight: 600, marginRight: 6 }}>{a.categorie}</span>
                      {a.reporter_nom || "Journaliste non précisé"} · {fmtDate(a.date_pub)}
                    </div>
                    {a.contenu && <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, maxHeight: 60, overflow: "hidden" }}>{a.contenu}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ABONNÉS ── */}
        {tab === "subscribers" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Abonnés ({subscribers.length})</h2>
              <button onClick={() => setShowAddSub(true)} style={btnPrimary}>+ Ajouter un abonné</button>
            </div>
            {showAddSub && (
              <div style={{ background: RED_BG, border: `1px solid ${RED_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#991b1b" }}>Nouvel abonné</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input value={sForm.nom} onChange={e => setSForm({...sForm, nom: e.target.value})} placeholder="Nom" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Téléphone</label><input value={sForm.telephone} onChange={e => setSForm({...sForm, telephone: e.target.value})} placeholder="+224..." style={inputStyle} /></div>
                  <div><label style={labelStyle}>Email</label><input value={sForm.email} onChange={e => setSForm({...sForm, email: e.target.value})} placeholder="email@..." style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Type d'abonnement</label>
                    <select value={sForm.type_abo} onChange={e => setSForm({...sForm, type_abo: e.target.value})} style={inputStyle}>
                      <option value="gratuit">Gratuit</option><option value="premium">Premium</option><option value="annuel">Annuel</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addSubscriber} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddSub(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subscribers.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucun abonné enregistré</div>}
              {subscribers.map((s: any) => (
                <div key={s.id} style={{ background: "white", border: `1px solid ${RED_BORDER}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: RED_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{s.nom}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {s.telephone} {s.email ? `· ${s.email}` : ""}
                    </div>
                  </div>
                  <span style={{ padding: "2px 10px", background: RED_BG, color: RED, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.type_abo}</span>
                  {userIsAdmin && <button onClick={() => deleteSubscriber(s.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ANNONCES ── */}
        {tab === "announcements" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Annonces ({announcements.length})</h2>
              <button onClick={() => setShowAddAnn(true)} style={btnPrimary}>+ Publier</button>
            </div>
            {showAddAnn && (
              <div style={{ background: RED_BG, border: `1px solid ${RED_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#991b1b" }}>Nouvelle annonce</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={labelStyle}>Titre *</label><input value={annForm.titre} onChange={e => setAnnForm({...annForm, titre: e.target.value})} placeholder="Titre" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={annForm.type} onChange={e => setAnnForm({...annForm, type: e.target.value})} style={inputStyle}>
                      <option value="general">Général</option><option value="recrutement">Recrutement</option><option value="partenariat">Partenariat</option><option value="evenement">Événement</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Contenu *</label><textarea value={annForm.contenu} onChange={e => setAnnForm({...annForm, contenu: e.target.value})} rows={4} style={{...inputStyle, resize: "vertical"}} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addAnn} disabled={saving} style={btnPrimary}>{saving ? "Publication..." : "Publier"}</button>
                  <button onClick={() => setShowAddAnn(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {announcements.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucune annonce publiée</div>}
              {announcements.map((a: any) => (
                <div key={a.id} style={{ background: "white", border: `1px solid ${RED_BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{a.titre}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{fmtDate(a.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ padding: "2px 10px", background: RED_BG, color: RED, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{a.type}</span>
                      {userIsAdmin && <button onClick={() => deleteAnn(a.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Suppr.</button>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{a.contenu}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
