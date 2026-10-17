import { useParams } from "react-router-dom";
import VitrineSimple, { type ModeleVitrine } from "../components/VitrineSimple";

// Site d'un salon de beauté : modèle commun (components/VitrineSimple), aux couleurs du secteur.
const MODELE: ModeleVitrine = {
  type: "beauty", metier: "Beauté & bien-être", emoji: "💅",
  couleur: "#db2777", couleurFoncee: "#9d174d", fond: "#fdf2f8",
  introuvable: "Salon introuvable",
  descriptionParDefaut: "Prenez soin de vous : coiffure, soins et beauté dans un cadre accueillant. Réservez votre rendez-vous.",
  titreArticles: "💅 Nos prestations", rienAAfficher: "Aucune prestation affichée pour le moment.",
  boutonArticle: "Réserver", objetDemande: "Demande de rendez-vous", boutonContact: "📅 Prendre rendez-vous",
  iconesCategories: { "Coiffure": "💇", "Tresses": "💇‍♀️", "Barbier": "💈", "Soins du visage": "🧖", "Maquillage": "💄", "Manucure": "💅", "Pédicure": "🦶", "Massage": "💆", "Épilation": "✨", "Henné": "🌿" },
  chiffres: (stats, articles) => [
    { icone: "💅", valeur: stats.services ?? articles.length, libelle: "Prestations" },
    { icone: "👥", valeur: stats.clients ?? 0, libelle: "Clients" },
    { icone: "📅", valeur: stats.rendezvous ?? 0, libelle: "Rendez-vous" },
  ],
};

export default function BeauteVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  return <VitrineSimple tenantCode={tenantCode!} modele={MODELE} />;
}
