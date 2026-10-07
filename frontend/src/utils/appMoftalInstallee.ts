// Moftal ne doit être installée qu'UNE fois sur un téléphone : soit l'application
// du Play Store (PWABuilder / TWA), soit l'application installée depuis le site.
// L'app du Play Store tourne dans Chrome et partage sa mémoire pour moftal.com :
// quand elle s'ouvre, on le note ; Chrome sur le même téléphone le voit et ne
// propose plus d'installer Moftal une deuxième fois.

const CLE_PLAY = "moftalAppPlay";       // { pkg, at } — app du Play Store ouverte récemment
const CLE_SITE = "moftalAppSite";       // at — app installée depuis le site ouverte récemment
const CLE_SESSION_PLAY = "moftalDansAppPlay";
// Sans ouverture depuis 45 jours, on considère l'app supprimée (on peut réinstaller).
const VALIDITE_MS = 45 * 24 * 3600 * 1000;

function lire<T>(cle: string): T | null {
  try { return JSON.parse(localStorage.getItem(cle) || "null") as T; } catch { return null; }
}

function estGestion(pathname = window.location.pathname) {
  return /^\/(espace-pro|gestion-[^/]+)\/[^/]+/.test(pathname);
}

export function estEnModeApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true;
}

/** À appeler une fois au démarrage (main.tsx). */
export function noterLancementApp() {
  try {
    const ref = document.referrer || "";
    if (ref.startsWith("android-app://")) {
      // Ouverture depuis l'application du Play Store
      sessionStorage.setItem(CLE_SESSION_PLAY, "1");
      const pkg = ref.slice("android-app://".length).split("/")[0];
      localStorage.setItem(CLE_PLAY, JSON.stringify({ pkg, at: Date.now() }));
    } else if (sessionStorage.getItem(CLE_SESSION_PLAY) === "1") {
      const p = lire<{ pkg: string }>(CLE_PLAY);
      if (p) localStorage.setItem(CLE_PLAY, JSON.stringify({ pkg: p.pkg, at: Date.now() }));
    } else if (estEnModeApp() && !estGestion()) {
      // Application Moftal installée depuis le site
      localStorage.setItem(CLE_SITE, JSON.stringify({ at: Date.now() }));
    }
  } catch { /* stockage indisponible */ }
}

export function estDansAppPlay() {
  try { return sessionStorage.getItem(CLE_SESSION_PLAY) === "1"; } catch { return false; }
}

/** Nom du paquet de l'app Play Store si elle est installée sur ce téléphone, sinon null. */
export function appPlayInstallee(): string | null {
  const p = lire<{ pkg: string; at: number }>(CLE_PLAY);
  return p?.pkg && Date.now() - (p.at || 0) < VALIDITE_MS ? p.pkg : null;
}

export function appSiteInstallee(): boolean {
  const s = lire<{ at: number }>(CLE_SITE);
  return !!s && Date.now() - (s.at || 0) < VALIDITE_MS;
}

/** Lien Android qui ouvre l'app du Play Store sur la page actuelle. */
export function lienOuvrirAppPlay(pkg: string) {
  const { host, pathname, search } = window.location;
  const secours = encodeURIComponent(`https://play.google.com/store/apps/details?id=${pkg}`);
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${secours};end`;
}
