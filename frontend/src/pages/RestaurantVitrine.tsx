import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";
import LogoEtablissement from "../components/LogoEtablissement";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const RED      = "#dc2626";
const RED_DARK = "#991b1b";

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
  // Commande en ligne : envoyée directement au restaurant (sa gestion), jamais ailleurs
  const [panier, setPanier]    = useState<Record<number, number>>({});
  const [commandeOuverte, setCommandeOuverte] = useState(false);
  const [client, setClient]    = useState({ nom: "", telephone: "", type_service: "emporter", adresse: "", notes: "" });
  const [envoi, setEnvoi]      = useState(false);
  const [erreurCommande, setErreurCommande] = useState("");
  const [commandeEnvoyee, setCommandeEnvoyee] = useState<{ total: number } | null>(null);

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

  const lignesPanier = dishes.filter((d: any) => panier[d.id]).map((d: any) => ({ ...d, quantite: panier[d.id] }));
  const nbArticles = lignesPanier.reduce((n: number, l: any) => n + l.quantite, 0);
  const totalPanier = lignesPanier.reduce((t: number, l: any) => t + (+l.prix || 0) * l.quantite, 0);
  const changerQuantite = (id: number, delta: number) => setPanier(p => {
    const q = Math.max(0, Math.min(50, (p[id] || 0) + delta));
    const suite = { ...p };
    if (q) suite[id] = q; else delete suite[id];
    return suite;
  });
  const commander = () => {
    setErreurCommande(""); setCommandeEnvoyee(null);
    if (nbArticles) setCommandeOuverte(true); else scrollTo("menu");
  };
  const envoyerCommande = async () => {
    if (envoi) return;
    if (!client.nom.trim() || client.telephone.replace(/\D/g, "").length < 8) { setErreurCommande("Indiquez votre nom et votre numéro de téléphone."); return; }
    if (client.type_service === "livraison" && !client.adresse.trim()) { setErreurCommande("Indiquez l'adresse de livraison."); return; }
    setEnvoi(true); setErreurCommande("");
    try {
      const r = await fetch(`${API}/api/pro-public/restaurant/${tenantCode}/commande`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lignesPanier.map((l: any) => ({ id: l.id, quantite: l.quantite })),
          client_nom: client.nom, client_telephone: client.telephone, type_service: client.type_service,
          adresse_livraison: client.adresse, notes: client.notes,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { setErreurCommande(d.message || "La commande n'a pas été envoyée. Réessayez."); return; }
      setCommandeEnvoyee({ total: d.commande?.total ?? totalPanier });
      setPanier({});
    } catch {
      setErreurCommande("Pas de connexion : la commande n'a pas été envoyée. Vérifiez internet puis réessayez.");
    } finally { setEnvoi(false); }
  };

  const categories = useMemo(() => ["Tous", ...Array.from(new Set(dishes.map((d: any) => d.categorie).filter(Boolean))) as string[]], [dishes]);

  const filtered = useMemo(() => {
    let list = dishes;
    if (activeCat !== "Tous") list = list.filter((d: any) => d.categorie === activeCat);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((d: any) => d.nom.toLowerCase().includes(q)); }
    return list;
  }, [dishes, activeCat, search]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
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
        .vn-link{color:#334155;font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:#0f172a;border-bottom-color:${RED};}
        .dish-card{transition:all 0.22s;} .dish-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(220,38,38,0.12) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.dish-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.dish-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {resto.phone   && <span>📞 {resto.phone}</span>}
            {resto.email   && <span>✉ {resto.email}</span>}
            {resto.address && <span>📍 {resto.address}</span>}
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={resto.logo_url} name={resto.name} fontSize={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{resto.name}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>Restaurant</div>
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
      <section id="hero" style={{ background: "#f8fafc", padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "white", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <LogoEtablissement src={resto.logo_url} name={resto.name} fontSize={46} />
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>{resto.name}</h1>
          <p style={{ fontSize: 17, color: "#334155", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {resto.description || "Une cuisine savoureuse préparée avec passion. Des plats authentiques pour satisfaire toutes vos envies gourmandes."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("menu")} style={{ background: RED, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(220,38,38,0.25)" }}>
              Voir le menu
            </button>
            {dishes.length > 0 && (
              <button onClick={commander}
                style={{ background: "white", color: RED, border: `2px solid ${RED}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                🛒 Commander
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: RED }}>{fmtMoney(d.prix)}</div>
                    {panier[d.id] ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => changerQuantite(d.id, -1)} aria-label="Retirer" style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${RED}`, background: "white", color: RED, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>−</button>
                        <span style={{ minWidth: 20, textAlign: "center", fontWeight: 800 }}>{panier[d.id]}</span>
                        <button onClick={() => changerQuantite(d.id, 1)} aria-label="Ajouter" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: RED, color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => changerQuantite(d.id, 1)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: RED, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Ajouter</button>
                    )}
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
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a" }}>Réserver ou Commander</h2>
            <p style={{ color: "#64748b", fontSize: 15, marginTop: 8 }}>Commandez en ligne ou contactez-nous pour réserver une table.</p>
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
          {dishes.length > 0 && (
            <div style={{ textAlign: "center" }}>
              <button onClick={commander}
                style={{ background: RED, color: "white", border: "none", borderRadius: 12, padding: "14px 40px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(220,38,38,0.25)" }}>
                🛒 Commander en ligne
              </button>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Choisissez vos plats dans le menu : la commande arrive directement au restaurant.</p>
            </div>
          )}
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#ef4444" accentDark="#991b1b" />

      {/* PANIER — barre en bas de l'écran dès qu'un plat est choisi */}
      {nbArticles > 0 && !commandeOuverte && (
        <button onClick={commander}
          style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "max(16px, env(safe-area-inset-bottom, 0px))", zIndex: 70, background: RED, color: "white", border: "none", borderRadius: 999, padding: "14px 22px", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 6px 24px rgba(220,38,38,0.4)", whiteSpace: "nowrap" }}>
          🛒 {nbArticles} article{nbArticles > 1 ? "s" : ""} · {fmtMoney(totalPanier)} — Commander
        </button>
      )}

      {/* COMMANDE — envoyée directement au restaurant */}
      {commandeOuverte && (
        <div onClick={e => { if (e.target === e.currentTarget && !envoi) setCommandeOuverte(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", borderRadius: "20px 20px 0 0", padding: "20px 18px 28px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>🛒 Ma commande</div>
              <button onClick={() => setCommandeOuverte(false)} disabled={envoi} aria-label="Fermer" style={{ border: "none", background: "#f1f5f9", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            {commandeEnvoyee ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <p style={{ fontSize: 16, fontWeight: 800, margin: "8px 0" }}>Commande envoyée à {resto.name}</p>
                <p style={{ fontSize: 14, color: "#475569", margin: "0 0 16px" }}>Total : {fmtMoney(commandeEnvoyee.total)}. Le restaurant vous contactera au {client.telephone} pour la confirmer.</p>
                <button onClick={() => { setCommandeOuverte(false); setCommandeEnvoyee(null); }} style={{ width: "100%", padding: 14, background: RED, color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Fermer</button>
              </div>
            ) : (<>
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                {lignesPanier.map((l: any) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", border: "1px solid #f1f5f9", borderRadius: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{l.nom}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{fmtMoney((+l.prix || 0) * l.quantite)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => changerQuantite(l.id, -1)} aria-label="Retirer" style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${RED}`, background: "white", color: RED, fontWeight: 800, cursor: "pointer" }}>−</button>
                      <span style={{ minWidth: 18, textAlign: "center", fontWeight: 800 }}>{l.quantite}</span>
                      <button onClick={() => changerQuantite(l.id, 1)} aria-label="Ajouter" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: RED, color: "white", fontWeight: 800, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                ))}
                {lignesPanier.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>Votre panier est vide : ajoutez des plats depuis le menu.</p>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, marginBottom: 16 }}>
                <span>Total</span><span style={{ color: RED }}>{fmtMoney(totalPanier)}</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["emporter", "🥡 À emporter"], ["livraison", "🛵 Livraison"], ["sur_place", "🪑 Sur place"]].map(([v, lbl]) => (
                    <button key={v} onClick={() => setClient(c => ({ ...c, type_service: v }))}
                      style={{ flex: 1, minWidth: 100, padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${client.type_service === v ? RED : "#e2e8f0"}`, background: client.type_service === v ? `${RED}10` : "white", color: client.type_service === v ? RED : "#334155", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <input value={client.nom} onChange={e => setClient(c => ({ ...c, nom: e.target.value }))} placeholder="Votre nom *" autoComplete="name"
                  style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14 }} />
                <input value={client.telephone} onChange={e => setClient(c => ({ ...c, telephone: e.target.value }))} placeholder="Votre téléphone *" type="tel" autoComplete="tel"
                  style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14 }} />
                {client.type_service === "livraison" && (
                  <input value={client.adresse} onChange={e => setClient(c => ({ ...c, adresse: e.target.value }))} placeholder="Adresse de livraison *" autoComplete="street-address"
                    style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14 }} />
                )}
                <textarea value={client.notes} onChange={e => setClient(c => ({ ...c, notes: e.target.value }))} rows={2}
                  placeholder={client.type_service === "sur_place" ? "Heure d'arrivée, nombre de personnes… (facultatif)" : "Précisions (facultatif)"}
                  style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
              </div>

              {erreurCommande && <p style={{ color: "#b91c1c", fontSize: 13, fontWeight: 600, margin: "12px 0 0" }}>{erreurCommande}</p>}
              <button onClick={envoyerCommande} disabled={envoi || lignesPanier.length === 0}
                style={{ width: "100%", marginTop: 14, padding: 14, background: RED, color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: envoi || lignesPanier.length === 0 ? 0.6 : 1 }}>
                {envoi ? "⏳ Envoi…" : `Envoyer la commande au restaurant`}
              </button>
            </>)}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", color: "#64748b", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>{resto.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>Restaurant</p>
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}><img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5, background: "white", border: "1px solid #e2e8f0", borderRadius: 4, padding: 1 }} />Retour à la plateforme</button>
        </div>
      </footer>
    </div>
  );
}
