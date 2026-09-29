import InstallAppButton from "./InstallAppButton";
import AbonnementGestion from "./AbonnementGestion";
import { useProBrand } from "./proBrand";
import { getSessionUser, isAdmin } from "../utils/auth";

// Réglages de l'espace pro rangés dans les Paramètres : l'application (installer /
// déjà installée) et l'abonnement. (L'identifiant : TenantCodeCard.) Rien de tout ça n'encombre le reste de la gestion.
export default function ParametresEspacePro() {
  const brand = useProBrand();
  if (isAdmin(getSessionUser())) return null;
  return (
    <>
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Application</h3>
        <InstallAppButton variant="settings" name={brand?.name} logoUrl={brand?.logoUrl} themeColor={brand?.color} label="Installer l'application" />
      </div>
      <AbonnementGestion />
    </>
  );
}
