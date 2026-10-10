import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { subscribeOfflineStatus, syncNow, reessayerOperation, retirerOperation, type OfflineStatus } from "../utils/offlineSync";

// Pages qui fonctionnent hors connexion : toutes les gestions internes
const OFFLINE_PAGES = /^\/(gestion-[a-z0-9-]+|clinique|ecole|madrasa)(\/|$|-)/;

// Petit bandeau : « Hors connexion », « N opérations en attente », « Synchronisé ».
export default function OfflineStatusBar() {
  const { pathname } = useLocation();
  const [s, setS] = useState<OfflineStatus | null>(null);
  const [justSynced, setJustSynced] = useState(0);
  const [voirRefus, setVoirRefus] = useState(false);

  useEffect(() => subscribeOfflineStatus(setS), []);

  useEffect(() => {
    const onSynced = (e: Event) => {
      setJustSynced((e as CustomEvent).detail?.sent || 0);
      setTimeout(() => setJustSynced(0), 6000);
    };
    window.addEventListener("moftal-offline-synced", onSynced);
    return () => window.removeEventListener("moftal-offline-synced", onSynced);
  }, []);

  if (!s) return null;
  const onOfflinePage = OFFLINE_PAGES.test(pathname);
  const offline = !s.online;

  let bg = "";
  let text = "";
  let action: { label: string; onClick: () => void } | null = null;

  const nbRefus = s.rejetes?.length || 0;

  if (s.syncing) {
    bg = "#0369a1";
    text = `⏳ Envoi des données enregistrées hors connexion… (${s.pending})`;
  } else if (nbRefus > 0) {
    // Opérations refusées par le serveur : jamais effacées en silence
    bg = "#b91c1c";
    text = `⚠️ ${nbRefus} opération(s) faite(s) hors connexion refusée(s) par le serveur`;
    action = { label: "Voir", onClick: () => setVoirRefus(true) };
  } else if (s.lastErrors.length) {
    bg = "#b91c1c";
    text = `⚠️ ${s.lastErrors[0]}`;
    if (s.pending > 0) action = { label: "Réessayer", onClick: () => void syncNow() };
  } else if (offline && onOfflinePage) {
    bg = "#92400e";
    text =
      s.pending > 0
        ? `📴 Hors connexion — ${s.pending} opération(s) sauvegardée(s) sur l'appareil, envoi automatique au retour de la connexion`
        : "📴 Hors connexion — vous pouvez continuer à travailler, tout est sauvegardé sur l'appareil";
  } else if (s.pending > 0) {
    bg = "#92400e";
    text = `🕓 ${s.pending} opération(s) en attente d'envoi`;
    action = { label: "Envoyer", onClick: () => void syncNow() };
  } else if (justSynced > 0) {
    bg = "#047857";
    text = `✅ ${justSynced} opération(s) envoyée(s) en ligne`;
    action = { label: "Actualiser", onClick: () => window.location.reload() };
  } else {
    return null;
  }

  const fenetreRefus = voirRefus && nbRefus > 0 && (
    <div style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setVoirRefus(false)}>
      <div style={{ background: "white", width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto", borderRadius: "16px 16px 0 0", padding: 16 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong style={{ fontSize: 15 }}>Opérations refusées</strong>
          <button type="button" onClick={() => setVoirRefus(false)} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px" }}>
          Faites hors connexion, elles ont été refusées par le serveur. Corrigez la cause (par exemple une information manquante) puis réessayez, ou retirez-les.
        </p>
        {s.rejetes.map((r) => (
          <div key={r.id} style={{ border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.libelle}</div>
            <div style={{ fontSize: 12, color: "#b91c1c", margin: "4px 0 8px" }}>{r.message}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => void reessayerOperation(r.id)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "#0f766e", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Réessayer</button>
              <button type="button" onClick={() => { if (window.confirm("Retirer définitivement cette opération ? Elle ne sera jamais enregistrée.")) void retirerOperation(r.id); }} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #fca5a5", background: "white", color: "#b91c1c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Retirer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
    {fenetreRefus}
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 12,
        transform: "translateX(-50%)",
        zIndex: 99999,
        maxWidth: "calc(100vw - 24px)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: bg,
        color: "white",
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      }}
    >
      <span>{text}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            flexShrink: 0,
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 999,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
    </>
  );
}
