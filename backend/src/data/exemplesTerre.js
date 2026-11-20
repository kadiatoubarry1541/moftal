/**
 * Publications d'exemple de la page Terre (du quartier jusqu'au Monde).
 *
 * Elles servent à l'administratrice pour voir à quoi ressembleront les fils
 * d'actualités quand les utilisateurs publieront. Elles sont enregistrées en
 * base comme de vraies actualités, avec un auteur marqué EXEMPLE_NUMERO_H,
 * pour pouvoir toutes les retirer d'un seul clic.
 *
 * {lieu} est remplacé par le nom du lieu affiché (ex. « Kaloum »).
 * joursAvant : ancienneté de la publication, pour un fil réaliste.
 */
export const EXEMPLE_NUMERO_H = 'EXEMPLE-MOFTAL';

export const EXEMPLES_TERRE = {
  quartier: [
    {
      auteur: 'Chef de quartier (exemple)',
      domaine: 'sensibilisation',
      joursAvant: 0,
      titre: 'Grand nettoyage du quartier ce samedi',
      content: "Chers habitants de {lieu}, un grand nettoyage est organisé ce samedi de 7h à 11h. Rendez-vous devant la mosquée centrale avec pelles, balais et sacs. Les jeunes du quartier s'occupent des caniveaux, les mamans de la place du marché. Ensemble, gardons notre quartier propre !",
    },
    {
      auteur: 'Comité de sécurité (exemple)',
      domaine: 'securite',
      joursAvant: 1,
      titre: 'Vigilance : vols de motos signalés la nuit',
      content: "Plusieurs vols de motos ont été signalés à {lieu} cette semaine entre 23h et 4h. Rangez vos motos à l'intérieur, fermez bien les portails et prévenez les responsables du quartier de toute présence suspecte. Une ronde de volontaires est organisée chaque nuit.",
    },
    {
      auteur: 'Agent de santé du quartier (exemple)',
      domaine: 'sante',
      joursAvant: 3,
      titre: 'Vaccination gratuite des enfants de 0 à 5 ans',
      content: "Une campagne de vaccination gratuite aura lieu au poste de santé de {lieu} mardi et mercredi, de 8h à 16h. Apportez le carnet de santé de l'enfant. Les agents passeront aussi de porte en porte pour les familles qui ne peuvent pas se déplacer.",
    },
    {
      auteur: 'Association des jeunes (exemple)',
      domaine: 'autre',
      joursAvant: 6,
      titre: 'Tournoi de football inter-rues',
      content: "Le tournoi de football des rues de {lieu} commence dimanche prochain sur le terrain de l'école. Huit équipes sont déjà inscrites. La finale aura lieu le jour de la fête du quartier. Venez nombreux encourager vos équipes !",
    },
  ],
  'sous-prefecture': [
    {
      auteur: 'Mairie de {lieu} (exemple)',
      domaine: 'autre',
      joursAvant: 0,
      titre: 'Ouverture du nouveau marché couvert',
      content: "La mairie de {lieu} annonce l'ouverture du nouveau marché couvert lundi prochain. 120 places sont attribuées en priorité aux commerçantes du marché actuel. Les inscriptions se font au bureau de la mairie, du lundi au vendredi.",
    },
    {
      auteur: 'Service d\'hygiène de {lieu} (exemple)',
      domaine: 'sante',
      joursAvant: 2,
      titre: 'Distribution de moustiquaires imprégnées',
      content: "Une distribution gratuite de moustiquaires imprégnées est organisée dans tous les quartiers de {lieu}. Une moustiquaire pour deux personnes. Présentez-vous au point de distribution de votre quartier avec une pièce d'identité du chef de famille.",
    },
    {
      auteur: 'Mairie de {lieu} (exemple)',
      domaine: 'sensibilisation',
      joursAvant: 4,
      titre: 'Recensement des enfants non scolarisés',
      content: "La mairie recense les enfants de 6 à 14 ans qui ne vont pas encore à l'école, afin de leur trouver une place pour la rentrée. Les chefs de quartier de {lieu} transmettent les listes avant la fin du mois.",
    },
  ],
  prefecture: [
    {
      auteur: 'Préfecture de {lieu} (exemple)',
      domaine: 'securite',
      joursAvant: 0,
      titre: 'Fortes pluies attendues : prudence sur les routes',
      content: "La préfecture de {lieu} informe que de fortes pluies sont attendues ces trois prochains jours. Évitez de traverser les rivières en crue et limitez les déplacements de nuit. Les familles proches des bas-fonds sont invitées à mettre leurs biens à l'abri.",
    },
    {
      auteur: 'Direction préfectorale de l\'éducation (exemple)',
      domaine: 'autre',
      joursAvant: 3,
      titre: 'Dates des examens de fin d\'année',
      content: "Les examens de fin d'année pour les écoles de la préfecture de {lieu} débuteront le premier lundi de juin. Les listes des candidats doivent être déposées par chaque établissement avant le 15 mai.",
    },
    {
      auteur: 'Préfecture de {lieu} (exemple)',
      domaine: 'sensibilisation',
      joursAvant: 7,
      titre: 'Journée de reboisement',
      content: "Une grande journée de reboisement est organisée dans toute la préfecture de {lieu}. Objectif : planter 10 000 arbres le long des routes et autour des écoles. Chaque quartier reçoit ses jeunes plants à la mairie.",
    },
  ],
  region: [
    {
      auteur: 'Gouvernorat de {lieu} (exemple)',
      domaine: 'autre',
      joursAvant: 1,
      titre: 'Foire régionale de l\'agriculture',
      content: "La foire régionale de l'agriculture de {lieu} se tiendra du 10 au 14 du mois prochain. Producteurs, éleveurs et transformatrices pourront exposer leurs produits. Des formations gratuites sur la conservation des récoltes seront proposées.",
    },
    {
      auteur: 'Direction régionale de la santé (exemple)',
      domaine: 'sante',
      joursAvant: 4,
      titre: 'Campagne de dépistage du diabète',
      content: "Un dépistage gratuit du diabète et de l'hypertension est proposé dans les hôpitaux de la région {lieu} pendant tout le mois. Venez à jeun le matin. Les résultats sont donnés le jour même.",
    },
    {
      auteur: 'Gouvernorat de {lieu} (exemple)',
      domaine: 'sensibilisation',
      joursAvant: 8,
      titre: 'Travaux de la route régionale',
      content: "Les travaux de réhabilitation de la route principale de la région {lieu} commencent la semaine prochaine. La circulation sera alternée sur certains tronçons. Merci de votre patience : la route sera plus sûre pour tous.",
    },
  ],
  pays: [
    {
      auteur: 'Information nationale (exemple)',
      domaine: 'autre',
      joursAvant: 0,
      titre: 'Fête de l\'indépendance : programme des célébrations',
      content: "Les célébrations de la fête de l'indépendance de {lieu} auront lieu dans toutes les régions. Défilés, concerts et activités culturelles sont prévus. Chaque préfecture publiera son programme local sur sa page.",
    },
    {
      auteur: 'Ministère de la santé (exemple)',
      domaine: 'sante',
      joursAvant: 2,
      titre: 'Semaine nationale de don de sang',
      content: "Une semaine nationale de don de sang est organisée partout en {lieu}. Un don peut sauver jusqu'à trois vies. Rendez-vous dans l'hôpital le plus proche de chez vous, de 8h à 17h.",
    },
    {
      auteur: 'Protection civile (exemple)',
      domaine: 'securite',
      joursAvant: 5,
      titre: 'Saison des pluies : conseils de sécurité',
      content: "Avec la saison des pluies en {lieu}, la protection civile rappelle : ne pas s'abriter sous les arbres pendant l'orage, couper le courant en cas d'inondation et signaler aux autorités locales toute maison menacée.",
    },
  ],
  continent: [
    {
      auteur: 'Actualités du continent (exemple)',
      domaine: 'autre',
      joursAvant: 1,
      titre: 'Sommet des jeunes entrepreneurs de {lieu}',
      content: "Le sommet des jeunes entrepreneurs de {lieu} réunira cette année des porteurs de projets de plus de 30 pays. Agriculture, numérique et énergie solaire seront au cœur des échanges. Les candidatures sont ouvertes jusqu'à la fin du mois.",
    },
    {
      auteur: 'Actualités du continent (exemple)',
      domaine: 'sante',
      joursAvant: 4,
      titre: 'Recul du paludisme dans plusieurs pays',
      content: "Plusieurs pays de {lieu} annoncent un net recul des cas de paludisme grâce aux moustiquaires et aux traitements préventifs. Les efforts continuent : dormir sous moustiquaire reste le geste le plus important.",
    },
    {
      auteur: 'Actualités du continent (exemple)',
      domaine: 'sensibilisation',
      joursAvant: 9,
      titre: 'Coupe continentale de football : le calendrier est connu',
      content: "Le calendrier de la prochaine coupe continentale de football vient d'être publié. Les matchs de poule commenceront en janvier. Supporters de {lieu}, préparez vos couleurs !",
    },
  ],
  mondial: [
    {
      auteur: 'Actualités du monde (exemple)',
      domaine: 'sensibilisation',
      joursAvant: 0,
      titre: 'Journée mondiale de l\'environnement',
      content: "À l'occasion de la journée mondiale de l'environnement, des millions de personnes plantent des arbres et nettoient leurs villes. Chaque geste compte : organisez une action dans votre quartier et partagez-la sur Moftal.",
    },
    {
      auteur: 'Actualités du monde (exemple)',
      domaine: 'sante',
      joursAvant: 3,
      titre: 'Se laver les mains sauve des vies',
      content: "Se laver les mains avec du savon pendant 30 secondes réduit fortement les maladies diarrhéiques et respiratoires. Un geste simple à apprendre aux enfants, avant chaque repas et après les toilettes.",
    },
    {
      auteur: 'Actualités du monde (exemple)',
      domaine: 'autre',
      joursAvant: 6,
      titre: 'Journée internationale de la famille',
      content: "La journée internationale de la famille rappelle l'importance des liens entre générations. Prenez le temps d'appeler vos parents, de raconter l'histoire de la famille aux plus jeunes et de compléter votre arbre familial.",
    },
  ],
};
