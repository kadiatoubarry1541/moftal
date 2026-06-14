import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Bouton "Installer l'application" — propose à l'utilisateur d'ajouter
 * l'app (icône + raccourci "Espace Gestion") sur son bureau / écran d'accueil,
 * comme WhatsApp Web. Invisible si l'app est déjà installée ou si le
 * navigateur ne supporte pas l'installation (alors on guide iOS manuellement).
 */
export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);
    setIsIOS(/iPhone|iPad|iPod/.test(window.navigator.userAgent));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    setShowIOSHint((v) => !v);
  };

  return (
    <div className="inline-block">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap"
      >
        📲 Installer l'application
      </button>
      {showIOSHint && (
        <div className="mt-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 max-w-xs">
          Pour installer : appuyez sur <strong>Partager</strong> (icône <strong>⬆️</strong> en bas de Safari),
          puis choisissez <strong>"Sur l'écran d'accueil"</strong>.
        </div>
      )}
    </div>
  );
}
