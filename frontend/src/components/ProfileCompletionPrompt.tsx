import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Compte créé avec seulement téléphone + mot de passe (identifiant provisoire
// « TMP-… ») : on rappelle de mettre le profil à jour, et quand le serveur
// refuse une action (code PROFILE_INCOMPLETE) on explique pourquoi.

const COMPLETE_PATH = "/vivant/completer";

function isProvisionalSession(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem("session_user") || "null");
    const n = s?.numeroH || s?.userData?.numeroH;
    return typeof n === "string" && n.startsWith("TMP-");
  } catch {
    return false;
  }
}

let guardInstalled = false;
const listeners = new Set<(message: string) => void>();

function installGuard() {
  if (guardInstalled) return;
  guardInstalled = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    if (response.status === 403) {
      response.clone().json()
        .then((d) => { if (d?.code === "PROFILE_INCOMPLETE") listeners.forEach((l) => l(d.message)); })
        .catch(() => {});
    }
    return response;
  };
}

export default function ProfileCompletionPrompt() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [provisional, setProvisional] = useState(isProvisionalSession);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("profil-rappel-ferme") === "1"; } catch { return false; }
  });

  useEffect(() => { setProvisional(isProvisionalSession()); }, [pathname]);

  useEffect(() => {
    installGuard();
    const l = (msg: string) => setBlockedMessage(msg);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const goComplete = () => { setBlockedMessage(null); navigate(COMPLETE_PATH); };
  const onCompletePage = pathname.startsWith(COMPLETE_PATH);

  return (
    <>
      {provisional && !onCompletePage && !dismissed && !blockedMessage && (
        <div role="status" style={{ position: "fixed", left: 12, right: 12, bottom: 64, zIndex: 9998, maxWidth: 480, margin: "0 auto" }}
          className="flex items-center gap-3 rounded-2xl bg-white border border-amber-200 shadow-lg px-4 py-3">
          <span className="text-2xl">👤</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Mettez votre profil à jour</p>
            <p className="text-xs text-gray-500">1 minute pour recevoir votre NuméroH, tout débloquer et pouvoir récupérer votre compte (avec un email).</p>
          </div>
          <button type="button" onClick={goComplete}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}>
            Mettre à jour
          </button>
          <button type="button" aria-label="Plus tard" onClick={() => { setDismissed(true); try { sessionStorage.setItem("profil-rappel-ferme", "1"); } catch { /* */ } }}
            className="flex-shrink-0 text-gray-400 text-lg px-1">✕</button>
        </div>
      )}

      {blockedMessage && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setBlockedMessage(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl">👤</div>
            <h2 className="mt-2 text-lg font-bold text-gray-900">Encore une petite étape</h2>
            <p className="mt-1 text-sm text-gray-600">{blockedMessage}</p>
            <button type="button" onClick={goComplete}
              className="mt-4 w-full py-3 rounded-xl font-bold text-white"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}>
              ✏️ Mettre mon profil à jour
            </button>
            <button type="button" onClick={() => setBlockedMessage(null)} className="mt-2 text-sm text-gray-500">Plus tard</button>
          </div>
        </div>
      )}
    </>
  );
}
