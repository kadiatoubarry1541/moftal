import { config } from "../config/api";

// Pages des membres dans l'application d'une école ou d'une madrasa
// (/gestion-ecole/:code/parent…) — jamais sur son site vitrine.
export type ModeEcole = "school" | "madrasa";
export type PageMembre = "parent" | "enseignant" | "bibliotheque" | "notifications" | "parametres";

export function cheminAppEcole(mode: ModeEcole, tenantCode: string, page?: PageMembre) {
  return `/gestion-${mode === "madrasa" ? "madrasa" : "ecole"}/${tenantCode}${page ? `/${page}` : ""}`;
}

/** Ce que le compte connecté peut ouvrir dans l'application de l'école. */
export async function droitsMembreEcole(mode: ModeEcole, tenantCode: string) {
  const base = `${config.API_BASE_URL}/${mode === "madrasa" ? "madrasa-mgmt" : "school-mgmt"}/${encodeURIComponent(tenantCode)}`;
  const headers = { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
  const lire = (chemin: string) => fetch(`${base}${chemin}`, { headers })
    .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, d: {} as { success?: boolean; role?: string } }));
  const [cours, acces] = await Promise.all([lire("/enseignant/mes-cours"), lire("/my-access")]);
  return {
    enseignant: cours.ok && cours.d.success !== false,
    parent: acces.ok && acces.d.success !== false && (acces.d.role === "parent" || acces.d.role === "apprenant"),
  };
}
