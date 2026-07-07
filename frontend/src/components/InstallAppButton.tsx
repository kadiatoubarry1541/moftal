import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  label?: string;
  color?: string;
  name?: string;       // Nom de l'établissement (ex: "Clinique Moussa")
  logoUrl?: string;    // Logo de l'établissement
  themeColor?: string; // Couleur principale de la gestion
}

function detectOS(): "ios" | "other" {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : "other";
}

export default function InstallAppButton({ label, color, name, logoUrl, themeColor }: Props = {}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const path = window.location.pathname;
  const isPro = path.startsWith("/espace-pro/") || path.startsWith("/gestion-");

  // Clé unique par établissement
  let STORAGE_KEY: string | null = null;
  let SHOWN_KEY: string | null = null;
  if (path.startsWith("/espace-pro/")) {
    const id = path.split("/")[2];
    if (id) { STORAGE_KEY = `proInstalled_${id}`; SHOWN_KEY = `proCardShown_${id}`; }
  } else if (path.startsWith("/gestion-")) {
    const code = path.split("/")[2];
    if (code) { STORAGE_KEY = `gestionInstalled_${code}`; SHOWN_KEY = `gestionCardShown_${code}`; }
  }

  const btnColor = color || themeColor || (isPro ? "#1d4ed8" : "#1a8f1a");
  const os = detectOS();

  useEffect(() => {
    if (isPro) {
      const installed = STORAGE_KEY ? localStorage.getItem(STORAGE_KEY) === "1" : false;
      setIsInstalled(installed);
      (window as any).__pwaInstallPrompt = null;

      // Afficher la carte d'installation automatiquement à la 1ère visite
      if (!installed && SHOWN_KEY) {
        const shownAt = localStorage.getItem(SHOWN_KEY);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const shouldShow = !shownAt || (Date.now() - Number(shownAt)) > sevenDays;
        if (shouldShow) {
          setTimeout(() => setShowCard(true), 1500); // légère pause pour laisser la page charger
        }
      }
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
    const onInstalled = () => {
      setDeferredPrompt(null);
      (window as any).__pwaInstallPrompt = null;
      if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
      setIsInstalled(true);
      setShowCard(false);
    };

    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissCard = () => {
    if (SHOWN_KEY) localStorage.setItem(SHOWN_KEY, String(Date.now()));
    setShowCard(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
        setIsInstalled(true);
        setShowCard(false);
      }
    } finally {
      setDeferredPrompt(null);
      (window as any).__pwaInstallPrompt = null;
      setInstalling(false);
    }
  };

  // ── Petit badge "installée" dans le header ──
  if (isInstalled) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px",
        background: "#f0fdf4", color: "#166534",
        border: "1.5px solid #bbf7d0",
        borderRadius: 10, fontSize: 13, fontWeight: 700,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 15 }}>✅</span>
        Appli installée
      </div>
    );
  }

  // App principale sans prompt → rien
  if (!isPro && !deferredPrompt) return null;

  const displayName = name || label || "votre espace pro";

  return (
    <>
      {/* ── Petit bouton permanent dans le header ── */}
      <button
        onClick={() => deferredPrompt ? handleInstall() : setShowCard(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "8px 14px",
          background: btnColor, color: "white",
          border: "none", borderRadius: 10,
          cursor: "pointer", fontSize: 13, fontWeight: 700,
          whiteSpace: "nowrap", flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        <span style={{ fontSize: 16 }}>📲</span>
        {isPro ? "Installer" : "Installer l'app"}
      </button>

      {/* ── Carte d'installation (overlay) ── */}
      {showCard && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 0 env(safe-area-inset-bottom,0) 0",
        }}
          onClick={e => { if (e.target === e.currentTarget) dismissCard(); }}
        >
          <div style={{
            background: "white", borderRadius: "24px 24px 0 0",
            padding: "28px 24px 32px", width: "100%", maxWidth: 480,
            boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
            animation: "slideUp 0.3s ease",
          }}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

            {/* Trait de poignée */}
            <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 24px" }} />

            {/* Logo + nom */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 68, height: 68, borderRadius: 16, overflow: "hidden",
                background: btnColor + "22", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${btnColor}33`,
              }}>
                {logoUrl
                  ? <img src={logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 32 }}>🏢</span>
                }
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Votre application professionnelle
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: "#1a8f1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 800 }}>M</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Propulsé par Moftal</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{
              background: "#f8fafc", borderRadius: 12, padding: "12px 14px",
              marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📱</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  Icône dédiée sur votre écran d'accueil
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.5 }}>
                  Ouvrez votre gestion en un tap, sans passer par le navigateur.
                  Votre logo, votre nom — comme une vraie appli.
                </div>
              </div>
            </div>

            {/* ── Bouton natif (Android/Chrome) ── */}
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                disabled={installing}
                style={{
                  width: "100%", padding: "16px", marginBottom: 10,
                  background: btnColor, color: "white",
                  border: "none", borderRadius: 14,
                  fontSize: 16, fontWeight: 800, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: `0 4px 16px ${btnColor}55`,
                  opacity: installing ? 0.75 : 1,
                }}
              >
                <span style={{ fontSize: 22 }}>{installing ? "⏳" : "📲"}</span>
                {installing ? "Installation en cours…" : `Installer ${displayName}`}
              </button>
            )}

            {/* ── Instructions iOS ── */}
            {!deferredPrompt && os === "ios" && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                  Comment installer sur iPhone / iPad :
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { icon: "⎙", step: "Appuyez sur le bouton Partager en bas de Safari" },
                    { icon: "＋", step: "Sélectionnez « Sur l'écran d'accueil »" },
                    { icon: "✅", step: "Appuyez sur Ajouter — c'est installé !" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: btnColor, color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 800, flexShrink: 0,
                      }}>{s.icon}</div>
                      <span style={{ fontSize: 13, color: "#374151" }}>{s.step}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={dismissCard}
                  style={{
                    width: "100%", marginTop: 14, padding: "14px",
                    background: btnColor, color: "white",
                    border: "none", borderRadius: 14,
                    fontSize: 15, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  J'ai compris, je vais l'installer
                </button>
              </div>
            )}

            {/* ── Instructions Android sans prompt ── */}
            {!deferredPrompt && os !== "ios" && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                  Comment installer sur Android :
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { icon: "⋮", step: "Appuyez sur le menu ⋮ en haut à droite du navigateur" },
                    { icon: "＋", step: "Sélectionnez « Ajouter à l'écran d'accueil »" },
                    { icon: "✅", step: "Confirmez — votre appli est prête !" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: btnColor, color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 800, flexShrink: 0,
                      }}>{s.icon}</div>
                      <span style={{ fontSize: 13, color: "#374151" }}>{s.step}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={dismissCard}
                  style={{
                    width: "100%", marginTop: 14, padding: "14px",
                    background: btnColor, color: "white",
                    border: "none", borderRadius: 14,
                    fontSize: 15, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  J'ai compris, je vais l'installer
                </button>
              </div>
            )}

            <button
              onClick={dismissCard}
              style={{
                width: "100%", padding: "12px",
                background: "transparent", color: "#94a3b8",
                border: "1.5px solid #e2e8f0", borderRadius: 12,
                fontSize: 14, cursor: "pointer", fontWeight: 600,
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
