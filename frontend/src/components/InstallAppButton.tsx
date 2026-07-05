import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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

  // Déjà installée
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

  // Pas de prompt disponible → on n'affiche rien du tout
  if (!deferredPrompt) return null;

  const handleClick = async () => {
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
  };

  return (
    <button
      onClick={handleClick}
      disabled={installing}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "14px 28px",
        background: btnColor,
        color: "white", border: "none", borderRadius: 14,
        cursor: installing ? "default" : "pointer",
        fontSize: 16, fontWeight: 800, whiteSpace: "nowrap",
        boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
        opacity: installing ? 0.75 : 1,
        transition: "transform 0.1s, opacity 0.15s",
      }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onTouchStart={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
      onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: 22 }}>{installing ? "⏳" : btnIcon}</span>
      {installing ? "Installation…" : btnLabel}
    </button>
  );
}
