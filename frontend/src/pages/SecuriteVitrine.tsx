import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const DARK      = "#0f172a";
const GRAY      = "#334155";
const GRAY_LIGHT= "#475569";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

export default function SecuriteVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [agency, setAgency]   = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/security_agency/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/security_agency/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setAgency(t.tenant);
      else setError(t.message || "Agence introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger l'agence."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #e2e8f0`, borderTopColor: DARK, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: DARK, fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !agency) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🛡️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Agence introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: DARK, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour</button>
      </div>
    </div>
  );

  const stats  = data?.stats || {};
  const agents = data?.agents || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:rgba(255,255,255,0.85);font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:white;border-bottom-color:rgba(255,255,255,0.6);}
        .svc-card{transition:all 0.2s;} .svc-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,0.12) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {agency.phone   && <span>🚨 {agency.phone} (urgences)</span>}
            {agency.email   && <span>✉ {agency.email}</span>}
            {agency.address && <span>📍 {agency.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Sécurité & Protection</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: DARK, boxShadow: "0 2px 12px rgba(0,0,0,0.4)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {agency.logo_url ? <img src={agency.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🛡️</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white" }}>{agency.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>Sécurité · {tenantCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Accueil","hero"],["Services","services"],["Équipe","team"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${DARK} 0%,${GRAY} 60%,${GRAY_LIGHT} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.1)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)" }}>
            {agency.logo_url ? <img src={agency.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 46 }}>🛡️</span>}
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.3)", lineHeight: 1.2 }}>{agency.name}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.8)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {agency.description || "Votre sécurité, notre priorité absolue. Des agents professionnels et une couverture sécuritaire de qualité pour protéger ce qui compte."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("services")} style={{ background: "white", color: DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
              Nos Services
            </button>
            {agency.phone && (
              <button onClick={() => window.open(`tel:${agency.phone}`, "_blank")}
                style={{ background: "#dc2626", color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                🚨 Urgence
              </button>
            )}
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
            { icon: "👮", val: `${stats.agents || 0}`, label: "Agents qualifiés" },
            { icon: "🎯", val: `${stats.missions || 0}`, label: "Missions en cours" },
            { icon: "⏰", val: "24h/24", label: "Disponibilité" },
            { icon: "🛡️", val: "Certifié", label: "Agence agréée" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>Nos Services de Sécurité</h2>
            <p style={{ color: "#64748b", fontSize: 15, marginTop: 8 }}>Solutions de protection complètes pour particuliers et entreprises.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { icon: "🏢", title: "Gardiennage", desc: "Protection de bâtiments, sites industriels et résidences privées." },
              { icon: "👤", title: "Protection rapprochée", desc: "Agents d'élite pour la protection de personnes importantes." },
              { icon: "📹", title: "Surveillance CCTV", desc: "Installation et monitoring de systèmes de vidéosurveillance." },
              { icon: "🚗", title: "Escorte & Convoyage", desc: "Transport sécurisé de valeurs et de personnes." },
              { icon: "🔍", title: "Audit de sécurité", desc: "Évaluation des risques et recommandations sécuritaires." },
              { icon: "📱", title: "Télésurveillance", desc: "Surveillance à distance 24h/24, 7j/7 avec intervention rapide." },
            ].map((item, i) => (
              <div key={i} className="svc-card" style={{ background: "white", borderRadius: 16, padding: "24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${DARK}08`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AGENTS */}
      {agents.length > 0 && (
        <section id="team" style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>Nos Agents</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {agents.map((a: any, i: number) => (
                <div key={i} style={{ background: "#f8fafc", borderRadius: 14, padding: "20px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: DARK, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18, fontWeight: 700 }}>
                    {(a.prenom || "?").charAt(0)}{(a.nom || "?").charAt(0)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{a.prenom} {a.nom}</div>
                  {a.grade && <div style={{ fontSize: 12, color: GRAY, fontWeight: 600 }}>{a.grade}</div>}
                  {a.specialite && <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.specialite}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="contact" style={{ background: DARK, padding: "60px 20px", color: "white" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>Demander un devis</h2>
            <p style={{ opacity: 0.8, fontSize: 15 }}>Contactez-nous pour une évaluation gratuite de vos besoins en sécurité.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 780, margin: "0 auto" }}>
            {[
              { icon: "🚨", label: "Urgences 24h/24", val: agency.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: agency.email || "Non renseigné" },
              { icon: "📍", label: "Siège", val: agency.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "24px 16px", background: "rgba(255,255,255,0.07)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)" }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.val}</div>
              </div>
            ))}
          </div>
          {agency.phone && (
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button onClick={() => window.open(`https://wa.me/${agency.phone.replace(/\D/g,"")}?text=${encodeURIComponent("Bonjour, je souhaite un devis pour vos services de sécurité.")}`, "_blank")}
                style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                📲 Demander un devis WhatsApp
              </button>
            </div>
          )}
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#334155" accentDark="#020617" />

      {/* FOOTER */}
      <footer style={{ background: "#020617", color: "rgba(255,255,255,0.6)", padding: "28px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 8 }}>{agency.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>Agence de Sécurité · {tenantCode}</p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          Propulsé par <strong style={{ color: "white" }}>Moftal</strong>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
