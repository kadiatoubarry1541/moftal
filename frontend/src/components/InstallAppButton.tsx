import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform =
  | "ios-safari"    // iPhone/iPad dans Safari → étapes manuelles Share
  | "ios-other"     // iPhone/iPad dans Chrome/Firefox → ouvrir Safari
  | "android"       // Android Chrome / Samsung → prompt natif ou étapes manuelles
  | "desktop"       // PC / Mac → prompt natif Chrome ou icône barre d'adresse
  | "other";        // Autre navigateur → étapes génériques

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
  const isMobile = isIOS || isAndroid;

  if (isIOS && isSafari) return "ios-safari";
  if (isIOS) return "ios-other";
  if (isAndroid) return "android";
  if (!isMobile) return "desktop";
  return "other";
}

const STEPS: Record<string, { icon: string; title: string; desc: string }[]> = {
  "ios-safari": [
    { icon: "📤", title: "Appuyez sur le bouton Partager", desc: "Icône en bas au centre de Safari (carré avec flèche vers le haut)" },
    { icon: "＋", title: 'Choisissez "Sur l\'écran d\'accueil"', desc: "Faites défiler la liste vers le bas pour trouver cette option" },
    { icon: "✅", title: "Appuyez sur Ajouter", desc: "L'icône de l'application apparaît sur votre écran d'accueil" },
  ],
  "ios-other": [],
  android: [
    { icon: "⋮", title: "Appuyez sur les 3 points", desc: "En haut à droite dans Chrome ou Samsung Internet" },
    { icon: "📲", title: 'Choisissez "Installer l\'application"', desc: 'Ou "Ajouter à l\'écran d\'accueil" selon votre navigateur' },
    { icon: "✅", title: "Confirmez l'installation", desc: "L'icône apparaît sur votre écran d'accueil" },
  ],
  desktop: [
    { icon: "⊕", title: "Cherchez l'icône ⊕ dans la barre d'adresse", desc: "En haut à droite de Chrome, à côté de l'URL" },
    { icon: "📲", title: "Cliquez sur \"Installer\"", desc: "Une fenêtre de confirmation apparaît" },
    { icon: "✅", title: "L'application s'ouvre comme une vraie app", desc: "Elle apparaît aussi dans vos applications Windows/Mac" },
  ],
  other: [
    { icon: "🌐", title: "Ouvrez cette page dans Chrome", desc: "Copiez l'URL et ouvrez-la dans Google Chrome pour installer" },
    { icon: "⋮", title: "Menu → Installer l'application", desc: "Ou \"Ajouter à l'écran d'accueil\"" },
    { icon: "✅", title: "Confirmez l'installation", desc: "L'application est prête" },
  ],
};

const PLATFORM_LABELS: Record<Platform, { icon: string; title: string; subtitle: string; color: string }> = {
  "ios-safari": { icon: "🍎", title: "iPhone / iPad — Safari", subtitle: "Suivez ces 3 étapes dans Safari", color: "#166534" },
  "ios-other":  { icon: "🍎", title: "iPhone / iPad", subtitle: "Installation uniquement dans Safari", color: "#9a3412" },
  android:      { icon: "🤖", title: "Android", subtitle: "Via Chrome ou Samsung Internet", color: "#166534" },
  desktop:      { icon: "💻", title: "Ordinateur", subtitle: "Via Chrome, Edge ou Brave", color: "#1e40af" },
  other:        { icon: "🌐", title: "Navigateur", subtitle: "Utilisez Chrome pour installer", color: "#166534" },
};

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);
    setPlatform(detectPlatform());

    const existing = (window as any).__pwaInstallPrompt;
    if (existing) setDeferredPrompt(existing);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as any).__pwaInstallPrompt = e;
    };
    const handlePromptReady = () => {
      const p = (window as any).__pwaInstallPrompt;
      if (p) setDeferredPrompt(p);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      (window as any).__pwaInstallPrompt = null;
      setShowModal(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
        ✅ Installée
      </div>
    );
  }

  const handleClick = async () => {
    if (deferredPrompt) {
      // Prompt natif disponible → déclenche directement (Android + Desktop Chrome)
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
        }
      } finally {
        setDeferredPrompt(null);
        (window as any).__pwaInstallPrompt = null;
        setInstalling(false);
      }
    } else {
      setShowModal(true);
    }
  };

  const label = deferredPrompt ? "Installer" : "Installer l'app";
  const pInfo = PLATFORM_LABELS[platform];
  const steps = STEPS[platform];

  return (
    <>
      <button
        onClick={handleClick}
        disabled={installing}
        title="Installer l'application"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 12px", background: installing ? "#15803d" : "#1a8f1a", color: "white",
          border: "none", borderRadius: 8, cursor: installing ? "not-allowed" : "pointer",
          fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          transition: "background 0.15s", opacity: installing ? 0.8 : 1,
        }}
      >
        <span style={{ fontSize: 15 }}>{installing ? "⏳" : "📲"}</span>
        {installing ? "Installation…" : label}
      </button>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            animation: "fadeInBg 0.2s ease",
          }}
        >
          <style>{`
            @keyframes fadeInBg { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
          `}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: "20px 20px 0 0",
              width: "100%", maxWidth: 500, maxHeight: "92vh",
              overflowY: "auto", paddingBottom: 32,
              animation: "slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)",
            }}
          >
            {/* Poignée */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
              <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 99 }} />
            </div>

            {/* En-tête */}
            <div style={{ padding: "0 20px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>📲 Installer l'application</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>Accès direct depuis votre écran d'accueil</div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >×</button>
              </div>
            </div>

            {/* Badge plateforme */}
            <div style={{ margin: "16px 20px 0", background: "#f0fdf4", border: `1px solid #bbf7d0`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 30 }}>{pInfo.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: pInfo.color }}>{pInfo.title}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{pInfo.subtitle}</div>
              </div>
            </div>

            {/* Cas iOS Chrome : ouvrir Safari */}
            {platform === "ios-other" ? (
              <div style={{ margin: "16px 20px 0", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🧭</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                  Ouvrez cette page dans Safari
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  Sur iPhone et iPad, seul <strong>Safari</strong> permet d'installer une application sur l'écran d'accueil.<br />
                  Copiez le lien de cette page et ouvrez-le dans Safari.
                </div>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                  style={{ marginTop: 16, padding: "10px 20px", background: "#0f172a", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  📋 Copier le lien
                </button>
              </div>
            ) : (
              /* Étapes */
              <div style={{ padding: "8px 20px 0" }}>
                {steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < steps.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%",
                      background: "#1a8f1a", color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: i < 1 ? 18 : 16, fontWeight: 800, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{step.title}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Note desktop */}
            {platform === "desktop" && (
              <div style={{ margin: "16px 20px 0", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "#1e40af" }}>
                  💡 Si vous ne voyez pas l'icône ⊕, rechargez la page ou utilisez Chrome / Edge.
                </div>
              </div>
            )}

            {/* Note Android */}
            {platform === "android" && (
              <div style={{ margin: "16px 20px 0", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "#92400e" }}>
                  💡 Si le bouton "Installer" n'apparaît pas, rechargez la page une fois et réessayez.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
