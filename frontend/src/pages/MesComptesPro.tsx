import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PaymentModal from "../components/PaymentModal";

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
  gestionInterneValidUntil?: string | null;
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
  const [payModal, setPayModal] = useState<{
    accountId: string; amount: number; purpose: string; description: string;
  } | null>(null);

  // Prix par compte (chargés dynamiquement depuis le backend)
  const [prix, setPrix] = useState<Record<string, any>>({});
  const [paiementModal, setPaiementModal] = useState<{ acc: ProAccount; mode: 'visibilite' | 'gestion' } | null>(null);
  const [periodeChoisie, setPeriodeChoisie] = useState<'mois' | 'an' | 'cinqAns'>('mois');

  const token = localStorage.getItem("token");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API}/api/professionals/my-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const accs = data.accounts || [];
        setAccounts(accs);
        // Charger les prix pour chaque compte
        accs.forEach((acc: ProAccount) => {
          fetch(`${API}/api/payment/prix-compte-pro?proId=${acc.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json()).then(d => {
            if (d.success) setPrix(prev => ({ ...prev, [acc.id]: d }));
          }).catch(() => {});
        });
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = (acc: ProAccount, mode: 'visibilite' | 'gestion', periode: 'mois' | 'an' | 'cinqAns') => {
    setPayError(null);
    const purposeMap = {
      visibilite: { mois: 'visibilite_mois', an: 'visibilite_an', cinqAns: 'visibilite_5ans' },
      gestion:    { mois: 'gestion_mois',    an: 'gestion_an',    cinqAns: 'gestion_5ans' },
    };
    const purpose = purposeMap[mode][periode];
    const p = prix[acc.id];
    const montant = p ? p[mode === 'visibilite' ? 'visibilite' : 'gestionInterne'][periode] : 0;
    const periodeLabel = periode === 'mois' ? 'mensuel' : periode === 'an' ? 'annuel' : '5 ans';
    const modeLabel = mode === 'visibilite' ? 'Visibilité' : 'Gestion Interne';

    setPayModal({
      accountId: acc.id,
      amount: montant,
      purpose,
      description: `${modeLabel} ${periodeLabel} — ${acc.name}`,
    });
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
              const typeInfo   = TYPE_LABELS[acc.type]           || { label: acc.type, icon: "📄" };
              const statusInfo = STATUS_STYLES[acc.status]        || { label: acc.status, cls: "bg-gray-100 text-gray-700" };
              const btnClass   = TYPE_TO_BTN[acc.type]            || "bg-blue-600 hover:bg-blue-700";
              const badgeClass = TYPE_TO_BADGE[acc.type]          || "bg-gray-100 text-gray-700";
              const svcLabel   = TYPE_TO_SERVICE_LABEL[acc.type]  || "";
              const subStatus  = acc.subscriptionStatus || "never_paid";
              const now        = new Date();

              // ── Visibilité (Niveau 1) ────────────────────────────────────────
              const expiry      = acc.subscriptionValidUntil ? new Date(acc.subscriptionValidUntil) : null;
              const daysLeft    = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
              const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
              const isExpired    = expiry ? expiry < now : false;
              const hasVisibilite = acc.status === "approved" && subStatus === "active" && !isExpired;

              // ── Gestion Interne (Niveau 2) ───────────────────────────────────
              const giExpiry   = acc.gestionInterneValidUntil ? new Date(acc.gestionInterneValidUntil) : null;
              const hasGI      = giExpiry ? giExpiry > now : false;
              const giDaysLeft = giExpiry ? Math.ceil((giExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

              const canOpenDashboard = hasVisibilite || hasGI;

              return (
                <div
                  key={acc.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                        {/* Badge tier actif */}
                        {hasGI && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">
                            ⚡ Gestion Interne
                          </span>
                        )}
                        {hasVisibilite && !hasGI && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">
                            👁️ Visibilité
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {typeInfo.label}{acc.city ? ` · ${acc.city}` : ""}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Créé le {new Date(acc.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>

                    {/* Statut compte + dates d'expiration */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                      {acc.status === "approved" && hasGI && giDaysLeft !== null && (
                        <span className={`px-3 py-1 text-[11px] font-medium rounded-full ${
                          giDaysLeft <= 7 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                        }`}>
                          {giDaysLeft <= 7 ? `⚠️ GI expire dans ${giDaysLeft}j` : `⚡ GI valide ${giDaysLeft}j`}
                        </span>
                      )}
                      {acc.status === "approved" && hasVisibilite && !hasGI && expiry && (
                        <>
                          <span className={`px-3 py-1 text-[11px] font-medium rounded-full ${
                            expiringSoon ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {expiringSoon ? `⚠️ Expire dans ${daysLeft}j` : `👁️ Valide ${daysLeft}j`}
                          </span>
                        </>
                      )}
                      {acc.status === "approved" && !hasVisibilite && !hasGI && (
                        <span className={`px-3 py-1 text-[11px] font-medium rounded-full ${
                          isExpired ? "bg-red-100 text-red-700" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                        }`}>
                          {isExpired ? "⛔ Expiré" : SUBSCRIPTION_LABELS[subStatus] || "🔒 Non activé"}
                        </span>
                      )}
                    </div>

                    {/* Boutons d'accès selon le tier */}
                    {canOpenDashboard && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {hasGI && (
                          <button
                            onClick={() => navigate("/gestion-interne")}
                            className="min-h-[40px] px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                          >
                            ⚡ Gestion Interne
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/espace-pro/${acc.id}`)}
                          className={`min-h-[40px] px-4 py-2 ${hasGI ? "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200" : `${btnClass} text-white`} text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap`}
                        >
                          📅 Mes Rendez-vous
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Paywall — formules d'abonnement */}
                  {acc.status === "approved" && !canOpenDashboard && (
                    <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                      {isExpired ? (
                        <p className="text-xs font-bold text-red-600 mb-3">⛔ Abonnement expiré — choisissez une formule pour réactiver</p>
                      ) : (
                        <p className="text-xs font-bold text-amber-600 mb-3">🔒 Choisissez votre formule pour activer votre compte</p>
                      )}

                      {prix[acc.id] ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                          {/* ── Niveau 1 : Visibilité + Rendez-vous ── */}
                          <div className="border border-blue-200 rounded-xl p-3 bg-blue-50 dark:bg-blue-900/10">
                            <p className="font-bold text-blue-800 dark:text-blue-300 text-xs mb-0.5">👁️ Visibilité + Rendez-vous</p>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-2 leading-tight">
                              Profil public · Recevoir des rendez-vous · Vitrine
                            </p>
                            {(['mois','an','cinqAns'] as const).map(p => (
                              <button key={p}
                                onClick={() => handlePay(acc, 'visibilite', p)}
                                disabled={paying === acc.id}
                                className="w-full text-left px-3 py-2 mb-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-700 border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50 flex justify-between items-center"
                              >
                                <span>{p === 'mois' ? '📅 Mensuel' : p === 'an' ? '📆 Annuel' : '🏆 5 ans'}</span>
                                <span className="text-blue-700 dark:text-blue-300 font-bold">
                                  {prix[acc.id].visibilite[p].toLocaleString('fr-GN')} GNF
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* ── Niveau 2 : Gestion Interne (tout inclus) ── */}
                          <div className="border-2 border-green-400 rounded-xl p-3 bg-green-50 dark:bg-green-900/10">
                            <div className="flex items-center gap-1 mb-0.5">
                              <p className="font-bold text-green-800 dark:text-green-300 text-xs">⚡ Gestion Interne</p>
                              <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-bold">Complet</span>
                            </div>
                            <p className="text-[11px] text-green-700 dark:text-green-400 mb-2 leading-tight">
                              Inclut Visibilité + Rendez-vous + Gestion complète
                            </p>
                            {(['mois','an','cinqAns'] as const).map(p => (
                              <button key={p}
                                onClick={() => handlePay(acc, 'gestion', p)}
                                disabled={paying === acc.id}
                                className="w-full text-left px-3 py-2 mb-1.5 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex justify-between items-center"
                              >
                                <span>{p === 'mois' ? '📅 Mensuel' : p === 'an' ? '📆 Annuel' : '🏆 5 ans'}</span>
                                <span>{prix[acc.id].gestionInterne[p].toLocaleString('fr-GN')} GNF</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 animate-pulse">Chargement des prix...</div>
                      )}
                      {paying === acc.id && (
                        <p className="text-xs text-blue-600 mt-2 text-center">⏳ Redirection vers le paiement...</p>
                      )}
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

      {payModal && (
        <PaymentModal
          isOpen={!!payModal}
          onClose={() => setPayModal(null)}
          onSuccess={() => {
            setPayModal(null);
            loadAccounts();
          }}
          amount={payModal.amount}
          currency="GNF"
          purpose={payModal.purpose}
          relatedId={payModal.accountId}
          description={payModal.description}
        />
      )}
    </div>
  );
}
