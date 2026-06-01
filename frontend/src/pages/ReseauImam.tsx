import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const BASE = `${API}/api/imam-network`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });
type Tab = "profile" | "connections" | "community" | "friday";
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const C = "#4f46e5", CBG = "#eef2ff";

export default function ReseauImam() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [community, setCommunity] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showFriday, setShowFriday] = useState(false);
  const [pForm, setPForm] = useState({ nom_mosquee: "", adresse: "", quartier: "", ville: "", pays: "Guinée", bio: "" });
  const [fForm, setFForm] = useState({ sourate_nom: "", texte_arabe: "", traduction: "", message_imam: "", date_vendredi: new Date().toISOString().slice(0, 10) });

  useEffect(() => { if (!user) { navigate("/login"); return; } loadProfile(); }, []);
  useEffect(() => {
    if (tab === "connections") loadConnections();
    if (tab === "community") loadCommunity();
    if (tab === "friday") loadHistory();
  }, [tab]);

  async function loadProfile() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/profile/me`, { headers: auth() });
      if (r.ok) { const d = await r.json(); setProfile(d.profile || null); if (d.profile) setPForm({ nom_mosquee: d.profile.nom_mosquee || "", adresse: d.profile.adresse || "", quartier: d.profile.quartier || "", ville: d.profile.ville || "", pays: d.profile.pays || "Guinée", bio: d.profile.bio || "" }); }
    } catch { /* */ }
    setLoading(false);
  }
  async function loadConnections() { const r = await fetch(`${BASE}/connections`, { headers: auth() }); const d = await r.json(); setConnections(d.connections || []); setPending(d.pending || []); }
  async function loadCommunity() { const r = await fetch(`${BASE}/community`, { headers: auth() }); const d = await r.json(); setCommunity(d.members || []); }
  async function loadHistory() { const r = await fetch(`${BASE}/friday/history`, { headers: auth() }); const d = await r.json(); setHistory(d.history || []); }

  async function saveProfile() {
    if (!pForm.nom_mosquee || !pForm.ville) return;
    setSaving(true);
    const r = await fetch(`${BASE}/register`, { method: "POST", headers: auth(), body: JSON.stringify(pForm) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { setProfile(d.profile); setEditMode(false); }
  }

  async function acceptConn(from: string) { await fetch(`${BASE}/connect/${from}/accept`, { method: "PUT", headers: auth() }); loadConnections(); }

  async function sendFriday() {
    if (!fForm.message_imam || !fForm.date_vendredi) return;
    setSaving(true);
    const r = await fetch(`${BASE}/friday`, { method: "POST", headers: auth(), body: JSON.stringify(fForm) });
    const d = await r.json();
    if (d.success) {
      const s = await (await fetch(`${BASE}/friday/${d.announcement.id}/send`, { method: "POST", headers: auth() })).json();
      setSaving(false); setShowFriday(false);
      setFForm({ sourate_nom: "", texte_arabe: "", traduction: "", message_imam: "", date_vendredi: new Date().toISOString().slice(0, 10) });
      alert(`Envoyé à ${s.nb_notifies || 0} fidèle(s).`); loadHistory();
    } else { setSaving(false); }
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}><div style={{ width: 32, height: 32, border: `3px solid #c7d2fe`, borderTopColor: C, borderRadius: "50%", animation: "spin .8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  const TABS: { id: Tab; label: string; icon: string }[] = [{ id: "profile", label: "Profil", icon: "🕌" }, { id: "connections", label: "Connexions", icon: "🤝" }, { id: "community", label: "Communauté", icon: "👥" }, { id: "friday", label: "Vendredi", icon: "📜" }];
  const inp = { border: `1px solid #c7d2fe`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ background: "linear-gradient(135deg,#3730a3,#4f46e5)", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🕌</div>
          <div><div style={{ fontWeight: 800, fontSize: 18, color: "white" }}>Réseau des Imams</div><div style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>Communication &amp; Communauté islamique</div></div>
        </div>
        <button onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 16px", background: "rgba(255,255,255,.2)", color: "white", border: "1px solid rgba(255,255,255,.3)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Retour</button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f8fafc", borderRadius: 10, padding: 4 }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? "white" : "transparent", color: tab === t.id ? C : "#64748b", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.1)" : "none" }}>{t.icon} {t.label}</button>)}
      </div>

      {tab === "profile" && (
        <div style={{ animation: "fi .2s ease" }}>
          {!profile && !editMode && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🕌</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Rejoignez le Réseau des Imams</h2>
              <p style={{ color: "#64748b", marginBottom: 24 }}>Connectez-vous avec d'autres imams, gérez votre communauté, diffusez vos messages du vendredi.</p>
              <button onClick={() => setEditMode(true)} style={{ padding: "12px 28px", background: C, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15 }}>Créer mon profil imam</button>
            </div>
          )}
          {profile && !editMode && (
            <div style={{ background: CBG, borderRadius: 12, padding: 20, border: `1px solid #c7d2fe` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: C, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "white", flexShrink: 0, overflow: "hidden" }}>
                  {profile.photo ? <img src={profile.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "👨‍✈️"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.prenom} {profile.nom_famille}</div>
                  <div style={{ fontWeight: 600, color: C, fontSize: 14 }}>{profile.nom_mosquee}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{profile.quartier ? `${profile.quartier}, ` : ""}{profile.ville}, {profile.pays}</div>
                </div>
              </div>
              {profile.bio && <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, borderTop: `1px solid #c7d2fe`, paddingTop: 12 }}>{profile.bio}</div>}
              <button onClick={() => setEditMode(true)} style={{ marginTop: 14, padding: "7px 16px", background: "white", color: C, border: `1px solid ${C}`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Modifier</button>
            </div>
          )}
          {editMode && (
            <div style={{ background: CBG, border: `1px solid #c7d2fe`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>{profile ? "Modifier mon profil" : "Créer mon profil imam"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([["Nom de la mosquée *", "nom_mosquee"], ["Adresse", "adresse"], ["Quartier", "quartier"], ["Ville *", "ville"], ["Pays *", "pays"]] as [string, keyof typeof pForm][]).map(([lbl, k]) => (
                  <div key={k}><div style={{ fontSize: 11, fontWeight: 600, color: "#312e81", marginBottom: 4 }}>{lbl}</div><input value={pForm[k]} onChange={e => setPForm(f => ({ ...f, [k]: e.target.value }))} style={inp} /></div>
                ))}
                <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, fontWeight: 600, color: "#312e81", marginBottom: 4 }}>Bio</div><textarea value={pForm.bio} onChange={e => setPForm(f => ({ ...f, bio: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={saveProfile} disabled={saving} style={{ padding: "8px 20px", background: C, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setEditMode(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "connections" && (
        <div style={{ animation: "fi .2s ease" }}>
          {pending.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: "#92400e" }}>⏳ Demandes en attente ({pending.length})</div>
              {pending.map((c: any) => (
                <div key={c.imam_numero_h} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #fef3c7" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.prenom} {c.nom_famille}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c.nom_mosquee} · {c.ville}</div></div>
                  <button onClick={() => acceptConn(c.imam_numero_h)} style={{ padding: "6px 14px", background: "#dcfce7", color: "#16a34a", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Accepter</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Mes connexions ({connections.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {connections.map((c: any) => (
              <div key={c.connected_numero_h} style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid #f1f5f9" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: CBG, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden" }}>
                  {c.photo ? <img src={c.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 18 }}>👨‍✈️</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.prenom} {c.nom_famille}</div>
                <div style={{ fontSize: 12, color: C, marginTop: 2 }}>{c.nom_mosquee}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{c.quartier ? `${c.quartier}, ` : ""}{c.ville}</div>
              </div>
            ))}
            {connections.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune connexion pour l'instant.</div>}
          </div>
        </div>
      )}

      {tab === "community" && (
        <div style={{ animation: "fi .2s ease" }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Ma communauté de fidèles</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>{community.length} fidèle(s)</div>
          {community.length === 0 ? (
            <div style={{ background: CBG, borderRadius: 12, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontWeight: 600, color: "#312e81" }}>Votre communauté est vide</div>
              <div style={{ fontSize: 13, color: "#6366f1", marginTop: 6 }}>Les fidèles qui rejoignent votre mosquée apparaissent ici</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {community.map((m: any) => (
                <div key={m.fidele_numero_h} style={{ background: "white", borderRadius: 10, padding: "12px 16px", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: CBG, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {m.photo ? <img src={m.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span>👤</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.prenom} {m.nom_famille}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Rejoint le {fmtDate(m.joined_at)}{m.quartier ? ` · ${m.quartier}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "friday" && (
        <div style={{ animation: "fi .2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><div style={{ fontWeight: 700, fontSize: 16 }}>Messages du vendredi (Khutba)</div><div style={{ fontSize: 12, color: "#94a3b8" }}>Envoyé à tous les fidèles de votre communauté</div></div>
            <button onClick={() => setShowFriday(true)} style={{ padding: "8px 16px", background: C, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>📜 Nouveau</button>
          </div>
          {showFriday && (
            <div style={{ background: CBG, border: `1px solid #c7d2fe`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: "#312e81" }}>Nouveau message du vendredi</div>
              <div style={{ background: "#fffbeb", borderRadius: 8, padding: "10px 14px", marginBottom: 14, border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
                📌 C'est vous l'imam qui décidez du verset et du message. Aucune IA ne choisit le contenu religieux.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: "#312e81", marginBottom: 4 }}>Date du vendredi *</div><input type="date" value={fForm.date_vendredi} onChange={e => setFForm(f => ({ ...f, date_vendredi: e.target.value }))} style={inp} /></div>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: "#312e81", marginBottom: 4 }}>Sourate (optionnel)</div><input value={fForm.sourate_nom} onChange={e => setFForm(f => ({ ...f, sourate_nom: e.target.value }))} placeholder="Ex: Al-Baqara" style={inp} /></div>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: "#312e81", marginBottom: 4 }}>Texte arabe (optionnel)</div><input value={fForm.texte_arabe} onChange={e => setFForm(f => ({ ...f, texte_arabe: e.target.value }))} dir="rtl" style={{ ...inp, fontFamily: "serif", fontSize: 15 }} /></div>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: "#312e81", marginBottom: 4 }}>Traduction (optionnel)</div><input value={fForm.traduction} onChange={e => setFForm(f => ({ ...f, traduction: e.target.value }))} style={inp} /></div>
                <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, fontWeight: 600, color: "#312e81", marginBottom: 4 }}>Message de l'imam *</div><textarea value={fForm.message_imam} onChange={e => setFForm(f => ({ ...f, message_imam: e.target.value }))} rows={4} placeholder="Votre message aux fidèles..." style={{ ...inp, resize: "vertical" }} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={sendFriday} disabled={saving} style={{ padding: "8px 20px", background: C, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "Envoi..." : "📢 Envoyer à la communauté"}</button>
                <button onClick={() => setShowFriday(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map(a => (
              <div key={a.id} style={{ background: "white", borderRadius: 12, padding: 16, border: `1px solid ${a.is_sent ? "#c7d2fe" : "#f1f5f9"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>Vendredi {fmtDate(a.date_vendredi)}</div>
                  {a.is_sent ? <span style={{ padding: "2px 10px", background: CBG, color: C, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Envoyé · {a.nb_fideles_notifies || 0} fidèles</span> : <span style={{ padding: "2px 10px", background: "#f1f5f9", color: "#64748b", borderRadius: 20, fontSize: 11 }}>Brouillon</span>}
                </div>
                {a.sourate_nom && <div style={{ fontSize: 12, color: C, marginBottom: 6 }}>📖 {a.sourate_nom}</div>}
                {a.texte_arabe && <div style={{ fontFamily: "serif", fontSize: 16, textAlign: "right", direction: "rtl", color: "#1e293b", marginBottom: 8, lineHeight: 2 }}>{a.texte_arabe}</div>}
                {a.traduction && <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", marginBottom: 8 }}>"{a.traduction}"</div>}
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{a.message_imam}</div>
              </div>
            ))}
            {history.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun message du vendredi enregistré.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
