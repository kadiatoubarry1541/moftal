import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import toast from "react-hot-toast";

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Vérifier les mises à jour en arrière-plan toutes les 60 secondes
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60_000);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    // Toast discret 3 secondes, puis rechargement automatique
    const id = toast.loading("Mise à jour disponible, rechargement…", {
      style: { background: "#065f46", color: "#fff" },
    });
    const timer = setTimeout(() => {
      toast.dismiss(id);
      updateServiceWorker(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [needRefresh]);

  return null;
}
