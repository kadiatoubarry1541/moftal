import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";
import LogoEtablissement from "../components/LogoEtablissement";
import { CouverturePhotoSite, GalerieVitrine } from "../components/PhotosVitrine";
import { usePhotosSite } from "../utils/photosSite";
import EcrireAuSite from "../components/EcrireAuSite";
import { useTraduction } from "../i18n/traduction";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const DARK      = "#0f172a";
const GRAY      = "#334155";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

export default function SecuriteVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const photos = usePhotosSite(tenantCode);
  const navigate = useNavigate();
  const { tr } = useTraduction();
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
      else setError((t.message || "Agence introuvable"));
      if (d.success) setData(d);
    }).catch(() => setError(("Impossible de charger l'agence.")))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #e2e8f0`, borderTopColor: DARK, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: DARK, fontSize: 14, fontWeight: 600 }}>{tr("Chargement...")}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !agency) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🛡️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{tr("Agence introuvable")}</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error && tr(error)}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: DARK, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>{tr("Retour")}</button>
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
        .vn-link{color:#334155;font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:#0f172a;border-bottom-color:${DARK};}
        .svc-card{transition:all 0.2s;} .svc-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,0.12) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {agency.phone   && <span>🚨 {agency.phone} {tr("(urgences)")}</span>}
            {agency.email   && <span>✉ {agency.email}</span>}
            {agency.address && <span>📍 {agency.address}</span>}
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={agency.logo_url} name={agency.name} fontSize={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{agency.name}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{tr("Sécurité")}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Accueil","hero"],["Services","services"],["Équipe","team"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{tr(lbl)}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* PHOTO DE COUVERTURE (ajoutée depuis l'Espace Pro) */}
      <CouverturePhotoSite photos={photos} nom={agency?.name} />

      {/* HERO */}
      <section id="hero" style={{ background: "white", padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "white", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <LogoEtablissement src={agency.logo_url} name={agency.name} fontSize={46} />
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>{agency.name}</h1>
          <p style={{ fontSize: 17, color: "#334155", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {agency.description || tr("Votre sécurité, notre priorité absolue. Des agents professionnels et une couverture sécuritaire de qualité pour protéger ce qui compte.")}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("services")} style={{ background: DARK, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }}>
              {tr("Nos Services")}
            </button>
            {agency.phone && (
              <button onClick={() => window.open(`tel:${agency.phone}`, "_blank")}
                style={{ background: "#dc2626", color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                {tr("🚨 Urgence")}
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
              <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 4 }}>{tr(s.val)}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{tr(s.label)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>{tr("Nos Services de Sécurité")}</h2>
            <p style={{ color: "#64748b", fontSize: 15, marginTop: 8 }}>{tr("Solutions de protection complètes pour particuliers et entreprises.")}</p>
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
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{tr(item.title)}</h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{tr(item.desc)}</p>
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
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>{tr("Nos Agents")}</h2>
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
      <section id="contact" style={{ background: "#f8fafc", padding: "60px 20px", color: "#0f172a" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>{tr("Demander un devis")}</h2>
            <p style={{ color: "#334155", fontSize: 15 }}>{tr("Contactez-nous pour une évaluation gratuite de vos besoins en sécurité.")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 780, margin: "0 auto" }}>
            {[
              { icon: "🚨", label: "Urgences 24h/24", val: agency.phone || tr("Non renseigné") },
              { icon: "✉️", label: "Email", val: agency.email || tr("Non renseigné") },
              { icon: "📍", label: "Siège", val: agency.address || tr("Non renseignée") },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "24px 16px", background: "white", borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr(item.label)}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.val}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
              <EcrireAuSite tenantCode={tenantCode!} nomEtablissement={agency.name} couleur={DARK} objet={"Demande de devis"}
                messageInitial={tr("Bonjour, je souhaite un devis pour vos services de sécurité.")}
                style={{ background: DARK, color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                {tr("✉️ Demander un devis")}
              </EcrireAuSite>
            </div>
        </div>
      </section>

      <GalerieVitrine photos={photos} couleur="#334155" />

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#334155" accentDark="#020617" />

      {/* FOOTER */}
      <footer style={{ background: "#f8fafc", color: "#64748b", borderTop: "1px solid #e2e8f0", padding: "28px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>{agency.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>{tr("Agence de Sécurité")}</p>
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}><img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5, background: "white", borderRadius: 4, padding: 1 }} />{tr("Retour à la plateforme")}</button>
        </div>
      </footer>
    </div>
  );
}
