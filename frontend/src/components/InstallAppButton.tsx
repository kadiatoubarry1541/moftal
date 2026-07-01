import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const ua = window.navigator.userAgent;
    setIsIOS(/iPhone|iPad|iPod/.test(ua));

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
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__pwaInstallPrompt = null;
    } else {
      setShowModal(true);
    }
  };

  const steps = isIOS
    ? [
        { n: 1, icon: "⬆️", title: "Ouvrez dans Safari", desc: "L'installation ne fonctionne que dans Safari sur iPhone / iPad" },
        { n: 2, icon: "📤", title: "Appuyez sur Partager", desc: "Le bouton Partager se trouve en bas au centre de Safari" },
        { n: 3, icon: "＋", title: 'Choisissez "Sur l\'écran d\'accueil"', desc: "Faites défiler le menu Partager vers le bas pour trouver cette option" },
        { n: 4, icon: "✅", title: "Appuyez sur Ajouter", desc: "L'icône apparaît sur votre écran d'accueil" },
      ]
    : [
        { n: 1, icon: "⋮", title: "Appuyez sur les 3 points", desc: "En haut à droite dans Chrome ou Samsung Internet" },
        { n: 2, icon: "📲", title: 'Choisissez "Installer l\'application"', desc: 'Ou "Ajouter à l\'écran d\'accueil" selon votre navigateur' },
        { n: 3, icon: "✅", title: "Confirmez l'installation", desc: "L'icône de votre espace apparaît sur l'écran d'accueil" },
      ];

  return (
    <>
      {/* Bouton compact dans le header */}
      <button
        onClick={handleClick}
        title="Installer l'application sur votre téléphone"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 12px", background: "#1a8f1a", color: "white",
          border: "none", borderRadius: 8, cursor: "pointer",
          fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontSize: 15 }}>📲</span>
        {deferredPrompt ? "Installer" : "Installer l'app"}
      </button>

      {/* Modal plein écran */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: 0, animation: "fadeInBg 0.2s ease",
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
              width: "100%", maxWidth: 480, maxHeight: "90vh",
              overflowY: "auto", padding: "0 0 32px",
              animation: "slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)",
            }}
          >
            {/* Poignée */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
              <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 99 }} />
            </div>

            {/* Titre */}
            <div style={{ padding: "0 20px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    📲 Installer l'application
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    Accès direct depuis votre écran d'accueil
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* En-tête plateforme */}
            <div style={{ margin: "16px 20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{isIOS ? "🍎" : "🤖"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>
                  {isIOS ? "Installation sur iPhone / iPad" : "Installation sur Android"}
                </div>
                <div style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
                  {isIOS ? "Ouvrez cette page dans Safari" : "Ouvrez dans Chrome ou Samsung Internet"}
                </div>
              </div>
            </div>

            {/* Étapes */}
            <div style={{ padding: "0 20px" }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < steps.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "#1a8f1a", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 800, flexShrink: 0,
                  }}>
                    {step.n}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Note bas de page */}
            {!isIOS && (
              <div style={{ margin: "16px 20px 0", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "#92400e" }}>
                  💡 Si le bouton "Installer" n'apparaît pas, rechargez la page une fois puis réessayez.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
