import InstallAppButton from "./InstallAppButton";
import AbonnementGestion from "./AbonnementGestion";
import { useProBrand } from "./proBrand";
import { getSessionUser, isAdmin } from "../utils/auth";
import { useState } from "react";
import { useTraduction } from "../i18n/traduction";
import { lienAppGestionIci, copierTexte } from "../utils/lienAppGestion";

// Réglages de l'espace pro rangés dans les Paramètres : l'application (installer /
// déjà installée) et l'abonnement. (L'identifiant : TenantCodeCard.) Rien de tout ça n'encombre le reste de la gestion.
// Lien de cette application, à donner aux employés : ils l'installent, puis
// n'ont que les droits donnés dans « Employés »
function CopierLienApplication({ couleur }: { couleur: string }) {
  const { tr } = useTraduction();
  const [copie, setCopie] = useState(false);
  const lien = lienAppGestionIci();
  if (!lien) return null;
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
      <button type="button" onClick={async () => { await copierTexte(lien); setCopie(true); setTimeout(() => setCopie(false), 2500); }}
        style={{ padding: "8px 14px", background: "white", color: couleur, border: `1.5px solid ${couleur}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        {copie ? tr("✅ Lien copié") : tr("🔗 Copier le lien de l'application")}
      </button>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>{tr("Pour vos employés : ils installent l'application et n'ont que les droits que vous leur donnez dans « Employés ».")}</p>
    </div>
  );
}

export default function ParametresEspacePro() {
  const brand = useProBrand();
  const { tr } = useTraduction();
  if (isAdmin(getSessionUser())) return null;
  return (
    <>
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{tr("Application")}</h3>
        <InstallAppButton variant="settings" name={brand?.name} logoUrl={brand?.logoUrl} themeColor={brand?.color} label={tr("Installer l'application")} />
        <CopierLienApplication couleur={brand?.color || "#0f172a"} />
      </div>
      <AbonnementGestion />
    </>
  );
}
