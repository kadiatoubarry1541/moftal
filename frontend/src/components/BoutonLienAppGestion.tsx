import { useState } from "react";
import { config } from "../config/api";
import { lienAppGestion, copierTexte } from "../utils/lienAppGestion";
import { useTraduction } from "../i18n/traduction";

// Copier le lien de l'application de gestion d'un compte pro (admin ou
// propriétaire). La gestion est créée si elle n'existe pas encore.
export default function BoutonLienAppGestion({ accountId, type, tenantCode, className, style }: {
  accountId: string | number;
  type: string;
  tenantCode?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { tr } = useTraduction();
  const [etat, setEtat] = useState<"" | "attente" | "copie">("");
  const [erreur, setErreur] = useState("");

  const copier = async () => {
    if (etat === "attente") return;
    setErreur(""); setEtat("attente");
    try {
      let code = tenantCode || "";
      if (!code) {
        const r = await fetch(`${config.API_BASE_URL}/professionals/${accountId}/ensure-tenant`, {
          method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.tenantCode) { setErreur(d.message || "Impossible de préparer l'application."); setEtat(""); return; }
        code = d.tenantCode;
      }
      await copierTexte(lienAppGestion(type, code));
      setEtat("copie");
      setTimeout(() => setEtat(""), 2500);
    } catch {
      setErreur("Erreur de connexion. Vérifiez internet puis réessayez.");
      setEtat("");
    }
  };

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <button type="button" onClick={copier} disabled={etat === "attente"} className={className} style={style}>
        {etat === "copie" ? tr("✅ Lien copié") : etat === "attente" ? tr("⏳ Préparation…") : tr("🔗 Copier le lien de l'application")}
      </button>
      {erreur && <span style={{ fontSize: 11, color: "#b91c1c" }}>{tr(erreur)}</span>}
    </span>
  );
}
