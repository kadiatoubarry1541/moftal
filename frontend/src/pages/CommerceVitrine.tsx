import MediasPublics from "../components/MediasPublics";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";
import LogoEtablissement from "../components/LogoEtablissement";
import { CouverturePhotoSite, GalerieVitrine } from "../components/PhotosVitrine";
import { usePhotosSite } from "../utils/photosSite";
import EcrireAuSite from "../components/EcrireAuSite";
import { useTraduction } from "../i18n/traduction";
import type { EtablissementPublic } from "../types/vitrine";
import type { AvisCommerce, Produit } from "../types/commerce";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const AMBER       = "#d97706";
const AMBER_DARK  = "#92400e";

function fmtMoney(n: number) {
  return (Number(n) || 0).toLocaleString("fr-FR") + " GNF";
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
  const photos = usePhotosSite(tenantCode);
  const navigate = useNavigate();
  const { tr } = useTraduction();

  const [store, setStore]         = useState<EtablissementPublic | null>(null);
  const [products, setProducts]   = useState<Produit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [search, setSearch]       = useState("");
  const [, setMobileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState<{ product: Produit; qty: number }[]>([]);
  const [showCart, setShowCart]   = useState(false);
  const [reviews, setReviews]     = useState<AvisCommerce[]>([]);
  const [reviewStats, setReviewStats] = useState<{ moyenne: number; total: number }>({ moyenne: 0, total: 0 });
  const [reviewForm, setReviewForm] = useState({ nom_auteur: "", note: 5, commentaire: "" });
  const [reviewSent, setReviewSent] = useState(false);


  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/commerce-public/${code}`).then(r => r.json()),
      fetch(`${API}/api/commerce-public/${code}/products`).then(r => r.json()),
      fetch(`${API}/api/commerce-public/${code}/categories`).then(r => r.json()),
      fetch(`${API}/api/commerce-public/${code}/reviews`).then(r => r.json()),
    ]).then(([s, p, c, rv]) => {
      if (s.success) setStore(s.store);
      else setError(s.message || "Boutique introuvable");
      if (p.success) setProducts(p.products || []);
      if (c.success) setCategories(c.categories || []);
      if (rv.success) { setReviews(rv.reviews || []); setReviewStats({ moyenne: rv.moyenne || 0, total: rv.total || 0 }); }
    }).catch(() => setError("Impossible de charger la boutique."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  async function submitReview() {
    if (!reviewForm.note) return;
    const r = await fetch(`${API}/api/commerce-public/${tenantCode}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reviewForm) }).then(r => r.json());
    if (r.success) { setReviewSent(true); setReviewForm({ nom_auteur: "", note: 5, commentaire: "" }); }
  }

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "Tous") list = list.filter(p => p.categorie === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.nom.toLowerCase().includes(q) || (p.categorie || "").toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategory, search]);

  const cartTotal = cartItems.reduce((s, i) => s + +i.product.prix_vente * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  function addToCart(product: Produit) {
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

  // Commande ou question envoyée directement à la boutique (sa gestion)
  const messageBoutique = cartItems.length > 0
    ? `Bonjour ! Je souhaite commander :\n${cartItems.map(i => `- ${i.product.nom} x${i.qty} = ${fmtMoney(+i.product.prix_vente * i.qty)}`).join("\n")}\n\nTotal : ${fmtMoney(cartTotal)}\n\nMerci !`
    : "Bonjour ! Je suis intéressé(e) par vos produits.";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #fde68a`, borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: AMBER_DARK, fontSize: 14, fontWeight: 600 }}>{tr("Chargement en cours...")}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !store) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏪</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{tr("Boutique introuvable")}</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error ? tr(error) : tr("Cette boutique n'existe pas ou n'est plus disponible.")}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: AMBER, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          {tr("Retour à l'accueil")}
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
        .nav-link { color: #334155; font-weight: 500; font-size: 14px; cursor: pointer; padding: 6px 4px; border: none; background: none; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .nav-link:hover { color: #0f172a; border-bottom-color: ${AMBER}; }
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
      <div style={{ background: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            {store.phone   && <span>📞 {store.phone}</span>}
            {store.email   && <span>✉ {store.email}</span>}
            {(store.address || store.city) && <span>📍 {[store.address, store.city].filter(Boolean).join(", ")}</span>}
            {store.horaires && <span>🕐 {store.horaires}</span>}
            {store.phone_urgence && (
              <a href={`tel:${store.phone_urgence}`} style={{ background: "#ef4444", color: "white", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>{tr("🚨 Urgence")}</a>
            )}
          </div>
        </div>
      </div>

      {/* ── NAVBAR ───────────────────────────────────────────────────────────── */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", position: "sticky", top: 0, zIndex: 200 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <LogoEtablissement src={store.logo_url} name={store.name} fontSize={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", lineHeight: 1.1 }}>{store.name}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{tr(storeLabel)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 18 }}>
              {[["Accueil","hero"],["Produits","products"],["Avis","avis"],["Contact","contact"]].map(([label, id]) => (
                <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{tr(label)}</button>
              ))}
            </div>

            {/* Panier */}
            <button onClick={() => setShowCart(true)}
              style={{ position: "relative", background: "white", border: `1.5px solid ${AMBER}`, borderRadius: 10, padding: "8px 16px", color: AMBER, cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              {tr("🛒 Panier")}
              {cartCount > 0 && (
                <span style={{ background: "#ef4444", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, position: "absolute", top: -6, right: -6 }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* PHOTO DE COUVERTURE (ajoutée depuis l'Espace Pro) */}
      <CouverturePhotoSite photos={photos} nom={store?.name} />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section id="hero" style={{ background: "#f8fafc", padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "white", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <LogoEtablissement src={store.logo_url} name={store.name} fontSize={46} />
          </div>
          <h1 className="hero-title" style={{ fontSize: 42, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>
            {store.name}
          </h1>
          <p className="hero-sub" style={{ fontSize: 17, color: "#334155", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {store.description || tr("Bienvenue dans notre boutique. Découvrez nos produits de qualité au meilleur prix.")}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("products")}
              style={{ background: AMBER, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(217,119,6,0.25)" }}>
              {tr("Voir les produits")}
            </button>
            <EcrireAuSite tenantCode={tenantCode!} nomEtablissement={store.name} couleur={AMBER} objet={cartItems.length ? "Commande" : "Message"} messageInitial={messageBoutique}
              style={{ background: "white", color: AMBER, border: `2px solid ${AMBER}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
              {tr("✉️ Nous écrire")}
            </EcrireAuSite>
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
            { icon: "⚡", val: tr("Rapide"), label: "Livraison locale" },
            { icon: "🌟", val: tr("Qualité"), label: "Produits vérifiés" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: AMBER, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{tr(s.label)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATALOGUE PRODUITS ───────────────────────────────────────────────── */}
      <section id="products" style={{ background: "#fafaf9", padding: "40px 20px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span style={{ background: `${AMBER}18`, color: AMBER, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{tr("Notre catalogue")}</span>
            <h2 style={{ fontSize: 30, fontWeight: 800, margin: "12px 0 10px", color: "#0f172a" }}>{tr("Nos Produits")}</h2>
            <p style={{ color: "#64748b", fontSize: 14, maxWidth: 460, margin: "0 auto" }}>{tr("Ajoutez vos articles au panier et contactez la boutique pour finaliser votre commande.")}</p>
          </div>

          {/* Barre de recherche */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, maxWidth: 480 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tr("Rechercher un produit…")}
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
                  {cat !== "Tous" && getCatIcon(cat)} {cat === "Tous" ? tr("Tous") : cat}
                </button>
              ))}
            </div>
          )}

          {/* Grille produits */}
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0", fontSize: 15 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              {search ? tr("Aucun produit trouvé pour \"{recherche}\"", { recherche: search }) : tr("Aucun produit disponible dans cette catégorie.")}
            </div>
          ) : (
            <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {filteredProducts.map(p => (
                <div key={p.id} className="prod-card" style={{ background: "white", borderRadius: 16, padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  {/* Photo ou icône catégorie */}
                  {p.photo_url ? (
                    <div style={{ width: "100%", height: 120, borderRadius: 14, overflow: "hidden", marginBottom: 14, background: "#f8fafc" }}>
                      <img src={p.photo_url} alt={p.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${AMBER}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 14 }}>
                      {getCatIcon(p.categorie || "")}
                    </div>
                  )}

                  <div style={{ marginBottom: 10 }}><MediasPublics videoUrl={p.video_url} audioUrl={p.audio_url} /></div>

                  {/* Nom + catégorie */}
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4, lineHeight: 1.3 }}>{p.nom}</div>
                  {p.categorie && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.categorie}</div>
                  )}

                  {/* Prix + unité */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                    {+p.prix_vente > 0
                      ? <span style={{ fontSize: 18, fontWeight: 800, color: AMBER }}>{fmtMoney(+p.prix_vente)}</span>
                      : <span style={{ fontSize: 13, fontWeight: 700, color: "#b45309" }}>{p.audio_url ? tr("🎤 Prix dans le vocal") : tr("Prix sur demande")}</span>}
                    {p.unite && p.unite !== "pièce" && (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>/ {p.unite}</span>
                    )}
                  </div>

                  {/* Stock faible */}
                  {p.stock != null && Number(p.stock) <= 5 && (
                    <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>{tr("⚠️ Plus que {n} en stock", { n: p.stock })}</div>
                  )}

                  {/* Bouton ajouter */}
                  <button className="add-btn" onClick={() => addToCart(p)}
                    style={{ width: "100%", marginTop: 12, padding: "10px", background: AMBER, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "background 0.15s" }}>
                    {tr("+ Ajouter au panier")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── POURQUOI NOUS ────────────────────────────────────────────────────── */}
      <section style={{ background: "white", padding: "60px 20px", color: "#0f172a" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>{tr("Pourquoi acheter chez nous ?")}</h2>
          <p style={{ fontSize: 14, color: "#334155", marginBottom: 44, maxWidth: 460, margin: "0 auto 44px" }}>{tr("Des produits de qualité, des prix honnêtes et un service de proximité.")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 860, margin: "0 auto" }}>
            {[
              { icon: "✅", title: "Produits vérifiés", desc: "Chaque article est contrôlé avant d'être proposé. Qualité garantie." },
              { icon: "⚡", title: "Service rapide", desc: "Disponibles pour répondre à vos questions et traiter vos commandes vite." },
              { icon: "🤝", title: "Prix transparents", desc: "Les prix affichés sont les prix réels. Pas de mauvaises surprises." },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 16, padding: "28px 24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{tr(item.title)}</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{tr(item.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AVIS CLIENTS ─────────────────────────────────────────────────────── */}
      <section id="avis" style={{ background: "#fafaf9", padding: "60px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{tr("Avis clients")}</h2>
            {reviewStats.total > 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>
                <span style={{ color: "#f59e0b" }}>{"★".repeat(Math.round(reviewStats.moyenne))}{"☆".repeat(5 - Math.round(reviewStats.moyenne))}</span>
                {" "}{tr("{moyenne} / 5 · {total} avis", { moyenne: reviewStats.moyenne.toFixed(1), total: reviewStats.total })}
              </p>
            ) : (
              <p style={{ color: "#64748b", fontSize: 14 }}>{tr("Soyez le premier à donner votre avis sur cette boutique.")}</p>
            )}
          </div>

          {reviews.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 18 }}>
                  <div style={{ color: "#f59e0b", fontSize: 14, marginBottom: 6 }}>{"★".repeat(r.note)}{"☆".repeat(5 - r.note)}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{r.nom_auteur || tr("Anonyme")}</div>
                  {r.commentaire && <p style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>{r.commentaire}</p>}
                </div>
              ))}
            </div>
          )}

          <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, maxWidth: 480, margin: "0 auto" }}>
            {reviewSent ? (
              <p style={{ textAlign: "center", color: "#16a34a", fontWeight: 600, margin: 0 }}>{tr("Merci ! Votre avis sera visible après modération.")}</p>
            ) : (
              <>
                <div style={{ fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{tr("Laisser un avis")}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setReviewForm(f => ({ ...f, note: n }))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, color: n <= reviewForm.note ? "#f59e0b" : "#e2e8f0" }}>★</button>
                  ))}
                </div>
                <input placeholder={tr("Votre nom (optionnel)")} value={reviewForm.nom_auteur} onChange={e => setReviewForm(f => ({ ...f, nom_auteur: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                <textarea placeholder={tr("Votre commentaire (optionnel)")} value={reviewForm.commentaire} onChange={e => setReviewForm(f => ({ ...f, commentaire: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", height: 70, resize: "none", marginBottom: 12 }} />
                <button onClick={submitReview} style={{ width: "100%", padding: "10px", background: AMBER, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{tr("Envoyer mon avis")}</button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────────────────────── */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{tr("Nous Contacter")}</h2>
            <p style={{ color: "#64748b", fontSize: 14 }}>{tr("Passez votre commande ou posez vos questions directement.")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 780, margin: "0 auto 40px" }}>
            {[
              { icon: "📞", label: "Téléphone", val: store.phone || tr("Non renseigné") },
              { icon: "✉️", label: "Email",     val: store.email || tr("Non renseigné") },
              { icon: "📍", label: "Adresse",   val: [store.address, store.city].filter(Boolean).join(", ") || tr("Non renseignée") },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "24px 16px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#fafaf9" }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr(item.label)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <EcrireAuSite tenantCode={tenantCode!} nomEtablissement={store.name} couleur={AMBER} objet={cartItems.length ? "Commande" : "Message"} messageInitial={messageBoutique}
              style={{ background: AMBER, color: "white", border: "none", borderRadius: 12, padding: "14px 40px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(217,119,6,0.3)" }}>
              {cartItems.length ? tr("🛒 Envoyer ma commande") : tr("✉️ Nous écrire")}
            </EcrireAuSite>
          </div>
        </div>
      </section>

      <GalerieVitrine photos={photos} couleur="#d97706" />

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#d97706" accentDark="#78350f" />

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", color: "#64748b", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={store.logo_url} name={store.name} fontSize={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{store.name}</span>
          </div>
          <p style={{ fontSize: 12, margin: "0 0 8px" }}>{tr(storeLabel)}</p>
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
            <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
              <img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5, background: "white", border: "1px solid #e2e8f0", borderRadius: 4, padding: 1 }} />{tr("Retour à la plateforme")}
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
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white" }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>{tr("🛒 Mon Panier ({n})", { n: cartCount })}</div>
              <button onClick={() => setShowCart(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", paddingTop: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{tr("Votre panier est vide")}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>{tr("Ajoutez des produits depuis le catalogue")}</div>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.product.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #f8fafc" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${AMBER}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                      {getCatIcon(item.product.categorie || "")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.nom}</div>
                      <div style={{ fontSize: 13, color: AMBER, fontWeight: 700 }}>{fmtMoney(+item.product.prix_vente)}</div>
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
                  <span style={{ fontWeight: 600, color: "#64748b" }}>{tr("Total estimé")}</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: AMBER }}>{fmtMoney(cartTotal)}</span>
                </div>
                <EcrireAuSite tenantCode={tenantCode!} nomEtablissement={store.name} couleur={AMBER} objet="Commande" messageInitial={messageBoutique}
                  style={{ width: "100%", padding: "14px", background: AMBER, color: "white", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 15 }}>
                  {tr("🛒 Envoyer ma commande à la boutique")}
                </EcrireAuSite>
                <button onClick={() => setCartItems([])} style={{ width: "100%", marginTop: 8, padding: "10px", background: "none", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>
                  {tr("Vider le panier")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
