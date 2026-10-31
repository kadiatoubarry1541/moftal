import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import toast from "react-hot-toast";

export default function PWAUpdatePrompt(): null {
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

  // La nouvelle version s'installe tout de suite (skipWaiting dans sw.ts), mais la
  // page déjà ouverte — surtout dans l'application installée (Play Store), qui
  // reste en mémoire — garde l'ancienne. Dès que la nouvelle version prend la main,
  // on recharge : tout de suite si l'application vient d'être ouverte ou rouverte,
  // sinon au prochain retour dans l'application (jamais pendant une saisie).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const avaitUneVersion = !!navigator.serviceWorker.controller;
    let dernierRetour = Date.now();
    let aRecharger = false;
    let recharge = false;
    const recharger = () => {
      if (recharge) return;
      recharge = true;
      toast.loading("Nouvelle version de Moftal, chargement…", { style: { background: "#065f46", color: "#fff" } });
      setTimeout(() => window.location.reload(), 800);
    };
    const surRetour = () => {
      if (document.visibilityState !== "visible") return;
      dernierRetour = Date.now();
      if (aRecharger) recharger();
    };
    const surNouvelleVersion = () => {
      if (!avaitUneVersion) return; // première installation : rien à recharger
      if (Date.now() - dernierRetour < 15_000) recharger();
      else aRecharger = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", surNouvelleVersion);
    document.addEventListener("visibilitychange", surRetour);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", surNouvelleVersion);
      document.removeEventListener("visibilitychange", surRetour);
    };
  }, []);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, [needRefresh]);

  return null;
}
