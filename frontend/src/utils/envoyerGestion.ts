// Envoi d'une modification (ajout, suppression, changement de statut) dans une
// gestion interne. Si le serveur refuse ou ne répond pas, on prévient
// l'utilisateur : jamais de faux succès (règle du projet).
export async function envoyerGestion(url: string, init: RequestInit): Promise<boolean> {
  try {
    const r = await fetch(url, init);
    let d: { success?: boolean; message?: string } | null = null;
    try { d = await r.json(); } catch { /* réponse sans JSON */ }
    if (r.ok && d?.success !== false) return true;
    alert(d?.message || "L'opération n'a pas été enregistrée. Réessayez.");
    return false;
  } catch {
    alert("Erreur de connexion : rien n'a été enregistré. Vérifiez votre connexion et réessayez.");
    return false;
  }
}
