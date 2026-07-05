import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";
const COLOR     = "#92400e";
const COLOR_BG  = "#fffbeb";
const COLOR_BDR = "#fcd34d";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : ""; }

export default function ArtisanVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [artisan, setArtisan] = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/pro-public/artisan/${tenantCode}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/artisan/${tenantCode}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setArtisan(t.tenant);
      else setError(t.message || "Artisan introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger cet artisan."))
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

  if (error || !artisan) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:"0 24px" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🔧</div>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Artisan introuvable</h2>
        <p style={{ color:"#64748b", marginBottom:24 }}>{error}</p>
        <button onClick={() => navigate(-1 as any)} style={{ padding:"10px 24px", background: COLOR, color:"white", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600 }}>Retour</button>
      </div>
    </div>
  );

  const works: any[]         = data?.products || data?.works || [];
  const announcements: any[] = data?.announcements || [];
  const stats                = data?.stats || {};

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", minHeight:"100vh", background:"#fffbf0" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ background:`linear-gradient(135deg,#78350f,${COLOR})`, padding:"32px 24px 28px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <button onClick={() => navigate(-1 as any)} style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600, marginBottom:20 }}>← Retour</button>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {artisan.logo_url
              ? <img src={artisan.logo_url} alt="logo" style={{ width:72, height:72, borderRadius:14, objectFit:"cover", border:"3px solid rgba(255,255,255,0.3)" }} />
              : <div style={{ width:72, height:72, borderRadius:14, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>🔧</div>}
            <div>
              <h1 style={{ margin:0, color:"white", fontSize:26, fontWeight:800 }}>{artisan.name}</h1>
              <div style={{ color:"rgba(255,255,255,0.8)", fontSize:14, marginTop:4 }}>Artisan</div>
              {artisan.specialite && <div style={{ color:"rgba(255,255,255,0.75)", fontSize:13, marginTop:2 }}>🛠 {artisan.specialite}</div>}
              {artisan.city && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:2 }}>📍 {artisan.city}</div>}
            </div>
          </div>
          <div style={{ display:"flex", gap:16, marginTop:24, flexWrap:"wrap" }}>
            {[
              { label:"Réalisations", value: stats.works ?? works.length, icon:"🔨" },
              { label:"Clients", value: stats.clients ?? 0, icon:"👥" },
              { label:"Années expérience", value: artisan.experience_years ?? "—", icon:"🏅" },
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
        {(artisan.description || artisan.phone || artisan.email || artisan.address) && (
          <div style={{ background:"white", borderRadius:14, border:`1px solid ${COLOR_BDR}`, padding:"20px 24px", marginBottom:24, animation:"fadeIn 0.2s ease" }}>
            <h2 style={{ margin:"0 0 12px", fontSize:16, fontWeight:700, color:"#0f172a" }}>À propos</h2>
            {artisan.description && <p style={{ margin:"0 0 12px", fontSize:14, color:"#475569", lineHeight:1.7 }}>{artisan.description}</p>}
            <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:13, color:"#64748b" }}>
              {artisan.phone   && <span>📞 {artisan.phone}</span>}
              {artisan.email   && <span>✉️ {artisan.email}</span>}
              {artisan.address && <span>📍 {artisan.address}</span>}
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
          <h2 style={{ fontSize:17, fontWeight:800, color:"#0f172a", margin:"0 0 14px" }}>🔨 Travaux & Services</h2>
          {works.length === 0
            ? <div style={{ textAlign:"center", padding:"48px 0", color:"#94a3b8" }}><div style={{ fontSize:40, marginBottom:12 }}>🔧</div><div>Aucun travail affiché</div></div>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
                {works.map((w: any, i: number) => (
                  <div key={i} style={{ background:"white", border:`1px solid ${COLOR_BDR}`, borderRadius:12, padding:"18px", animation:`fadeIn 0.2s ease ${i*0.04}s both` }}>
                    <div style={{ fontWeight:700, fontSize:15, color:"#0f172a", marginBottom:6 }}>{w.nom || w.name}</div>
                    {w.description && <div style={{ fontSize:13, color:"#64748b", marginBottom:8, lineHeight:1.5 }}>{w.description}</div>}
                    {(w.prix || w.prix_detail) > 0 && (
                      <div style={{ fontWeight:800, fontSize:16, color: COLOR }}>{(w.prix || w.prix_detail).toLocaleString("fr-FR")} GNF</div>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>

        {(artisan.phone || artisan.email) && (
          <div style={{ marginTop:32, background:`linear-gradient(135deg,#78350f,${COLOR})`, borderRadius:16, padding:"24px 28px", color:"white" }}>
            <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:800 }}>Contacter cet artisan</h3>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:16 }}>
              {artisan.phone && <a href={`tel:${artisan.phone}`} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:"white", color: COLOR, borderRadius:10, textDecoration:"none", fontWeight:700, fontSize:14 }}>📞 {artisan.phone}</a>}
              {artisan.email && <a href={`mailto:${artisan.email}`} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:"rgba(255,255,255,0.15)", color:"white", borderRadius:10, textDecoration:"none", fontWeight:700, fontSize:14, border:"1px solid rgba(255,255,255,0.3)" }}>✉️ {artisan.email}</a>}
            </div>
          </div>
        )}
      </div>
      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#b45309" accentDark="#78350f" />
    </div>
  );
}
