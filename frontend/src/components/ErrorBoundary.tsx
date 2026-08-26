import { Component, ErrorInfo, ReactNode } from "react";
import { notify } from "../utils/toast";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 Erreur capturée par ErrorBoundary:", error);
    console.error("📋 Détails de l'erreur:", errorInfo);
    console.error("📍 Stack trace:", error.stack);

    // Après un déploiement, le navigateur peut garder en mémoire une page qui
    // référence d'anciens fichiers (noms avec hash) qui n'existent plus sur le
    // serveur — ça donne "Failed to fetch dynamically imported module". Un
    // rechargement récupère la page à jour. main.tsx a le même filet pour les
    // rejets de promesse non gérés ; ce cas-ci passe par React (composant lazy
    // dans un Suspense), donc on le rattrape ici aussi — même clé de session
    // pour ne déclencher qu'un seul rechargement automatique au total.
    const isStaleChunkError =
      /Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk/i.test(
        error.message || ""
      );
    if (isStaleChunkError) {
      const key = "chunk-reload-v1";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return;
      }
    }

    // Enregistrer l'erreur dans le state pour l'afficher
    this.setState({ errorInfo });

    // Essayer d'afficher une notification (mais ne pas bloquer si ça échoue)
    try {
      notify.error("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } catch (e) {
      console.error("Impossible d'afficher la notification:", e);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "Erreur inconnue";
      const errorStack = this.state.error?.stack || "";
      const componentStack = this.state.errorInfo?.componentStack || "";

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Oups ! Une erreur est survenue
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Nous nous excusons pour ce désagrément. L'erreur a été enregistrée et sera corrigée.
            </p>
            
            {/* Message d'erreur principal */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Détails techniques */}
            {(errorStack || componentStack) && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2 hover:text-gray-700 dark:hover:text-gray-300">
                  🔍 Détails techniques
                </summary>
                <div className="space-y-4">
                  {errorStack && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Stack trace:</p>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto max-h-48 text-gray-800 dark:text-gray-200">
                        {errorStack}
                      </pre>
                    </div>
                  )}
                  {componentStack && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Component stack:</p>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto max-h-48 text-gray-800 dark:text-gray-200">
                        {componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                🔄 Réessayer
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                🔃 Recharger la page
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium"
              >
                🏠 Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

