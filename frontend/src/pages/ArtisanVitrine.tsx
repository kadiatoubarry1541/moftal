import { useParams } from "react-router-dom";
import VitrineSimple, { type ModeleVitrine } from "../components/VitrineSimple";

// Site d'un artisan : modèle commun (components/VitrineSimple), aux couleurs du secteur.
const MODELE: ModeleVitrine = {
  type: "artisan", metier: "Artisan", emoji: "🔧",
  couleur: "#b45309", couleurFoncee: "#78350f", fond: "#fffbeb",
  introuvable: "Artisan introuvable",
  descriptionParDefaut: "Un travail soigné, fait par un professionnel de confiance. Demandez votre devis : nous vous répondons rapidement.",
  titreArticles: "🔨 Nos services", rienAAfficher: "Aucun service affiché pour le moment.",
  boutonArticle: "Demander un devis", objetDemande: "Demande de devis", boutonContact: "✉️ Demander un devis",
  iconesCategories: { "Plomberie": "🚰", "Électricité": "💡", "Menuiserie": "🪚", "Maçonnerie": "🧱", "Peinture": "🎨", "Couture": "🧵", "Mécanique": "🔩", "Soudure": "🔥", "Climatisation": "❄️", "Coiffure": "💇" },
  chiffres: (stats, articles) => [
    { icone: "🛠️", valeur: stats.services ?? articles.length, libelle: "Services" },
    { icone: "✅", valeur: stats.works ?? 0, libelle: "Travaux réalisés" },
    { icone: "👥", valeur: stats.clients ?? 0, libelle: "Clients" },
  ],
};

export default function ArtisanVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  return <VitrineSimple tenantCode={tenantCode!} modele={MODELE} />;
}
