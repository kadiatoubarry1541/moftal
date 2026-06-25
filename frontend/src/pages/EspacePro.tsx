import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PaymentModal from "../components/PaymentModal";
import { getSessionUser, isAdmin, getPhotoUrl } from "../utils/auth";
import { ReçuTransaction } from "../components/ReçuTransaction";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";
import { AddPersonModal } from "../components/AddPersonModal";

interface ProAccount {
  id: string;
  type: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  services: any[];
  specialties: string[];
  status: string;
  ownerNumeroH: string;
  subscriptionStatus?: "never_paid" | "active" | "overdue" | "blocked";
  subscriptionValidUntil?: string | null;
  isTrial?: boolean;
  photo?: string | null;
}

interface MenuItem {
  name: string;
  price: string;
  category: string;
  description: string;
}

interface Appointment {
  id: string;
  patientNumeroH: string;
  patientName: string;
  type: "written" | "video";
  appointmentDate: string;
  appointmentTime: string;
  service: string;
  videoUrl: string | null;
  status: string;
  responseMessage: string | null;
  responseVideoUrl: string | null;
  created_at: string;
}

type TabType = "pending" | "history" | "profile" | "menu" | "cours" | "retrait" | "membres";
type HistoryFilter = "all" | "accepted" | "rejected";

/* =============================================
   MAPPING TYPE PROFESSIONNEL → SERVICE
   ============================================= */
const TYPE_TO_SERVICE: Record<string, string> = {
  clinic:           "sante",
  enterprise:       "activite",
  school:           "education",
  scientist:        "science",
  ngo:              "solidarite",
  security_agency:  "securite",
  supplier:         "echanges",
  vendor:           "echanges",
  producer:         "echanges",
  broker:           "immobilier",
  journalist:       "echanges",
  restaurant:       "restauration",
  transport:        "transport",
  beauty:           "beaute",
  artisan:          "artisanat",
  mairie:           "mairie",
  madrasa:          "education",
  mosque:           "solidarite",
  commerce:         "echanges",
};

/* =============================================
   CONFIG VISUELLE PAR SERVICE
   ============================================= */
interface ServiceCfg {
  label: string;
  icon: string;
  bgGradient: string;
  accentBorder: string;
  lightBg: string;
  darkBg: string;
  textAccent: string;
  badgeBg: string;
  btnPrimary: string;
  statCardBg: string;
  tabActive: string;
  ringColor: string;
  welcomeMsg: string;
}

const SERVICE_CONFIG: Record<string, ServiceCfg> = {
  sante: {
    label: "Santé",
    icon: "🏥",
    bgGradient: "from-emerald-600 to-teal-700",
    accentBorder: "border-emerald-500",
    lightBg: "bg-emerald-50",
    darkBg: "dark:bg-emerald-900/20",
    textAccent: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    btnPrimary: "bg-emerald-600 hover:bg-emerald-700",
    statCardBg: "bg-emerald-500/20",
    tabActive: "border-emerald-500 text-emerald-600 dark:text-emerald-400",
    ringColor: "ring-emerald-200 dark:ring-emerald-800",
    welcomeMsg: "Gérez vos consultations et rendez-vous médicaux",
  },
  activite: {
    label: "Activité",
    icon: "🏢",
    bgGradient: "from-amber-500 to-orange-600",
    accentBorder: "border-amber-500",
    lightBg: "bg-amber-50",
    darkBg: "dark:bg-amber-900/20",
    textAccent: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    btnPrimary: "bg-amber-500 hover:bg-amber-600",
    statCardBg: "bg-amber-500/20",
    tabActive: "border-amber-500 text-amber-600 dark:text-amber-400",
    ringColor: "ring-amber-200 dark:ring-amber-800",
    welcomeMsg: "Gérez vos activités professionnelles et formations",
  },
  science: {
    label: "Science",
    icon: "🔬",
    bgGradient: "from-indigo-600 to-purple-700",
    accentBorder: "border-indigo-500",
    lightBg: "bg-indigo-50",
    darkBg: "dark:bg-indigo-900/20",
    textAccent: "text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    btnPrimary: "bg-indigo-600 hover:bg-indigo-700",
    statCardBg: "bg-indigo-500/20",
    tabActive: "border-indigo-500 text-indigo-600 dark:text-indigo-400",
    ringColor: "ring-indigo-200 dark:ring-indigo-800",
    welcomeMsg: "Gérez vos travaux scientifiques et collaborations",
  },
  solidarite: {
    label: "Solidarité",
    icon: "🤝",
    bgGradient: "from-rose-500 to-pink-600",
    accentBorder: "border-rose-500",
    lightBg: "bg-rose-50",
    darkBg: "dark:bg-rose-900/20",
    textAccent: "text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    btnPrimary: "bg-rose-600 hover:bg-rose-700",
    statCardBg: "bg-rose-500/20",
    tabActive: "border-rose-500 text-rose-600 dark:text-rose-400",
    ringColor: "ring-rose-200 dark:ring-rose-800",
    welcomeMsg: "Gérez vos projets humanitaires et actions solidaires",
  },
  securite: {
    label: "Sécurité",
    icon: "🛡️",
    bgGradient: "from-slate-700 to-blue-900",
    accentBorder: "border-slate-600",
    lightBg: "bg-slate-100",
    darkBg: "dark:bg-slate-800/40",
    textAccent: "text-slate-700 dark:text-slate-300",
    badgeBg: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    btnPrimary: "bg-slate-700 hover:bg-slate-800",
    statCardBg: "bg-white/20",
    tabActive: "border-slate-600 text-slate-700 dark:text-slate-300",
    ringColor: "ring-slate-300 dark:ring-slate-600",
    welcomeMsg: "Gérez vos missions de sécurité et interventions",
  },
  echanges: {
    label: "Échanges",
    icon: "🛒",
    bgGradient: "from-cyan-500 to-blue-600",
    accentBorder: "border-cyan-500",
    lightBg: "bg-cyan-50",
    darkBg: "dark:bg-cyan-900/20",
    textAccent: "text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    btnPrimary: "bg-cyan-600 hover:bg-cyan-700",
    statCardBg: "bg-cyan-500/20",
    tabActive: "border-cyan-500 text-cyan-600 dark:text-cyan-400",
    ringColor: "ring-cyan-200 dark:ring-cyan-800",
    welcomeMsg: "Gérez vos échanges et communications",
  },
  restauration: {
    label: "Restauration",
    icon: "🍽️",
    bgGradient: "from-orange-500 to-amber-600",
    accentBorder: "border-orange-500",
    lightBg: "bg-orange-50",
    darkBg: "dark:bg-orange-900/20",
    textAccent: "text-orange-600 dark:text-orange-400",
    badgeBg: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    btnPrimary: "bg-orange-500 hover:bg-orange-600",
    statCardBg: "bg-orange-500/20",
    tabActive: "border-orange-500 text-orange-600 dark:text-orange-400",
    ringColor: "ring-orange-200 dark:ring-orange-800",
    welcomeMsg: "Gérez votre restaurant et publiez votre menu",
  },
  education: {
    label: "Éducation",
    icon: "🎓",
    bgGradient: "from-blue-600 to-indigo-700",
    accentBorder: "border-blue-500",
    lightBg: "bg-blue-50",
    darkBg: "dark:bg-blue-900/20",
    textAccent: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    btnPrimary: "bg-blue-600 hover:bg-blue-700",
    statCardBg: "bg-blue-500/20",
    tabActive: "border-blue-500 text-blue-600 dark:text-blue-400",
    ringColor: "ring-blue-200 dark:ring-blue-800",
    welcomeMsg: "Gérez vos cours, étudiants et publications pédagogiques",
  },
  immobilier: {
    label: "Immobilier & Location",
    icon: "🏘️",
    bgGradient: "from-lime-600 to-green-700",
    accentBorder: "border-lime-500",
    lightBg: "bg-lime-50",
    darkBg: "dark:bg-lime-900/20",
    textAccent: "text-lime-700 dark:text-lime-400",
    badgeBg: "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
    btnPrimary: "bg-lime-600 hover:bg-lime-700",
    statCardBg: "bg-lime-500/20",
    tabActive: "border-lime-600 text-lime-700 dark:text-lime-400",
    ringColor: "ring-lime-200 dark:ring-lime-800",
    welcomeMsg: "Gérez vos mandats immobiliers et demandes de visite",
  },
  transport: {
    label: "Transport & Livraison",
    icon: "🚗",
    bgGradient: "from-blue-500 to-indigo-600",
    accentBorder: "border-blue-400",
    lightBg: "bg-blue-50",
    darkBg: "dark:bg-blue-900/20",
    textAccent: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    btnPrimary: "bg-blue-500 hover:bg-blue-600",
    statCardBg: "bg-blue-500/20",
    tabActive: "border-blue-500 text-blue-600 dark:text-blue-400",
    ringColor: "ring-blue-200 dark:ring-blue-800",
    welcomeMsg: "Gérez vos courses, livraisons et disponibilités",
  },
  beaute: {
    label: "Beauté & Bien-être",
    icon: "💈",
    bgGradient: "from-fuchsia-500 to-purple-600",
    accentBorder: "border-fuchsia-500",
    lightBg: "bg-fuchsia-50",
    darkBg: "dark:bg-fuchsia-900/20",
    textAccent: "text-fuchsia-600 dark:text-fuchsia-400",
    badgeBg: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
    btnPrimary: "bg-fuchsia-500 hover:bg-fuchsia-600",
    statCardBg: "bg-fuchsia-500/20",
    tabActive: "border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400",
    ringColor: "ring-fuchsia-200 dark:ring-fuchsia-800",
    welcomeMsg: "Gérez vos rendez-vous beauté et soins",
  },
  artisanat: {
    label: "Artisanat & Services",
    icon: "🔧",
    bgGradient: "from-stone-600 to-amber-700",
    accentBorder: "border-stone-500",
    lightBg: "bg-stone-50",
    darkBg: "dark:bg-stone-900/20",
    textAccent: "text-stone-600 dark:text-stone-400",
    badgeBg: "bg-stone-100 text-stone-700 dark:bg-stone-900/40 dark:text-stone-300",
    btnPrimary: "bg-stone-600 hover:bg-stone-700",
    statCardBg: "bg-stone-500/20",
    tabActive: "border-stone-500 text-stone-600 dark:text-stone-400",
    ringColor: "ring-stone-200 dark:ring-stone-700",
    welcomeMsg: "Gérez vos interventions et demandes de service",
  },
  mairie: {
    label: "Mairie · État Civil",
    icon: "🏛️",
    bgGradient: "from-blue-800 to-blue-600",
    accentBorder: "border-blue-700",
    lightBg: "bg-blue-50",
    darkBg: "dark:bg-blue-900/20",
    textAccent: "text-blue-700 dark:text-blue-400",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    btnPrimary: "bg-blue-700 hover:bg-blue-800",
    statCardBg: "bg-blue-700/20",
    tabActive: "border-blue-700 text-blue-700 dark:text-blue-400",
    ringColor: "ring-blue-200 dark:ring-blue-800",
    welcomeMsg: "Gérez les demandes de rendez-vous et actes d'état civil",
  },
};

/* =============================================
   COULEUR DE THÈME PAR SERVICE (icône PWA installée)
   ============================================= */
const SERVICE_MANIFEST_COLOR: Record<string, string> = {
  sante: "#1a8f1a",
  activite: "#f59e0b",
  science: "#4f46e5",
  solidarite: "#f43f5e",
  securite: "#334155",
  echanges: "#06b6d4",
  restauration: "#f97316",
  education: "#2563eb",
  immobilier: "#65a30d",
  transport: "#3b82f6",
  beaute: "#d946ef",
  artisanat: "#57534e",
  mairie: "#1e40af",
};

/* =============================================
   CARNET D'ACCÈS — libellés par type de compte pro
   ============================================= */
const MEMBER_LABELS: Record<string, { tab: string; empty: string; defaultRole: string }> = {
  school:        { tab: "Élèves & parents", empty: "Aucun élève ni parent ajouté pour l'instant.", defaultRole: "eleve" },
  madrasa:       { tab: "Apprenants",       empty: "Aucun apprenant ajouté pour l'instant.",        defaultRole: "apprenant" },
  clinic:        { tab: "Patients",         empty: "Aucun patient ajouté pour l'instant.",          defaultRole: "patient" },
  health_worker: { tab: "Patients",         empty: "Aucun patient ajouté pour l'instant.",          defaultRole: "patient" },
  mosque:        { tab: "Fidèles",          empty: "Aucun fidèle ajouté pour l'instant.",           defaultRole: "fidele" },
  ngo:           { tab: "Membres",          empty: "Aucun membre ajouté pour l'instant.",           defaultRole: "membre" },
  reseau:        { tab: "Membres",          empty: "Aucun membre ajouté pour l'instant.",           defaultRole: "membre" },
  journalist:    { tab: "Abonnés",          empty: "Aucun abonné ajouté pour l'instant.",           defaultRole: "abonne" },
  scientist:     { tab: "Collaborateurs",   empty: "Aucun collaborateur ajouté pour l'instant.",    defaultRole: "collaborateur" },
  mairie:        { tab: "Administrés",      empty: "Aucun administré ajouté pour l'instant.",       defaultRole: "administre" },
};
const DEFAULT_MEMBER_LABEL = { tab: "Clients", empty: "Aucun client ajouté pour l'instant.", defaultRole: "client" };

const ROLE_DISPLAY: Record<string, string> = {
  eleve: "🎓 Élève",
  parent: "👨‍👩‍👧 Parent",
  apprenant: "🎓 Apprenant",
  patient: "🩺 Patient",
  fidele: "🕌 Fidèle",
  membre: "🤝 Membre",
  abonne: "📰 Abonné",
  collaborateur: "🔬 Collaborateur",
  administre: "🏛️ Administré",
  client: "🧑 Client",
};

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  clinic:          { label: "Clinique / Hôpital",          icon: "🏥" },
  security_agency: { label: "Agence de sécurité",           icon: "🛡️" },
  journalist:      { label: "Journaliste / Média",           icon: "📰" },
  enterprise:      { label: "Entreprise",                    icon: "🏢" },
  school:          { label: "École / Professeur",            icon: "🎓" },
  supplier:        { label: "Fournisseur / Grossiste",       icon: "📦" },
  vendor:          { label: "Vendeur",                       icon: "🛒" },
  producer:        { label: "Entreprise de production",      icon: "🏭" },
  broker:          { label: "Démarcheur / Immobilier",        icon: "🏘️" },
  scientist:       { label: "Chercheur / Scientifique",      icon: "🔬" },
  ngo:             { label: "ONG / Association",             icon: "🤝" },
  restaurant:      { label: "Restaurant",                    icon: "🍽️" },
  transport:       { label: "Transport & Livraison",          icon: "🚗" },
  beauty:          { label: "Beauté & Bien-être",             icon: "💈" },
  artisan:         { label: "Artisanat & Services",           icon: "🔧" },
};

import { config } from "../config/api";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || (import.meta.env.VITE_API_URL || "");

/* ============================================================
   MURO DE PAGO POR SUSCRIPCIÓN
   ============================================================ */
function SubscriptionPaymentWall({
  account,
  userData,
  onSuccess,
}: {
  account: ProAccount;
  userData: any;
  onSuccess: () => void;
}) {
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);

  // Prix d'abonnement mensuel selon le type de compte (en GNF)
  const SUBSCRIPTION_PRICES: Record<string, number> = {
    clinic: 500000,
    enterprise: 300000,
    school: 200000,
    scientist: 150000,
    ngo: 100000,
    security_agency: 400000,
    supplier: 250000,
    journalist: 150000,
  };

  const price = SUBSCRIPTION_PRICES[account.type] || 200000;
  const isOverdue = account.subscriptionStatus === "overdue";
  const isNeverPaid = account.subscriptionStatus === "never_paid";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-orange-200 dark:border-orange-800 p-6 text-center">
        <div className="text-5xl mb-3">{isOverdue ? "⏰" : "🔒"}</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {isOverdue ? "Abonnement expiré" : "Activez votre abonnement"}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {isNeverPaid
            ? "Votre compte est approuvé ! Payez votre premier abonnement mensuel pour accéder à votre dashboard."
            : "Votre abonnement mensuel a expiré. Renouvelez-le pour continuer à utiliser votre dashboard."}
        </p>

        {/* Prix */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-500 mb-1">Abonnement mensuel</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {price.toLocaleString('fr-FR')} GNF
          </p>
          <p className="text-xs text-gray-400 mt-1">Valable 30 jours — Renouvelable</p>
        </div>

        {/* Avantages */}
        <div className="text-left mb-5 space-y-2">
          {["Tableau de bord complet", "Gestion des rendez-vous", "Profil visible dans les recherches", "Notifications en temps réel"].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="text-green-500">✓</span> {f}
            </div>
          ))}
        </div>

        {/* Bouton payer */}
        <button
          onClick={() => setShowPayment(true)}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors mb-3 flex items-center justify-center gap-2"
        >
          💳 Payer {price.toLocaleString('fr-FR')} GNF
        </button>

        <p className="text-xs text-gray-400 mb-3">Orange Money • MTN MoMo • Visa • Mastercard</p>

        <button
          onClick={() => navigate("/mes-comptes-pro")}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Retour à mes comptes
        </button>
      </div>

      {showPayment && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); onSuccess(); }}
          amount={price}
          currency="GNF"
          purpose="subscription_pro"
          relatedId={account.id}
          description={`Abonnement mensuel — ${account.name}`}
        />
      )}
    </div>
  );
}

/* ============================================================ */
export default function EspacePro() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [account, setAccount]           = useState<ProAccount | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab]                   = useState<TabType>("pending");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Rejet
  const [rejectId, setRejectId]         = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Logo
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSuccess, setLogoSuccess]     = useState(false);

  // Menu restaurant
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [newMenuItem, setNewMenuItem] = useState<MenuItem>({ name: '', price: '', category: 'Plat', description: '' });
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuTab, setMenuTab] = useState<string>('Tous');

  // Retrait professionnel
  const [retraitMontant, setRetraitMontant]             = useState('');
  const [retraitMotif, setRetraitMotif]                 = useState('');
  const [retraitCoord, setRetraitCoord]                 = useState('');
  const [retraitLoading, setRetraitLoading]             = useState(false);
  const [retraitMsg, setRetraitMsg]                     = useState('');
  const [mesDemandes, setMesDemandes]                   = useState<any[]>([]);
  const [loadingDemandes, setLoadingDemandes]           = useState(false);
  const [retraitReçu, setRetraitReçu]                   = useState<any>(null);

  // Cours école / prof
  const [showPublishCourse, setShowPublishCourse] = useState(false);
  const [newCourseData, setNewCourseData] = useState({ title: '', description: '', type: 'audio' as 'audio' | 'video' | 'ecrit', category: '', mediaFile: null as File | null });
  const [courseSaving, setCourseSaving] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [linkedStudents, setLinkedStudents] = useState<string[]>([]);

  // Carnet d'accès (membres liés)
  const [members, setMembers]           = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showAddMember, setShowAddMember]   = useState(false);
  const [addMemberRole, setAddMemberRole]   = useState('client');
  const [memberMsg, setMemberMsg]           = useState('');

  // Vidéo réponse
  const [responseVideoId, setResponseVideoId]   = useState<string | null>(null);
  const [recording, setRecording]               = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [videoSent, setVideoSent]               = useState(false);
  const videoRef         = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const currentAptIdRef  = useRef<string | null>(null);

  const token = localStorage.getItem("token");

  // Lire les données utilisateur pour le paiement
  const userData = (() => {
    try { const s = localStorage.getItem('session_user'); return s ? JSON.parse(s).userData : null; } catch { return null; }
  })();

  /* ---- Déduction du service ---- */
  const serviceKey = account ? (TYPE_TO_SERVICE[account.type] || "activite") : "activite";
  const svc        = SERVICE_CONFIG[serviceKey];
  const typeInfo   = account ? (TYPE_LABELS[account.type] || { label: account.type, icon: "📄" }) : { label: "", icon: "📄" };
  const memberLabel = account ? (MEMBER_LABELS[account.type] || DEFAULT_MEMBER_LABEL) : DEFAULT_MEMBER_LABEL;

  /* ---- Chargement initial ---- */
  useEffect(() => { loadAccount(); }, [id]);
  useEffect(() => { if (tab === 'retrait' && account) loadMesDemandes(); }, [tab, account?.id]);
  useEffect(() => { if (tab === 'membres' && account) loadMembers(); }, [tab, account?.id]);

  const loadAccount = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/professionals/detail/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAccount(data.account);
        loadMenuItems(data.account);
        await loadAppointments(data.account.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!account) return;
    setMembersLoading(true);
    try {
      const res = await fetch(`${API}/api/pro-members/${account.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMembers(data.members || []);
    } catch { /* ignore */ } finally {
      setMembersLoading(false);
    }
  };

  const addMember = async (numeroH: string, role: string) => {
    if (!account) return;
    setMemberMsg('');
    try {
      const res = await fetch(`${API}/api/pro-members/${account.id}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroH, role }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddMember(false);
        loadMembers();
      } else {
        setMemberMsg(data.message || "Impossible d'ajouter cette personne.");
      }
    } catch {
      setMemberMsg('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!account) return;
    if (!window.confirm('Retirer cette personne ?')) return;
    try {
      await fetch(`${API}/api/pro-members/${account.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadMembers();
    } catch { /* ignore */ }
  };

  const loadMesDemandes = async () => {
    setLoadingDemandes(true);
    try {
      const res = await fetch(`${API}/api/withdrawal-requests/mes-demandes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setMesDemandes(data.demandes || []);
    } catch { /* ignore */ } finally {
      setLoadingDemandes(false);
    }
  };

  const soumettreRetrait = async () => {
    if (!account) return;
    const montant = parseInt(retraitMontant);
    if (!montant || montant < 1000) return setRetraitMsg('Montant minimum : 1 000 GNF');
    if (!retraitCoord) return setRetraitMsg('Indiquez vos coordonnées de paiement (Orange Money...)');
    setRetraitLoading(true);
    setRetraitMsg('');
    try {
      const r = await fetch(`${API}/api/withdrawal-requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proAccountId: account.id,
          montant,
          motif: retraitMotif,
          coordonneesPaiement: retraitCoord
        })
      });
      const d = await r.json();
      if (d.success) {
        setRetraitMsg('✅ ' + d.message);
        setRetraitMontant(''); setRetraitMotif(''); setRetraitCoord('');
        loadMesDemandes();
      } else {
        setRetraitMsg('❌ ' + d.message);
      }
    } finally { setRetraitLoading(false); }
  };

  const loadAppointments = useCallback(async (proId: string) => {
    try {
      const res  = await fetch(`${API}/api/appointments/professional/${proId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAppointments(data.appointments || []);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  /* ---- Accepter ---- */
  const handleAccept = async (aptId: string, videoUrl?: string) => {
    setActionLoading(aptId);
    try {
      const body: Record<string, unknown> = {
        responseMessage: videoUrl ? "Réponse vidéo envoyée" : "Rendez-vous confirmé",
      };
      if (videoUrl) body.responseVideoUrl = videoUrl;

      const res  = await fetch(`${API}/api/appointments/accept/${aptId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success && account) {
        await loadAppointments(account.id);
        setTab("history");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  /* ---- Refuser ---- */
  const handleReject = async () => {
    if (!rejectId || !account) return;
    setActionLoading(rejectId);
    try {
      const res  = await fetch(`${API}/api/appointments/reject/${rejectId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ responseMessage: rejectReason.trim() || "Rendez-vous refusé" }),
      });
      const data = await res.json();
      if (data.success) {
        await loadAppointments(account.id);
        setRejectId(null);
        setRejectReason("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  /* ---- Enregistrement vidéo 30 s ---- */
  const startVideoRecording = async (aptId: string) => {
    currentAptIdRef.current = aptId;
    setResponseVideoId(aptId);
    setVideoSent(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecording(false);
        const reader = new FileReader();
        reader.onloadend = async () => {
          const capturedId = currentAptIdRef.current;
          if (capturedId) {
            await handleAccept(capturedId, reader.result as string);
            setVideoSent(true);
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setRecording(true);
      setCountdown(10);

      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); recorder.stop(); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Impossible d'accéder à la caméra");
      setResponseVideoId(null);
    }
  };

  /* ---- Upload logo ---- */
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Fichier trop grand. Maximum : 2 Mo");
      return;
    }
    setLogoUploading(true);
    setLogoSuccess(false);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res  = await fetch(`${API}/api/professionals/${account.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ photo: base64 }),
        });
        const data = await res.json();
        if (data.success) {
          setAccount(prev => prev ? { ...prev, photo: base64 } : prev);
          setLogoSuccess(true);
          setTimeout(() => setLogoSuccess(false), 3500);
        }
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  /* ---- Chargement menu restaurant ---- */
  const loadMenuItems = (acc: ProAccount) => {
    if (acc.type === 'restaurant') {
      const items = (acc.services || []).filter((s: any) => typeof s === 'object' && s !== null && s.name);
      setMenuItems(items);
    }
  };

  /* ---- Sauvegarder le menu ---- */
  const saveMenu = async (updatedItems: MenuItem[]) => {
    if (!account) return;
    setMenuSaving(true);
    try {
      const res = await fetch(`${API}/api/professionals/${account.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ services: updatedItems }),
      });
      const data = await res.json();
      if (data.success) {
        setMenuItems(updatedItems);
        setAccount(prev => prev ? { ...prev, services: updatedItems } : prev);
      }
    } catch (err) { console.error(err); }
    finally { setMenuSaving(false); }
  };

  const addMenuItem = async () => {
    if (!newMenuItem.name.trim() || !newMenuItem.price.trim()) {
      alert("Nom et prix requis");
      return;
    }
    const updated = [...menuItems, { ...newMenuItem }];
    await saveMenu(updated);
    setNewMenuItem({ name: '', price: '', category: 'Plat', description: '' });
    setShowAddMenuItem(false);
  };

  const removeMenuItem = async (idx: number) => {
    const updated = menuItems.filter((_, i) => i !== idx);
    await saveMenu(updated);
  };

  /* ---- Publier un cours (école/prof) ---- */
  const publishCourse = async () => {
    if (!newCourseData.title.trim()) { alert("Titre requis"); return; }
    setCourseSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", newCourseData.title.trim());
      formData.append("description", newCourseData.description);
      formData.append("type", newCourseData.type);
      formData.append("category", newCourseData.category);
      if (newCourseData.mediaFile) formData.append("media", newCourseData.mediaFile);
      const res = await fetch(`${API}/api/education/courses/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        alert("Cours publié avec succès !");
        setShowPublishCourse(false);
        setNewCourseData({ title: '', description: '', type: 'audio', category: '', mediaFile: null });
      } else {
        alert("Erreur lors de la publication");
      }
    } catch (err) { console.error(err); }
    finally { setCourseSaving(false); }
  };

  /* ---- Calculs dérivés ---- */
  const pendingApts  = appointments.filter((a) => a.status === "pending");
  const handledApts  = appointments.filter((a) => a.status !== "pending");
  const filteredHist = historyFilter === "all"
    ? handledApts
    : handledApts.filter((a) => a.status === historyFilter);
  const stats = {
    total:    appointments.length,
    pending:  pendingApts.length,
    accepted: appointments.filter((a) => a.status === "accepted").length,
    rejected: appointments.filter((a) => a.status === "rejected").length,
  };

  /* ============================================================
     LOADING / NOT FOUND
     ============================================================ */
  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Chargement de votre espace...</p>
      </div>
    </div>
  );

  if (!account) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-500 font-medium mb-4">Compte professionnel non trouvé</p>
        <button onClick={() => navigate("/compte")}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">
          ← Retour
        </button>
      </div>
    </div>
  );

  const currentUser = getSessionUser();
  const isAdminViewing = isAdmin(currentUser) && currentUser?.numeroH !== account.ownerNumeroH;

  // Mur d'abonnement — bypassé pour les admins (ils doivent pouvoir inspecter n'importe quel dashboard)
  if (!isAdminViewing && account.status === "approved" && account.subscriptionStatus && account.subscriptionStatus !== "active") {
    return (
      <SubscriptionPaymentWall account={account} userData={userData} onSuccess={() => window.location.reload()} />
    );
  }

  /* ============================================================
     RENDU PRINCIPAL
     ============================================================ */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Bannière super admin — visible uniquement quand l'admin consulte un compte qui ne lui appartient pas */}
      {isAdminViewing && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-semibold sticky top-[72px] z-50 shadow-md">
          <span>👁️ Mode Admin — Vue lecture seule · Compte de <strong>{account.ownerNumeroH}</strong></span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Actions désactivées</span>
        </div>
      )}

      {/* ══════════════════════════════════════════
          HEADER SERVICE (gradient)
          ══════════════════════════════════════════ */}
      <div className={`bg-gradient-to-r ${svc.bgGradient} text-white`}>
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-6">

          {/* Bouton retour + badge service */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate("/compte")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors min-h-[36px]"
            >
              ← Retour
            </button>
            <span className="text-xs bg-white/25 px-3 py-1 rounded-full font-semibold tracking-wide uppercase">
              {svc.icon} {svc.label}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => navigate("/moftal-pay-pro")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors min-h-[36px]"
              >
                💰 Moftal Pay
              </button>
            </div>
          </div>

          {/* Identité du compte */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl flex-shrink-0 shadow-inner overflow-hidden border-2 border-white/30">
              {account.photo ? (
                <img
                  src={account.photo}
                  alt={`Logo ${account.name}`}
                  className="w-full h-full object-contain bg-white"
                />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-4xl">
                  {typeInfo.icon}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{account.name}</h1>
              <p className="text-white/75 text-sm mt-1">{typeInfo.label} · {account.city}{account.country ? `, ${account.country}` : ""}</p>
              <p className="text-white/60 text-xs mt-1">{svc.welcomeMsg}</p>
              {account.status === "approved" && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">
                  ✓ Compte vérifié
                </span>
              )}
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total",      value: stats.total,    extra: "" },
              { label: "En attente", value: stats.pending,  extra: stats.pending > 0 ? "ring-2 ring-yellow-300" : "" },
              { label: "Acceptés",   value: stats.accepted, extra: "" },
              { label: "Refusés",    value: stats.rejected, extra: "" },
            ].map((s) => (
              <div key={s.label}
                className={`bg-white/15 rounded-xl p-3 text-center ${s.extra}`}>
                <div className="text-2xl font-extrabold leading-none">{s.value}</div>
                <div className="text-xs text-white/75 mt-1 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          APPLICATION INSTALLABLE
          Icône + nom propres à l'établissement, accès direct à cet espace
          ══════════════════════════════════════════ */}
      <DynamicAppManifest
        name={account.name}
        description={`Gestion ${typeInfo.label} — ${account.name}`}
        iconUrl={getPhotoUrl(account.photo)}
        startUrl={`/espace-pro/${account.id}`}
        themeColor={SERVICE_MANIFEST_COLOR[serviceKey] || "#1a8f1a"}
      />
      <div className="max-w-5xl mx-auto px-4 pt-3">
        <InstallAppButton />
      </div>

      {/* ══════════════════════════════════════════
          BANNIÈRE ESSAI GRATUIT
          ══════════════════════════════════════════ */}
      {account.isTrial && account.subscriptionStatus === "active" && account.subscriptionValidUntil && (() => {
        const expiry = new Date(account.subscriptionValidUntil);
        const now = new Date();
        const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const isUrgent = daysLeft <= 14;
        return (
          <div className={`${isUrgent ? "bg-orange-50 border-orange-300" : "bg-amber-50 border-amber-200"} border-b px-4 py-3`}>
            <div className="max-w-5xl mx-auto flex items-center gap-3">
              <span className="text-xl flex-shrink-0">{isUrgent ? "⚠️" : "🎁"}</span>
              <div className="flex-1 min-w-0">
                <span className={`font-bold text-sm ${isUrgent ? "text-orange-800" : "text-amber-800"}`}>
                  {isUrgent ? `Essai gratuit — plus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""} !` : `Essai gratuit — ${daysLeft} jours restants`}
                </span>
                <span className={`ml-2 text-xs ${isUrgent ? "text-orange-600" : "text-amber-600"}`}>
                  {isUrgent
                    ? "Contactez l'administrateur pour continuer sans interruption."
                    : `Visibilité, rendez-vous et gestion interne inclus jusqu'au ${expiry.toLocaleDateString("fr-FR")}.`}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════
          ONGLETS DE NAVIGATION
          ══════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-[72px] z-40 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex">
            {([
              { key: "pending"  as TabType, icon: "⏳", label: "Demandes",   badge: pendingApts.length },
              { key: "history"  as TabType, icon: "📋", label: "Historique", badge: 0 },
              { key: "membres"  as TabType, icon: "👥", label: memberLabel.tab, badge: 0 },
              ...(account.type === 'restaurant' ? [{ key: "menu" as TabType, icon: "🍽️", label: "Mon Menu", badge: 0 }] : []),
              ...(account.type === 'school' ? [{ key: "cours" as TabType, icon: "📚", label: "Cours", badge: 0 }] : []),
              { key: "retrait" as TabType, icon: "💸", label: "Retrait", badge: mesDemandes.filter(d => d.statut === 'en_attente').length },
              { key: "profile"  as TabType, icon: "👤", label: "Mon profil", badge: 0 },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors flex-1 justify-center ${
                  tab === t.key
                    ? svc.tabActive
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <span>{t.icon}</span>
                <span className="hidden xs:inline">{t.label}</span>
                {t.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CONTENU
          ══════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ─────────────────────────────
            ONGLET : DEMANDES EN ATTENTE
            ───────────────────────────── */}
        {tab === "pending" && (
          <div>
            {pendingApts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Aucune demande en attente</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  Les nouvelles demandes de rendez-vous apparaîtront ici
                </p>
                <button
                  onClick={() => account && loadAppointments(account.id)}
                  className={`mt-5 px-5 py-2 ${svc.btnPrimary} text-white rounded-xl text-sm font-medium transition-colors`}
                >
                  🔄 Actualiser
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">
                    {pendingApts.length} demande{pendingApts.length > 1 ? "s" : ""} en attente
                  </h2>
                  <button
                    onClick={() => account && loadAppointments(account.id)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
                  >
                    🔄 Actualiser
                  </button>
                </div>

                {pendingApts.map((apt) => (
                  <div key={apt.id}
                    className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden ring-1 ${svc.ringColor}`}
                  >
                    {/* Barre de couleur service en haut */}
                    <div className={`h-1.5 bg-gradient-to-r ${svc.bgGradient}`} />

                    <div className="p-4 sm:p-5">
                      {/* Info patient */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full ${svc.lightBg} ${svc.darkBg} flex items-center justify-center text-xl flex-shrink-0 font-bold`}>
                          {apt.patientName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-gray-900 dark:text-gray-100">{apt.patientName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              apt.type === "video"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            }`}>
                              {apt.type === "video" ? "📹 Vidéo" : "📝 Écrit"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            ID: {apt.patientNumeroH} · Reçu le {new Date(apt.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>

                      {/* Détails du rendez-vous */}
                      <div className={`${svc.lightBg} ${svc.darkBg} rounded-xl p-3.5 mb-4`}>
                        {apt.type === "written" ? (
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">📅 Date</p>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {apt.appointmentDate
                                  ? new Date(apt.appointmentDate).toLocaleDateString("fr-FR")
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">🕐 Heure</p>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{apt.appointmentTime || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">🔧 Service</p>
                              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{apt.service || "—"}</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                              Message vidéo du patient (10 secondes)
                            </p>
                            {apt.videoUrl ? (
                              <video src={apt.videoUrl} controls
                                className="w-full max-w-sm rounded-lg shadow-sm"
                                style={{ maxHeight: "180px" }}
                              />
                            ) : (
                              <p className="text-gray-400 text-xs italic">Vidéo non disponible</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Boutons d'action — masqués en mode admin lecture seule */}
                      {isAdminViewing ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                          👁️ Vue admin — Vous ne pouvez pas agir sur ce rendez-vous
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleAccept(apt.id)}
                            disabled={!!actionLoading}
                            className="flex-1 sm:flex-none min-h-[42px] px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            {actionLoading === apt.id
                              ? <span className="animate-spin">⏳</span>
                              : <>✅ Accepter</>}
                          </button>
                          <button
                            onClick={() => startVideoRecording(apt.id)}
                            disabled={!!actionLoading}
                            className="flex-1 sm:flex-none min-h-[42px] px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            📹 Accepter + Vidéo
                          </button>
                          <button
                            onClick={() => { setRejectId(apt.id); setRejectReason(""); }}
                            disabled={!!actionLoading}
                            className="flex-1 sm:flex-none min-h-[42px] px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            ❌ Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────
            ONGLET : HISTORIQUE
            ───────────────────────────── */}
        {tab === "history" && (
          <div>
            {/* Filtres */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Historique des rendez-vous</h2>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { key: "all"      as HistoryFilter, label: "Tous",     count: handledApts.length },
                  { key: "accepted" as HistoryFilter, label: "Acceptés", count: stats.accepted },
                  { key: "rejected" as HistoryFilter, label: "Refusés",  count: stats.rejected },
                ] as const).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setHistoryFilter(f.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      historyFilter === f.key
                        ? `${svc.btnPrimary} text-white`
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {f.label} <span className="opacity-70">({f.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredHist.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📂</div>
                <p className="text-gray-500 dark:text-gray-400">Aucun rendez-vous dans cette catégorie</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHist.map((apt) => (
                  <div key={apt.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-4 flex items-center gap-3"
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                      apt.status === "accepted"
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}>
                      {apt.status === "accepted" ? "✅" : "❌"}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                        {apt.patientName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {apt.type === "video"
                          ? "📹 Rendez-vous vidéo"
                          : `📅 ${apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString("fr-FR") : ""} ${apt.appointmentTime || ""}`}
                        {apt.service ? ` · ${apt.service}` : ""}
                      </p>
                      {apt.responseMessage && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate italic">
                          Réponse : {apt.responseMessage}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        apt.status === "accepted"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}>
                        {apt.status === "accepted" ? "Accepté" : "Refusé"}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(apt.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────
            ONGLET : MON MENU (Restaurant)
            ───────────────────────────── */}
        {tab === "menu" && account.type === "restaurant" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                🍽️ Mon Menu — {menuItems.length} plat{menuItems.length > 1 ? "s" : ""}
              </h2>
              <button
                onClick={() => setShowAddMenuItem(true)}
                className={`min-h-[42px] px-4 py-2 ${svc.btnPrimary} text-white text-sm font-semibold rounded-xl transition-colors`}
              >
                ➕ Ajouter un plat
              </button>
            </div>

            {/* Onglets catégories */}
            {menuItems.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {['Tous', ...Array.from(new Set(menuItems.map(m => m.category || 'Plat')))].map(cat => (
                  <button key={cat} onClick={() => setMenuTab(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${menuTab === cat ? `${svc.btnPrimary} text-white` : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {menuItems.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Votre menu est vide</p>
                <p className="text-sm text-gray-400 mt-1">Ajoutez vos plats pour que les clients puissent les voir</p>
                <button onClick={() => setShowAddMenuItem(true)}
                  className={`mt-4 px-5 py-2 ${svc.btnPrimary} text-white font-semibold rounded-xl text-sm`}>
                  ➕ Ajouter le premier plat
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {menuItems.filter(m => menuTab === 'Tous' || (m.category || 'Plat') === menuTab).map((item, idx) => (
                  <div key={idx} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ${svc.ringColor} p-4 flex items-start justify-between gap-3`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>}
                      <span className={`inline-block mt-1 px-2 py-0.5 ${svc.badgeBg} rounded text-xs`}>{item.category}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-bold text-orange-600 dark:text-orange-400 text-sm whitespace-nowrap">{item.price}</span>
                      {!isAdminViewing && (
                        <button onClick={() => removeMenuItem(idx)} disabled={menuSaving}
                          className="text-xs text-red-500 hover:text-red-700 font-medium">
                          🗑️ Suppr.
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire ajout plat */}
            {showAddMenuItem && !isAdminViewing && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">➕ Ajouter un plat au menu</h3>
                  <div className="space-y-3">
                    <input type="text" placeholder="Nom du plat *" value={newMenuItem.name}
                      onChange={e => setNewMenuItem(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <input type="text" placeholder="Prix (ex: 15 000 FG) *" value={newMenuItem.price}
                      onChange={e => setNewMenuItem(p => ({ ...p, price: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <select value={newMenuItem.category} onChange={e => setNewMenuItem(p => ({ ...p, category: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option value="Plat">Plat principal</option>
                      <option value="Entrée">Entrée</option>
                      <option value="Dessert">Dessert</option>
                      <option value="Boisson">Boisson</option>
                      <option value="Spécialité">Spécialité</option>
                    </select>
                    <textarea placeholder="Description (optionnel)" value={newMenuItem.description}
                      onChange={e => setNewMenuItem(p => ({ ...p, description: e.target.value }))}
                      rows={2} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowAddMenuItem(false)}
                      className="flex-1 min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl">
                      Annuler
                    </button>
                    <button onClick={addMenuItem} disabled={menuSaving}
                      className={`flex-1 min-h-[44px] px-4 py-2 ${svc.btnPrimary} disabled:opacity-50 text-white font-semibold rounded-xl`}>
                      {menuSaving ? "⏳ Enregistrement..." : "✅ Ajouter"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────
            ONGLET : COURS (École / Prof)
            ───────────────────────────── */}
        {tab === "cours" && account.type === "school" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">📚 Gestion des cours</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowPublishCourse(true)}
                  className={`min-h-[42px] px-4 py-2 ${svc.btnPrimary} text-white text-sm font-semibold rounded-xl transition-colors`}>
                  ➕ Publier un cours
                </button>
                <button onClick={() => window.open('/mes-cours', '_blank')}
                  className="min-h-[42px] px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  📖 Voir tous les cours
                </button>
              </div>
            </div>

            {/* Section lier un apprenant */}
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ${svc.ringColor} p-5`}>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                👥 Lier un apprenant à ce cours
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Entrez le NumeroH de l'apprenant pour lui donner accès aux cours de cette école.
              </p>
              <div className="flex gap-2">
                <input type="text" placeholder="Ex: G0C0P0R0E0F0 0" value={newStudentId}
                  onChange={e => setNewStudentId(e.target.value)}
                  className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button
                  onClick={() => {
                    if (!newStudentId.trim()) return;
                    if (!linkedStudents.includes(newStudentId.trim())) {
                      setLinkedStudents(prev => [...prev, newStudentId.trim()]);
                    }
                    setNewStudentId('');
                  }}
                  className={`min-h-[42px] px-4 py-2 ${svc.btnPrimary} text-white text-sm font-semibold rounded-xl`}>
                  Lier
                </button>
              </div>
              {linkedStudents.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Apprenants liés :</p>
                  {linkedStudents.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">👤 {s}</span>
                      <button onClick={() => setLinkedStudents(prev => prev.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:text-red-700">Retirer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulaire publication cours */}
            {showPublishCourse && !isAdminViewing && (
              <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ${svc.ringColor} p-5`}>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">📝 Nouveau cours</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Titre du cours *" value={newCourseData.title}
                    onChange={e => setNewCourseData(p => ({ ...p, title: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <textarea placeholder="Description du cours" value={newCourseData.description}
                    onChange={e => setNewCourseData(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newCourseData.type} onChange={e => setNewCourseData(p => ({ ...p, type: e.target.value as any }))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="audio">🎧 Audio</option>
                      <option value="video">🎥 Vidéo</option>
                      <option value="ecrit">📝 Écrit</option>
                    </select>
                    <input type="text" placeholder="Catégorie (Maths, Histoire…)" value={newCourseData.category}
                      onChange={e => setNewCourseData(p => ({ ...p, category: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Fichier (audio, vidéo ou document)</label>
                    <input type="file" accept="audio/*,video/*,.pdf,.doc,.docx"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
                          const url = URL.createObjectURL(file);
                          const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
                          el.src = url;
                          el.onloadedmetadata = () => {
                            URL.revokeObjectURL(url);
                            if (el.duration > 30) {
                              alert("La durée du fichier audio/vidéo ne doit pas dépasser 30 secondes.");
                              e.target.value = '';
                            } else {
                              setNewCourseData(p => ({ ...p, mediaFile: file }));
                            }
                          };
                        } else {
                          setNewCourseData(p => ({ ...p, mediaFile: file }));
                        }
                      }}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-800 file:font-medium" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowPublishCourse(false)}
                    className="flex-1 min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl">
                    Annuler
                  </button>
                  <button onClick={publishCourse} disabled={courseSaving}
                    className={`flex-1 min-h-[44px] px-4 py-2 ${svc.btnPrimary} disabled:opacity-50 text-white font-semibold rounded-xl`}>
                    {courseSaving ? "⏳ Publication..." : "📤 Publier le cours"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────
            ONGLET : RETRAIT PROFESSIONNEL
            ───────────────────────────── */}
        {tab === "retrait" && (
          <div className="space-y-4">

            {/* Reçu retrait */}
            {retraitReçu && (
              <ReçuTransaction
                id={retraitReçu.id}
                type="retrait_pro"
                montant={retraitReçu.montant}
                date={retraitReçu.date}
                acteurNom={retraitReçu.acteurNom}
                beneficiaireNom={retraitReçu.beneficiaireNom}
                beneficiaireContact={retraitReçu.beneficiaireContact}
                description={retraitReçu.description}
                proNom={account?.name}
                logoUrl={account?.photo || undefined}
                onClose={() => setRetraitReçu(null)}
              />
            )}

            {/* Formulaire de demande */}
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ${svc.ringColor} overflow-hidden`}>
              <div className={`bg-gradient-to-r ${svc.bgGradient} px-5 py-4`}>
                <h2 className="text-white font-bold text-base">💸 Demande de retrait</h2>
                <p className="text-white/70 text-xs mt-0.5">
                  L'administrateur validera votre demande et vous remettra un reçu
                </p>
              </div>
              <div className="p-5 space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                  ⚠️ Tout retrait doit être approuvé par l'administrateur de la plateforme. Vous recevrez un reçu officiel avec le logo de votre établissement lors de la validation.
                </div>

                {account?.photo && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <img src={account.photo} alt={account.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                    <div>
                      <p className="font-bold text-sm text-gray-900">{account.name}</p>
                      <p className="text-xs text-gray-500">{account.type}</p>
                    </div>
                  </div>
                )}

                <input
                  type="number"
                  value={retraitMontant}
                  onChange={e => setRetraitMontant(e.target.value)}
                  placeholder="Montant à retirer en GNF (min 1 000)"
                  min="1000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  value={retraitCoord}
                  onChange={e => setRetraitCoord(e.target.value)}
                  placeholder="Orange Money ou compte bancaire pour le virement"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <textarea
                  value={retraitMotif}
                  onChange={e => setRetraitMotif(e.target.value)}
                  placeholder="Motif du retrait (ex: frais de fonctionnement, salaires...)"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none resize-none"
                />

                {retraitMsg && (
                  <p className={`text-xs font-semibold text-center rounded-lg px-3 py-2 ${retraitMsg.startsWith('✅') ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    {retraitMsg}
                  </p>
                )}

                <button
                  onClick={soumettreRetrait}
                  disabled={retraitLoading}
                  className={`w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 ${svc.btnPrimary}`}
                >
                  {retraitLoading ? 'Envoi en cours...' : '📤 Soumettre la demande de retrait'}
                </button>
              </div>
            </div>

            {/* Mes demandes précédentes */}
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ${svc.ringColor} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Mes demandes de retrait</h3>
              </div>
              <div className="p-5">
                {loadingDemandes ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : mesDemandes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune demande de retrait pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {mesDemandes.map(d => (
                      <div key={d.id} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-900 text-sm">{Number(d.montant).toLocaleString()} GNF</span>
                            <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                              d.statut === 'valide' ? 'bg-green-100 text-green-700' :
                              d.statut === 'rejete' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {d.statut === 'valide' ? '✅ Validé' : d.statut === 'rejete' ? '❌ Rejeté' : '⏳ En attente'}
                            </span>
                          </div>
                          {d.motif && <p className="text-xs text-gray-500 mb-1">{d.motif}</p>}
                          {d.coordonneesPaiement && <p className="text-xs text-gray-400">{d.coordonneesPaiement}</p>}
                          {d.raisonRejet && <p className="text-xs text-red-600 mt-1">Motif rejet : {d.raisonRejet}</p>}
                          {d.valideParNom && d.statut === 'valide' && (
                            <p className="text-xs text-green-600 mt-1">Validé par {d.valideParNom}</p>
                          )}
                          <p className="text-xs text-gray-300 mt-1">
                            {new Date(d.creeLe).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        {d.statut === 'valide' && (
                          <button
                            onClick={() => setRetraitReçu({
                              id: d.receiptRef || d.id,
                              montant: Number(d.montant),
                              date: d.valideAt || d.creeLe,
                              acteurNom: d.ownerNom,
                              beneficiaireNom: d.proAccountName,
                              beneficiaireContact: d.coordonneesPaiement,
                              description: d.motif,
                            })}
                            className="text-xs font-bold text-blue-600 underline flex-shrink-0"
                          >
                            🧾 Reçu
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────
            ONGLET : MEMBRES (carnet d'accès)
            ───────────────────────────── */}
        {tab === "membres" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">{memberLabel.tab}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Ajoutez les personnes qui ont accès à votre espace — par NuméroH, téléphone ou QR Code.
                </p>
              </div>
              {account.type === 'school' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAddMemberRole('eleve'); setMemberMsg(''); setShowAddMember(true); }}
                    className={`${svc.btnPrimary} text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-colors`}
                  >
                    + Élève
                  </button>
                  <button
                    onClick={() => { setAddMemberRole('parent'); setMemberMsg(''); setShowAddMember(true); }}
                    className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-colors"
                  >
                    + Parent
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddMemberRole(memberLabel.defaultRole); setMemberMsg(''); setShowAddMember(true); }}
                  className={`${svc.btnPrimary} text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors`}
                >
                  + Ajouter
                </button>
              )}
            </div>

            {memberMsg && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{memberMsg}</p>}

            {membersLoading ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Chargement...</p>
            ) : members.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-gray-500 dark:text-gray-400">{memberLabel.empty}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className={`flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-3 ring-1 ${svc.ringColor}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full ${svc.lightBg} ${svc.darkBg} flex items-center justify-center text-sm font-bold ${svc.textAccent} flex-shrink-0`}>
                        {(m.prenom?.[0] || m.nom_display?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                          {m.prenom ? `${m.prenom} ${m.nom || ""}`.trim() : (m.nom_display || m.numero_h)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{ROLE_DISPLAY[m.role] || m.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────
            ONGLET : MON PROFIL
            ───────────────────────────── */}
        {tab === "profile" && (
          <div className="space-y-4">
            {/* Carte principale */}
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ${svc.ringColor} overflow-hidden`}>
              <div className={`bg-gradient-to-r ${svc.bgGradient} px-5 py-4`}>
                <h2 className="text-white font-bold text-base">Informations du compte</h2>
                <p className="text-white/70 text-xs mt-0.5">Vos coordonnées visibles par les utilisateurs</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "Adresse",   value: account.address },
                    { label: "Ville",     value: account.city },
                    { label: "Pays",      value: account.country },
                    { label: "Téléphone", value: account.phone },
                    { label: "Email",     value: account.email },
                    {
                      label: "Statut",
                      value: account.status === "approved"
                        ? "✅ Vérifié et actif"
                        : account.status === "pending"
                        ? "⏳ En attente de vérification"
                        : "❌ " + account.status,
                    },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                        {f.label}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {f.value || <span className="text-gray-400 italic">Non renseigné</span>}
                      </p>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {account.description || <span className="text-gray-400 italic">Non renseigné</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Services & Spécialités */}
            {(account.services?.length > 0 || account.specialties?.length > 0) && (
              <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ${svc.ringColor} p-5`}>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm flex items-center gap-2">
                  {typeInfo.icon} Services & Spécialités
                </h3>

                {account.services?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Services proposés
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {account.services.map((s, i) => (
                        <span key={i} className={`px-3 py-1.5 ${svc.badgeBg} text-sm rounded-full font-medium`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {account.specialties?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Spécialités
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {account.specialties.map((s, i) => (
                        <span key={i}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Moftal Pay card — clinic & supplier */}
            {(account.type === 'clinic' || account.type === 'supplier') && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">💳</span>
                <div className="flex-1">
                  <h3 className="font-bold text-teal-900 text-sm mb-1">Moftal Pay</h3>
                  <p className="text-xs text-teal-700 mb-3">
                    {account.type === 'clinic'
                      ? "Recevez des paiements de familles et gérez votre Moftal Pay depuis une seule interface."
                      : "Encaissez les paiements de vos clients familles et suivez votre Moftal Pay facilement."}
                  </p>
                  <button
                    onClick={() => navigate("/moftal-pay-pro")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg,#1a8f1a,#0891b2)' }}
                  >
                    💰 Accéder à Moftal Pay
                  </button>
                </div>
              </div>
            )}

            {/* Logo de l'établissement */}
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ${svc.ringColor} overflow-hidden`}>
              <div className={`bg-gradient-to-r ${svc.bgGradient} px-5 py-4`}>
                <h2 className="text-white font-bold text-base">Logo de l'établissement</h2>
                <p className="text-white/70 text-xs mt-0.5">
                  Personnalisez l'interface — les membres reconnaîtront votre {typeInfo.label.toLowerCase()} grâce à ce logo
                </p>
              </div>
              <div className="p-5 flex flex-col sm:flex-row items-center gap-5">
                {/* Aperçu */}
                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-inner border border-gray-200 dark:border-gray-600">
                  {account.photo ? (
                    <img src={account.photo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-5xl">{typeInfo.icon}</span>
                  )}
                </div>
                {/* Upload */}
                <div className="flex-1 w-full">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Ce logo apparaît dans votre dashboard et sur votre fiche publique. Format PNG, JPG ou SVG recommandé.
                  </p>
                  <label className={`cursor-pointer inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 ${logoUploading ? "opacity-60 cursor-not-allowed" : ""} ${svc.btnPrimary} text-white font-semibold rounded-xl transition-colors text-sm`}>
                    {logoUploading ? "⏳ Envoi en cours..." : "📷 Choisir un logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                    />
                  </label>
                  {logoSuccess && (
                    <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium flex items-center gap-1">
                      ✅ Logo mis à jour — visible dans votre header
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bouton mettre à jour */}
            <button
              onClick={() => navigate(`/inscription-pro?edit=${account.id}`)}
              className={`w-full min-h-[48px] px-5 py-3 ${svc.btnPrimary} text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2`}
            >
              ✏️ Modifier mes informations
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          MODAL : AJOUTER UN MEMBRE (carnet d'accès)
          ══════════════════════════════════════════ */}
      {showAddMember && (
        <AddPersonModal
          title="Trouver la personne à ajouter"
          myNumeroH={userData?.numeroH}
          myPrenom={userData?.prenom}
          myNom={userData?.nomFamille}
          onSelect={(numeroH) => addMember(numeroH, addMemberRole)}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {/* ══════════════════════════════════════════
          MODAL : REFUS AVEC RAISON
          ══════════════════════════════════════════ */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-xl">
                ❌
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Refuser la demande</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Indiquez une raison au patient (optionnel)</p>
              </div>
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex : Créneau non disponible, service non couvert, veuillez recontacter..."
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setRejectId(null); setRejectReason(""); }}
                className="flex-1 min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectId}
                className="flex-1 min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {actionLoading === rejectId ? "⏳ Envoi..." : "❌ Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL : RÉPONSE VIDÉO 30 s
          ══════════════════════════════════════════ */}
      {responseVideoId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">

            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
              📹 Réponse vidéo au patient
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {recording
                ? `Enregistrement en cours... ${countdown}s restantes`
                : videoSent
                ? "Vidéo envoyée avec succès !"
                : "Préparation de la caméra..."}
            </p>

            {recording && (
              <div className="relative mb-4">
                <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
                  ● REC {countdown}s
                </div>
                {/* Barre de progression */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-xl">
                  <div
                    className="h-full bg-red-500 transition-all duration-1000 rounded-b-xl"
                    style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                  />
                </div>
                <video ref={videoRef} className="w-full rounded-xl bg-black aspect-video object-cover" muted playsInline />
              </div>
            )}

            {!recording && videoSent && (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-green-600 dark:text-green-400 font-semibold">Vidéo envoyée au patient !</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Le rendez-vous a été accepté</p>
              </div>
            )}

            {!recording && !videoSent && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
              </div>
            )}

            {!recording && (
              <button
                onClick={() => { setResponseVideoId(null); setVideoSent(false); }}
                className="w-full min-h-[44px] mt-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
