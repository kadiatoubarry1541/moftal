import { useLocation } from "react-router-dom";
import { getSessionUser, estAncienAdmin } from "../utils/auth";
import { useTraduction } from "../i18n/traduction";

// Compte de consultation (ancien compte administrateur) : il se connecte et
// regarde, mais ne peut rien modifier. Le serveur refuse toute modification ;
// ce bandeau le dit clairement, en haut de l'écran.
export default function BandeauConsultation() {
  useLocation(); // relu à chaque changement de page (connexion, déconnexion)
  const { tr } = useTraduction();
  const u = getSessionUser() as { numeroH?: string } | null;
  if (!u || !estAncienAdmin(u.numeroH)) return null;
  return (
    <div role="status" style={{ position: "sticky", top: 0, zIndex: 9997, background: "#334155", color: "white", fontSize: 13, fontWeight: 600, textAlign: "center", padding: "6px 12px" }}>
      👁️ {tr("Compte de consultation : vous pouvez regarder, mais rien modifier.")}
    </div>
  );
}
