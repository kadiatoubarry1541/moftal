import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const COLOR     = "#156315";
const COLOR_BG  = "#f0fdf0";
const COLOR_BDR = "#86efac";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : ""; }

export default function ProducteurVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [prod, setProd]       = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/pro-public/producer/${tenantCode}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/producer/${tenantCode}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setProd(t.tenant);
      else setError(t.message || "Producteur introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger ce producteur."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background: COLOR_BG }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, border:`3px solid ${COLOR_BDR}`, borderTopColor: COLOR, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
        <p style={{ color: COLOR, fontSize:14, fontWeight:600 }}>Chargement…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !prod) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:"0 24px" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🌾</div>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Producteur introuvable</h2>
        <p style={{ color:"#64748b", marginBottom:24 }}>{error}</p>
        <button onClick={() => navigate(-1 as any)} style={{ padding:"10px 24px", background: COLOR, color:"white", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600 }}>Retour</button>
      </div>
    </div>
  );

  const products: any[]      = data?.products || [];
  const announcements: any[] = data?.announcements || [];
  const stats                = data?.stats || {};
  const filtered = products.filter((p: any) =>
    !search || p.nom?.toLowerCase().includes(search.toLowerCase()) || p.categorie?.toLowerCase().includes(search.toLowerCase())
  );
  const categories = Array.from(new Set(products.map((p: any) => p.categorie).filter(Boolean)));

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", minHeight:"100vh", background:"#f0fdf0" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ background:`linear-gradient(135deg,#14532d,${COLOR})`, padding:"32px 24px 28px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <button onClick={() => navigate(-1 as any)} style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600, marginBottom:20 }}>← Retour</button>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {prod.logo_url
              ? <img src={prod.logo_url} alt="logo" style={{ width:72, height:72, borderRadius:14, objectFit:"cover", border:"3px solid rgba(255,255,255,0.3)" }} />
              : <div style={{ width:72, height:72, borderRadius:14, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>🌾</div>}
            <div>
              <h1 style={{ margin:0, color:"white", fontSize:26, fontWeight:800 }}>{prod.name}</h1>
              <div style={{ color:"rgba(255,255,255,0.8)", fontSize:14, marginTop:4 }}>Producteur / Agriculteur</div>
              {prod.city && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:2 }}>📍 {prod.city}</div>}
            </div>
          </div>
          <div style={{ display:"flex", gap:16, marginTop:24, flexWrap:"wrap" }}>
            {[
              { label:"Produits", value: stats.products ?? products.length, icon:"🌿" },
              { label:"Catégories", value: categories.length, icon:"🏷️" },
              { label:"Clients", value: stats.clients ?? 0, icon:"👥" },
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
        {(prod.description || prod.phone || prod.email || prod.address) && (
          <div style={{ background:"white", borderRadius:14, border:`1px solid ${COLOR_BDR}`, padding:"20px 24px", marginBottom:24, animation:"fadeIn 0.2s ease" }}>
            <h2 style={{ margin:"0 0 12px", fontSize:16, fontWeight:700, color:"#0f172a" }}>À propos</h2>
            {prod.description && <p style={{ margin:"0 0 12px", fontSize:14, color:"#475569", lineHeight:1.7 }}>{prod.description}</p>}
            <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:13, color:"#64748b" }}>
              {prod.phone   && <span>📞 {prod.phone}</span>}
              {prod.email   && <span>✉️ {prod.email}</span>}
              {prod.address && <span>📍 {prod.address}</span>}
            </div>
          </div>
        )}

        {announcements.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:17, fontWeight:800, color:"#0f172a", margin:"0 0 14px" }}>📢 Annonces</h2>
            {announcements.map((a: any, i: number) => (
              <div key={i} style={{ background:"white", border:`1px solid ${COLOR_BDR}`, borderLeft:`4px solid ${COLOR}`, borderRadius:10, padding:"14px 18px", marginBottom:10 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{a.titre}</div>
                <div style={{ fontSize:13, color:"#475569" }}>{a.contenu}</div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>{fmtDate(a.created_at)}</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#0f172a" }}>🌿 Produits ({products.length})</h2>
            <div style={{ position:"relative" }}>
              <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                style={{ padding:"8px 12px 8px 30px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, outline:"none", width:200 }} />
            </div>
          </div>
          {categories.length > 1 && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              <button onClick={() => setSearch("")} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${!search ? COLOR : "#e2e8f0"}`, background: !search ? COLOR : "white", color: !search ? "white" : "#64748b", fontSize:12, cursor:"pointer", fontWeight:600 }}>Tout</button>
              {(categories as string[]).map(cat => (
                <button key={cat} onClick={() => setSearch(cat)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${search === cat ? COLOR : "#e2e8f0"}`, background: search === cat ? COLOR : "white", color: search === cat ? "white" : "#64748b", fontSize:12, cursor:"pointer", fontWeight:600 }}>{cat}</button>
              ))}
            </div>
          )}
          {filtered.length === 0
            ? <div style={{ textAlign:"center", padding:"48px 0", color:"#94a3b8" }}><div style={{ fontSize:40, marginBottom:12 }}>🌾</div><div>Aucun produit trouvé</div></div>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
                {filtered.map((p: any, i: number) => (
                  <div key={i} style={{ background:"white", border:`1px solid ${COLOR_BDR}`, borderRadius:12, overflow:"hidden", animation:`fadeIn 0.2s ease ${i*0.04}s both` }}>
                    <div style={{ background: COLOR_BG, padding:"12px 16px", borderBottom:`1px solid ${COLOR_BDR}` }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{p.nom}</div>
                      {p.categorie && <div style={{ fontSize:11, color: COLOR, fontWeight:600, marginTop:2 }}>{p.categorie}</div>}
                    </div>
                    <div style={{ padding:"12px 16px" }}>
                      <div style={{ fontWeight:800, fontSize:16, color: COLOR }}>{(p.prix_gros || p.prix_detail || 0).toLocaleString("fr-FR")} GNF</div>
                      <div style={{ fontSize:12, color: p.stock > 0 ? "#156315" : "#be123c", fontWeight:600, marginTop:4 }}>
                        {p.stock > 0 ? `✅ Disponible (${p.stock} ${p.unite || "kg"})` : "❌ Indisponible"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {(prod.phone || prod.email) && (
          <div style={{ marginTop:32, background:`linear-gradient(135deg,#14532d,${COLOR})`, borderRadius:16, padding:"24px 28px", color:"white" }}>
            <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:800 }}>Contacter ce producteur</h3>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:16 }}>
              {prod.phone && <a href={`tel:${prod.phone}`} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:"white", color: COLOR, borderRadius:10, textDecoration:"none", fontWeight:700, fontSize:14 }}>📞 {prod.phone}</a>}
              {prod.email && <a href={`mailto:${prod.email}`} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:"rgba(255,255,255,0.15)", color:"white", borderRadius:10, textDecoration:"none", fontWeight:700, fontSize:14, border:"1px solid rgba(255,255,255,0.3)" }}>✉️ {prod.email}</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
