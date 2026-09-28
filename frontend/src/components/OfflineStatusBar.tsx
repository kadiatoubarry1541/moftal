import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { subscribeOfflineStatus, syncNow, type OfflineStatus } from "../utils/offlineSync";

// Pages Santé & Éducation qui fonctionnent hors connexion
const OFFLINE_PAGES = /^\/(gestion-interne|gestion-clinique|gestion-ecole|gestion-madrasa|clinique|ecole|madrasa)(\/|$|-)/;

// Petit bandeau : « Hors connexion », « N opérations en attente », « Synchronisé ».
export default function OfflineStatusBar() {
  const { pathname } = useLocation();
  const [s, setS] = useState<OfflineStatus | null>(null);
  const [justSynced, setJustSynced] = useState(0);

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

  if (s.syncing) {
    bg = "#0369a1";
    text = `⏳ Envoi des données enregistrées hors connexion… (${s.pending})`;
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

  return (
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
  );
}
