import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const ROSE       = "#e11d48";
const ROSE_DARK  = "#be123c";
const ROSE_LIGHT = "#f43f5e";
const ROSE_BG    = "#fff1f2";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
function fmtDate(d: string)   { return d ? new Date(d).toLocaleDateString("fr-FR") : ""; }

export default function NgoVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [ngo, setNgo]         = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/ngo/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/ngo/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setNgo(t.tenant);
      else setError(t.message || "ONG introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger l'ONG."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: ROSE_BG }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #fecdd3`, borderTopColor: ROSE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: ROSE_DARK, fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !ngo) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>ONG introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: ROSE, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour</button>
      </div>
    </div>
  );

  const stats    = data?.stats || {};
  const projects = data?.projects || [];
  const announces= data?.announcements || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:rgba(255,255,255,0.85);font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:white;border-bottom-color:rgba(255,255,255,0.6);}
        .proj-card{transition:all 0.25s;} .proj-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(225,29,72,0.12) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.proj-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.proj-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: ROSE_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {ngo.phone   && <span>📞 {ngo.phone}</span>}
            {ngo.email   && <span>✉ {ngo.email}</span>}
            {ngo.address && <span>📍 {ngo.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Solidarité & Action</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: ROSE, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {ngo.logo_url ? <img src={ngo.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🤝</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white" }}>{ngo.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>ONG · {tenantCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {[["Accueil","hero"],["Projets","projects"],["Rejoindre","join"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${ROSE_DARK} 0%,${ROSE} 55%,${ROSE_LIGHT} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
            {ngo.logo_url ? <img src={ngo.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 46 }}>🤝</span>}
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.2)", lineHeight: 1.2 }}>{ngo.name}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {ngo.description || "Une organisation dédiée au service de la communauté, portant des projets d'impact social pour un monde plus juste et solidaire."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("projects")} style={{ background: "white", color: ROSE_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Nos Projets
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
            { icon: "🚀", val: `${stats.projects || 0}`, label: "Projets en cours" },
            { icon: "📢", val: `${stats.announcements || 0}`, label: "Annonces" },
            { icon: "🌍", val: "Impact", label: "Changement social" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: ROSE, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROJETS */}
      <section id="projects" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ background: `${ROSE}18`, color: ROSE, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Nos Actions</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Projets & Initiatives</h2>
          </div>
          {projects.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>Aucun projet publié pour l'instant.</div>
          ) : (
            <div className="proj-g" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {projects.map((p: any, i: number) => (
                <div key={i} className="proj-card" style={{ background: "white", borderRadius: 16, padding: "24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "inline-block", background: p.statut === "en_cours" ? "#dcfce7" : "#f1f5f9", color: p.statut === "en_cours" ? "#16a34a" : "#64748b", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {p.statut || "En cours"}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.3 }}>{p.nom}</h3>
                  {p.description && <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 12px" }}>{p.description}</p>}
                  {p.beneficiaires && (
                    <div style={{ fontSize: 12, color: ROSE, fontWeight: 600 }}>👥 {p.beneficiaires} bénéficiaires</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ANNONCES */}
      {announces.length > 0 && (
        <section style={{ background: "white", padding: "40px 20px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 24, textAlign: "center" }}>Actualités</h2>
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
      <section id="join" style={{ background: `linear-gradient(135deg,${ROSE_DARK},${ROSE})`, padding: "60px 20px", color: "white", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Rejoindre notre cause</h2>
          <p style={{ fontSize: 15, opacity: 0.88, lineHeight: 1.7, marginBottom: 32 }}>
            Ensemble, nous pouvons changer des vies. Contactez-nous pour devenir membre, bénévole ou partenaire de notre organisation.
          </p>
          {ngo.phone && (
            <button onClick={() => window.open(`https://wa.me/${ngo.phone.replace(/\D/g,"")}?text=${encodeURIComponent("Bonjour, je souhaite rejoindre votre ONG et m'engager pour la cause.")}`, "_blank")}
              style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              📲 Nous contacter via WhatsApp
            </button>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nous Contacter</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { icon: "📞", label: "Téléphone", val: ngo.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: ngo.email || "Non renseigné" },
              { icon: "📍", label: "Adresse", val: ngo.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: ROSE_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 8 }}>{ngo.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>ONG · Solidarité · {tenantCode}</p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          Propulsé par <strong style={{ color: "white" }}>Moftal</strong>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
