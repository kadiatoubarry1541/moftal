import { useNavigate } from "react-router-dom";
import { TenantLogo, goToMoftal, MoftalMark } from "./GestionBrand";
import InstallAppButton from "./InstallAppButton";
import { getSessionUser } from "../utils/auth";
import { useTraduction } from "../i18n/traduction";

// Écran d'une application de gestion ouverte par quelqu'un qui n'y a pas (encore)
// accès — par exemple un employé qui a reçu le lien. Il peut quand même
// installer l'application ; dès que le propriétaire l'ajoute dans « Employés »,
// il la rouvre et retrouve ses droits.
export default function AccesRefuseGestion({ message, couleur = "#0f172a", emoji = "🏢" }: {
  message?: string | null;
  couleur?: string;
  emoji?: string;
}) {
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const tenantCode = window.location.pathname.split("/")[2] || "";
  const user = getSessionUser() as { prenom?: string; nomFamille?: string } | null;
  const nom = [user?.prenom, user?.nomFamille].filter(Boolean).join(" ");
  // Ce n'est pas toujours une question de droits : abonnement à régler (le
  // propriétaire lui-même) ou serveur injoignable — on dit alors la vraie raison
  const texte = message || "";
  const abonnement = /abonnement|formule/i.test(texte);
  const reseau = !abonnement && /joindre le serveur|connexion|network|fetch/i.test(texte);

  const autreCompte = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("session_user");
    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`, { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, background: "white", borderRadius: 20, border: "1px solid #e2e8f0", padding: "28px 24px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <TenantLogo tenantCode={tenantCode} fallback={emoji} size={72} radius={18} style={{ border: "1px solid #e2e8f0" }} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
          {abonnement ? tr("Abonnement de la gestion à régler") : reseau ? tr("Connexion impossible") : tr("Vous n'avez pas encore accès à cette gestion")}
        </h1>
        {nom && <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px" }}>{tr("Connecté(e) : {nom}", { nom })}</p>}
        {abonnement || reseau ? (
          <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: "0 0 6px" }}>{reseau ? tr("Vérifiez votre connexion internet puis réessayez.") : tr(texte)}</p>
        ) : (<>
          <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: "0 0 6px" }}>
            {tr("Le responsable de l'établissement doit vous ajouter dans « Employés » avec votre NuméroH (page Identité). Ensuite, rouvrez cette application : vous aurez vos droits.")}
          </p>
          {message && <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px" }}>{tr(message)}</p>}
        </>)}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 8 }}>
          {!abonnement && !reseau && <InstallAppButton variant="settings" themeColor={couleur} label={tr("Installer l'application")} />}
          <button type="button" onClick={() => window.location.reload()}
            style={{ width: "100%", padding: 12, background: couleur, color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {tr("🔄 Réessayer")}
          </button>
          <button type="button" onClick={autreCompte}
            style={{ width: "100%", padding: 12, background: "white", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {tr("Se connecter avec un autre compte")}
          </button>
          <button type="button" onClick={() => goToMoftal(navigate)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", color: "#475569", border: "none", fontSize: 13, cursor: "pointer" }}>
            <MoftalMark /> {tr("Retour sur Moftal")}
          </button>
        </div>
      </div>
    </div>
  );
}
