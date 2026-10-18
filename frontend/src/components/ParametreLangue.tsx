import ChoixLangueEcole from "./ChoixLangueEcole";
import { useTraduction } from "../i18n/traduction";

// Réglage « Langue », rangé dans les Paramètres (jamais posé dans une page).
// Sur les sites publics, c'est le bouton « Langue » en haut à droite (LangButton).
export default function ParametreLangue() {
  const { tr } = useTraduction();
  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{tr("Langue")}</h3>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{tr("Langue d'affichage sur cet appareil")}</p>
      </div>
      <ChoixLangueEcole />
    </div>
  );
}
