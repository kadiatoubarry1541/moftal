import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const RED      = "#dc2626";
const RED_DARK = "#991b1b";
const RED_LIGHT= "#ef4444";
const RED_BG   = "#fef2f2";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
function fmtMoney(n: number)  { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

const CAT_ICONS: Record<string, string> = {
  "Entrée": "🥗", "Plat principal": "🍛", "Dessert": "🍮", "Boisson": "🥤",
  "Brochette": "🍢", "Soupe": "🥣", "Grillade": "🔥", "Végétarien": "🥦",
  "Poisson": "🐟", "Poulet": "🍗", "Viande": "🥩",
};

export default function RestaurantVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [resto, setResto]      = useState<any>(null);
  const [data, setData]        = useState<any>(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState("Tous");
  const [search, setSearch]    = useState("");

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/restaurant/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/restaurant/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setResto(t.tenant);
      else setError(t.message || "Restaurant introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger le restaurant."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  const dishes = data?.dishes || [];
  const stats  = data?.stats || {};

  const categories = useMemo(() => ["Tous", ...Array.from(new Set(dishes.map((d: any) => d.categorie).filter(Boolean))) as string[]], [dishes]);

  const filtered = useMemo(() => {
    let list = dishes;
    if (activeCat !== "Tous") list = list.filter((d: any) => d.categorie === activeCat);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((d: any) => d.nom.toLowerCase().includes(q)); }
    return list;
  }, [dishes, activeCat, search]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: RED_BG }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #fecaca`, borderTopColor: RED, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: RED_DARK, fontSize: 14, fontWeight: 600 }}>Chargement du menu...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !resto) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🍽️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Restaurant introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: RED, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour</button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:rgba(255,255,255,0.85);font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:white;border-bottom-color:rgba(255,255,255,0.6);}
        .dish-card{transition:all 0.22s;} .dish-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(220,38,38,0.12) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.dish-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.dish-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: RED_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {resto.phone   && <span>📞 {resto.phone}</span>}
            {resto.email   && <span>✉ {resto.email}</span>}
            {resto.address && <span>📍 {resto.address}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Restauration</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: RED, boxShadow: "0 2px 12px rgba(0,0,0,0.2)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {resto.logo_url ? <img src={resto.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🍽️</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white" }}>{resto.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>Restaurant · {tenantCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Accueil","hero"],["Menu","menu"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${RED_DARK} 0%,${RED} 55%,${RED_LIGHT} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
            {resto.logo_url ? <img src={resto.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 46 }}>🍽️</span>}
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.2)", lineHeight: 1.2 }}>{resto.name}</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {resto.description || "Une cuisine savoureuse préparée avec passion. Des plats authentiques pour satisfaire toutes vos envies gourmandes."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("menu")} style={{ background: "white", color: RED_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Voir le menu
            </button>
            {resto.phone && (
              <button onClick={() => window.open(`https://wa.me/${resto.phone.replace(/\D/g,"")}?text=${encodeURIComponent("Bonjour ! Je souhaite passer une commande.")}`, "_blank")}
                style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                📲 Commander
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
            { icon: "🍽️", val: `${stats.dishes || 0}`, label: "Plats au menu" },
            { icon: "🪑", val: `${stats.tables || 0}`, label: "Tables disponibles" },
            { icon: "👨‍🍳", val: `${stats.staff || 0}`, label: "Équipe de cuisine" },
            { icon: "⭐", val: "Saveur", label: "Notre signature" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: RED, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MENU */}
      <section id="menu" style={{ background: "#fafaf9", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span style={{ background: `${RED}18`, color: RED, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Notre carte</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 10px", color: "#0f172a" }}>Notre Menu</h2>
          </div>

          {/* Recherche */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, maxWidth: 400 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un plat…"
                style={{ width: "100%", padding: "10px 12px 10px 38px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "white" }} />
            </div>
          </div>

          {/* Catégories */}
          {categories.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: activeCat === cat ? 700 : 500, fontSize: 13, whiteSpace: "nowrap", background: activeCat === cat ? RED : "white", color: activeCat === cat ? "white" : "#374151", transition: "all 0.15s" }}>
                  {cat !== "Tous" && (CAT_ICONS[cat] || "🍽️")} {cat}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0", fontSize: 15 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
              {search ? `Aucun plat trouvé pour "${search}"` : "Aucun plat disponible."}
            </div>
          ) : (
            <div className="dish-g" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {filtered.map((d: any, i: number) => (
                <div key={i} className="dish-card" style={{ background: "white", borderRadius: 16, padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${RED}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 12 }}>
                    {CAT_ICONS[d.categorie] || "🍽️"}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4, lineHeight: 1.3 }}>{d.nom}</div>
                  {d.categorie && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.categorie}</div>}
                  {d.description && <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: "0 0 10px" }}>{d.description}</p>}
                  <div style={{ fontSize: 18, fontWeight: 800, color: RED }}>{fmtMoney(d.prix)}</div>
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
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a" }}>Réserver ou Commander</h2>
            <p style={{ color: "#64748b", fontSize: 15, marginTop: 8 }}>Contactez-nous pour réserver une table ou passer commande.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
            {[
              { icon: "📞", label: "Téléphone", val: resto.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: resto.email || "Non renseigné" },
              { icon: "📍", label: "Adresse", val: resto.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
          {resto.phone && (
            <div style={{ textAlign: "center" }}>
              <button onClick={() => window.open(`https://wa.me/${resto.phone.replace(/\D/g,"")}?text=${encodeURIComponent("Bonjour ! Je souhaite réserver une table / passer commande.")}`, "_blank")}
                style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 40px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(37,211,102,0.3)" }}>
                📲 Commander via WhatsApp
              </button>
            </div>
          )}
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#ef4444" accentDark="#991b1b" />

      {/* FOOTER */}
      <footer style={{ background: RED_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 8 }}>{resto.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>Restaurant · {tenantCode}</p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          Propulsé par <strong style={{ color: "white" }}>Moftal</strong> · Restauration Africaine
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
