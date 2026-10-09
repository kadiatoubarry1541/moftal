import { config } from "../config/api";

// Ouvrir une gestion (gestions.moftal.com) sans mettre la session dans l'adresse :
// on demande au serveur un code à usage unique (valable quelques minutes) que la
// gestion échange contre la session à son arrivée.

export async function demanderCodeOuverture(): Promise<string | null> {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const r = await fetch(`${config.API_BASE_URL}/code-ouverture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session: localStorage.getItem("session_user") || "" }),
    });
    const d = await r.json().catch(() => ({}));
    return r.ok && d.success && d.code ? d.code : null;
  } catch {
    return null;
  }
}

/** À l'arrivée sur la gestion : échange le code contre la session. */
export async function echangerCodeOuverture(code: string): Promise<boolean> {
  try {
    const r = await fetch(`${config.API_BASE_URL}/code-ouverture/echanger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.success || !d.token) return false;
    localStorage.setItem("token", d.token);
    if (d.session) localStorage.setItem("session_user", d.session);
    return true;
  } catch {
    return false;
  }
}
