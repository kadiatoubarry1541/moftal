import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const AMBER       = "#d97706";
const AMBER_DARK  = "#92400e";
const AMBER_LIGHT = "#fbbf24";
const AMBER_BG    = "#fffbeb";

function fmtMoney(n: number) {
  return (n || 0).toLocaleString("fr-FR") + " GNF";
}

const CAT_ICONS: Record<string, string> = {
  "Alimentation": "🛒",
  "Boissons": "🥤",
  "Électronique": "📱",
  "Vêtements": "👕",
  "Chaussures": "👟",
  "Cosmétiques": "💄",
  "Hygiène": "🧼",
  "Maison": "🏠",
  "Cuisine": "🍳",
  "Jouets": "🧸",
  "Sport": "⚽",
  "Livres": "📚",
  "Pharmacie": "💊",
  "Bâtiment": "🔨",
  "Électricité": "💡",
  "Agriculture": "🌾",
  "Bétail": "🐄",
  "Pêche": "🐟",
};

function getCatIcon(cat: string) {
  return CAT_ICONS[cat] || "📦";
}

export default function CommerceVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();

  const [store, setStore]         = useState<any>(null);
  const [products, setProducts]   = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [search, setSearch]       = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState<{ product: any; qty: number }[]>([]);
  const [showCart, setShowCart]   = useState(false);

  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/commerce-public/${code}`).then(r => r.json()),
      fetch(`${API}/api/commerce-public/${code}/products`).then(r => r.json()),
      fetch(`${API}/api/commerce-public/${code}/categories`).then(r => r.json()),
    ]).then(([s, p, c]) => {
      if (s.success) setStore(s.store);
      else setError(s.message || "Boutique introuvable");
      if (p.success) setProducts(p.products || []);
      if (c.success) setCategories(c.categories || []);
    }).catch(() => setError("Impossible de charger la boutique."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "Tous") list = list.filter(p => p.categorie === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.nom.toLowerCase().includes(q) || (p.categorie || "").toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategory, search]);

  const cartTotal = cartItems.reduce((s, i) => s + i.product.prix_vente * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  function addToCart(product: any) {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  }

  function removeFromCart(productId: number) {
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
  }

  function changeQty(productId: number, delta: number) {
    setCartItems(prev =>
      prev.map(i => i.product.id === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  }

  function buildWhatsAppMessage() {
    const lines = cartItems.map(i => `- ${i.product.nom} x${i.qty} = ${fmtMoney(i.product.prix_vente * i.qty)}`);
    const msg = `Bonjour ! Je souhaite commander :\n${lines.join("\n")}\n\nTotal : ${fmtMoney(cartTotal)}\n\nMerci !`;
    return encodeURIComponent(msg);
  }

  function contactByWhatsApp() {
    if (!store?.phone) return;
    const phone = store.phone.replace(/\D/g, "");
    const msg = cartItems.length > 0 ? buildWhatsAppMessage() : encodeURIComponent(`Bonjour ! Je suis intéressé par vos produits sur Moftal.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: AMBER_BG }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #fde68a`, borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: AMBER_DARK, fontSize: 14, fontWeight: 600 }}>Chargement en cours...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !store) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏪</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Boutique introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error || "Cette boutique n'existe pas ou n'est plus disponible."}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: AMBER, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  );

  const storeLabel = store.type === "supplier" ? "Grossiste · Fournisseur"
    : store.type === "restaurant" ? "Restaurant · Cuisine"
    : store.type === "vendor" ? "Vendeur · Détaillant"
    : "Commerce · Boutique";

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideIn { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
        .nav-link { color: rgba(255,255,255,0.85); font-weight: 500; font-size: 14px; cursor: pointer; padding: 6px 4px; border: none; background: none; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .nav-link:hover { color: white; border-bottom-color: rgba(255,255,255,0.6); }
        .prod-card { transition: all 0.22s ease; cursor: default; }
        .prod-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(217,119,6,0.15) !important; }
        .cat-btn { transition: all 0.15s ease; }
        .cat-btn:hover { background: ${AMBER} !important; color: white !important; }
        .add-btn:hover { background: ${AMBER_DARK} !important; }
        @media (max-width: 768px) {
          .hero-title { font-size: 26px !important; }
          .hero-sub   { font-size: 14px !important; }
          .products-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid    { grid-template-columns: 1fr 1fr !important; }
          .cats-bar { flex-wrap: wrap !important; }
        }
        @media (max-width: 480px) {
          .products-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── BARRE TOP ────────────────────────────────────────────────────────── */}
      <div style={{ background: AMBER_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {store.phone   && <span>📞 {store.phone}</span>}
            {store.email   && <span>✉ {store.email}</span>}
            {(store.address || store.city) && <span>📍 {[store.address, store.city].filter(Boolean).join(", ")}</span>}
          </div>
          <span style={{ opacity: 0.5 }}>Moftal · Marché numérique</span>
        </div>
      </div>

      {/* ── NAVBAR ───────────────────────────────────────────────────────────── */}
      <nav style={{ background: AMBER, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 200 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {store.logo_url
                ? <img src={store.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 22 }}>🏪</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white", lineHeight: 1.1 }}>{store.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{storeLabel} · {tenantCode}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 18 }}>
              {[["Accueil","hero"],["Produits","products"],["Contact","contact"]].map(([label, id]) => (
                <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{label}</button>
              ))}
            </div>

            {/* Panier */}
            <button onClick={() => setShowCart(true)}
              style={{ position: "relative", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 10, padding: "8px 16px", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              🛒 Panier
              {cartCount > 0 && (
                <span style={{ background: "#ef4444", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, position: "absolute", top: -6, right: -6 }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${AMBER_DARK} 0%,${AMBER} 55%,${AMBER_LIGHT} 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
            {store.logo_url
              ? <img src={store.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 46 }}>🏪</span>}
          </div>
          <h1 className="hero-title" style={{ fontSize: 42, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.2)", lineHeight: 1.2 }}>
            {store.name}
          </h1>
          <p className="hero-sub" style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {store.description || "Bienvenue dans notre boutique. Découvrez nos produits de qualité au meilleur prix."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("products")}
              style={{ background: "white", color: AMBER_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Voir les produits
            </button>
            {store.phone && (
              <button onClick={contactByWhatsApp}
                style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                📲 WhatsApp
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

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section style={{ background: "white", padding: "0 20px 48px" }}>
        <div className="stats-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, transform: "translateY(-30px)" }}>
          {[
            { icon: "📦", val: `${products.length}`, label: "Produits disponibles" },
            { icon: "🏷️", val: `${categories.length}`, label: "Catégories" },
            { icon: "⚡", val: "Rapide", label: "Livraison locale" },
            { icon: "🌟", val: "Qualité", label: "Produits vérifiés" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: AMBER, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATALOGUE PRODUITS ───────────────────────────────────────────────── */}
      <section id="products" style={{ background: "#fafaf9", padding: "40px 20px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span style={{ background: `${AMBER}18`, color: AMBER, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Notre catalogue</span>
            <h2 style={{ fontSize: 30, fontWeight: 800, margin: "12px 0 10px", color: "#0f172a" }}>Nos Produits</h2>
            <p style={{ color: "#64748b", fontSize: 14, maxWidth: 460, margin: "0 auto" }}>Ajoutez vos articles au panier et contactez la boutique pour finaliser votre commande.</p>
          </div>

          {/* Barre de recherche */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, maxWidth: 480 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un produit…"
                style={{ width: "100%", padding: "10px 12px 10px 38px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "white" }}
              />
            </div>
          </div>

          {/* Filtres catégories */}
          {categories.length > 0 && (
            <div className="cats-bar" style={{ display: "flex", gap: 8, marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
              {["Tous", ...categories].map(cat => (
                <button key={cat} className="cat-btn" onClick={() => setActiveCategory(cat)}
                  style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: activeCategory === cat ? 700 : 500, fontSize: 13, whiteSpace: "nowrap", background: activeCategory === cat ? AMBER : "white", color: activeCategory === cat ? "white" : "#374151", transition: "all 0.15s" }}>
                  {cat !== "Tous" && getCatIcon(cat)} {cat}
                </button>
              ))}
            </div>
          )}

          {/* Grille produits */}
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0", fontSize: 15 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              {search ? `Aucun produit trouvé pour "${search}"` : "Aucun produit disponible dans cette catégorie."}
            </div>
          ) : (
            <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {filteredProducts.map(p => (
                <div key={p.id} className="prod-card" style={{ background: "white", borderRadius: 16, padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  {/* Icône catégorie */}
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${AMBER}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 14 }}>
                    {getCatIcon(p.categorie || "")}
                  </div>

                  {/* Nom + catégorie */}
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4, lineHeight: 1.3 }}>{p.nom}</div>
                  {p.categorie && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.categorie}</div>
                  )}

                  {/* Prix + unité */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: AMBER }}>{fmtMoney(p.prix_vente)}</span>
                    {p.unite && p.unite !== "pièce" && (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>/ {p.unite}</span>
                    )}
                  </div>

                  {/* Stock faible */}
                  {p.stock <= 5 && (
                    <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>⚠️ Plus que {p.stock} en stock</div>
                  )}

                  {/* Bouton ajouter */}
                  <button className="add-btn" onClick={() => addToCart(p)}
                    style={{ width: "100%", marginTop: 12, padding: "10px", background: AMBER, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "background 0.15s" }}>
                    + Ajouter au panier
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── POURQUOI NOUS ────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,${AMBER_DARK},${AMBER})`, padding: "60px 20px", color: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Pourquoi acheter chez nous ?</h2>
          <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 44, maxWidth: 460, margin: "0 auto 44px" }}>Des produits de qualité, des prix honnêtes et un service de proximité.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 860, margin: "0 auto" }}>
            {[
              { icon: "✅", title: "Produits vérifiés", desc: "Chaque article est contrôlé avant d'être proposé. Qualité garantie." },
              { icon: "⚡", title: "Service rapide", desc: "Disponibles pour répondre à vos questions et traiter vos commandes vite." },
              { icon: "🤝", title: "Prix transparents", desc: "Les prix affichés sont les prix réels. Pas de mauvaises surprises." },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 16, padding: "28px 24px", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────────────────────── */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nous Contacter</h2>
            <p style={{ color: "#64748b", fontSize: 14 }}>Passez votre commande ou posez vos questions directement.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 780, margin: "0 auto 40px" }}>
            {[
              { icon: "📞", label: "Téléphone", val: store.phone || "Non renseigné" },
              { icon: "✉️", label: "Email",     val: store.email || "Non renseigné" },
              { icon: "📍", label: "Adresse",   val: [store.address, store.city].filter(Boolean).join(", ") || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "24px 16px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#fafaf9" }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
          {store.phone && (
            <div style={{ textAlign: "center" }}>
              <button onClick={contactByWhatsApp}
                style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "14px 40px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(37,211,102,0.3)" }}>
                📲 Commander via WhatsApp
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: AMBER_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {store.logo_url ? <img src={store.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>🏪</span>}
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "white" }}>{store.name}</span>
          </div>
          <p style={{ fontSize: 12, margin: "0 0 8px" }}>{storeLabel} · {tenantCode}</p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
            Propulsé par <strong style={{ color: "white" }}>Moftal</strong> · Marché numérique africain
            <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
              Retour à la plateforme
            </button>
          </div>
        </div>
      </footer>

      {/* ── PANNEAU PANIER (slide-in) ─────────────────────────────────────────── */}
      {showCart && (
        <>
          <div onClick={() => setShowCart(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px,95vw)", background: "white", zIndex: 400, boxShadow: "-4px 0 32px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", animation: "slideIn 0.25s ease" }}>
            {/* Header panier */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: AMBER }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "white" }}>🛒 Mon Panier ({cartCount})</div>
              <button onClick={() => setShowCart(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", paddingTop: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Votre panier est vide</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>Ajoutez des produits depuis le catalogue</div>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.product.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #f8fafc" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${AMBER}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                      {getCatIcon(item.product.categorie || "")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.nom}</div>
                      <div style={{ fontSize: 13, color: AMBER, fontWeight: 700 }}>{fmtMoney(item.product.prix_vente)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => changeQty(item.product.id, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <span style={{ fontWeight: 700, fontSize: 15, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => changeQty(item.product.id, 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      <button onClick={() => removeFromCart(item.product.id)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer panier */}
            {cartItems.length > 0 && (
              <div style={{ padding: "20px 24px", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Total estimé</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: AMBER }}>{fmtMoney(cartTotal)}</span>
                </div>
                {store.phone ? (
                  <button onClick={() => { setShowCart(false); contactByWhatsApp(); }}
                    style={{ width: "100%", padding: "14px", background: "#25D366", color: "white", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 15 }}>
                    📲 Commander via WhatsApp
                  </button>
                ) : (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px", textAlign: "center", fontSize: 13, color: "#64748b" }}>
                    Contactez la boutique pour passer votre commande.
                  </div>
                )}
                <button onClick={() => setCartItems([])} style={{ width: "100%", marginTop: 8, padding: "10px", background: "none", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>
                  Vider le panier
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
