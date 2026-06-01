import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5002";

interface ProAccount {
  id: string;
  type: string;
  name: string;
  description: string;
  city: string;
  status: string;
  created_at: string;
  subscriptionStatus?: "never_paid" | "active" | "overdue" | "blocked";
  subscriptionValidUntil?: string | null;
  billingInfo?: {
    proPaymentDetails?: string;
  } | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  clinic:          { label: "Clinique / Hôpital",       icon: "🏥" },
  security_agency: { label: "Agence de sécurité",        icon: "🛡️" },
  journalist:      { label: "Journaliste / Média",        icon: "📰" },
  enterprise:      { label: "Entreprise",                 icon: "🏢" },
  school:          { label: "École / Professeur",         icon: "🎓" },
  supplier:        { label: "Fournisseur / Grossiste",    icon: "📦" },
  vendor:          { label: "Vendeur",                    icon: "🛒" },
  producer:        { label: "Entreprise de production",   icon: "🏭" },
  broker:          { label: "Démarcheur / Location",      icon: "🏘️" },
  ngo:             { label: "ONG / Association",          icon: "🤝" },
  scientist:       { label: "Chercheur / Scientifique",  icon: "🔬" },
};

/* Couleur du bouton "Ouvrir le dashboard" selon le service */
const TYPE_TO_BTN: Record<string, string> = {
  clinic:          "bg-emerald-600 hover:bg-emerald-700",
  security_agency: "bg-slate-700   hover:bg-slate-800",
  journalist:      "bg-cyan-600    hover:bg-cyan-700",
  enterprise:      "bg-amber-500   hover:bg-amber-600",
  school:          "bg-amber-500   hover:bg-amber-600",
  supplier:        "bg-cyan-600    hover:bg-cyan-700",
  vendor:          "bg-cyan-600    hover:bg-cyan-700",
  producer:        "bg-cyan-600    hover:bg-cyan-700",
  broker:          "bg-cyan-600    hover:bg-cyan-700",
  ngo:             "bg-rose-600    hover:bg-rose-700",
  scientist:       "bg-indigo-600  hover:bg-indigo-700",
};

/* Badge couleur service */
const TYPE_TO_BADGE: Record<string, string> = {
  clinic:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  security_agency: "bg-slate-200   text-slate-700   dark:bg-slate-700 dark:text-slate-300",
  journalist:      "bg-cyan-100    text-cyan-700    dark:bg-cyan-900/40 dark:text-cyan-300",
  enterprise:      "bg-amber-100   text-amber-700   dark:bg-amber-900/40 dark:text-amber-300",
  school:          "bg-amber-100   text-amber-700   dark:bg-amber-900/40 dark:text-amber-300",
  supplier:        "bg-cyan-100    text-cyan-700    dark:bg-cyan-900/40 dark:text-cyan-300",
  vendor:          "bg-cyan-100    text-cyan-700    dark:bg-cyan-900/40 dark:text-cyan-300",
  producer:        "bg-cyan-100    text-cyan-700    dark:bg-cyan-900/40 dark:text-cyan-300",
  broker:          "bg-cyan-100    text-cyan-700    dark:bg-cyan-900/40 dark:text-cyan-300",
  ngo:             "bg-rose-100    text-rose-700    dark:bg-rose-900/40 dark:text-rose-300",
  scientist:       "bg-indigo-100  text-indigo-700  dark:bg-indigo-900/40 dark:text-indigo-300",
};

/* Label service affiché */
const TYPE_TO_SERVICE_LABEL: Record<string, string> = {
  clinic:          "Santé",
  security_agency: "Sécurité",
  journalist:      "Échanges",
  enterprise:      "Activité",
  school:          "Activité",
  supplier:        "Échanges",
  vendor:          "Échanges",
  producer:        "Échanges",
  broker:          "Échanges",
  ngo:             "Solidarité",
  scientist:       "Science",
};

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending:  { label: "En attente d'approbation", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  approved: { label: "Approuvé ✓",               cls: "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300"  },
  rejected: { label: "Rejeté",                   cls: "bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300"    },
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  never_paid: "🧾 En attente de paiement",
  active:     "✅ Abonnement actif",
  overdue:    "⚠️ En retard de paiement",
  blocked:    "⛔ Compte bloqué (impayé)",
};

export default function MesComptesPro() {
  const navigate = useNavigate();
  const [accounts, setAccounts]   = useState<ProAccount[]>([]);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState<string | null>(null); // id du compte en cours de paiement
  const [payError, setPayError]   = useState<string | null>(null);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/api/professionals/my-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAccounts(data.accounts || []);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (acc: ProAccount) => {
    setPayError(null);
    setPaying(acc.id);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/api/payment/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:      50000,
          currency:    "GNF",
          purpose:     "subscription_pro",
          relatedId:   acc.id,
          description: `Abonnement mensuel – ${acc.name}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setPayError(data.message || "Impossible d'initier le paiement. Réessayez.");
      }
    } catch {
      setPayError("Erreur de connexion. Vérifiez votre connexion internet.");
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/compte")}
            className="min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-medium transition-colors"
          >
            ← Retour
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Mes comptes professionnels
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gérez et accédez à vos dashboards par service
            </p>
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-gray-500 dark:text-gray-400">Chargement...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Aucun compte professionnel
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
              Vous n'avez pas encore de compte professionnel.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Créez-en un dans{" "}
              <button
                onClick={() => navigate("/inscription-pro")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Inscription Pro
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => {
              const typeInfo   = TYPE_LABELS[acc.type]      || { label: acc.type, icon: "📄" };
              const statusInfo = STATUS_STYLES[acc.status]  || { label: acc.status, cls: "bg-gray-100 text-gray-700" };
              const btnClass   = TYPE_TO_BTN[acc.type]      || "bg-blue-600 hover:bg-blue-700";
              const badgeClass = TYPE_TO_BADGE[acc.type]    || "bg-gray-100 text-gray-700";
              const svcLabel   = TYPE_TO_SERVICE_LABEL[acc.type] || "";
              const subStatus  = acc.subscriptionStatus || "never_paid";
              const now = new Date();
              const expiry = acc.subscriptionValidUntil ? new Date(acc.subscriptionValidUntil) : null;
              const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
              const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
              const isExpired = expiry ? expiry < now : false;
              const canOpenDashboard = acc.status === "approved" && subStatus === "active" && !isExpired;

              return (
                <div
                  key={acc.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  {/* Icône */}
                  <div className={`w-14 h-14 rounded-2xl ${badgeClass} flex items-center justify-center text-3xl flex-shrink-0`}>
                    {typeInfo.icon}
                  </div>

                  {/* Info principale */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-base">{acc.name}</span>
                      {svcLabel && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}>
                          {svcLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {typeInfo.label}
                      {acc.city ? ` · ${acc.city}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Créé le {new Date(acc.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>

                  {/* Statut compte + abonnement */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                    {acc.status === "approved" && (
                      <>
                        <span className={`px-3 py-1 text-[11px] font-medium rounded-full ${
                          expiringSoon ? "bg-orange-100 text-orange-700" :
                          isExpired ? "bg-red-100 text-red-700" :
                          "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                        }`}>
                          {expiringSoon
                            ? `⚠️ Expire dans ${daysLeft}j`
                            : isExpired
                            ? "⛔ Abonnement expiré"
                            : SUBSCRIPTION_LABELS[subStatus] || "Abonnement"}
                        </span>
                        {expiry && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {isExpired ? "Expiré le" : "Valide jusqu'au"} {expiry.toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bouton dashboard */}
                  {canOpenDashboard && (
                    <button
                      onClick={() => navigate(`/espace-pro/${acc.id}`)}
                      className={`min-h-[42px] px-5 py-2 ${btnClass} text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0 flex items-center gap-2`}
                    >
                      📊 Mon dashboard
                    </button>
                  )}

                  {acc.status === "approved" && !canOpenDashboard && (
                    <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                      <p className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${
                        expiringSoon
                          ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                          : isExpired
                          ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                          : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                      }`}>
                        {expiringSoon
                          ? `⚠️ Expire dans ${daysLeft}j`
                          : isExpired
                          ? "⛔ Abonnement expiré"
                          : "🔒 Abonnement requis"}
                      </p>
                      <button
                        onClick={() => handlePay(acc)}
                        disabled={paying === acc.id}
                        className="min-h-[42px] px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                      >
                        {paying === acc.id ? (
                          <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Chargement...</>
                        ) : (
                          <>{isExpired || expiringSoon ? "🔄 Renouveler (50 000 GNF)" : "💳 Payer l'abonnement (50 000 GNF)"}</>
                        )}
                      </button>
                    </div>
                  )}

                  {acc.status === "pending" && (
                    <div className="flex-shrink-0 text-xs text-yellow-600 dark:text-yellow-400 font-medium bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-xl">
                      ⏳ En cours de vérification par l'équipe
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Erreur paiement */}
        {payError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <span>❌</span>
            <span>{payError}</span>
            <button onClick={() => setPayError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Bouton créer un nouveau compte */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/inscription-pro")}
            className="min-h-[44px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            + Créer un nouveau compte professionnel
          </button>
        </div>
      </div>
    </div>
  );
}
