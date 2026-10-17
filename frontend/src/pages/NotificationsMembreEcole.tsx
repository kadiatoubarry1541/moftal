import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import BarreAppMembre from "../components/ecole/BarreAppMembre";
import NotificationsApp from "../components/ecole/NotificationsApp";
import { cheminAppEcole, type ModeEcole } from "../utils/appEcole";
import { cheminConnexion } from "../utils/connexionRetour";

// Application de l'école → « Notifications » pour un parent ou un enseignant :
// il ne voit que les siennes (le serveur filtre).
export default function NotificationsMembreEcole({ mode }: { mode: ModeEcole }) {
  const { tenantCode = "" } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [ecole, setEcole] = useState<{ name?: string; logo_url?: string | null } | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate(cheminConnexion(), { replace: true }); return; }
    fetch(`${config.API_BASE_URL}/pro-public/${mode === "madrasa" ? "madrasa" : "school"}/${encodeURIComponent(tenantCode)}`)
      .then(r => r.json()).then(d => { if (d.success) setEcole(d.tenant); }).catch(() => {});
  }, [mode, tenantCode, navigate]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <BarreAppMembre mode={mode} tenantCode={tenantCode} nom={ecole?.name} logoUrl={ecole?.logo_url} actif="notifications" />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
        <NotificationsApp tenantCode={tenantCode} apiName={mode === "madrasa" ? "madrasa-mgmt" : "school-mgmt"} couleur={mode === "madrasa" ? "#0891b2" : "#1a8f1a"} />
      </div>
    </div>
  );
}
