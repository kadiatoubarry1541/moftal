import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);
    setIsIOS(/iPhone|iPad|iPod/.test(window.navigator.userAgent));

    // Prompt peut avoir été capturé avant le montage du composant
    const existing = (window as any).__pwaInstallPrompt;
    if (existing) setDeferredPrompt(existing);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handlePromptReady = () => {
      const p = (window as any).__pwaInstallPrompt;
      if (p) setDeferredPrompt(p);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      (window as any).__pwaInstallPrompt = null;
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
      <div className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 border-2 border-emerald-200">
        <span>✅</span> Application installée
      </div>
    );
  }

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      setShowGuide((v) => !v);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-700 active:scale-95 transition-all whitespace-nowrap"
      >
        <span className="text-base">📲</span>
        Installer l'application
      </button>

      {showGuide && (
        <div className="mt-3 bg-white border border-emerald-200 rounded-xl px-4 py-3 shadow-sm text-sm text-gray-700 max-w-sm">
          {isIOS ? (
            <>
              <p className="font-semibold text-emerald-800 mb-2">Installation sur iPhone / iPad :</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
                <li>Ouvrez cette page dans <strong>Safari</strong></li>
                <li>Appuyez sur <strong>Partager</strong> <span>⬆️</span> en bas</li>
                <li>Choisissez <strong>"Sur l'écran d'accueil"</strong></li>
                <li>Appuyez sur <strong>Ajouter</strong></li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-semibold text-emerald-800 mb-2">Installation sur Android / Chrome :</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
                <li>Appuyez sur les <strong>3 points</strong> ⋮ en haut à droite</li>
                <li>Choisissez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong></li>
                <li>Confirmez en appuyant sur <strong>Installer</strong></li>
              </ol>
              <p className="text-xs text-gray-400 mt-2">
                Si l'option n'apparaît pas, rechargez la page une fois.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
