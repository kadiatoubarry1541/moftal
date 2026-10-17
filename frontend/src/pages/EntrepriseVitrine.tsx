import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";
import LogoEtablissement from "../components/LogoEtablissement";
import EcrireAuSite from "../components/EcrireAuSite";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const BLUE       = "#2563eb";
const BLUE_DARK  = "#1d4ed8";
const BLUE_LIGHT = "#3b82f6";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

export default function EntrepriseVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [ent, setEnt]         = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/enterprise/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/enterprise/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setEnt(t.tenant);
      else setError(t.message || "Entreprise introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger l'entreprise."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #bfdbfe`, borderTopColor: BLUE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: BLUE_DARK, fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !ent) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏢</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Entreprise introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: BLUE, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour</button>
      </div>
    </div>
  );

  const stats     = data?.stats || {};
  const employees = data?.employees || [];
  const announces = data?.announcements || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:#334155;font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:#0f172a;border-bottom-color:${BLUE};}
        .emp-card{transition:all 0.25s;} .emp-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.1) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.emp-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.emp-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#f8fafc", color: "#334155", borderBottom: "1px solid #e2e8f0", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {ent.phone   && <span>📞 {ent.phone}</span>}
            {ent.email   && <span>✉ {ent.email}</span>}
            {ent.address && <span>📍 {ent.address}</span>}
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(15,23,42,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={ent.logo_url} name={ent.name} fontSize={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{ent.name}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>Entreprise</div>
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
      <section id="hero" style={{ background: "#f8fafc", padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "white", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <LogoEtablissement src={ent.logo_url} name={ent.name} fontSize={46} />
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>{ent.name}</h1>
          <p style={{ fontSize: 17, color: "#334155", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {ent.description || "Une entreprise dynamique et innovante au service de ses clients. Des solutions professionnelles adaptées à vos besoins."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("services")} style={{ background: BLUE, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }}>
              Nos Services
            </button>
            <button onClick={() => scrollTo("contact")} style={{ background: "white", color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Nous Contacter
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
            { icon: "👥", val: `${stats.employees || 0}`, label: "Employés" },
            { icon: "🤝", val: `${stats.clients || 0}`, label: "Clients partenaires" },
            { icon: "📋", val: `${stats.contracts || 0}`, label: "Contrats en cours" },
            { icon: "🏆", val: "Excellence", label: "Notre standard" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ background: `${BLUE}18`, color: BLUE, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Ce que nous offrons</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Nos Domaines d'Expertise</h2>
            <p style={{ color: "#64748b", fontSize: 15, maxWidth: 500, margin: "0 auto" }}>Des services sur-mesure pour accompagner votre croissance.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { icon: "💼", title: "Conseil & Stratégie", desc: "Accompagnement stratégique pour optimiser votre activité." },
              { icon: "⚡", title: "Solutions techniques", desc: "Expertise technique pour résoudre vos défis opérationnels." },
              { icon: "📈", title: "Développement commercial", desc: "Expansion de votre marché et croissance de votre clientèle." },
              { icon: "🔒", title: "Conformité & Gestion", desc: "Gestion administrative et mise en conformité réglementaire." },
              { icon: "🌍", title: "Partenariats", desc: "Développement de partenariats locaux et internationaux." },
              { icon: "📊", title: "Reporting & Analyse", desc: "Tableaux de bord et analyses pour piloter votre performance." },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 16, padding: "24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${BLUE}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ÉQUIPE */}
      {employees.length > 0 && (
        <section id="team" style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Notre Équipe</h2>
            </div>
            <div className="emp-g" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {employees.map((e: any, i: number) => (
                <div key={i} className="emp-card" style={{ background: "white", borderRadius: 16, padding: "24px 20px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${BLUE},${BLUE_LIGHT})`, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, fontWeight: 700 }}>
                    {(e.prenom || "?").charAt(0)}{(e.nom || "?").charAt(0)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{e.prenom} {e.nom}</div>
                  {e.poste && <div style={{ fontSize: 12, color: BLUE, fontWeight: 600, marginBottom: 2 }}>{e.poste}</div>}
                  {e.departement && <div style={{ fontSize: 11, color: "#94a3b8" }}>{e.departement}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* POURQUOI NOUS */}
      <section style={{ background: "#f8fafc", padding: "60px 20px", color: "#0f172a" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 48 }}>Pourquoi nous choisir ?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 900, margin: "0 auto" }}>
            {[
              { icon: "🎯", title: "Expertise reconnue", desc: "Des années d'expérience dans notre domaine, des résultats prouvés." },
              { icon: "🤝", title: "Partenariat durable", desc: "Nous construisons des relations long terme avec nos clients." },
              { icon: "⚡", title: "Réactivité", desc: "Des équipes disponibles et réactives pour répondre à vos besoins." },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 16, padding: "28px 24px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
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
              { icon: "📞", label: "Téléphone", val: ent.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: ent.email || "Non renseigné" },
              { icon: "📍", label: "Adresse", val: ent.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
              <EcrireAuSite tenantCode={tenantCode!} nomEtablissement={ent.name} couleur={BLUE} objet={"Demande d'information"}
                messageInitial={"Bonjour, je souhaite des informations sur vos services."}
                style={{ background: BLUE, color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                ✉️ Nous écrire
              </EcrireAuSite>
            </div>
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#2563eb" accentDark="#1e3a8a" />

      {/* FOOTER */}
      <footer style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", color: "#64748b", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>{ent.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>Entreprise</p>
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}><img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5, background: "white", borderRadius: 4, padding: 1 }} />Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
