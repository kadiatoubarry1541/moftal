import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import { getSessionUser } from "../utils/auth";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

// ── Configuration par type de professionnel ─────────────────────────────────

interface TypeConfig {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  gradient: string;
  structureLabel: string;
  structurePlaceholder: string;
  communityLabel: string;
  communityIcon: string;
  announcementLabel: string;
  announcementIcon: string;
  announcementPlaceholder: string;
  peerLabel: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  imam: {
    label: "Réseau des Imams", emoji: "🕋", color: "#7c3aed", bg: "#f5f3ff",
    gradient: "linear-gradient(135deg,#5b21b6,#7c3aed)",
    structureLabel: "Mosquée", structurePlaceholder: "Ex: Grande Mosquée de Conakry",
    communityLabel: "Fidèles", communityIcon: "🕌",
    announcementLabel: "Message du vendredi", announcementIcon: "📜",
    announcementPlaceholder: "Votre message aux fidèles...",
    peerLabel: "Imams",
  },
  mosque: {
    label: "Réseau Islamique", emoji: "🕌", color: "#1a8f1a", bg: "#f0fdf0",
    gradient: "linear-gradient(135deg,#0f4b0f,#1a8f1a)",
    structureLabel: "Mosquée", structurePlaceholder: "Ex: Mosquée Al-Fatiha",
    communityLabel: "Fidèles", communityIcon: "👥",
    announcementLabel: "Annonce", announcementIcon: "📢",
    announcementPlaceholder: "Votre annonce à la communauté...",
    peerLabel: "Mosquées",
  },
  clinic: {
    label: "Réseau Médical", emoji: "⚕️", color: "#1a8f1a", bg: "#f0fdfa",
    gradient: "linear-gradient(135deg,#093809,#1a8f1a)",
    structureLabel: "Établissement de santé", structurePlaceholder: "Ex: Clinique Espoir",
    communityLabel: "Patients", communityIcon: "🏥",
    announcementLabel: "Bulletin de santé", announcementIcon: "💊",
    announcementPlaceholder: "Votre bulletin ou conseil de santé...",
    peerLabel: "Médecins / Cliniques",
  },
  school: {
    label: "Réseau Éducatif", emoji: "🏫", color: "#1a8f1a", bg: "#f0fdf0",
    gradient: "linear-gradient(135deg,#14532d,#1a8f1a)",
    structureLabel: "École / Université", structurePlaceholder: "Ex: École Primaire Les Enfants",
    communityLabel: "Élèves", communityIcon: "🎓",
    announcementLabel: "Annonce scolaire", announcementIcon: "📚",
    announcementPlaceholder: "Votre annonce aux élèves et parents...",
    peerLabel: "Enseignants / Écoles",
  },
  madrasa: {
    label: "Réseau Madrasas", emoji: "📖", color: "#0891b2", bg: "#ecfeff",
    gradient: "linear-gradient(135deg,#164e63,#0891b2)",
    structureLabel: "Madrasa / Daroul", structurePlaceholder: "Ex: Madrasa Al-Nour",
    communityLabel: "Élèves", communityIcon: "📖",
    announcementLabel: "Annonce", announcementIcon: "📝",
    announcementPlaceholder: "Votre annonce aux élèves et familles...",
    peerLabel: "Madrasas",
  },
  enterprise: {
    label: "Réseau Entreprises", emoji: "🏢", color: "#6366f1", bg: "#eef2ff",
    gradient: "linear-gradient(135deg,#312e81,#6366f1)",
    structureLabel: "Entreprise", structurePlaceholder: "Ex: SARL Diallo & Frères",
    communityLabel: "Partenaires", communityIcon: "🤝",
    announcementLabel: "Communiqué", announcementIcon: "📊",
    announcementPlaceholder: "Votre communiqué ou offre de partenariat...",
    peerLabel: "Entreprises",
  },
  commerce: {
    label: "Réseau Commerce", emoji: "🏪", color: "#d97706", bg: "#fffbeb",
    gradient: "linear-gradient(135deg,#78350f,#d97706)",
    structureLabel: "Boutique / Commerce", structurePlaceholder: "Ex: Boutique Mama Diallo",
    communityLabel: "Clients", communityIcon: "🛍️",
    announcementLabel: "Offre / Promo", announcementIcon: "🏷️",
    announcementPlaceholder: "Votre offre ou promotion...",
    peerLabel: "Commerçants",
  },
  ngo: {
    label: "Réseau ONG & Associations", emoji: "🤝", color: "#e11d48", bg: "#fff1f2",
    gradient: "linear-gradient(135deg,#9f1239,#e11d48)",
    structureLabel: "Association / ONG", structurePlaceholder: "Ex: Association Solidarité Guinée",
    communityLabel: "Bénévoles", communityIcon: "💚",
    announcementLabel: "Appel à la solidarité", announcementIcon: "💚",
    announcementPlaceholder: "Votre appel aux bénévoles et donateurs...",
    peerLabel: "ONG / Associations",
  },
  security_agency: {
    label: "Réseau Sécurité", emoji: "🛡️", color: "#475569", bg: "#f8fafc",
    gradient: "linear-gradient(135deg,#1e293b,#475569)",
    structureLabel: "Agence de sécurité", structurePlaceholder: "Ex: Agence Sécurité Plus",
    communityLabel: "Agents", communityIcon: "🔒",
    announcementLabel: "Note de service", announcementIcon: "🔒",
    announcementPlaceholder: "Votre note de service ou alerte...",
    peerLabel: "Agences de sécurité",
  },
  supplier: {
    label: "Réseau Fournisseurs", emoji: "🚚", color: "#0e7490", bg: "#ecfeff",
    gradient: "linear-gradient(135deg,#164e63,#0e7490)",
    structureLabel: "Fournisseur / Grossiste", structurePlaceholder: "Ex: Importations Camara",
    communityLabel: "Clients / Revendeurs", communityIcon: "📦",
    announcementLabel: "Offre commerciale", announcementIcon: "📦",
    announcementPlaceholder: "Votre offre ou disponibilité de stock...",
    peerLabel: "Fournisseurs",
  },
  journalist: {
    label: "Réseau Journalistes", emoji: "📰", color: "#dc2626", bg: "#fff1f2",
    gradient: "linear-gradient(135deg,#7f1d1d,#dc2626)",
    structureLabel: "Média / Rédaction", structurePlaceholder: "Ex: Journal La Vérité",
    communityLabel: "Lecteurs / Abonnés", communityIcon: "📰",
    announcementLabel: "Article / Actualité", announcementIcon: "📰",
    announcementPlaceholder: "Votre article ou flash d'actualité...",
    peerLabel: "Journalistes / Médias",
  },
  scientist: {
    label: "Réseau Scientifiques", emoji: "🔬", color: "#4338ca", bg: "#eef2ff",
    gradient: "linear-gradient(135deg,#1e1b4b,#4338ca)",
    structureLabel: "Laboratoire / Institut", structurePlaceholder: "Ex: Laboratoire Recherche Santé",
    communityLabel: "Chercheurs / Étudiants", communityIcon: "🔬",
    announcementLabel: "Publication / Résultat", announcementIcon: "🔬",
    announcementPlaceholder: "Votre publication ou résultat de recherche...",
    peerLabel: "Scientifiques / Chercheurs",
  },
};

const DEFAULT_CONFIG: TypeConfig = {
  label: "Réseau Professionnel", emoji: "🌐", color: "#64748b", bg: "#f8fafc",
  gradient: "linear-gradient(135deg,#334155,#64748b)",
  structureLabel: "Structure", structurePlaceholder: "Nom de votre structure",
  communityLabel: "Membres", communityIcon: "👥",
  announcementLabel: "Annonce", announcementIcon: "📢",
  announcementPlaceholder: "Votre annonce...",
  peerLabel: "Professionnels",
};

type Tab = "profile" | "connections" | "community" | "announcements";

export default function ReseauPro() {
  const navigate = useNavigate();
  const { type = "imam" } = useParams<{ type: string }>();
  const user = getSessionUser();
  const cfg = TYPE_CONFIG[type] || DEFAULT_CONFIG;
  const BASE = `${API}/api/pro-network`;

  const [tab, setTab]             = useState<Tab>("profile");
  const [profile, setProfile]     = useState<any>(null);
  const [connections, setConns]   = useState<any[]>([]);
  const [pending, setPending]     = useState<any[]>([]);
  const [community, setCommunity] = useState<any[]>([]);
  const [history, setHistory]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [showForm, setShowForm]   = useState(false);

  const [pForm, setPForm] = useState({ nom_structure: "", adresse: "", quartier: "", ville: "", pays: "Guinée", bio: "" });
  const [aForm, setAForm] = useState({ titre: "", contenu: "", date_annonce: new Date().toISOString().slice(0, 10) });

  useEffect(() => { if (!user) { navigate("/login"); return; } loadProfile(); }, [type]);
  useEffect(() => {
    if (tab === "connections") loadConnections();
    if (tab === "community")   loadCommunity();
    if (tab === "announcements") loadHistory();
  }, [tab, type]);

  async function loadProfile() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/${type}/profile/me`, { headers: auth() });
      if (r.ok) {
        const d = await r.json();
        setProfile(d.profile || null);
        if (d.profile) setPForm({ nom_structure: d.profile.nom_structure || "", adresse: d.profile.adresse || "", quartier: d.profile.quartier || "", ville: d.profile.ville || "", pays: d.profile.pays || "Guinée", bio: d.profile.bio || "" });
      }
    } catch { /**/ }
    setLoading(false);
  }

  async function loadConnections() {
    const r = await fetch(`${BASE}/${type}/connections`, { headers: auth() });
    const d = await r.json();
    setConns(d.connections || []);
    setPending(d.pending || []);
  }

  async function loadCommunity() {
    const r = await fetch(`${BASE}/${type}/community`, { headers: auth() });
    const d = await r.json();
    setCommunity(d.members || []);
  }

  async function loadHistory() {
    const r = await fetch(`${BASE}/${type}/announcement/history`, { headers: auth() });
    const d = await r.json();
    setHistory(d.history || []);
  }

  async function saveProfile() {
    if (!pForm.nom_structure || !pForm.ville) return;
    setSaving(true);
    const r = await fetch(`${BASE}/${type}/register`, { method: "POST", headers: auth(), body: JSON.stringify(pForm) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { setProfile(d.profile); setEditMode(false); }
  }

  async function acceptConn(fromNh: string) {
    await fetch(`${BASE}/${type}/connect/${fromNh}/accept`, { method: "PUT", headers: auth() });
    loadConnections();
  }

  async function sendAnnouncement() {
    if (!aForm.contenu) return;
    setSaving(true);
    const r = await fetch(`${BASE}/${type}/announcement`, { method: "POST", headers: auth(), body: JSON.stringify(aForm) });
    const d = await r.json();
    if (d.success) {
      const s = await (await fetch(`${BASE}/${type}/announcement/${d.announcement.id}/send`, { method: "POST", headers: auth() })).json();
      setSaving(false);
      setShowForm(false);
      setAForm({ titre: "", contenu: "", date_annonce: new Date().toISOString().slice(0, 10) });
      alert(`Envoyé à ${s.nb_notifies || 0} membre(s).`);
      loadHistory();
    } else { setSaving(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${cfg.bg}`, borderTopColor: cfg.color, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const inp = { border: `1px solid ${cfg.color}44`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const };
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "profile",       label: "Profil",         icon: cfg.emoji },
    { id: "connections",   label: "Connexions",      icon: "🤝" },
    { id: "community",     label: cfg.communityLabel, icon: cfg.communityIcon },
    { id: "announcements", label: cfg.announcementLabel, icon: cfg.announcementIcon },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ background: cfg.gradient, borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{cfg.emoji}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "white" }}>{cfg.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>Réseau de {cfg.peerLabel} · Communauté & Annonces</div>
          </div>
        </div>
        <button onClick={() => navigate("/gestion-interne")} style={{ padding: "8px 16px", background: "rgba(255,255,255,.2)", color: "white", border: "1px solid rgba(255,255,255,.3)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Retour</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f8fafc", borderRadius: 10, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? "white" : "transparent", color: tab === t.id ? cfg.color : "#64748b", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.1)" : "none" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Profil ── */}
      {tab === "profile" && (
        <div style={{ animation: "fi .2s ease" }}>
          {!profile && !editMode && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>{cfg.emoji}</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Rejoignez le {cfg.label}</h2>
              <p style={{ color: "#64748b", marginBottom: 24 }}>Connectez-vous avec d'autres {cfg.peerLabel.toLowerCase()}, gérez votre communauté et diffusez vos annonces.</p>
              <button onClick={() => setEditMode(true)} style={{ padding: "12px 28px", background: cfg.color, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15 }}>
                Créer mon profil
              </button>
            </div>
          )}
          {profile && !editMode && (
            <div style={{ background: cfg.bg, borderRadius: 12, padding: 20, border: `1px solid ${cfg.color}33` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "white", flexShrink: 0, overflow: "hidden" }}>
                  {profile.photo ? <img src={profile.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : cfg.emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.prenom} {profile.nom_famille}</div>
                  <div style={{ fontWeight: 600, color: cfg.color, fontSize: 14 }}>{profile.nom_structure}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{profile.quartier ? `${profile.quartier}, ` : ""}{profile.ville}{profile.pays ? `, ${profile.pays}` : ""}</div>
                </div>
              </div>
              {profile.bio && <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, borderTop: `1px solid ${cfg.color}22`, paddingTop: 12 }}>{profile.bio}</div>}
              <button onClick={() => setEditMode(true)} style={{ marginTop: 14, padding: "7px 16px", background: "white", color: cfg.color, border: `1px solid ${cfg.color}`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Modifier</button>
            </div>
          )}
          {editMode && (
            <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>{profile ? "Modifier mon profil" : "Créer mon profil"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  [`${cfg.structureLabel} *`, "nom_structure"],
                  ["Adresse", "adresse"],
                  ["Quartier", "quartier"],
                  ["Ville *", "ville"],
                  ["Pays", "pays"],
                ] as [string, keyof typeof pForm][]).map(([lbl, k]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, marginBottom: 4 }}>{lbl}</div>
                    <input value={pForm[k]} onChange={e => setPForm(f => ({ ...f, [k]: e.target.value }))} placeholder={k === "nom_structure" ? cfg.structurePlaceholder : ""} style={inp} />
                  </div>
                ))}
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, marginBottom: 4 }}>Présentation</div>
                  <textarea value={pForm.bio} onChange={e => setPForm(f => ({ ...f, bio: e.target.value }))} rows={3} placeholder="Décrivez votre activité..." style={{ ...inp, resize: "vertical" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={saveProfile} disabled={saving} style={{ padding: "8px 20px", background: cfg.color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setEditMode(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Connexions ── */}
      {tab === "connections" && (
        <div style={{ animation: "fi .2s ease" }}>
          {pending.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: "#92400e" }}>⏳ Demandes en attente ({pending.length})</div>
              {pending.map((c: any) => (
                <div key={c.from_numero_h} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #fef3c7" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.prenom} {c.nom_famille}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{c.nom_structure} · {c.ville}</div>
                  </div>
                  <button onClick={() => acceptConn(c.from_numero_h)} style={{ padding: "6px 14px", background: "#dcfcdc", color: "#1a8f1a", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Accepter</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Mes connexions ({connections.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {connections.map((c: any) => (
              <div key={c.to_numero_h} style={{ background: "white", borderRadius: 10, padding: 14, border: `1px solid ${cfg.color}22` }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden" }}>
                  {c.photo ? <img src={c.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 18 }}>{cfg.emoji}</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.prenom} {c.nom_famille}</div>
                <div style={{ fontSize: 12, color: cfg.color, marginTop: 2 }}>{c.nom_structure}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{c.quartier ? `${c.quartier}, ` : ""}{c.ville}</div>
              </div>
            ))}
            {connections.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune connexion pour l'instant.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Communauté ── */}
      {tab === "community" && (
        <div style={{ animation: "fi .2s ease" }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Ma communauté de {cfg.communityLabel.toLowerCase()}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>{community.length} {cfg.communityLabel.toLowerCase()}</div>
          {community.length === 0 ? (
            <div style={{ background: cfg.bg, borderRadius: 12, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{cfg.communityIcon}</div>
              <div style={{ fontWeight: 600, color: cfg.color }}>Votre communauté est vide</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Les {cfg.communityLabel.toLowerCase()} qui vous suivent apparaissent ici</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {community.map((m: any) => (
                <div key={m.member_numero_h} style={{ background: "white", borderRadius: 10, padding: "12px 16px", border: `1px solid ${cfg.color}22`, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: cfg.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
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

      {/* ── Annonces ── */}
      {tab === "announcements" && (
        <div style={{ animation: "fi .2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{cfg.announcementLabel}s</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Envoyé à tous vos {cfg.communityLabel.toLowerCase()}</div>
            </div>
            <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", background: cfg.color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              {cfg.announcementIcon} Nouvelle annonce
            </button>
          </div>

          {showForm && (
            <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: cfg.color }}>Nouvelle {cfg.announcementLabel.toLowerCase()}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, marginBottom: 4 }}>Date *</div>
                  <input type="date" value={aForm.date_annonce} onChange={e => setAForm(f => ({ ...f, date_annonce: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, marginBottom: 4 }}>Titre (optionnel)</div>
                  <input value={aForm.titre} onChange={e => setAForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: Réunion importante" style={inp} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, marginBottom: 4 }}>Contenu *</div>
                  <textarea value={aForm.contenu} onChange={e => setAForm(f => ({ ...f, contenu: e.target.value }))} rows={4} placeholder={cfg.announcementPlaceholder} style={{ ...inp, resize: "vertical" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={sendAnnouncement} disabled={saving} style={{ padding: "8px 20px", background: cfg.color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                  {saving ? "Envoi..." : `📢 Envoyer à la communauté`}
                </button>
                <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((a: any) => (
              <div key={a.id} style={{ background: "white", borderRadius: 12, padding: 16, border: `1px solid ${a.is_sent ? cfg.color + "33" : "#f1f5f9"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{a.titre || cfg.announcementLabel} — {fmtDate(a.date_annonce)}</div>
                  {a.is_sent
                    ? <span style={{ padding: "2px 10px", background: cfg.bg, color: cfg.color, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Envoyé · {a.nb_notifies || 0} {cfg.communityLabel.toLowerCase()}</span>
                    : <span style={{ padding: "2px 10px", background: "#f1f5f9", color: "#64748b", borderRadius: 20, fontSize: 11 }}>Brouillon</span>
                  }
                </div>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{a.contenu}</div>
              </div>
            ))}
            {history.length === 0 && (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune annonce enregistrée.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
