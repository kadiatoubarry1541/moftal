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

// Pour /espace-pro/:id : swapper le manifest AVANT que React monte
// → Chrome voit le manifest pro dès le début et peut déclencher beforeinstallprompt avec la bonne identité
const _proPathMatch = window.location.pathname.match(/^\/espace-pro\/([^/]+)/);
if (_proPathMatch) {
  const _proId = _proPathMatch[1];
  const _manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (_manifestLink) {
    _manifestLink.setAttribute('href', `/api/professionals/pro-manifest/${_proId}`);
  }
}

// Capturer le prompt d'installation PWA le plus tôt possible (avant montage React)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
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
