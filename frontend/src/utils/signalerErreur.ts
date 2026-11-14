import { config } from "../config/api";

// Signale une erreur du site au serveur (journal des erreurs, page Diagnostic
// de l'admin). Jamais bloquant ; la même erreur n'est envoyée qu'une fois par
// page, et 10 erreurs au plus. Renvoie true si le serveur l'a enregistrée.
const dejaEnvoyees = new Set<string>();

export async function signalerErreur(erreur: { message: string; pile?: string | null }): Promise<boolean> {
  const message = String(erreur.message || "").slice(0, 2000);
  if (!message || dejaEnvoyees.has(message) || dejaEnvoyees.size >= 10) return false;
  dejaEnvoyees.add(message);
  try {
    const token = localStorage.getItem("token");
    const reponse = await fetch(`${config.API_BASE_URL}/erreurs`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        message,
        pile: String(erreur.pile || "").slice(0, 6000) || null,
        adresse: window.location.pathname,
      }),
    });
    return reponse.ok;
  } catch {
    return false;
  }
}

// Bruits du navigateur, sans rapport avec le site : jamais signalés
export const erreurSansImportance = (message: string) =>
  /^Script error\.?$|ResizeObserver loop|Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk|Load failed|NetworkError|Failed to fetch$/i.test(message);
