import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const VIOLET      = "#7c3aed";
const VIOLET_DARK = "#5b21b6";
const VIOLET_LIGHT= "#8b5cf6";
const VIOLET_BG   = "#f5f3ff";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
function fmtDate(d: string)   { return d ? new Date(d).toLocaleDateString("fr-FR") : ""; }

export default function ReseauVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [reseau, setReseau]   = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/reseau/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/reseau/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setReseau(t.tenant);
      else setError(t.message || "Réseau introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger ce réseau."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: VIOLET_BG }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #ddd6fe`, borderTopColor: VIOLET, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: VIOLET_DARK, fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !reseau) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌐</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Réseau introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: VIOLET, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour</button>
      </div>
    </div>
  );

  const stats     = data?.stats || {};
  const members   = data?.members || [];
  const announces = data?.announcements || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:rgba(255,255,255,0.85);font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:white;border-bottom-color:rgba(255,255,255,0.6);}
        .mem-card{transition:all 0.25s;} .mem-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(124,58,237,0.12) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.mem-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.mem-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: VIOLET_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {reseau.phone   && <span>📞 {reseau.phone}</span>}
            {reseau.email   && <span>✉ {reseau.email}</span>}
            {reseau.address && <span>📍 {reseau.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Réseau Professionnel</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: VIOLET, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {reseau.logo_url ? <img src={reseau.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🌐</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white" }}>{reseau.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>Réseau Pro · {tenantCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Accueil","hero"],["Membres","members"],["Actualités","news"],["Rejoindre","join"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${VIOLET_DARK} 0%,${VIOLET} 55%,${VIOLET_LIGHT} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
            {reseau.logo_url ? <img src={reseau.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 46 }}>🌐</span>}
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.2)", lineHeight: 1.2 }}>{reseau.name}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {reseau.description || "Un réseau de professionnels unis pour partager, collaborer et créer des opportunités ensemble. Rejoignez une communauté dynamique."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("members")} style={{ background: "white", color: VIOLET_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Voir les membres
            </button>
            <button onClick={() => scrollTo("join")} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Nous rejoindre
            </button>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0 }}>
          <svg viewBox="0 0 1440 60" fill="white" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 60 }}>
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: "white", padding: "0 20px 48px" }}>
        <div className="stats-g" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, transform: "translateY(-30px)" }}>
          {[
            { icon: "👥", val: `${stats.members || 0}`, label: "Membres actifs" },
            { icon: "🚀", val: `${stats.projects || 0}`, label: "Projets collaboratifs" },
            { icon: "📢", val: `${stats.announcements || 0}`, label: "Annonces" },
            { icon: "🤝", val: "Synergies", label: "Notre valeur ajoutée" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: VIOLET, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MEMBRES */}
      {members.length > 0 && (
        <section id="members" style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ background: `${VIOLET}18`, color: VIOLET, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>La communauté</span>
              <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Nos Membres</h2>
            </div>
            <div className="mem-g" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {members.map((m: any, i: number) => (
                <div key={i} className="mem-card" style={{ background: "white", borderRadius: 16, padding: "24px 20px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${VIOLET},${VIOLET_LIGHT})`, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, fontWeight: 700 }}>
                    {(m.prenom || "?").charAt(0)}{(m.nom || "?").charAt(0)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{m.prenom} {m.nom}</div>
                  {m.poste && <div style={{ fontSize: 12, color: VIOLET, fontWeight: 600, marginBottom: 2 }}>{m.poste}</div>}
                  {m.secteur && <div style={{ fontSize: 11, color: "#94a3b8" }}>{m.secteur}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ANNONCES */}
      {announces.length > 0 && (
        <section id="news" style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>Actualités du réseau</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {announces.map((ann: any, i: number) => (
                <div key={i} style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 24px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{ann.titre}</div>
                  {ann.contenu && <div style={{ fontSize: 13, color: "#475569" }}>{ann.contenu}</div>}
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{fmtDate(ann.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REJOINDRE */}
      <section id="join" style={{ background: `linear-gradient(135deg,${VIOLET_DARK},${VIOLET})`, padding: "60px 20px", color: "white", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Rejoindre le réseau</h2>
          <p style={{ fontSize: 15, opacity: 0.88, lineHeight: 1.7, marginBottom: 32 }}>
            Vous êtes professionnel et souhaitez rejoindre notre réseau ? Contactez-nous pour intégrer notre communauté et accéder à des opportunités exclusives.
          </p>
          {reseau.phone && (
            <button onClick={() => window.open(`https://wa.me/${reseau.phone.replace(/\D/g,"")}?text=${encodeURIComponent("Bonjour, je souhaite rejoindre votre réseau professionnel.")}`, "_blank")}
              style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              📲 Contacter via WhatsApp
            </button>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 36 }}>
            {[
              { icon: "📞", label: "Téléphone", val: reseau.phone || "—" },
              { icon: "✉️", label: "Email", val: reseau.email || "—" },
              { icon: "📍", label: "Adresse", val: reseau.address || "—" },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 12px", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#7c3aed" accentDark="#3b0764" />

      {/* FOOTER */}
      <footer style={{ background: VIOLET_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 8 }}>{reseau.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>Réseau Professionnel · {tenantCode}</p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          Propulsé par <strong style={{ color: "white" }}>Moftal</strong> · Réseau Professionnel Africain
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
