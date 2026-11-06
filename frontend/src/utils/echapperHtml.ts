// Texte mis dans une page HTML écrite à la main (impressions, reçus) : toujours
// échappé, sinon un nom ou une note saisis par quelqu'un y exécutaient un script.
export const echap = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
