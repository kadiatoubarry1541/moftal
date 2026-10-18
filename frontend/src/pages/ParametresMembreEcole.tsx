import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import BarreAppMembre from "../components/ecole/BarreAppMembre";
import ParametreLangue from "../components/ParametreLangue";
import { type ModeEcole } from "../utils/appEcole";
import { cheminConnexion } from "../utils/connexionRetour";

// Application de l'école → « Paramètres » pour un parent ou un enseignant :
// la langue d'affichage (jamais posée dans les autres pages).
export default function ParametresMembreEcole({ mode }: { mode: ModeEcole }) {
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
      <BarreAppMembre mode={mode} tenantCode={tenantCode} nom={ecole?.name} logoUrl={ecole?.logo_url} actif="parametres" />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
        <ParametreLangue />
      </div>
    </div>
  );
}
