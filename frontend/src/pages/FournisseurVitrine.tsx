import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";

const CYAN      = "#0e7490";
const CYAN_DARK = "#0c6072";
const CYAN_BG   = "#ecfeff";
const CYAN_BDR  = "#a5f3fc";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : ""; }

export default function FournisseurVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/supplier/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/supplier/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setSupplier(t.tenant);
      else setError(t.message || "Fournisseur introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger ce fournisseur."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background: CYAN_BG }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, border:`3px solid ${CYAN_BDR}`, borderTopColor: CYAN, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
        <p style={{ color: CYAN_DARK, fontSize:14, fontWeight:600 }}>Chargement…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !supplier) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:"0 24px" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🚚</div>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Fournisseur introuvable</h2>
        <p style={{ color:"#64748b", marginBottom:24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding:"10px 24px", background: CYAN, color:"white", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600 }}>Retour</button>
      </div>
    </div>
  );

  const products: any[]     = data?.products || [];
  const announcements: any[] = data?.announcements || [];
  const stats               = data?.stats || {};

  const filteredProducts = products.filter((p: any) =>
    !search || p.nom?.toLowerCase().includes(search.toLowerCase()) || p.categorie?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(products.map((p: any) => p.categorie).filter(Boolean)));

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", minHeight:"100vh", background:"#f8fafc" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,#0c4a6e,${CYAN})`, padding:"32px 24px 28px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <button onClick={() => navigate(-1 as any)} style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600, marginBottom:20, display:"flex", alignItems:"center", gap:6 }}>
            ← Retour
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {supplier.logo_url ? (
              <img src={supplier.logo_url} alt="logo" style={{ width:72, height:72, borderRadius:14, objectFit:"cover", border:"3px solid rgba(255,255,255,0.3)" }} />
            ) : (
              <div style={{ width:72, height:72, borderRadius:14, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>🚚</div>
            )}
            <div>
              <h1 style={{ margin:0, color:"white", fontSize:26, fontWeight:800 }}>{supplier.name}</h1>
              <div style={{ color:"rgba(255,255,255,0.8)", fontSize:14, marginTop:4 }}>Fournisseur / Grossiste</div>
              {supplier.city && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:2 }}>📍 {supplier.city}</div>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:16, marginTop:24, flexWrap:"wrap" }}>
            {[
              { label:"Produits", value: stats.products ?? 0, icon:"📦" },
              { label:"Clients / Revendeurs", value: stats.clients ?? 0, icon:"🤝" },
              { label:"Catégories", value: categories.length, icon:"🏷️" },
            ].map(s => (
              <div key={s.label} style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"12px 20px", textAlign:"center", minWidth:100 }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:"white" }}>{s.value}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"28px 20px" }}>

        {/* Description & Contact */}
        {(supplier.description || supplier.phone || supplier.email || supplier.address) && (
          <div style={{ background:"white", borderRadius:14, border:"1px solid #e2e8f0", padding:"20px 24px", marginBottom:24, animation:"fadeIn 0.2s ease" }}>
            <h2 style={{ margin:"0 0 12px", fontSize:16, fontWeight:700, color:"#0f172a" }}>À propos</h2>
            {supplier.description && <p style={{ margin:"0 0 12px", fontSize:14, color:"#475569", lineHeight:1.7 }}>{supplier.description}</p>}
            <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:13, color:"#64748b" }}>
              {supplier.phone   && <span>📞 {supplier.phone}</span>}
              {supplier.email   && <span>✉️ {supplier.email}</span>}
              {supplier.address && <span>📍 {supplier.address}</span>}
            </div>
          </div>
        )}

        {/* Annonces */}
        {announcements.length > 0 && (
          <div style={{ marginBottom:28, animation:"fadeIn 0.2s ease 0.05s both" }}>
            <h2 style={{ fontSize:17, fontWeight:800, color:"#0f172a", margin:"0 0 14px" }}>📢 Annonces</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {announcements.map((a: any, i: number) => (
                <div key={i} style={{ background:"white", border:`1px solid ${CYAN_BDR}`, borderLeft:`4px solid ${CYAN}`, borderRadius:10, padding:"14px 18px" }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"#0f172a", marginBottom:4 }}>{a.titre}</div>
                  <div style={{ fontSize:13, color:"#475569", lineHeight:1.6 }}>{a.contenu}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>{fmtDate(a.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Catalogue produits */}
        <div style={{ animation:"fadeIn 0.2s ease 0.1s both" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#0f172a" }}>📦 Catalogue ({products.length} produits)</h2>
            <div style={{ position:"relative" }}>
              <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit…"
                style={{ padding:"8px 12px 8px 30px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, outline:"none", width:200 }} />
            </div>
          </div>

          {/* Filtres catégorie */}
          {categories.length > 1 && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              <button onClick={() => setSearch("")} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${!search ? CYAN : "#e2e8f0"}`, background: !search ? CYAN : "white", color: !search ? "white" : "#64748b", fontSize:12, cursor:"pointer", fontWeight:600 }}>Tout</button>
              {categories.map((cat: string) => (
                <button key={cat} onClick={() => setSearch(cat)}
                  style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${search === cat ? CYAN : "#e2e8f0"}`, background: search === cat ? CYAN : "white", color: search === cat ? "white" : "#64748b", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:"#94a3b8" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
              <div style={{ fontSize:14 }}>Aucun produit trouvé</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
              {filteredProducts.map((p: any, i: number) => (
                <div key={i} style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", animation:`fadeIn 0.2s ease ${i * 0.04}s both` }}>
                  <div style={{ background: CYAN_BG, padding:"12px 16px", borderBottom:`1px solid ${CYAN_BDR}` }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{p.nom}</div>
                    {p.categorie && <div style={{ fontSize:11, color: CYAN, fontWeight:600, marginTop:2 }}>{p.categorie}</div>}
                  </div>
                  <div style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>Prix gros</div>
                        <div style={{ fontWeight:800, fontSize:16, color: CYAN }}>{(p.prix_gros||0).toLocaleString("fr-FR")} GNF</div>
                      </div>
                      {p.prix_detail > 0 && (
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>Prix détail</div>
                          <div style={{ fontWeight:700, fontSize:14, color:"#475569" }}>{(p.prix_detail||0).toLocaleString("fr-FR")} GNF</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:12, color: p.stock > 0 ? "#156315" : "#be123c", fontWeight:600 }}>
                        {p.stock > 0 ? `✅ En stock (${p.stock} ${p.unite||"unité"})` : "❌ Rupture de stock"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact footer */}
        {(supplier.phone || supplier.email) && (
          <div style={{ marginTop:32, background:`linear-gradient(135deg,#0c4a6e,${CYAN})`, borderRadius:16, padding:"24px 28px", color:"white", animation:"fadeIn 0.2s ease 0.15s both" }}>
            <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:800 }}>Contacter ce fournisseur</h3>
            <p style={{ margin:"0 0 16px", fontSize:13, opacity:0.85 }}>Passez commande ou demandez un devis directement.</p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:"white", color: CYAN, borderRadius:10, textDecoration:"none", fontWeight:700, fontSize:14 }}>
                  📞 {supplier.phone}
                </a>
              )}
              {supplier.email && (
                <a href={`mailto:${supplier.email}`} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:"rgba(255,255,255,0.15)", color:"white", borderRadius:10, textDecoration:"none", fontWeight:700, fontSize:14, border:"1px solid rgba(255,255,255,0.3)" }}>
                  ✉️ {supplier.email}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
