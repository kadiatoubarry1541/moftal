import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const GREEN       = "#1a8f1a";
const GREEN_DARK  = "#156315";
const GREEN_LIGHT = "#22c55e";
const GREEN_BG    = "#f0fdf0";

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "";
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function EcoleVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<any>(null);
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/school/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/school/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setSchool(t.tenant);
      else setError(t.message || "École introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger l'école."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  const isLoggedIn = !!localStorage.getItem("token");

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: GREEN_BG }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #bbf7bb`, borderTopColor: GREEN, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: GREEN_DARK, fontSize: 14, fontWeight: 600 }}>Chargement en cours...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !school) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏫</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>École introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error || "Cette école n'existe pas ou n'est pas disponible."}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: GREEN, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Retour à l'accueil</button>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const staff = data?.staff || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        .vn-link { color:rgba(255,255,255,0.85); font-weight:500; font-size:14px; cursor:pointer; padding:6px 4px; border:none; background:none; border-bottom:2px solid transparent; transition:all 0.2s; }
        .vn-link:hover { color:white; border-bottom-color:rgba(255,255,255,0.6); }
        .staff-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.1) !important; }
        .staff-card { transition: all 0.25s ease; }
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.staff-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.staff-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: GREEN_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {school.phone   && <span>📞 {school.phone}</span>}
            {school.email   && <span>✉ {school.email}</span>}
            {school.address && <span>📍 {school.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Éducation numérique</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: GREEN, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {school.logo_url ? <img src={school.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🏫</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white", lineHeight: 1.1 }}>{school.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>École · {tenantCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {[["Accueil","hero"],["Enseignants","teachers"],["Inscription","enroll"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${GREEN_DARK} 0%,${GREEN} 55%,${GREEN_LIGHT} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
            {school.logo_url ? <img src={school.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 46 }}>🏫</span>}
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.2)", lineHeight: 1.2 }}>{school.name}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {school.description || "Une école d'excellence dédiée à la réussite de chaque élève. Formation de qualité, environnement sûr et épanouissant."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("enroll")} style={{ background: "white", color: GREEN_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Inscrire mon enfant
            </button>
            <button onClick={() => scrollTo("contact")} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Nous contacter
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
            { icon: "👨‍🏫", val: `${stats.staff || 0}`, label: "Enseignants qualifiés" },
            { icon: "👨‍🎓", val: `${stats.students || 0}`, label: "Élèves inscrits" },
            { icon: "🏫", val: `${stats.classes || 0}`, label: "Classes" },
            { icon: "🏆", val: "Excellence", label: "Notre engagement" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: GREEN, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ENSEIGNANTS */}
      {staff.length > 0 && (
        <section id="teachers" style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ background: `${GREEN}18`, color: GREEN, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>L'équipe pédagogique</span>
              <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Nos Enseignants</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>Des éducateurs passionnés dédiés à la réussite de vos enfants.</p>
            </div>
            <div className="staff-g" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {staff.map((s: any, i: number) => (
                <div key={i} className="staff-card" style={{ background: "white", borderRadius: 16, padding: "24px 20px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${GREEN},${GREEN_LIGHT})`, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, fontWeight: 700 }}>
                    {(s.prenom || "?").charAt(0)}{(s.nom || "?").charAt(0)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{s.prenom} {s.nom}</div>
                  <div style={{ fontSize: 12, color: GREEN, fontWeight: 600, marginBottom: 4 }}>{s.role}</div>
                  {s.matiere && <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.matiere}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* POURQUOI NOUS */}
      <section style={{ background: `linear-gradient(135deg,${GREEN_DARK},${GREEN})`, padding: "60px 20px", color: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12 }}>Pourquoi choisir notre école ?</h2>
          <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 48, maxWidth: 500, margin: "0 auto 48px" }}>Un cadre d'apprentissage moderne pour préparer les leaders de demain.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 900, margin: "0 auto" }}>
            {[
              { icon: "📚", title: "Programme de qualité", desc: "Un curriculum complet et adapté aux standards nationaux avec des méthodes pédagogiques modernes." },
              { icon: "👨‍🏫", title: "Enseignants qualifiés", desc: "Une équipe pédagogique diplômée et expérimentée, passionnée par l'enseignement." },
              { icon: "🛡️", title: "Environnement sécurisé", desc: "Un cadre sûr et bienveillant où chaque élève peut s'épanouir librement." },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 24px", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSCRIPTION CTA */}
      <section id="enroll" style={{ background: GREEN_BG, padding: "60px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Inscrire votre enfant</h2>
          <p style={{ color: "#475569", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Rejoignez notre communauté éducative. Présentez-vous à l'accueil de l'école avec votre numéro Moftal pour démarrer l'inscription.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {isLoggedIn ? (
              <div style={{ background: "white", border: `2px solid ${GREEN}`, borderRadius: 12, padding: "16px 32px", fontSize: 14, color: GREEN_DARK, fontWeight: 600 }}>
                ✅ Vous êtes connecté sur Moftal — présentez-vous à l'école avec votre numéro.
              </div>
            ) : (
              <>
                <button onClick={() => navigate("/login-membre")} style={{ background: GREEN, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  Se connecter
                </button>
                <button onClick={() => navigate("/vivant")} style={{ background: "white", color: GREEN, border: `2px solid ${GREEN}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  Créer un compte Moftal
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nous Contacter</h2>
            <p style={{ color: "#64748b", fontSize: 15 }}>Notre équipe est disponible pour répondre à toutes vos questions.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 780, margin: "0 auto" }}>
            {[
              { icon: "📞", label: "Téléphone", val: school.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: school.email || "Non renseigné" },
              { icon: "📍", label: "Adresse", val: school.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
          {school.phone && (
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button onClick={() => window.open(`https://wa.me/${school.phone.replace(/\D/g,"")}?text=${encodeURIComponent("Bonjour ! Je souhaite des informations sur l'école.")}`, "_blank")}
                style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                📲 Contacter via WhatsApp
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: GREEN_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {school.logo_url ? <img src={school.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>🏫</span>}
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "white" }}>{school.name}</span>
          </div>
          <p style={{ fontSize: 12, margin: "0 0 8px" }}>École · {tenantCode}</p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
            Propulsé par <strong style={{ color: "white" }}>Moftal</strong> · Éducation numérique
            <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
              Retour à la plateforme
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
