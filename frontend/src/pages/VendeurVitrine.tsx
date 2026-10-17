import { useParams } from "react-router-dom";
import VitrineSimple, { type ModeleVitrine } from "../components/VitrineSimple";

// Site d'un vendeur / détaillant : modèle commun (components/VitrineSimple), aux couleurs du secteur.
const MODELE: ModeleVitrine = {
  type: "vendor", metier: "Vendeur · Détaillant", emoji: "🛒",
  couleur: "#0369a1", couleurFoncee: "#0c4a6e", fond: "#f0f9ff",
  introuvable: "Vendeur introuvable",
  descriptionParDefaut: "Retrouvez nos articles au meilleur prix. Commandez ou demandez une information en un message.",
  titreArticles: "🛍️ Nos articles", rienAAfficher: "Aucun article affiché pour le moment.",
  boutonArticle: "Commander", objetDemande: "Commande", boutonContact: "🛒 Passer commande",
  iconesCategories: { "Alimentation": "🍚", "Boissons": "🥤", "Vêtements": "👕", "Chaussures": "👟", "Téléphones": "📱", "Électronique": "🔌", "Beauté": "💄", "Maison": "🏠", "Hygiène": "🧼" },
  chiffres: (stats, articles, categories) => [
    { icone: "🛍️", valeur: stats.products ?? articles.length, libelle: "Articles" },
    { icone: "🏷️", valeur: categories.length, libelle: "Catégories" },
    { icone: "👥", valeur: stats.clients ?? 0, libelle: "Clients" },
  ],
};

export default function VendeurVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  return <VitrineSimple tenantCode={tenantCode!} modele={MODELE} />;
}
