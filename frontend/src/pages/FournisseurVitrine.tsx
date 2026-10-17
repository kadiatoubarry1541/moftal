import { useParams } from "react-router-dom";
import VitrineSimple, { type ModeleVitrine } from "../components/VitrineSimple";

// Site d'un fournisseur / grossiste : modèle commun (components/VitrineSimple), aux couleurs du secteur.
const MODELE: ModeleVitrine = {
  type: "supplier", metier: "Fournisseur · Grossiste", emoji: "🚚",
  couleur: "#0e7490", couleurFoncee: "#164e63", fond: "#ecfeff",
  introuvable: "Fournisseur introuvable",
  descriptionParDefaut: "Approvisionnez-vous en gros et au détail, à des prix justes et avec des livraisons fiables.",
  titreArticles: "📦 Notre catalogue", rienAAfficher: "Aucun produit affiché pour le moment.",
  boutonArticle: "Commander", objetDemande: "Commande", boutonContact: "🛒 Passer commande",
  iconesCategories: { "Alimentation": "🍚", "Boissons": "🥤", "Hygiène": "🧼", "Matériaux": "🧱", "Électronique": "📱", "Textile": "👕", "Quincaillerie": "🔩", "Cosmétiques": "💄", "Fournitures": "📚" },
  chiffres: (stats, articles, categories) => [
    { icone: "📦", valeur: stats.products ?? articles.length, libelle: "Produits" },
    { icone: "🏷️", valeur: categories.length, libelle: "Catégories" },
    { icone: "🤝", valeur: stats.clients ?? 0, libelle: "Revendeurs" },
  ],
};

export default function FournisseurVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  return <VitrineSimple tenantCode={tenantCode!} modele={MODELE} />;
}
