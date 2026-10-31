// Données de la gestion interne « Transport », telles que le serveur les renvoie
// (backend/src/routes/transport-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface TransportVehicle {
  id: number;
  immatriculation: string;
  type_vehicule?: string | null;
  marque?: string | null;
  capacite?: number | null;
  driver_id?: number | null;
  description?: string | null;
  statut?: string | null;
  created_at?: string | null;
  chauffeur_nom?: string | null;
  chauffeur_prenom?: string | null;
}

export interface TransportDriver {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  permis?: string | null;
  type_permis?: string | null;
  salaire?: number | null;
  notes?: string | null;
  statut?: string | null;
  created_at?: string | null;
}

export interface TransportTrip {
  id: number;
  lieu_depart: string;
  lieu_arrivee: string;
  date_depart: string;
  heure_depart?: string | null;
  prix?: number | null;
  places_total?: number | null;
  places_restantes?: number | null;
  driver_id?: number | null;
  vehicle_id?: number | null;
  notes?: string | null;
  statut?: string | null;
  created_at?: string | null;
  chauffeur_nom?: string | null;
  vehicule_immat?: string | null;
}

export interface TransportBooking {
  id: number;
  trip_id?: number | null;
  client_nom: string;
  client_telephone?: string | null;
  places?: number | null;
  montant?: number | null;
  notes?: string | null;
  statut?: string | null;
  created_at?: string | null;
  lieu_depart?: string | null;
  lieu_arrivee?: string | null;
  date_depart?: string | null;
}

export interface TransportAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  created_at?: string | null;
}

export interface TransportDelivery {
  id: number;
  client_nom: string;
  client_telephone?: string | null;
  adresse_collecte: string;
  adresse_livraison: string;
  description?: string | null;
  poids?: Montant | null;
  montant?: number | null;
  driver_id?: number | null;
  vehicle_id?: number | null;
  notes?: string | null;
  statut?: string | null;
  created_at?: string | null;
  chauffeur_nom?: string | null;
  vehicule_immat?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauTransport {
  success?: boolean;
  vehiculesActifs?: number;
  chauffeursDisponibles?: number;
  trajetsAujourdhui?: number;
  caMonth?: number;
  reservationsEnAttente?: number;
  totalAnnonces?: number;
  recentTrips?: TransportTrip[];
}
