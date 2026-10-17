import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { droitsMembreEcole, cheminAppEcole } from "../utils/appEcole";
import { ADMIN_SERVICES } from "./EspaceProModals";
import { TenantLogo, goToMoftal, MoftalMark } from "./GestionBrand";
import InstallAppButton from "./InstallAppButton";
import { getSessionUser } from "../utils/auth";
import { useTraduction } from "../i18n/traduction";

// Application de gestion ouverte par quelqu'un qui n'est ni le propriétaire ni
// un employé : c'est un client. Il arrive sur le site de l'établissement — un
// parent d'élève ou un enseignant reste dans l'application, sur son espace
// (ses enfants, ses cours). Si le site n'existe pas, cet
// écran explique comment se faire ajouter (et permet d'installer quand même).
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

  const [redirection, setRedirection] = useState(true);
  // Lien de l'application ouvert pour l'installer (?installer=1) : le client peut
  // l'installer aussi — elle s'ouvrira ensuite sur le site de l'établissement.
  const [pourInstaller] = useState(() => new URLSearchParams(window.location.search).get("installer") === "1");
  const [siteClient, setSiteClient] = useState<string | null>(null);

  // Client : site de l'établissement ; parent ou enseignant : son espace dans l'application
  useEffect(() => {
    if (abonnement || reseau) { setRedirection(false); return; }
    const segment = window.location.pathname.split("/")[1] || "";
    const service = ADMIN_SERVICES.find(sv => segment === sv.path || segment.startsWith(`${sv.path}-`));
    const vitrine = service?.vitrinePath;
    if (!vitrine || !tenantCode) { setRedirection(false); return; }
    let fini = false;
    (async () => {
      // École / madrasa : parents et enseignants restent dans l'application,
      // chacun dans son espace (ses enfants, ses cours)
      if (service.type === "school" || service.type === "madrasa") {
        const droits = await droitsMembreEcole(service.type, tenantCode);
        const page = droits.enseignant ? "enseignant" : droits.parent ? "parent" : null;
        // « ?installer=1 » gardé : l'installation est proposée dans son espace
        if (!fini && page) { navigate(cheminAppEcole(service.type, tenantCode, page) + window.location.search, { replace: true }); return; }
      }
      if (fini) return;
      const site = `/${vitrine}/${tenantCode}`;
      if (pourInstaller) { setSiteClient(site); setRedirection(false); return; }
      // Client : pas de bouton « Retour à la gestion » sur le site (il n'y a pas accès)
      navigate(site, { replace: true, state: { sansRetourGestion: true } });
    })();
    return () => { fini = true; };
  }, [abonnement, reseau, tenantCode, navigate, pourInstaller]);

  const autreCompte = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("session_user");
    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`, { replace: true });
  };

  if (redirection) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${couleur}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (siteClient) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, background: "white", borderRadius: 20, border: "1px solid #e2e8f0", padding: "28px 24px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <TenantLogo tenantCode={tenantCode} fallback={emoji} size={72} radius={18} style={{ border: "1px solid #e2e8f0" }} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>{tr("Installer l'application")}</h1>
        <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: "0 0 16px" }}>
          {tr("Gardez l'application de l'établissement sur votre téléphone : elle s'ouvre sur son site (rendez-vous, actualités, contacts).")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <InstallAppButton variant="settings" themeColor={couleur} label={tr("Installer l'application")} />
          <button type="button" onClick={() => navigate(siteClient, { replace: true, state: { sansRetourGestion: true } })}
            style={{ width: "100%", padding: 12, background: couleur, color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {tr("🌐 Voir le site")}
          </button>
        </div>
      </div>
    </div>
  );

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
            {tr("Le responsable de l'établissement doit vous ajouter dans « Employés » avec votre téléphone, votre e-mail ou votre NuméroH. Ensuite, rouvrez cette application : vous aurez vos droits.")}
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
