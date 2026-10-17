import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";
import LogoEtablissement from "../components/LogoEtablissement";
import { CouverturePhotoSite, GalerieVitrine } from "../components/PhotosVitrine";
import { usePhotosSite } from "../utils/photosSite";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const INDIGO       = "#4f46e5";
const INDIGO_DARK  = "#3730a3";
const INDIGO_LIGHT = "#6366f1";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
function fmtDate(d: string)   { return d ? new Date(d).toLocaleDateString("fr-FR") : ""; }

const TYPE_ICONS: Record<string, string> = {
  "article": "📄", "these": "🎓", "rapport": "📋", "brevet": "🔒", "livre": "📚",
};

export default function ScientifiqueVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const photos = usePhotosSite(tenantCode);
  const navigate = useNavigate();
  const [lab, setLab]         = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/scientist/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/scientist/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setLab(t.tenant);
      else setError(t.message || "Laboratoire introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger ce laboratoire."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #c7d2fe`, borderTopColor: INDIGO, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: INDIGO_DARK, fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !lab) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔬</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Laboratoire introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: INDIGO, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour</button>
      </div>
    </div>
  );

  const stats        = data?.stats || {};
  const publications = data?.publications || [];
  const members      = data?.members || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:#334155;font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:#0f172a;border-bottom-color:${INDIGO};}
        .pub-card{transition:all 0.2s;} .pub-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(79,70,229,0.12) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.pub-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.pub-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {lab.phone   && <span>📞 {lab.phone}</span>}
            {lab.email   && <span>✉ {lab.email}</span>}
            {lab.address && <span>📍 {lab.address}</span>}
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={lab.logo_url} name={lab.name} fontSize={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{lab.name}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>Laboratoire</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Accueil","hero"],["Publications","pubs"],["Équipe","team"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* PHOTO DE COUVERTURE (ajoutée depuis l'Espace Pro) */}
      <CouverturePhotoSite photos={photos} nom={lab?.name} />

      {/* HERO */}
      <section id="hero" style={{ background: "white", padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "white", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <LogoEtablissement src={lab.logo_url} name={lab.name} fontSize={46} />
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>{lab.name}</h1>
          <p style={{ fontSize: 17, color: "#334155", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {lab.description || "Un centre de recherche dédié à l'avancement scientifique. Publications, projets innovants et expertise multidisciplinaire."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("pubs")} style={{ background: INDIGO, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }}>
              Nos Publications
            </button>
            <button onClick={() => scrollTo("contact")} style={{ background: "white", color: INDIGO, border: `1.5px solid ${INDIGO}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Collaborer
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
            { icon: "👨‍🔬", val: `${stats.members || 0}`, label: "Chercheurs" },
            { icon: "📄", val: `${stats.publications || 0}`, label: "Publications" },
            { icon: "🚀", val: `${stats.projects || 0}`, label: "Projets actifs" },
            { icon: "💡", val: "Innovation", label: "Notre moteur" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: INDIGO, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PUBLICATIONS */}
      <section id="pubs" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ background: `${INDIGO}18`, color: INDIGO, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Travaux scientifiques</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Publications Récentes</h2>
          </div>
          {publications.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>Aucune publication disponible.</div>
          ) : (
            <div className="pub-g" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {publications.map((p: any, i: number) => (
                <div key={i} className="pub-card" style={{ background: "white", borderRadius: 16, padding: "24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${INDIGO}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14 }}>
                    {TYPE_ICONS[p.type_pub] || "📄"}
                  </div>
                  {p.type_pub && (
                    <span style={{ display: "inline-block", background: `${INDIGO}12`, color: INDIGO, fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {p.type_pub}
                    </span>
                  )}
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.4 }}>{p.titre}</h3>
                  {p.domaine && <div style={{ fontSize: 12, color: INDIGO, fontWeight: 600, marginBottom: 6 }}>🔬 {p.domaine}</div>}
                  {p.resume && <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 12px" }}>{p.resume}</p>}
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {p.auteur_nom && <span>✍️ {p.auteur_nom}</span>}
                    {p.date_pub && <span style={{ marginLeft: 8 }}>· {fmtDate(p.date_pub)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ÉQUIPE */}
      {members.length > 0 && (
        <section id="team" style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>Notre Équipe de Recherche</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {members.map((m: any, i: number) => (
                <div key={i} style={{ background: "#f8fafc", borderRadius: 14, padding: "20px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg,${INDIGO},${INDIGO_LIGHT})`, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 20, fontWeight: 700 }}>
                    {(m.prenom || "?").charAt(0)}{(m.nom || "?").charAt(0)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{m.prenom} {m.nom}</div>
                  {m.role && <div style={{ fontSize: 12, color: INDIGO, fontWeight: 600 }}>{m.role}</div>}
                  {m.specialite && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{m.specialite}</div>}
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
            <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>Collaborer avec nous</h2>
            <p style={{ color: "#334155", fontSize: 15 }}>Nous sommes ouverts aux collaborations scientifiques et aux partenariats de recherche.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 780, margin: "0 auto" }}>
            {[
              { icon: "📞", label: "Téléphone", val: lab.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: lab.email || "Non renseigné" },
              { icon: "📍", label: "Adresse", val: lab.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "24px 16px", background: "white", borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GalerieVitrine photos={photos} couleur="#4f46e5" />

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#4f46e5" accentDark="#1e1b4b" />

      {/* FOOTER */}
      <footer style={{ background: "#f8fafc", color: "#64748b", borderTop: "1px solid #e2e8f0", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>{lab.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>Centre de Recherche</p>
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}><img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5, background: "white", borderRadius: 4, padding: 1 }} />Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
