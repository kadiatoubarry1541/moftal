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

// Capturer le prompt d'installation PWA le plus tôt possible (avant montage React)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
});

async function clearSWAndRender() {
  if ('serviceWorker' in navigator) {
    // Supprimer les anciens SW (évite les caches bloquants)
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((sw) => !sw.active?.scriptURL.endsWith('/sw.js'))
        .map((sw) => sw.unregister())
    );
    // Réenregistrer notre SW (requis pour l'installation PWA sur Android)
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    // Ne pas supprimer notre cache SW
    await Promise.all(keys.filter((k) => k !== 'moftal-sw-v1').map((k) => caches.delete(k)));
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

clearSWAndRender();
