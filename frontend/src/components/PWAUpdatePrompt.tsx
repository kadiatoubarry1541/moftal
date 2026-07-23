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
      const checkForUpdate = () => registration.update().catch(() => {});

      // Vérifier tout de suite (l'utilisateur n'attend pas 60s pour une 1ère vérification)
      checkForUpdate();
      // Puis en arrière-plan toutes les 60 secondes
      setInterval(checkForUpdate, 60_000);
      // Et dès que l'onglet redevient actif (retour après une pause, changement d'onglet…)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
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
