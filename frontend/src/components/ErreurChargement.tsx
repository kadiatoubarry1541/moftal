import { useTraduction } from "../i18n/traduction";

// Le serveur n'a pas répondu : on le dit, avec un bouton pour réessayer.
// Jamais de fausses données à la place (règle : pas de « faux » succès).
export default function ErreurChargement({ visible, onRetry }: { visible: boolean; onRetry?: () => void }) {
  const { tr } = useTraduction();
  if (!visible) return null;
  return (
    <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "12px 16px", margin: "12px 0", fontSize: 14 }}>
      <span>⚠️ {tr("Impossible de charger la liste.")} {tr("Vérifiez votre connexion et réessayez.")}</span>
      {onRetry && (
        <button onClick={onRetry} style={{ background: "#dc2626", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {tr("Réessayer")}
        </button>
      )}
    </div>
  );
}
