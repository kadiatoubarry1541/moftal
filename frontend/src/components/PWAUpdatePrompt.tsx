import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export default function PWAUpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const [show, setShow] = useState(false);

  useEffect(() => { if (needRefresh) setShow(true); }, [needRefresh]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-emerald-800 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3">
        <div className="text-2xl">🔄</div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Mise à jour disponible</p>
          <p className="text-xs text-emerald-200">Une nouvelle version de l'app est prête.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShow(false)}
            className="text-xs text-emerald-300 hover:text-white px-2 py-1"
          >
            Plus tard
          </button>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-white text-emerald-800 text-xs font-bold px-3 py-1 rounded-lg hover:bg-emerald-100"
          >
            Mettre à jour
          </button>
        </div>
      </div>
    </div>
  );
}
