import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSessionUser, isAdmin } from "../utils/auth";
import Activite from "./Activite";
import { AddPersonModal } from "../components/AddPersonModal";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const ADMIN_SERVICES = [
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

const PUB_TYPES = [
  { value: "annonce",    label: "Annonce",    emoji: "📢" },
  { value: "produit",    label: "Produit",    emoji: "🛍️" },
  { value: "service",    label: "Service",    emoji: "⚙️" },
  { value: "promotion",  label: "Promotion",  emoji: "🏷️" },
  { value: "evenement",  label: "Événement",  emoji: "📅" },
  { value: "info",       label: "Info",       emoji: "ℹ️" },
];

const DEFAULT_PUB_FORM = { type: "annonce", titre: "", contenu: "", prix: "", image: "" };
const DEFAULT_PROFIL_FORM = { name: "", description: "", address: "", city: "", phone: "", email: "", photo: "" };

function getTypeInfo(type: string) {
  const found = ADMIN_SERVICES.find(s => s.type === type);
  if (found) return { label: found.label, path: found.path, vitrinePath: found.vitrinePath || "", color: found.color, bg: found.bg, emoji: found.emoji };
  return { label: type || "Service", path: "gestion-commerce", vitrinePath: "", color: "#64748b", bg: "#f8fafc", emoji: "🏢" };
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PublishModal {
  accountId: string;
  tenantCode: string;
  name: string;
  form: typeof DEFAULT_PUB_FORM;
  pubs: any[];
  step: "ready" | "saving" | "loading";
}

interface ProfilModal {
  accountId: string;
  tenantCode: string;
  name: string;
  form: typeof DEFAULT_PROFIL_FORM;
  step: "ready" | "saving";
}

// ─── COMPOSANT MODAL PUBLICATION ──────────────────────────────────────────────

function PublierModal({ modal, token, onChange, onSubmit, onDelete, onClose }: {
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

function ProfilModalComp({ modal, onChange, onSubmit, onClose }: {
  modal: ProfilModal;
  onChange: (form: typeof DEFAULT_PROFIL_FORM) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange({ ...modal.form, photo: (ev.target?.result as string) || "" });
    reader.readAsDataURL(file);
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

          {field("Nom de l'établissement", "name", "Nom officiel de l'établissement")}
          {field("Description", "description", "Décrivez votre établissement, vos services...", "textarea")}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Adresse</label>
              <input value={modal.form.address} onChange={e => onChange({ ...modal.form, address: e.target.value })} placeholder="Adresse"
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

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function GestionInterne() {
  const navigate = useNavigate();
  const location = useLocation();

  const [accounts, setAccounts]         = useState<any[]>([]);
  const [adminTenants, setAdminTenants] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [accesGI, setAccesGI]           = useState<any>(null);
  const [payGILoading, setPayGILoading] = useState(false);
  const [showPaywall, setShowPaywall]   = useState(false);
  const [tabOverride, setTabOverride]   = useState<"pro" | "activite" | null>(null);
  const [connectModal, setConnectModal] = useState<{ accountId: number; name: string } | null>(null);

  // Modals publication et profil
  const [publishModal, setPublishModal] = useState<PublishModal | null>(null);
  const [profilModal, setProfilModal]   = useState<ProfilModal | null>(null);

  const currentUser = getSessionUser();
  const userIsAdmin = isAdmin(currentUser);
  const token       = localStorage.getItem("token") || "";

  // Lire ?tab= depuis l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlTab = params.get("tab");
    if (urlTab === "pro") setTabOverride("pro");
    else if (urlTab === "activite") setTabOverride("activite");
  }, [location.search]);

  useEffect(() => {
    if (!currentUser) { navigate("/login"); return; }

    const myAccountsPromise = fetch("/api/professionals/my-accounts", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      setAccounts((data.accounts || []).filter((a: any) => a.status === "approved"));
    }).catch(() => {});

    const accesPromise = !userIsAdmin
      ? fetch("/api/payment/acces-gestion-interne", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(d => { if (d.success) setAccesGI(d); }).catch(() => {})
      : Promise.resolve();

    const adminTenantsPromise = userIsAdmin
      ? fetch("/api/professionals/admin/tenants", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(data => { if (data.success) setAdminTenants(data.tenants || []); }).catch(() => {})
      : Promise.resolve();

    Promise.all([myAccountsPromise, accesPromise, adminTenantsPromise]).finally(() => setLoading(false));
  }, []);

  // ─── FONCTIONS PAIEMENT ─────────────────────────────────────────────────────

  async function payerGestionInterne(periode: "mois" | "an" | "cinqAns") {
    setPayGILoading(true);
    try {
      const purposeMap = { mois: "gestion_mois", an: "gestion_an", cinqAns: "gestion_5ans" };
      const prixMap = { mois: accesGI?.prixMois, an: accesGI?.prixAn, cinqAns: accesGI?.prixCinqAns };
      const r = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: prixMap[periode] || 0,
          currency: "GNF",
          purpose: purposeMap[periode],
          relatedId: accesGI?.proId,
          description: `Gestion Interne ${periode === "mois" ? "mensuel" : periode === "an" ? "annuel" : "5 ans"}`,
        }),
      });
      const d = await r.json();
      if (d.paymentUrl) window.location.href = d.paymentUrl;
      else alert(d.message || "Impossible de lancer le paiement.");
    } catch { alert("Erreur de connexion."); }
    finally { setPayGILoading(false); }
  }

  // ─── NAVIGATION VERS GESTION EXTERNE ────────────────────────────────────────

  function ouvrirGestionUrl(path: string, tenantCode: string) {
    const t = localStorage.getItem("token") || "";
    const s = localStorage.getItem("session_user") || "";
    window.location.href = `https://gestions.moftal.com/${path}/${tenantCode}?_t=${encodeURIComponent(t)}&_s=${encodeURIComponent(s)}`;
  }

  async function ouvrirGestion(account: any) {
    if (accesGI && !accesGI.aAcces) {
      alert("Votre essai gratuit est terminé. Achetez l'accès ci-dessous pour continuer.");
      return;
    }
    const info = getTypeInfo(account.type);
    if (account.tenant_code) { ouvrirGestionUrl(info.path, account.tenant_code); return; }
    try {
      const r = await fetch(`/api/professionals/${account.id}/ensure-tenant`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.success && d.tenantCode) ouvrirGestionUrl(info.path, d.tenantCode);
      else alert(d.message || "Impossible d'activer la gestion interne.");
    } catch { alert("Erreur de connexion."); }
  }

  // ─── FONCTIONS PUBLICATION ───────────────────────────────────────────────────

  async function fetchPubs(accountId: string): Promise<any[]> {
    try {
      const r = await fetch(`/api/pro-vitrine/${accountId}/publications`);
      const d = await r.json();
      return d.publications || [];
    } catch { return []; }
  }

  async function openPublishModal(params: { accountId?: string; tenantCode: string; name: string; currentData?: any }) {
    const { tenantCode, name } = params;
    let accountId = params.accountId;

    if (!accountId) {
      // Fetch via tenant code (cas admin sans accountId direct)
      setPublishModal({ accountId: "", tenantCode, name, form: { ...DEFAULT_PUB_FORM }, pubs: [], step: "loading" });
      try {
        const r = await fetch(`/api/pro-vitrine/by-tenant/${tenantCode}/account`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await r.json();
        if (!d.success || !d.account?.id) {
          alert(d.message || "Impossible de récupérer le compte.");
          setPublishModal(null); return;
        }
        accountId = d.account.id;
      } catch { alert("Erreur de connexion."); setPublishModal(null); return; }
    }

    const pubs = await fetchPubs(accountId);
    setPublishModal({ accountId, tenantCode, name, form: { ...DEFAULT_PUB_FORM }, pubs, step: "ready" });
  }

  async function submitPublication() {
    if (!publishModal?.accountId || !publishModal.form.titre.trim()) return;
    setPublishModal(prev => prev ? { ...prev, step: "saving" } : null);
    try {
      const r = await fetch(`/api/pro-vitrine/${publishModal.accountId}/publications`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(publishModal.form)
      });
      const d = await r.json();
      if (d.success) {
        const pubs = await fetchPubs(publishModal.accountId);
        setPublishModal(prev => prev ? { ...prev, step: "ready", form: { ...DEFAULT_PUB_FORM }, pubs } : null);
      } else {
        alert(d.message || "Erreur lors de la publication.");
        setPublishModal(prev => prev ? { ...prev, step: "ready" } : null);
      }
    } catch { alert("Erreur de connexion."); setPublishModal(prev => prev ? { ...prev, step: "ready" } : null); }
  }

  async function deletePublication(pubId: string) {
    if (!publishModal?.accountId) return;
    try {
      const r = await fetch(`/api/pro-vitrine/${publishModal.accountId}/publications/${pubId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.success) setPublishModal(prev => prev ? { ...prev, pubs: prev.pubs.filter(p => p.id !== pubId) } : null);
      else alert(d.message || "Erreur lors de la suppression.");
    } catch { alert("Erreur de connexion."); }
  }

  // ─── FONCTIONS PROFIL ────────────────────────────────────────────────────────

  function openProfilModal(params: { accountId: string; tenantCode: string; name: string; currentData?: any }) {
    const { accountId, tenantCode, name, currentData } = params;
    setProfilModal({
      accountId, tenantCode, name,
      form: {
        name:        currentData?.name        || name,
        description: currentData?.description || "",
        address:     currentData?.address     || "",
        city:        currentData?.city        || "",
        phone:       currentData?.phone       || "",
        email:       currentData?.email       || "",
        photo:       currentData?.photo       || "",
      },
      step: "ready"
    });
  }

  async function submitProfil() {
    if (!profilModal?.accountId) return;
    setProfilModal(prev => prev ? { ...prev, step: "saving" } : null);
    try {
      const r = await fetch(`/api/pro-vitrine/${profilModal.accountId}/publish-info`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(profilModal.form)
      });
      const d = await r.json();
      if (d.success) {
        // Mettre à jour le nom dans la liste locale si propriétaire
        if (!userIsAdmin) {
          setAccounts(prev => prev.map(a => a.id === profilModal.accountId ? { ...a, name: profilModal.form.name } : a));
        }
        setProfilModal(null);
      } else {
        alert(d.message || "Erreur lors de la mise à jour du profil.");
        setProfilModal(prev => prev ? { ...prev, step: "ready" } : null);
      }
    } catch { alert("Erreur de connexion."); setProfilModal(prev => prev ? { ...prev, step: "ready" } : null); }
  }

  // ─── RENDU CHARGEMENT ────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", minHeight:300 }}>
      <div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTopColor:"#1a8f1a", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ─── SOUS-COMPOSANTS LOCAUX ──────────────────────────────────────────────────

  const BandeauAcces = () => {
    if (userIsAdmin || !accesGI?.aAcces) return null;
    if (accesGI.mode === "vie") return (
      <div style={{ background:"#f0fdf0", border:"1px solid #86efac", borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>♾️</span>
        <p style={{ margin:0, fontSize:13, color:"#0f4b0f", fontWeight:700 }}>
          Gestion Interne à vie — Visibilité + Rendez-vous + Gestion complète, débloqués définitivement.
        </p>
      </div>
    );
    if (accesGI.mode === "essai") return (
      <div style={{ background:"#eff6ff", border:"1px solid #93c5fd", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⏳</span>
            <div>
              <p style={{ margin:0, fontSize:13, color:"#1e40af", fontWeight:700 }}>
                Essai gratuit Gestion Interne — <strong>{accesGI.joursRestants} jour{accesGI.joursRestants > 1 ? "s" : ""}</strong> restant{accesGI.joursRestants > 1 ? "s" : ""}
              </p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:"#3b82f6" }}>
                Inclut : Visibilité + Rendez-vous + Gestion complète
              </p>
            </div>
          </div>
          <button onClick={() => setShowPaywall(v => !v)} disabled={payGILoading}
            style={{ padding:"7px 14px", background:"#2563eb", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
            {payGILoading ? "..." : "Voir les formules"}
          </button>
        </div>
      </div>
    );
    if (accesGI.mode === "paye") return (
      <div style={{ background:"#f0fdf0", border:"1px solid #86efac", borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>✅</span>
        <div>
          <p style={{ margin:0, fontSize:13, color:"#0f4b0f", fontWeight:700 }}>
            Gestion Interne active — {accesGI.joursRestants} jour{accesGI.joursRestants > 1 ? "s" : ""} restant{accesGI.joursRestants > 1 ? "s" : ""}
          </p>
          <p style={{ margin:"2px 0 0", fontSize:11, color:"#16a34a" }}>Visibilité + Rendez-vous + Gestion complète inclus</p>
        </div>
      </div>
    );
    return null;
  };

  const OffreVie = () => (
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
            { periode: "mois"    as const, label: "Mensuel", prix: accesGI?.prixMois },
            { periode: "an"      as const, label: "Annuel",  prix: accesGI?.prixAn,      badge: "2 mois offerts" },
            { periode: "cinqAns" as const, label: "5 ans",   prix: accesGI?.prixCinqAns, badge: "1 an offert"    },
          ]).map(opt => (
            <button key={opt.periode} onClick={() => payerGestionInterne(opt.periode)} disabled={payGILoading}
              style={{ width:"100%", padding:"12px 16px", background:"white", color:"#1e3a5f", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:800, opacity: payGILoading ? 0.6 : 1, display:"flex", justifyContent:"space-between", alignItems:"center", transition:"opacity 0.15s", boxSizing:"border-box" }}>
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
            onClick={() => navigate("/mes-comptes-pro")}
            style={{ background:"none", border:"none", color:"#2563eb", fontWeight:700, cursor:"pointer", fontSize:12, textDecoration:"underline", padding:0 }}>
            Mes comptes pro
          </button>{" "}
          propose la formule Visibilité + Rendez-vous (moins cher, sans la gestion interne).
        </p>
      </div>
    </div>
  );

  const defaultTab: "pro" | "activite" = "activite";
  const tab = tabOverride ?? defaultTab;

  const TabButtons = () => (
    <div style={{ marginBottom:16 }}>
      {tab === "activite" ? (
        <h2 style={{ margin:0, padding:"10px 0", fontSize:18, fontWeight:800, color:"#0f172a", display:"flex", alignItems:"center", gap:8 }}>
          Activité
        </h2>
      ) : (
        <button onClick={() => setTabOverride("activite")}
          style={{ width:"100%", padding:"12px 0", borderRadius:10, border:"2px solid transparent", cursor:"pointer", fontSize:14, fontWeight:800, background:"#f1f5f9", color:"#475569" }}>
          Activité
        </button>
      )}
    </div>
  );

  // ─── VUE ADMIN ───────────────────────────────────────────────────────────────

  if (userIsAdmin) {
    const realTenants = adminTenants.filter((t: any) => !t.tenant_code?.startsWith("DEMO-REF-"));
    const tenantsByType: Record<string, any[]> = {};
    realTenants.forEach((t: any) => {
      if (!tenantsByType[t.type]) tenantsByType[t.type] = [];
      tenantsByType[t.type].push(t);
    });
    const totalReal = realTenants.length;

    const GESTION_SERVICES = [
      { type: "clinic",          label: "Clinique / Hôpital",         emoji: "🏥", gradient: "linear-gradient(135deg,#1a8f1a,#1a8f1a)",   border: "#bbf7bb", bgLight: "#f0fdfa", textColor: "#0f4b0f", features: "Patients · Personnel médical · RDV · Ordonnances · Dossiers · Paiements", demoCode: "DEMO-REF-CLIN",  path: "gestion-clinique",     btn: "#1a8f1a", btnH: "#156315" },
      { type: "school",          label: "École / Université",          emoji: "🎓", gradient: "linear-gradient(135deg,#f59e0b,#f97316)",   border: "#fde68a", bgLight: "#fffbeb", textColor: "#92400e", features: "Élèves · Personnel · Classes · Présences · Notes · Frais scolaires",   demoCode: "DEMO-REF-ECO",   path: "gestion-ecole",        btn: "#f59e0b", btnH: "#d97706" },
      { type: "mosque",          label: "Réseau Imam",                 emoji: "🕌", gradient: "linear-gradient(135deg,#156315,#1a8f1a)",   border: "#bbf7bb", bgLight: "#f0fdf0", textColor: "#14532d", features: "Imams · Fidèles · Prédications · Mosquées partenaires · Dons · Coran", demoCode: "DEMO-REF-MSQ",   path: "gestion-mosquee",      btn: "#156315", btnH: "#0f4b0f" },
      { type: "reseau",          label: "Réseau",                      emoji: "🌐", gradient: "linear-gradient(135deg,#1d4ed8,#2563eb)",   border: "#bfdbfe", bgLight: "#eff6ff", textColor: "#1e3a8a", features: "Membres · Projets · Cotisations · Annonces · Événements",           demoCode: "DEMO-REF-RESEAU",path: "gestion-reseau",        btn: "#2563eb", btnH: "#1d4ed8" },
      { type: "madrasa",         label: "Madrasa / Daroul",            emoji: "📖", gradient: "linear-gradient(135deg,#0891b2,#2563eb)",   border: "#a5f3fc", bgLight: "#ecfeff", textColor: "#164e63", features: "Élèves · Enseignants · Cours religieux · Présences · Certificats",  demoCode: "DEMO-REF-MDS",   path: "gestion-madrasa",      btn: "#0891b2", btnH: "#0e7490" },
      { type: "commerce",        label: "Boutique / Commerce",         emoji: "🏪", gradient: "linear-gradient(135deg,#ea580c,#eab308)",   border: "#fed7aa", bgLight: "#fff7ed", textColor: "#7c2d12", features: "Stock · Ventes · Clients · Caisse · Crédits · Fournisseurs",         demoCode: "DEMO-REF-COM",   path: "gestion-commerce",     btn: "#ea580c", btnH: "#c2410c" },
      { type: "enterprise",      label: "Entreprise",                  emoji: "🏢", gradient: "linear-gradient(135deg,#4338ca,#7c3aed)",   border: "#c7d2fe", bgLight: "#eef2ff", textColor: "#312e81", features: "Employés · Clients · Contrats / Projets · Annonces",              demoCode: "DEMO-REF-ENT",   path: "gestion-entreprise",   btn: "#4f46e5", btnH: "#4338ca" },
      { type: "ngo",             label: "ONG & Associations",          emoji: "🤝", gradient: "linear-gradient(135deg,#be123c,#e11d48)",   border: "#fecdd3", bgLight: "#fff1f2", textColor: "#9f1239", features: "Bénévoles · Projets · Collectes de dons · Annonces",             demoCode: "DEMO-REF-NGO",   path: "gestion-ngo",          btn: "#e11d48", btnH: "#be123c" },
      { type: "journalist",      label: "Journalistes / Médias",       emoji: "📰", gradient: "linear-gradient(135deg,#b91c1c,#dc2626)",   border: "#fecaca", bgLight: "#fff1f2", textColor: "#991b1b", features: "Journalistes · Articles · Abonnés · Annonces",                  demoCode: "DEMO-REF-JOUR",  path: "gestion-journaliste",  btn: "#dc2626", btnH: "#b91c1c" },
      { type: "scientist",       label: "Scientifiques",               emoji: "🔬", gradient: "linear-gradient(135deg,#3730a3,#4338ca)",   border: "#c7d2fe", bgLight: "#eef2ff", textColor: "#312e81", features: "Chercheurs · Publications · Projets scientifiques · Annonces",   demoCode: "DEMO-REF-SCIEN", path: "gestion-scientifique", btn: "#4338ca", btnH: "#3730a3" },
      { type: "supplier",        label: "Fournisseurs / Grossistes",   emoji: "🚚", gradient: "linear-gradient(135deg,#0e7490,#0891b2)",   border: "#a5f3fc", bgLight: "#ecfeff", textColor: "#164e63", features: "Produits · Clients / Revendeurs · Commandes · Annonces",          demoCode: "DEMO-REF-FOUR",  path: "gestion-fournisseur",  btn: "#0e7490", btnH: "#0c6072" },
      { type: "security_agency", label: "Agences de Sécurité",         emoji: "🛡️", gradient: "linear-gradient(135deg,#334155,#475569)",   border: "#cbd5e1", bgLight: "#f8fafc", textColor: "#1e293b", features: "Agents · Missions · Clients · Annonces de sécurité",            demoCode: "DEMO-REF-SECU",  path: "gestion-securite",     btn: "#475569", btnH: "#334155" },
      { type: "immobilier",      label: "Immobilier",                  emoji: "🏠", gradient: "linear-gradient(135deg,#92400e,#b45309)",   border: "#fde68a", bgLight: "#fffbeb", textColor: "#78350f", features: "Biens · Locataires · Loyers · Maintenance · Annonces",           demoCode: "DEMO-REF-IMMO",  path: "gestion-immobilier",   btn: "#b45309", btnH: "#92400e" },
      { type: "restaurant",      label: "Restaurant",                  emoji: "🍽️", gradient: "linear-gradient(135deg,#9a3412,#ea580c)",   border: "#fed7aa", bgLight: "#fff7ed", textColor: "#7c2d12", features: "Menu · Tables · Commandes · Équipe · CA du jour",               demoCode: "DEMO-REF-RESTO", path: "gestion-restaurant",   btn: "#ea580c", btnH: "#c2410c" },
      { type: "transport",       label: "Transport & Livraison",       emoji: "🚌", gradient: "linear-gradient(135deg,#1e40af,#1d4ed8)",   border: "#bfdbfe", bgLight: "#eff6ff", textColor: "#1e3a8a", features: "Véhicules · Chauffeurs · Trajets · Réservations · Annonces",      demoCode: "DEMO-REF-TRANS", path: "gestion-transport",    btn: "#1d4ed8", btnH: "#1e40af" },
      { type: "mairie",          label: "Mairie / État Civil",         emoji: "🏛️", gradient: "linear-gradient(135deg,#1e3a8a,#1d4ed8)",   border: "#bfdbfe", bgLight: "#eff6ff", textColor: "#1e3a8a", features: "Mariages · Naissances · Décès · Certificats · Agents",           demoCode: "DEMO-REF-MAIR",  path: "gestion-mairie",       btn: "#1d4ed8", btnH: "#1e3a8a" },
      { type: "vendor",          label: "Vendeur / Détaillant",        emoji: "🛒", gradient: "linear-gradient(135deg,#0e7490,#0891b2)",   border: "#a5f3fc", bgLight: "#ecfeff", textColor: "#164e63", features: "Produits · Ventes journalières · Clients · Dépenses",            demoCode: "DEMO-REF-VENT",  path: "gestion-vendeur",      btn: "#0891b2", btnH: "#0e7490" },
      { type: "producer",        label: "Entreprise de Production",    emoji: "🏭", gradient: "linear-gradient(135deg,#5b21b6,#7c3aed)",   border: "#ddd6fe", bgLight: "#f5f3ff", textColor: "#3b0764", features: "Produits fabriqués · Lots · Commandes · Personnel",              demoCode: "DEMO-REF-PROD",  path: "gestion-producer",     btn: "#7c3aed", btnH: "#6d28d9" },
      { type: "beauty",          label: "Beauté & Bien-être",          emoji: "💈", gradient: "linear-gradient(135deg,#be185d,#db2777)",   border: "#fbcfe8", bgLight: "#fdf2f8", textColor: "#831843", features: "Services · Rendez-vous · Personnel · Clients · Caisse du jour",  demoCode: "DEMO-REF-BEAU",  path: "gestion-beauty",       btn: "#db2777", btnH: "#be185d" },
      { type: "artisan",         label: "Artisanat & Services",        emoji: "🔧", gradient: "linear-gradient(135deg,#92400e,#d97706)",   border: "#fde68a", bgLight: "#fffbeb", textColor: "#78350f", features: "Interventions · Services · Devis · Clients · Annonces",          demoCode: "DEMO-REF-ARTI",  path: "gestion-artisan",      btn: "#d97706", btnH: "#b45309" },
    ];

    return (
      <>
        <div style={{ maxWidth:1000, margin:"0 auto", padding:"6px 20px" }}>
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

          <TabButtons />

          {tab === "pro" && <>
            {/* Header Super Admin */}
            <div style={{ background:"linear-gradient(135deg,#1d4ed8,#4f46e5)", borderRadius:16, padding:"22px 28px", marginBottom:36, display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ fontSize:40 }}>👑</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, color:"white", fontSize:18 }}>Espace Administrateur</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", marginTop:4 }}>
                  {GESTION_SERVICES.length} services · {totalReal} établissement{totalReal !== 1 ? "s" : ""} enregistré{totalReal !== 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"10px 18px", textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:800, color:"white" }}>{totalReal}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)" }}>actifs</div>
              </div>
              <button onClick={() => navigate(-1 as any)} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"1px solid rgba(255,255,255,0.3)", borderRadius:10, padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:600, whiteSpace:"nowrap" }}>← Retour</button>
            </div>

            {/* Actions rapides admin */}
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:28 }}>
              <button onClick={() => navigate("/admin/retraits")}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 20px", background:"white", border:"2px solid #059669", borderRadius:14, cursor:"pointer", fontWeight:700, color:"#059669", fontSize:14, boxShadow:"0 2px 8px rgba(5,150,105,0.12)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ecfdf5"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "white"; }}>
                <span style={{ fontSize:22 }}>💳</span>
                <div style={{ textAlign:"left" }}>
                  <div>Retraits cliniques</div>
                  <div style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>Approuver / refuser les demandes</div>
                </div>
              </button>
              <button onClick={() => navigate("/admin")}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 20px", background:"white", border:"2px solid #6366f1", borderRadius:14, cursor:"pointer", fontWeight:700, color:"#6366f1", fontSize:14, boxShadow:"0 2px 8px rgba(99,102,241,0.12)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#eef2ff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "white"; }}>
                <span style={{ fontSize:22 }}>🛡️</span>
                <div style={{ textAlign:"left" }}>
                  <div>Tableau de bord</div>
                  <div style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>Modération et paramètres</div>
                </div>
              </button>
            </div>

            {/* Section 1 : Espaces de référence */}
            <div style={{ marginBottom:40 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width:4, height:24, background:"#1a8f1a", borderRadius:2 }} />
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:"#0f172a" }}>Professionnel — {GESTION_SERVICES.length} espaces de référence</h2>
              </div>
              <p style={{ margin:"0 0 20px 14px", fontSize:13, color:"#64748b" }}>
                Chaque espace vous appartient exclusivement. Identique à ce que voit un établissement client après abonnement.
              </p>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:18 }}>
                {GESTION_SERVICES.map((svc, i) => {
                  const realList = tenantsByType[svc.type] || [];
                  const vitrinePath = ADMIN_SERVICES.find(a => a.type === svc.type)?.vitrinePath || "";
                  return (
                    <div key={svc.type} style={{ borderRadius:16, overflow:"hidden", boxShadow:"0 3px 14px rgba(0,0,0,0.09)", border:`1px solid ${svc.border}`, animation:`fadeIn 0.2s ease ${i * 0.07}s both` }}>
                      {/* Header gradient */}
                      <div style={{ background:svc.gradient, padding:"18px 20px", display:"flex", alignItems:"center", gap:14 }}>
                        <span style={{ fontSize:38 }}>{svc.emoji}</span>
                        <div style={{ color:"white" }}>
                          <div style={{ fontWeight:800, fontSize:15 }}>{svc.label} Référence Admin</div>
                          <div style={{ fontSize:11, opacity:0.8, marginTop:3 }}>Code : {svc.demoCode} · Espace de référence</div>
                        </div>
                      </div>
                      {/* Features */}
                      <div style={{ background:svc.bgLight, padding:"10px 20px", fontSize:12, color:svc.textColor, borderBottom:`1px solid ${svc.border}`, fontWeight:500 }}>
                        {svc.features}
                      </div>
                      {/* Body */}
                      <div style={{ background:"white", padding:"16px 20px" }}>
                        {realList.length > 0 && (
                          <div style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>
                            <strong style={{ color:svc.btn }}>{realList.length}</strong> établissement{realList.length > 1 ? "s" : ""} inscrit{realList.length > 1 ? "s" : ""}
                          </div>
                        )}
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => navigate(`/${svc.path}/${svc.demoCode}`)}
                            style={{ flex:1, padding:"11px 0", background:svc.btn, color:"white", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = svc.btnH; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = svc.btn; }}>
                            Ouvrir →
                          </button>
                          {vitrinePath && (
                            <button onClick={() => navigate(`/${vitrinePath}/${svc.demoCode}`)}
                              style={{ padding:"11px 14px", background:"white", color:svc.btn, border:`1.5px solid ${svc.btn}`, borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13 }}
                              title="Voir le site public vitrine">
                              🌐
                            </button>
                          )}
                        </div>
                        {/* Établissements réels avec actions rapides */}
                        {realList.length > 0 && (
                          <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:5 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>Établissements réels</div>
                            {realList.slice(0, 3).map((t: any) => (
                              <div key={t.tenant_code} style={{ background:svc.bgLight, border:`1px solid ${svc.border}`, borderRadius:8, overflow:"hidden" }}>
                                <button onClick={() => navigate(`/${svc.path}/${t.tenant_code}`)}
                                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"transparent", border:"none", cursor:"pointer", fontSize:12, width:"100%", textAlign:"left" }}>
                                  <span style={{ fontWeight:600, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>
                                  <span style={{ color:svc.btn, fontWeight:700, flexShrink:0, marginLeft:8 }}>Ouvrir ›</span>
                                </button>
                                {t.professional_account_id && (
                                  <div style={{ borderTop:`1px solid ${svc.border}`, padding:"6px 12px", display:"flex", gap:6 }}>
                                    <button onClick={() => openPublishModal({ accountId: t.professional_account_id, tenantCode: t.tenant_code, name: t.name })}
                                      style={{ flex:1, padding:"5px 0", background:svc.btn, color:"white", border:"none", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700 }}>
                                      Publier
                                    </button>
                                    <button onClick={() => openProfilModal({ accountId: t.professional_account_id, tenantCode: t.tenant_code, name: t.name, currentData: t })}
                                      style={{ flex:1, padding:"5px 0", background:"white", color:svc.btn, border:`1px solid ${svc.btn}`, borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700 }}>
                                      Profil
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {realList.length > 3 && <div style={{ fontSize:11, color:"#94a3b8", textAlign:"center" }}>+{realList.length - 3} autre{realList.length - 3 > 1 ? "s" : ""}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2 : Tous les établissements réels */}
            {totalReal > 0 && (
              <>
                <div style={{ borderTop:"2px solid #f1f5f9", paddingTop:28, marginBottom:16 }}>
                  <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#0f172a" }}>Tous les établissements ({totalReal})</h2>
                  <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Publier, modifier le profil ou accéder à la gestion de chaque établissement</p>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {realTenants.map((t: any, i: number) => {
                    const info = getTypeInfo(t.type);
                    return (
                      <div key={t.tenant_code} style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", animation:`fadeIn 0.15s ease ${i * 0.03}s both`, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                        {/* Ligne principale */}
                        <button onClick={() => navigate(`/${info.path}/${t.tenant_code}`)}
                          style={{ display:"flex", alignItems:"center", gap:14, width:"100%", textAlign:"left", padding:"13px 16px", cursor:"pointer", background:"transparent", border:"none" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <div style={{ width:38, height:38, borderRadius:8, background:info.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{info.emoji}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, color:"#0f172a", fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</div>
                            <div style={{ display:"flex", gap:6, marginTop:2, flexWrap:"wrap" }}>
                              <span style={{ padding:"1px 8px", background:info.bg, color:info.color, borderRadius:20, fontSize:11, fontWeight:600 }}>{info.label}</span>
                              {t.tenant_code && <span style={{ fontFamily:"monospace", fontSize:11, color:"#94a3b8" }}>{t.tenant_code}</span>}
                              {t.owner_numero_h && <span style={{ fontFamily:"monospace", fontSize:10, background:"#f1f5f9", color:"#64748b", padding:"1px 6px", borderRadius:4 }}>{t.owner_numero_h}</span>}
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                            {info.vitrinePath && (
                              <span onClick={e => { e.stopPropagation(); navigate(`/${info.vitrinePath}/${t.tenant_code}`); }}
                                style={{ padding:"4px 10px", background:"#f0fdf0", color:"#1a8f1a", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", border:"1px solid #bbf7bb" }}>
                                Vitrine
                              </span>
                            )}
                            <div style={{ color:info.color, fontSize:13, fontWeight:700 }}>Ouvrir ›</div>
                          </div>
                        </button>

                        {/* Pied de carte : actions admin */}
                        <div style={{ borderTop:"1px solid #f1f5f9", padding:"8px 16px", background:"#fafbfc", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                          {t.professional_account_id ? (
                            <>
                              <button onClick={() => openPublishModal({ accountId: t.professional_account_id, tenantCode: t.tenant_code, name: t.name })}
                                style={{ padding:"6px 14px", background:"#2563eb", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                                Nouvelle publication
                              </button>
                              <button onClick={() => openProfilModal({ accountId: t.professional_account_id, tenantCode: t.tenant_code, name: t.name, currentData: t })}
                                style={{ padding:"6px 14px", background:"#f0fdf4", color:"#059669", border:"1.5px solid #a7f3d0", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                                Modifier le profil
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize:12, color:"#94a3b8" }}>Aucun compte professionnel lié</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>}
        </div>

        {tab === "activite" && <Activite embedded />}

        {/* Modals */}
        {publishModal && (
          <PublierModal
            modal={publishModal}
            token={token}
            onChange={form => setPublishModal(prev => prev ? { ...prev, form } : null)}
            onSubmit={submitPublication}
            onDelete={deletePublication}
            onClose={() => setPublishModal(null)}
          />
        )}
        {profilModal && (
          <ProfilModalComp
            modal={profilModal}
            onChange={form => setProfilModal(prev => prev ? { ...prev, form } : null)}
            onSubmit={submitProfil}
            onClose={() => setProfilModal(null)}
          />
        )}
      </>
    );
  }

  // ─── VUE PROPRIÉTAIRE ────────────────────────────────────────────────────────

  const filtered = accounts.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.tenant_code?.toLowerCase().includes(search.toLowerCase())
  );

  const sansAcces = accounts.length > 0 && accesGI && !accesGI.aAcces;

  let espacePro: { emoji: string; titre: string; desc: string; label: string; onClick: () => void };
  if (accounts.length === 0) {
    espacePro = {
      emoji: "💼", titre: "Espace Pro",
      desc: "Inscrivez-vous comme professionnel pour ouvrir votre espace de gestion.",
      label: "Créer un compte pro",
      onClick: () => navigate("/inscription-pro"),
    };
  } else if (sansAcces) {
    espacePro = {
      emoji: "🔒", titre: "Espace Pro",
      desc: "Votre essai gratuit est terminé. Débloquez l'accès pour continuer.",
      label: "Débloquer mon Espace Pro",
      onClick: () => setShowPaywall(v => !v),
    };
  } else if (accounts.length === 1) {
    espacePro = {
      emoji: "📊", titre: "Espace Pro",
      desc: accounts[0].name || "",
      label: "Ouvrir la gestion complète",
      onClick: () => ouvrirGestion(accounts[0]),
    };
  } else {
    espacePro = {
      emoji: "📊", titre: "Espace Pro",
      desc: `${accounts.length} établissements`,
      label: "Mes espaces pro",
      onClick: () => document.getElementById("mes-espaces-pro-liste")?.scrollIntoView({ behavior: "smooth" }),
    };
  }

  return (
    <div>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"4px 20px 0" }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ borderTop:"1.5px solid #e2e8f0", marginBottom:16 }} />

        <TabButtons />

        {tab === "pro" && <>
          {/* Bandeau Espace Pro */}
          <div style={{ background:"linear-gradient(135deg,#1a8f1a,#156315)", borderRadius:14, padding:"18px 22px", marginBottom:12, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:32 }}>{espacePro.emoji}</div>
              <div>
                <div style={{ color:"white", fontWeight:800, fontSize:16 }}>{espacePro.titre}</div>
                <div style={{ color:"rgba(255,255,255,0.85)", fontSize:13, marginTop:2 }}>{espacePro.desc}</div>
              </div>
            </div>
            <button onClick={espacePro.onClick}
              style={{ padding:"10px 18px", background:"white", color:"#156315", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:800, whiteSpace:"nowrap" }}>
              {espacePro.label}
            </button>
          </div>

          {showPaywall && sansAcces && <OffreVie />}
          <BandeauAcces />

          {/* Liste des comptes — toujours visible dès qu'il y en a */}
          {accounts.length > 0 && (
            <div id="mes-espaces-pro-liste" style={{ marginBottom:16 }}>
              {accounts.length > 1 && (
                <h2 style={{ margin:"0 0 10px", fontSize:15, fontWeight:800, color:"#0f172a" }}>Mes espaces de gestion</h2>
              )}

              {accounts.length > 4 && (
                <div style={{ position:"relative", marginBottom:12 }}>
                  <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                    style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"9px 12px 9px 34px", fontSize:13, outline:"none", boxSizing:"border-box" }} />
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {filtered.map((a: any, i: number) => {
                  const info = getTypeInfo(a.type);
                  // Bloqué = rien ne fonctionne. Sinon, accès complet si essai/abonnement valide.
                  const estBloque = a.subscriptionStatus === 'blocked';
                  const peutGerer = !estBloque && (!accesGI || accesGI.aAcces);
                  return (
                    <div key={a.tenant_code || a.id} style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", animation:`fadeIn 0.2s ease ${i * 0.05}s both`, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
                      {/* Ligne principale */}
                      <button onClick={() => ouvrirGestion(a)}
                        style={{ display:"flex", alignItems:"center", gap:16, width:"100%", textAlign:"left", padding:"16px 20px", cursor:"pointer", background:"transparent", border:"none", transition:"background 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <div style={{ width:44, height:44, borderRadius:10, background:info.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{info.emoji}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, color:"#0f172a", fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3, flexWrap:"wrap" }}>
                            <span style={{ padding:"1px 8px", background:info.bg, color:info.color, borderRadius:20, fontSize:11, fontWeight:600 }}>{info.label}</span>
                            {a.subscriptionStatus === 'blocked' && (
                              <span style={{ padding:"1px 8px", background:"#fef2f2", color:"#dc2626", borderRadius:20, fontSize:11, fontWeight:700 }}>Compte bloqué</span>
                            )}
                            {a.subscriptionStatus === 'overdue' && (
                              <span style={{ padding:"1px 8px", background:"#fffbeb", color:"#b45309", borderRadius:20, fontSize:11, fontWeight:600 }}>Abonnement expiré</span>
                            )}
                            {a.subscriptionStatus === 'never_paid' && !accesGI?.aAcces && (
                              <span style={{ padding:"1px 8px", background:"#fffbeb", color:"#b45309", borderRadius:20, fontSize:11, fontWeight:600 }}>Essai terminé</span>
                            )}
                            {a.tenant_code && <span style={{ fontFamily:"monospace", fontSize:11, color:"#94a3b8" }}>{a.tenant_code}</span>}
                          </div>
                        </div>
                        <div style={{ color:info.color, fontSize:13, fontWeight:600, flexShrink:0 }}>Gérer ›</div>
                      </button>

                      {/* Pied de carte : toutes les actions */}
                      <div style={{ borderTop:"1px solid #f1f5f9", padding:"8px 20px", background:"#fafbfc" }}>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                          {info.vitrinePath && (
                            <button onClick={() => navigate(`/${info.vitrinePath}/${a.tenant_code}`)}
                              style={{ padding:"6px 14px", background:info.color, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                              Voir le site client
                            </button>
                          )}
                          {peutGerer && a.id && (
                            <>
                              <button onClick={() => openPublishModal({ accountId: a.id, tenantCode: a.tenant_code, name: a.name })}
                                style={{ padding:"6px 14px", background:"#2563eb", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                                Nouvelle publication
                              </button>
                              <button onClick={() => openProfilModal({ accountId: a.id, tenantCode: a.tenant_code, name: a.name, currentData: a })}
                                style={{ padding:"6px 14px", background:"#f0fdf4", color:"#059669", border:"1.5px solid #a7f3d0", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                                Modifier le profil
                              </button>
                            </>
                          )}
                          <button onClick={() => setConnectModal({ accountId: a.id, name: a.name })}
                            style={{ padding:"6px 14px", background:"#f8fafc", color:"#475569", border:"1.5px solid #e2e8f0", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, marginLeft:"auto" }}>
                            Connecter un client
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>}
      </div>

      {tab === "activite" && <Activite embedded />}

      {/* Modal connecter client */}
      {connectModal && (
        <AddPersonModal
          title={`Connecter un client — ${connectModal.name}`}
          onSelect={async (numeroH) => {
            try {
              const r = await fetch(`/api/professionals/${connectModal.accountId}/connect-client`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ clientNumeroH: numeroH })
              });
              const d = await r.json();
              alert(d.message || (d.success ? "Client connecté avec succès !" : "Erreur lors de la connexion."));
            } catch { alert("Erreur de connexion au serveur."); }
            setConnectModal(null);
          }}
          onClose={() => setConnectModal(null)}
          myNumeroH={currentUser?.numeroH}
          myPrenom={currentUser?.prenom}
          myNom={currentUser?.nomFamille}
        />
      )}

      {/* Modals publication et profil */}
      {publishModal && (
        <PublierModal
          modal={publishModal}
          token={token}
          onChange={form => setPublishModal(prev => prev ? { ...prev, form } : null)}
          onSubmit={submitPublication}
          onDelete={deletePublication}
          onClose={() => setPublishModal(null)}
        />
      )}
      {profilModal && (
        <ProfilModalComp
          modal={profilModal}
          onChange={form => setProfilModal(prev => prev ? { ...prev, form } : null)}
          onSubmit={submitProfil}
          onClose={() => setProfilModal(null)}
        />
      )}
    </div>
  );
}
