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

function detectOS(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export default function InstallAppButton({ label, color, icon }: Props = {}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Clé de stockage UNIQUE par établissement — totalement indépendante de l'app principale
  const path = window.location.pathname;
  const isPro = path.startsWith("/espace-pro/") || path.startsWith("/gestion-");
  let STORAGE_KEY: string | null = null;
  if (path.startsWith("/espace-pro/")) {
    const proId = path.split("/")[2];
    if (proId) STORAGE_KEY = `proInstalled_${proId}`;
  } else if (path.startsWith("/gestion-")) {
    const tenantCode = path.split("/")[2];
    if (tenantCode) STORAGE_KEY = `gestionInstalled_${tenantCode}`;
  }

  const btnColor = color || (isPro ? "#1d4ed8" : "#1a8f1a");
  const btnIcon  = icon  || (isPro ? "🏢" : "📲");
  const btnLabel = label || (isPro ? "Installer mon appli pro" : "Installer l'application");
  const os = detectOS();

  useEffect(() => {
    if (isPro) {
      // Pages pro/gestion : uniquement localStorage — jamais display-mode:standalone
      // (standalone reflète l'app principale, pas cette gestion spécifique)
      setIsInstalled(STORAGE_KEY ? localStorage.getItem(STORAGE_KEY) === "1" : false);
      (window as any).__pwaInstallPrompt = null;
    } else {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(standalone);
      const existing = (window as any).__pwaInstallPrompt;
      if (existing) setDeferredPrompt(existing);
    }

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
      (window as any).__pwaInstallPrompt = null;
      if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
      setIsInstalled(true);
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
        padding: "10px 18px",
        background: isPro ? "#eff6ff" : "#f0fdf4",
        color: isPro ? "#1e40af" : "#166534",
        border: `2px solid ${isPro ? "#bfdbfe" : "#bbf7d0"}`,
        borderRadius: 12, fontSize: 14, fontWeight: 700,
      }}>
        <span style={{ fontSize: 18 }}>✅</span>
        {isPro ? "Appli pro installée" : "Application installée"}
      </div>
    );
  }

  // App principale sans prompt → rien
  if (!isPro && !deferredPrompt) return null;

  // ── Bouton d'installation natif (prompt disponible) ──
  if (deferredPrompt) {
    const handleClick = async () => {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
          setIsInstalled(true);
        }
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
          padding: "12px 22px",
          background: btnColor,
          color: "white", border: "none", borderRadius: 12,
          cursor: installing ? "default" : "pointer",
          fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
          boxShadow: "0 4px 14px rgba(0,0,0,0.20)",
          opacity: installing ? 0.75 : 1,
          transition: "transform 0.1s, opacity 0.15s",
        }}
        onMouseDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
        onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
        onTouchStart={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
        onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <span style={{ fontSize: 20 }}>{installing ? "⏳" : btnIcon}</span>
        {installing ? "Installation…" : btnLabel}
      </button>
    );
  }

  // ── Pages pro sans prompt natif (iOS ou Chrome pas encore prêt) ──
  // Toujours afficher le bouton avec instructions manuelles
  if (showManual) {
    return (
      <div style={{
        background: "#f8fafc", border: "1.5px solid #cbd5e1",
        borderRadius: 12, padding: "14px 16px", maxWidth: 320, fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📲</span> Comment installer votre appli pro
        </div>
        {os === "ios" ? (
          <ol style={{ margin: 0, paddingLeft: 18, color: "#475569", lineHeight: 1.7 }}>
            <li>Appuyez sur le bouton <strong>Partager</strong> <span style={{ fontSize: 15 }}>⎙</span> en bas de Safari</li>
            <li>Sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
            <li>Appuyez sur <strong>Ajouter</strong></li>
          </ol>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18, color: "#475569", lineHeight: 1.7 }}>
            <li>Appuyez sur le menu <strong>⋮</strong> du navigateur</li>
            <li>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong></li>
            <li>Confirmez avec <strong>Ajouter</strong></li>
          </ol>
        )}
        <button
          onClick={() => setShowManual(false)}
          style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowManual(true)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "12px 22px",
        background: btnColor,
        color: "white", border: "none", borderRadius: 12,
        cursor: "pointer",
        fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
        boxShadow: "0 4px 14px rgba(0,0,0,0.20)",
        transition: "transform 0.1s, opacity 0.15s",
      }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onTouchStart={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
      onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: 20 }}>🏢</span>
      Installer mon appli pro
    </button>
  );
}
