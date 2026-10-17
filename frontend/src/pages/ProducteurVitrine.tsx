import { useParams } from "react-router-dom";
import VitrineSimple, { type ModeleVitrine } from "../components/VitrineSimple";

// Site d'une entreprise de production : modèle commun (components/VitrineSimple), aux couleurs du secteur.
const MODELE: ModeleVitrine = {
  type: "producer", metier: "Production", emoji: "🏭",
  couleur: "#15803d", couleurFoncee: "#14532d", fond: "#f0fdf4",
  introuvable: "Producteur introuvable",
  descriptionParDefaut: "Des produits de qualité, fabriqués avec soin. Commandez directement auprès du producteur.",
  titreArticles: "🌿 Nos produits", rienAAfficher: "Aucun produit affiché pour le moment.",
  boutonArticle: "Commander", objetDemande: "Commande", boutonContact: "🛒 Passer commande",
  iconesCategories: { "Agriculture": "🌾", "Fruits": "🍊", "Légumes": "🥬", "Élevage": "🐄", "Volaille": "🐔", "Poisson": "🐟", "Transformation": "🫙", "Boulangerie": "🥖", "Huile": "🫒", "Miel": "🍯", "Savon": "🧼" },
  chiffres: (stats, articles, categories) => [
    { icone: "🌿", valeur: stats.products ?? articles.length, libelle: "Produits" },
    { icone: "🏷️", valeur: categories.length, libelle: "Catégories" },
    { icone: "👥", valeur: stats.clients ?? 0, libelle: "Clients" },
  ],
};

export default function ProducteurVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  return <VitrineSimple tenantCode={tenantCode!} modele={MODELE} />;
}
