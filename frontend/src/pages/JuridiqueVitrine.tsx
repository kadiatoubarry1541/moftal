import { useParams } from "react-router-dom";
import VitrineSimple, { type ModeleVitrine } from "../components/VitrineSimple";

// Site d'un cabinet juridique (avocats, conseil juridique) : modèle commun
// (components/VitrineSimple), aux couleurs du secteur Juridique.
// Fiche sobre : prestations, équipe et prise de rendez-vous — jamais les dossiers.
const MODELE: ModeleVitrine = {
  type: "juridique", metier: "Cabinet juridique", emoji: "⚖️",
  couleur: "#7f1d1d", couleurFoncee: "#450a0a", fond: "#fef2f2",
  introuvable: "Cabinet introuvable",
  descriptionParDefaut: "Conseil et accompagnement juridique pour les particuliers et les entreprises. Prenez rendez-vous pour une consultation.",
  titreArticles: "⚖️ Nos domaines d'intervention", rienAAfficher: "Aucune prestation affichée pour le moment.",
  boutonArticle: "Prendre rendez-vous", objetDemande: "Demande de rendez-vous", boutonContact: "📅 Prendre rendez-vous",
  iconesCategories: {
    "Conseil": "💬", "Foncier": "🏠", "Famille": "👨‍👩‍👧", "Affaires": "🏢", "Travail": "👷",
    "Pénal": "⚖️", "Contrats": "📝", "Recouvrement": "💰", "Création d'entreprise": "🚀", "Fiscalité": "🧾",
  },
  chiffres: (stats, articles) => [
    { icone: "⚖️", valeur: stats.services ?? articles.length, libelle: "Domaines" },
    { icone: "👥", valeur: stats.equipe ?? 0, libelle: "Équipe" },
    { icone: "📅", valeur: stats.rendezvous ?? 0, libelle: "Consultations" },
  ],
};

export default function JuridiqueVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  return <VitrineSimple tenantCode={tenantCode!} modele={MODELE} />;
}
