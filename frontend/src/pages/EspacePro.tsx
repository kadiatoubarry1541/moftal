import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PaymentModal from "../components/PaymentModal";

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
  services: string[];
  specialties: string[];
  status: string;
  ownerNumeroH: string;
  subscriptionStatus?: "never_paid" | "active" | "overdue" | "blocked";
  subscriptionValidUntil?: string | null;
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

type TabType = "pending" | "history" | "profile";
type HistoryFilter = "all" | "accepted" | "rejected";

/* =============================================
   MAPPING TYPE PROFESSIONNEL → SERVICE
   ============================================= */
const TYPE_TO_SERVICE: Record<string, string> = {
  clinic:           "sante",
  enterprise:       "activite",
  school:           "activite",
  scientist:        "science",
  ngo:              "solidarite",
  security_agency:  "securite",
  supplier:         "echanges",
  vendor:           "echanges",
  producer:         "echanges",
  broker:           "echanges",
  journalist:       "echanges",
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
  broker:          { label: "Démarcheur / Location",         icon: "🏘️" },
  scientist:       { label: "Chercheur / Scientifique",      icon: "🔬" },
  ngo:             { label: "ONG / Association",             icon: "🤝" },
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

        <p className="text-xs text-gray-400 mb-3">Orange Money • Wave • Visa • Mastercard</p>

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
          userData={userData}
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

  // Vidéo réponse
  const [responseVideoId, setResponseVideoId]   = useState<string | null>(null);
  const [recording, setRecording]               = useState(false);
  const [countdown, setCountdown]               = useState(30);
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

  /* ---- Chargement initial ---- */
  useEffect(() => { loadAccount(); }, [id]);

  const loadAccount = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/professionals/detail/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAccount(data.account);
        await loadAppointments(data.account.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      setCountdown(30);

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

  // Si l'abonnement n'est pas actif, on bloque tout le dashboard pro avec bouton de paiement
  if (account.status === "approved" && account.subscriptionStatus && account.subscriptionStatus !== "active") {
    return (
      <SubscriptionPaymentWall account={account} userData={userData} onSuccess={() => window.location.reload()} />
    );
  }

  /* ============================================================
     RENDU PRINCIPAL
     ============================================================ */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

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
          </div>

          {/* Identité du compte */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-inner">
              {typeInfo.icon}
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
          ONGLETS DE NAVIGATION
          ══════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-[72px] z-40 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex">
            {([
              { key: "pending"  as TabType, icon: "⏳", label: "Demandes",   badge: pendingApts.length },
              { key: "history"  as TabType, icon: "📋", label: "Historique", badge: 0 },
              { key: "profile"  as TabType, icon: "👤", label: "Mon profil", badge: 0 },
            ] as const).map((t) => (
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
                              Message vidéo du patient (30 secondes)
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

                      {/* Boutons d'action */}
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
                    style={{ width: `${((30 - countdown) / 30) * 100}%` }}
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
