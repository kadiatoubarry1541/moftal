import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}
function isSafari() {
  return /Safari/.test(navigator.userAgent) && !/Chrome|CriOS/.test(navigator.userAgent);
}

interface Props {
  label?: string;
  color?: string;
  icon?: string;
}

export default function InstallAppButton({ label, color, icon }: Props = {}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const isPro =
    window.location.pathname.startsWith("/espace-pro/") ||
    window.location.pathname.startsWith("/gestion-");

  const btnColor = color || (isPro ? "#1d4ed8" : "#1a8f1a");
  const btnIcon  = icon  || (isPro ? "🏢" : "📲");
  const btnLabel = label || (isPro ? "Installer mon appli pro" : "Installer l'application");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const existing = (window as any).__pwaInstallPrompt;
    if (existing) setDeferredPrompt(existing);

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as any).__pwaInstallPrompt = e;
    };
    const onReady = () => {
      const p = (window as any).__pwaInstallPrompt;
      if (p) setDeferredPrompt(p);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      (window as any).__pwaInstallPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("pwa-prompt-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("pwa-prompt-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "12px 22px",
        background: isPro ? "#eff6ff" : "#f0fdf4",
        color: isPro ? "#1e40af" : "#166534",
        border: `2px solid ${isPro ? "#bfdbfe" : "#bbf7d0"}`,
        borderRadius: 14, fontSize: 15, fontWeight: 700,
      }}>
        <span style={{ fontSize: 22 }}>✅</span>
        {isPro ? "Appli pro installée" : "Application installée"}
      </div>
    );
  }

  const handleClick = async () => {
    if (deferredPrompt) {
      // Prompt natif → installation directe, pas de modal
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setIsInstalled(true);
      } finally {
        setDeferredPrompt(null);
        (window as any).__pwaInstallPrompt = null;
        setInstalling(false);
      }
    } else {
      // Fallback : navigateur ne supporte pas le prompt auto
      setShowFallback(true);
    }
  };

  // Fallback visuel ultra-simple (sans texte à lire)
  const ios = isIOS();
  const safariOk = isSafari();

  return (
    <>
      <button
        onClick={handleClick}
        disabled={installing}
        style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "14px 28px",
          background: installing ? btnColor + "cc" : btnColor,
          color: "white", border: "none", borderRadius: 14,
          cursor: installing ? "default" : "pointer",
          fontSize: 16, fontWeight: 800, whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          transition: "transform 0.1s, opacity 0.15s",
          letterSpacing: "0.01em",
        }}
        onMouseDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
        onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
        onTouchStart={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
        onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <span style={{ fontSize: 22 }}>{installing ? "⏳" : btnIcon}</span>
        {installing ? "Installation en cours…" : btnLabel}
      </button>

      {/* Fallback ultra-simple — aucun texte à lire, juste des icônes */}
      {showFallback && (
        <div
          onClick={() => setShowFallback(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 24,
              width: "88%", maxWidth: 340,
              padding: "32px 24px", textAlign: "center",
            }}
          >
            {/* Icône principale */}
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {ios ? "🍎" : "🤖"}
            </div>

            {/* Si iOS sans Safari : demander d'ouvrir Safari */}
            {ios && !safariOk ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🧭</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                  Ouvrez dans Safari
                </div>
              </>
            ) : (
              /* Android / iOS Safari : séquence d'icônes */
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
                {ios ? (
                  <>
                    <span style={{ fontSize: 40 }}>📤</span>
                    <span style={{ fontSize: 28, color: "#94a3b8" }}>→</span>
                    <span style={{ fontSize: 40 }}>➕</span>
                    <span style={{ fontSize: 28, color: "#94a3b8" }}>→</span>
                    <span style={{ fontSize: 40 }}>✅</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 40 }}>⋮</span>
                    <span style={{ fontSize: 28, color: "#94a3b8" }}>→</span>
                    <span style={{ fontSize: 40 }}>📲</span>
                    <span style={{ fontSize: 28, color: "#94a3b8" }}>→</span>
                    <span style={{ fontSize: 40 }}>✅</span>
                  </>
                )}
              </div>
            )}

            {/* Bouton fermer */}
            <button
              onClick={() => setShowFallback(false)}
              style={{
                marginTop: 8, padding: "12px 32px",
                background: "#f1f5f9", color: "#475569",
                border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                width: "100%",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
