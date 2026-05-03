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

// En dev uniquement : redirige les fetch hardcodés localhost:5002 vers VITE_API_URL
// En production, le build Vite remplace déjà les URLs à la compilation (replaceLocalhostPlugin)
if (import.meta.env.DEV) {
  const _viteApiUrl = import.meta.env.VITE_API_URL;
  if (_viteApiUrl) {
    const _apiBase = _viteApiUrl.replace(/\/api\/?$/, '');
    const _origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.includes('localhost:5002')) {
        input = input.replace('http://localhost:5002', _apiBase);
      }
      return _origFetch(input, init);
    };
  }
}

const basename = '';

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
