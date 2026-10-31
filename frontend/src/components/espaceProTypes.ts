// Constantes de l'Espace Pro partagées entre la page « Activité » (GestionInterne)
// et le panneau « Espace Pro » d'une gestion interne.

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
  { type: "lawyer",          demoCode: "DEMO-REF-JURI",   label: "Avocats / Cabinets",         emoji: "⚖️", color: "#7f1d1d", bg: "#fef2f2", path: "gestion-juridique",     vitrinePath: "juridique-vitrine", reseauPath: "" },
  { type: "legal_advisor",   demoCode: "DEMO-REF-JURI",   label: "Conseil juridique",          emoji: "📜", color: "#7f1d1d", bg: "#fef2f2", path: "gestion-juridique",     vitrinePath: "juridique-vitrine", reseauPath: "" },
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

// Types enregistrés sous un autre nom que celui du modèle de gestion
const ALIAS_TYPES: Record<string, string> = { imam: "mosque", immobilier: "broker", immo: "broker", retailer: "vendor" };

export function getTypeInfo(type: string) {
  const t = ALIAS_TYPES[type] || type;
  const found = ADMIN_SERVICES.find(s => s.type === t);
  if (found) return { label: found.label, path: found.path, vitrinePath: found.vitrinePath || "", color: found.color, bg: found.bg, emoji: found.emoji };
  return { label: type || "Service", path: "gestion-commerce", vitrinePath: "", color: "#64748b", bg: "#f8fafc", emoji: "🏢" };
}
