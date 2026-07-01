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
      (window as any).__pwaInstallPrompt = null;
    } else {
      setShowGuide((v) => !v);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl bg-emerald-600 text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <span className="text-lg">📲</span>
        {deferredPrompt ? "Installer maintenant" : "Voir comment installer"}
      </button>

      {/* Guide étape par étape toujours visible si pas de prompt automatique */}
      {(!deferredPrompt || showGuide) && (
        <div className="mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {isIOS ? (
            <>
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <p className="font-bold text-gray-800 text-sm">Installation sur iPhone / iPad</p>
                <p className="text-xs text-gray-500 mt-0.5">Suivez ces 3 étapes dans Safari</p>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-700 text-sm">1</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ouvrez dans Safari</p>
                    <p className="text-xs text-gray-500">Pas Chrome — uniquement Safari sur iPhone</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-700 text-sm">2</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Appuyez sur <span className="font-bold">Partager</span> ⬆️</p>
                    <p className="text-xs text-gray-500">Bouton en bas au centre de Safari</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-700 text-sm">3</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Choisissez <span className="font-bold">"Sur l'écran d'accueil"</span></p>
                    <p className="text-xs text-gray-500">Faites défiler vers le bas dans le menu Partager</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <p className="font-bold text-gray-800 text-sm">Installation sur Android</p>
                <p className="text-xs text-gray-500 mt-0.5">Ouvrez dans Chrome ou Samsung Internet</p>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700 text-sm">1</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Appuyez sur ⋮ en haut à droite</p>
                    <p className="text-xs text-gray-500">Les 3 petits points dans Chrome</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700 text-sm">2</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Appuyez sur <span className="font-bold">"Ajouter à l'écran d'accueil"</span></p>
                    <p className="text-xs text-gray-500">Ou "Installer l'application"</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700 text-sm">3</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Appuyez sur <span className="font-bold">Installer</span> ✅</p>
                    <p className="text-xs text-gray-500">L'icône apparaît sur votre écran d'accueil</p>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700">
                  💡 Si le bouton "Installer" n'apparaît pas : rechargez la page, attendez 5 secondes, puis réessayez.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
