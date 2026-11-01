// Site public (vitrine) d'un établissement : /api/pro-public/:type/:code et /data.
// Les listes reprennent les tables de la gestion interne (une partie des colonnes).

/** Établissement tel qu'affiché au public */
export interface EtablissementPublic {
  tenant_code: string;
  type?: string;
  name: string;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  horaires?: string | null;
  phone_urgence?: string | null;
  /** « Nos valeurs » écrites par l'établissement (3 au plus) */
  valeurs?: { titre: string; texte: string }[] | null;
}

/** Données d'un site : chiffres affichés et listes propres au secteur */
export type DonneesVitrine<Listes> = {
  success?: boolean;
  stats?: Record<string, number>;
} & Partial<Listes>;

/** Tarifs d'une école, regroupés par type de frais */
export interface TarifEcole {
  type_frais: string;
  min_montant: number | string;
  max_montant: number | string;
}

type Montant = number | string;

// ─── Listes envoyées par /api/pro-public/:type/:code/data (champs renommés pour le site) ───

export interface EnseignantVitrine { nom: string; prenom: string; role?: string; matiere?: string | null; specialite?: string | null; matieres?: string[] | null; photo_url?: string | null; profil?: string | null }
export interface ClasseVitrine { nom: string; niveau?: string; capacite?: number; photo_url?: string | null }
export interface ImamVitrine { nom: string; prenom?: string; rang?: number | string; specialite?: string | null }
export interface AnnonceVitrine { titre: string; contenu?: string | null; type?: string | null; created_at?: string }
export interface PredicationVitrine { titre: string; theme?: string | null; date_pred?: string | null; imam_nom?: string | null; mosquee?: string | null }
export interface ProjetOngVitrine { nom: string; description?: string | null; statut?: string | null; budget?: Montant | null; beneficiaires?: number | null }
export interface EmployeVitrine { nom: string; prenom?: string | null; poste?: string | null; departement?: string | null }
export interface ArticlePresseVitrine { titre: string; categorie?: string | null; auteur_nom?: string | null; date_pub?: string | null; resume?: string | null }
export interface JournalisteVitrine { nom: string; prenom?: string | null; role?: string | null; specialite?: string | null }
export interface PublicationScienceVitrine { titre: string; type_pub?: string | null; domaine?: string | null; auteur_nom?: string | null; date_pub?: string | null; resume?: string | null }
export interface MembreVitrine { nom: string; prenom?: string | null; role?: string | null; poste?: string | null; specialite?: string | null }
export interface AgentVitrine { nom: string; prenom?: string | null; grade?: string | null; specialite?: string | null }
export interface BienVitrine {
  id: number; nom: string; type_bien?: string | null; superficie?: Montant | null; prix?: Montant | null; statut?: string | null;
  quartier?: string | null; ville?: string | null; description?: string | null; image_url?: string | null; video_url?: string | null; images?: string[] | null;
  audio_url?: string | null;
}
export interface PlatVitrine { id: number; nom: string; categorie?: string | null; prix?: Montant | null; description?: string | null; disponible?: boolean; image_url?: string | null; video_url?: string | null; audio_url?: string | null }
export interface TrajetVitrine { lieu_depart: string; lieu_arrivee: string; date_depart: string; heure_depart?: string | null; prix?: Montant | null; places_restantes?: number | null }
/** Produit, service ou réalisation d'un site simple (fournisseur, vendeur, production, beauté, juridique, artisan) */
export interface ArticleVitrine {
  id: number; nom: string; categorie?: string | null; description?: string | null; image_url?: string | null;
  prix?: Montant | null; prix_detail?: Montant | null; prix_gros?: Montant | null; prix_unitaire?: Montant | null;
  stock?: number | null; unite?: string | null; zone_intervention?: string | null;
  /** Ancien nom du champ « nom » sur certaines fiches */
  name?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

/** Chiffres du mois affichés sur le site d'une mairie (/api/mairie-public/:code/stats) */
export interface StatsMairieVitrine { mariages?: number; naissances?: number; deces?: number; residences?: number; agents?: number }

/** Message envoyé depuis le site d'un établissement (table site_demandes) */
export interface MessageDuSite {
  id: number;
  objet?: string | null;
  nom: string;
  telephone: string;
  email?: string | null;
  message: string;
  statut: string;
  created_at?: string;
}
