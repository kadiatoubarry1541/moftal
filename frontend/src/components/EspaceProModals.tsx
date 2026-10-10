import { useRef } from "react";
import { normaliserLogo } from "../utils/logoImage";

// Outils de l'Espace Pro partagés entre la page « Activité » (GestionInterne) et
// le panneau « Espace Pro » ouvert depuis la gestion interne d'un établissement.

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

export const ADMIN_SERVICES = [
  { type: "clinic",          demoCode: "DEMO-REF-CLIN",   label: "Clinique / Hôpital",        emoji: "🏥", color: "#1a8f1a", bg: "#f0fdfa", path: "gestion-clinique",      vitrinePath: "clinique",        reseauPath: "reseau/clinic" },
  { type: "school",          demoCode: "DEMO-REF-ECO",    label: "École / Université",         emoji: "🏫", color: "#1a8f1a", bg: "#f0fdf0", path: "gestion-ecole",         vitrinePath: "ecole",           reseauPath: "reseau/school" },
  { type: "mosque",          demoCode: "DEMO-REF-MSQ",    label: "Réseau Imam",                emoji: "🕌", color: "#1a8f1a", bg: "#f0fdf0", path: "gestion-mosquee",       vitrinePath: "mosquee",         reseauPath: "reseau/mosque" },
  { type: "reseau",          demoCode: "DEMO-REF-RESEAU", label: "Association / Réseau",       emoji: "🌐", color: "#2563eb", bg: "#eff6ff", path: "gestion-reseau",        vitrinePath: "reseau-vitrine",  reseauPath: "reseau/reseau" },
  { type: "madrasa",         demoCode: "DEMO-REF-MDS",    label: "Madrasa / Daroul",           emoji: "📖", color: "#0891b2", bg: "#ecfeff", path: "gestion-madrasa",       vitrinePath: "madrasa",         reseauPath: "reseau/madrasa" },
  { type: "commerce",        demoCode: "DEMO-REF-COM",    label: "Boutique / Commerce",        emoji: "🏪", color: "#d97706", bg: "#fffbeb", path: "gestion-commerce",      vitrinePath: "commerce",        reseauPath: "reseau/commerce" },
  { type: "enterprise",      demoCode: "DEMO-REF-ENT",    label: "Entreprise",                 emoji: "🏢", color: "#4f46e5", bg: "#eef2ff", path: "gestion-entreprise",    vitrinePath: "entreprise",      reseauPath: "reseau/enterprise" },
  { type: "ngo",             demoCode: "DEMO-REF-NGO",    label: "ONG & Associations",         emoji: "🤝", color: "#e11d48", bg: "#fff1f2", path: "gestion-ngo",           vitrinePath: "ngo",             reseauPath: "reseau/ngo" },
  { type: "journalist",      demoCode: "DEMO-REF-JOUR",   label: "Journalistes / Médias",      emoji: "📰", color: "#dc2626", bg: "#fff1f2", path: "gestion-journaliste",   vitrinePath: "journaliste",     reseauPath: "reseau/journalist" },
  { type: "scientist",       demoCode: "DEMO-REF-SCIEN",  label: "Scientifiques",              emoji: "🔬", color: "#4338ca", bg: "#eef2ff", path: "gestion-scientifique",  vitrinePath: "scientifique",    reseauPath: "reseau/scientist" },
  { type: "supplier",        demoCode: "DEMO-REF-FOUR",   label: "Fournisseurs / Grossistes",  emoji: "🚚", color: "#0e7490", bg: "#ecfeff", path: "gestion-fournisseur",   vitrinePath: "fournisseur",     reseauPath: "reseau/supplier" },
  { type: "security_agency", demoCode: "DEMO-REF-SECU",   label: "Agences de Sécurité",        emoji: "🛡️", color: "#475569", bg: "#f8fafc", path: "gestion-securite",      vitrinePath: "securite",        reseauPath: "reseau/security_agency" },
  { type: "broker",          demoCode: "DEMO-REF-IMMO",   label: "Immobilier / Démarcheur",    emoji: "🏠", color: "#b45309", bg: "#fffbeb", path: "gestion-immobilier",    vitrinePath: "immobilier",      reseauPath: "reseau/broker" },
  { type: "restaurant",      demoCode: "DEMO-REF-RESTO",  label: "Restaurant / Restauration",  emoji: "🍽️", color: "#ea580c", bg: "#fff7ed", path: "gestion-restaurant",    vitrinePath: "restaurant",      reseauPath: "reseau/restaurant" },
  { type: "transport",       demoCode: "DEMO-REF-TRANS",  label: "Transport & Livraison",      emoji: "🚌", color: "#1d4ed8", bg: "#eff6ff", path: "gestion-transport",     vitrinePath: "transport",       reseauPath: "reseau/transport" },
  { type: "mairie",          demoCode: "DEMO-REF-MAIR",   label: "Mairie / État Civil",        emoji: "🏛️", color: "#1d4ed8", bg: "#eff6ff", path: "gestion-mairie",        vitrinePath: "mairie",          reseauPath: "" },
  { type: "vendor",          demoCode: "DEMO-REF-VENT",   label: "Vendeur / Détaillant",       emoji: "🛒", color: "#0891b2", bg: "#ecfeff", path: "gestion-vendeur",       vitrinePath: "vendeur",         reseauPath: "reseau/vendor" },
  { type: "producer",        demoCode: "DEMO-REF-PROD",   label: "Entreprise de Production",   emoji: "🏭", color: "#7c3aed", bg: "#f5f3ff", path: "gestion-producer",      vitrinePath: "producteur",      reseauPath: "reseau/producer" },
  { type: "beauty",          demoCode: "DEMO-REF-BEAU",   label: "Beauté & Bien-être",         emoji: "💈", color: "#db2777", bg: "#fdf2f8", path: "gestion-beauty",        vitrinePath: "beaute-vitrine",  reseauPath: "reseau/beauty" },
  { type: "artisan",         demoCode: "DEMO-REF-ARTI",   label: "Artisanat & Services",       emoji: "🔧", color: "#d97706", bg: "#fffbeb", path: "gestion-artisan",       vitrinePath: "artisan",         reseauPath: "reseau/artisan" },
  { type: "health_worker",   demoCode: "DEMO-REF-HLTH",   label: "Médecin / Agent de santé",   emoji: "👨‍⚕️", color: "#1a8f1a", bg: "#f0fdfa", path: "gestion-clinique",    vitrinePath: "clinique",        reseauPath: "reseau/clinic" },
];

export const PUB_TYPES = [
  { value: "annonce",    label: "Annonce",    emoji: "📢" },
  { value: "produit",    label: "Produit",    emoji: "🛍️" },
  { value: "service",    label: "Service",    emoji: "⚙️" },
  { value: "promotion",  label: "Promotion",  emoji: "🏷️" },
  { value: "evenement",  label: "Événement",  emoji: "📅" },
  { value: "info",       label: "Info",       emoji: "ℹ️" },
];

export const DEFAULT_PUB_FORM = { type: "annonce", titre: "", contenu: "", prix: "", image: "" };
export const DEFAULT_PROFIL_FORM = { name: "", description: "", address: "", city: "", phone: "", email: "", photo: "" };

export function getTypeInfo(type: string) {
  const found = ADMIN_SERVICES.find(s => s.type === type);
  if (found) return { label: found.label, path: found.path, vitrinePath: found.vitrinePath || "", color: found.color, bg: found.bg, emoji: found.emoji };
  return { label: type || "Service", path: "gestion-commerce", vitrinePath: "", color: "#64748b", bg: "#f8fafc", emoji: "🏢" };
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface PublishModal {
  accountId: string;
  tenantCode: string;
  name: string;
  form: typeof DEFAULT_PUB_FORM;
  pubs: any[];
  step: "ready" | "saving" | "loading";
}

export interface ProfilModal {
  accountId: string;
  tenantCode: string;
  name: string;
  form: typeof DEFAULT_PROFIL_FORM;
  step: "ready" | "saving";
}

// ─── COMPOSANT MODAL PUBLICATION ──────────────────────────────────────────────

export function PublierModal({ modal, token, onChange, onSubmit, onDelete, onClose }: {
  modal: PublishModal;
  token: string;
  onChange: (form: typeof DEFAULT_PUB_FORM) => void;
  onSubmit: () => void;
  onDelete: (pubId: string) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange({ ...modal.form, image: (ev.target?.result as string) || "" });
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"white", borderRadius:20, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:"#0f172a" }}>Nouvelle publication</h2>
            <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>{modal.name}</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:"50%", border:"none", background:"#f1f5f9", cursor:"pointer", fontSize:18, color:"#64748b", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {modal.step === "loading" ? (
          <div style={{ padding:48, textAlign:"center", color:"#64748b" }}>Chargement...</div>
        ) : (
          <div style={{ padding:"16px 24px 24px" }}>

            {/* Type de publication */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8 }}>Type de publication</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                {PUB_TYPES.map(pt => (
                  <button key={pt.value} onClick={() => onChange({ ...modal.form, type: pt.value })}
                    style={{ padding:"8px 6px", border:`2px solid ${modal.form.type === pt.value ? "#2563eb" : "#e2e8f0"}`, background: modal.form.type === pt.value ? "#eff6ff" : "white", borderRadius:10, cursor:"pointer", fontSize:12, fontWeight:700, color: modal.form.type === pt.value ? "#1d4ed8" : "#475569", textAlign:"center", transition:"all 0.15s" }}>
                    <div style={{ fontSize:18, marginBottom:2 }}>{pt.emoji}</div>
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Titre */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Titre <span style={{ color:"#ef4444" }}>*</span></label>
              <input value={modal.form.titre} onChange={e => onChange({ ...modal.form, titre: e.target.value })} placeholder="Titre de votre publication..."
                style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" }}
                onFocus={e => e.currentTarget.style.borderColor = "#2563eb"}
                onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Contenu */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Contenu</label>
              <textarea value={modal.form.contenu} onChange={e => onChange({ ...modal.form, contenu: e.target.value })} placeholder="Description, détails de votre publication..." rows={4}
                style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", minHeight:90, transition:"border-color 0.15s" }}
                onFocus={e => e.currentTarget.style.borderColor = "#2563eb"}
                onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Prix */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Prix (optionnel)</label>
              <input value={modal.form.prix} onChange={e => onChange({ ...modal.form, prix: e.target.value })} placeholder="Ex: 50 000 GNF"
                style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" }}
                onFocus={e => e.currentTarget.style.borderColor = "#2563eb"}
                onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Image */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Image (optionnelle)</label>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleImage} style={{ display:"none" }} />
              {modal.form.image ? (
                <div style={{ position:"relative", display:"inline-block" }}>
                  <img src={modal.form.image} alt="preview" style={{ height:100, borderRadius:10, objectFit:"cover", border:"1.5px solid #e2e8f0" }} />
                  <button onClick={() => onChange({ ...modal.form, image: "" })}
                    style={{ position:"absolute", top:-8, right:-8, width:24, height:24, borderRadius:"50%", background:"#ef4444", color:"white", border:"none", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding:"10px 18px", border:"1.5px dashed #cbd5e1", borderRadius:10, background:"#f8fafc", cursor:"pointer", fontSize:13, color:"#64748b", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18 }}>🖼️</span> Choisir une image
                </button>
              )}
            </div>

            {/* Boutons action */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={onClose} style={{ flex:1, padding:"12px 0", border:"1.5px solid #e2e8f0", borderRadius:12, background:"white", cursor:"pointer", fontSize:14, fontWeight:700, color:"#475569" }}>
                Annuler
              </button>
              <button onClick={onSubmit} disabled={modal.step === "saving" || !modal.form.titre.trim()}
                style={{ flex:2, padding:"12px 0", border:"none", borderRadius:12, background: modal.form.titre.trim() ? "#2563eb" : "#94a3b8", color:"white", cursor: modal.form.titre.trim() ? "pointer" : "not-allowed", fontSize:14, fontWeight:800, transition:"background 0.15s" }}>
                {modal.step === "saving" ? "Publication en cours..." : "Publier maintenant"}
              </button>
            </div>

            {/* Publications récentes */}
            {modal.pubs.length > 0 && (
              <div style={{ marginTop:24, borderTop:"1.5px solid #f1f5f9", paddingTop:16 }}>
                <h3 style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#0f172a", textTransform:"uppercase", letterSpacing:"0.05em" }}>Publications récentes ({modal.pubs.length})</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {modal.pubs.slice(0, 5).map((p: any) => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
                      <span style={{ fontSize:16 }}>{PUB_TYPES.find(pt => pt.value === p.type)?.emoji || "📢"}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.titre}</div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <button onClick={() => { if (confirm("Supprimer cette publication ?")) onDelete(p.id); }}
                        style={{ padding:"4px 10px", background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:700, flexShrink:0 }}>
                        Suppr.
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPOSANT MODAL PROFIL ───────────────────────────────────────────────────

export function ProfilModalComp({ modal, onChange, onSubmit, onClose }: {
  modal: ProfilModal;
  onChange: (form: typeof DEFAULT_PROFIL_FORM) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    normaliserLogo(file)
      .then(logo => onChange({ ...modal.form, photo: logo }))
      .catch(err => alert(err.message));
  }

  const field = (label: string, key: keyof typeof DEFAULT_PROFIL_FORM, placeholder: string, type: "input" | "textarea" = "input") => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{label}</label>
      {type === "textarea" ? (
        <textarea value={modal.form[key]} onChange={e => onChange({ ...modal.form, [key]: e.target.value })} placeholder={placeholder} rows={3}
          style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" }}
          onFocus={e => e.currentTarget.style.borderColor = "#2563eb"}
          onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
        />
      ) : (
        <input value={modal.form[key]} onChange={e => onChange({ ...modal.form, [key]: e.target.value })} placeholder={placeholder}
          style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" }}
          onFocus={e => e.currentTarget.style.borderColor = "#2563eb"}
          onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
        />
      )}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"white", borderRadius:20, width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:"#0f172a" }}>Modifier le profil</h2>
            <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>{modal.name}</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:"50%", border:"none", background:"#f1f5f9", cursor:"pointer", fontSize:18, color:"#64748b", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        <div style={{ padding:"16px 24px 24px" }}>

          {field("Nom de l'entreprise", "name", "Nom officiel de l'entreprise")}
          {field("Description", "description", "Décrivez votre établissement, vos services...", "textarea")}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Adresse (quartier)</label>
              <input value={modal.form.address} onChange={e => onChange({ ...modal.form, address: e.target.value })} placeholder="Ex : quartier Madina, près du marché"
                style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
              />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Ville</label>
              <input value={modal.form.city} onChange={e => onChange({ ...modal.form, city: e.target.value })} placeholder="Conakry"
                style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
              />
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Téléphone</label>
              <input value={modal.form.phone} onChange={e => onChange({ ...modal.form, phone: e.target.value })} placeholder="+224 6xx xx xx xx"
                style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
              />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Email</label>
              <input value={modal.form.email} onChange={e => onChange({ ...modal.form, email: e.target.value })} placeholder="contact@etablissement.com" type="email"
                style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
              />
            </div>
          </div>

          {/* Photo / Logo */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Photo / Logo</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} style={{ display:"none" }} />
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {modal.form.photo ? (
                <div style={{ position:"relative" }}>
                  <img src={modal.form.photo} alt="logo" style={{ width:64, height:64, borderRadius:12, objectFit:"cover", border:"1.5px solid #e2e8f0" }} />
                  <button onClick={() => onChange({ ...modal.form, photo: "" })}
                    style={{ position:"absolute", top:-8, right:-8, width:22, height:22, borderRadius:"50%", background:"#ef4444", color:"white", border:"none", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ) : (
                <div style={{ width:64, height:64, borderRadius:12, background:"#f1f5f9", border:"1.5px dashed #cbd5e1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🏢</div>
              )}
              <button onClick={() => fileRef.current?.click()}
                style={{ padding:"10px 16px", border:"1.5px dashed #cbd5e1", borderRadius:10, background:"#f8fafc", cursor:"pointer", fontSize:13, color:"#64748b", fontWeight:600 }}>
                {modal.form.photo ? "Changer la photo" : "Ajouter une photo"}
              </button>
            </div>
          </div>

          {/* Boutons */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"12px 0", border:"1.5px solid #e2e8f0", borderRadius:12, background:"white", cursor:"pointer", fontSize:14, fontWeight:700, color:"#475569" }}>
              Annuler
            </button>
            <button onClick={onSubmit} disabled={modal.step === "saving"}
              style={{ flex:2, padding:"12px 0", border:"none", borderRadius:12, background:"#059669", color:"white", cursor:"pointer", fontSize:14, fontWeight:800 }}>
              {modal.step === "saving" ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── OFFRE GESTION INTERNE (formules et prix) ─────────────────────────────────

export type PeriodeGI = "mois" | "troisMois" | "an" | "vie";

export function OffreGestionInterne({ accesGI, disabled, onChoisir, onVisibilite }: {
  accesGI: any;
  disabled?: boolean;
  onChoisir: (periode: PeriodeGI) => void;
  onVisibilite: () => void;
}) {
  return (
    <div style={{ borderRadius:16, overflow:"hidden", marginBottom:16, boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>
      {/* En-tête gradient */}
      <div style={{ background:"linear-gradient(135deg,#1e3a5f,#2563eb)", padding:"22px 22px 16px", color:"white" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <span style={{ fontSize:28 }}>⚡</span>
          <div>
            <p style={{ margin:0, fontSize:16, fontWeight:900 }}>Gestion Interne — Service Complet</p>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#bfdbfe" }}>Le service central de la plateforme</p>
          </div>
        </div>

        {/* Ce qui est inclus */}
        <div style={{ background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
          <p style={{ margin:"0 0 7px", fontSize:11, fontWeight:700, color:"#93c5fd", textTransform:"uppercase", letterSpacing:"0.06em" }}>Tout inclus :</p>
          {[
            "👁️ Visibilité + profil public sur la plateforme",
            "📅 Réception et gestion des rendez-vous",
            "⚙️ Gestion interne complète de votre établissement",
            "📊 Tableaux de bord, statistiques, personnel",
            "💬 Annonces, publications, clients / membres",
          ].map(f => (
            <div key={f} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, fontSize:12, color:"white" }}>
              <span style={{ flexShrink:0, color:"#86efac" }}>✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>

        {/* Options de période */}
        <div style={{ display:"grid", gap:8 }}>
          {([
            { periode: "mois"      as const, label: "Mensuel", prix: accesGI?.prixMois },
            { periode: "troisMois" as const, label: "3 mois",  prix: accesGI?.prixTroisMois },
            { periode: "an"        as const, label: "Annuel",  prix: accesGI?.prixAn,  badge: "2 mois offerts" },
            { periode: "vie"       as const, label: "À vie",   prix: accesGI?.prixVie, badge: "Une seule fois" },
          ]).map(opt => (
            <button key={opt.periode} onClick={() => onChoisir(opt.periode)} disabled={disabled}
              style={{ width:"100%", padding:"12px 16px", background:"white", color:"#1e3a5f", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:800, opacity: disabled ? 0.6 : 1, display:"flex", justifyContent:"space-between", alignItems:"center", transition:"opacity 0.15s", boxSizing:"border-box" }}>
              <span>{opt.label}</span>
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                {opt.badge && (
                  <span style={{ fontSize:11, background:"#22c55e", color:"white", padding:"2px 8px", borderRadius:999, fontWeight:700 }}>
                    {opt.badge}
                  </span>
                )}
                <span style={{ color:"#1e3a5f", fontWeight:900 }}>
                  {opt.prix?.toLocaleString("fr-GN")} GNF
                </span>
              </span>
            </button>
          ))}
        </div>
        <p style={{ fontSize:11, color:"#bfdbfe", marginTop:12, marginBottom:0, textAlign:"center" }}>
          Orange Money · Wave · Visa · Mastercard
        </p>
      </div>

      {/* Pied — comparaison avec Visibilité simple */}
      <div style={{ background:"#f0f4ff", padding:"10px 16px", display:"flex", alignItems:"flex-start", gap:10 }}>
        <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>💡</span>
        <p style={{ margin:0, fontSize:12, color:"#3730a3", lineHeight:1.5 }}>
          <strong>Vous voulez seulement la visibilité ?</strong>{" "}
          <button
            onClick={onVisibilite}
            style={{ background:"none", border:"none", color:"#2563eb", fontWeight:700, cursor:"pointer", fontSize:12, textDecoration:"underline", padding:0 }}>
            Mes comptes pro
          </button>{" "}
          propose la formule Visibilité + Rendez-vous (moins cher, sans la gestion interne).
        </p>
      </div>
    </div>
  );
}
