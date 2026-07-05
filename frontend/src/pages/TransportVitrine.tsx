import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const SKY      = "#0284c7";
const SKY_DARK = "#075985";
const SKY_LIGHT= "#0ea5e9";
const SKY_BG   = "#f0f9ff";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
function fmtDate(d: string)   { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number)  { return n ? (n || 0).toLocaleString("fr-FR") + " GNF" : "Sur demande"; }

export default function TransportVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [co, setCo]           = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/transport/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/transport/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setCo(t.tenant);
      else setError(t.message || "Compagnie introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger la compagnie."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: SKY_BG }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #bae6fd`, borderTopColor: SKY, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: SKY_DARK, fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !co) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🚌</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Compagnie introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: SKY, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour</button>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const trips = data?.trips || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:rgba(255,255,255,0.85);font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:white;border-bottom-color:rgba(255,255,255,0.6);}
        .trip-card{transition:all 0.22s;} .trip-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(2,132,199,0.12) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.trip-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.trip-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: SKY_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {co.phone   && <span>📞 {co.phone}</span>}
            {co.email   && <span>✉ {co.email}</span>}
            {co.address && <span>📍 {co.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Transport & Voyages</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: SKY, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {co.logo_url ? <img src={co.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🚌</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white" }}>{co.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>Transport · {tenantCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Accueil","hero"],["Trajets","trips"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${SKY_DARK} 0%,${SKY} 55%,${SKY_LIGHT} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
            {co.logo_url ? <img src={co.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 46 }}>🚌</span>}
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.2)", lineHeight: 1.2 }}>{co.name}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {co.description || "Des voyages confortables et sécurisés à travers toute la région. Réservez votre place et partez en toute sérénité."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("trips")} style={{ background: "white", color: SKY_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Voir les trajets
            </button>
            <button onClick={() => scrollTo("contact")} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Réserver
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
            { icon: "🚌", val: `${stats.vehicles || 0}`, label: "Véhicules" },
            { icon: "👨‍✈️", val: `${stats.drivers || 0}`, label: "Chauffeurs qualifiés" },
            { icon: "🗺️", val: `${stats.trips || 0}`, label: "Trajets à venir" },
            { icon: "✅", val: "Sécurisé", label: "Voyages certifiés" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: SKY, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TRAJETS */}
      <section id="trips" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ background: `${SKY}18`, color: SKY, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Prochains départs</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Trajets Disponibles</h2>
          </div>
          {trips.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚌</div>
              Aucun trajet programmé pour l'instant. Contactez-nous.
            </div>
          ) : (
            <div className="trip-g" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {trips.map((t: any, i: number) => (
                <div key={i} className="trip-card" style={{ background: "white", borderRadius: 16, padding: "22px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{t.lieu_depart}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Départ</div>
                    </div>
                    <div style={{ fontSize: 20 }}>→</div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{t.lieu_arrivee}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Arrivée</div>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>📅 {fmtDate(t.date_depart)}</span>
                      {t.heure_depart && <span style={{ fontSize: 13, color: "#64748b" }}>⏰ {t.heure_depart}</span>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: SKY }}>{fmtMoney(t.prix)}</span>
                      {t.places_disponibles !== null && t.places_disponibles !== undefined && (
                        <span style={{ fontSize: 11, color: t.places_disponibles > 0 ? "#1a8f1a" : "#dc2626", fontWeight: 700 }}>
                          {t.places_disponibles > 0 ? `${t.places_disponibles} places` : "Complet"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a" }}>Réserver votre place</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
            {[
              { icon: "📞", label: "Téléphone", val: co.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: co.email || "Non renseigné" },
              { icon: "📍", label: "Gare/Bureau", val: co.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
          {co.phone && (
            <div style={{ textAlign: "center" }}>
              <button onClick={() => window.open(`https://wa.me/${co.phone.replace(/\D/g,"")}?text=${encodeURIComponent("Bonjour, je souhaite réserver une place pour un trajet.")}`, "_blank")}
                style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                📲 Réserver via WhatsApp
              </button>
            </div>
          )}
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#0284c7" accentDark="#0c4a6e" />

      {/* FOOTER */}
      <footer style={{ background: SKY_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 8 }}>{co.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>Transport & Voyages · {tenantCode}</p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          Propulsé par <strong style={{ color: "white" }}>Moftal</strong>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
