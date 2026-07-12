import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const BASE = (code: string) => `/api/imam-mgmt/${code}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Tab = "dashboard" | "imams" | "predications" | "mosques" | "announcements";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const VIOLET = "#7c3aed";
const VIOLET_BG = "#f5f3ff";
const VIOLET_BORDER = "#ede9fe";

export default function GestionImam() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const user = getSessionUser();
  const userIsAdmin = isAdmin(user);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [imams, setImams] = useState<any[]>([]);
  const [predications, setPredications] = useState<any[]>([]);
  const [mosques, setMosques] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddImam, setShowAddImam] = useState(false);
  const [showAddPred, setShowAddPred] = useState(false);
  const [showAddMosque, setShowAddMosque] = useState(false);
  const [showAddAnn, setShowAddAnn] = useState(false);

  const [iForm, setIForm] = useState({ nom: "", prenom: "", telephone: "", numero_h: "", specialite: "Général", mosquee: "" });
  const [pForm, setPForm] = useState({ imam_id: "", imam_nom: "", titre: "", type_pred: "khutba", date_pred: new Date().toISOString().split("T")[0], mosquee: "", notes: "" });
  const [mForm, setMForm] = useState({ nom: "", adresse: "", responsable: "", telephone: "" });
  const [aForm, setAForm] = useState({ titre: "", contenu: "", type: "general" });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!tenantCode) return;
    loadAll();
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode || !tenant) return;
    if (tab === "imams") loadImams();
    else if (tab === "predications") loadPredications();
    else if (tab === "mosques") loadMosques();
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

  async function loadImams() {
    const r = await fetch(`${BASE(tenantCode!)}/imams`, { headers: auth() });
    const d = await r.json();
    if (d.success) setImams(d.imams);
  }

  async function loadPredications() {
    const r = await fetch(`${BASE(tenantCode!)}/predications`, { headers: auth() });
    const d = await r.json();
    if (d.success) setPredications(d.predications);
  }

  async function loadMosques() {
    const r = await fetch(`${BASE(tenantCode!)}/mosques`, { headers: auth() });
    const d = await r.json();
    if (d.success) setMosques(d.mosques);
  }

  async function loadAnnouncements() {
    const r = await fetch(`${BASE(tenantCode!)}/announcements`, { headers: auth() });
    const d = await r.json();
    if (d.success) setAnnouncements(d.announcements);
  }

  async function addImam() {
    if (!iForm.nom.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/imams`, { method: "POST", headers: auth(), body: JSON.stringify(iForm) });
    setSaving(false);
    setShowAddImam(false);
    setIForm({ nom: "", prenom: "", telephone: "", numero_h: "", specialite: "Général", mosquee: "" });
    loadImams();
    loadAll();
  }

  async function deleteImam(id: number) {
    if (!confirm("Retirer cet imam du réseau ?")) return;
    await fetch(`${BASE(tenantCode!)}/imams/${id}`, { method: "DELETE", headers: auth() });
    loadImams();
    loadAll();
  }

  async function addPredication() {
    if (!pForm.titre.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/predications`, { method: "POST", headers: auth(), body: JSON.stringify(pForm) });
    setSaving(false);
    setShowAddPred(false);
    setPForm({ imam_id: "", imam_nom: "", titre: "", type_pred: "khutba", date_pred: new Date().toISOString().split("T")[0], mosquee: "", notes: "" });
    loadPredications();
    loadAll();
  }

  async function deletePredication(id: number) {
    if (!confirm("Supprimer cette prédication ?")) return;
    await fetch(`${BASE(tenantCode!)}/predications/${id}`, { method: "DELETE", headers: auth() });
    loadPredications();
    loadAll();
  }

  async function addMosque() {
    if (!mForm.nom.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/mosques`, { method: "POST", headers: auth(), body: JSON.stringify(mForm) });
    setSaving(false);
    setShowAddMosque(false);
    setMForm({ nom: "", adresse: "", responsable: "", telephone: "" });
    loadMosques();
    loadAll();
  }

  async function deleteMosque(id: number) {
    if (!confirm("Retirer cette mosquée ?")) return;
    await fetch(`${BASE(tenantCode!)}/mosques/${id}`, { method: "DELETE", headers: auth() });
    loadMosques();
    loadAll();
  }

  async function addAnnouncement() {
    if (!aForm.titre.trim() || !aForm.contenu.trim()) return;
    setSaving(true);
    await fetch(`${BASE(tenantCode!)}/announcements`, { method: "POST", headers: auth(), body: JSON.stringify(aForm) });
    setSaving(false);
    setShowAddAnn(false);
    setAForm({ titre: "", contenu: "", type: "general" });
    loadAnnouncements();
    loadAll();
  }

  async function deleteAnn(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`${BASE(tenantCode!)}/announcements/${id}`, { method: "DELETE", headers: auth() });
    loadAnnouncements();
    loadAll();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #ede9fe", borderTopColor: VIOLET, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 500, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{error}</h2>
      <button onClick={() => navigate(-1)} style={{ marginTop: 20, padding: "10px 24px", background: VIOLET, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Retour</button>
    </div>
  );

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "dashboard",     label: "Tableau de bord", emoji: "📊" },
    { key: "imams",         label: "Imams",            emoji: "🕋" },
    { key: "predications",  label: "Prédications",     emoji: "📢" },
    { key: "mosques",       label: "Mosquées",         emoji: "🕌" },
    { key: "announcements", label: "Annonces",         emoji: "📣" },
  ];

  const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #ddd6fe", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#6b21a8", marginBottom: 4 };
  const btnPrimary: React.CSSProperties = { padding: "10px 20px", background: VIOLET, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };
  const btnSecondary: React.CSSProperties = { padding: "9px 18px", background: "white", color: VIOLET, border: `2px solid ${VIOLET}`, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 60px" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion imam — ${tenant?.name || ""}`}
        startUrl={`/gestion-imam/${tenantCode}`}
        themeColor={VIOLET}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @media(max-width:640px){.gestion-btn-secondary{display:none!important}}`}</style>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #6d28d9, #7c3aed)", padding: "28px 28px 0", borderBottom: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>🕋</div>
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontWeight: 800, color: "white", fontSize: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant?.name || "Réseau Imam"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Code : {tenantCode} · Réseau Imam</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <InstallAppButton name={tenant?.name} logoUrl={tenant?.logo_url} themeColor={VIOLET} />
            <button className="gestion-btn-secondary" onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>← Retour</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "10px 18px", background: tab === t.key ? "white" : "transparent", color: tab === t.key ? VIOLET : "rgba(255,255,255,0.8)", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: tab === t.key ? 700 : 500, fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ padding: "24px 28px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && dash && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
              {[
                { label: "Imams actifs",       value: dash.totalImams,         emoji: "🕋", color: VIOLET },
                { label: "Prédications ce mois", value: dash.predsMois,        emoji: "📢", color: "#7c3aed" },
                { label: "Mosquées partenaires", value: dash.totalMosques,     emoji: "🕌", color: "#6d28d9" },
                { label: "Annonces actives",   value: dash.totalAnnouncements, emoji: "📣", color: "#5b21b6" },
              ].map(stat => (
                <div key={stat.label} style={{ background: "white", border: `1px solid ${VIOLET_BORDER}`, borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{stat.emoji}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value ?? 0}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {dash.recentPredications?.length > 0 && (
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Prédications récentes</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dash.recentPredications.map((p: any) => (
                    <div key={p.id} style={{ background: "white", border: `1px solid ${VIOLET_BORDER}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: VIOLET_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📢</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>{p.titre}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{p.imam_nom || "Imam non précisé"} · {fmtDate(p.date_pred)} · {p.mosquee || "Mosquée non précisée"}</div>
                      </div>
                      <span style={{ padding: "2px 10px", background: VIOLET_BG, color: VIOLET, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.type_pred}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!dash.recentPredications || dash.recentPredications.length === 0) && dash.totalImams === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🕋</div>
                <div>Aucune donnée pour l'instant. Commencez par ajouter des imams.</div>
              </div>
            )}
          </div>
        )}

        {/* ── IMAMS ── */}
        {tab === "imams" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Imams du réseau ({imams.length})</h2>
              <button onClick={() => setShowAddImam(true)} style={btnPrimary}>+ Ajouter un imam</button>
            </div>

            {showAddImam && (
              <div style={{ background: VIOLET_BG, border: `1px solid ${VIOLET_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#6b21a8" }}>Nouvel imam</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input value={iForm.nom} onChange={e => setIForm({...iForm, nom: e.target.value})} placeholder="Nom de l'imam" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Prénom</label><input value={iForm.prenom} onChange={e => setIForm({...iForm, prenom: e.target.value})} placeholder="Prénom" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Téléphone</label><input value={iForm.telephone} onChange={e => setIForm({...iForm, telephone: e.target.value})} placeholder="+224..." style={inputStyle} /></div>
                  <div><label style={labelStyle}>Numéro H</label><input value={iForm.numero_h} onChange={e => setIForm({...iForm, numero_h: e.target.value})} placeholder="NuméroH optionnel" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Spécialité</label>
                    <select value={iForm.specialite} onChange={e => setIForm({...iForm, specialite: e.target.value})} style={inputStyle}>
                      <option>Général</option><option>Fiqh</option><option>Tafsir</option><option>Hadith</option><option>Coran</option><option>Éducation islamique</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Mosquée</label><input value={iForm.mosquee} onChange={e => setIForm({...iForm, mosquee: e.target.value})} placeholder="Mosquée d'attache" style={inputStyle} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addImam} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddImam(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {imams.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucun imam enregistré</div>}
              {imams.map((imam: any) => (
                <div key={imam.id} style={{ background: "white", border: `1px solid ${VIOLET_BORDER}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: VIOLET_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🕋</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{imam.nom} {imam.prenom}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {imam.specialite} {imam.mosquee ? `· ${imam.mosquee}` : ""} {imam.telephone ? `· ${imam.telephone}` : ""}
                    </div>
                  </div>
                  {imam.numero_h && <span style={{ fontFamily: "monospace", fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 6 }}>{imam.numero_h}</span>}
                  {userIsAdmin && <button onClick={() => deleteImam(imam.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retirer</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PRÉDICATIONS ── */}
        {tab === "predications" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Prédications ({predications.length})</h2>
              <button onClick={() => setShowAddPred(true)} style={btnPrimary}>+ Ajouter</button>
            </div>

            {showAddPred && (
              <div style={{ background: VIOLET_BG, border: `1px solid ${VIOLET_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#6b21a8" }}>Nouvelle prédication</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Titre *</label><input value={pForm.titre} onChange={e => setPForm({...pForm, titre: e.target.value})} placeholder="Titre du sermon / khutba" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Imam</label>
                    <select value={pForm.imam_id} onChange={e => { const sel = imams.find((i:any) => String(i.id) === e.target.value); setPForm({...pForm, imam_id: e.target.value, imam_nom: sel ? `${sel.nom} ${sel.prenom||""}`.trim() : ""}); }} style={inputStyle}>
                      <option value="">— Imam non précisé —</option>
                      {imams.map((i: any) => <option key={i.id} value={i.id}>{i.nom} {i.prenom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={pForm.type_pred} onChange={e => setPForm({...pForm, type_pred: e.target.value})} style={inputStyle}>
                      <option value="khutba">Khutba</option><option value="cours">Cours</option><option value="conference">Conférence</option><option value="autre">Autre</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Date</label><input type="date" value={pForm.date_pred} onChange={e => setPForm({...pForm, date_pred: e.target.value})} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Mosquée</label><input value={pForm.mosquee} onChange={e => setPForm({...pForm, mosquee: e.target.value})} placeholder="Nom de la mosquée" style={inputStyle} /></div>
                  <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Notes</label><textarea value={pForm.notes} onChange={e => setPForm({...pForm, notes: e.target.value})} rows={2} placeholder="Résumé ou notes..." style={{...inputStyle, resize: "vertical"}} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addPredication} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddPred(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {predications.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucune prédication enregistrée</div>}
              {predications.map((p: any) => (
                <div key={p.id} style={{ background: "white", border: `1px solid ${VIOLET_BORDER}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: VIOLET_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📢</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{p.titre}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {p.imam_nom || "Imam non précisé"} · {fmtDate(p.date_pred)} {p.mosquee ? `· ${p.mosquee}` : ""}
                    </div>
                  </div>
                  <span style={{ padding: "2px 10px", background: VIOLET_BG, color: VIOLET, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.type_pred}</span>
                  {userIsAdmin && <button onClick={() => deletePredication(p.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Suppr.</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MOSQUÉES ── */}
        {tab === "mosques" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Mosquées partenaires ({mosques.length})</h2>
              <button onClick={() => setShowAddMosque(true)} style={btnPrimary}>+ Ajouter</button>
            </div>

            {showAddMosque && (
              <div style={{ background: VIOLET_BG, border: `1px solid ${VIOLET_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#6b21a8" }}>Nouvelle mosquée partenaire</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input value={mForm.nom} onChange={e => setMForm({...mForm, nom: e.target.value})} placeholder="Nom de la mosquée" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Adresse</label><input value={mForm.adresse} onChange={e => setMForm({...mForm, adresse: e.target.value})} placeholder="Quartier / Ville" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Responsable</label><input value={mForm.responsable} onChange={e => setMForm({...mForm, responsable: e.target.value})} placeholder="Nom du responsable" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Téléphone</label><input value={mForm.telephone} onChange={e => setMForm({...mForm, telephone: e.target.value})} placeholder="+224..." style={inputStyle} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addMosque} disabled={saving} style={btnPrimary}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button onClick={() => setShowAddMosque(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
              {mosques.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", gridColumn: "1/-1" }}>Aucune mosquée partenaire</div>}
              {mosques.map((m: any) => (
                <div key={m.id} style={{ background: "white", border: `1px solid ${VIOLET_BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: VIOLET_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🕌</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{m.nom}</div>
                  </div>
                  {m.adresse && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>📍 {m.adresse}</div>}
                  {m.responsable && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>👤 {m.responsable}</div>}
                  {m.telephone && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>📞 {m.telephone}</div>}
                  {userIsAdmin && <button onClick={() => deleteMosque(m.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, width: "100%" }}>Retirer</button>}
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
              <button onClick={() => setShowAddAnn(true)} style={btnPrimary}>+ Publier une annonce</button>
            </div>

            {showAddAnn && (
              <div style={{ background: VIOLET_BG, border: `1px solid ${VIOLET_BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#6b21a8" }}>Nouvelle annonce</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={labelStyle}>Titre *</label><input value={aForm.titre} onChange={e => setAForm({...aForm, titre: e.target.value})} placeholder="Titre de l'annonce" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={aForm.type} onChange={e => setAForm({...aForm, type: e.target.value})} style={inputStyle}>
                      <option value="general">Général</option><option value="evenement">Événement</option><option value="urgent">Urgent</option><option value="formation">Formation</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Contenu *</label><textarea value={aForm.contenu} onChange={e => setAForm({...aForm, contenu: e.target.value})} rows={4} placeholder="Contenu de l'annonce..." style={{...inputStyle, resize: "vertical"}} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={addAnnouncement} disabled={saving} style={btnPrimary}>{saving ? "Publication..." : "Publier"}</button>
                  <button onClick={() => setShowAddAnn(false)} style={btnSecondary}>Annuler</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {announcements.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Aucune annonce publiée</div>}
              {announcements.map((a: any) => (
                <div key={a.id} style={{ background: "white", border: `1px solid ${VIOLET_BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{a.titre}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{fmtDate(a.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ padding: "2px 10px", background: VIOLET_BG, color: VIOLET, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{a.type}</span>
                      {userIsAdmin && <button onClick={() => deleteAnn(a.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Suppr.</button>}
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
