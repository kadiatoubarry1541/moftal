import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bibliotheque } from "../components/ecole/CoursEtBibliotheque";
import BarreAppMembre from "../components/ecole/BarreAppMembre";
import { cheminConnexion } from "../utils/connexionRetour";

// Bibliothèque de l'école, pour ses membres (enseignants, élèves, parents) :
// livres et documents PDF classés par niveau. Les enseignants y publient aussi.

export default function BibliothequeEcole({ mode = "school" }: { mode?: "school" | "madrasa" }) {
  const madrasa = mode === "madrasa";
  const VERT = madrasa ? "#0891b2" : "#1a8f1a";
  const { tenantCode = "" } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [ecole, setEcole] = useState<{ nom: string; logo_url?: string | null } | null>(null);
  const connecte = !!localStorage.getItem("token");

  useEffect(() => {
    if (!connecte) navigate(cheminConnexion(), { replace: true });
  }, [connecte, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <BarreAppMembre mode={mode} tenantCode={tenantCode} nom={ecole?.nom} logoUrl={ecole?.logo_url} actif="bibliotheque" />
      <div className="max-w-xl mx-auto px-4 py-4">
        {connecte && <Bibliotheque tenantCode={tenantCode} apiName={madrasa ? "madrasa-mgmt" : "school-mgmt"} couleur={VERT} onEcole={setEcole} />}
      </div>
    </div>
  );
}
