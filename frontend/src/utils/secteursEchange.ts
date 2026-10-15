// Secteurs de la page Échange (mêmes noms que ceux vus par les vendeurs)
export const SECTEURS_ECHANGE: { id: string; label: string }[] = [
  { id: "primaire", label: "🌾 Alimentation" },
  { id: "secondaire", label: "👗 Mode & Beauté" },
  { id: "tertiaire", label: "🏠 Maison & Construction" },
  { id: "quaternaire", label: "💻 Technologie & Véhicules" },
  { id: "nourriture", label: "🍽️ Restaurants" },
];

/** Prix mensuel du compte vendeur Échange de chaque secteur (GNF) — même grille que le serveur (PRIX_VENDEUR_ECHANGE) */
export const PRIX_SECTEUR_ECHANGE: Record<string, number> = {
  primaire: 20000, nourriture: 20000, secondaire: 50000, tertiaire: 50000, quaternaire: 50000,
};

/** Un secteur d'Échange ouvert à une personne, et l'état de son paiement */
export interface DroitEchange { secteur: string; paye: boolean; jusquau?: string | null; prix?: number | null }
