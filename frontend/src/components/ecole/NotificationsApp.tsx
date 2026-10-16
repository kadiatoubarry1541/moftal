import { useEffect, useState } from "react";
import { config } from "../../config/api";
import { useTraduction } from "../../i18n/traduction";

// Notifications dans l'application de l'école. Le serveur décide qui voit quoi :
// le responsable (propriétaire, co-responsable « tous les droits ») voit toutes
// celles de l'établissement ; chaque autre personne ne voit que les siennes.

interface NotifApp { id: number; type: string; titre?: string | null; message: string; created_at: string; destinataire?: string | null }

export default function NotificationsApp({ tenantCode, apiName, couleur }: { tenantCode: string; apiName: string; couleur: string }) {
  const { tr, locale } = useTraduction();
  const [liste, setListe] = useState<NotifApp[] | null>(null);
  const [tout, setTout] = useState(false);
  const [erreur, setErreur] = useState("");
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/${apiName}/${encodeURIComponent(tenantCode)}/notifications-app`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => { if (ok && d.success) { setListe(d.notifications); setTout(!!d.tout); setErreur(""); } else setErreur(d.message || "Impossible de charger les notifications."); })
      .catch(() => setErreur("Erreur de connexion. Réessayez."));
  }, [apiName, tenantCode, essai]);

  const date = (d: string) => new Date(d).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        {tout ? tr("Vous êtes responsable : vous voyez toutes les notifications envoyées par l'établissement.") : tr("Vos notifications de cet établissement.")}
      </p>
      {erreur && (
        <div style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", borderRadius: 8, padding: "10px 12px" }}>
          {tr(erreur)} <button onClick={() => setEssai(n => n + 1)} style={{ marginInlineStart: 8, background: "none", border: "none", color: couleur, fontWeight: 700, cursor: "pointer" }}>{tr("🔄 Réessayer")}</button>
        </div>
      )}
      {liste === null && !erreur && <p style={{ fontSize: 13, color: "#64748b" }}>{tr("Chargement…")}</p>}
      {liste?.length === 0 && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{tr("Aucune notification pour le moment.")}</div>
      )}
      {liste?.map(n => (
        <div key={n.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{tr(n.titre || "Notification")}</p>
            <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{date(n.created_at)}</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{n.message}</p>
          {tout && n.destinataire && <p style={{ margin: "6px 0 0", fontSize: 11, color: couleur, fontWeight: 600 }}>{tr("Pour : {nom}", { nom: n.destinataire })}</p>}
        </div>
      ))}
    </div>
  );
}
