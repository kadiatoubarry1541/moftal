import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const SLATE      = "#475569";
const SLATE_DARK = "#1e293b";
const SLATE_BLUE = "#334155";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
function fmtDate(d: string)   { return d ? new Date(d).toLocaleDateString("fr-FR") : ""; }

const CAT_COLORS: Record<string, string> = {
  "Politique": "#ef4444", "Économie": "#f59e0b", "Société": "#8b5cf6",
  "Sport": "#22a722", "Culture": "#ec4899", "International": "#3b82f6",
  "Technologie": "#06b6d4", "Santé": "#1a8f1a",
};

export default function JournalisteVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [media, setMedia]     = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("Tous");

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/journalist/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/journalist/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setMedia(t.tenant);
      else setError(t.message || "Média introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger ce média."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #e2e8f0`, borderTopColor: SLATE_DARK, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: SLATE_DARK, fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !media) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📰</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Média introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: SLATE_DARK, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour</button>
      </div>
    </div>
  );

  const stats     = data?.stats || {};
  const articles  = data?.articles || [];
  const reporters = data?.reporters || [];

  const categories = ["Tous", ...Array.from(new Set(articles.map((a: any) => a.categorie).filter(Boolean))) as string[]];
  const filtered   = activeCategory === "Tous" ? articles : articles.filter((a: any) => a.categorie === activeCategory);

  return (
    <div style={{ fontFamily: "'Georgia', serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:rgba(255,255,255,0.85);font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:white;border-bottom-color:rgba(255,255,255,0.6);}
        .art-card{transition:all 0.2s;cursor:default;} .art-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,0.1) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.art-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.art-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: SLATE_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {media.phone   && <span>📞 {media.phone}</span>}
            {media.email   && <span>✉ {media.email}</span>}
            {media.address && <span>📍 {media.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Presse & Information</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: SLATE_DARK, boxShadow: "0 2px 12px rgba(0,0,0,0.3)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {media.logo_url ? <img src={media.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>📰</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white", letterSpacing: "0.02em" }}>{media.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>Presse · {tenantCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Accueil","hero"],["Articles","articles"],["Journalistes","reporters"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${SLATE_DARK} 0%,${SLATE_BLUE} 60%,${SLATE} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.1)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)" }}>
            {media.logo_url ? <img src={media.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 46 }}>📰</span>}
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", fontFamily: "'Georgia', serif", letterSpacing: "-0.5px" }}>{media.name}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.8)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px", fontFamily: "system-ui" }}>
            {media.description || "L'information en temps réel. Des journalistes engagés pour vous informer avec rigueur et objectivité."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("articles")} style={{ background: "white", color: SLATE_DARK, border: "none", borderRadius: 10, padding: "13px 30px", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Lire nos articles
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
            { icon: "📝", val: `${stats.articles || 0}`, label: "Articles publiés" },
            { icon: "👤", val: `${stats.reporters || 0}`, label: "Journalistes" },
            { icon: "👥", val: `${stats.subscribers || 0}`, label: "Abonnés" },
            { icon: "📡", val: "Live", label: "Info en temps réel" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: SLATE_DARK, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ARTICLES */}
      <section id="articles" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", fontFamily: "'Georgia', serif" }}>Nos Derniers Articles</h2>
          </div>

          {/* Filtres catégories */}
          {categories.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: activeCategory === cat ? 700 : 500, fontSize: 13, background: activeCategory === cat ? SLATE_DARK : "white", color: activeCategory === cat ? "white" : "#374151", transition: "all 0.15s" }}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0", fontSize: 15 }}>Aucun article disponible pour l'instant.</div>
          ) : (
            <div className="art-g" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {filtered.map((art: any, i: number) => (
                <div key={i} className="art-card" style={{ background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  {art.categorie && (
                    <div style={{ height: 4, background: CAT_COLORS[art.categorie] || SLATE_DARK }} />
                  )}
                  <div style={{ padding: "20px" }}>
                    {art.categorie && (
                      <span style={{ display: "inline-block", background: `${CAT_COLORS[art.categorie] || SLATE_DARK}18`, color: CAT_COLORS[art.categorie] || SLATE_DARK, fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "system-ui" }}>
                        {art.categorie}
                      </span>
                    )}
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.4, fontFamily: "'Georgia', serif" }}>{art.titre}</h3>
                    {art.resume && <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 12px", fontFamily: "system-ui" }}>{art.resume}</p>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8", fontFamily: "system-ui" }}>
                      {art.auteur_nom && <span>✍️ {art.auteur_nom}</span>}
                      {art.date_pub && <span>{fmtDate(art.date_pub)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* JOURNALISTES */}
      {reporters.length > 0 && (
        <section id="reporters" style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", fontFamily: "'Georgia', serif" }}>Nos Journalistes</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {reporters.map((r: any, i: number) => (
                <div key={i} style={{ background: "#f8fafc", borderRadius: 14, padding: "20px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: SLATE_DARK, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18, fontWeight: 700 }}>
                    {(r.prenom || "?").charAt(0)}{(r.nom || "?").charAt(0)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{r.prenom} {r.nom}</div>
                  {r.role && <div style={{ fontSize: 12, color: SLATE, fontWeight: 600 }}>{r.role}</div>}
                  {r.specialite && <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.specialite}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="contact" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", fontFamily: "'Georgia', serif" }}>Nous Contacter</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { icon: "📞", label: "Téléphone", val: media.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: media.email || "Non renseigné" },
              { icon: "📍", label: "Rédaction", val: media.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "white" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: SLATE_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "white", marginBottom: 8, fontFamily: "'Georgia', serif" }}>{media.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>Presse & Information · {tenantCode}</p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          Propulsé par <strong style={{ color: "white" }}>Moftal</strong>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
