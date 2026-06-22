import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const EMERALD      = "#1a8f1a";
const EMERALD_DARK = "#156315";
const EMERALD_LIGHT= "#22a722";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : ""; }

export default function MosqueeVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [mosque, setMosque]   = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // detect if route is imam or mosque
  const isImam = window.location.pathname.startsWith("/imam/");
  const apiType = isImam ? "imam" : "mosque";

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/${apiType}/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/${apiType}/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setMosque(t.tenant);
      else setError(t.message || "Mosquée introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger la mosquée."))
      .finally(() => setLoading(false));
  }, [tenantCode, apiType]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f0fdf0" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #bbf7bb`, borderTopColor: EMERALD, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: EMERALD_DARK, fontSize: 14, fontWeight: 600 }}>Chargement en cours...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !mosque) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🕌</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Mosquée introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: EMERALD, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour à l'accueil</button>
      </div>
    </div>
  );

  const stats   = data?.stats || {};
  const imams   = data?.imams || [];
  const annList = data?.announcements || data?.predications || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:rgba(255,255,255,0.85);font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:white;border-bottom-color:rgba(255,255,255,0.6);}
        .ann-card{transition:all 0.2s;} .ann-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.08) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: EMERALD_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {mosque.phone   && <span>📞 {mosque.phone}</span>}
            {mosque.email   && <span>✉ {mosque.email}</span>}
            {mosque.address && <span>📍 {mosque.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Communauté Islamique</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: EMERALD, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {mosque.logo_url ? <img src={mosque.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🕌</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white", lineHeight: 1.1 }}>{mosque.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>Mosquée · {tenantCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {[["Accueil","hero"],["Imams","imams"],["Annonces","announcements"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${EMERALD_DARK} 0%,${EMERALD} 50%,${EMERALD_LIGHT} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
            {mosque.logo_url ? <img src={mosque.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 46 }}>🕌</span>}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>السلام عليكم ورحمة الله وبركاته</div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.2)", lineHeight: 1.2 }}>{mosque.name}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {mosque.description || "Votre mosquée — un lieu de prière, de savoir et de fraternité. Bienvenue dans notre communauté islamique."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("announcements")} style={{ background: "white", color: EMERALD_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Actualités & Annonces
            </button>
            <button onClick={() => scrollTo("contact")} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
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
            { icon: "🕌", val: isImam ? `${stats.imams || 0}` : `${stats.members || 0}`, label: isImam ? "Imams du réseau" : "Fidèles inscrits" },
            { icon: "📢", val: `${stats.announcements || stats.predications || 0}`, label: "Annonces & Prédications" },
            { icon: "🕐", val: "5x", label: "Prières quotidiennes" },
            { icon: "🤲", val: "Communauté", label: "Fraternité & Unité" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: EMERALD, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HORAIRES PRIÈRES */}
      <section style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ background: `${EMERALD}18`, color: EMERALD, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Horaires</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Horaires des Prières</h2>
            <p style={{ color: "#64748b", fontSize: 15 }}>Les horaires varient selon la saison. Contactez-nous pour les horaires exacts.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            {[["Fajr","🌅"],["Dhuhr","☀️"],["Asr","🌤️"],["Maghrib","🌇"],["Isha","🌙"]].map(([name, icon]) => (
              <div key={name} style={{ background: "white", borderRadius: 14, padding: "20px 12px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Voir mosquée</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMAMS */}
      {imams.length > 0 && (
        <section id="imams" style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nos Imams</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {imams.map((imam: any, i: number) => (
                <div key={i} style={{ background: "white", borderRadius: 16, padding: "24px 20px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${EMERALD},${EMERALD_LIGHT})`, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, fontWeight: 700 }}>
                    {(imam.prenom || "?").charAt(0)}{(imam.nom || "?").charAt(0)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{imam.prenom} {imam.nom}</div>
                  {(imam.rang || imam.specialite) && <div style={{ fontSize: 12, color: EMERALD, fontWeight: 600 }}>{imam.rang || imam.specialite}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ANNONCES */}
      {annList.length > 0 && (
        <section id="announcements" style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Annonces & Actualités</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {annList.map((ann: any, i: number) => (
                <div key={i} className="ann-card" style={{ background: "white", borderRadius: 14, padding: "20px 24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>{ann.titre || ann.theme}</div>
                  {ann.contenu && <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{ann.contenu}</div>}
                  {(ann.created_at || ann.date_pred) && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>{fmtDate(ann.created_at || ann.date_pred)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nous Contacter</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 780, margin: "0 auto" }}>
            {[
              { icon: "📞", label: "Téléphone", val: mosque.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: mosque.email || "Non renseigné" },
              { icon: "📍", label: "Adresse", val: mosque.address || "Non renseignée" },
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
      <footer style={{ background: EMERALD_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 8 }}>{mosque.name}</div>
          <p style={{ fontSize: 12, margin: "0 0 8px" }}>Mosquée · {tenantCode}</p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
            Propulsé par <strong style={{ color: "white" }}>Moftal</strong>
            <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Retour à la plateforme</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
