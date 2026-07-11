import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./styles/globals.css";
import App from "./App.tsx";
import { I18nProvider } from "./i18n/I18nProvider";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";

// Supprimer les anciennes données de test qui stockaient des mots de passe en clair
const keysToClean = [
  'dernier_vivant', 'vivant_written', 'vivant_video',
  'compte_test_G0C0P0R0E0F0_0', 'compte_test_G96C1P2R3E2F1_4',
  'compte_test_G96C1P2R3E2F1_5', 'compte_test_G96C1P2R3E2F1_6',
];
keysToClean.forEach(key => {
  const val = localStorage.getItem(key);
  if (val) {
    try {
      const data = JSON.parse(val);
      // Supprimer uniquement si c'était un compte de test avec mot de passe en clair
      if (data.password) localStorage.removeItem(key);
    } catch { localStorage.removeItem(key); }
  }
});

const basename = '';

// Sur gestion.moftal.com : récupérer le token passé dans l'URL depuis moftal.com
if (window.location.hostname === 'gestions.moftal.com') {
  const _p = new URLSearchParams(window.location.search);
  const _t = _p.get('_t');
  const _s = _p.get('_s');
  if (_t) { localStorage.setItem('token', decodeURIComponent(_t)); _p.delete('_t'); }
  if (_s) { localStorage.setItem('session_user', decodeURIComponent(_s)); _p.delete('_s'); }
  if (_t || _s) {
    const clean = window.location.pathname + (_p.toString() ? '?' + _p.toString() : '');
    window.history.replaceState({}, '', clean);
  }
  // Si pas de token du tout → renvoyer vers moftal.com pour se connecter
  if (!localStorage.getItem('token')) {
    window.location.href = `https://moftal.com/login?redirect=${encodeURIComponent(window.location.href)}`;
  }
}

// Recharge automatique si un chunk JS est introuvable après un nouveau déploiement
window.addEventListener('unhandledrejection', (event) => {
  const msg = (event.reason as Error)?.message || '';
  const isChunkError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk');
  if (isChunkError) {
    const key = 'chunk-reload-v1';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
  }
});

// Swapper le manifest AVANT que React monte — Chrome doit voir le bon manifest dès le chargement
// pour déclencher beforeinstallprompt avec la bonne identité (app principale OU gestion spécifique)
const _manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
const _pathname = window.location.pathname;

const _proPathMatch = _pathname.match(/^\/espace-pro\/([^/]+)/);
const _gestionMatch = _pathname.match(/^\/gestion-[^/]+\/([^/]+)/);

const _pageOrigin = encodeURIComponent(window.location.origin);

if (_proPathMatch && _manifestLink) {
  // EspacePro (/espace-pro/:id) → manifest same-origin via proxy /api/
  _manifestLink.setAttribute('href', `/api/professionals/pro-manifest/${_proPathMatch[1]}?origin=${_pageOrigin}`);
} else if (_gestionMatch && _manifestLink) {
  // Pages Gestion (/gestion-clinique/:code etc.) → manifest same-origin via proxy /api/
  const _encodedStart = encodeURIComponent(_pathname);
  _manifestLink.setAttribute('href', `/api/professionals/pro-manifest/by-tenant/${_gestionMatch[1]}?startUrl=${_encodedStart}&origin=${_pageOrigin}`);
}

// Capturer le prompt d'installation PWA le plus tôt possible (avant montage React)
// __pwaInstallPrompt = prompt de l'app principale (scope /)
// __pwaGestionPrompt = prompt de la gestion interne (scope spécifique)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  const isGestionPage = _gestionMatch || _proPathMatch;
  if (isGestionPage) {
    (window as any).__pwaGestionPrompt = e;
  } else {
    (window as any).__pwaInstallPrompt = e;
  }
  window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
});

function initAndRender() {
  if ('serviceWorker' in navigator) {
    // En développement : enregistrement manuel (VitePWA désactivé en dev)
    // En production : VitePWA enregistre automatiquement son SW workbox
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <ThemeProvider>
          <I18nProvider>
            <App />
            <PWAUpdatePrompt />
          </I18nProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
  );
}

initAndRender();
