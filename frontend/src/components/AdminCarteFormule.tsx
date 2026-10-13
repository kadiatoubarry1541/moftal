import { useState } from "react";
import { config } from "../config/api";
import BoutonLienAppGestion from "./BoutonLienAppGestion";
import { getTypeInfo } from "./EspaceProModals";

// Vue admin d'un espace pro : la formule en clair, pour la changer, ouvrir la
// gestion du pro et copier le lien de SON application (celui qui installe la
// gestion — pas l'ancien lien client /installer-app).
export default function AdminCarteFormule({ account }: {
  account: { id: string; name: string; type: string; status: string; planType?: string | null; tenant_code?: string | null };
}) {
  const [planType, setPlanType] = useState(account.planType === "visibility" ? "visibility" : "full");
  const [tenantCode, setTenantCode] = useState(account.tenant_code || "");
  const [envoi, setEnvoi] = useState(false);
  const complete = planType === "full";
  const auth = { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };

  const changer = async () => {
    const cible = complete ? "visibility" : "full";
    const libelle = cible === "full" ? "🔧 Gestion complète (Visibilité + Gestion Interne)" : "📅 Visibilité + Rendez-vous";
    if (!window.confirm(`Mettre « ${account.name} » en formule ${libelle} ?`)) return;
    setEnvoi(true);
    try {
      const r = await fetch(`${config.API_BASE_URL}/professionals/admin/${account.id}/formule`, {
        method: "PUT", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ planType: cible }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { alert(d.message || "La formule n'a pas pu être changée."); return; }
      setPlanType(cible);
      // Gestion complète : la gestion interne est créée tout de suite
      if (cible === "full" && !tenantCode && account.status === "approved") {
        const e = await fetch(`${config.API_BASE_URL}/professionals/${account.id}/ensure-tenant`, { method: "POST", headers: auth })
          .then(x => x.json()).catch(() => ({}));
        if (e.tenantCode) setTenantCode(e.tenantCode);
      }
      // Toute la page suit la nouvelle formule (onglets, application…)
      window.location.reload();
    } catch {
      alert("Erreur de connexion. Vérifiez internet puis réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-3">
      <div className="bg-white rounded-xl border-2 border-amber-300 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Formule :</span>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${complete ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-800"}`}>
            {complete ? "🔧 Gestion complète" : "📅 Visibilité + Rendez-vous"}
          </span>
          <button onClick={changer} disabled={envoi} className="ml-auto px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white disabled:opacity-60">
            {envoi ? "⏳…" : complete ? "⇄ Passer en Visibilité + RDV" : "⇄ Passer en Gestion complète"}
          </button>
        </div>
        {complete && account.status === "approved" && (
          <div className="mt-3 flex flex-wrap items-start gap-2">
            {tenantCode && (
              <a href={`/${getTypeInfo(account.type).path}/${tenantCode}`}
                className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-semibold">📂 Ouvrir sa gestion</a>
            )}
            <BoutonLienAppGestion accountId={account.id} type={account.type} tenantCode={tenantCode || null}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-semibold" />
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          {complete
            ? "Envoyez ce lien au propriétaire : il se connecte avec son téléphone ou son e-mail et installe sa gestion."
            : "Cette formule n'a pas d'application de gestion à installer."}
        </p>
      </div>
    </div>
  );
}
