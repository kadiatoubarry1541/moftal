import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API_BASE = config.API_BASE_URL || "http://localhost:5002/api";

const BLUE      = "#1d4ed8";
const BLUE_DARK = "#1e3a8a";
const BLUE_MID  = "#2563eb";

const SERVICES_MAIRIE = [
  { icon: "💍", label: "Acte de Mariage",            desc: "Enregistrement et délivrance des actes de mariage. Dossier traité en quelques jours ouvrables." },
  { icon: "👶", label: "Acte de Naissance",           desc: "Déclaration et certification des naissances. Document officiel délivré après vérification." },
  { icon: "📋", label: "Acte de Décès",               desc: "Déclaration et enregistrement des décès. Traitement respectueux et rapide du dossier." },
  { icon: "🏠", label: "Certificat de Résidence",     desc: "Attestation officielle de domicile pour vos démarches administratives, bancaires ou professionnelles." },
  { icon: "📄", label: "Légalisation de Documents",   desc: "Authentification et certification de copies de documents officiels." },
  { icon: "🗂️", label: "Archivage & Registres",       desc: "Conservation et consultation des registres d'état civil. Recherche d'anciens actes." },
];

function getInitials(prenom: string, nom: string) {
  return `${(prenom || "").charAt(0)}${(nom || "").charAt(0)}`.toUpperCase();
}

export default function MaireVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();

  const [mairie, setMairie]   = useState<any>(null);
  const [agents, setAgents]   = useState<any[]>([]);
  const [stats, setStats]     = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API_BASE}/mairie-public/${code}`).then(r => r.json()),
      fetch(`${API_BASE}/mairie-public/${code}/agents`).then(r => r.json()),
      fetch(`${API_BASE}/mairie-public/${code}/stats`).then(r => r.json()),
    ]).then(([m, a, s]) => {
      if (m.success) setMairie(m.mairie);
      else setError(m.message || "Mairie introuvable");
      if (a.success) setAgents(a.agents);
      if (s.success) setStats(s.stats);
    }).catch(() => setError("Impossible de charger la mairie."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenu(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#eff6ff" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #e2e8f0`, borderTopColor: BLUE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: BLUE_DARK, fontSize: 14, fontWeight: 600 }}>Chargement en cours…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !mairie) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Mairie introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error || "Cette mairie n'est pas disponible."}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: BLUE, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  );

  const chefs = agents.filter(a => a.role === "Directeur" || a.role === "Chef de service");
  const autresAgents = agents.filter(a => a.role !== "Directeur" && a.role !== "Chef de service");

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        .vitrine-nav-link  { color: rgba(255,255,255,0.85); font-weight: 500; font-size: 14px; cursor: pointer; padding: 6px 4px; border-bottom: 2px solid transparent; transition: all 0.2s; background: none; border: none; }
        .vitrine-nav-link:hover { color: white; border-bottom-color: rgba(255,255,255,0.6); }
        .svc-card:hover    { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(29,78,216,0.15) !important; }
        .agent-card:hover  { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        .svc-card, .agent-card { transition: all 0.25s ease; }
        @media (max-width: 768px) {
          .hero-title   { font-size: 26px !important; }
          .hero-sub     { font-size: 14px !important; }
          .hero-btns    { flex-direction: column !important; align-items: center !important; }
          .svc-grid     { grid-template-columns: 1fr 1fr !important; }
          .agent-grid   { grid-template-columns: 1fr 1fr !important; }
          .stats-grid   { grid-template-columns: 1fr 1fr !important; }
          .why-grid     { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .svc-grid   { grid-template-columns: 1fr !important; }
          .agent-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── BARRE TOP ── */}
      <div style={{ background: BLUE_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {mairie.phone   && <span>📞 {mairie.phone}</span>}
            {mairie.email   && <span>✉ {mairie.email}</span>}
            {mairie.address && <span>📍 {mairie.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Plateforme État Civil</span>
        </div>
      </div>

      {/* ── NAVBAR ── */}
      <nav style={{ background: BLUE, boxShadow: "0 2px 12px rgba(0,0,0,0.2)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              {mairie.logo_url ? <img src={mairie.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : "🏛️"}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "white", lineHeight: 1.1 }}>{mairie.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>État Civil · {tenantCode}</div>
            </div>
          </div>

          {/* Nav desktop */}
          <div style={{ display: "flex", gap: 20, alignItems: "center" }} className="nav-links">
            {[["Accueil", "hero"], ["Services", "services"], ["Agents", "agents"], ["Contact", "contact"]].map(([label, id]) => (
              <button key={id} className="vitrine-nav-link" onClick={() => scrollTo(id)}>{label}</button>
            ))}
          </div>

          {/* Burger mobile */}
          <button onClick={() => setMobileMenu(!mobileMenu)} style={{ background: "none", border: "none", cursor: "pointer", color: "white", display: "none" }} className="burger">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        {mobileMenu && (
          <div style={{ background: BLUE_DARK, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {[["Accueil", "hero"], ["Services", "services"], ["Agents", "agents"], ["Contact", "contact"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ color: "white", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, textAlign: "left", padding: "8px 0" }}>{label}</button>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="hero" style={{ background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 55%, ${BLUE_MID} 100%)`, padding: "80px 20px 110px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, border: "2px solid rgba(255,255,255,0.3)" }}>
            {mairie.logo_url ? <img src={mairie.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} /> : "🏛️"}
          </div>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            Service Public · État Civil
          </div>
          <h1 className="hero-title" style={{ fontSize: 42, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.25)", lineHeight: 1.2 }}>
            {mairie.name}
          </h1>
          <p className="hero-sub" style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", marginBottom: 36, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 36px" }}>
            {mairie.description || "Au service des citoyens pour tous vos actes d'état civil. Mariages, naissances, décès et certificats traités rapidement et officiellement."}
          </p>
          <div className="hero-btns" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("services")}
              style={{ background: "white", color: BLUE_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Nos Services
            </button>
            <button onClick={() => scrollTo("contact")}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
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

      {/* ── STATS ── */}
      <section style={{ background: "white", padding: "0 20px 48px" }}>
        <div className="stats-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, transform: "translateY(-30px)" }}>
          {[
            { icon: "💍", val: stats.mariages  || 0, label: "Mariages ce mois" },
            { icon: "👶", val: stats.naissances || 0, label: "Naissances ce mois" },
            { icon: "📋", val: stats.residences || 0, label: "Résidences délivrées" },
            { icon: "👔", val: stats.agents     || 0, label: "Agents en service" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ background: `${BLUE}18`, color: BLUE, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>État Civil</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Nos Services</h2>
            <p style={{ color: "#64748b", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>Tous les actes d'état civil traités par des agents qualifiés, dans les délais les plus brefs.</p>
          </div>
          <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
            {SERVICES_MAIRIE.map((svc, i) => (
              <div key={i} className="svc-card" style={{ background: "white", borderRadius: 16, padding: "28px 24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", cursor: "default" }}>
                <div style={{ width: 58, height: 58, borderRadius: 14, background: `${BLUE}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16 }}>
                  {svc.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>{svc.label}</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{svc.desc}</p>
                <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 6, color: BLUE, fontSize: 12, fontWeight: 600 }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Service disponible
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ background: `${BLUE}18`, color: BLUE, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Procédure</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Comment ça marche ?</h2>
            <p style={{ color: "#64748b", fontSize: 15, maxWidth: 500, margin: "0 auto" }}>Un processus simple et transparent pour obtenir vos documents officiels.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, maxWidth: 960, margin: "0 auto" }} className="stats-grid">
            {[
              { step: "01", icon: "📝", title: "Préparez votre dossier", desc: "Rassemblez les documents nécessaires selon le type d'acte demandé." },
              { step: "02", icon: "🏛️", title: "Déposez à la mairie", desc: "Présentez-vous au guichet avec vos pièces originales et copies." },
              { step: "03", icon: "🔍", title: "Vérification du dossier", desc: "Nos agents vérifient et traitent votre demande officiellement." },
              { step: "04", icon: "✅", title: "Retrait de l'acte", desc: "Récupérez votre document officiel signé et tamponné." },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "24px 16px", position: "relative" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${BLUE_DARK},${BLUE})`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 15, boxShadow: `0 4px 16px ${BLUE}44` }}>
                  {item.step}
                </div>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENTS ── */}
      {agents.length > 0 && (
        <section id="agents" style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ background: `${BLUE}18`, color: BLUE, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>L'équipe</span>
              <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Nos Agents</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>Des fonctionnaires qualifiés à votre service.</p>
            </div>
            {chefs.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, textAlign: "center" }}>Direction & Encadrement</h3>
                <div className="agent-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 36 }}>
                  {chefs.map((a, i) => (
                    <div key={i} className="agent-card" style={{ background: "white", borderRadius: 16, padding: "28px 20px", textAlign: "center", border: `2px solid ${BLUE}22`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${BLUE_DARK},${BLUE})`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 24, fontWeight: 700 }}>
                        {getInitials(a.prenom, a.nom)}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{a.prenom} {a.nom}</div>
                      <div style={{ fontSize: 12, color: BLUE, fontWeight: 600 }}>{a.role}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {autresAgents.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, textAlign: "center" }}>Agents d'État Civil</h3>
                <div className="agent-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                  {autresAgents.map((a, i) => (
                    <div key={i} className="agent-card" style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f1f5f9", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: BLUE, fontSize: 18, fontWeight: 700 }}>
                        {getInitials(a.prenom, a.nom)}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", marginBottom: 3 }}>{a.prenom} {a.nom}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{a.role}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── POURQUOI NOUS ── */}
      <section style={{ background: `linear-gradient(135deg,${BLUE_DARK},${BLUE})`, padding: "60px 20px", color: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12 }}>Pourquoi passer par notre mairie ?</h2>
          <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 48, maxWidth: 500, margin: "0 auto 48px" }}>Une administration moderne, transparente et efficace au service de vos droits civiques.</p>
          <div className="why-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 900, margin: "0 auto" }}>
            {[
              { icon: "⚡", title: "Traitement rapide",      desc: "Vos dossiers sont traités dans les meilleurs délais. Nous respectons les délais légaux et souvent les dépassons." },
              { icon: "🔒", title: "Sécurité & Officialité", desc: "Tous nos actes sont officiellement signés, tamponnés et enregistrés dans les registres nationaux." },
              { icon: "🤝", title: "Accompagnement",         desc: "Nos agents vous guident dans chaque étape de vos démarches, avec respect et professionnalisme." },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 24px", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOCUMENTS NÉCESSAIRES ── */}
      <section style={{ background: "#eff6ff", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Documents à apporter</h2>
            <p style={{ color: "#64748b", fontSize: 14 }}>Préparez ces documents avant de vous déplacer pour gagner du temps.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, maxWidth: 800, margin: "0 auto" }} className="svc-grid">
            {[
              { acte: "💍 Mariage",            docs: ["CNI des deux époux (originaux + copies)", "Actes de naissance des époux", "Photos d'identité", "Noms et CNI des 2 témoins"] },
              { acte: "👶 Naissance",           docs: ["Certificat médical de naissance", "CNI du père et de la mère", "Livret de famille (si existant)", "Déclaration dans les 3 jours"] },
              { acte: "📋 Décès",              docs: ["Certificat médical de décès", "CNI du défunt", "CNI du déclarant", "Acte de naissance du défunt"] },
              { acte: "🏠 Certificat résidence", docs: ["CNI en cours de validité", "Justificatif de domicile (facture d'eau/électricité)", "Photo d'identité", "Motif de la demande"] },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #bfdbfe", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ fontWeight: 700, color: BLUE_DARK, fontSize: 15, marginBottom: 14 }}>{item.acte}</div>
                {item.docs.map((doc, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, fontSize: 13, color: "#334155" }}>
                    <svg width="14" height="14" fill="none" stroke={BLUE} strokeWidth={2.5} viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {doc}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nous Contacter</h2>
            <p style={{ color: "#64748b", fontSize: 15 }}>Nos agents sont disponibles pour répondre à vos questions.</p>
          </div>
          <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 800, margin: "0 auto" }}>
            {[
              { icon: "📞", label: "Téléphone", val: mairie.phone   || "Non renseigné" },
              { icon: "✉️", label: "Email",     val: mairie.email   || "Non renseigné" },
              { icon: "📍", label: "Adresse",   val: mairie.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Horaires */}
          <div style={{ maxWidth: 500, margin: "36px auto 0", background: `${BLUE}08`, border: `1px solid ${BLUE}22`, borderRadius: 16, padding: "24px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🕐</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: BLUE_DARK, marginBottom: 12 }}>Horaires d'ouverture</h3>
            {[
              { jour: "Lundi – Vendredi", heure: "8h00 – 16h30" },
              { jour: "Samedi",           heure: "8h00 – 12h00" },
              { jour: "Dimanche",         heure: "Fermé" },
            ].map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 2 ? "1px solid #e2e8f0" : "none", fontSize: 13 }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>{h.jour}</span>
                <span style={{ color: h.heure === "Fermé" ? "#dc2626" : BLUE, fontWeight: 700 }}>{h.heure}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: BLUE_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {mairie.logo_url ? <img src={mairie.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} /> : "🏛️"}
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "white" }}>{mairie.name}</span>
          </div>
          <p style={{ fontSize: 12, margin: "0 0 8px" }}>Service Public · État Civil · {tenantCode}</p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
            Propulsé par <strong style={{ color: "white" }}>Moftal</strong> · Plateforme d'État Civil Numérique
            <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
              Retour à la plateforme
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
