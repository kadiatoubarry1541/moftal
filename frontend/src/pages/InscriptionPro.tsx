import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PRO_TYPES = [
  { id: "clinic",          label: "Clinique / Hôpital",              icon: "🏥", desc: "Recevez et gérez les rendez-vous des patients" },
  { id: "health_worker",   label: "Médecin / Agent de santé",        icon: "👨‍⚕️", desc: "Publiez vos consultations et services médicaux individuels" },
  { id: "school",          label: "École / Établissement",           icon: "🏫", desc: "Gérez élèves, notes, bulletins, frais et membres" },
  { id: "mosque",          label: "Mosquée / Madrasa",               icon: "🕌", desc: "Registre fidèles, dons/zakat, annonces, élèves Coran" },
  { id: "madrasa",         label: "Formation Religieuse",            icon: "📖", desc: "Daroul, médersa, franco-arabe — élèves, bulletins, frais" },
  { id: "commerce",        label: "Commerce / Boutique",             icon: "🛒", desc: "Stock, ventes journalières, clients, crédits, caisse" },
  { id: "security_agency", label: "Agent / Agence de sécurité",      icon: "🛡️", desc: "Police, gendarmerie, pompiers ou agent privé — proposez vos services" },
  { id: "journalist",      label: "Journaliste",                     icon: "📰", desc: "Publiez des informations sur Terre Adam" },
  { id: "enterprise",      label: "Membre publiant (outils/opportunités)", icon: "🏢", desc: "Partagez des outils de travail ou des opportunités sur Activité" },
  { id: "restaurant",      label: "Restaurant",                      icon: "🍽️", desc: "Publiez votre menu, recevez des commandes et appels directs" },
  { id: "vendor",          label: "Vendeur",                         icon: "🛒", desc: "Vente directe de produits (primaire, secondaire, tertiaire)" },
  { id: "supplier",        label: "Fournisseur / Grossiste",         icon: "📦", desc: "Approvisionnement et gros pour les autres vendeurs" },
  { id: "producer",        label: "Entreprise de production",        icon: "🏭", desc: "Production / transformation de biens pour les échanges" },
  { id: "broker",          label: "Démarcheur / Location de maison", icon: "🏘️", desc: "Mise en relation pour location de maisons et biens tertiaires" },
  { id: "scientist",       label: "Chercheur / Scientifique",        icon: "🔬", desc: "Partagez vos travaux et publications" },
  { id: "ngo",             label: "ONG / Association",               icon: "🤝", desc: "Gérez vos projets humanitaires et bénévoles" },
  { id: "transport",       label: "Transport & Livraison",           icon: "🚗", desc: "Taxi, moto, camion ou livraison à domicile" },
  { id: "beauty",          label: "Beauté & Bien-être",              icon: "💈", desc: "Salon de coiffure, spa, institut de beauté" },
  { id: "artisan",         label: "Artisanat & Services",            icon: "🔧", desc: "Plombier, électricien, menuisier, soudeur, maçon" },
  { id: "mairie",          label: "Mairie / État Civil",             icon: "🏛️", desc: "Gérez les mariages, naissances, décès et certificats de résidence" },
  { id: "reseau",          label: "Association / Réseau",            icon: "🌐", desc: "Association, comité, groupe communautaire — membres, projets, cotisations" },
];

const PRO_TYPE_INFO: Record<string, { expect: string; page: string }> = {
  clinic: {
    expect: "Nous attendons que vous proposiez des soins ou services médicaux (consultations, urgences, spécialités) et que vous acceptiez les demandes de rendez-vous des utilisateurs.",
    page: "Vous serez visible et publié sur la page **Santé** : les utilisateurs pourront vous trouver, voir vos services et prendre rendez-vous avec vous.",
  },
  health_worker: {
    expect: "Nous attendons que vous proposiez des consultations ou des soins médicaux (médecine générale, spécialités, sage-femme, infirmier…) et que vous acceptiez les rendez-vous des patients.",
    page: "Vous serez visible sur la page **Santé** (section Médecins) : les patients pourront trouver votre profil et prendre rendez-vous directement.",
  },
  security_agency: {
    expect: "Nous attendons que vous proposiez des services de sécurité adaptés à votre corps (surveillance, gardiennage, protection, secours) et que vous répondiez aux demandes de la communauté.",
    page: "Vous serez visible et publié sur la page **Sécurité** dans la section correspondant à votre type (policier, gendarme, pompier ou agent privé).",
  },
  journalist: {
    expect: "Nous attendons que vous publiiez des informations, reportages ou actualités utiles à la communauté, dans le respect de l'éthique et des faits.",
    page: "Vous serez visible et publié sur la page **Terre ADAM** (section Lieux / informations) : vos contenus pourront être diffusés aux utilisateurs de la plateforme.",
  },
  enterprise: {
    expect: "Nous attendons que vous proposiez des outils, services ou produits pour le travail et l'activité professionnelle (formations, conseil, équipements, etc.).",
    page: "Vous serez visible et publié sur la page **Activité** : les utilisateurs pourront découvrir vos offres et vous contacter ou prendre rendez-vous.",
  },
  school: {
    expect: "Nous attendons que vous proposiez des formations, cours ou accompagnement pédagogique et que vous gériez les demandes de rendez-vous ou d'inscription des utilisateurs.",
    page: "Vous serez visible et publié sur la page **Éducation** : les utilisateurs pourront voir vos formations et prendre rendez-vous ou s'inscrire à vos cours.",
  },
  restaurant: {
    expect: "Nous attendons que vous publiiez votre menu complet (plats, prix, descriptions), vos horaires d'ouverture et que vous soyez joignable par téléphone pour les commandes et réservations.",
    page: "Vous serez visible sur la page **Échanges Primaire** (section Restauration) : les clients pourront voir votre menu, vous appeler directement et passer une commande en précisant le jour et l'heure de récupération.",
  },
  supplier: {
    expect: "Nous attendons que vous proposiez des produits ou services en tant que fournisseur ou grossiste (approvisionnement des vendeurs, contrats réguliers, livraison en quantité).",
    page: "Vous serez visible et publié sur les pages **Échanges** (primaire, secondaire, tertiaire) comme fournisseur/grossiste : les vendeurs et entreprises pourront vous contacter pour s'approvisionner.",
  },
  vendor: {
    expect: "Nous attendons que vous vendiez directement des produits (aliments, vêtements, véhicules, matériaux, etc.) au détail ou en petite quantité, avec des annonces claires et à jour.",
    page: "Vous serez visible et publié dans les niveaux **Échanges Primaire / Secondaire / Tertiaire** selon vos produits, afin que les utilisateurs puissent facilement vous trouver et acheter.",
  },
  producer: {
    expect: "Nous attendons que vous produisiez, transformiez ou fabriquiez des biens (production agricole, ateliers, usines, artisanat organisé) pour les mettre à disposition dans les échanges.",
    page: "Vous serez visible et publié dans les pages **Échanges** en tant qu'entreprise de production, souvent mise en avant en bas des pages pour représenter les structures de production.",
  },
  broker: {
    expect: "Nous attendons que vous mettiez en relation des propriétaires et des locataires (maisons, appartements, biens tertiaires) de manière sérieuse et transparente.",
    page: "Vous serez visible surtout dans la page **Échanges Tertiaire** (location de maisons, biens tertiaires) comme démarcheur / agent, pour aider les utilisateurs à trouver un logement ou un bien à louer.",
  },
  scientist: {
    expect: "Nous attendons que vous partagiez des travaux, publications ou contenus scientifiques validés, dans un langage accessible, pour éclairer la communauté.",
    page: "Vous serez visible et publié sur la page **Science** : les utilisateurs pourront consulter vos contenus et vous contacter pour des échanges ou collaborations.",
  },
  ngo: {
    expect: "Nous attendons que vous présentiez vos projets humanitaires ou solidaires, vos besoins en bénévoles ou en dons, et que vous répondiez aux demandes de la communauté.",
    page: "Vous serez visible et publié sur la page **Solidarité** (onglet ONG) : les utilisateurs pourront découvrir vos actions et prendre rendez-vous ou vous contacter pour participer ou faire un don.",
  },
  transport: {
    expect: "Nous attendons que vous proposiez un service de transport fiable (taxi, moto, camion, livraison) avec vos zones desservies, vos tarifs et vos disponibilités.",
    page: "Vous serez visible sur la page **Transport & Livraison** : les utilisateurs pourront vous contacter, réserver une course ou demander une livraison directement depuis votre espace.",
  },
  beauty: {
    expect: "Nous attendons que vous proposiez vos services de beauté (coiffure, soins, maquillage, massage, spa) avec vos tarifs, vos horaires et vos disponibilités pour les rendez-vous.",
    page: "Vous serez visible sur la page **Beauté & Bien-être** : les clients pourront voir votre catalogue de soins et prendre rendez-vous directement depuis votre espace.",
  },
  artisan: {
    expect: "Nous attendons que vous proposiez vos services artisanaux (plomberie, électricité, menuiserie, maçonnerie, soudure…) avec votre zone d'intervention, vos tarifs et vos disponibilités.",
    page: "Vous serez visible sur la page **Artisanat & Services** : les utilisateurs pourront vous contacter, demander un devis ou prendre rendez-vous pour une intervention.",
  },
  mosque: {
    expect: "Nous attendons que vous teniez un registre actif de vos fidèles, que vous publiiez des annonces (prières, événements, cours Coran) et que vous gériez les collectes de dons et zakat de façon transparente.",
    page: "Votre mosquée disposera d'un **espace de gestion interne** complet : registre des fidèles, madrasa Coran, collecte de dons/zakat, annonces envoyées par notification aux membres inscrits sur la plateforme.",
  },
  commerce: {
    expect: "Nous attendons que vous teniez votre stock à jour, enregistriez vos ventes quotidiennes, suiviez vos créances clients et mainteniez une caisse lisible pour vous et vos employés.",
    page: "Votre boutique disposera d'un **espace de gestion interne** complet : gestion du stock (alertes rupture), ventes journalières, caisse, suivi des crédits clients avec relance, et bilan mensuel simple.",
  },
  reseau: {
    expect: "Nous attendons que vous gériez une association, un comité ou un groupe communautaire organisé, avec des membres cotisants, des projets collectifs et des annonces régulières.",
    page: "Votre réseau disposera d'un **espace de gestion interne** : registre des membres, suivi des cotisations, gestion des projets, annonces visibles sur la plateforme.",
  },
};

const PRO_TYPE_IDS = new Set(PRO_TYPES.map((t) => t.id));

interface MenuItem {
  name: string;
  price: string;
  description: string;
  category: string;
}

const CUISINE_TYPES = [
  "Cuisine africaine", "Cuisine guinéenne", "Cuisine sénégalaise",
  "Cuisine malienne", "Cuisine ivoirienne", "Grillade / Braisé",
  "Fast food", "Cuisine internationale", "Cuisine asiatique",
  "Pizzeria", "Snack / Sandwicherie", "Boulangerie / Pâtisserie", "Autre"
];

const MENU_CATEGORIES = ["Entrée", "Plat principal", "Accompagnement", "Boisson", "Dessert", "Spécialité du jour"];

export default function InscriptionPro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeFromUrl = searchParams.get("type") || "";
  const initialType = typeFromUrl && PRO_TYPE_IDS.has(typeFromUrl) ? typeFromUrl : "";

  const [selectedType, setSelectedType] = useState(initialType);
  const [planType, setPlanType] = useState<'visibility' | 'full' | ''>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", address: "", city: "", country: "",
    phone: "", email: "", website: "", mediaUrl: "", justificatifDocument: "",
    services: "", specialties: "",
  });

  // Vérification du nom uniquement quand l'utilisateur quitte le champ (onBlur)
  type NomStatut = '' | 'checking' | 'disponible' | 'pris';
  const [nomStatut, setNomStatut] = useState<NomStatut>('');

  const verifierNom = async () => {
    const nom = form.name.trim();
    if (!nom || nom.length < 2) { setNomStatut(''); return; }
    setNomStatut('checking');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(
        `http://localhost:5002/api/professionals/verifier-nom?nom=${encodeURIComponent(nom)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await r.json();
      if (!r.ok || d.success === false) {
        setNomStatut('');
      } else {
        setNomStatut(d.disponible === true ? 'disponible' : 'pris');
      }
    } catch {
      setNomStatut('');
    }
  };
  const [subSector, setSubSector] = useState<"primaire" | "secondaire" | "tertiaire" | "">("");
  const [securityType, setSecurityType] = useState<"policier" | "gendarme" | "pompier" | "agent_prive" | "">("");

  const getServicesPlaceholder = () => {
    switch (selectedType) {
      case "security_agency": return "Ex: Gardiennage, Surveillance, Escorte VIP";
      case "health_worker": return "Ex: Consultation générale, Soins, Vaccination";
      case "clinic": return "Ex: Consultations, Urgences, Chirurgie";
      case "school": return "Ex: Maternelle, Primaire, Secondaire";
      case "ngo": return "Ex: Aide alimentaire, Formation, Santé communautaire";
      case "transport": return "Ex: Taxi, Moto, Livraison à domicile";
      case "beauty": return "Ex: Coiffure, Soins du visage, Massage";
      case "artisan": return "Ex: Plomberie, Électricité, Menuiserie";
      default: return "Ex: Services proposés...";
    }
  };

  const getSpecialtiesPlaceholder = () => {
    switch (selectedType) {
      case "security_agency": return "Ex: Sécurité événementielle, Protection de personnalité, Intervention d'urgence";
      case "health_worker": return "Ex: Médecine générale, Pédiatrie, Gynécologie, Cardiologie";
      case "clinic": return "Ex: Cardiologie, Pédiatrie, Gynécologie, Neurologie";
      case "school": return "Ex: Mathématiques, Sciences, Langues, Sport";
      case "scientist": return "Ex: Biologie, Chimie, Physique, Informatique";
      default: return "Ex: Spécialités...";
    }
  };
  const [justificatifFileName, setJustificatifFileName] = useState("");

  // Types Échanges qui nécessitent un sous-secteur
  const NEEDS_SUBSECTOR = ["vendor", "supplier", "producer"];

  // Champs spécifiques restaurant
  const [cuisineType, setCuisineType] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuDraft, setMenuDraft] = useState<MenuItem>({ name: "", price: "", description: "", category: "Plat principal" });

  const addMenuItem = () => {
    if (!menuDraft.name.trim() || !menuDraft.price.trim()) return;
    setMenuItems(prev => [...prev, { ...menuDraft }]);
    setMenuDraft({ name: "", price: "", description: "", category: "Plat principal" });
  };

  const removeMenuItem = (idx: number) => {
    setMenuItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) { setError("Veuillez choisir un type de compte."); return; }
    if (!planType) { setError("Veuillez choisir une formule (Visibilité ou Gestion Interne)."); return; }
    if (!form.name.trim()) { setError("Le nom est requis"); return; }
    if (nomStatut === 'pris') {
      setError(`Le nom "${form.name.trim()}" est déjà utilisé. Veuillez en choisir un autre.`);
      return;
    }
    if (nomStatut === 'checking') {
      setError("Vérification du nom en cours, attendez un instant...");
      return;
    }
    if (NEEDS_SUBSECTOR.includes(selectedType) && !subSector) {
      setError("Veuillez choisir votre niveau d'échanges (primaire, secondaire ou tertiaire).");
      return;
    }
    if (selectedType === "restaurant" && !form.phone.trim()) {
      setError("Le numéro de téléphone est obligatoire pour un restaurant.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      let services: any[] = [];
      let specialties: string[] = [];

      if (selectedType === "restaurant") {
        // Menu stocké dans services (JSON objects)
        services = menuItems.map(m => ({
          name: m.name.trim(),
          price: m.price.trim(),
          description: m.description.trim(),
          category: m.category,
          available: true,
        }));
        // Cuisine + horaires dans specialties
        specialties = [];
        if (cuisineType) specialties.push(`Cuisine: ${cuisineType}`);
        if (openingHours.trim()) specialties.push(`Horaires: ${openingHours.trim()}`);
      } else {
        services = form.services ? form.services.split(",").map(s => s.trim()).filter(Boolean) : [];
        specialties = form.specialties ? form.specialties.split(",").map(s => s.trim()).filter(Boolean) : [];
        // Inclure le type de sécurité dans les spécialités
        if (selectedType === "security_agency" && securityType) {
          const secLabels: Record<string, string> = {
            policier: "👮 Policier",
            gendarme: "👮‍♂️ Gendarme",
            pompier: "🚒 Pompier",
            agent_prive: "🛡️ Agent de Sécurité Privée",
          };
          specialties.unshift(secLabels[securityType] || securityType);
        }
      }

      const res = await fetch("http://localhost:5002/api/professionals/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: selectedType,
          planType,
          subSector: NEEDS_SUBSECTOR.includes(selectedType) ? subSector : (selectedType === "broker" ? "tertiaire" : undefined),
          name: form.name.trim(),
          description: (form.description.trim() || "") + (form.website.trim() ? `\nSite: ${form.website.trim()}` : ""),
          address: form.address.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          photo: form.mediaUrl.trim() || undefined,
          justificatifDocument: form.justificatifDocument.trim() || undefined,
          services,
          specialties,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || "Erreur lors de l'inscription");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 focus:border-orange-400";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Inscription envoyée !</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Votre demande est en attente de validation par l'administrateur.
            Vous recevrez une notification dès qu'elle sera approuvée.
          </p>
          <button onClick={() => navigate("/compte")} className="w-full min-h-[44px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
            Retour à mon espace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => navigate("/compte")} className="min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-colors">
            ← Retour
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Inscription Professionnelle
          </h1>
        </div>

        {/* Bannière 3 mois gratuits */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 text-white shadow-md">
          <div className="text-4xl flex-shrink-0">🎁</div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-lg leading-tight">3 mois gratuits d'essai</div>
            <div className="text-sm text-orange-100 mt-0.5">
              Inscrivez-vous aujourd'hui — aucun paiement requis pour commencer.
              Votre compte sera visible dès validation par l'administration.
            </div>
          </div>
          <div className="flex-shrink-0 bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold">
            Gratuit
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md ring-1 ring-gray-200 dark:ring-gray-700 p-6 sm:p-8">
          {/* Sélection du type */}
          {selectedType ? (
            <div className="mb-6 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Vous vous inscrivez en tant que :</span>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {PRO_TYPES.find((t) => t.id === selectedType)?.icon} {PRO_TYPES.find((t) => t.id === selectedType)?.label}
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <label className={labelCls}>Type de compte *</label>
              <select required value={selectedType} onChange={e => setSelectedType(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                <option value="">Choisir un type...</option>
                {PRO_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          )}

          {selectedType && PRO_TYPE_INFO[selectedType] && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">📋 Ce qu'on attend de vous :</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{PRO_TYPE_INFO[selectedType].expect}</p>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">📍 Où vous serez publié :</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{PRO_TYPE_INFO[selectedType].page.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
            </div>
          )}

          {/* ── Choix de formule ── */}
          {selectedType && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Quelle formule souhaitez-vous ? *</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Option 1 : Visibilité + RDV */}
                <button
                  type="button"
                  onClick={() => setPlanType('visibility')}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    planType === 'visibility'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🌐</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Visibilité + Rendez-vous</span>
                    {planType === 'visibility' && <span className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">✓</span>}
                  </div>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 mt-2">
                    <li>✅ Page vitrine publique</li>
                    <li>✅ Clients peuvent vous trouver</li>
                    <li>✅ Prise de rendez-vous en ligne</li>
                    <li className="text-gray-400">❌ Pas d'outils de gestion interne</li>
                  </ul>
                  <div className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400">Formule de base — incluse</div>
                </button>

                {/* Option 2 : Visibilité + RDV + Gestion Interne */}
                <button
                  type="button"
                  onClick={() => setPlanType('full')}
                  className={`text-left p-4 rounded-2xl border-2 transition-all relative ${
                    planType === 'full'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300'
                  }`}
                >
                  <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">COMPLET</div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🏢</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Visibilité + Gestion Interne</span>
                    {planType === 'full' && <span className="ml-auto w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">✓</span>}
                  </div>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 mt-2">
                    <li>✅ Page vitrine publique</li>
                    <li>✅ Prise de rendez-vous en ligne</li>
                    <li>✅ Tableau de bord complet</li>
                    <li>✅ Gestion stock, clients, personnel…</li>
                  </ul>
                  <div className="mt-3 text-xs font-bold text-orange-600 dark:text-orange-400">3 mois gratuits · puis abonnement</div>
                </button>

              </div>
            </div>
          )}

          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

          {/* ── Champs communs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>
                {selectedType === "restaurant" ? "Nom du restaurant *" : "Nom *"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setNomStatut(''); }}
                  onBlur={verifierNom}
                  className={`${inputCls} ${nomStatut === 'pris' ? 'border-red-400 focus:ring-red-400' : nomStatut === 'disponible' ? 'border-green-400 focus:ring-green-400' : ''}`}
                  placeholder={selectedType === "restaurant" ? "Ex: Restaurant Chez Kadiatou" : "Nom de votre établissement"}
                />
                {nomStatut === 'checking' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {nomStatut === 'pris' && (
                <p className="mt-1 text-sm text-red-600 font-semibold">
                  ❌ Ce nom est déjà utilisé. Choisissez un autre nom.
                </p>
              )}
              {nomStatut === 'disponible' && (
                <p className="mt-1 text-sm text-green-600 font-semibold">
                  ✅ Ce nom est disponible.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400"
                placeholder={selectedType === "restaurant" ? "Décrivez votre restaurant, ambiance, spécialités..." : "Décrivez votre activité..."} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Logo de votre établissement <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                📲 Ce logo sera l'icône de votre app sur les téléphones (le vôtre et celui de vos clients). Carré recommandé. Max 5 Mo.
              </p>
              <input type="file" accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) { setForm(f => ({ ...f, mediaUrl: "" })); return; }
                  if (file.size > 5 * 1024 * 1024) { setError("La photo ne doit pas dépasser 5 Mo."); return; }
                  setError("");
                  const reader = new FileReader();
                  reader.onload = () => setForm(f => ({ ...f, mediaUrl: String(reader.result) }));
                  reader.readAsDataURL(file);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700"
              />
              {form.mediaUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-orange-200 bg-gray-100 flex-shrink-0">
                    <img src={form.mediaUrl} alt="Aperçu logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700">✅ Logo chargé</p>
                    <p className="text-xs text-gray-500">Voici comment votre icône apparaîtra sur l'écran d'accueil</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Adresse</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls}
                placeholder={selectedType === "restaurant" ? "Quartier, rue..." : ""} />
            </div>
            <div>
              <label className={labelCls}>Ville</label>
              <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pays</label>
              <input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                Téléphone {selectedType === "restaurant" && <span className="text-red-500">* (visible par les clients)</span>}
              </label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls}
                placeholder={selectedType === "restaurant" ? "Ex: 620 00 00 00" : ""}
                required={selectedType === "restaurant"} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </div>

            {/* ── Choix du niveau Échanges (primaire / secondaire / tertiaire) ── */}
            {NEEDS_SUBSECTOR.includes(selectedType) && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4">
                <label className="block text-sm font-semibold text-orange-800 dark:text-orange-300 mb-3">
                  Niveau d'échanges * — dans quelle section voulez-vous apparaître ?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { value: "primaire",   icon: "🌾", label: "Primaire",   desc: "Agriculture, alimentation, matières premières" },
                    { value: "secondaire", icon: "🏭", label: "Secondaire",  desc: "Industrie, transformation, fabrication" },
                    { value: "tertiaire",  icon: "🛍️", label: "Tertiaire",   desc: "Services, commerce, distribution" },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setSubSector(opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        subSector === opt.value
                          ? "border-orange-500 bg-orange-100 dark:bg-orange-800/40"
                          : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300"
                      }`}>
                      <div className="text-2xl mb-1">{opt.icon}</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{opt.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {!subSector && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">Veuillez choisir un niveau pour continuer.</p>
                )}
              </div>
            )}

            {/* ── Type de sécurité (policier / gendarme / pompier / agent privé) ── */}
            {selectedType === "security_agency" && (
              <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  Type de service de sécurité *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { value: "policier",    icon: "👮",   label: "Policier" },
                    { value: "gendarme",    icon: "👮‍♂️",  label: "Gendarme" },
                    { value: "pompier",     icon: "🚒",   label: "Pompier" },
                    { value: "agent_prive", icon: "🛡️",   label: "Agent Privé" },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setSecurityType(opt.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        securityType === opt.value
                          ? "border-slate-600 bg-slate-200 dark:bg-slate-700"
                          : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-slate-400"
                      }`}>
                      <div className="text-2xl mb-1">{opt.icon}</div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{opt.label}</div>
                    </button>
                  ))}
                </div>
                {!securityType && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Veuillez choisir votre type de service.</p>
                )}
              </div>
            )}

            {/* ── Champs spécifiques restaurant ── */}
            {selectedType === "restaurant" && (
              <>
                <div>
                  <label className={labelCls}>Type de cuisine *</label>
                  <select value={cuisineType} onChange={e => setCuisineType(e.target.value)}
                    className="w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400">
                    <option value="">— Choisir —</option>
                    {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Horaires d'ouverture</label>
                  <input type="text" value={openingHours} onChange={e => setOpeningHours(e.target.value)} className={inputCls}
                    placeholder="Ex: Lun-Sam 8h-22h, Dim 10h-20h" />
                </div>

                {/* Builder de menu */}
                <div className="sm:col-span-2">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl">
                    <h3 className="font-bold text-orange-800 dark:text-orange-200 mb-4 flex items-center gap-2">
                      🍽️ Menu du restaurant
                      <span className="text-xs font-normal text-orange-600 dark:text-orange-400">({menuItems.length} plat{menuItems.length > 1 ? "s" : ""} ajouté{menuItems.length > 1 ? "s" : ""})</span>
                    </h3>

                    {/* Formulaire d'ajout d'un plat */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du plat *</label>
                        <input type="text" value={menuDraft.name} onChange={e => setMenuDraft(d => ({ ...d, name: e.target.value }))}
                          className="w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 text-sm"
                          placeholder="Ex: Riz sauce arachide" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prix *</label>
                        <input type="text" value={menuDraft.price} onChange={e => setMenuDraft(d => ({ ...d, price: e.target.value }))}
                          className="w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 text-sm"
                          placeholder="Ex: 15 000 GNF" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Catégorie</label>
                        <select value={menuDraft.category} onChange={e => setMenuDraft(d => ({ ...d, category: e.target.value }))}
                          className="w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 text-sm">
                          {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description (optionnel)</label>
                        <input type="text" value={menuDraft.description} onChange={e => setMenuDraft(d => ({ ...d, description: e.target.value }))}
                          className="w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 text-sm"
                          placeholder="Ingrédients, précisions..." />
                      </div>
                    </div>
                    <button type="button" onClick={addMenuItem}
                      disabled={!menuDraft.name.trim() || !menuDraft.price.trim()}
                      className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors">
                      ➕ Ajouter ce plat au menu
                    </button>

                    {/* Liste des plats ajoutés */}
                    {menuItems.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {menuItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-orange-100 dark:border-orange-800">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.name}</span>
                              <span className="mx-2 text-gray-400">·</span>
                              <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">{item.price}</span>
                              <span className="mx-2 text-gray-300">|</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{item.category}</span>
                              {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
                            </div>
                            <button type="button" onClick={() => removeMenuItem(idx)}
                              className="ml-3 text-red-400 hover:text-red-600 font-bold text-lg flex-shrink-0">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {menuItems.length === 0 && (
                      <p className="mt-3 text-sm text-orange-600 dark:text-orange-400 italic">
                        Aucun plat ajouté — ajoutez au moins un plat pour que votre menu soit visible.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Champs communs non-restaurant ── */}
            {selectedType !== "restaurant" && (
              <>
                <div>
                  <label className={labelCls}>Services (séparés par virgule)</label>
                  <input type="text" value={form.services} onChange={e => setForm({ ...form, services: e.target.value })}
                    className={inputCls} placeholder={getServicesPlaceholder()} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Spécialités (séparées par virgule)</label>
                  <input type="text" value={form.specialties} onChange={e => setForm({ ...form, specialties: e.target.value })}
                    className={inputCls} placeholder={getSpecialtiesPlaceholder()} />
                </div>
              </>
            )}

            {/* Justificatif */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Justificatif d'activité (optionnel)</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {selectedType === "restaurant"
                  ? "Autorisation d'exploitation, patente, ou photo du local. PDF ou image. Max 10 Mo."
                  : "Diplôme, agrément, Kbis... PDF ou image. Max 10 Mo. Réservé à l'administrateur."}
              </p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) { setForm(f => ({ ...f, justificatifDocument: "" })); setJustificatifFileName(""); return; }
                  if (file.size > 10 * 1024 * 1024) { setError("Le fichier ne doit pas dépasser 10 Mo."); return; }
                  setError("");
                  const reader = new FileReader();
                  reader.onload = () => setForm(f => ({ ...f, justificatifDocument: String(reader.result) }));
                  reader.readAsDataURL(file);
                  setJustificatifFileName(file.name);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700"
              />
              {justificatifFileName && <p className="mt-1 text-sm text-green-600 dark:text-green-400">Fichier : {justificatifFileName}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Site web (optionnel)</label>
              <input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                className={inputCls} placeholder="https://..." />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className={`mt-6 w-full min-h-[44px] px-6 py-3 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-sm ${
              selectedType === "restaurant" ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"
            }`}>
            {loading ? "Envoi en cours..." : "Envoyer ma demande d'inscription"}
          </button>
        </form>
      </div>
    </div>
  );
}
