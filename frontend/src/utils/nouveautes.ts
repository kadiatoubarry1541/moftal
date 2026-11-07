import { useEffect, useState } from "react";
import { config } from "../config/api";

/**
 * Pastilles « nouveautés » : ce que les autres ont publié depuis la dernière
 * visite d'une rubrique. Les nombres et les dates de visite viennent du
 * serveur (jamais gardés seulement dans le téléphone). Un seul relevé partagé
 * par tous les écrans, mis à jour chaque minute et au retour sur l'application.
 */
export type Rubrique = "terreAdam" | "recit" | "galerie";
export type Nouveautes = Record<Rubrique, number>;

const VIDE: Nouveautes = { terreAdam: 0, recit: 0, galerie: 0 };
let etat: Nouveautes = VIDE;
const abonnes = new Set<(n: Nouveautes) => void>();
let minuteur: ReturnType<typeof setInterval> | null = null;
let enCours = false;

const entetes = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : null;
};
const publier = (n: Nouveautes) => { etat = n; abonnes.forEach((f) => f(n)); };

export async function rafraichirNouveautes() {
  const h = entetes();
  if (!h || enCours || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
  enCours = true;
  try {
    const r = await fetch(`${config.API_BASE_URL}/nouveautes`, { headers: h });
    const d = await r.json().catch((): null => null);
    if (r.ok && d?.success) publier({ terreAdam: +d.terreAdam || 0, recit: +d.recit || 0, galerie: +d.galerie || 0 });
  } catch { /* sans connexion : on garde les derniers nombres */ }
  finally { enCours = false; }
}

/** La rubrique vient d'être ouverte : sa pastille disparaît tout de suite. */
export function marquerVu(rubrique: Rubrique) {
  const h = entetes();
  if (!h) return;
  if (etat[rubrique]) publier({ ...etat, [rubrique]: 0 });
  fetch(`${config.API_BASE_URL}/nouveautes/vu`, { method: "POST", headers: h, body: JSON.stringify({ rubrique }) }).catch(() => {});
}

const auRetour = () => { if (document.visibilityState === "visible") void rafraichirNouveautes(); };

export function useNouveautes(): Nouveautes {
  const [n, setN] = useState<Nouveautes>(etat);
  useEffect(() => {
    abonnes.add(setN);
    if (abonnes.size === 1) {
      void rafraichirNouveautes();
      minuteur = setInterval(() => { void rafraichirNouveautes(); }, 60_000);
      document.addEventListener("visibilitychange", auRetour);
    }
    return () => {
      abonnes.delete(setN);
      if (abonnes.size === 0) {
        if (minuteur) clearInterval(minuteur);
        minuteur = null;
        document.removeEventListener("visibilitychange", auRetour);
      }
    };
  }, []);
  return n;
}

/** Marque la rubrique vue à l'ouverture de l'écran. */
export function useMarquerVu(rubrique: Rubrique, actif = true) {
  useEffect(() => { if (actif) marquerVu(rubrique); }, [rubrique, actif]);
}
